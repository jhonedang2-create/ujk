import type { Metadata } from 'next';
import './globals.css';
import { SITE } from '@/lib/site';
import { BASE_KEYWORDS, SITE_URL, organizationJsonLd, websiteJsonLd } from '@/lib/seo';
import { SessionProvider } from 'next-auth/react';
import { auth } from '@/auth';
import AppShell from '@/components/AppShell';
import JsonLd from '@/components/JsonLd';
import { isOfficeHours } from '@/lib/chat';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} | 보령 대천김 전문 제조`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  category: '식품·수산물',
  keywords: BASE_KEYWORDS,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name} | 보령 대천김 전문 제조`,
    description: SITE.description,
    locale: 'ko_KR',
    url: '/',
    images: [{ url: '/products/lunchbox-laver-24pack.jpg', width: 450, height: 450, alt: '대천우정김 조미김' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} | 보령 대천김 전문 제조`,
    description: SITE.description,
    images: ['/products/lunchbox-laver-24pack.jpg'],
  },
  robots: { index: true, follow: true },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
      ? { 'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION }
      : undefined,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="ko">
      <body>
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={websiteJsonLd} />
        <SessionProvider session={session}>
          <AppShell officeHours={isOfficeHours()} csHours={SITE.csHours} tel={SITE.tel}>
            {children}
          </AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
