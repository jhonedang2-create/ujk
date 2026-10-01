export type ClientEnvironment = {
  os: string;
  browser: string;
  device: string;
};

export type AttributionSnapshot = {
  source: string;
  medium: string;
  campaign: string;
  referrerHost: string;
  landingPath: string;
};

export function getClientIp(headers: Headers) {
  const cf = headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf.slice(0, 80);
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded.slice(0, 80);
  return (headers.get('x-real-ip') ?? '').trim().slice(0, 80);
}

export function parseUserAgent(uaRaw: string): ClientEnvironment {
  const ua = uaRaw || '';

  let os = '기타';
  if (/Windows NT 10\.0/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS/iPadOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = '기타';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/SamsungBrowser\//i.test(ua)) browser = 'Samsung Internet';
  else if (/KAKAOTALK/i.test(ua)) browser = '카카오톡 인앱';
  else if (/NAVER\(/i.test(ua) || /NAVER/i.test(ua)) browser = '네이버 인앱';
  else if (/CriOS|Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/FxiOS|Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome|CriOS/i.test(ua)) browser = 'Safari';

  let device = 'PC';
  if (/iPad|Tablet/i.test(ua)) device = '태블릿';
  else if (/Mobile|iPhone|Android/i.test(ua)) device = '모바일';

  return { os, browser, device };
}

const REGION_SHORT: Record<string, string> = {
  서울특별시: '서울',
  부산광역시: '부산',
  대구광역시: '대구',
  인천광역시: '인천',
  광주광역시: '광주',
  대전광역시: '대전',
  울산광역시: '울산',
  세종특별자치시: '세종',
  경기도: '경기',
  강원특별자치도: '강원',
  강원도: '강원',
  충청북도: '충북',
  충청남도: '충남',
  전북특별자치도: '전북',
  전라북도: '전북',
  전라남도: '전남',
  경상북도: '경북',
  경상남도: '경남',
  제주특별자치도: '제주',
};

export function parseKoreanRegion(address: string) {
  const tokens = address.trim().split(/\s+/).filter(Boolean);
  const raw1 = tokens[0] ?? '';
  return {
    region1: REGION_SHORT[raw1] ?? raw1.slice(0, 20),
    region2: (tokens[1] ?? '').slice(0, 30),
  };
}

export function sourceLabel(source: string) {
  const key = source.toLowerCase();
  const labels: Record<string, string> = {
    direct: '직접 방문',
    google: 'Google',
    naver: '네이버',
    daum: '다음',
    kakao: '카카오',
    instagram: 'Instagram',
    facebook: 'Facebook',
    youtube: 'YouTube',
  };
  return labels[key] ?? (source || '기록 없음');
}

export function safeHost(raw: string) {
  if (!raw) return '';
  try {
    return new URL(raw).hostname.replace(/^www\./, '').slice(0, 120);
  } catch {
    return raw.replace(/^www\./, '').slice(0, 120);
  }
}
