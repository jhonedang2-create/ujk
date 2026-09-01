import { SITE } from '@/lib/site';

/** 상담 가능 시간 (평일 09:00~18:00, 점심 12~13시 제외) */
export function isOfficeHours(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const day = weekday === 'Sun' ? 0 : weekday === 'Sat' ? 6 : 1;
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  if (day === 0 || day === 6) return false;
  if (h === 12) return false;
  return h >= 9 && h < 18;
}

export const QUICK_REPLIES = [
  '배송은 얼마나 걸리나요?',
  '선물세트 구성이 궁금해요',
  '대량구매 견적 문의',
  '주문 취소하고 싶어요',
  '김 보관법 알려주세요',
];

/**
 * 규칙 기반 자동응답.
 * 상담원이 붙기 전 1차 안내를 담당합니다. (AI 아님 — 키워드 매칭)
 * 답을 모르면 null 을 돌려주고 상담원 연결 안내로 넘깁니다.
 */
export function autoReply(text: string): string | null {
  const t = text.replace(/\s/g, '');

  if (/배송|언제와|도착|택배/.test(t))
    return `결제·입금 확인 후 주문 순서에 따라 출고됩니다.\n택배사와 지역 사정에 따라 배송 기간이 달라질 수 있습니다.\n3만원 이상 구매 시 기본 배송비는 무료입니다.`;

  if (/보관|유통기한|소비기한|눅눅/.test(t))
    return `직사광선을 피해 서늘하고 건조한 곳에 보관해 주세요.\n개봉 후에는 밀봉해 냉동 보관하시면 바삭함이 오래 유지됩니다.\n소비기한은 제품 포장에 표기된 날짜를 확인해 주세요.`;

  if (/대량|납품|도매|기업|단체|견적/i.test(t))
    return `대량구매·납품 문의 감사합니다.\n수량과 희망 납기를 알려주시면 담당자가 견적을 준비해 드립니다.\n급하시면 ${SITE.tel} 로 전화 주셔도 됩니다.`;

  if (/선물|세트|명절|추석|설날/.test(t))
    return `선물·답례용 구성은 제품 페이지에서 확인하실 수 있습니다.\n수량과 희망 납기를 알려주시면 대량 주문 가능 여부를 확인해 드립니다.`;

  if (/취소|환불|반품|교환/.test(t))
    return `주문 취소는 마이페이지 > 주문내역에서 '입금/결제 대기' 상태일 때 바로 가능합니다.\n이미 결제가 완료된 건은 상담원이 확인 후 처리해 드릴게요. 주문번호를 알려주시겠어요?`;

  if (/원산지|국산|중국산|어디/.test(t))
    return `현재 자사몰에 등록된 김 제품의 원산지는 국내산으로 안내되어 있습니다.\n정확한 원재료명과 함량은 각 상세페이지와 제품 포장 표시사항을 확인해 주세요.`;

  if (/가격|얼마|할인|쿠폰/.test(t))
    return `제품별 가격은 제품 페이지에서 확인하실 수 있습니다.\n회원가입 시 3,000원 적립금을 드리고, 구매 금액의 1%가 추가 적립됩니다.`;

  if (/안녕|하이|여보세요|계세|문의/.test(t)) return null; // 인사는 기본 인사말로 처리

  return null;
}

export function greeting() {
  return isOfficeHours()
    ? `안녕하세요! ${SITE.nameShort} 고객센터입니다. 😊\n무엇을 도와드릴까요? 아래 버튼을 누르거나 편하게 질문해 주세요.`
    : `안녕하세요! ${SITE.nameShort} 고객센터입니다.\n지금은 상담 시간이 아니에요. (${SITE.csHours})\n메시지를 남겨주시면 상담 시작과 함께 가장 먼저 답변드리겠습니다.`;
}

export function handoffMessage() {
  return isOfficeHours()
    ? '상담원에게 연결해 드릴게요. 잠시만 기다려 주세요. 🙂'
    : `지금은 상담 시간이 아니라 바로 답변이 어려워요.\n남겨주신 내용은 상담원이 확인 후 ${SITE.csHours} 중에 답변드리겠습니다.`;
}
