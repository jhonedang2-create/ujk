import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiKey } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/orders
 *   ?from=2026-08-01&to=2026-08-31&status=PAID&channel=SELF&page=1&size=100
 *
 * 외부 통합관리 솔루션이 자사몰 주문을 수집해 갈 때 쓰는 엔드포인트입니다.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req, 'orders:read');
  if (auth.error) return auth.error;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get('page') ?? 1));
  const size = Math.min(500, Math.max(1, Number(sp.get('size') ?? 100)));

  const where = {
    ...(sp.get('status') ? { status: sp.get('status') as string } : {}),
    ...(sp.get('channel') ? { channelCode: sp.get('channel') as string } : {}),
    ...(sp.get('from') || sp.get('to')
      ? {
          createdAt: {
            ...(sp.get('from') ? { gte: new Date(sp.get('from') as string) } : {}),
            ...(sp.get('to') ? { lte: new Date(`${sp.get('to')}T23:59:59`) } : {}),
          },
        }
      : {}),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * size,
      take: size,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    page,
    size,
    total,
    totalPages: Math.ceil(total / size),
    orders: orders.map((o) => ({
      orderNo: o.orderNo,
      channel: o.channelCode,
      channelOrderNo: o.channelOrderNo,
      status: o.status,
      orderedAt: o.createdAt,
      orderer: { name: o.ordererName, phone: o.ordererPhone, email: o.ordererEmail },
      shipping: {
        receiver: o.receiver,
        phone: o.recvPhone,
        zipcode: o.zipcode,
        address1: o.address1,
        address2: o.address2,
        memo: o.memo,
        courier: o.courier,
        trackingNo: o.trackingNo,
      },
      amount: {
        item: o.itemTotal,
        shipping: o.shippingFee,
        discount: o.discount,
        point: o.pointUsed,
        total: o.totalAmount,
      },
      payment: { method: o.payment?.method ?? null, status: o.payment?.status ?? null, paidAt: o.payment?.paidAt ?? null },
      items: o.items.map((it) => ({
        productName: it.productName,
        option: it.optionName,
        price: it.price,
        quantity: it.quantity,
      })),
    })),
  });
}
