/** Pure checkout validation shared with no-network tests. Review never writes an order. */
export function reviewInputError(fields: Record<string, string>): string | null {
  for (const key of ['ordererName', 'receiver']) {
    if ((fields[key] ?? '').trim().length < 2) return '주문자와 받는 분 이름을 확인해 주세요.';
  }
  for (const key of ['ordererPhone', 'recvPhone']) {
    const phone = (fields[key] ?? '').replace(/[^\d]/g, '');
    if (phone.length < 9 || phone.length > 13) return '연락처를 확인해 주세요.';
  }
  if (!/^\d{5}$/.test((fields.zipcode ?? '').trim())) return '5자리 우편번호를 입력해 주세요.';
  if ((fields.address1 ?? '').trim().length < 5) return '기본 배송주소를 입력해 주세요.';
  if (fields.agreeTerms !== 'yes' || fields.agreePrivacy !== 'yes') return '구매조건과 주문 개인정보 안내에 동의해 주세요.';
  return null;
}
