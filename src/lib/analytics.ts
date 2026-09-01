import { prisma } from '@/lib/prisma';

/** 매출로 인정하는 주문 상태 */
export const PAID_STATUS = ['PAID', 'PREPARING', 'SHIPPING', 'DELIVERED'] as const;

export {
  resolveRange,
  bucketKey,
  bucketLabel,
  RANGE_LABEL,
  type RangePreset,
  type Range,
} from '@/lib/range';

import { bucketKey, type Range } from '@/lib/range';

/** 기간 전체를 빈 버킷까지 포함해 순서대로 만들기 */
function buildBuckets(r: Range) {
  const keys: string[] = [];
  const seen = new Set<string>();
  const cursor = new Date(r.from);
  const stepMs = r.bucket === 'hour' ? 3_600_000 : 86_400_000;

  // 무한루프 방지 상한 (시간 버킷 최대 1년치)
  let guard = 0;
  while (cursor.getTime() <= r.to.getTime() && guard++ < 20000) {
    const k = bucketKey(cursor, r.bucket, r.crossesYear);
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
    cursor.setTime(cursor.getTime() + stepMs);
  }
  return keys;
}

export type Summary = {
  revenue: number;
  orders: number;
  aov: number; // 객단가
  units: number; // 판매 수량
  newUsers: number;
  cancelled: number;
  pendingDeposit: number;
};

async function summarize(from: Date, to: Date): Promise<Summary> {
  const where = { createdAt: { gte: from, lte: to } };

  const [paid, cancelled, pending, newUsers, items] = await Promise.all([
    prisma.order.aggregate({
      where: { ...where, status: { in: [...PAID_STATUS] } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.order.count({ where: { ...where, status: { in: ['CANCELLED', 'REFUNDED'] } } }),
    prisma.order.count({ where: { ...where, status: 'PENDING' } }),
    prisma.user.count({ where }),
    prisma.orderItem.findMany({
      where: { order: { ...where, status: { in: [...PAID_STATUS] } } },
      select: { quantity: true },
    }),
  ]);

  const revenue = paid._sum.totalAmount ?? 0;
  const orders = paid._count;

  return {
    revenue,
    orders,
    aov: orders ? Math.round(revenue / orders) : 0,
    units: items.reduce((s, i) => s + i.quantity, 0),
    newUsers,
    cancelled,
    pendingDeposit: pending,
  };
}

export function growth(cur: number, prev: number): number | null {
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
}

export type Analytics = {
  range: Range;
  cur: Summary;
  prev: Summary;
  trend: { labels: string[]; revenue: number[]; orders: number[] };
  byCategory: { label: string; value: number; sub: string }[];
  topProducts: { label: string; value: number; sub: string }[];
  byPayment: { label: string; value: number }[];
  byChannel: { code: string; label: string; color: string; value: number; orders: number }[];
  byStatus: { status: string; count: number; amount: number }[];
  recent: {
    orderNo: string;
    name: string;
    amount: number;
    status: string;
    at: Date;
    product: string;
  }[];
};

export async function getAnalytics(r: Range): Promise<Analytics> {
  const [cur, prev] = await Promise.all([summarize(r.from, r.to), summarize(r.prevFrom, r.prevTo)]);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: r.from, lte: r.to } },
    include: {
      payment: true,
      items: { include: { product: { include: { category: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const paidOrders = orders.filter((o) => (PAID_STATUS as readonly string[]).includes(o.status));

  // ── 추이 ──
  const keys = buildBuckets(r);
  const revMap = new Map(keys.map((k) => [k, 0]));
  const ordMap = new Map(keys.map((k) => [k, 0]));
  for (const o of paidOrders) {
    const k = bucketKey(o.createdAt, r.bucket, r.crossesYear);
    if (revMap.has(k)) {
      revMap.set(k, revMap.get(k)! + o.totalAmount);
      ordMap.set(k, ordMap.get(k)! + 1);
    }
  }

  // ── 카테고리별 / 상품별 ──
  const catMap = new Map<string, { amount: number; qty: number }>();
  const prodMap = new Map<string, { amount: number; qty: number }>();

  for (const o of paidOrders) {
    for (const it of o.items) {
      const cat = it.product?.category?.name ?? '기타';
      const c = catMap.get(cat) ?? { amount: 0, qty: 0 };
      c.amount += it.price * it.quantity;
      c.qty += it.quantity;
      catMap.set(cat, c);

      const p = prodMap.get(it.productName) ?? { amount: 0, qty: 0 };
      p.amount += it.price * it.quantity;
      p.qty += it.quantity;
      prodMap.set(it.productName, p);
    }
  }

  // ── 결제수단 ──
  const payLabel: Record<string, string> = {
    BANK: '무통장입금',
    TOSS: '토스페이먼츠',
    PORTONE: '포트원',
  };
  const payMap = new Map<string, number>();
  for (const o of paidOrders) {
    const k = payLabel[o.payment?.method ?? ''] ?? '기타';
    payMap.set(k, (payMap.get(k) ?? 0) + o.totalAmount);
  }

  // ── 채널별 ──
  const channels = await prisma.channel.findMany({ orderBy: { sortOrder: 'asc' } });
  const chMap = new Map<string, { value: number; orders: number }>();
  for (const o of paidOrders) {
    const c = chMap.get(o.channelCode) ?? { value: 0, orders: 0 };
    c.value += o.totalAmount;
    c.orders += 1;
    chMap.set(o.channelCode, c);
  }

  // ── 상태별 ──
  const statusMap = new Map<string, { count: number; amount: number }>();
  for (const o of orders) {
    const s = statusMap.get(o.status) ?? { count: 0, amount: 0 };
    s.count += 1;
    s.amount += o.totalAmount;
    statusMap.set(o.status, s);
  }

  return {
    range: r,
    cur,
    prev,
    trend: {
      labels: keys,
      revenue: keys.map((k) => revMap.get(k) ?? 0),
      orders: keys.map((k) => ordMap.get(k) ?? 0),
    },
    byCategory: [...catMap.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([label, v]) => ({ label, value: v.amount, sub: `${v.qty}개` })),
    topProducts: [...prodMap.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 10)
      .map(([label, v]) => ({ label, value: v.amount, sub: `${v.qty}개` })),
    byPayment: [...payMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value })),
    byChannel: [...chMap.entries()]
      .map(([code, v]) => {
        const ch = channels.find((c) => c.code === code);
        return {
          code,
          label: ch?.name ?? code,
          color: ch?.color ?? '#9b8e74',
          value: v.value,
          orders: v.orders,
        };
      })
      .sort((a, b) => b.value - a.value),
    byStatus: [...statusMap.entries()].map(([status, v]) => ({ status, ...v })),
    recent: orders.slice(0, 8).map((o) => ({
      orderNo: o.orderNo,
      name: o.ordererName,
      amount: o.totalAmount,
      status: o.status,
      at: o.createdAt,
      product:
        o.items.length > 1
          ? `${o.items[0]?.productName ?? ''} 외 ${o.items.length - 1}건`
          : (o.items[0]?.productName ?? '-'),
    })),
  };
}

/** 대시보드용 최근 14일 매출 스파크라인 */
export async function getSpark(days = 14) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from }, status: { in: [...PAID_STATUS] } },
    select: { createdAt: true, totalAmount: true },
  });

  const out = Array.from({ length: days }, () => 0);
  for (const o of orders) {
    const idx = Math.floor((o.createdAt.getTime() - from.getTime()) / 86_400_000);
    if (idx >= 0 && idx < days) out[idx] += o.totalAmount;
  }
  return out;
}
