'use client';
import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { savePrivacyDocument } from '@/actions/privacy-document';
import { PRIVACY_REVIEW_DRAFT, type PrivacyDocument } from '@/lib/privacy-document-rules';
export default function PrivacyDocumentEditor({ draft, published }: { draft: PrivacyDocument | null; published: PrivacyDocument | null }) {
  const [state, action, pending] = useActionState(savePrivacyDocument, { ok: false, message: '' });
  const router = useRouter();
  useEffect(() => { if (state.ok) router.refresh(); }, [state, router]);
  return <form action={action} className="card space-y-5 p-6">
    <input type="hidden" name="expectedRevision" value={draft?.revision ?? 'none'} />
    <header><h2 className="text-lg font-bold">개인정보처리방침 검토·게시</h2><p className="mt-2 text-sm leading-6 text-gim-500">수탁업체·결제사·국외 처리·보유기간은 실제 계약과 설정을 확인해야 합니다. 미확정 항목이 남으면 공개를 차단합니다. 텍스트만 허용하며 HTML은 실행하지 않습니다.</p></header>
    <p className="text-xs text-gim-500">{published ? `운영자 게시본: ${published.effectiveDate}` : '아직 이 편집기에서 확정·게시한 방침이 없습니다. 기존 페이지 문안은 별도 검토가 필요합니다.'}</p>
    <label className="block text-sm font-semibold">시행일<input type="date" required name="effectiveDate" className="input mt-2 max-w-xs" defaultValue={draft?.effectiveDate ?? '2026-10-23'} /></label>
    <label className="block text-sm font-semibold">처리방침 본문<textarea name="body" minLength={800} maxLength={30000} rows={20} required defaultValue={draft?.body ?? published?.body ?? PRIVACY_REVIEW_DRAFT} className="input mt-3 font-normal leading-7" /></label>
    <div className="space-y-3 text-sm"><label className="flex items-start gap-3"><input type="checkbox" name="publish" className="mt-1" /><span>저장한 본문을 고객용 개인정보처리방침으로 공개합니다. 체크하지 않으면 내부 초안만 저장합니다.</span></label><label className="flex items-start gap-3"><input type="checkbox" name="acknowledge" className="mt-1" /><span>실제 수집·제공·위탁·국외 처리 내역과 보유기간을 확인했고 필요한 고지·동의 절차를 검토했습니다.</span></label></div>
    {state.message && <p role="status" className={'rounded-lg p-4 text-sm ' + (state.ok ? 'bg-sea-50 text-sea-800' : 'bg-red-50 text-red-800')}>{state.message}</p>}
    <button disabled={pending} className="btn-primary btn-sm">{pending ? '저장 중…' : '방침 저장'}</button>
  </form>;
}
