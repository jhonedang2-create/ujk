/**
 * 광고성 정보 전송 법규 준수 유틸 (정보통신망법 제50조)
 *
 * 이 파일의 규칙은 "지키면 좋은 것"이 아니라 법적 의무입니다.
 *   · 제50조제1항 : 사전 수신동의 없이 광고 전송 금지        → 과태료 3천만원 이하
 *   · 제50조제3항 : 21시~08시 광고 전송은 별도 동의 필요      → 과태료 3천만원 이하
 *   · 제50조제4항 : (광고) 표기 · 전송자 명칭/연락처 · 무료 수신거부 방법 명시
 *                                                          → 과태료 3천만원 이하
 *   · 제50조제8항 : 수신동의 여부 2년마다 확인               → 과태료 3천만원 이하
 *
 * Prisma 를 쓰지 않는 순수 모듈이라 클라이언트(미리보기 화면)에서도 그대로 씁니다.
 */

/** SMS 는 EUC-KR 기준 바이트로 셉니다 (한글 2, 영문·숫자 1) */
export function byteLength(text: string) {
  let n = 0;
  for (const ch of text) n += ch.charCodeAt(0) > 127 ? 2 : 1;
  return n;
}

export const SMS_LIMIT = 90;
export const LMS_LIMIT = 2000;

/** 바이트 수로 SMS / LMS 판별 */
export function messageTypeOf(text: string, hasImage = false): 'SMS' | 'LMS' | 'MMS' {
  if (hasImage) return 'MMS';
  return byteLength(text) <= SMS_LIMIT ? 'SMS' : 'LMS';
}

/** 한국시간 기준 현재 시각 (시) */
export function kstHour(d = new Date()) {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      hour12: false,
    }).format(d)
  );
}

/** 광고 전송 금지 시간대인가 (21:00 ~ 08:00, 한국시간) */
export function isNightTime(d = new Date()) {
  const h = kstHour(d);
  return h >= 21 || h < 8;
}

/** 오늘(또는 내일) 08:00 KST 로 예약 시각 만들기 */
export function nextAllowedTime(from = new Date()) {
  // KST 기준 날짜를 구한 뒤 08:00 로 맞춥니다
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(from);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const y = get('year');
  const m = get('month');
  const d = get('day');
  const h = Number(get('hour'));

  // 21시 이후면 다음 날 08시, 08시 이전이면 오늘 08시
  const base = new Date(`${y}-${m}-${d}T08:00:00+09:00`);
  if (h >= 21) base.setDate(base.getDate() + 1);
  return base;
}

/**
 * <input type="datetime-local"> 값("2026-08-26T09:00")을 한국시간으로 해석합니다.
 * 시간대 정보가 없는 값이라 그냥 new Date() 하면 브라우저/서버 로컬 시간으로 갈려서
 * 야간 광고 차단 판정이 서로 어긋납니다. 양쪽 모두 이 함수를 씁니다.
 */
export function parseKstLocal(v: string): Date | null {
  if (!v) return null;
  const withSec = v.length === 16 ? `${v}:00` : v;
  const d = new Date(`${withSec}+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type AdOptions = {
  prefix: string; // "(광고)"
  optOutText: string; // "무료수신거부 "
  optOutUrl: string; // 수신거부 링크 또는 번호
  senderName: string; // 전송자 명칭
  senderContact: string; // 전송자 연락처
};

/**
 * 광고 문구에 법정 표기를 붙입니다.
 * - 앞: (광고) — 변칙 표기 불가, 반드시 맨 앞
 * - 뒤: 전송자 명칭·연락처 + 무료 수신거부 방법
 * 이미 붙어 있으면 중복해서 붙이지 않습니다.
 */
export function decorateAd(body: string, o: AdOptions) {
  let text = body.trim();

  const prefix = o.prefix || '(광고)';
  if (!text.startsWith(prefix)) text = `${prefix}${text.startsWith(' ') ? '' : ' '}${text}`;

  const senderLine = `${o.senderName}${o.senderContact ? ` ${o.senderContact}` : ''}`;
  if (o.senderName && !text.includes(o.senderName)) {
    text += `\n${senderLine}`;
  }

  const optOut = `${o.optOutText || '무료수신거부 '}${o.optOutUrl}`;
  if (o.optOutUrl && !text.includes(o.optOutUrl)) {
    text += `\n${optOut}`;
  }

  return text;
}

export type ComplianceIssue = { level: 'error' | 'warn'; message: string };

/** 발송 직전 점검 — error 가 하나라도 있으면 보내면 안 됩니다 */
export function checkAdCompliance(text: string, o: AdOptions, at = new Date()): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];

  if (!text.trim().startsWith(o.prefix || '(광고)')) {
    issues.push({ level: 'error', message: '본문 맨 앞에 (광고) 표기가 없습니다.' });
  }
  if (/\(\s*광\s*[.,_/\-]\s*고\s*\)/.test(text)) {
    issues.push({
      level: 'error',
      message: '(광/고), (광.고) 같은 변칙 표기는 법적으로 인정되지 않습니다.',
    });
  }
  if (o.optOutUrl && !text.includes(o.optOutUrl)) {
    issues.push({ level: 'error', message: '무료 수신거부 방법이 본문에 없습니다.' });
  }
  if (!o.optOutUrl) {
    issues.push({
      level: 'error',
      message: '수신거부 링크(또는 번호)가 설정되지 않았습니다. 발송 설정에서 먼저 지정하세요.',
    });
  }
  if (o.senderName && !text.includes(o.senderName)) {
    issues.push({ level: 'error', message: '전송자 명칭이 본문에 없습니다.' });
  }
  if (isNightTime(at)) {
    issues.push({
      level: 'error',
      message: '지금은 광고 전송 금지 시간(21시~08시)입니다. 예약 발송으로 바꿔주세요.',
    });
  }
  if (byteLength(text) > LMS_LIMIT) {
    issues.push({
      level: 'error',
      message: `본문이 ${byteLength(text)}바이트로 LMS 한도(${LMS_LIMIT})를 넘었습니다.`,
    });
  }

  return issues;
}
