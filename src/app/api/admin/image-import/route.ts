import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { auth } from '@/auth';
import { can } from '@/lib/permissions';
import { imageType, readLimited, safeExternalFetch } from '@/lib/safe-fetch';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * 외부 이미지 URL 을 서버로 내려받아 /public/uploads 에 저장합니다.
 * (핫링크로 두면 벤더사가 이미지를 내렸을 때 자사몰 이미지도 함께 깨지므로 복사해 둡니다)
 *
 * 운영 환경(Vercel 등 읽기 전용 FS)에서는 S3 / Cloudflare R2 업로드로 교체하세요.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!can(session?.user, 'products')) {
    return NextResponse.json({ ok: false, message: '권한이 없습니다.' }, { status: 403 });
  }
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_UPLOADS !== 'true') {
    return NextResponse.json(
      { ok: false, message: '운영 이미지 저장소가 설정되지 않았습니다. 객체 스토리지를 연결해 주세요.' },
      { status: 503 }
    );
  }

  try {
    const { urls } = (await req.json()) as { urls: string[] };
    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ ok: false, message: '가져올 이미지가 없습니다.' }, { status: 400 });
    }

    const dir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(dir, { recursive: true });

    const saved: { source: string; url: string }[] = [];
    const failed: { source: string; reason: string }[] = [];

    for (const src of urls.slice(0, 20)) {
      try {
        const res = await safeExternalFetch(src, {
          headers: { 'User-Agent': 'Mozilla/5.0', Referer: new URL(src).origin },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const type = (res.headers.get('content-type') ?? '').split(';')[0];
        if (!ALLOWED.includes(type)) throw new Error(`지원하지 않는 형식 (${type})`);

        const buf = await readLimited(res, MAX_BYTES);
        const detected = imageType(buf);
        if (!detected) throw new Error('실제 이미지 형식을 확인할 수 없습니다.');

        const name = `${crypto.randomUUID()}.${detected}`;
        await writeFile(path.join(dir, name), Buffer.from(buf));

        saved.push({ source: src, url: `/uploads/${name}` });
      } catch (e) {
        failed.push({ source: src, reason: e instanceof Error ? e.message : '알 수 없는 오류' });
      }
    }

    return NextResponse.json({ ok: true, saved, failed });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : '이미지 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
