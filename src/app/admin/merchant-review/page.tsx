import Link from 'next/link';
import { requireOwner } from '@/auth';
import { getMerchantPolicy } from '@/lib/merchant-policy';
import { policyMissing } from '@/lib/merchant-policy-rules';
import { SITE, SHIPPING } from '@/lib/site';
import { won } from '@/lib/utils';
import MerchantReviewForm from '@/components/admin/MerchantReviewForm';
import MerchantSubmissionPack from '@/components/admin/MerchantSubmissionPack';

export const dynamic = 'force-dynamic';
export const metadata = { title: '결제 심사 준비', robots: { index: false, follow: false } };

export default async function MerchantReviewPage() {
  await requireOwner();
  const policy = await getMerchantPolicy();
  const checks = [
    ['운영 배송·반품 정책', policy.confirmed, policyMissing(policy).join(', ') || '운영자 공개 확인 필요'],
    ['사업자등록증 대조', policy.businessVerified, '사업자등록증 사본은 메일로 별도 첨부'],
    ['개인정보처리방침 검토', policy.privacyVerified, '실제 수탁업체·국외 처리·보관기간 확인'],
  ] as const;
  return <div className="space-y-6">
    <div><p className="text-xs font-bold tracking-widest text-sea-700">MERCHANT REVIEW</p><h1 className="mt-2 text-2xl font-bold">카카오페이 독립몰 심사 준비</h1><p className="mt-2 text-sm leading-6 text-gim-500">자료 준비 상태와 가맹점 승인·결제 개통은 다릅니다. 이 화면에서는 결제나 문자를 실행하지 않습니다.</p></div>
    <div className="grid gap-4 lg:grid-cols-3">{checks.map(([label, ok, hint]) => <section key={label} className="card p-5"><p className="text-sm font-bold">{label}</p><p className={'mt-3 font-bold ' + (ok ? 'text-sea-800' : 'text-amber-800')}>{ok ? '운영자 확인됨' : '확인 필요'}</p><p className="mt-2 text-xs leading-5 text-gim-500">{hint}</p></section>)}</div>
    <section className="card p-6"><h2 className="text-base font-bold">심사 제출 링크</h2><div className="mt-4 flex flex-wrap gap-3">{[['/', '사이트'], ['/products', '상품 목록'], ['/checkout', '주문서'], ['/policy/terms', '이용약관'], ['/policy/privacy', '개인정보처리방침'], ['/policy/shipping', '배송·반품 안내']].map(([href, label]) => <Link key={href} href={href} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">{label} ↗</Link>)}</div><p className="mt-4 text-xs leading-6 text-gim-500">주문서 확인은 비로그인 새 창에서 상품을 장바구니에 담은 뒤 진행하세요. 비회원 주문이 가능하면 심사용 관리자 계정을 제공할 필요가 없습니다. 실제 결제 또는 주문 생성은 이번 자료 캡처에 필요하지 않습니다.</p></section>
    <section className="card p-6"><h2 className="text-base font-bold">사이트 표시 정보</h2><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{[['상호', SITE.name], ['대표자', SITE.ceo], ['사업자등록번호', SITE.bizNo], ['주소', SITE.address], ['연락처', SITE.tel], ['통신판매업', SITE.mailOrderNo]].map(([k, v]) => <div key={k}><dt className="text-xs text-gim-500">{k}</dt><dd className="mt-1 font-medium">{v}</dd></div>)}</dl><p className="mt-4 text-xs text-gim-500">현재 주문서 배송비: {won(SHIPPING.fee)}, 상품금액 {won(SHIPPING.freeThreshold)} 이상 무료. 아래 반품비 설정은 주문 배송비를 변경하지 않습니다.</p></section>
    <MerchantReviewForm key={policy.revision} policy={policy} />
    <MerchantSubmissionPack policy={policy} site={{ name: SITE.name, ceo: SITE.ceo, bizNo: SITE.bizNo, address: SITE.address, tel: SITE.tel, email: SITE.email }} />
    <section className="card p-6"><h2 className="text-base font-bold">첨부 및 검증 체크</h2><ol className="mt-4 list-inside list-decimal space-y-2 text-sm leading-7 text-gim-600"><li>사업자등록증 사본: 담당자가 별도 첨부하고 개인정보는 불필요하게 공개하지 않습니다.</li><li>상품 목록·상세·주문자 및 배송지·최종 주문 확인 화면을 실제 운영 주소에서 캡처합니다.</li><li>배송·반품 정책을 확정한 뒤 이용약관과 함께 캡처합니다.</li><li>비회원 주문 진입, 모바일 레이아웃, 주소 검색을 실제로 검증합니다.</li><li>이 쇼핑몰은 실물 김 상품의 단건 주문입니다. 유료 포인트 충전·정기결제·네이티브 앱 기능이 없습니다.</li></ol><p className="mt-4 rounded-lg bg-amber-50 p-4 text-xs leading-6 text-amber-900">현재 카카오페이 직접 결제 전환·승인 테스트는 별도 작업입니다. 키 존재만으로 연동 완료 또는 가맹점 승인으로 표시하지 않습니다. 심사 담당자에게 실제 결제 준비 상태를 그대로 안내하세요.</p></section>
  </div>;
}
