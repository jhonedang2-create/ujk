import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireApiKey } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/v1/products/{sku}
 * body: { stock?: 120, price?: 12900, isActive?: true }
 *
 * {sku} 자리에는 상품코드(SKU) 또는 상품 id 를 쓸 수 있습니다.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ sku: string }> }) {
  const auth = await requireApiKey(req, 'products:write');
  if (auth.error) return auth.error;

  const { sku } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const product =
    (await prisma.product.findFirst({ where: { sku } })) ??
    (await prisma.product.findUnique({ where: { id: sku } }));

  if (!product) return NextResponse.json({ ok: false, message: '상품을 찾을 수 없습니다.' }, { status: 404 });

  if (body.stock !== undefined && (!Number.isInteger(Number(body.stock)) || Number(body.stock) < 0)) {
    return NextResponse.json({ ok: false, message: '재고는 0 이상의 정수여야 합니다.' }, { status: 400 });
  }
  if (body.price !== undefined && (!Number.isInteger(Number(body.price)) || Number(body.price) < 0)) {
    return NextResponse.json({ ok: false, message: '가격은 0 이상의 정수여야 합니다.' }, { status: 400 });
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: {
      ...(body.stock !== undefined ? { stock: Math.max(0, Number(body.stock) || 0) } : {}),
      ...(body.price !== undefined ? { price: Math.max(0, Number(body.price) || 0) } : {}),
      ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
    },
  });

  revalidatePath('/admin/products');
  revalidatePath('/products');

  return NextResponse.json({
    ok: true,
    id: updated.id,
    sku: updated.sku,
    stock: updated.stock,
    price: updated.price,
    isActive: updated.isActive,
  });
}
