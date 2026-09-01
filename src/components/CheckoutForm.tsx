'use client';

import Script from 'next/script';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder } from '@/actions/order';
import { won, cn, num } from '@/lib/utils';
import { calcShippingFee, PAY_METHOD } from '@/lib/site';

type Item = {
  id: string;
  name: string;
  optionName: string;
  imageUrl: string;
  price: number;
  quantity: number;
};

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => { requestPayment: (method: string, opts: Record<string, unknown>) => Promise<void> };
    IMP?: {
      init: (code: string) => void;
      request_pay: (params: Record<string, unknown>, cb: (rsp: Record<string, unknown>) => void) => void;
    };
    daum?: { Postcode: new (opts: Record<string, unknown>) => { open: () => void } };
  }
}

export default function CheckoutForm({
  items,
  bank,
  user,
  address,
  tossClientKey,
  portoneCode,
  portonePg,
}: {
  items: Item[];
  bank: { name: string; account: string; holder: string };
  user: { name: string; phone: string; email: string; point: number; loggedIn: boolean };
  address: { receiver: string; phone: string; zipcode: string; address1: string; address2: string } | null;
  tossClientKey: string;
  portoneCode: string;
  portonePg: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [method, setMethod] = useState<'BANK' | 'TOSS' | 'PORTONE'>('BANK');
  const [error, setError] = useState('');
  const [sameAsOrderer, setSameAsOrderer] = useState(!address);
  const [pointUsed, setPointUsed] = useState(0);
  const [addr, setAddr] = useState({
    zipcode: address?.zipcode ?? '',
    address1: address?.address1 ?? '',
    address2: address?.address2 ?? '',
  });
  const [orderer, setOrderer] = useState({
    name: user.name,
    phone: user.phone,
    email: user.email,
  });
  const [recv, setRecv] = useState({
    receiver: address?.receiver ?? '',
    recvPhone: address?.phone ?? '',
  });

  // '주문자와 동일' 체크 시 실제 전송값
  const recvValue = sameAsOrderer
    ? { receiver: orderer.name, recvPhone: orderer.phone }
    : recv;

  const itemTotal = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items]
  );
  const shippingFee = calcShippingFee(itemTotal);
  const maxPoint = Math.min(user.point, itemTotal);
  const total = itemTotal + shippingFee - pointUsed;
  const orderName = items.length > 1 ? `${items[0].name} 외 ${items.length - 1}건` : items[0]?.name ?? '주문';

  function openPostcode() {
    if (!window.daum?.Postcode) {
      setError('주소 검색 스크립트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => {
        setAddr((a) => ({
          ...a,
          zipcode: data.zonecode,
          address1: data.roadAddress || data.jibunAddress,
        }));
      },
    }).open();
  }

  async function payWithToss(orderNo: string, publicToken: string, amount: number) {
    if (!window.TossPayments) throw new Error('토스페이먼츠 SDK 로드에 실패했습니다.');
    const toss = window.TossPayments(tossClientKey);
    const origin = window.location.origin;
    await toss.requestPayment('카드', {
      amount,
      orderId: orderNo,
      orderName,
      customerName: orderer.name,
      customerEmail: orderer.email || undefined,
      successUrl: `${origin}/api/payments/toss/confirm`,
      failUrl: `${origin}/checkout/complete?fail=1&token=${publicToken}`,
    });
  }

  function payWithPortOne(orderNo: string, publicToken: string, amount: number) {
    if (!window.IMP) {
      setError('포트원 SDK 로드에 실패했습니다.');
      return;
    }
    window.IMP.init(portoneCode);
    window.IMP.request_pay(
      {
        pg: portonePg,
        pay_method: 'card',
        merchant_uid: orderNo,
        name: orderName,
        amount,
        buyer_email: orderer.email,
        buyer_name: orderer.name,
        buyer_tel: orderer.phone,
        buyer_addr: `${addr.address1} ${addr.address2}`,
        buyer_postcode: addr.zipcode,
      },
      async (rsp) => {
        if (!rsp.success) {
          router.push(`/checkout/complete?fail=1&token=${publicToken}&msg=${encodeURIComponent(String(rsp.error_msg ?? '결제가 취소되었습니다.'))}`);
          return;
        }
        const res = await fetch('/api/payments/portone/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imp_uid: rsp.imp_uid, merchant_uid: rsp.merchant_uid }),
        });
        const json = await res.json();
        if (json.ok) router.push(`/checkout/complete?token=${json.publicToken ?? publicToken}`);
        else router.push(`/checkout/complete?fail=1&token=${publicToken}&msg=${encodeURIComponent(json.message ?? '결제 검증 실패')}`);
      }
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    fd.set('method', method);
    fd.set('pointUsed', String(pointUsed));

    start(async () => {
      const res = await createOrder(fd);
      if (!res.ok) {
        setError(res.message);
        return;
      }

      try {
        if (method === 'BANK') {
          router.push(`/checkout/complete?token=${res.publicToken}`);
        } else if (method === 'TOSS') {
          await payWithToss(res.orderNo, res.publicToken, res.amount);
        } else {
          payWithPortOne(res.orderNo, res.publicToken, res.amount);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '결제창 호출에 실패했습니다.');
      }
    });
  }

  return (
    <>
      <Script src="https://js.tosspayments.com/v1/payment" strategy="afterInteractive" />
      <Script src="https://cdn.iamport.kr/v1/iamport.js" strategy="afterInteractive" />
      <Script
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="afterInteractive"
      />

      <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          {/* 주문상품 */}
          <section>
            <h2 className="border-b-2 border-gim-800 pb-3 text-lg font-bold">주문 상품</h2>
            <ul className="divide-y divide-gim-100">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 py-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gim-50">
                    {it.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{it.name}</p>
                    {it.optionName && <p className="mt-0.5 text-xs text-gim-400">{it.optionName}</p>}
                    <p className="mt-0.5 text-xs text-gim-500">수량 {it.quantity}개</p>
                  </div>
                  <span className="text-sm font-bold">{won(it.price * it.quantity)}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 주문자 */}
          <section>
            <h2 className="border-b-2 border-gim-800 pb-3 text-lg font-bold">주문자 정보</h2>
            <div className="grid gap-4 pt-5 sm:grid-cols-2">
              <div>
                <label className="label">이름 *</label>
                <input
                  name="ordererName"
                  required
                  className="input"
                  value={orderer.name}
                  onChange={(e) => setOrderer({ ...orderer, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">연락처 *</label>
                <input
                  name="ordererPhone"
                  required
                  placeholder="010-0000-0000"
                  className="input"
                  value={orderer.phone}
                  onChange={(e) => setOrderer({ ...orderer, phone: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">이메일</label>
                <input
                  name="ordererEmail"
                  type="email"
                  className="input"
                  value={orderer.email}
                  onChange={(e) => setOrderer({ ...orderer, email: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* 배송지 */}
          <section>
            <div className="flex items-center justify-between border-b-2 border-gim-800 pb-3">
              <h2 className="text-lg font-bold">배송지 정보</h2>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gim-600">
                <input
                  type="checkbox"
                  checked={sameAsOrderer}
                  onChange={(e) => setSameAsOrderer(e.target.checked)}
                  className="h-4 w-4 accent-sea-700"
                />
                주문자와 동일
              </label>
            </div>

            <div className="grid gap-4 pt-5 sm:grid-cols-2">
              <div>
                <label className="label">받는 분 *</label>
                <input
                  name="receiver"
                  required
                  readOnly={sameAsOrderer}
                  className="input"
                  value={recvValue.receiver}
                  onChange={(e) => setRecv({ ...recv, receiver: e.target.value })}
                />
              </div>
              <div>
                <label className="label">연락처 *</label>
                <input
                  name="recvPhone"
                  required
                  readOnly={sameAsOrderer}
                  placeholder="010-0000-0000"
                  className="input"
                  value={recvValue.recvPhone}
                  onChange={(e) => setRecv({ ...recv, recvPhone: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label">주소 *</label>
                <div className="flex gap-2">
                  <input
                    name="zipcode"
                    required
                    readOnly
                    placeholder="우편번호"
                    className="input w-36"
                    value={addr.zipcode}
                  />
                  <button type="button" onClick={openPostcode} className="btn-outline btn-sm px-5">
                    주소 검색
                  </button>
                </div>
                <input
                  name="address1"
                  required
                  readOnly
                  placeholder="기본 주소"
                  className="input mt-2"
                  value={addr.address1}
                />
                <input
                  name="address2"
                  placeholder="상세 주소 (동/호수 등)"
                  className="input mt-2"
                  value={addr.address2}
                  onChange={(e) => setAddr({ ...addr, address2: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label">배송 메모</label>
                <input name="memo" className="input" placeholder="예) 부재 시 경비실에 맡겨주세요" />
              </div>
            </div>
          </section>

          {/* 결제수단 */}
          <section>
            <h2 className="border-b-2 border-gim-800 pb-3 text-lg font-bold">결제 수단</h2>
            <div className="grid gap-3 pt-5 sm:grid-cols-3">
              {(['BANK', 'TOSS', 'PORTONE'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    'rounded-xl border-2 p-4 text-left transition',
                    method === m ? 'border-sea-700 bg-sea-50' : 'border-gim-200 hover:border-gim-300'
                  )}
                >
                  <p className="text-sm font-bold text-gim-900">
                    {m === 'BANK' ? '무통장입금' : m === 'TOSS' ? '토스페이먼츠' : '포트원'}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gim-500">
                    {m === 'BANK'
                      ? '계좌이체 후 입금확인'
                      : m === 'TOSS'
                      ? '신용카드 · 간편결제'
                      : '카카오페이 · 네이버페이 등'}
                  </p>
                </button>
              ))}
            </div>

            {method === 'BANK' && (
              <div className="mt-5 rounded-xl bg-gim-50 p-5">
                <p className="text-sm font-bold text-gim-800">입금 계좌</p>
                <p className="mt-2 text-sm text-gim-700">
                  {bank.name} <strong>{bank.account}</strong> (예금주 {bank.holder})
                </p>
                <div className="mt-4">
                  <label className="label">입금자명 (미입력 시 주문자명)</label>
                  <input name="depositor" className="input max-w-xs" placeholder="입금하실 분 성함" />
                </div>
                <p className="mt-3 text-xs leading-5 text-gim-500">
                  ※ 주문 후 48시간 이내 미입금 시 주문이 자동 취소됩니다.
                </p>
              </div>
            )}

            {method !== 'BANK' && (
              <p className="mt-4 rounded-lg bg-sea-50 p-4 text-xs leading-5 text-sea-800">
                결제 버튼을 누르면 {PAY_METHOD[method]} 결제창이 열립니다.
                결제 완료 후 자동으로 주문이 확정됩니다.
              </p>
            )}
          </section>
        </div>

        {/* 결제 요약 */}
        <aside className="h-fit lg:sticky lg:top-28">
          <div className="card p-6">
            <h3 className="text-base font-bold">최종 결제금액</h3>

            {user.loggedIn && user.point > 0 && (
              <div className="mt-5 rounded-lg bg-gim-50 p-4">
                <label className="label mb-2">적립금 사용 (보유 {num(user.point)}P)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={maxPoint}
                    value={pointUsed}
                    onChange={(e) =>
                      setPointUsed(Math.min(Math.max(0, Number(e.target.value) || 0), maxPoint))
                    }
                    className="input py-2"
                  />
                  <button
                    type="button"
                    onClick={() => setPointUsed(maxPoint)}
                    className="btn-outline btn-sm shrink-0"
                  >
                    전액
                  </button>
                </div>
              </div>
            )}

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gim-500">상품금액</dt>
                <dd>{won(itemTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gim-500">배송비</dt>
                <dd>{shippingFee === 0 ? '무료' : won(shippingFee)}</dd>
              </div>
              {pointUsed > 0 && (
                <div className="flex justify-between text-point">
                  <dt>적립금 사용</dt>
                  <dd>-{won(pointUsed)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-gim-100 pt-3">
                <dt className="font-bold">결제금액</dt>
                <dd className="text-2xl font-black text-point">{won(total)}</dd>
              </div>
            </dl>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">{error}</p>
            )}

            <label className="mt-5 flex items-start gap-2 text-xs leading-5 text-gim-600">
              <input type="checkbox" required className="mt-0.5 h-4 w-4 accent-sea-700" />
              <span>
                주문 내용을 확인하였으며, 결제 진행 및 개인정보 제3자 제공(배송)에 동의합니다. (필수)
              </span>
            </label>

            <button type="submit" disabled={pending} className="btn-point mt-4 w-full py-4 text-base">
              {pending ? '처리 중…' : `${won(total)} 결제하기`}
            </button>
          </div>
        </aside>
      </form>
    </>
  );
}
