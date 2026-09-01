import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { auth } from '@/auth';
import { can } from '@/lib/permissions';
import { imageType } from '@/lib/safe-fetch';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024;

/** 관리자 직접 이미지 업로드 */
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

  const form = await req.formData();
  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ ok: false, message: '파일이 없습니다.' }, { status: 400 });
  }

  const dir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });

  const saved: string[] = [];
  for (const file of files.slice(0, 20)) {
    if (!ALLOWED.includes(file.type) || file.size > MAX_BYTES) continue;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = imageType(bytes);
    if (!ext) continue;
    const name = `${crypto.randomUUID()}.${ext}`;
    await writeFile(path.join(dir, name), Buffer.from(bytes));
    saved.push(`/uploads/${name}`);
  }

  return NextResponse.json({ ok: true, saved });
}
