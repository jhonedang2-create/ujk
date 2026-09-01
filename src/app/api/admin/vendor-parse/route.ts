import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { can } from '@/lib/permissions';
import { readLimited, safeExternalFetch } from '@/lib/safe-fetch';

/**
 * 벤더사(다나와·쿠팡·스마트스토어 등) 상품 페이지에서
 * 상품명 / 가격 / 이미지 후보를 추출합니다.
 *
 * ⚠️ 저작권 안내
 *  - 자사가 직접 촬영했거나 사용 권한을 보유한 이미지에만 사용하세요.
 *  - 오픈마켓이 자체 제작한 이미지·상세페이지는 무단 사용 시 문제가 될 수 있습니다.
 *  - 사이트별 robots.txt 및 이용약관을 확인한 뒤 사용하세요.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!can(session?.user, 'products')) {
    return NextResponse.json({ ok: false, message: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const { url } = await req.json();
    if (!url || !/^https:\/\//.test(url)) {
      return NextResponse.json({ ok: false, message: '올바른 URL 을 입력해 주세요.' }, { status: 400 });
    }

    const res = await safeExternalFetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, message: `페이지를 불러올 수 없습니다. (HTTP ${res.status})` },
        { status: 400 }
      );
    }

    const html = new TextDecoder().decode(await readLimited(res, 5 * 1024 * 1024));
    const origin = new URL(url).origin;

    const meta = (prop: string) => {
      const re = new RegExp(
        `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`,
        'i'
      );
      const re2 = new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`,
        'i'
      );
      return html.match(re)?.[1] ?? html.match(re2)?.[1] ?? '';
    };

    const title =
      meta('og:title') ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      '';
    const description = meta('og:description');
    const priceMeta = meta('product:price:amount') || meta('og:price:amount');

    // 이미지 후보 수집
    const found = new Set<string>();
    const push = (raw: string) => {
      let u = raw.trim();
      if (!u || u.startsWith('data:')) return;
      if (u.startsWith('//')) u = 'https:' + u;
      else if (u.startsWith('/')) u = origin + u;
      if (!/^https?:\/\//.test(u)) return;
      if (!/\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)) return;
      // 아이콘·로고·1px 트래킹 이미지 제외
      if (/(icon|logo|sprite|blank|dummy|1x1|banner_s)/i.test(u)) return;
      found.add(u);
    };

    const og = meta('og:image');
    if (og) push(og);

    for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) push(m[1]);
    for (const m of html.matchAll(/<img[^>]+data-src=["']([^"']+)["']/gi)) push(m[1]);
    for (const m of html.matchAll(/<img[^>]+data-original=["']([^"']+)["']/gi)) push(m[1]);
    // JSON-LD / 스크립트 안의 이미지 URL
    for (const m of html.matchAll(/"(https?:\\?\/\\?\/[^"']+?\.(?:jpe?g|png|webp))"/gi)) {
      push(m[1].replace(/\\\//g, '/'));
    }

    const images = Array.from(found).slice(0, 40);

    // 가격 추정
    let price = Number(String(priceMeta).replace(/[^\d]/g, '')) || 0;
    if (!price) {
      const m = html.match(/([0-9]{1,3}(?:,[0-9]{3})+)\s*원/);
      if (m) price = Number(m[1].replace(/,/g, ''));
    }

    return NextResponse.json({
      ok: true,
      title,
      description,
      price,
      images,
      sourceUrl: url,
      notice:
        '자사 보유 이미지인지 확인 후 사용하세요. 오픈마켓이 제작한 이미지는 무단 사용 시 저작권 문제가 발생할 수 있습니다.',
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : '파싱 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
