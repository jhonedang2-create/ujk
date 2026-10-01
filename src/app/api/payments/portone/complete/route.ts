import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPortOnePayment } from '@/lib/payments/portone';
import { markOrderPaid } from '@/lib/payments';

type VerifyResult =
  | { ok: true; publicToken: string }
  | { ok: false; message: string; status: number; publicToken?: string };

async function verifyPortOnePayment(impUid: string, merchantUid: string): Promise<VerifyResult> {
  if (!impUid || !merchantUid) {
    return { ok: false, message: '결제 정보가 없습니다.', status: 400 };
  }

  const order = await prisma.order.findUnique({
    where: { orderNo: merchantUid },
    include: { payment: true },
  });
  if (!order) {
    return { ok: false, message: '주문을 찾을 수 없습니다.', status: 404 };
  }

  const pay = await getPortOnePayment(impUid);

  if (
    order.payment?.method !== 'PORTONE' ||
    pay.imp_uid !== impUid ||
    pay.merchant_uid !== merchantUid
  ) {
    return {
      ok: false,
      message: '주문과 결제 정보가 일치하지 않습니다.',
      status: 400,
      publicToken: order.publicToken,
    };
  }

  if (order.status !== 'PENDING' || order.payment.status !== 'READY') {
    if (order.status === 'PAID' && order.payment.impUid === impUid) {
      return { ok: true, publicToken: order.publicToken };
    }
    return {
      ok: false,
      message: '이미 처리된 주문입니다.',
      status: 409,
      publicToken: order.publicToken,
    };
  }

  if (pay.status !== 'paid') {
    return {
      ok: false,
      message: `결제 상태가 올바르지 않습니다. (${pay.status})`,
      status: 400,
      publicToken: order.publicToken,
    };
  }

  if (pay.amount !== order.totalAmount) {
    return {
      ok: false,
      message: '결제 금액이 일치하지 않습니다.',
      status: 400,
      publicToken: order.publicToken,
    };
  }

  await markOrderPaid({
    orderId: order.id,
    method: 'PORTONE',
    provider: pay.pg_provider,
    amount: pay.amount,
    impUid,
    merchantUid,
    receiptUrl: pay.receipt_url,
    raw: pay,
  });

  return { ok: true, publicToken: order.publicToken };
}

/**
 * PC 결제 callback.
 * 결제창 응답만 신뢰하지 않고 포트원 REST API로 실제 승인 내역을 다시 조회합니다.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await verifyPortOnePayment(
      String(body?.imp_uid ?? ''),
      String(body?.merchant_uid ?? '')
    );

    return NextResponse.json(result, { status: result.ok ? 200 : result.status });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : '결제 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 카카오페이·네이버페이 모바일 결제 redirect.
 * 모바일에서는 PG 앱/페이지를 거친 뒤 이 URL로 돌아올 수 있으므로 GET도 동일하게 검증합니다.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const impUid = sp.get('imp_uid') ?? '';
  const merchantUid = sp.get('merchant_uid') ?? '';
  const fallbackToken = sp.get('token') ?? '';
  const success = sp.get('imp_success');
  const errorMessage = sp.get('error_msg') ?? '결제가 취소되었거나 완료되지 않았습니다.';
  const base = req.nextUrl.origin;

  if (success === 'false') {
    return NextResponse.redirect(
      `${base}/checkout/complete?fail=1&token=${encodeURIComponent(fallbackToken)}&msg=${encodeURIComponent(errorMessage)}`
    );
  }

  try {
    const result = await verifyPortOnePayment(impUid, merchantUid);
    if (result.ok) {
      return NextResponse.redirect(
        `${base}/checkout/complete?token=${encodeURIComponent(result.publicToken)}`
      );
    }

    return NextResponse.redirect(
      `${base}/checkout/complete?fail=1&token=${encodeURIComponent(
        result.publicToken ?? fallbackToken
      )}&msg=${encodeURIComponent(result.message)}`
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : '결제 검증 중 오류가 발생했습니다.';
    return NextResponse.redirect(
      `${base}/checkout/complete?fail=1&token=${encodeURIComponent(fallbackToken)}&msg=${encodeURIComponent(message)}`
    );
  }
}
