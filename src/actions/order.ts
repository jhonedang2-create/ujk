'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getCartOwner } from '@/actions/cart';
import { makeOrderNo } from '@/lib/utils';
import { calcShippingFee, SITE } from '@/lib/site';
import { normalizePhone } from '@/lib/messaging/solapi';

const schema = z.object({
  ordererName: z.string().trim().min(2, '주문자 이름을 입력해 주세요.').max(50),
  ordererPhone: z.string().trim().min(9, '주문자 연락처를 입력해 주세요.').max(30),
  ordererEmail: z.string().trim().max(100).email().or(z.literal('')).default(''),

  receiver: z.string().trim().min(2, '받는 분 이름을 입력해 주세요.').max(50),
  recvPhone: z.string().trim().min(9, '받는 분 연락처를 입력해 주세요.').max(30),
  zipcode: z.string().trim().min(3, '우편번호를 입력해 주세요.').max(10),
  address1: z.string().trim().min(3, '주소를 입력해 주세요.').max(150),
  address2: z.string().trim().max(150).default(''),
  memo: z.string().trim().max(200).default(''),

  method: z.enum(['BANK', 'TOSS', 'PORTONE']),
  depositor: z.string().trim().max(50).default(''),
  pointUsed: z.coerce.number().int().min(0).max(10_000_000).default(0),
});

export type CreateOrderResult =
  | { ok: true; orderId: string; orderNo: string; publicToken: string; amount: number; method: string; orderName: string }
  | { ok: false; message: string };

/**
 * 장바구니를 주문으로 전환합니다.
 * - BANK: 즉시 '입금대기' 주문 생성
 * - TOSS / PORTONE: 결제 대기 주문을 만들고, 클라이언트가 PG 창을 띄웁니다.
 */
export async function createOrder(formData: FormData): Promise<CreateOrderResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? '입력값을 확인해 주세요.' };
  }
  const d = parsed.data;

  const session = await auth();
  const owner = await getCartOwner();
  if (!owner.userId && !owner.guestKey) {
    return { ok: false, message: '장바구니가 비어 있습니다.' };
  }

  const cartItems = await prisma.cartItem.findMany({
    where: owner.userId ? { userId: owner.userId } : { guestKey: owner.guestKey },
    include: {
      product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } },
      option: true,
    },
  });

  if (cartItems.length === 0) return { ok: false, message: '장바구니가 비어 있습니다.' };

  // 재고 확인
  for (const it of cartItems) {
    if (!it.product.isActive) return { ok: false, message: `${it.product.name} 은(는) 판매 중지된 상품입니다.` };
    if (it.product.stock < it.quantity) {
      return { ok: false, message: `${it.product.name} 의 재고가 부족합니다. (남은 수량 ${it.product.stock})` };
    }
  }

  const itemTotal = cartItems.reduce(
    (sum, it) => sum + (it.product.price + (it.option?.extraPrice ?? 0)) * it.quantity,
    0
  );
  const shippingFee = calcShippingFee(itemTotal);

  // 적립금 사용 검증
  let pointUsed = 0;
  if (session?.user?.id && d.pointUsed > 0) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    pointUsed = Math.min(d.pointUsed, user?.point ?? 0, itemTotal);
  }

  const totalAmount = itemTotal + shippingFee - pointUsed;
  if (totalAmount < 0) return { ok: false, message: '결제 금액이 올바르지 않습니다.' };

  const orderNo = makeOrderNo();

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
    // 주문 생성과 동시에 재고를 예약합니다. 결제창이 동시에 열려도 재고가 음수가 되지 않습니다.
    for (const it of cartItems) {
      const reserved = await tx.product.updateMany({
        where: { id: it.productId, isActive: true, stock: { gte: it.quantity } },
        data: { stock: { decrement: it.quantity } },
      });
      if (reserved.count !== 1) throw new Error(`${it.product.name}의 재고가 부족합니다.`);

      if (it.optionId) {
        const optionReserved = await tx.productOption.updateMany({
          where: {
            id: it.optionId,
            productId: it.productId,
            isActive: true,
            stock: { gte: it.quantity },
          },
          data: { stock: { decrement: it.quantity } },
        });
        if (optionReserved.count !== 1) throw new Error(`${it.product.name} 옵션 재고가 부족합니다.`);
      }
    }

    const created = await tx.order.create({
      data: {
        orderNo,
        userId: session?.user?.id ?? null,
        ordererName: d.ordererName,
        ordererPhone: d.ordererPhone,
        ordererEmail: d.ordererEmail,
        receiver: d.receiver,
        recvPhone: d.recvPhone,
        zipcode: d.zipcode,
        address1: d.address1,
        address2: d.address2,
        memo: d.memo,
        itemTotal,
        shippingFee,
        pointUsed,
        totalAmount,
        status: 'PENDING',
        stockReserved: true,
        items: {
          create: cartItems.map((it) => ({
            productId: it.productId,
            optionId: it.optionId,
            productName: it.product.name,
            optionName: it.option ? `${it.option.name}: ${it.option.value}` : '',
            imageUrl: it.product.images[0]?.url ?? '',
            price: it.product.price + (it.option?.extraPrice ?? 0),
            quantity: it.quantity,
          })),
        },
      },
    });

    await tx.payment.create({
      data: {
        orderId: created.id,
        method: d.method,
        provider: d.method === 'TOSS' ? 'toss' : d.method === 'PORTONE' ? 'portone' : '',
        status: 'READY',
        amount: totalAmount,
        merchantUid: orderNo,
        ...(d.method === 'BANK'
          ? {
              bankName: SITE.bank.name,
              bankAccount: SITE.bank.account,
              depositor: d.depositor || d.ordererName,
            }
          : {}),
      },
    });

    // 적립금 차감
    if (pointUsed > 0 && session?.user?.id) {
      const debited = await tx.user.updateMany({
        where: { id: session.user.id, point: { gte: pointUsed } },
        data: { point: { decrement: pointUsed } },
      });
      if (debited.count !== 1) throw new Error('적립금 잔액이 변경되었습니다. 다시 확인해 주세요.');
      const u = await tx.user.findUniqueOrThrow({ where: { id: session.user.id } });
      await tx.pointLog.create({
        data: {
          userId: session.user.id,
          amount: -pointUsed,
          balance: u.point,
          reason: `주문 사용 (${orderNo})`,
          orderId: created.id,
        },
      });
    }

    // 장바구니 비우기
    await tx.cartItem.deleteMany({
      where: owner.userId ? { userId: owner.userId } : { guestKey: owner.guestKey },
    });

    return created;
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : '주문을 생성하지 못했습니다. 다시 시도해 주세요.',
    };
  }

  // 소셜 가입 회원은 전화번호가 비어 있습니다.
  // 주문서에 적은 번호를 계정에 채워 넣어야 배송 알림과 대상 조회가 동작합니다.
  // 이 시점엔 주문이 이미 커밋됐습니다.
  // 여기서 예외가 나면 성공한 주문이 실패로 보이므로 통째로 감쌉니다.
  if (session?.user?.id) {
    try {
      const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { phoneNorm: true },
      });
      const norm = normalizePhone(d.ordererPhone);
      if (u && !u.phoneNorm && norm) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { phone: d.ordererPhone, phoneNorm: norm },
        });
      }
    } catch {
      /* 번호 저장 실패는 주문 성공에 영향을 주지 않습니다 */
    }
  }

  const first = cartItems[0].product.name;
  const orderName = cartItems.length > 1 ? `${first} 외 ${cartItems.length - 1}건` : first;

  revalidatePath('/cart');
  revalidatePath('/admin/orders');

  return {
    ok: true,
    orderId: order.id,
    orderNo,
    publicToken: order.publicToken,
    amount: totalAmount,
    method: d.method,
    orderName,
  };
}

/** 사용자 주문 취소 (결제 전 · 입금 전만 가능) */
export async function cancelMyOrder(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: '로그인이 필요합니다.' };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== session.user.id) return { ok: false, message: '주문을 찾을 수 없습니다.' };
  if (order.status !== 'PENDING') {
    return { ok: false, message: '이미 결제가 완료된 주문은 고객센터로 문의해 주세요.' };
  }

  const { cancelPaymentForOrder } = await import('@/lib/payments');
  await cancelPaymentForOrder(orderId, '고객 요청');

  revalidatePath('/mypage/orders');
  return { ok: true, message: '주문이 취소되었습니다.' };
}
