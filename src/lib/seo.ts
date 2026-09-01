import { SITE } from '@/lib/site';

const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const SITE_URL = (configuredUrl || 'http://localhost:3000').replace(/\/$/, '');

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export const BASE_KEYWORDS = [
  '대천김',
  '우정김',
  '대천우정김',
  '보령김',
  '보령 대천김',
  '광천김',
  '조미김',
  '재래김',
  '도시락김',
  '식탁김',
  '김 선물세트',
  '국산 김',
];

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': ['Organization', 'LocalBusiness'],
  '@id': `${SITE_URL}/#organization`,
  name: SITE.name,
  alternateName: ['대천우정김', '우정김', 'DAECHEON UJUNG GIM'],
  url: SITE_URL,
  telephone: SITE.tel,
  email: SITE.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: '황골길 42 (남곡동)',
    addressLocality: '보령시',
    addressRegion: '충청남도',
    postalCode: SITE.zipcode,
    addressCountry: 'KR',
  },
  areaServed: 'KR',
  makesOffer: {
    '@type': 'OfferCatalog',
    name: '대천우정김 제품',
    itemListElement: ['조미구이재래김', '도시락김', '식탁김', '김 선물세트'].map((name) => ({
      '@type': 'OfferCatalog',
      name,
    })),
  },
};

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE.name,
  alternateName: '대천우정김 공식몰',
  publisher: { '@id': `${SITE_URL}/#organization` },
  inLanguage: 'ko-KR',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/products?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};
