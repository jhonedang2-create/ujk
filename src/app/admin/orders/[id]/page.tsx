import { guardPage } from '@/lib/guard';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { won, fmtDate } from '@/lib/utils';
import { ORDER_STATUS, PAY_METHOD } from '@/lib/site';
import OrderAdminPanel from '@/components/admin/OrderAdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await guardPage('orders');
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, payment: true, user: { select: { email: true, name: true } } },
  });
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">주문 상세 — {order.orderNo}</h1>
        <Link href="/admin/orders" className="text-xs text-gim-500 hover:text-sea-700">← 목록</Link>
      </div>

      <OrderAdminPanel
        orderId={order.id}
        status={order.status}
        method={order.payment?.method ?? 'BANK'}
        courier={order.courier ?? ''}
        trackingNo={order.trackingNo ?? ''}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 text-base font-bold">주문 정보</h2>
          <dl className="space-y-2.5 text-sm">
            {[
              ['주문일시', fmtDate(order.createdAt, true)],
              ['주문상태', ORDER_STATUS[order.status]],
              ['회원구분', order.userId ? `회원 (${order.user?.email ?? '-'})` : '비회원'],
              ['주문자', `${order.ordererName} / ${order.ordererPhone}`],
              ['이메일', order.ordererEmail || '-'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <dt className="w-20 shrink-0 text-gim-400">{k}</dt>
                <dd className="text-gim-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

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
              ['발송일', order.shippedAt ? fmtDate(order.shippedAt, true) : '-'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <dt className="w-20 shrink-0 text-gim-400">{k}</dt>
                <dd className="text-gim-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-base font-bold">주문 상품</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-gim-50 text-xs text-gim-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">상품</th>
                <th className="px-4 py-2.5 text-right font-medium">단가</th>
                <th className="px-4 py-2.5 text-right font-medium">수량</th>
                <th className="px-4 py-2.5 text-right font-medium">합계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gim-100">
              {order.items.map((it) => (
                <tr key={it.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gim-100">
                        {it.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.imageUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{it.productName}</p>
                        {it.optionName && <p className="text-[11px] text-gim-400">{it.optionName}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{won(it.price)}</td>
                  <td className="px-4 py-3 text-right">{it.quantity}</td>
                  <td className="px-4 py-3 text-right font-semibold">{won(it.price * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-5 space-y-2 border-t border-gim-100 pt-5 text-sm">
          <div className="flex justify-between"><dt className="text-gim-500">상품금액</dt><dd>{won(order.itemTotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-gim-500">배송비</dt><dd>{won(order.shippingFee)}</dd></div>
          {order.pointUsed > 0 && (
            <div className="flex justify-between text-point"><dt>적립금 사용</dt><dd>-{won(order.pointUsed)}</dd></div>
          )}
          <div className="flex justify-between border-t border-gim-100 pt-2 text-base font-bold">
            <dt>총 결제금액</dt><dd className="text-point">{won(order.totalAmount)}</dd>
          </div>
        </dl>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-base font-bold">결제 정보</h2>
        <dl className="space-y-2.5 text-sm">
          {[
            ['결제수단', PAY_METHOD[order.payment?.method ?? ''] ?? '-'],
            ['결제상태', order.payment?.status ?? '-'],
            ['결제일시', order.payment?.paidAt ? fmtDate(order.payment.paidAt, true) : '-'],
            ...(order.payment?.method === 'BANK'
              ? [
                  ['입금계좌', `${order.payment.bankName} ${order.payment.bankAccount}`],
                  ['입금자명', order.payment.depositor ?? '-'],
                  ['입금확인', order.payment.depositedAt ? fmtDate(order.payment.depositedAt, true) : '미확인'],
                ]
              : [
                  ['PG 거래번호', order.payment?.paymentKey ?? order.payment?.impUid ?? '-'],
                ]),
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <dt className="w-24 shrink-0 text-gim-400">{k}</dt>
              <dd className="break-all text-gim-800">{v}</dd>
            </div>
          ))}
        </dl>
        {order.payment?.receiptUrl && (
          <a href={order.payment.receiptUrl} target="_blank" rel="noreferrer" className="btn-outline btn-sm mt-4">
            영수증 확인
          </a>
        )}
      </div>
    </div>
  );
}
