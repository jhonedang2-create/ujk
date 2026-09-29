import { imageType } from '@/lib/safe-fetch';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/i;
const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

export function validImageName(name: string) { return IMAGE_NAME.test(name); }

function supabaseConfig() {
  const value = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'ujk-images';
  if (!value || !key) return null;
  const url = new URL(value);
  if (url.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(url.hostname) || url.username || url.password || url.port) {
    throw new Error('Supabase 저장소 주소 설정을 확인해 주세요.');
  }
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(bucket)) throw new Error('저장소 버킷 이름이 올바르지 않습니다.');
  return { base: url.origin, key, bucket };
}

export function imageStorageReady() {
  if (process.env.UPLOAD_STORAGE === 'supabase') return !!supabaseConfig();
  // Workers의 /tmp 또는 가상 public 폴더에 영속 이미지를 저장하지 않습니다.
  return process.env.UJK_CLOUDFLARE !== 'true' && (process.env.NODE_ENV !== 'production' || process.env.ALLOW_LOCAL_UPLOADS === 'true');
}

export async function saveImage(bytes: Uint8Array): Promise<string> {
  if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('이미지는 5MB 이하만 저장할 수 있습니다.');
  const ext = imageType(bytes);
  if (!ext) throw new Error('지원하지 않는 이미지 형식입니다.');
  const name = `${crypto.randomUUID()}.${ext}`;
  if (process.env.UPLOAD_STORAGE === 'supabase') {
    const config = supabaseConfig();
    if (!config) throw new Error('운영 이미지 저장소가 설정되지 않았습니다.');
    const response = await fetch(`${config.base}/storage/v1/object/${config.bucket}/${name}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.key}`, apikey: config.key, 'Content-Type': TYPES[ext], 'x-upsert': 'false' },
      body: new Uint8Array(bytes).buffer,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      // 저장소 응답 본문에는 내부 정보가 포함될 수 있으므로 사용자에게 전달하지 않습니다.
      throw new Error(`이미지 저장 실패 (${response.status}). 버킷/서버 설정을 확인해 주세요.`);
    }
    await response.body?.cancel();
    return `/uploads/${name}`;
  }
  if (!imageStorageReady()) throw new Error('운영 이미지 저장소가 설정되지 않았습니다.');
  const [{ mkdir, writeFile }, path] = await Promise.all([import('node:fs/promises'), import('node:path')]);
  const directory = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, name), bytes);
  return `/uploads/${name}`;
}

/** 상품용 이미지 전용 공개 읽기 경로입니다. 개인정보 문서에는 사용하지 마세요. */
export async function readStoredImage(name: string): Promise<Response> {
  if (!validImageName(name)) return new Response('Not found', { status: 404 });
  const config = process.env.UPLOAD_STORAGE === 'supabase' ? supabaseConfig() : null;
  if (!config) return new Response('Storage unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const response = await fetch(`${config.base}/storage/v1/object/authenticated/${config.bucket}/${name}`, {
    headers: { Authorization: `Bearer ${config.key}`, apikey: config.key },
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    return new Response(response.status === 404 ? 'Not found' : 'Storage unavailable', {
      status: response.status === 404 ? 404 : 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
  if (Number(response.headers.get('content-length') || 0) > MAX_IMAGE_BYTES) {
    await response.body?.cancel();
    return new Response('Invalid image', { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
  const ext = name.split('.').pop()!.toLowerCase();
  return new Response(response.body, {
    headers: {
      'Content-Type': TYPES[ext],
      'Cache-Control': 'public, max-age=86400, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
