import PageHero from '@/components/PageHero';
import { SITE } from '@/lib/site';
import { getPrivacyDocuments } from '@/lib/privacy-document';
export const dynamic = 'force-dynamic';
export const metadata = { title: '개인정보처리방침', alternates: { canonical: '/policy/privacy' } };
export default async function PrivacyPage() {
  const { published } = await getPrivacyDocuments();
  if (published) return <><PageHero title="개인정보처리방침" breadcrumb={[["개인정보처리방침", '/policy/privacy']]} /><section className="container-x max-w-4xl py-16"><p className="mb-6 text-xs text-gim-500">시행일: {published.effectiveDate}</p><article className="whitespace-pre-wrap break-words text-sm leading-8 text-gim-700">{published.body}</article></section></>;
  // Do not silently publish an unverified new policy. Preserve the previous disclosure until approved.
  return <><PageHero title="개인정보처리방침" breadcrumb={[["개인정보처리방침", '/policy/privacy']]} /><section className="container-x max-w-4xl py-16"><div className="prose-kr text-sm">
    <p className="rounded-lg bg-amber-50 p-4 text-xs text-amber-800">※ 아래는 기본 문안입니다. 실제 수집 항목·위탁업체·보유기간을 반영하여 법무 검토 후 게시하시기 바랍니다.</p>
    <p>{SITE.name}(이하 회사)는 관련 법령에 따라 이용자의 개인정보를 다음과 같이 처리합니다.</p>
    <h3>1. 수집하는 개인정보 항목</h3><ul><li>회원가입: 이름, 이메일, 비밀번호, 휴대폰번호</li><li>소셜 로그인: 이름(닉네임), 이메일, 프로필 이미지</li><li>주문·배송: 주문자·수령인 이름, 연락처, 주소, 결제정보</li><li>자동 수집: 접속 IP, 쿠키, 접속일시, 운영체제, 브라우저·기기 종류, 서비스 이용 기록</li><li>유입 분석: 유입 사이트 도메인, UTM 소스·매체·캠페인, 최초 진입 경로</li></ul>
    <h3>2. 처리 목적</h3><p>회원 식별 및 관리, 물품 배송과 대금 결제·정산, 문의 응대와 공지, 부정 이용 방지·계정 보안·장애 대응, 구매지역·유입경로 통계와 서비스 개선, 별도 동의 시 이벤트 안내에 사용합니다.</p>
    <h3>3. 보유 및 이용기간</h3><p>목적 달성 시 파기하되 관계 법령에 따라 보존이 필요한 기록을 보관합니다.</p><ul><li>계약·청약철회 기록: 5년</li><li>대금결제 및 재화 공급 기록: 5년</li><li>소비자 불만·분쟁 기록: 3년</li><li>표시·광고 기록: 6개월</li><li>로그인 회원 접속환경 기록: 수집일로부터 90일</li></ul><p>유입통계는 자사몰 1차 쿠키를 이용하며 검색어 전문이나 다른 사이트 방문 이력 전체를 저장하지 않습니다.</p>
    <h3>4. 개인정보 제공</h3><p>원칙적으로 외부에 제공하지 않습니다. 배송 처리에는 택배사에 필요한 수령인 정보를, 결제 처리에는 실제 이용하는 결제 서비스에 필요한 거래정보를 전달합니다. 실제 위탁·제공 관계와 계약은 최종 게시본에서 확인해야 합니다.</p>
    <h3>5. 이용자의 권리</h3><p>개인정보 열람·정정·삭제·처리정지, 회원 탈퇴 및 동의 철회를 요청할 수 있습니다.</p>
    <h3>6. 개인정보보호책임자</h3><p>{SITE.privacyOfficer} · {SITE.tel} · {SITE.email}</p>
    <p className="mt-8 text-xs text-gim-400">변경 시 웹사이트를 통해 공지합니다.</p>
  </div></section></>;
}
