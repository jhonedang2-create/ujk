import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { won, fmtDate } from '@/lib/utils';
import { ORDER_STATUS, PAY_METHOD, SITE } from '@/lib/site';
import { checkoutResultState } from '@/lib/checkout-result-rules';

export const metadata = { title: '주문완료', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; fail?: string; msg?: string }>;
}) {
  const sp = await searchParams;

  if (!sp.token) {
    return (
      <div className="container-x py-24 text-center">
        <p className="text-sm text-gim-500">주문 정보를 찾을 수 없습니다.</p>
        <Link href="/products" className="btn-primary mt-6">쇼핑 계속하기</Link>
      </div>
    );
  }

  const order = await prisma.order.findUnique({
    where: { publicToken: sp.token },
    include: { items: true, payment: true },
  });

  if (!order) {
    return (
      <div className="container-x py-24 text-center">
        <p className="text-sm text-gim-500">주문 정보를 찾을 수 없습니다.</p>
        <Link href="/products" className="btn-primary mt-6">쇼핑 계속하기</Link>
      </div>
    );
  }

  // URL flags describe a browser callback, not proof of payment success or failure.
  const result = checkoutResultState(order.status, order.payment);

  return (
    <div className="container-x max-w-3xl py-16">
      <div className="text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
            result.tone === 'error' ? 'bg-red-50 text-red-500' : result.tone === 'pending' ? 'bg-amber-50 text-amber-800' : 'bg-sea-50 text-sea-700'
          }`}
        >
          {result.tone === 'success' ? '✓' : '!'}
        </div>
        <h1 className="mt-6 text-2xl font-black sm:text-3xl">
          {result.title}
        </h1>
        <p className="mt-3 text-sm text-gim-500">
          {result.description}
        </p>
      </div>

      {result.showBank && order.payment && (
        <div className="mt-8 rounded-xl border-2 border-sea-200 bg-sea-50 p-6 text-center">
          <p className="text-xs font-semibold text-sea-700">입금 계좌</p>
          <p className="mt-2 text-lg font-black text-sea-950">
            {order.payment.bankName} {order.payment.bankAccount}
          </p>
          <p className="mt-1 text-sm text-sea-800">예금주 {SITE.bank.holder}</p>
          <p className="mt-4 text-2xl font-black text-point">{won(order.totalAmount)}</p>
          <p className="mt-2 text-xs text-sea-700">
            입금자명 : {order.payment.depositor} · 48시간 내 미입금 시 자동 취소
          </p>
        </div>
      )}

      <div className="card mt-8 p-7">
        <h2 className="text-base font-bold">주문 정보</h2>
        <dl className="mt-5 space-y-3 text-sm">
          {[
            ['주문번호', order.orderNo],
            ['주문일시', fmtDate(order.createdAt, true)],
            ['주문상태', ORDER_STATUS[order.status] ?? order.status],
            ['결제수단', PAY_METHOD[order.payment?.method ?? ''] ?? '-'],
            ['받는 분', `${order.receiver} (${order.recvPhone})`],
            ['배송지', `[${order.zipcode}] ${order.address1} ${order.address2}`],
            ...(order.memo ? [['배송메모', order.memo]] : []),
          ].map(([k, v]) => (
            <div key={k} className="flex gap-4">
              <dt className="w-20 shrink-0 text-gim-400">{k}</dt>
              <dd className="text-gim-800">{v}</dd>
            </div>
          ))}
        </dl>

        <ul className="mt-6 divide-y divide-gim-100 border-t border-gim-100">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center gap-4 py-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gim-50">
                {it.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt={it.productName} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{it.productName}</p>
                {it.optionName && <p className="text-xs text-gim-400">{it.optionName}</p>}
                <p className="text-xs text-gim-500">수량 {it.quantity}개</p>
              </div>
              <span className="text-sm font-bold">{won(it.price * it.quantity)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-2 border-t border-gim-100 pt-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-gim-500">상품금액</dt>
            <dd>{won(order.itemTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gim-500">배송비</dt>
            <dd>{order.shippingFee === 0 ? '무료' : won(order.shippingFee)}</dd>
          </div>
          {order.pointUsed > 0 && (
            <div className="flex justify-between text-point">
              <dt>적립금 사용</dt>
              <dd>-{won(order.pointUsed)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-gim-100 pt-3 text-base font-bold">
            <dt>총 결제금액</dt>
            <dd className="text-point">{won(order.totalAmount)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {order.userId ? (
          <Link href="/mypage/orders" className="btn-primary">주문내역 보기</Link>
        ) : (
          <Link href={`/order-lookup/${order.publicToken}`} className="btn-primary">비회원 주문조회</Link>
        )}
        <Link href="/products" className="btn-outline">쇼핑 계속하기</Link>
      </div>
    </div>
  );
}
