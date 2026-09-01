'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const GUEST_COOKIE = 'ujgim_cart';

/**
 * 회원이면 userId, 비회원이면 guestKey 로 장바구니를 식별합니다.
 *
 * ⚠️ 쿠키는 서버 액션 / 라우트 핸들러에서만 쓸 수 있습니다.
 *    서버 컴포넌트 렌더링 중(create=false)에는 절대 쿠키를 생성하지 않습니다.
 */
export async function getCartOwner(create = false) {
  const session = await auth();
  if (session?.user?.id) return { userId: session.user.id, guestKey: null as string | null };

  const store = await cookies();
  let key = store.get(GUEST_COOKIE)?.value ?? null;

  if (!key && create) {
    key = `g_${crypto.randomUUID()}`;
    store.set(GUEST_COOKIE, key, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
  }

  return { userId: null as string | null, guestKey: key };
}

export async function getCartItems() {
  const owner = await getCartOwner(); // 읽기 전용
  if (!owner.userId && !owner.guestKey) return []; // 아직 장바구니가 없는 비회원

  return prisma.cartItem.findMany({
    where: owner.userId ? { userId: owner.userId } : { guestKey: owner.guestKey },
    include: {
      product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } },
      option: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function addToCart(formData: FormData) {
  const productId = String(formData.get('productId') ?? '');
  const optionId = (formData.get('optionId') as string) || null;
  const quantity = Number(formData.get('quantity') ?? 1);
  if (!productId) return { ok: false, message: '상품 정보가 올바르지 않습니다.' };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return { ok: false, message: '수량은 1개부터 99개까지 선택할 수 있습니다.' };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { options: optionId ? { where: { id: optionId, isActive: true } } : false },
  });
  if (!product || !product.isActive) return { ok: false, message: '판매 중인 상품이 아닙니다.' };
  const option = optionId ? product.options[0] : null;
  if (optionId && !option) return { ok: false, message: '선택한 옵션을 사용할 수 없습니다.' };

  const owner = await getCartOwner(true);

  const existing = await prisma.cartItem.findFirst({
    where: {
      productId,
      optionId,
      ...(owner.userId ? { userId: owner.userId } : { guestKey: owner.guestKey }),
    },
  });

  if (existing) {
    const nextQuantity = existing.quantity + quantity;
    if (product.stock < nextQuantity || (option && option.stock < nextQuantity)) {
      return { ok: false, message: '재고가 부족합니다.' };
    }
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: nextQuantity },
    });
  } else {
    if (product.stock < quantity || (option && option.stock < quantity)) {
      return { ok: false, message: '재고가 부족합니다.' };
    }
    await prisma.cartItem.create({
      data: { productId, optionId, quantity, userId: owner.userId, guestKey: owner.guestKey },
    });
  }

  revalidatePath('/cart');
  return { ok: true, message: '장바구니에 담았습니다.' };
}

export async function updateCartQty(itemId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return;
  const owner = await getCartOwner();
  if (!owner.userId && !owner.guestKey) return;
  const item = await prisma.cartItem.findFirst({
    where: {
      id: itemId,
      ...(owner.userId ? { userId: owner.userId } : { guestKey: owner.guestKey }),
    },
    include: { product: true, option: true },
  });
  if (!item || item.product.stock < quantity || (item.option && item.option.stock < quantity)) return;
  await prisma.cartItem.updateMany({
    where: {
      id: itemId,
      ...(owner.userId ? { userId: owner.userId } : { guestKey: owner.guestKey }),
    },
    data: { quantity },
  });
  revalidatePath('/cart');
}

export async function removeCartItem(itemId: string) {
  const owner = await getCartOwner();
  if (!owner.userId && !owner.guestKey) return;
  await prisma.cartItem.deleteMany({
    where: {
      id: itemId,
      ...(owner.userId ? { userId: owner.userId } : { guestKey: owner.guestKey }),
    },
  });
  revalidatePath('/cart');
}

export async function clearCart() {
  const owner = await getCartOwner();
  if (!owner.userId && !owner.guestKey) return;
  await prisma.cartItem.deleteMany({
    where: owner.userId ? { userId: owner.userId } : { guestKey: owner.guestKey },
  });
  revalidatePath('/cart');
}

/**
 * 로그인 직후 비회원 장바구니를 회원 계정으로 이관합니다.
 * (auth.ts 의 signIn 이벤트에서 호출 — 라우트 핸들러 컨텍스트라 쿠키 수정 가능)
 */
export async function mergeGuestCart(userId: string) {
  const store = await cookies();
  const key = store.get(GUEST_COOKIE)?.value;
  if (!key) return;

  await prisma.cartItem.updateMany({
    where: { guestKey: key },
    data: { userId, guestKey: null },
  });

  store.delete(GUEST_COOKIE);
  revalidatePath('/cart');
}
