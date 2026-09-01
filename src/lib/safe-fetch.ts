const DEFAULT_HOSTS = [
  '16009223.com',
  'mall.epost.go.kr',
  'image.epost.go.kr',
  'prod.danawa.com',
  'coupang.com',
  'coupangcdn.com',
  'naver.com',
  'pstatic.net',
  'gmarket.co.kr',
  '11st.co.kr',
  'lotteon.com',
  'ssg.com',
];

function allowedHosts() {
  return [
    ...DEFAULT_HOSTS,
    ...(process.env.IMPORT_ALLOWED_HOSTS ?? '').split(',').map((v) => v.trim()).filter(Boolean),
  ];
}

export function assertSafeExternalUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new Error('HTTPS 기본 포트 주소만 사용할 수 있습니다.');
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.local') || /^[\d.]+$/.test(host) || host.includes(':')) {
    throw new Error('내부 네트워크 주소는 사용할 수 없습니다.');
  }
  const allowed = allowedHosts().some((item) => host === item || host.endsWith(`.${item}`));
  if (!allowed) throw new Error('허용되지 않은 판매처 도메인입니다. IMPORT_ALLOWED_HOSTS 설정을 확인해 주세요.');
  return url;
}

export async function safeExternalFetch(value: string, init: RequestInit = {}) {
  let url = assertSafeExternalUrl(value);
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const res = await fetch(url, {
      ...init,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (![301, 302, 303, 307, 308].includes(res.status)) return res;
    const location = res.headers.get('location');
    if (!location) throw new Error('올바르지 않은 리다이렉트 응답입니다.');
    url = assertSafeExternalUrl(new URL(location, url).toString());
  }
  throw new Error('리다이렉트가 너무 많습니다.');
}

export async function readLimited(res: Response, maxBytes: number) {
  const declared = Number(res.headers.get('content-length') ?? 0);
  if (declared > maxBytes) throw new Error('응답 파일이 너무 큽니다.');
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('응답 파일이 너무 큽니다.');
    }
    chunks.push(value);
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export function imageType(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes.length >= 8 && bytes.slice(0, 8).every((v, i) => v === [137, 80, 78, 71, 13, 10, 26, 10][i])) return 'png';
  if (bytes.length >= 6 && new TextDecoder().decode(bytes.slice(0, 6)).match(/^GIF8[79]a$/)) return 'gif';
  if (
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
    new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
  ) return 'webp';
  return null;
}
