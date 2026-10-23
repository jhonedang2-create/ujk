'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/auth';
import { prisma } from '@/lib/prisma';
import { merchantPolicySchema, parseMerchantPolicyState, merchantPolicyAfterSave, policyMissing, MERCHANT_POLICY_KEY, MERCHANT_POLICY_PUBLIC_KEY } from '@/lib/merchant-policy-rules';

export type PolicyResult = { ok: boolean; message: string; revision?: string };
const text = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const numeric = (fd: FormData, k: string) => text(fd, k) === '' ? null : Number(text(fd, k));

export async function saveMerchantPolicy(_previous: PolicyResult, fd: FormData): Promise<PolicyResult> {
  const session = await requireOwner();
  const parsed = merchantPolicySchema.safeParse({
    revision: crypto.randomUUID(),
    dispatchDays: numeric(fd, 'dispatchDays'), deliveryMinDays: numeric(fd, 'deliveryMinDays'), deliveryMaxDays: numeric(fd, 'deliveryMaxDays'),
    returnFee: numeric(fd, 'returnFee'), exchangeFee: numeric(fd, 'exchangeFee'),
    returnAddress: text(fd, 'returnAddress'), shippingNote: text(fd, 'shippingNote'),
    confirmed: fd.get('confirmed') === 'on', businessVerified: fd.get('businessVerified') === 'on', privacyVerified: fd.get('privacyVerified') === 'on',
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요.' };
  const policy = parsed.data;
  if (policy.confirmed && policyMissing(policy).length) return { ok: false, message: `공개 전 ${policyMissing(policy).join(', ')}를 모두 입력해 주세요.` };
  if (!policy.confirmed && fd.get('confirmDraftOnly') !== 'on') return { ok: false, message: '공개하지 않고 초안으로 저장할 경우 초안 저장 확인을 선택해 주세요.' };
  let hasPublishedPolicy = false;
  try {
    await prisma.$transaction(async (tx) => {
      const previous = await tx.siteSetting.findUnique({ where: { key: MERCHANT_POLICY_KEY } });
      const previousPublished = await tx.siteSetting.findUnique({ where: { key: MERCHANT_POLICY_PUBLIC_KEY } });
      const current = parseMerchantPolicyState(previous?.value, previousPublished?.value);
      if (current.draft.revision !== text(fd, 'expectedRevision')) throw new Error('POLICY_CONFLICT');
      const next = merchantPolicyAfterSave(current, policy);
      const value = JSON.stringify(policy);
      if (previous) {
        const result = await tx.siteSetting.updateMany({ where: { key: MERCHANT_POLICY_KEY, value: previous.value }, data: { value } });
        if (result.count !== 1) throw new Error('POLICY_CONFLICT');
      } else await tx.siteSetting.create({ data: { key: MERCHANT_POLICY_KEY, value } });
      // Migrate a confirmed legacy value in this same transaction before a draft can replace it.
      if (next.published && (policy.confirmed || !previousPublished)) {
        const publishedValue = JSON.stringify(next.published);
        await tx.siteSetting.upsert({
          where: { key: MERCHANT_POLICY_PUBLIC_KEY },
          update: { value: publishedValue },
          create: { key: MERCHANT_POLICY_PUBLIC_KEY, value: publishedValue },
        });
      }
      hasPublishedPolicy = next.published !== null;
      await tx.adminLog.create({ data: {
        userId: session.user.id ?? '', userName: session.user.name ?? '', action: 'MERCHANT_POLICY_SAVE', target: MERCHANT_POLICY_KEY,
        detail: JSON.stringify({ revision: policy.revision, publishedRevision: next.published?.revision ?? null, confirmed: policy.confirmed, businessVerified: policy.businessVerified, privacyVerified: policy.privacyVerified }),
      } });
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error && e.message === 'POLICY_CONFLICT' ? '다른 관리자가 먼저 변경했습니다. 새로고침 후 확인해 주세요.' : '저장하지 못했습니다. 입력 내용과 연결 상태를 확인해 주세요.' };
  }
  revalidatePath('/admin/merchant-review'); revalidatePath('/policy/shipping'); revalidatePath('/policy/terms');
  revalidatePath('/checkout'); revalidatePath('/products', 'layout');
  return { ok: true, revision: policy.revision, message: policy.confirmed ? '확인한 배송·반품 정책을 공개했습니다. 상품 상세와 주문서에도 동일하게 반영됩니다.' : hasPublishedPolicy ? '초안으로 저장했습니다. 고객 화면에는 기존 공개 정책이 그대로 유지됩니다.' : '초안으로 저장했습니다. 고객 화면에는 아직 공개하지 않았습니다.' };
}
