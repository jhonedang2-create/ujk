import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProductBuyBox from '@/components/ProductBuyBox';
import ProductCard from '@/components/ProductCard';
import ProductGallery from '@/components/ProductGallery';
import { won, discountRate, fmtDate, maskName } from '@/lib/utils';
import { SITE, SHIPPING } from '@/lib/site';
import JsonLd from '@/components/JsonLd';
import { absoluteUrl } from '@/lib/seo';
import { cleanRichText, plainText } from '@/lib/sanitize';
import { productStory } from '@/lib/product-story';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.product.findUnique({
    where: { slug },
    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
  });
  if (!p) return { title: '상품' };

  const description = (p.summary || plainText(p.description)).slice(0, 160);
  const image = p.images[0]?.url;
  return {
    title: `${p.name} | 대천김·우정김`,
    description,
    keywords: [p.name, '대천김', '우정김', '대천우정김', p.foodType, p.origin].filter(Boolean),
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: {
      type: 'website',
      url: `/products/${p.slug}`,
      title: p.name,
      description,
      images: image ? [{ url: image, alt: p.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: p.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      options: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      category: true,
      reviews: {
        where: { isActive: true },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!product || !product.isActive) notFound();

  await prisma.product
    .update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => null);

  const related = await prisma.product.findMany({
    where: { categoryId: product.categoryId, isActive: true, NOT: { id: product.id } },
    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
    take: 4,
  });

  const rate = discountRate(product.price, product.listPrice);
  const story = productStory(product.slug, product.name, product.unit);
  const avgRating =
    product.reviews.length > 0
      ? (product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length).toFixed(1)
      : null;

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${absoluteUrl(`/products/${product.slug}`)}#product`,
    name: product.name,
    description: product.summary || plainText(product.description),
    image: product.images.map((image) => absoluteUrl(image.url)),
    sku: product.sku || product.slug,
    brand: { '@type': 'Brand', name: SITE.nameShort },
    manufacturer: { '@type': 'Organization', name: SITE.name },
    countryOfOrigin: product.origin,
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/products/${product.slug}`),
      priceCurrency: 'KRW',
      price: product.price,
      availability: product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE.name },
    },
    ...(avgRating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: avgRating,
            reviewCount: product.reviews.length,
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: '제품', item: absoluteUrl('/products') },
      { '@type': 'ListItem', position: 3, name: product.name, item: absoluteUrl(`/products/${product.slug}`) },
    ],
  };

  return (
    <div className="container-x py-10 sm:py-14">
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-gim-400">
        <Link href="/" className="hover:text-sea-700">홈</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-sea-700">제품</Link>
        <span>/</span>
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-sea-700">
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-10 border-b border-gim-100 pb-14 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:pb-20">
        <ProductGallery images={product.images} name={product.name} />

        <div className="self-start lg:sticky lg:top-28">
          <p className="inline-flex rounded-full bg-sea-50 px-3 py-1.5 text-[11px] font-bold text-sea-700">{product.category.name}</p>
          <h1 className="mt-4 text-3xl font-black leading-snug tracking-[-0.035em] sm:text-4xl">{product.name}</h1>
          {product.summary && <p className="mt-3 text-sm leading-6 text-gim-500">{product.summary}</p>}

          <div className="mt-6 flex items-baseline gap-3">
            {rate > 0 && <span className="text-2xl font-black text-point">{rate}%</span>}
            <span className="text-3xl font-black">{won(product.price)}</span>
            {rate > 0 && <span className="text-sm text-gim-400 line-through">{won(product.listPrice)}</span>}
          </div>

          {avgRating && (
            <p className="mt-2 text-sm text-gim-500">
              ★ {avgRating} · 리뷰 {product.reviews.length}건
            </p>
          )}

          <dl className="mt-7 space-y-2.5 border-y border-gim-100 py-6 text-sm">
            {[
              ['원산지', product.origin],
              ['제조사', product.maker],
              ['구성', product.unit || '-'],
              ['배송비', `${won(SHIPPING.fee)} (${won(SHIPPING.freeThreshold)} 이상 무료배송)`],
              ['배송안내', SHIPPING.guide],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-4">
                <dt className="w-20 shrink-0 text-gim-400">{k}</dt>
                <dd className="text-gim-700">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-7">
            <ProductBuyBox
              productId={product.id}
              price={product.price}
              stock={product.stock}
              options={product.options}
            />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] text-gim-600">
            {[
              ['직영 자사몰', '제조사 직접 운영'],
              ['전국 배송', '결제 확인 후 출고'],
              ['실시간 상담', '우측 하단 채팅'],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-xl bg-gim-50 px-2 py-3">
                <strong className="block text-gim-800">{title}</strong>
                <span className="mt-1 block text-[10px] text-gim-400">{copy}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <nav className="sticky top-[68px] z-20 -mx-4 mt-8 flex justify-center gap-7 border-y border-gim-100 bg-white/95 px-4 py-4 text-sm font-bold text-gim-500 backdrop-blur sm:gap-12">
        <a href="#product-story" className="text-sea-800">상품 상세</a>
        <a href="#product-facts" className="hover:text-sea-800">제품 안내</a>
        <a href="#product-reviews" className="hover:text-sea-800">구매후기</a>
        <a href="#shipping-guide" className="hover:text-sea-800">배송·반품</a>
      </nav>

      {/* 감성 상세 콘텐츠 — AI 식탁 연출 이미지는 실제 패키지 이미지와 명확히 분리합니다. */}
      <section id="product-story" className="relative mt-20 scroll-mt-32 overflow-hidden rounded-[2rem] bg-sea-950 text-white shadow-2xl shadow-sea-950/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/story/crisp-rice-bite.webp"
          alt="따뜻한 밥을 바삭한 김으로 감싼 식탁 연출 이미지"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-75"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sea-950 via-sea-950/80 to-transparent" />
        <div className="relative max-w-2xl px-7 py-20 sm:px-12 sm:py-28 lg:px-16 lg:py-36">
          <p className="eyebrow text-[#ead293]">{story.eyebrow}</p>
          <h2 className="mt-4 whitespace-pre-line text-3xl font-black leading-tight tracking-[-0.045em] sm:text-5xl">
            {story.headline}
          </h2>
          <p className="mt-6 max-w-xl text-sm leading-7 text-sea-50/90 sm:text-base sm:leading-8">
            {story.intro}
          </p>
          <span className="mt-7 inline-flex rounded-full border border-white/15 bg-sea-950/55 px-3 py-1.5 text-[10px] text-sea-100 backdrop-blur-sm">
            AI 식탁 연출 이미지 · 실제 제품은 상단 패키지 사진 참조
          </span>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">TASTY MOMENTS</p>
          <h2 className="mt-3 text-2xl font-black sm:text-4xl">{story.momentTitle}</h2>
          <p className="mt-4 text-sm leading-7 text-gim-500">
            따뜻한 밥과 함께, 필요한 만큼 꺼내 간편하게 즐겨보세요.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {story.moments.map((moment, index) => (
            <div key={moment.title} className="rounded-2xl border border-gim-100 bg-gradient-to-br from-white to-gim-50 p-7">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sea-800 text-xs font-black text-white">
                0{index + 1}
              </span>
              <h3 className="mt-5 text-base font-black">{moment.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gim-500">{moment.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid overflow-hidden rounded-[2rem] bg-[#f3efe4] lg:grid-cols-2 lg:items-stretch">
        <div className="relative min-h-[320px] lg:min-h-[520px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/story/family-table.webp"
            alt="김과 밥을 차린 가족 식탁 연출 이미지"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <span className="absolute bottom-4 left-4 rounded-full bg-white/85 px-3 py-1.5 text-[10px] text-gim-600 backdrop-blur-sm">
            식탁 연출 이미지
          </span>
        </div>
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
          <p className="eyebrow">ON YOUR TABLE</p>
          <h2 className="mt-3 whitespace-pre-line text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">
            {story.tableTitle}
          </h2>
          <p className="mt-6 text-sm leading-7 text-gim-600">{story.tableCopy}</p>
          <dl className="mt-8 space-y-3 border-t border-gim-300/70 pt-7 text-sm">
            <div className="flex gap-5"><dt className="w-20 shrink-0 text-gim-400">제품 구성</dt><dd className="font-bold text-gim-800">{story.packPoint}</dd></div>
            <div className="flex gap-5"><dt className="w-20 shrink-0 text-gim-400">제조사</dt><dd className="font-bold text-gim-800">{product.maker}</dd></div>
            <div className="flex gap-5"><dt className="w-20 shrink-0 text-gim-400">원산지</dt><dd className="font-bold text-gim-800">{product.origin}</dd></div>
          </dl>
        </div>
      </section>

      {/* 실제 패키지와 관리자 작성 상세 설명 */}
      <section id="product-facts" className="mt-20 scroll-mt-32">
        <div className="mb-8 text-center">
          <p className="eyebrow">PRODUCT FACTS</p>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">실제 제품 구성과 안내</h2>
          <p className="mt-3 text-sm text-gim-500">아래 내용과 포장 이미지는 실제 판매 제품을 기준으로 안내합니다.</p>
        </div>
        <div className="grid gap-8 rounded-3xl border border-gim-100 bg-white p-6 sm:p-9 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
          <div className="overflow-hidden rounded-2xl bg-gim-50">
            {product.images[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[0].url}
                alt={`${product.name} 실제 제품 패키지`}
                className="aspect-square h-full w-full object-contain p-5 mix-blend-multiply"
                loading="lazy"
              />
            )}
          </div>
          <div
            className="prose-kr"
            dangerouslySetInnerHTML={{ __html: cleanRichText(product.description || '<p>상세 정보가 준비 중입니다.</p>') }}
          />
        </div>
      </section>

      {/* 식품 표시사항 */}
      <section className="mt-14">
        <h2 className="border-b-2 border-gim-800 pb-3 text-lg font-bold">상품정보 제공고시 (식품)</h2>
        <div className="mt-5 overflow-hidden rounded-lg border border-gim-200">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gim-100">
              {[
                ['제품명', product.name],
                ['식품유형', product.foodType || '-'],
                ['생산자/수입자', product.maker],
                ['제조국/원산지', product.origin],
                ['중량/수량', product.unit || '-'],
                ['원재료명', product.ingredients || '-'],
                ['알레르기 유발물질', product.allergyInfo || '-'],
                ['보관방법', product.storageInfo || '직사광선을 피해 서늘한 곳에 보관'],
                ['소비기한', product.expiryInfo || '제품 포장 표기일까지'],
                ['영양성분', product.nutritionInfo || '-'],
                ['소비자상담 관련 전화번호', SITE.tel],
              ].map(([k, v]) => (
                <tr key={k}>
                  <th className="w-40 bg-gim-50 px-4 py-3 text-left align-top font-medium text-gim-600 sm:w-56">
                    {k}
                  </th>
                  <td className="px-4 py-3 text-gim-800">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 리뷰 */}
      <section id="product-reviews" className="mt-14 scroll-mt-32">
        <h2 className="border-b-2 border-gim-800 pb-3 text-lg font-bold">
          구매후기 <span className="text-point">{product.reviews.length}</span>
        </h2>
        {product.reviews.length === 0 ? (
          <p className="py-12 text-center text-sm text-gim-400">
            첫 번째 구매후기를 남겨주세요.
          </p>
        ) : (
          <ul className="divide-y divide-gim-100">
            {product.reviews.map((r) => (
              <li key={r.id} className="py-5">
                <div className="flex items-center gap-3 text-xs text-gim-400">
                  <span className="text-sm text-point">{'★'.repeat(r.rating)}</span>
                  <span>{maskName(r.user.name ?? '고객')}</span>
                  <span>{fmtDate(r.createdAt)}</span>
                </div>
                <p className="mt-2.5 text-sm leading-6 text-gim-700">{r.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 교환/반품 안내 */}
      <section id="shipping-guide" className="mt-14 scroll-mt-32">
        <h2 className="border-b-2 border-gim-800 pb-3 text-lg font-bold">교환 및 반품 안내</h2>
        <div className="mt-5 space-y-4 text-sm leading-6 text-gim-600">
          <div>
            <p className="font-semibold text-gim-800">교환·반품이 가능한 경우</p>
            <p>상품 수령 후 7일 이내, 표시·광고 내용과 다르거나 상품에 하자가 있는 경우 수령 후 3개월 이내.</p>
          </div>
          <div>
            <p className="font-semibold text-gim-800">교환·반품이 불가능한 경우</p>
            <p>
              신선식품 특성상 단순 변심에 의한 반품은 상품 개봉 전에만 가능합니다.
              개봉 후 또는 고객 부주의로 상품이 훼손된 경우 반품이 제한됩니다.
            </p>
          </div>
          <p className="rounded-lg bg-gim-50 p-4 text-xs">
            반품 접수 : {SITE.tel} · {SITE.email} / 반품 주소 : {SITE.address}
          </p>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-lg font-bold">함께 보면 좋은 상품</h2>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
