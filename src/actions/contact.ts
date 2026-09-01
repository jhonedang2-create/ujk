'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { headers } from 'next/headers';
import { clientKey, rateLimit } from '@/lib/rate-limit';

const schema = z.object({
  type: z.string().max(30).default('GENERAL'),
  name: z.string().min(2, '이름을 입력해 주세요.').max(40),
  phone: z.string().min(9, '연락처를 정확히 입력해 주세요.').max(30),
  email: z.string().email('이메일 형식이 올바르지 않습니다.').or(z.literal('')).default(''),
  company: z.string().max(80).default(''),
  title: z.string().min(2, '제목을 입력해 주세요.').max(120),
  content: z.string().min(5, '문의 내용을 5자 이상 입력해 주세요.').max(5000),
  agreePrivacy: z.string().optional(),
});

export type ActionState = { ok: boolean; message: string };

export async function submitInquiry(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const requestHeaders = await headers();
  const limited = rateLimit(`inquiry:${clientKey(requestHeaders)}`, 5, 60 * 60 * 1000);
  if (!limited.ok) return { ok: false, message: '문의가 너무 자주 접수되었습니다. 잠시 후 다시 시도해 주세요.' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? '입력값을 확인해 주세요.' };
  }
  const d = parsed.data;
  if (!d.agreePrivacy) {
    return { ok: false, message: '개인정보 수집·이용에 동의해 주세요.' };
  }

  const session = await auth();

  await prisma.inquiry.create({
    data: {
      userId: session?.user?.id ?? null,
      type: d.type,
      name: d.name,
      phone: d.phone,
      email: d.email,
      company: d.company,
      title: d.title,
      content: d.content,
      agreePrivacy: true,
    },
  });

  revalidatePath('/admin/inquiries');
  return { ok: true, message: '문의가 정상적으로 접수되었습니다. 확인 후 연락드리겠습니다.' };
}
