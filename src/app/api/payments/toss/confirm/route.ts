import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { confirmTossPayment } from '@/lib/payments/toss';
import { markOrderPaid } from '@/lib/payments';

/**
 * 토스페이먼츠 successUrl 콜백.
 * 결제창에서 인증이 끝나면 이 주소로 리다이렉트되고,
 * 여기서 서버가 승인(confirm) API 를 호출해야 실제 결제가 완료됩니다.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const paymentKey = sp.get('paymentKey');
  const orderNo = sp.get('orderId'); // 우리 orderNo 를 orderId 로 전달했습니다
  const amount = Number(sp.get('amount') ?? 0);

  const base = req.nextUrl.origin;
  let publicToken = '';
  const fail = (msg: string) =>
    NextResponse.redirect(
      `${base}/checkout/complete?fail=1&token=${publicToken}&msg=${encodeURIComponent(msg)}`
    );

  if (!paymentKey || !orderNo || !amount) return fail('결제 정보가 올바르지 않습니다.');

  try {
    const order = await prisma.order.findUnique({ where: { orderNo }, include: { payment: true } });
    if (!order) return fail('주문을 찾을 수 없습니다.');
    publicToken = order.publicToken;
    if (order.totalAmount !== amount) return fail('결제 금액이 주문 금액과 일치하지 않습니다.');
    if (order.payment?.method !== 'TOSS') return fail('주문 결제수단이 일치하지 않습니다.');
    if (order.status !== 'PENDING' || order.payment.status !== 'READY') {
      if (order.status === 'PAID' && order.payment.paymentKey === paymentKey) {
        return NextResponse.redirect(`${base}/checkout/complete?token=${order.publicToken}`);
      }
      return fail('이미 처리된 주문입니다.');
    }

    const result = await confirmTossPayment({ paymentKey, orderId: orderNo, amount });

    if (result.status !== 'DONE') return fail(`결제가 완료되지 않았습니다. (${result.status})`);

    await markOrderPaid({
      orderId: order.id,
      method: 'TOSS',
      provider: 'toss',
      amount,
      paymentKey,
      merchantUid: orderNo,
      receiptUrl: result.receipt?.url,
      raw: result,
    });

    return NextResponse.redirect(`${base}/checkout/complete?token=${order.publicToken}`);
  } catch (e) {
    return fail(e instanceof Error ? e.message : '결제 승인 중 오류가 발생했습니다.');
  }
}
