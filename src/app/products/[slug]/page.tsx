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

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          <p className="text-xs font-semibold text-sea-600">{product.category.name}</p>
          <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">{product.name}</h1>
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
        </div>
      </div>

      {/* 상세 설명 */}
      <section className="mt-20">
        <h2 className="border-b-2 border-gim-800 pb-3 text-lg font-bold">상품 상세정보</h2>
        <div
          className="prose-kr py-10"
          dangerouslySetInnerHTML={{ __html: cleanRichText(product.description || '<p>상세 정보가 준비 중입니다.</p>') }}
        />
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
      <section className="mt-14">
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
      <section className="mt-14">
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
