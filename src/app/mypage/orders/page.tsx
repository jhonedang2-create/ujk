import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { won, fmtDate, cn } from '@/lib/utils';
import { ORDER_STATUS } from '@/lib/site';
import Pagination from '@/components/Pagination';
import Empty from '@/components/Empty';

export const metadata = { title: '주문내역' };
export const dynamic = 'force-dynamic';

const SIZE = 10;

export default async function MyOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/mypage/orders');
  const userId = session.user.id;
  const page = Math.max(1, Number(sp.page ?? 1));

  const where = { userId, ...(sp.status ? { status: sp.status } : {}) };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true, payment: true },
      skip: (page - 1) * SIZE,
      take: SIZE,
    }),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/mypage/orders"
          className={cn(
            'rounded-full px-4 py-1.5 text-xs font-medium',
            !sp.status ? 'bg-sea-800 text-white' : 'bg-gim-50 text-gim-600'
          )}
        >
          전체
        </Link>
        {Object.entries(ORDER_STATUS).map(([k, v]) => (
          <Link
            key={k}
            href={`/mypage/orders?status=${k}`}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-medium',
              sp.status === k ? 'bg-sea-800 text-white' : 'bg-gim-50 text-gim-600'
            )}
          >
            {v}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <Empty text="주문 내역이 없습니다." />
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gim-100 pb-3">
                <div className="text-xs text-gim-500">
                  {fmtDate(o.createdAt, true)} · 주문번호 {o.orderNo}
                </div>
                <span className="badge bg-sea-50 text-sea-800">{ORDER_STATUS[o.status]}</span>
              </div>

              <ul className="divide-y divide-gim-50">
                {o.items.map((it) => (
                  <li key={it.id} className="flex items-center gap-4 py-3.5">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gim-50">
                      {it.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.imageUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{it.productName}</p>
                      {it.optionName && <p className="text-xs text-gim-400">{it.optionName}</p>}
                      <p className="text-xs text-gim-500">{won(it.price)} · {it.quantity}개</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gim-100 pt-3">
                <p className="text-sm">
                  결제금액 <strong className="text-base">{won(o.totalAmount)}</strong>
                </p>
                <div className="flex gap-2">
                  {o.trackingNo && (
                    <a
                      href={`https://search.naver.com/search.naver?query=${encodeURIComponent(`${o.courier ?? ''} ${o.trackingNo}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-outline btn-sm"
                    >
                      배송조회
                    </a>
                  )}
                  <Link href={`/mypage/orders/${o.orderNo}`} className="btn-outline btn-sm">
                    상세보기
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(total / SIZE)}
        basePath="/mypage/orders"
        query={{ status: sp.status }}
      />
    </div>
  );
}
