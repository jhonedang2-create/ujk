import PageHero from '@/components/PageHero';
import { SITE } from '@/lib/site';

export const metadata = { title: '개인정보처리방침' };

export default function PrivacyPage() {
  return (
    <>
      <PageHero title="개인정보처리방침" breadcrumb={[['개인정보처리방침', '/policy/privacy']]} />
      <section className="container-x max-w-4xl py-16">
        <div className="prose-kr text-sm">
          <p className="rounded-lg bg-amber-50 p-4 text-xs text-amber-800">
            ※ 아래는 기본 문안입니다. 실제 수집 항목·위탁업체·보유기간을 반영하여
            법무 검토 후 게시하시기 바랍니다.
          </p>

          <p>
            {SITE.name}(이하 &lsquo;회사&rsquo;)은 「개인정보 보호법」 등 관련 법령을 준수하며,
            이용자의 개인정보를 다음과 같이 처리합니다.
          </p>

          <h3>1. 수집하는 개인정보 항목</h3>
          <ul>
            <li>회원가입 : 이름, 이메일, 비밀번호, 휴대폰번호</li>
            <li>소셜 로그인(네이버·카카오) : 이름(닉네임), 이메일, 프로필 이미지</li>
            <li>주문·배송 : 주문자·수령인 이름, 연락처, 주소, 결제정보</li>
            <li>자동 수집 : 접속 IP, 쿠키, 서비스 이용 기록</li>
          </ul>

          <h3>2. 개인정보의 수집·이용 목적</h3>
          <ul>
            <li>회원 식별 및 관리, 서비스 제공</li>
            <li>물품 배송, 대금 결제 및 정산</li>
            <li>고객 문의 응대, 공지사항 전달</li>
            <li>(동의 시) 신규 서비스·이벤트 정보 안내</li>
          </ul>

          <h3>3. 개인정보의 보유 및 이용기간</h3>
          <p>
            원칙적으로 수집·이용 목적 달성 시 지체 없이 파기합니다. 다만 관계 법령에 따라
            다음 정보는 명시된 기간 동안 보관합니다.
          </p>
          <ul>
            <li>계약 또는 청약철회 등에 관한 기록 : 5년</li>
            <li>대금결제 및 재화 등의 공급에 관한 기록 : 5년</li>
            <li>소비자의 불만 또는 분쟁처리에 관한 기록 : 3년</li>
            <li>표시·광고에 관한 기록 : 6개월</li>
          </ul>

          <h3>4. 개인정보의 제3자 제공</h3>
          <p>
            회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 배송을 위해
            택배사에 수령인 정보(이름, 연락처, 주소)를 제공하며, 결제 처리를 위해
            결제대행사(토스페이먼츠·포트원)에 결제 정보를 제공합니다.
          </p>

          <h3>5. 이용자의 권리</h3>
          <p>
            이용자는 언제든지 개인정보 열람·정정·삭제·처리정지를 요구할 수 있으며,
            회원 탈퇴를 통해 개인정보 수집·이용 동의를 철회할 수 있습니다.
          </p>

          <h3>6. 개인정보보호책임자</h3>
          <ul>
            <li>책임자 : {SITE.privacyOfficer}</li>
            <li>연락처 : {SITE.tel} / {SITE.email}</li>
          </ul>

          <p className="mt-8 text-xs text-gim-400">
            본 방침은 게시일로부터 적용되며, 변경 시 웹사이트를 통해 공지합니다.
          </p>
        </div>
      </section>
    </>
  );
}
