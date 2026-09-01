import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireApiKey } from '@/lib/apiAuth';
import { ORDER_STATUS } from '@/lib/site';

export const dynamic = 'force-dynamic';

/** GET /api/v1/orders/{orderNo} — 단건 조회 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ orderNo: string }> }) {
  const auth = await requireApiKey(req, 'orders:read');
  if (auth.error) return auth.error;

  const { orderNo } = await ctx.params;
  const order = await prisma.order.findUnique({
    where: { orderNo },
    select: {
      orderNo: true,
      channelCode: true,
      channelOrderNo: true,
      status: true,
      ordererName: true,
      ordererPhone: true,
      ordererEmail: true,
      receiver: true,
      recvPhone: true,
      zipcode: true,
      address1: true,
      address2: true,
      memo: true,
      itemTotal: true,
      shippingFee: true,
      discount: true,
      pointUsed: true,
      totalAmount: true,
      courier: true,
      trackingNo: true,
      createdAt: true,
      shippedAt: true,
      deliveredAt: true,
      items: { select: { productName: true, optionName: true, price: true, quantity: true } },
      payment: { select: { method: true, status: true, paidAt: true } },
    },
  });
  if (!order) return NextResponse.json({ ok: false, message: '주문을 찾을 수 없습니다.' }, { status: 404 });

  return NextResponse.json({ ok: true, order });
}

/**
 * PATCH /api/v1/orders/{orderNo}
 * body: { status?: "SHIPPING", courier?: "대한통운", trackingNo?: "123456789" }
 *
 * 외부 솔루션이 송장을 등록하거나 배송 상태를 되돌려줄 때 씁니다.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ orderNo: string }> }) {
  const auth = await requireApiKey(req, 'orders:write');
  if (auth.error) return auth.error;

  const { orderNo } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const order = await prisma.order.findUnique({ where: { orderNo } });
  if (!order) return NextResponse.json({ ok: false, message: '주문을 찾을 수 없습니다.' }, { status: 404 });

  if (body.status && !Object.keys(ORDER_STATUS).includes(body.status)) {
    return NextResponse.json(
      { ok: false, message: `허용되지 않는 상태입니다. (${Object.keys(ORDER_STATUS).join(', ')})` },
      { status: 400 }
    );
  }

  const transitions: Record<string, string[]> = {
    PAID: ['PREPARING', 'SHIPPING'],
    PREPARING: ['SHIPPING'],
    SHIPPING: ['DELIVERED'],
  };
  if (body.status && !transitions[order.status]?.includes(body.status)) {
    return NextResponse.json(
      { ok: false, message: `${order.status} 상태에서 ${body.status}(으)로 변경할 수 없습니다.` },
      { status: 409 }
    );
  }
  if ((body.courier !== undefined || body.trackingNo !== undefined) && !['PAID', 'PREPARING', 'SHIPPING'].includes(order.status)) {
    return NextResponse.json({ ok: false, message: '발송 가능한 주문 상태가 아닙니다.' }, { status: 409 });
  }

  const updated = await prisma.order.update({
    where: { orderNo },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.courier !== undefined ? { courier: String(body.courier).slice(0, 40) } : {}),
      ...(body.trackingNo !== undefined ? { trackingNo: String(body.trackingNo).slice(0, 80) } : {}),
      ...(body.status === 'SHIPPING' ? { shippedAt: new Date() } : {}),
      ...(body.status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
    },
  });

  revalidatePath('/admin/orders');
  return NextResponse.json({ ok: true, orderNo: updated.orderNo, status: updated.status });
}
