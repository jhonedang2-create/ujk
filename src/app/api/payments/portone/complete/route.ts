import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPortOnePayment } from '@/lib/payments/portone';
import { markOrderPaid } from '@/lib/payments';

/**
 * 포트원 결제 완료 콜백.
 * 클라이언트가 imp_uid 를 보내면 서버가 포트원 API 로 실제 결제 내역을 조회해
 * 금액 위변조 여부를 검증한 뒤 주문을 확정합니다.
 */
export async function POST(req: NextRequest) {
  try {
    const { imp_uid, merchant_uid } = await req.json();
    if (!imp_uid || !merchant_uid) {
      return NextResponse.json({ ok: false, message: '결제 정보가 없습니다.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { orderNo: merchant_uid }, include: { payment: true } });
    if (!order) {
      return NextResponse.json({ ok: false, message: '주문을 찾을 수 없습니다.' }, { status: 404 });
    }

    const pay = await getPortOnePayment(imp_uid);

    if (order.payment?.method !== 'PORTONE' || pay.imp_uid !== imp_uid || pay.merchant_uid !== merchant_uid) {
      return NextResponse.json({ ok: false, message: '주문과 결제 정보가 일치하지 않습니다.' }, { status: 400 });
    }
    if (order.status !== 'PENDING' || order.payment.status !== 'READY') {
      if (order.status === 'PAID' && order.payment.impUid === imp_uid) {
        return NextResponse.json({ ok: true, publicToken: order.publicToken });
      }
      return NextResponse.json({ ok: false, message: '이미 처리된 주문입니다.' }, { status: 409 });
    }
    if (pay.status !== 'paid') {
      return NextResponse.json({ ok: false, message: `결제 상태가 올바르지 않습니다. (${pay.status})` }, { status: 400 });
    }
    if (pay.amount !== order.totalAmount) {
      return NextResponse.json({ ok: false, message: '결제 금액이 일치하지 않습니다.' }, { status: 400 });
    }

    await markOrderPaid({
      orderId: order.id,
      method: 'PORTONE',
      provider: pay.pg_provider,
      amount: pay.amount,
      impUid: imp_uid,
      merchantUid: merchant_uid,
      receiptUrl: pay.receipt_url,
      raw: pay,
    });

    return NextResponse.json({ ok: true, publicToken: order.publicToken });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : '결제 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
