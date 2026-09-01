/**
 * 토스페이먼츠 결제 승인/취소
 * 문서: https://docs.tosspayments.com/reference
 */
const TOSS_API = 'https://api.tosspayments.com/v1';

function authHeader() {
  const secret = process.env.TOSS_SECRET_KEY ?? '';
  // Basic {secretKey + ":"} 를 base64 인코딩
  return 'Basic ' + Buffer.from(`${secret}:`).toString('base64');
}

export type TossPayment = {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: string; // DONE | CANCELED | ...
  totalAmount: number;
  method: string;
  approvedAt: string | null;
  receipt?: { url: string } | null;
  [k: string]: unknown;
};

/** 결제 승인 (프론트 successUrl 리다이렉트 후 반드시 서버에서 호출) */
export async function confirmTossPayment(params: {
  paymentKey: string;
  orderId: string; // 우리 주문번호(orderNo)
  amount: number;
}): Promise<TossPayment> {
  const res = await fetch(`${TOSS_API}/payments/confirm`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      // 멱등키: 동일 요청 중복 승인 방지
      'Idempotency-Key': `confirm-${params.orderId}`,
    },
    body: JSON.stringify(params),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message ?? '토스페이먼츠 결제 승인에 실패했습니다.');
  }
  return data as TossPayment;
}

/** 결제 취소 (전액/부분) */
export async function cancelTossPayment(params: {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number;
}) {
  const { paymentKey, ...body } = params;
  const res = await fetch(`${TOSS_API}/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      'Idempotency-Key': `cancel-${paymentKey}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? '결제 취소에 실패했습니다.');
  return data;
}
