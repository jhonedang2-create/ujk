import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { fmtDate, cn } from '@/lib/utils';
import Pagination from '@/components/Pagination';
import ReviewAdminActions from '@/components/admin/ReviewAdminActions';

export const dynamic = 'force-dynamic';
const SIZE = 30;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const active = sp.status === 'hidden' ? false : sp.status === 'all' ? undefined : true;
  const where = active === undefined ? {} : { isActive: active };

  const [total, rows] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * SIZE,
      take: SIZE,
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">구매후기 관리</h1>
        <p className="mt-1 text-sm text-gim-500">실구매 후기를 확인하고 문제가 있는 후기만 숨김 처리합니다.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['', '공개'],
          ['hidden', '숨김'],
          ['all', '전체'],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={value ? `/admin/reviews?status=${value}` : '/admin/reviews'}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-semibold',
              (sp.status ?? '') === value ? 'bg-sea-800 text-white' : 'bg-gim-50 text-gim-600'
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-gim-50 text-xs text-gim-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">작성일</th>
                <th className="px-4 py-3 text-left font-medium">상품</th>
                <th className="px-4 py-3 text-left font-medium">작성자</th>
                <th className="px-4 py-3 text-left font-medium">별점 / 후기</th>
                <th className="px-4 py-3 text-center font-medium">상태</th>
                <th className="px-4 py-3 text-right font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gim-100">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-gim-400">{fmtDate(r.createdAt, true)}</td>
                  <td className="max-w-[220px] px-4 py-4">
                    <Link href={`/products/${r.product.slug}`} target="_blank" className="font-semibold hover:text-sea-700">
                      {r.product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <p>{r.user.name ?? '고객'}</p>
                    <p className="text-[11px] text-gim-400">{r.user.email ?? '-'}</p>
                  </td>
                  <td className="max-w-[360px] px-4 py-4">
                    <p className="text-point">{'★'.repeat(r.rating)}</p>
                    <p className="mt-1 whitespace-pre-wrap leading-6 text-gim-700">{r.content}</p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={r.isActive ? 'badge bg-sea-50 text-sea-800' : 'badge bg-red-50 text-red-700'}>
                      {r.isActive ? '공개' : '숨김'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <ReviewAdminActions id={r.id} active={r.isActive} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="py-14 text-center text-gim-400">구매후기가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page}
        totalPages={Math.ceil(total / SIZE)}
        basePath="/admin/reviews"
        query={{ status: sp.status }}
      />
    </div>
  );
}
