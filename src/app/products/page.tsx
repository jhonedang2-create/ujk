import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PageHero from '@/components/PageHero';
import ProductCard from '@/components/ProductCard';
import Pagination from '@/components/Pagination';
import Empty from '@/components/Empty';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: '대천우정김 자사몰 | 재래김·도시락김·식탁김',
  description: '대천우정김 자사몰 상품 목록. 보령에서 만드는 조미구이재래김, 도시락김, 식탁김, 파래김과 김 선물세트의 구성과 가격을 확인하세요.',
  alternates: { canonical: '/products' },
  openGraph: {
    title: '대천우정김 자사몰 제품',
    description: '재래김·도시락김·식탁김·선물세트를 만나보세요.',
    url: '/products',
    images: ['/products/seasoned-jaerae-20.webp'],
  },
};
export const dynamic = 'force-dynamic';

const SIZE = 12;
const SORTS: [string, string][] = [
  ['new', '신상품순'],
  ['popular', '인기순'],
  ['low', '낮은 가격순'],
  ['high', '높은 가격순'],
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string; sort?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const sort = sp.sort ?? 'new';
  const q = sp.q?.trim();

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  const current = sp.category ? categories.find((c) => c.slug === sp.category) : undefined;

  // 하위 카테고리까지 포함
  const categoryIds = current
    ? [current.id, ...categories.filter((c) => c.parentId === current.id).map((c) => c.id)]
    : undefined;

  const where = {
    isActive: true,
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
    ...(q ? { name: { contains: q } } : {}),
  };

  const orderBy =
    sort === 'popular'
      ? [{ soldCount: 'desc' as const }]
      : sort === 'low'
      ? [{ price: 'asc' as const }]
      : sort === 'high'
      ? [{ price: 'desc' as const }]
      : [{ createdAt: 'desc' as const }];

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      skip: (page - 1) * SIZE,
      take: SIZE,
    }),
  ]);

  const qs = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { category: sp.category, sort, q, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && params.set(k, v));
    const s = params.toString();
    return s ? `/products?${s}` : '/products';
  };

  return (
    <>
      <PageHero
        title={current?.name ?? '전체 제품'}
        subtitle={current?.description || '대천우정김의 재래김·도시락김 제품을 확인하세요.'}
        breadcrumb={[['제품', '/products']]}
      />

      <section className="container-x py-14">
        {/* 카테고리 필터 */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href={qs({ category: undefined, page: undefined })}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium',
              !sp.category ? 'bg-sea-800 text-white' : 'bg-gim-50 text-gim-600 hover:bg-gim-100'
            )}
          >
            전체
          </Link>
          {categories
            .filter((c) => !c.parentId)
            .map((c) => (
              <Link
                key={c.id}
                href={qs({ category: c.slug, page: undefined })}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium',
                  sp.category === c.slug ? 'bg-sea-800 text-white' : 'bg-gim-50 text-gim-600 hover:bg-gim-100'
                )}
              >
                {c.name}
              </Link>
            ))}
        </div>

        {/* 정렬 + 검색 */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-gim-100 pb-4">
          <p className="text-sm text-gim-500">
            총 <strong className="text-gim-900">{total}</strong>개의 상품
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <form action="/products" className="flex gap-2">
              {sp.category && <input type="hidden" name="category" value={sp.category} />}
              <input name="q" defaultValue={q} placeholder="상품명 검색" className="input w-44 py-2" />
              <button className="btn-outline btn-sm">검색</button>
            </form>
            <div className="flex gap-3 text-sm">
              {SORTS.map(([s, label]) => (
                <Link
                  key={s}
                  href={qs({ sort: s, page: undefined })}
                  className={cn(sort === s ? 'font-bold text-sea-800' : 'text-gim-400 hover:text-gim-700')}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <Empty text="조건에 맞는 상품이 없습니다." sub="다른 카테고리나 검색어로 찾아보세요." />
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={Math.ceil(total / SIZE)}
          basePath="/products"
          query={{ category: sp.category, sort, q }}
        />
      </section>
    </>
  );
}
