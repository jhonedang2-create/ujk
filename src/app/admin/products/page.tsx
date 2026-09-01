import { guardPage } from '@/lib/guard';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { won, fmtDate } from '@/lib/utils';
import Pagination from '@/components/Pagination';
import ProductRowActions from '@/components/admin/ProductRowActions';

export const dynamic = 'force-dynamic';
const SIZE = 20;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; category?: string }>;
}) {
  await guardPage('products');

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const q = sp.q?.trim();

  const where = {
    ...(q ? { name: { contains: q } } : {}),
    ...(sp.category ? { categoryId: sp.category } : {}),
  };

  const [total, products, categories] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * SIZE,
      take: SIZE,
    }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">상품 관리 <span className="text-sm font-normal text-gim-400">({total})</span></h1>
        <div className="flex gap-2">
          <Link href="/admin/products/import" className="btn-outline btn-sm px-4">
            벤더 일괄 등록
          </Link>
          <Link href="/admin/products/new" className="btn-primary btn-sm px-5">+ 상품 등록</Link>
        </div>
      </div>

      <form action="/admin/products" className="flex flex-wrap gap-2">
        <select name="category" defaultValue={sp.category ?? ''} className="input w-44 py-2">
          <option value="">전체 카테고리</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input name="q" defaultValue={q} placeholder="상품명 검색" className="input w-52 py-2" />
        <button className="btn-outline btn-sm">검색</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[840px] text-sm">
          <thead className="bg-gim-50 text-xs text-gim-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">상품</th>
              <th className="px-4 py-3 text-left font-medium">카테고리</th>
              <th className="px-4 py-3 text-right font-medium">판매가</th>
              <th className="px-4 py-3 text-right font-medium">재고</th>
              <th className="px-4 py-3 text-right font-medium">판매량</th>
              <th className="px-4 py-3 text-center font-medium">상태</th>
              <th className="px-4 py-3 text-center font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gim-100">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gim-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gim-100">
                      {p.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link href={`/admin/products/${p.id}`} className="line-clamp-1 font-medium hover:text-sea-700">
                        {p.name}
                      </Link>
                      <p className="text-[11px] text-gim-400">{fmtDate(p.createdAt)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gim-600">{p.category.name}</td>
                <td className="px-4 py-3 text-right font-semibold">{won(p.price)}</td>
                <td className={`px-4 py-3 text-right ${p.stock <= 10 ? 'font-bold text-point' : ''}`}>{p.stock}</td>
                <td className="px-4 py-3 text-right text-gim-500">{p.soldCount}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`badge ${p.isActive ? 'bg-sea-50 text-sea-800' : 'bg-gim-100 text-gim-500'}`}>
                    {p.isActive ? '판매중' : '중지'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ProductRowActions id={p.id} isActive={p.isActive} />
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={7} className="py-16 text-center text-gim-400">등록된 상품이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={Math.ceil(total / SIZE)}
        basePath="/admin/products"
        query={{ q, category: sp.category }}
      />
    </div>
  );
}
