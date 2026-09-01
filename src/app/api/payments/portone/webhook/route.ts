import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPortOnePayment } from '@/lib/payments/portone';
import { markOrderPaid, settleOrderCancellation } from '@/lib/payments';

/**
 * 포트원 웹훅 (포트원 관리자 콘솔에 이 주소를 등록하세요)
 *   https://도메인/api/payments/portone/webhook
 * 브라우저가 꺼졌거나 콜백이 실패한 경우에도 결제를 확정해 주는 안전장치입니다.
 */
export async function POST(req: NextRequest) {
  try {
    const { imp_uid } = await req.json();
    if (!imp_uid) return NextResponse.json({ ok: false }, { status: 400 });

    const pay = await getPortOnePayment(imp_uid);
    if (!pay.merchant_uid || pay.imp_uid !== imp_uid) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const order = await prisma.order.findUnique({
      where: { orderNo: pay.merchant_uid },
      include: { payment: true },
    });
    if (!order) return NextResponse.json({ ok: false }, { status: 404 });
    if (order.payment?.method !== 'PORTONE' || order.totalAmount !== pay.amount) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    if (pay.status === 'paid' && pay.amount === order.totalAmount) {
      await markOrderPaid({
        orderId: order.id,
        method: 'PORTONE',
        provider: pay.pg_provider,
        amount: pay.amount,
        impUid: imp_uid,
        merchantUid: pay.merchant_uid,
        receiptUrl: pay.receipt_url,
        raw: pay,
      });
    } else if (pay.status === 'cancelled') {
      await settleOrderCancellation(order.id, '포트원 결제 취소 웹훅');
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
