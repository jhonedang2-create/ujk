import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiKey } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

/** GET /api/v1/products — 상품·재고 목록 (외부 솔루션이 재고를 맞출 때) */
export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req, 'products:read');
  if (auth.error) return auth.error;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get('page') ?? 1));
  const size = Math.min(500, Math.max(1, Number(sp.get('size') ?? 200)));

  const [total, products] = await Promise.all([
    prisma.product.count(),
    prisma.product.findMany({
      include: {
        category: { select: { name: true, slug: true } },
        options: { select: { id: true, name: true, value: true, extraPrice: true, stock: true } },
        channelMaps: { select: { channelCode: true, externalProductId: true, externalItemId: true } },
      },
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
    products: products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category.name,
      price: p.price,
      listPrice: p.listPrice,
      stock: p.stock,
      isActive: p.isActive,
      unit: p.unit,
      options: p.options,
      channels: p.channelMaps,
    })),
  });
}
