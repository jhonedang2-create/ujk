import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ProductCard from '@/components/ProductCard';
import JsonLd from '@/components/JsonLd';
import { SITE } from '@/lib/site';
import { absoluteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '대천김·우정김 공식 안내 | 보령 대천우정김',
  description:
    '대천김을 만드는 보령의 김 가공업체 (주)대천우정김 공식 안내. 재래김, 도시락김, 식탁김, 김 선물세트 제품과 보관법을 확인하세요.',
  keywords: ['대천김', '우정김', '대천우정김', '보령김', '광천김', '재래김', '도시락김'],
  alternates: { canonical: '/daecheon-gim' },
  openGraph: {
    type: 'article',
    url: '/daecheon-gim',
    title: '대천김·우정김 공식 안내',
    description: '보령에서 만드는 대천우정김 제품과 브랜드를 소개합니다.',
    images: ['/products/seasoned-jaerae-20.webp'],
  },
};

const faqs = [
  {
    q: '대천김은 무엇인가요?',
    a: '대천김은 충청남도 보령의 대천 지역명과 함께 유통되는 김 제품을 가리키는 표현입니다. 제조사와 제품별 원재료, 구성, 표시사항은 각 상품 포장에서 확인해야 합니다.',
  },
  {
    q: '우정김과 대천우정김은 같은 브랜드인가요?',
    a: '이 사이트에서 안내하는 우정김은 충청남도 보령시 소재 (주)대천우정김이 제조·판매하는 제품 브랜드입니다.',
  },
  {
    q: '광천김과 대천김은 어떻게 다른가요?',
    a: '광천과 대천은 모두 충청남도의 지명입니다. 검색할 때는 지역명만 보지 말고 실제 제조사, 원산지, 원재료, 중량과 상품 구성을 함께 비교하는 것이 좋습니다.',
  },
  {
    q: '조미김은 어떻게 보관하나요?',
    a: '직사광선과 습기를 피해 서늘한 곳에 보관하고, 개봉 후에는 밀봉해 가능한 한 빨리 드세요. 정확한 보관방법과 소비기한은 제품 포장 표시를 우선합니다.',
  },
];

export default async function DaecheonGimPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
    orderBy: [{ isBest: 'desc' }, { createdAt: 'desc' }],
    take: 8,
  });

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: '대천김 안내', item: absoluteUrl('/daecheon-gim') },
    ],
  };

  return (
    <>
      <JsonLd data={faqJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <section className="bg-sea-950 py-20 text-white sm:py-28">
        <div className="container-x grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="eyebrow text-sea-300">BORYEONG DAECHEON GIM</p>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
              대천김을 찾는다면,
              <br />제조사부터 확인하세요
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-sea-100 sm:text-base">
              {SITE.name}은 충청남도 보령시에 위치한 김 가공·판매 업체입니다.
              재래김, 도시락김, 식탁김과 선물 구성을 자사몰 제품 정보와 함께 안내합니다.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/products" className="btn-point px-7 py-3.5">우정김 제품 보기</Link>
              <Link href="/about/location" className="btn glass px-7 py-3.5 text-white">제조사 위치 확인</Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl bg-white p-5 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/products/seasoned-jaerae-20.webp"
              alt="대천우정김 조미구이재래김 제품 구성"
              className="aspect-square w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      <section className="container-x py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="eyebrow">BRAND GUIDE</p>
          <h2 className="section-title mt-2">대천김·우정김을 고르는 기준</h2>
          <div className="prose-kr mt-7 text-[15px] leading-8">
            <p>
              ‘대천김’, ‘보령김’, ‘광천김’은 지역명이 함께 사용되는 검색어입니다. 같은 지역명을
              사용하더라도 제조사와 제품 구성은 서로 다를 수 있으므로, 상품을 고를 때는 포장에
              표시된 제조사명과 사업자 정보, 원산지, 원재료명, 중량을 함께 확인하는 것이 좋습니다.
            </p>
            <p>
              이 자사몰에서 판매하는 제품의 제조·판매자는 {SITE.name}이며, 사업장 주소는
              {` ${SITE.address}`}입니다. 상품별 구성과 가격, 식품 표시사항은 각 상세페이지와 실제
              포장 표시를 기준으로 안내합니다.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ['제조사 확인', `${SITE.name}\n사업자 ${SITE.bizNo}`],
              ['제품 구성 확인', '5매 전장김·도시락김·식탁김\n상품별 수량 별도 표기'],
              ['표시사항 확인', '원재료·소비기한·보관방법은\n제품 포장 표시 우선'],
            ].map(([title, desc]) => (
              <div key={title} className="card p-6">
                <h3 className="font-bold text-gim-900">{title}</h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gim-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {products.length > 0 && (
        <section className="bg-gim-50 py-16 sm:py-20">
          <div className="container-x">
            <div className="mb-9 flex items-end justify-between">
              <div>
                <p className="eyebrow">OFFICIAL PRODUCTS</p>
                <h2 className="section-title mt-2">대천우정김 제품</h2>
                <p className="section-sub">재래김부터 도시락김, 선물 구성까지</p>
              </div>
              <Link href="/products" className="btn-outline btn-sm">전체 제품 →</Link>
            </div>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => <ProductCard key={product.id} p={product} />)}
            </div>
          </div>
        </section>
      )}

      <section className="container-x py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="eyebrow">FAQ</p>
          <h2 className="section-title mt-2">대천김 자주 묻는 질문</h2>
          <div className="mt-8 divide-y divide-gim-100 rounded-2xl border border-gim-100 px-6">
            {faqs.map((faq) => (
              <details key={faq.q} className="group py-5">
                <summary className="cursor-pointer list-none pr-8 font-semibold text-gim-900">
                  {faq.q}
                </summary>
                <p className="mt-3 text-sm leading-7 text-gim-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
