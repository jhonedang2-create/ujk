import { guardPage } from '@/lib/guard';
import Link from 'next/link';
import { resolveRange, getAnalytics, growth } from '@/lib/analytics';
import { bucketLabel } from '@/lib/range';
import { won, num, fmtDate, cn } from '@/lib/utils';
import { ORDER_STATUS } from '@/lib/site';
import ChartCard from '@/components/charts/ChartCard';
import AreaChart from '@/components/charts/AreaChart';
import BarList from '@/components/charts/BarList';
import DonutChart from '@/components/charts/DonutChart';
import StatTile from '@/components/charts/StatTile';
import RangeFilter from '@/components/admin/RangeFilter';

export const dynamic = 'force-dynamic';
export const metadata = { title: '매출 분석' };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await guardPage('analytics');

  const sp = await searchParams;
  const range = resolveRange(sp.range, sp.from, sp.to);
  const a = await getAnalytics(range);

  const revGrowth = growth(a.cur.revenue, a.prev.revenue);
  const ordGrowth = growth(a.cur.orders, a.prev.orders);
  const aovGrowth = growth(a.cur.aov, a.prev.aov);
  const userGrowth = growth(a.cur.newUsers, a.prev.newUsers);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">매출 분석</h1>
          <p className="mt-1 text-sm text-gim-500">
            {range.label} · 결제완료 이상 주문 기준
          </p>
        </div>
        <Link href="/admin/orders" className="btn-outline btn-sm">주문 관리로</Link>
      </div>

      {/* 필터 한 줄 — 아래 모든 차트에 동일하게 적용됩니다 */}
      <RangeFilter current={range.preset} from={sp.from} to={sp.to} />

      {/* 히어로 + 지표 */}
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
        <StatTile
          hero
          label={`${range.label} 총 매출`}
          value={won(a.cur.revenue)}
          delta={revGrowth}
          spark={a.trend.revenue}
        />
        <StatTile label="주문 건수" value={`${num(a.cur.orders)}건`} delta={ordGrowth} />
        <StatTile label="객단가" value={won(a.cur.aov)} delta={aovGrowth} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="판매 수량" value={`${num(a.cur.units)}개`} />
        <StatTile label="신규 회원" value={`${num(a.cur.newUsers)}명`} delta={userGrowth} />
        <StatTile
          label="입금 대기"
          value={`${num(a.cur.pendingDeposit)}건`}
          upIsGood={false}
        />
        <StatTile
          label="취소·환불"
          value={`${num(a.cur.cancelled)}건`}
          delta={growth(a.cur.cancelled, a.prev.cancelled)}
          upIsGood={false}
        />
      </div>

      {/* 매출 추이 */}
      <ChartCard
        title="매출 추이"
        subtitle={`${range.label} · ${bucketLabel(range.bucket)} 집계`}
        csvName={`매출추이_${range.label}`}
        table={{
          head: ['기간', '매출(원)', '주문(건)'],
          rows: a.trend.labels.map((l, i) => [l, a.trend.revenue[i], a.trend.orders[i]]),
        }}
      >
        <AreaChart
          labels={a.trend.labels}
          series={[{ name: '매출', values: a.trend.revenue }]}
          height={280}
          format="won"
        />
      </ChartCard>

      <ChartCard
        title="판매 채널별 매출"
        subtitle="자사몰과 오픈마켓 중 어디서 얼마나 팔리는지"
        csvName={`채널별매출_${range.label}`}
        table={{
          head: ['채널', '매출(원)', '주문(건)'],
          rows: a.byChannel.map((c) => [c.label, c.value, c.orders]),
        }}
      >
        {a.byChannel.length === 0 ? (
          <p className="py-12 text-center text-sm text-gim-400">해당 기간에 매출이 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {a.byChannel.map((c) => {
              const max = Math.max(...a.byChannel.map((x) => x.value), 1);
              const share = a.cur.revenue ? Math.round((c.value / a.cur.revenue) * 100) : 0;
              return (
                <li key={c.code}>
                  <div className="mb-1.5 flex items-baseline gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                    <span className="flex-1 text-[13px] text-gim-800">{c.label}</span>
                    <span className="text-[11px] text-gim-400">{c.orders}건 · {share}%</span>
                    <span className="text-[13px] font-bold tabular-nums text-gim-900">{won(c.value)}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-r-[4px] bg-gim-50">
                    <div
                      className="h-full rounded-r-[4px] transition-[width] duration-500"
                      style={{ width: `${Math.max(1.5, (c.value / max) * 100)}%`, background: c.color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="카테고리별 매출"
          subtitle="어떤 품목군이 실제로 돈을 벌어주는지"
          csvName={`카테고리별매출_${range.label}`}
          table={{
            head: ['카테고리', '매출(원)', '수량'],
            rows: a.byCategory.map((c) => [c.label, c.value, c.sub]),
          }}
        >
          <BarList rows={a.byCategory} format="won" />
        </ChartCard>

        <ChartCard
          title="결제수단 비중"
          subtitle="무통장 비중이 높으면 미입금 이탈을 확인하세요"
          csvName={`결제수단_${range.label}`}
          table={{
            head: ['결제수단', '매출(원)'],
            rows: a.byPayment.map((p) => [p.label, p.value]),
          }}
        >
          <DonutChart slices={a.byPayment} format="won" />
        </ChartCard>
      </div>

      <ChartCard
        title="상품 매출 TOP 10"
        subtitle="재고 보충과 메인 노출 순서를 여기 맞춰 정하세요"
        csvName={`상품TOP10_${range.label}`}
        table={{
          head: ['상품', '매출(원)', '수량'],
          rows: a.topProducts.map((p) => [p.label, p.value, p.sub]),
        }}
      >
        <BarList rows={a.topProducts} format="won" showRank />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <ChartCard
          title="주문 상태 분포"
          subtitle="처리해야 할 주문이 어디에 쌓여 있는지"
        >
          <ul className="space-y-2.5">
            {Object.keys(ORDER_STATUS).map((s) => {
              const row = a.byStatus.find((x) => x.status === s);
              const count = row?.count ?? 0;
              const total = a.byStatus.reduce((t, x) => t + x.count, 0) || 1;
              return (
                <li key={s} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-[13px] text-gim-600">{ORDER_STATUS[s]}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-r-[4px] bg-gim-50">
                    <div
                      className="h-full rounded-r-[4px] bg-sea-600"
                      style={{ width: `${(count / total) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right text-[13px] font-semibold tabular-nums text-gim-900">
                    {count}건
                  </span>
                </li>
              );
            })}
          </ul>
        </ChartCard>

        <ChartCard title="최근 주문" subtitle={`${range.label} 내 최신 8건`}>
          <ul className="divide-y divide-gim-100">
            {a.recent.map((o) => (
              <li key={o.orderNo} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-gim-800">{o.product}</p>
                  <p className="text-[11px] text-gim-400">
                    {o.name} · {fmtDate(o.at, true)}
                  </p>
                </div>
                <span
                  className={cn(
                    'badge shrink-0',
                    o.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-sea-50 text-sea-800'
                  )}
                >
                  {ORDER_STATUS[o.status]}
                </span>
                <span className="w-24 shrink-0 text-right text-[13px] font-bold tabular-nums text-gim-900">
                  {won(o.amount)}
                </span>
              </li>
            ))}
            {a.recent.length === 0 && (
              <li className="py-12 text-center text-sm text-gim-400">주문이 없습니다.</li>
            )}
          </ul>
        </ChartCard>
      </div>

      <p className="pb-4 text-xs leading-5 text-gim-400">
        · 매출은 결제완료·상품준비중·배송중·배송완료 주문의 실제 결제금액 합계입니다. 취소/환불 건은 제외됩니다.<br />
        · 증감률은 바로 앞의 같은 길이 기간과 비교한 값입니다. (예: 최근 30일 → 그 이전 30일)
      </p>
    </div>
  );
}
