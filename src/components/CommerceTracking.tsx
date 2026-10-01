'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

type Attr = {
  source: string;
  medium: string;
  campaign: string;
  referrerHost: string;
  landingPath: string;
};

const FIRST_COOKIE = 'ujk_attr_first';
const LAST_COOKIE = 'ujk_attr_last';

function cookieValue(name: string) {
  const row = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`));
  return row ? row.slice(name.length + 1) : '';
}

function setCookie(name: string, value: Attr, maxAge: number) {
  const encoded = encodeURIComponent(JSON.stringify(value));
  document.cookie = `${name}=${encoded}; Max-Age=${maxAge}; Path=/; SameSite=Lax; Secure`;
}

function hostOf(raw: string) {
  if (!raw) return '';
  try {
    return new URL(raw).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function classifyAttribution(): Attr {
  const url = new URL(window.location.href);
  const referrerHost = hostOf(document.referrer);
  const utmSource = (url.searchParams.get('utm_source') ?? '').slice(0, 80);
  const utmMedium = (url.searchParams.get('utm_medium') ?? '').slice(0, 80);
  const campaign = (url.searchParams.get('utm_campaign') ?? '').slice(0, 120);

  if (utmSource) {
    return {
      source: utmSource.toLowerCase(),
      medium: utmMedium || 'campaign',
      campaign,
      referrerHost,
      landingPath: url.pathname.slice(0, 180),
    };
  }

  if (url.searchParams.has('gclid')) {
    return { source: 'google', medium: 'cpc', campaign, referrerHost, landingPath: url.pathname };
  }
  if (url.searchParams.has('n_media') || url.searchParams.has('n_query')) {
    return { source: 'naver', medium: 'cpc', campaign, referrerHost, landingPath: url.pathname };
  }

  const h = referrerHost.toLowerCase();
  const currentHost = window.location.hostname.replace(/^www\./, '').toLowerCase();
  if (!h || h === currentHost) {
    return { source: 'direct', medium: 'none', campaign: '', referrerHost: '', landingPath: url.pathname };
  }
  if (h.includes('google.')) return { source: 'google', medium: 'organic', campaign: '', referrerHost, landingPath: url.pathname };
  if (h.includes('naver.')) return { source: 'naver', medium: 'organic', campaign: '', referrerHost, landingPath: url.pathname };
  if (h.includes('daum.') || h.includes('kakao.')) return { source: h.includes('kakao.') ? 'kakao' : 'daum', medium: 'organic', campaign: '', referrerHost, landingPath: url.pathname };
  if (h.includes('instagram.')) return { source: 'instagram', medium: 'social', campaign: '', referrerHost, landingPath: url.pathname };
  if (h.includes('facebook.')) return { source: 'facebook', medium: 'social', campaign: '', referrerHost, landingPath: url.pathname };
  if (h.includes('youtube.')) return { source: 'youtube', medium: 'social', campaign: '', referrerHost, landingPath: url.pathname };
  return { source: h, medium: 'referral', campaign: '', referrerHost, landingPath: url.pathname };
}

export default function CommerceTracking() {
  const pathname = usePathname();
  const { status } = useSession();

  useEffect(() => {
    const attr = classifyAttribution();
    if (!cookieValue(FIRST_COOKIE)) setCookie(FIRST_COOKIE, attr, 90 * 24 * 60 * 60);

    // 내부 직접 이동으로 기존 유입경로를 덮지 않습니다.
    if (attr.source !== 'direct' || !cookieValue(LAST_COOKIE)) {
      setCookie(LAST_COOKIE, attr, 30 * 24 * 60 * 60);
    }

    if (status === 'authenticated') {
      fetch('/api/access/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: pathname.slice(0, 180),
          referrerHost: attr.referrerHost.slice(0, 120),
        }),
        keepalive: true,
      }).catch(() => undefined);
    }
  }, [pathname, status]);

  return null;
}
