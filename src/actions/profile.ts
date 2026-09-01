'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { normalizePhone, isValidMobile } from '@/lib/messaging/solapi';

export type Res = { ok: boolean; message: string };

/**
 * 마이페이지 내 정보 저장.
 * 소셜 가입은 이름·이메일만 받아오므로 연락처와 수신동의를 여기서 채웁니다.
 */
export async function saveProfile(_prev: Res, fd: FormData): Promise<Res> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: '로그인이 필요합니다.' };

  const name = String(fd.get('name') ?? '').trim();
  const phoneRaw = String(fd.get('phone') ?? '').trim();
  const agreeMarketing = fd.get('agreeMarketing') === 'on';

  if (!name) return { ok: false, message: '이름을 입력해 주세요.' };

  const phoneNorm = normalizePhone(phoneRaw);
  if (phoneRaw && !isValidMobile(phoneNorm)) {
    return { ok: false, message: '휴대폰 번호 형식이 올바르지 않습니다.' };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      phone: phoneRaw,
      phoneNorm,
      agreeMarketing,
      agreeSms: agreeMarketing,
    },
  });

  // 동의를 다시 켜면 '본인이 남긴' 수신거부 기록만 해제합니다.
  // 번호 인증이 없으므로 남의 번호를 적어 그 사람의 수신거부를 풀 수 없게 막습니다.
  if (agreeMarketing && phoneNorm) {
    await prisma.optOutToken
      .updateMany({
        where: { phone: phoneNorm, userId: session.user.id },
        data: { usedAt: null },
      })
      .catch(() => null);
  }

  revalidatePath('/mypage');
  return { ok: true, message: '저장되었습니다.' };
}
