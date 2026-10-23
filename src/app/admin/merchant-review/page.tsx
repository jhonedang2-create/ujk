import Link from 'next/link';
import { requireOwner } from '@/auth';
import { getMerchantPolicies } from '@/lib/merchant-policy';
import { getPrivacyDocuments } from '@/lib/privacy-document';
import { EMPTY_MERCHANT_POLICY, policyMissing } from '@/lib/merchant-policy-rules';
import { SITE, SHIPPING } from '@/lib/site';
import { won } from '@/lib/utils';
import MerchantReviewForm from '@/components/admin/MerchantReviewForm';
import MerchantSubmissionPack from '@/components/admin/MerchantSubmissionPack';
import PrivacyDocumentEditor from '@/components/admin/PrivacyDocumentEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: '결제 심사 준비', robots: { index: false, follow: false } };
export default async function MerchantReviewPage() {
  await requireOwner();
  const [{ draft, published }, privacy] = await Promise.all([getMerchantPolicies(), getPrivacyDocuments()]);
  // Submission readiness uses published shipping terms and the latest internal review checks.
  const privacyVerified = draft.privacyVerified && !!privacy.published;
  const submissionPolicy = { ...(published ?? EMPTY_MERCHANT_POLICY), businessVerified: draft.businessVerified, privacyVerified };
  const checks = [
    ['운영 배송·반품 정책', !!published, published ? '고객 화면에는 마지막으로 공개한 정책이 표시됩니다.' : policyMissing(draft).join(', ') || '운영자 공개 확인 필요'],
    ['사업자등록증 대조', draft.businessVerified, '사업자등록증 사본은 메일로 별도 첨부'],
    ['개인정보처리방침 확정', privacyVerified, '검토한 본문을 저장·공개하고 확인 체크'],
  ] as const;
  return <div className="space-y-6">
    <div><p className="text-xs font-bold tracking-widest text-sea-700">MERCHANT REVIEW</p><h1 className="mt-2 text-2xl font-bold">카카오페이 독립몰 심사 준비</h1><p className="mt-2 text-sm leading-6 text-gim-500">자료 준비와 가맹점 승인·실결제 개통은 별개입니다. 이 화면에서는 결제·문자·메일 발송을 실행하지 않습니다.</p></div>
    <div className="grid gap-4 lg:grid-cols-3">{checks.map(([label, ok, hint]) => <section key={label} className="card p-5"><p className="text-sm font-bold">{label}</p><p className={'mt-3 font-bold ' + (ok ? 'text-sea-800' : 'text-amber-800')}>{ok ? '운영자 확인됨' : '확인 필요'}</p><p className="mt-2 text-xs leading-5 text-gim-500">{hint}</p></section>)}</div>
    <section className="card p-6"><h2 className="text-base font-bold">심사 제출 링크</h2><div className="mt-4 flex flex-wrap gap-3">{[['/', '사이트'], ['/products', '상품 목록'], ['/checkout', '주문서'], ['/policy/terms', '이용약관'], ['/policy/privacy', '개인정보처리방침'], ['/policy/shipping', '배송·반품 안내']].map(([href, label]) => <Link key={href} href={href} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">{label} ↗</Link>)}</div><p className="mt-4 text-xs leading-6 text-gim-500">새 비회원 창에서 상품을 장바구니에 담은 뒤 주문서를 확인하세요. 고객 개인정보와 관리자 계정은 심사자료에 포함하지 않습니다.</p></section>
    <section className="card p-6"><h2 className="text-base font-bold">사이트 표시 정보</h2><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{[['상호', SITE.name], ['대표자', SITE.ceo], ['사업자등록번호', SITE.bizNo], ['주소', SITE.address], ['연락처', SITE.tel], ['통신판매업', SITE.mailOrderNo]].map(([k, v]) => <div key={k}><dt className="text-xs text-gim-500">{k}</dt><dd className="mt-1 font-medium">{v}</dd></div>)}</dl><p className="mt-4 text-xs text-gim-500">현재 주문 배송비: {won(SHIPPING.fee)}, 상품금액 {won(SHIPPING.freeThreshold)} 이상 무료. 반품비 설정과 별개입니다.</p></section>
    <MerchantReviewForm key={draft.revision} policy={draft} published={published} />
    <PrivacyDocumentEditor key={privacy.draft?.revision ?? 'new'} draft={privacy.draft} published={privacy.published} />
    <MerchantSubmissionPack policy={submissionPolicy} site={{ name: SITE.name, ceo: SITE.ceo, bizNo: SITE.bizNo, address: SITE.address, tel: SITE.tel, email: SITE.email }} />
    <section className="card p-6"><h2 className="text-base font-bold">직접 결제 연동 상태</h2><p className="mt-3 text-sm leading-7 text-gim-600">이번 화면은 독립몰 심사자료 준비용입니다. 카카오페이 결제 준비·승인·조회·취소 API 전환과 가맹점 운영 CID 검증은 별도 단계이며, 준비되지 않은 결제를 완료로 표시하지 않습니다. 카카오 로그인 설정은 그대로 유지합니다.</p></section>
  </div>;
}
