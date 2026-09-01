import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { can, canAccessAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { won, num, fmtDate, cn } from '@/lib/utils';
import { ORDER_STATUS } from '@/lib/site';
import { getSpark, resolveRange, getAnalytics, growth } from '@/lib/analytics';
import StatTile from '@/components/charts/StatTile';
import ChartCard from '@/components/charts/ChartCard';
import AreaChart from '@/components/charts/AreaChart';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/admin');
  if (!canAccessAdmin(session.user)) redirect('/');

  // 매출 지표는 '매출 분석' 권한이 있는 사람에게만 보여줍니다
  const showRevenue = can(session.user, 'analytics');

  const range = resolveRange('30d');

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [a, spark, userCount, productCount, lowStock, chatUnread, openInquiries, todayOrders] =
    await Promise.all([
    getAnalytics(range),
    getSpark(14),
    prisma.user.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.findMany({
      where: { isActive: true, stock: { lte: 10 } },
      orderBy: { stock: 'asc' },
      take: 6,
    }),
    prisma.chatRoom.aggregate({ _sum: { unreadAdmin: true } }),
    prisma.inquiry.count({ where: { status: 'OPEN' } }),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">대시보드</h1>
          <p className="mt-1 text-sm text-gim-500">
            최근 30일 기준 · 오늘 주문 {todayOrders}건
            {!showRevenue && ' · 매출 지표는 권한이 있는 계정에만 표시됩니다'}
          </p>
        </div>
        {showRevenue && (
          <Link href="/admin/analytics" className="btn-primary btn-sm px-5">
            매출 분석 자세히 보기 →
          </Link>
        )}
      </div>

      {/* 오늘 처리할 일 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['입금/결제 대기', a.cur.pendingDeposit, '/admin/orders?status=PENDING', '입금 확인 후 발송'],
          [
            '발송 대기',
            a.byStatus.filter((s) => ['PAID', 'PREPARING'].includes(s.status)).reduce((t, s) => t + s.count, 0),
            '/admin/orders?status=PAID',
            '송장 등록 필요',
          ],
          ['새 상담 메시지', chatUnread._sum.unreadAdmin ?? 0, '/admin/chat', '고객이 기다리는 중'],
          ['미답변 문의', openInquiries, '/admin/inquiries', '1일 내 회신 권장'],
        ].map(([label, count, href, sub]) => (
          <Link
            key={label as string}
            href={href as string}
            className={cn(
              'lift rounded-2xl border bg-white p-5',
              (count as number) > 0 ? 'border-point/30' : 'border-gim-100'
            )}
          >
            <p className="text-xs font-medium text-gim-500">{label as string}</p>
            <p
              className={cn(
                'mt-2 text-3xl font-bold',
                (count as number) > 0 ? 'text-point' : 'text-gim-300'
              )}
            >
              {num(count as number)}
            </p>
            <p className="mt-1 text-[11px] text-gim-400">{sub as string}</p>
          </Link>
        ))}
      </div>

      {/* 매출 지표 — analytics 권한 보유자만 */}
      {showRevenue && (
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
        <StatTile
          hero
          label="최근 30일 매출"
          value={won(a.cur.revenue)}
          delta={growth(a.cur.revenue, a.prev.revenue)}
          spark={spark}
        />
        <StatTile
          label="주문 건수"
          value={`${num(a.cur.orders)}건`}
          delta={growth(a.cur.orders, a.prev.orders)}
        />
        <StatTile
          label="객단가"
          value={won(a.cur.aov)}
          delta={growth(a.cur.aov, a.prev.aov)}
        />
      </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="전체 회원" value={`${num(userCount)}명`} />
        <StatTile label="판매중 상품" value={`${num(productCount)}개`} />
        <StatTile label="판매 수량" value={`${num(a.cur.units)}개`} />
      </div>

      {showRevenue && (
      <ChartCard
        title="매출 추이"
        subtitle="최근 30일 · 일별"
        action={
          <Link href="/admin/analytics" className="btn-outline btn-sm">
            전체 분석
          </Link>
        }
        csvName="매출추이_최근30일"
        table={{
          head: ['날짜', '매출(원)', '주문(건)'],
          rows: a.trend.labels.map((l, i) => [l, a.trend.revenue[i], a.trend.orders[i]]),
        }}
      >
        <AreaChart
          labels={a.trend.labels}
          series={[{ name: '매출', values: a.trend.revenue }]}
          height={240}
          format="won"
        />
      </ChartCard>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <ChartCard title="최근 주문" action={<Link href="/admin/orders" className="btn-outline btn-sm">전체</Link>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gim-50 text-xs text-gim-500">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium">주문번호</th>
                  <th className="px-3 py-2.5 text-left font-medium">주문자</th>
                  <th className="px-3 py-2.5 text-left font-medium">상품</th>
                  <th className="px-3 py-2.5 text-right font-medium">금액</th>
                  <th className="px-3 py-2.5 text-center font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gim-100">
                {a.recent.map((o) => (
                  <tr key={o.orderNo} className="hover:bg-gim-50">
                    <td className="px-3 py-3">
                      <span className="text-sea-700">{o.orderNo}</span>
                      <p className="text-[11px] text-gim-400">{fmtDate(o.at, true)}</p>
                    </td>
                    <td className="px-3 py-3">{o.name}</td>
                    <td className="max-w-[180px] truncate px-3 py-3 text-gim-600">{o.product}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">
                      {showRevenue ? won(o.amount) : '—'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="badge bg-sea-50 text-sea-800">{ORDER_STATUS[o.status]}</span>
                    </td>
                  </tr>
                ))}
                {a.recent.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gim-400">
                      최근 30일 주문이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="재고 부족 상품" subtitle="10개 이하">
          {lowStock.length === 0 ? (
            <p className="py-12 text-center text-sm text-gim-400">재고가 넉넉합니다.</p>
          ) : (
            <ul className="divide-y divide-gim-100">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="line-clamp-1 text-sm hover:text-sea-700"
                  >
                    {p.name}
                  </Link>
                  <span
                    className={cn(
                      'ml-3 shrink-0 text-sm font-bold tabular-nums',
                      p.stock === 0 ? 'text-point' : 'text-amber-600'
                    )}
                  >
                    {p.stock}개
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
