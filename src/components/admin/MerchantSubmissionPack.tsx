'use client';

import { useState } from 'react';
import type { MerchantPolicy } from '@/lib/merchant-policy-rules';

type Site = { name: string; ceo: string; bizNo: string; address: string; tel: string; email: string };

export default function MerchantSubmissionPack({ policy, site }: { policy: MerchantPolicy; site: Site }) {
  const [tested, setTested] = useState(false);
  const [attached, setAttached] = useState(false);
  const [copied, setCopied] = useState(false);
  const ready = policy.confirmed && policy.businessVerified && policy.privacyVerified && tested && attached;
  const body = `안녕하세요, 담당자님.\n${site.name}입니다.\n\n카카오페이 독립몰 입점 심사 요청자료를 아래와 같이 전달드립니다.\n\n1. 사이트 URL\nhttps://woojeonggim.com\n\n2. 사업자등록증 사본\n${attached ? '첨부파일을 확인 부탁드립니다.' : '[사업자등록증 사본을 첨부한 뒤 이 항목을 확인해 주세요.]'}\n\n3. 사이트 로그인 계정\n${tested ? '비회원으로 상품 선택, 배송정보 입력 및 결제 직전 주문 확인이 가능합니다. 별도 심사용 로그인 계정은 필요하지 않습니다.' : '[운영 사이트에서 비회원 주문 흐름을 직접 확인한 후 기재해 주세요.]'}\n\n4. 구매 진행 화면\n${attached ? '상품 목록, 상품 상세, 장바구니, 주문자·배송지 입력, 최종 주문 확인 화면을 첨부했습니다.' : '[실제 운영주소의 구매 진행 화면을 캡처하여 첨부해 주세요.]'}\n\n5. 이용약관 및 구매 안내\n이용약관: https://woojeonggim.com/policy/terms\n배송·교환·반품·환불: https://woojeonggim.com/policy/shipping\n개인정보처리방침: https://woojeonggim.com/policy/privacy\n\n판매 품목은 조미김·재래김·도시락김·김 선물세트 등 실물 상품입니다.\n일회성 상품 구매에 카카오페이를 직접 연동할 예정이며, 유료 포인트 충전·정기결제·네이티브 앱 서비스는 운영하지 않습니다.\n카카오페이 운영 결제는 아직 개통 전이며, 심사 및 계약 안내에 따라 직접 연동과 결제·취소 검증을 진행하겠습니다.\n\n추가로 필요한 자료나 보완사항이 있으면 안내 부탁드립니다.\n감사합니다.\n\n${site.name}\n연락처: ${site.tel}\n이메일: ${site.email}`;
  const checklist = `대천우정김 카카오페이 심사자료 체크리스트\n\n현재 이 화면의 점검 상태\n- 운영정책: ${policy.confirmed ? '운영자 확인' : '미확정'}\n- 사업자등록증과 푸터 대조: ${policy.businessVerified ? '확인' : '미확인'}\n- 개인정보처리방침 검토: ${policy.privacyVerified ? '확인' : '미확인'}\n- 비회원 주문 실동작: ${tested ? '운영자 확인' : '미확인'}\n- 제출 첨부파일: ${attached ? '운영자 확인' : '미준비'}\n\n첨부파일\n01_사업자등록증.pdf 또는 이미지\n02_상품목록.png\n03_상품상세.png\n04_장바구니.png\n05_주문정보입력.png\n06_결제직전확인.png\n07_배송반품정책.png\n08_이용약관.png\n\nCI preview 캡처는 내부 검증자료입니다. 운영 배포 후 운영주소를 촬영해 제출해야 합니다.\n관리자 비밀번호·API 키·실제 고객정보는 제출자료에 넣지 마세요.\n등록증 첨부와 발송은 운영자가 직접 확인합니다.\n`;
  function download(text: string, name: string) {
    const url = URL.createObjectURL(new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="card space-y-5 p-6">
    <header><h2 className="text-lg font-bold">심사 회신자료 만들기</h2><p className="mt-2 text-sm leading-6 text-gim-500">확인되지 않은 내용을 완료로 작성하지 않습니다. 아래 버튼은 자료만 만들며 메일을 전송하지 않습니다.</p></header>
    <div className="space-y-3 rounded-xl bg-gim-50 p-5 text-sm">
      <label className="flex items-start gap-3"><input type="checkbox" checked={tested} onChange={(e) => setTested(e.target.checked)} className="mt-1" /><span>운영주소의 새 비회원 창에서 상품 선택 → 배송정보 입력 → 최종 주문 확인까지 직접 확인했습니다.</span></label>
      <label className="flex items-start gap-3"><input type="checkbox" checked={attached} onChange={(e) => setAttached(e.target.checked)} className="mt-1" /><span>사업자등록증 사본과 실제 운영화면 캡처를 회신 메일에 첨부할 준비가 됐습니다.</span></label>
    </div>
    <p role="status" className={'rounded-lg p-4 text-sm ' + (ready ? 'bg-sea-50 text-sea-800' : 'bg-amber-50 text-amber-900')}>{ready ? '운영자가 확인한 항목이 모두 체크되었습니다. 첨부파일을 확인한 후 회신하세요.' : '아직 미확인 항목이 있습니다. 다운로드 문안은 초안이며, 그대로 제출하지 마세요.'}</p>
    <label className="block text-sm font-semibold">회신 초안<textarea readOnly rows={18} value={body} className="input mt-3 font-normal leading-6" /></label>
    <div className="flex flex-wrap gap-3"><button type="button" className="btn-primary btn-sm" onClick={() => download(body, ready ? '대천우정김_카카오페이_심사회신.txt' : '미확정_카카오페이_회신초안.txt')}>회신 문안 TXT</button><button type="button" className="btn-outline btn-sm" onClick={() => download(checklist, '카카오페이_첨부체크리스트.txt')}>첨부 체크리스트</button><button type="button" className="btn-outline btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(body); setCopied(true); } catch { setCopied(false); } }}>{copied ? '복사됨' : '문안 복사'}</button></div>
  </section>;
}
