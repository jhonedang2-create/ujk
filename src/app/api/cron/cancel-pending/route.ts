import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { settleOrderCancellation } from '@/lib/payments';

export const dynamic = 'force-dynamic';

function validSecret(value: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !value?.startsWith('Bearer ')) return false;
  const supplied = value.slice(7);
  const a = Buffer.from(secret);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** 48시간이 지난 미결제 주문의 예약 재고와 사용 적립금을 안전하게 되돌립니다. */
export async function POST(req: NextRequest) {
  if (!validSecret(req.headers.get('authorization'))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: { status: 'PENDING', createdAt: { lte: cutoff }, refundSettledAt: null },
    select: { id: true },
    take: 100,
  });

  let cancelled = 0;
  for (const order of orders) {
    try {
      await settleOrderCancellation(order.id, '48시간 미결제 자동 취소');
      cancelled += 1;
    } catch {
      // 한 주문의 실패가 나머지 정리를 막지 않도록 계속 진행합니다.
    }
  }

  return NextResponse.json({ ok: true, checked: orders.length, cancelled });
}
