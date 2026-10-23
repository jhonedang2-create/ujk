import { z } from 'zod';
export const PRIVACY_DRAFT_KEY = 'commerce.privacy-draft.v1';
export const PRIVACY_PUBLIC_KEY = 'commerce.privacy-published.v1';
// Bump when the built-in /policy/privacy fallback text changes.
export const BASE_PRIVACY_DOCUMENT_REVISION = 'built-in-2026-10-23';
export const privacyDocumentSchema = z.object({ revision: z.string().min(1).max(80), body: z.string().min(800).max(30000), effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
export type PrivacyDocument = z.infer<typeof privacyDocumentSchema>;
export function parsePrivacyDocument(raw?: string | null): PrivacyDocument | null { try { const p = privacyDocumentSchema.safeParse(JSON.parse(raw ?? 'null')); return p.success ? p.data : null; } catch { return null; } }
export function privacyPublicationError(body: string): string | null {
  if (/\[확인\s*필요[^\]]*\]|TODO|법무 검토 후 게시|기본 문안입니다/i.test(body)) return '확인 필요 항목을 실제 계약과 운영 내용으로 확정한 후 공개해 주세요.';
  for (const word of ['위탁', '국외', '보유', '파기', '권리', '책임자']) if (!body.includes(word)) return `개인정보 ${word} 관련 안내를 확인해 주세요.`;
  return null;
}
// Internal editable draft only. Unconfirmed contracts/countries/retention are not published.
export const PRIVACY_REVIEW_DRAFT = `(주)대천우정김 개인정보처리방침

1. 처리하는 개인정보와 목적
회원관리: 로그인 아이디, 이름 또는 닉네임, 이메일, 비밀번호의 해시값, 연락처 및 동의한 소셜 프로필 정보를 회원 식별과 계정 관리에 사용합니다. 소셜 로그인 제공 항목은 동의화면에 표시된 범위에 한정합니다.
주문·배송: 주문자와 수령인 이름, 연락처, 배송지, 선택 입력한 이메일, 상품·주문·결제 상태 및 거래 식별정보를 주문 처리, 배송, 결제 확인과 고객 응대에 사용합니다. 카드번호 전체나 카드 비밀번호를 쇼핑몰에 저장하지 않습니다.
고객문의: 문의 내용과 답변에 필요한 연락처를 상담 및 분쟁처리에 사용합니다.
보안·통계: 접속 IP, 접속 시각, 운영체제·브라우저·기기 정보, 쿠키, 유입 도메인·캠페인 식별정보, 주문 배송지역을 계정 보안, 장애 대응 및 자사몰 통계에 사용합니다.
광고성 안내는 별도 선택 동의를 받은 경우에만 발송하며 동의를 거부해도 구매할 수 있습니다.

2. 처리 근거와 보유기간
회원관리 정보는 회원 탈퇴 또는 목적 달성 시 파기하되 법령상 보존이 필요한 기록은 구분하여 보관합니다.
계약·청약철회 및 대금결제·재화 공급 기록은 5년, 소비자 불만·분쟁 기록은 3년, 표시·광고 기록은 6개월 보관합니다.
[확인 필요: 접속환경 기록, 상담 기록 및 쿠키별 실제 보유기간과 자동 삭제 동작을 확인해 기재]

3. 개인정보 처리위탁
서비스 제공에 필요한 업무를 위탁하는 경우 수탁자와 위탁업무를 공개하고 적정한 보호조치를 관리합니다.
[확인 필요: Cloudflare Inc.의 웹 호스팅·콘텐츠 전달·보안 처리, Supabase의 DB·저장소 운영에 대해 계약상 법인명·수탁업무를 기재]
[확인 필요: 실제 계약된 택배사명·배송 업무, 문자/알림톡을 활성화하는 경우 발송업체 법인명·발송 업무를 기재]

4. 제3자 제공
독립된 개인정보처리자에게 제공하는 경우 제공받는 자, 제공 목적, 항목, 보유기간, 동의 거부권과 불이익을 별도로 안내합니다. 배송 업무 위탁을 일률적으로 독립된 제3자 제공과 혼동하지 않습니다.
[확인 필요: 실제 활성화한 결제수단의 제공 관계와 법적 근거를 확인하여 수령인·목적·항목·보유기간을 기재. 사용하지 않는 포트원 등은 삭제]

5. 국외 이전
[확인 필요: Cloudflare·Supabase 등 계약과 설정을 확인해 실제 국외 처리 여부를 정리. 국외 이전이 있으면 항목, 국가, 시기·방법, 이전받는 자의 명칭·연락처, 목적·보유기간, 법적 근거, 거부 방법·절차·효과를 구체적으로 기재. DB 서울 리전만으로 다른 처리까지 국내에 한정된다고 단정하지 않음]

6. 파기 절차 및 방법
보유기간 경과 또는 목적 달성 후 불필요한 정보는 지체 없이 파기합니다. 법정 보존자료는 다른 정보와 구분하여 보관합니다. 전자파일은 복구가 어렵도록 삭제하고 출력물은 분쇄 등 안전한 방법으로 파기합니다.

7. 이용자의 권리
본인 또는 적법한 대리인은 열람, 정정·삭제, 처리정지, 동의 철회 및 회원 탈퇴를 요청할 수 있습니다. 요청은 마이페이지에서 제공되는 기능 또는 아래 책임자 연락처로 접수할 수 있습니다. 법령에 따라 제한되는 경우 사유를 안내합니다.

8. 쿠키 및 보안
로그인 유지, 장바구니, 자사몰 유입 통계에 쿠키를 사용할 수 있습니다. 브라우저 설정에서 쿠키를 삭제·차단할 수 있으며, 차단하면 로그인·장바구니 등 일부 기능이 제한될 수 있습니다. 접근권한 관리, 전송 암호화, 비밀번호 해시 등 보호조치를 적용합니다.

9. 개인정보보호책임자 및 문의
책임자: 홍충환
연락처: 041-936-1600 / hch8107@daum.net
사업자: (주)대천우정김, 충청남도 보령시 황골길 42 (남곡동)

10. 방침 변경
시행일 및 변경 내용을 사이트에 알리고, 법령에 따라 별도 동의가 필요한 변경은 해당 절차를 진행합니다.`;
