import { guardPage } from '@/lib/guard';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { won, fmtDate, cn } from '@/lib/utils';
import { ORDER_STATUS, CHANNEL_LABEL } from '@/lib/site';
import Pagination from '@/components/Pagination';

export const dynamic = 'force-dynamic';
const SIZE = 20;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string; channel?: string }>;
}) {
  await guardPage('orders');

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const q = sp.q?.trim();

  const where = {
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.channel ? { channelCode: sp.channel } : {}),
    ...(q
      ? {
          OR: [
            { orderNo: { contains: q } },
            { ordererName: { contains: q } },
            { ordererPhone: { contains: q } },
            { receiver: { contains: q } },
          ],
        }
      : {}),
  };

  const channels = await prisma.channel.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { payment: true, items: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * SIZE,
      take: SIZE,
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">주문 관리 <span className="text-sm font-normal text-gim-400">({total})</span></h1>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/orders"
          className={cn(
            'rounded-full px-4 py-1.5 text-xs font-medium',
            !sp.status ? 'bg-sea-800 text-white' : 'bg-white text-gim-600 border border-gim-200'
          )}
        >
          전체
        </Link>
        {Object.entries(ORDER_STATUS).map(([k, v]) => (
          <Link
            key={k}
            href={`/admin/orders?status=${k}`}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-medium',
              sp.status === k ? 'bg-sea-800 text-white' : 'bg-white text-gim-600 border border-gim-200'
            )}
          >
            {v}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gim-400">채널</span>
        <Link
          href={sp.status ? `/admin/orders?status=${sp.status}` : '/admin/orders'}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-xs font-medium',
            !sp.channel ? 'bg-gim-800 text-white' : 'bg-white text-gim-600 border border-gim-200'
          )}
        >
          전체
        </Link>
        {channels.map((ch) => (
          <Link
            key={ch.code}
            href={`/admin/orders?channel=${ch.code}${sp.status ? `&status=${sp.status}` : ''}`}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium',
              sp.channel === ch.code
                ? 'bg-gim-800 text-white'
                : 'bg-white text-gim-600 border border-gim-200'
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: ch.color }} />
            {ch.name}
          </Link>
        ))}
      </div>

      <form action="/admin/orders" className="flex gap-2">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        {sp.channel && <input type="hidden" name="channel" value={sp.channel} />}
        <input name="q" defaultValue={q} placeholder="주문번호 · 주문자 · 연락처 검색" className="input w-72 py-2" />
        <button className="btn-outline btn-sm">검색</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="bg-gim-50 text-xs text-gim-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">채널</th>
              <th className="px-4 py-3 text-left font-medium">주문번호 / 일시</th>
              <th className="px-4 py-3 text-left font-medium">주문자</th>
              <th className="px-4 py-3 text-left font-medium">상품</th>
              <th className="px-4 py-3 text-right font-medium">결제금액</th>
              <th className="px-4 py-3 text-center font-medium">결제수단</th>
              <th className="px-4 py-3 text-center font-medium">상태</th>
              <th className="px-4 py-3 text-center font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gim-100">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gim-50">
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      background: `${channels.find((ch) => ch.code === o.channelCode)?.color ?? '#9b8e74'}18`,
                      color: channels.find((ch) => ch.code === o.channelCode)?.color ?? '#584d3d',
                    }}
                  >
                    {channels.find((ch) => ch.code === o.channelCode)?.name ??
                      CHANNEL_LABEL[o.channelCode] ??
                      o.channelCode}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-sea-700 hover:underline">
                    {o.orderNo}
                  </Link>
                  {o.channelOrderNo && (
                    <p className="text-[11px] text-gim-400">채널주문 {o.channelOrderNo}</p>
                  )}
                  <p className="text-[11px] text-gim-400">{fmtDate(o.createdAt, true)}</p>
                </td>
                <td className="px-4 py-3">
                  {o.ordererName}
                  <p className="text-[11px] text-gim-400">{o.ordererPhone}</p>
                </td>
                <td className="max-w-[220px] px-4 py-3">
                  <p className="line-clamp-1 text-gim-700">{o.items[0]?.productName}</p>
                  {o.items.length > 1 && (
                    <p className="text-[11px] text-gim-400">외 {o.items.length - 1}건</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-semibold">{won(o.totalAmount)}</td>
                <td className="px-4 py-3 text-center text-xs text-gim-600">
                  {o.payment?.method === 'BANK' ? '무통장' : o.payment?.method === 'TOSS' ? '토스' : '포트원'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={cn(
                      'badge',
                      o.status === 'PENDING' && 'bg-amber-50 text-amber-700',
                      o.status === 'PAID' && 'bg-sea-50 text-sea-800',
                      o.status === 'SHIPPING' && 'bg-blue-50 text-blue-700',
                      o.status === 'DELIVERED' && 'bg-green-50 text-green-700',
                      ['CANCELLED', 'REFUNDED'].includes(o.status) && 'bg-gim-100 text-gim-500'
                    )}
                  >
                    {ORDER_STATUS[o.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Link href={`/admin/orders/${o.id}`} className="btn-outline btn-sm">상세</Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={8} className="py-16 text-center text-gim-400">주문이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={Math.ceil(total / SIZE)}
        basePath="/admin/orders"
        query={{ status: sp.status, q, channel: sp.channel }}
      />
    </div>
  );
}
