import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { can } from '@/lib/permissions';
import { imageType, readLimited, safeExternalFetch } from '@/lib/safe-fetch';
import { imageStorageReady, MAX_IMAGE_BYTES, saveImage } from '@/lib/image-storage';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** 허용된 외부 상품 이미지를 영속 저장소로 복사합니다. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!can(session?.user, 'products')) return NextResponse.json({ ok: false, message: '권한이 없습니다.' }, { status: 403 });
  if (!imageStorageReady()) return NextResponse.json({ ok: false, message: '운영 이미지 저장소가 설정되지 않았습니다.' }, { status: 503 });
  try {
    const payload = await req.json();
    const urls: unknown = payload?.urls;
    if (!Array.isArray(urls) || !urls.length || urls.some((url) => typeof url !== 'string' || url.length > 2048)) {
      return NextResponse.json({ ok: false, message: '올바른 이미지 주소가 없습니다.' }, { status: 400 });
    }
    const saved: { source: string; url: string }[] = [];
    const failed: { source: string; reason: string }[] = [];
    for (const src of (urls as string[]).slice(0, 20)) {
      try {
        const response = await safeExternalFetch(src, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: new URL(src).origin } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const type = (response.headers.get('content-type') || '').split(';')[0];
        if (!ALLOWED.includes(type)) throw new Error('지원하지 않는 이미지 형식입니다.');
        const bytes = await readLimited(response, MAX_IMAGE_BYTES);
        if (!imageType(bytes)) throw new Error('실제 이미지 형식을 확인할 수 없습니다.');
        saved.push({ source: src, url: await saveImage(bytes) });
      } catch (error) {
        failed.push({ source: src, reason: error instanceof Error ? error.message : '이미지를 저장하지 못했습니다.' });
      }
    }
    return NextResponse.json({ ok: true, saved, failed });
  } catch {
    return NextResponse.json({ ok: false, message: '이미지 가져오기 요청을 확인해 주세요.' }, { status: 400 });
  }
}
