import { prisma } from '@/lib/prisma';
import { cancelTossPayment } from './toss';
import { cancelPortOnePayment } from './portone';

export * from './toss';
export * from './portone';

const FINAL_PAYMENT_STATUSES = ['CANCELLED', 'REFUNDED'] as const;

/**
 * PG 취소가 확인됐거나 결제 전 주문을 취소할 때 로컬 주문을 한 번만 정산합니다.
 * 재고 예약 복원, 판매수량, 구매 적립금 회수, 사용 적립금 환급을 같은 트랜잭션에서 처리합니다.
 */
export async function settleOrderCancellation(orderId: string, reason: string) {
  const snapshot = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true },
  });
  if (!snapshot?.payment) throw new Error('결제 정보를 찾을 수 없습니다.');
  if (FINAL_PAYMENT_STATUSES.includes(snapshot.payment.status as (typeof FINAL_PAYMENT_STATUSES)[number])) {
    return snapshot;
  }

  const wasPaid = snapshot.payment.status === 'PAID';
  const nextStatus = wasPaid ? 'REFUNDED' : 'CANCELLED';

  const settled = await prisma.$transaction(async (tx) => {
    const claimedOrder = await tx.order.updateMany({
      where: {
        id: orderId,
        refundSettledAt: null,
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
      data: {
        status: nextStatus,
        stockReserved: false,
        refundSettledAt: new Date(),
      },
    });
    if (claimedOrder.count !== 1) return false;

    const claimedPayment = await tx.payment.updateMany({
      where: { id: snapshot.payment!.id, status: snapshot.payment!.status },
      data: { status: nextStatus, cancelledAt: new Date() },
    });
    if (claimedPayment.count !== 1) throw new Error('이미 다른 요청에서 결제 상태가 변경되었습니다.');

    if (snapshot.stockReserved) {
      for (const item of snapshot.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            ...(wasPaid ? { soldCount: { decrement: item.quantity } } : {}),
          },
        });
        if (item.optionId) {
          await tx.productOption.update({
            where: { id: item.optionId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }

    if (snapshot.userId) {
      if (wasPaid && snapshot.rewardPoint > 0) {
        const user = await tx.user.findUniqueOrThrow({ where: { id: snapshot.userId } });
        const reversal = Math.min(snapshot.rewardPoint, Math.max(0, user.point));
        if (reversal > 0) {
          const updated = await tx.user.update({
            where: { id: snapshot.userId },
            data: { point: { decrement: reversal } },
          });
          await tx.pointLog.create({
            data: {
              userId: snapshot.userId,
              amount: -reversal,
              balance: updated.point,
              reason: `${reason}: 주문 환불 적립 회수 (${snapshot.orderNo})`,
              orderId: snapshot.id,
            },
          });
        }
      }

      if (snapshot.pointUsed > 0) {
        const updated = await tx.user.update({
          where: { id: snapshot.userId },
          data: { point: { increment: snapshot.pointUsed } },
        });
        await tx.pointLog.create({
          data: {
            userId: snapshot.userId,
            amount: snapshot.pointUsed,
            balance: updated.point,
            reason: `${reason}: 주문 취소 적립금 환급 (${snapshot.orderNo})`,
            orderId: snapshot.id,
          },
        });
      }
    }

    return true;
  });

  if (!settled) {
    return prisma.order.findUnique({ where: { id: orderId }, include: { items: true, payment: true } });
  }
  return prisma.order.findUnique({ where: { id: orderId }, include: { items: true, payment: true } });
}

/** 결제수단에 맞춰 PG를 취소한 뒤 로컬 주문을 정산합니다. */
export async function cancelPaymentForOrder(orderId: string, reason: string) {
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) throw new Error('결제 정보를 찾을 수 없습니다.');

  if (payment.status === 'PAID') {
    if (payment.method === 'TOSS' && payment.paymentKey) {
      await cancelTossPayment({ paymentKey: payment.paymentKey, cancelReason: reason });
    } else if (payment.method === 'PORTONE' && payment.impUid) {
      await cancelPortOnePayment({ impUid: payment.impUid, reason });
    }
  }

  return settleOrderCancellation(orderId, reason);
}

/** 결제 완료 처리 — 결제 콜백과 웹훅이 동시에 와도 한 번만 반영합니다. */
export async function markOrderPaid(params: {
  orderId: string;
  method: string;
  provider?: string;
  amount: number;
  paymentKey?: string;
  impUid?: string;
  merchantUid?: string;
  receiptUrl?: string;
  raw?: unknown;
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { items: true, payment: true },
  });
  if (!order?.payment) throw new Error('주문 또는 결제 정보를 찾을 수 없습니다.');
  if (order.totalAmount !== params.amount || order.payment.amount !== params.amount) {
    throw new Error('결제 금액이 주문 금액과 일치하지 않습니다.');
  }
  if (order.payment.method !== params.method) {
    throw new Error('주문에 선택된 결제수단과 승인 결제수단이 다릅니다.');
  }
  if (params.merchantUid && params.merchantUid !== order.orderNo) {
    throw new Error('PG 주문번호가 일치하지 않습니다.');
  }
  if (order.status !== 'PENDING') {
    const sameApprovedPayment =
      order.status === 'PAID' &&
      order.payment.status === 'PAID' &&
      (!params.paymentKey || params.paymentKey === order.payment.paymentKey) &&
      (!params.impUid || params.impUid === order.payment.impUid);
    if (sameApprovedPayment) return order;
    throw new Error('이미 처리된 주문에 다른 결제를 연결할 수 없습니다.');
  }
  if (!order.stockReserved) throw new Error('주문 재고가 예약되지 않았습니다.');

  const reward = order.userId ? Math.floor(order.totalAmount * 0.01) : 0;

  const paid = await prisma.$transaction(async (tx) => {
    const claimedOrder = await tx.order.updateMany({
      where: { id: order.id, status: 'PENDING', stockReserved: true },
      data: { status: 'PAID', rewardPoint: reward },
    });
    if (claimedOrder.count !== 1) return false;

    const claimedPayment = await tx.payment.updateMany({
      where: { orderId: order.id, status: 'READY', amount: params.amount },
      data: {
        method: params.method,
        provider: params.provider ?? '',
        status: 'PAID',
        paymentKey: params.paymentKey ?? undefined,
        impUid: params.impUid ?? undefined,
        merchantUid: params.merchantUid ?? order.orderNo,
        receiptUrl: params.receiptUrl ?? undefined,
        rawPayload: params.raw ? JSON.stringify(params.raw).slice(0, 100_000) : '',
        paidAt: new Date(),
      },
    });
    if (claimedPayment.count !== 1) throw new Error('결제 상태가 이미 변경되었습니다.');

    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { soldCount: { increment: item.quantity } },
      });
    }

    if (order.userId && reward > 0) {
      const user = await tx.user.update({
        where: { id: order.userId },
        data: { point: { increment: reward } },
      });
      await tx.pointLog.create({
        data: {
          userId: order.userId,
          amount: reward,
          balance: user.point,
          reason: `구매 적립 (${order.orderNo})`,
          orderId: order.id,
        },
      });
    }

    return true;
  });

  if (!paid) return prisma.order.findUnique({ where: { id: order.id } });
  return prisma.order.findUnique({ where: { id: order.id } });
}
