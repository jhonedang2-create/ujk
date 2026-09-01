import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { won, fmtDate, num } from '@/lib/utils';
import { ORDER_STATUS, USER_GRADE } from '@/lib/site';
import ProfileForm from '@/components/ProfileForm';

export const metadata = { title: '마이페이지' };
export const dynamic = 'force-dynamic';

export default async function MypageHome() {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/mypage');
  const userId = session.user.id;

  const [user, orders, counts] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { items: { take: 1 } },
    }),
    prisma.order.groupBy({ by: ['status'], where: { userId }, _count: true }),
  ]);

  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="space-y-8">
      <div className="card p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-bold">{user?.name ?? '고객'}님</p>
            <p className="mt-1 text-sm text-gim-500">
              {user?.email} · {USER_GRADE[user?.grade ?? 'BASIC']} 등급
              {user?.provider && user.provider !== 'credentials' && (
                <span className="ml-2 badge bg-gim-100 text-gim-600">
                  {user.provider === 'naver' ? '네이버' : '카카오'} 연동
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gim-400">보유 적립금</p>
            <p className="text-2xl font-black text-point">{num(user?.point)}P</p>
          </div>
        </div>
      </div>

      <ProfileForm
        name={user?.name ?? ''}
        phone={user?.phone ?? ''}
        agreeMarketing={user?.agreeMarketing ?? false}
        needsPhone={!user?.phoneNorm}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ['PENDING', '입금/결제대기'],
          ['PAID', '결제완료'],
          ['SHIPPING', '배송중'],
          ['DELIVERED', '배송완료'],
        ].map(([s, label]) => (
          <Link
            key={s}
            href={`/mypage/orders?status=${s}`}
            className="card p-5 text-center transition hover:border-sea-300"
          >
            <p className="text-2xl font-black text-sea-800">{countOf(s)}</p>
            <p className="mt-1 text-xs text-gim-500">{label}</p>
          </Link>
        ))}
      </div>

      <div className="card p-7">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold">최근 주문</h2>
          <Link href="/mypage/orders" className="text-xs text-gim-500 hover:text-sea-700">전체보기 +</Link>
        </div>

        {orders.length === 0 ? (
          <p className="py-10 text-center text-sm text-gim-400">주문 내역이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gim-100">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/mypage/orders/${o.orderNo}`} className="flex items-center gap-4 py-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gim-50">
                    {o.items[0]?.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.items[0].imageUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gim-400">{fmtDate(o.createdAt)} · {o.orderNo}</p>
                    <p className="mt-0.5 line-clamp-1 text-sm font-semibold">{o.items[0]?.productName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{won(o.totalAmount)}</p>
                    <p className="text-xs text-sea-700">{ORDER_STATUS[o.status]}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
