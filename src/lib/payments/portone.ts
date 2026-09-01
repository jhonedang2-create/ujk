/**
 * 포트원(아임포트) 결제 검증/취소 — REST API v1
 * 문서: https://developers.portone.io/api/rest-v1
 */
const IAMPORT_API = 'https://api.iamport.kr';

async function getToken(): Promise<string> {
  const res = await fetch(`${IAMPORT_API}/users/getToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imp_key: process.env.PORTONE_API_KEY,
      imp_secret: process.env.PORTONE_API_SECRET,
    }),
    cache: 'no-store',
  });
  const json = await res.json();
  const token = json?.response?.access_token;
  if (!token) throw new Error('포트원 인증 토큰 발급에 실패했습니다.');
  return token as string;
}

export type PortOnePayment = {
  imp_uid: string;
  merchant_uid: string;
  status: string; // ready | paid | cancelled | failed
  amount: number;
  pay_method: string;
  pg_provider: string;
  receipt_url?: string;
  paid_at?: number;
  [k: string]: unknown;
};

/** imp_uid 로 실제 결제 내역 조회 (위변조 검증용 — 반드시 서버에서) */
export async function getPortOnePayment(impUid: string): Promise<PortOnePayment> {
  const token = await getToken();
  const res = await fetch(`${IAMPORT_API}/payments/${encodeURIComponent(impUid)}`, {
    headers: { Authorization: token },
    cache: 'no-store',
  });
  const json = await res.json();
  if (!json?.response) throw new Error(json?.message ?? '결제 내역 조회에 실패했습니다.');
  return json.response as PortOnePayment;
}

export async function cancelPortOnePayment(params: {
  impUid: string;
  reason: string;
  amount?: number;
}) {
  const token = await getToken();
  const res = await fetch(`${IAMPORT_API}/payments/cancel`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imp_uid: params.impUid,
      reason: params.reason,
      ...(params.amount ? { amount: params.amount } : {}),
    }),
    cache: 'no-store',
  });
  const json = await res.json();
  if (!json?.response) throw new Error(json?.message ?? '결제 취소에 실패했습니다.');
  return json.response;
}
