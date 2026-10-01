'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export type CommerceResult = {
  ok: boolean;
  message: string;
  active?: boolean;
};

async function requireUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function toggleWishlist(productId: string): Promise<CommerceResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, message: '로그인이 필요합니다.' };
  if (!productId) return { ok: false, message: '상품 정보가 올바르지 않습니다.' };

  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true, slug: true },
  });
  if (!product) return { ok: false, message: '판매 중인 상품이 아닙니다.' };

  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
  } else {
    await prisma.wishlist.create({ data: { userId, productId } });
  }

  revalidatePath('/mypage/wishlist');
  revalidatePath(`/products/${product.slug}`);
  return {
    ok: true,
    active: !existing,
    message: existing ? '찜 목록에서 삭제했습니다.' : '찜한 상품에 추가했습니다.',
  };
}

export async function saveAddress(
  _prev: CommerceResult,
  fd: FormData
): Promise<CommerceResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, message: '로그인이 필요합니다.' };

  const id = String(fd.get('id') ?? '').trim();
  const label = String(fd.get('label') ?? '배송지').trim().slice(0, 30) || '배송지';
  const receiver = String(fd.get('receiver') ?? '').trim().slice(0, 40);
  const phone = String(fd.get('phone') ?? '').trim().slice(0, 30);
  const zipcode = String(fd.get('zipcode') ?? '').trim().slice(0, 10);
  const address1 = String(fd.get('address1') ?? '').trim().slice(0, 200);
  const address2 = String(fd.get('address2') ?? '').trim().slice(0, 200);
  const isDefault = fd.get('isDefault') === 'on';

  if (!receiver || !phone || !zipcode || !address1) {
    return { ok: false, message: '받는 분, 연락처, 우편번호, 기본주소를 입력해 주세요.' };
  }
  if (phone.replace(/\D/g, '').length < 9) {
    return { ok: false, message: '연락처를 정확히 입력해 주세요.' };
  }

  if (id) {
    const owned = await prisma.address.findFirst({ where: { id, userId }, select: { id: true } });
    if (!owned) return { ok: false, message: '배송지를 찾을 수 없습니다.' };
  }

  await prisma.$transaction(async (tx) => {
    const existingCount = await tx.address.count({ where: { userId } });
    const makeDefault = isDefault || existingCount === 0;
    if (makeDefault) {
      await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }

    const data = { label, receiver, phone, zipcode, address1, address2, isDefault: makeDefault };
    if (id) await tx.address.update({ where: { id }, data });
    else await tx.address.create({ data: { ...data, userId } });
  });

  revalidatePath('/mypage/addresses');
  revalidatePath('/checkout');
  return { ok: true, message: id ? '배송지를 수정했습니다.' : '배송지를 추가했습니다.' };
}

export async function deleteAddress(id: string): Promise<CommerceResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, message: '로그인이 필요합니다.' };

  const row = await prisma.address.findFirst({ where: { id, userId } });
  if (!row) return { ok: false, message: '배송지를 찾을 수 없습니다.' };

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });
    if (row.isDefault) {
      const next = await tx.address.findFirst({ where: { userId }, orderBy: { id: 'asc' } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });

  revalidatePath('/mypage/addresses');
  revalidatePath('/checkout');
  return { ok: true, message: '배송지를 삭제했습니다.' };
}

export async function setDefaultAddress(id: string): Promise<CommerceResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, message: '로그인이 필요합니다.' };

  const row = await prisma.address.findFirst({ where: { id, userId }, select: { id: true } });
  if (!row) return { ok: false, message: '배송지를 찾을 수 없습니다.' };

  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath('/mypage/addresses');
  revalidatePath('/checkout');
  return { ok: true, message: '기본 배송지로 설정했습니다.' };
}

export async function submitReview(
  _prev: CommerceResult,
  fd: FormData
): Promise<CommerceResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, message: '로그인이 필요합니다.' };

  const orderItemId = String(fd.get('orderItemId') ?? '').trim();
  const rating = Number(fd.get('rating') ?? 5);
  const content = String(fd.get('content') ?? '').trim();

  if (!orderItemId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: '별점을 확인해 주세요.' };
  }
  if (content.length < 5 || content.length > 2000) {
    return { ok: false, message: '후기는 5자 이상 2,000자 이하로 작성해 주세요.' };
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      order: { select: { userId: true, status: true } },
      product: { select: { id: true, slug: true, isActive: true } },
    },
  });

  if (!item || item.order.userId !== userId) {
    return { ok: false, message: '구매 내역을 확인할 수 없습니다.' };
  }
  if (item.order.status !== 'DELIVERED') {
    return { ok: false, message: '배송완료된 상품만 후기를 작성할 수 있습니다.' };
  }

  const duplicate = await prisma.review.findUnique({ where: { orderItemId } });
  if (duplicate) return { ok: false, message: '이미 후기를 작성한 상품입니다.' };

  await prisma.review.create({
    data: {
      productId: item.product.id,
      userId,
      orderItemId,
      rating,
      content,
    },
  });

  revalidatePath('/mypage/reviews');
  revalidatePath(`/products/${item.product.slug}`);
  return { ok: true, message: '구매후기가 등록되었습니다.' };
}

export async function reorder(orderId: string): Promise<CommerceResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, message: '로그인이 필요합니다.' };

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: {
        include: {
          product: { select: { id: true, isActive: true, stock: true } },
          option: { select: { id: true, isActive: true, stock: true } },
        },
      },
    },
  });
  if (!order) return { ok: false, message: '주문을 찾을 수 없습니다.' };

  let added = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      if (!item.product.isActive || (item.optionId && !item.option?.isActive)) {
        skipped += 1;
        continue;
      }

      const available = item.option
        ? Math.min(item.product.stock, item.option.stock)
        : item.product.stock;
      const qty = Math.min(item.quantity, Math.max(0, available));
      if (qty < 1) {
        skipped += 1;
        continue;
      }

      const existing = await tx.cartItem.findFirst({
        where: { userId, productId: item.productId, optionId: item.optionId },
      });
      if (existing) {
        const next = Math.min(existing.quantity + qty, available, 99);
        if (next <= existing.quantity) {
          skipped += 1;
          continue;
        }
        await tx.cartItem.update({ where: { id: existing.id }, data: { quantity: next } });
      } else {
        await tx.cartItem.create({
          data: {
            userId,
            guestKey: null,
            productId: item.productId,
            optionId: item.optionId,
            quantity: Math.min(qty, 99),
          },
        });
      }
      added += 1;
    }
  });

  revalidatePath('/cart');
  if (added === 0) return { ok: false, message: '현재 다시 담을 수 있는 상품이 없습니다.' };
  return {
    ok: true,
    message: skipped > 0
      ? `${added}개 상품을 장바구니에 담았습니다. ${skipped}개는 품절/판매중지로 제외했습니다.`
      : `${added}개 상품을 장바구니에 다시 담았습니다.`,
  };
}
