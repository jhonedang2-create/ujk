'use server';
import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/auth';
import { prisma } from '@/lib/prisma';
import { PRIVACY_DRAFT_KEY, PRIVACY_PUBLIC_KEY, parsePrivacyDocument, privacyDocumentSchema, privacyPublicationError } from '@/lib/privacy-document-rules';
export type PrivacyResult = { ok: boolean; message: string };
export async function savePrivacyDocument(_state: PrivacyResult, fd: FormData): Promise<PrivacyResult> {
  const session = await requireOwner();
  const publish = fd.get('publish') === 'on';
  const parsed = privacyDocumentSchema.safeParse({ revision: crypto.randomUUID(), body: String(fd.get('body') ?? '').trim(), effectiveDate: String(fd.get('effectiveDate') ?? '') });
  if (!parsed.success) return { ok: false, message: '시행일과 800자 이상의 처리방침을 입력해 주세요.' };
  if (publish) {
    const error = privacyPublicationError(parsed.data.body);
    if (error) return { ok: false, message: error };
    if (fd.get('acknowledge') !== 'on') return { ok: false, message: '실제 처리 내용과 계약을 확인한 뒤 공개 확인을 선택해 주세요.' };
  }
  try {
    await prisma.$transaction(async (tx) => {
      const previous = await tx.siteSetting.findUnique({ where: { key: PRIVACY_DRAFT_KEY } });
      if ((parsePrivacyDocument(previous?.value)?.revision ?? 'none') !== fd.get('expectedRevision')) throw new Error('CONFLICT');
      const value = JSON.stringify(parsed.data);
      if (previous) {
        const result = await tx.siteSetting.updateMany({ where: { key: PRIVACY_DRAFT_KEY, value: previous.value }, data: { value } });
        if (result.count !== 1) throw new Error('CONFLICT');
      } else await tx.siteSetting.create({ data: { key: PRIVACY_DRAFT_KEY, value } });
      if (publish) {
        const current = await tx.siteSetting.findUnique({ where: { key: PRIVACY_PUBLIC_KEY } });
        if (current) await tx.siteSetting.create({ data: { key: 'commerce.privacy-history.' + crypto.randomUUID(), value: current.value } });
        await tx.siteSetting.upsert({ where: { key: PRIVACY_PUBLIC_KEY }, update: { value }, create: { key: PRIVACY_PUBLIC_KEY, value } });
      }
      await tx.adminLog.create({ data: { userId: session.user.id ?? '', userName: session.user.name ?? '', action: publish ? 'PRIVACY_PUBLISH' : 'PRIVACY_DRAFT', target: parsed.data.revision, detail: JSON.stringify({ effectiveDate: parsed.data.effectiveDate }) } });
    });
  } catch (e) { return { ok: false, message: e instanceof Error && e.message === 'CONFLICT' ? '다른 관리자가 수정했습니다. 새로고침 후 다시 확인해 주세요.' : '저장에 실패했습니다. 기존 공개본은 변경하지 않았습니다.' }; }
  revalidatePath('/admin/merchant-review'); revalidatePath('/policy/privacy');
  return { ok: true, message: publish ? '검토한 개인정보처리방침을 공개했습니다.' : '내부 초안을 저장했습니다. 고객에게는 기존 공개본이 유지됩니다.' };
}
