'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/auth';

export async function setReviewVisibility(id: string, active: boolean) {
  const session = await requirePermission('content');
  const row = await prisma.review.findUnique({
    where: { id },
    select: { id: true, productId: true, product: { select: { slug: true } } },
  });
  if (!row) return { ok: false, message: '후기를 찾을 수 없습니다.' };

  await prisma.review.update({ where: { id }, data: { isActive: active } });
  await prisma.adminLog.create({
    data: {
      userId: session.user.id,
      userName: session.user.name ?? '',
      action: active ? 'REVIEW_SHOW' : 'REVIEW_HIDE',
      target: id,
      detail: row.productId,
    },
  }).catch(() => null);

  revalidatePath('/admin/reviews');
  revalidatePath(`/products/${row.product.slug}`);
  return { ok: true, message: active ? '후기를 다시 공개했습니다.' : '후기를 숨겼습니다.' };
}
