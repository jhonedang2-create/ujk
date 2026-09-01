import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { won, fmtDate } from '@/lib/utils';
import { ORDER_STATUS, PAY_METHOD, SITE } from '@/lib/site';

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

  const failed = sp.fail === '1';

  return (
    <div className="container-x max-w-3xl py-16">
      <div className="text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
            failed ? 'bg-red-50 text-red-500' : 'bg-sea-50 text-sea-700'
          }`}
        >
          {failed ? '!' : '✓'}
        </div>
        <h1 className="mt-6 text-2xl font-black sm:text-3xl">
          {failed ? '결제가 완료되지 않았습니다' : '주문이 정상적으로 접수되었습니다'}
        </h1>
        <p className="mt-3 text-sm text-gim-500">
          {failed
            ? sp.msg || '결제가 취소되었거나 오류가 발생했습니다. 마이페이지에서 다시 결제하실 수 있습니다.'
            : order.payment?.method === 'BANK'
            ? '아래 계좌로 입금해 주시면 확인 후 바로 발송해 드립니다.'
            : '결제가 완료되었습니다. 빠르게 준비해서 보내드릴게요.'}
        </p>
      </div>

      {!failed && order.payment?.method === 'BANK' && (
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
        <Link href="/mypage/orders" className="btn-primary">주문내역 보기</Link>
        <Link href="/products" className="btn-outline">쇼핑 계속하기</Link>
      </div>
    </div>
  );
}
