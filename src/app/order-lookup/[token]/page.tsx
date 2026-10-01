import Link from 'next/link';
import { notFound } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { fmtDate, won } from '@/lib/utils';
import { ORDER_STATUS, PAY_METHOD } from '@/lib/site';

export const metadata = {
  title: '주문조회 결과',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return phone;
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

export default async function OrderLookupDetailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await prisma.order.findUnique({
    where: { publicToken: token },
    include: { items: true, payment: true },
  });
  if (!order) notFound();

  return (
    <section className="container-x max-w-3xl py-14 sm:py-16">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sea-700">ORDER STATUS</p>
          <h1 className="mt-2 text-2xl font-black">주문조회 결과</h1>
        </div>
        <Link href="/order-lookup" className="text-xs text-gim-500 hover:text-sea-700">
          다른 주문 조회
        </Link>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gim-400">{fmtDate(order.createdAt, true)}</p>
            <p className="mt-1 text-sm font-bold">주문번호 {order.orderNo}</p>
          </div>
          <span className="badge bg-sea-800 px-3 py-1 text-white">
            {ORDER_STATUS[order.status] ?? order.status}
          </span>
        </div>
      </div>

      <div className="card mt-5 p-6">
        <h2 className="text-base font-bold">주문 상품</h2>
        <ul className="mt-3 divide-y divide-gim-100">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center gap-4 py-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gim-50">
                {it.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{it.productName}</p>
                {it.optionName && <p className="text-xs text-gim-400">{it.optionName}</p>}
                <p className="text-xs text-gim-500">{won(it.price)} · {it.quantity}개</p>
              </div>
              <p className="text-sm font-bold">{won(it.price * it.quantity)}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-base font-bold">배송 상태</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-gim-400">받는 분</dt>
              <dd>{order.receiver}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gim-400">연락처</dt>
              <dd>{maskPhone(order.recvPhone)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gim-400">택배사</dt>
              <dd>{order.courier || '-'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gim-400">송장번호</dt>
              <dd>{order.trackingNo || '-'}</dd>
            </div>
          </dl>
          {order.trackingNo && (
            <a
              href={`https://search.naver.com/search.naver?query=${encodeURIComponent(`${order.courier ?? ''} ${order.trackingNo}`)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-outline btn-sm mt-5 w-full"
            >
              배송조회
            </a>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-base font-bold">결제 정보</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-gim-400">결제수단</dt>
              <dd>{PAY_METHOD[order.payment?.method ?? ''] ?? '-'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gim-400">상품금액</dt>
              <dd>{won(order.itemTotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gim-400">배송비</dt>
              <dd>{order.shippingFee === 0 ? '무료' : won(order.shippingFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-gim-100 pt-3 font-bold">
              <dt>결제금액</dt>
              <dd className="text-point">{won(order.totalAmount)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/contact?type=ORDER" className="btn-outline">
          주문 문의
        </Link>
        <Link href="/products" className="btn-primary">
          쇼핑 계속하기
        </Link>
      </div>
    </section>
  );
}
