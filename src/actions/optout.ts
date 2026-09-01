'use server';

import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { normalizePhone, isValidMobile } from '@/lib/messaging/solapi';

export type Res = { ok: boolean; message: string };

/**
 * 광고 수신거부 처리.
 * 로그인·본인인증 없이 번호만으로 즉시 처리합니다.
 * (수신거부 절차가 어려우면 '미명시'로 간주되어 과태료 대상입니다 — 정보통신망법 제50조제4항)
 */
export async function optOut(_prev: Res, fd: FormData): Promise<Res> {
  const phone = normalizePhone(String(fd.get('phone') ?? ''));

  if (!isValidMobile(phone)) {
    return { ok: false, message: '휴대폰 번호 형식이 올바르지 않습니다.' };
  }

  const now = new Date();

  // 회원이면 마케팅 동의를 끕니다
  const users = await prisma.user.findMany({ where: { phoneNorm: phone } });
  for (const u of users) {
    await prisma.user
      .update({ where: { id: u.id }, data: { agreeMarketing: false, agreeSms: false } })
      .catch(() => null);
  }

  // 비회원 번호도 차단 목록에 남깁니다
  const existing = await prisma.optOutToken.findFirst({ where: { phone, usedAt: { not: null } } });
  if (!existing) {
    await prisma.optOutToken
      .create({
        data: {
          token: crypto.randomBytes(16).toString('hex'),
          phone,
          userId: users[0]?.id ?? null,
          usedAt: now,
        },
      })
      .catch(() => null);
  }

  return {
    ok: true,
    message: `${phone} 번호로 더 이상 광고성 문자를 보내지 않습니다. 주문·배송 안내는 계속 받으실 수 있습니다.`,
  };
}
