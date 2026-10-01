'use server';

import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/messaging/solapi';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export type AccountCommerceResult = {
  ok: boolean;
  message: string;
};

const GENERIC_ORDER_LOOKUP_ERROR = '주문번호와 연락처를 다시 확인해 주세요.';

export async function lookupOrder(
  _prev: AccountCommerceResult,
  fd: FormData
): Promise<AccountCommerceResult> {
  const h = await headers();
  const limited = rateLimit(`guest-order-lookup:${clientKey(h)}`, 8, 15 * 60 * 1000);
  if (!limited.ok) {
    return {
      ok: false,
      message: `조회 요청이 너무 많습니다. ${Math.ceil(limited.retryAfter / 60)}분 후 다시 시도해 주세요.`,
    };
  }

  const orderNo = String(fd.get('orderNo') ?? '').trim().toUpperCase().slice(0, 60);
  const phone = normalizePhone(String(fd.get('phone') ?? '').trim());

  if (orderNo.length < 4 || phone.length < 9) {
    return { ok: false, message: GENERIC_ORDER_LOOKUP_ERROR };
  }

  const order = await prisma.order.findUnique({
    where: { orderNo },
    select: {
      publicToken: true,
      ordererPhone: true,
      recvPhone: true,
    },
  });

  if (!order) return { ok: false, message: GENERIC_ORDER_LOOKUP_ERROR };

  const matched =
    normalizePhone(order.ordererPhone) === phone ||
    normalizePhone(order.recvPhone) === phone;

  if (!matched) return { ok: false, message: GENERIC_ORDER_LOOKUP_ERROR };

  redirect(`/order-lookup/${order.publicToken}`);
}

export async function changeMyPassword(
  _prev: AccountCommerceResult,
  fd: FormData
): Promise<AccountCommerceResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: '로그인이 필요합니다.' };

  const limited = rateLimit(`password-change:${session.user.id}`, 6, 30 * 60 * 1000);
  if (!limited.ok) {
    return {
      ok: false,
      message: `비밀번호 변경 요청이 너무 많습니다. ${Math.ceil(limited.retryAfter / 60)}분 후 다시 시도해 주세요.`,
    };
  }

  const currentPassword = String(fd.get('currentPassword') ?? '');
  const newPassword = String(fd.get('newPassword') ?? '');
  const confirmPassword = String(fd.get('confirmPassword') ?? '');

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { ok: false, message: '현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.' };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, message: '새 비밀번호 확인이 일치하지 않습니다.' };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true, role: true },
  });
  if (!user) return { ok: false, message: '회원 정보를 찾을 수 없습니다.' };
  if (!user.password) {
    return {
      ok: false,
      message: '카카오·네이버 로그인 계정은 해당 서비스에서 비밀번호를 관리합니다.',
    };
  }

  const currentOk = await bcrypt.compare(currentPassword, user.password);
  if (!currentOk) return { ok: false, message: '현재 비밀번호가 올바르지 않습니다.' };

  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return { ok: false, message: '새 비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.' };
  }

  if (
    user.role === 'ADMIN' &&
    (newPassword.length < 12 ||
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/\d/.test(newPassword) ||
      !/[^\w]/.test(newPassword))
  ) {
    return {
      ok: false,
      message: '최고관리자 비밀번호는 12자 이상이며 영문 대/소문자·숫자·특수문자를 포함해야 합니다.',
    };
  }

  if (await bcrypt.compare(newPassword, user.password)) {
    return { ok: false, message: '현재 비밀번호와 다른 비밀번호를 사용해 주세요.' };
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hash, provider: 'credentials' },
  });

  revalidatePath('/mypage/security');
  return { ok: true, message: '비밀번호가 변경되었습니다.' };
}
