import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { can } from '@/lib/permissions';
import { imageType, readLimited } from '@/lib/safe-fetch';
import { imageStorageReady, MAX_IMAGE_BYTES, saveImage } from '@/lib/image-storage';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_REQUEST_BYTES = 25 * 1024 * 1024;

/** 기존 saved 응답 형식을 유지하며 영속 저장소로 업로드합니다. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!can(session?.user, 'products')) return NextResponse.json({ ok: false, message: '권한이 없습니다.' }, { status: 403 });
  if (!imageStorageReady()) return NextResponse.json({ ok: false, message: '운영 이미지 저장소가 설정되지 않았습니다.' }, { status: 503 });
  let form: FormData;
  try {
    // Content-Length가 없는 요청도 실제 스트림 크기를 제한합니다.
    const bytes = await readLimited(new Response(req.body, { headers: req.headers }), MAX_REQUEST_BYTES);
    form = await new Response(new Uint8Array(bytes).buffer, { headers: { 'Content-Type': req.headers.get('content-type') || '' } }).formData();
  } catch {
    return NextResponse.json({ ok: false, message: '올바른 이미지 파일을 총 25MB 이하로 업로드해 주세요.' }, { status: 413 });
  }
  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ ok: false, message: '파일이 없습니다.' }, { status: 400 });
  const saved: string[] = [];
  try {
    for (const file of files.slice(0, 20)) {
      if (!ALLOWED.includes(file.type) || file.size > MAX_IMAGE_BYTES) continue;
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!imageType(bytes)) continue;
      saved.push(await saveImage(bytes));
    }
    if (!saved.length) return NextResponse.json({ ok: false, message: '저장 가능한 이미지가 없습니다.' }, { status: 400 });
    return NextResponse.json({ ok: true, saved });
  } catch {
    return NextResponse.json({ ok: false, saved, message: '이미지 저장에 실패했습니다. 저장소 설정을 확인해 주세요.' }, { status: 503 });
  }
}
