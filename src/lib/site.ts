/**
 * 회사 기본 정보 — 우체국쇼핑 판매자 정보와 기존 자사몰 고지를 기준으로 정리했습니다.
 * 계좌·배송 정책·인증 문구는 운영자가 계약/증빙과 대조한 뒤 공개하세요.
 */
export const SITE = {
  name: '(주)대천우정김',
  nameShort: '대천우정김',
  nameEn: 'DAECHEON UJUNG GIM Co., Ltd.',
  tagline: '보령에서 만드는 대천우정김',
  description:
    '충청남도 보령시에 위치한 (주)대천우정김의 자사몰입니다. 조미구이재래김·도시락김·식탁김·파래김을 직접 둘러보고 주문할 수 있습니다.',

  address: '충청남도 보령시 황골길 42 (남곡동)',
  addressEn: '42, Hwanggol-gil, Boryeong-si, Chungcheongnam-do, Republic of Korea',
  zipcode: '33491',

  tel: '041-936-1600',
  fax: '041-932-3441',
  email: 'hch8107@daum.net',
  ceo: '홍충환',
  bizNo: '313-81-27786',
  mailOrderNo: '제2014-충남보령-0683호',
  privacyOfficer: '홍충환',

  csHours: '평일 09:00 ~ 18:00 (점심 12:00~13:00 / 주말·공휴일 휴무)',

  // 배포 전 지도 사업자 콘솔에서 핀 위치를 최종 확인하세요.
  map: { lat: 36.3339, lng: 126.6127 },

  bank: {
    name: process.env.BANK_NAME ?? '농협은행',
    account: process.env.BANK_ACCOUNT ?? '',
    holder: process.env.BANK_HOLDER ?? '(주)대천우정김',
  },

  sns: {
    instagram: '',
    blog: '',
    youtube: '',
    smartstore: '',
  },
} as const;

/** 배송 정책 */
export const SHIPPING = {
  fee: 3500,
  freeThreshold: 30000, // 기존 자사몰 배송 정책 기준
  islandExtra: 4000,    // 도서산간 추가
  courier: '대한통운',
  guide: '결제·입금 확인 후 순차 출고됩니다. 도서산간은 추가 배송비가 발생할 수 있습니다.',
} as const;

export function calcShippingFee(itemTotal: number) {
  if (itemTotal <= 0) return 0;
  return itemTotal >= SHIPPING.freeThreshold ? 0 : SHIPPING.fee;
}

export const ORDER_STATUS: Record<string, string> = {
  PENDING: '입금/결제 대기',
  PAID: '결제완료',
  PREPARING: '상품준비중',
  SHIPPING: '배송중',
  DELIVERED: '배송완료',
  CANCELLED: '주문취소',
  REFUNDED: '환불완료',
};

export const PAY_METHOD: Record<string, string> = {
  BANK: '무통장입금',
  TOSS: '토스페이먼츠(카드/간편결제)',
  PORTONE: '포트원(카카오페이·네이버페이 등)',
  EXTERNAL: '외부 채널 결제',
};

/** 판매 채널 코드 → 표시 이름 (DB Channel 이 우선, 여기는 폴백) */
export const CHANNEL_LABEL: Record<string, string> = {
  SELF: '자사몰',
  SMARTSTORE: '스마트스토어',
  COUPANG: '쿠팡',
  ELEVENST: '11번가',
  GMARKET: 'G마켓',
  AUCTION: '옥션',
  OFFLINE: '오프라인·납품',
  ETC: '기타',
};

export const INQUIRY_TYPE: Record<string, string> = {
  GENERAL: '일반문의',
  ORDER: '주문/배송',
  BULK: '대량구매/납품',
  PARTNER: '제휴/입점',
};

export const USER_GRADE: Record<string, string> = {
  BASIC: '일반',
  SILVER: '실버',
  GOLD: '골드',
  VIP: 'VIP',
};
