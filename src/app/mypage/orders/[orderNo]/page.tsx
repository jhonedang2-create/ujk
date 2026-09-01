import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { won, fmtDate } from '@/lib/utils';
import { ORDER_STATUS, PAY_METHOD, SITE } from '@/lib/site';
import CancelOrderButton from '@/components/CancelOrderButton';

export const dynamic = 'force-dynamic';

export default async function MyOrderDetail({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/mypage/orders');

  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { items: true, payment: true },
  });

  if (!order || order.userId !== session.user.id) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">주문 상세</h1>
        <Link href="/mypage/orders" className="text-xs text-gim-500 hover:text-sea-700">← 목록</Link>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gim-400">{fmtDate(order.createdAt, true)}</p>
            <p className="text-sm font-bold">주문번호 {order.orderNo}</p>
          </div>
          <span className="badge bg-sea-800 px-3 py-1 text-white">{ORDER_STATUS[order.status]}</span>
        </div>
      </div>

      {order.status === 'PENDING' && order.payment?.method === 'BANK' && (
        <div className="rounded-xl border-2 border-sea-200 bg-sea-50 p-6">
          <p className="text-sm font-bold text-sea-900">입금 대기중</p>
          <p className="mt-2 text-sm text-sea-800">
            {order.payment.bankName} <strong>{order.payment.bankAccount}</strong> (예금주 {SITE.bank.holder})
          </p>
          <p className="mt-1 text-lg font-black text-point">{won(order.totalAmount)}</p>
          <p className="mt-2 text-xs text-sea-700">입금자명 : {order.payment.depositor}</p>
        </div>
      )}

      <div className="card p-6">
        <h2 className="mb-4 text-base font-bold">주문 상품</h2>
        <ul className="divide-y divide-gim-100">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center gap-4 py-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gim-50">
                {it.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{it.productName}</p>
                {it.optionName && <p className="text-xs text-gim-400">{it.optionName}</p>}
                <p className="text-xs text-gim-500">{won(it.price)} · {it.quantity}개</p>
              </div>
              <span className="text-sm font-bold">{won(it.price * it.quantity)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 text-base font-bold">배송 정보</h2>
          <dl className="space-y-2.5 text-sm">
            {[
              ['받는 분', order.receiver],
              ['연락처', order.recvPhone],
              ['주소', `[${order.zipcode}] ${order.address1} ${order.address2}`],
              ['배송메모', order.memo || '-'],
              ['택배사', order.courier || '-'],
              ['송장번호', order.trackingNo || '-'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <dt className="w-20 shrink-0 text-gim-400">{k}</dt>
                <dd className="text-gim-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-base font-bold">결제 정보</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gim-400">결제수단</dt>
              <dd>{PAY_METHOD[order.payment?.method ?? ''] ?? '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gim-400">상품금액</dt>
              <dd>{won(order.itemTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gim-400">배송비</dt>
              <dd>{order.shippingFee === 0 ? '무료' : won(order.shippingFee)}</dd>
            </div>
            {order.pointUsed > 0 && (
              <div className="flex justify-between text-point">
                <dt>적립금 사용</dt>
                <dd>-{won(order.pointUsed)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-gim-100 pt-3 font-bold">
              <dt>총 결제금액</dt>
              <dd className="text-base text-point">{won(order.totalAmount)}</dd>
            </div>
          </dl>

          {order.payment?.receiptUrl && (
            <a href={order.payment.receiptUrl} target="_blank" rel="noreferrer" className="btn-outline btn-sm mt-4 w-full">
              영수증 보기
            </a>
          )}
        </div>
      </div>

      {order.status === 'PENDING' && (
        <div className="flex justify-end">
          <CancelOrderButton orderId={order.id} />
        </div>
      )}
    </div>
  );
}
