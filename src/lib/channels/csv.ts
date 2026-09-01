import type { NormalizedOrder } from './types';

/* ─────────────────────────────────────────────
 * CSV 파서 (따옴표·줄바꿈 포함 필드 처리)
 * ───────────────────────────────────────────── */

export function parseDelimited(text: string, delimiter?: string): string[][] {
  // 구분자 자동 감지 (첫 줄 기준)
  const first = text.slice(0, 4000).split(/\r?\n/)[0] ?? '';
  const d =
    delimiter ??
    (first.split('\t').length > first.split(',').length ? '\t' : ',');

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === d) {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\r') {
      // CRLF 의 CR 은 버립니다
    } else {
      field += ch;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** UTF-8(BOM 포함) / EUC-KR 자동 판별 디코딩 */
export function decodeSmart(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);

  // UTF-8 BOM
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }

  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  // U+FFFD 가 많으면 UTF-8 이 아님 → EUC-KR 로 재시도
  const bad = (utf8.match(/�/g) ?? []).length;
  if (bad > 3) {
    try {
      return new TextDecoder('euc-kr').decode(bytes);
    } catch {
      return utf8;
    }
  }
  return utf8;
}

/* ─────────────────────────────────────────────
 * 채널별 컬럼 매핑
 * ───────────────────────────────────────────── */

export type FieldKey =
  | 'channelOrderNo'
  | 'orderedAt'
  | 'status'
  | 'ordererName'
  | 'ordererPhone'
  | 'receiver'
  | 'recvPhone'
  | 'zipcode'
  | 'address1'
  | 'memo'
  | 'productName'
  | 'optionName'
  | 'quantity'
  | 'price'
  | 'lineTotal'
  | 'shippingFee'
  | 'externalProductId'
  | 'externalItemId'
  | 'externalSku';

export const FIELD_LABEL: Record<FieldKey, string> = {
  channelOrderNo: '주문번호 *',
  orderedAt: '주문일시',
  status: '주문상태',
  ordererName: '주문자명',
  ordererPhone: '주문자 연락처',
  receiver: '수취인명 *',
  recvPhone: '수취인 연락처',
  zipcode: '우편번호',
  address1: '주소 *',
  memo: '배송메모',
  productName: '상품명 *',
  optionName: '옵션',
  quantity: '수량 *',
  price: '단가 (1개 가격)',
  lineTotal: '판매금액 (수량 합계)',
  shippingFee: '배송비',
  externalProductId: '채널 상품번호',
  externalItemId: '채널 옵션번호',
  externalSku: '판매자 상품코드',
};

export const REQUIRED_FIELDS: FieldKey[] = [
  'channelOrderNo',
  'receiver',
  'address1',
  'productName',
  'quantity',
];

/** 단가 또는 판매금액 중 하나는 반드시 지정되어야 합니다 */
export const PRICE_FIELDS: FieldKey[] = ['price', 'lineTotal'];

/** 헤더 정규화 — 공백·괄호·특수문자 제거 후 비교 */
function norm(s: string) {
  return s.replace(/[\s()[\]{}·.\-_/]/g, '').toLowerCase();
}

/**
 * 채널별 헤더 별칭.
 * 마켓이 컬럼명을 바꿔도 여기에 한 줄 추가하면 바로 인식됩니다.
 */
const ALIASES: Record<FieldKey, string[]> = {
  channelOrderNo: ['주문번호', '주문번호1', '묶음배송번호', '주문아이디', 'orderid', '주문No', '결제번호'],
  orderedAt: ['주문일시', '주문일', '결제일', '결제일시', '주문접수일', '주문시간'],
  status: ['주문상태', '배송상태', '처리상태', '주문세부상태', '클레임상태'],
  ordererName: ['구매자명', '구매자', '주문자명', '주문자', '구매자이름'],
  ordererPhone: ['구매자연락처', '구매자전화번호', '주문자연락처', '구매자휴대폰', '주문자전화번호'],
  receiver: ['수취인명', '수취인이름', '수령인명', '수취인', '수령인', '받는분', '수하인명'],
  recvPhone: [
    '수취인연락처1', '수취인연락처', '수취인전화번호', '수령인연락처', '수령인휴대폰',
    '수취인휴대폰번호', '받는분연락처', '수하인전화번호',
  ],
  zipcode: ['우편번호', '수취인우편번호', '배송지우편번호'],
  address1: ['배송지', '주소', '수취인주소', '수령인주소', '배송주소', '통합배송지', '수하인주소'],
  memo: ['배송메세지', '배송메시지', '배송요청사항', '주문메모', '배송시요청사항', '요청사항'],
  productName: ['상품명', '등록상품명', '노출상품명', '주문상품명', '상품이름'],
  optionName: ['옵션정보', '등록옵션명', '옵션명', '옵션', '옵션정보상세', '구매옵션'],
  quantity: ['수량', '구매수', '구매수량', '주문수량', '상품수량'],
  // 1개 가격 (수량으로 나누면 안 됩니다)
  // ※ '정가'(할인 전 가격)·'옵션가격'(옵션 추가금)은 실제 판매가가 아니라 넣지 않습니다.
  //    넣으면 실제 결제금액 대신 정가로 매출이 잡혀 숫자가 부풀려집니다.
  price: ['단가', '판매단가', '상품가격', '상품단가'],
  // 수량이 곱해진 금액 (수량으로 나눠 단가를 구합니다)
  lineTotal: ['판매금액', '결제액', '상품별총주문금액', '실결제금액', '총판매금액', '주문금액', '총결제금액', '상품금액합계'],
  shippingFee: ['배송비', '배송비합계', '배송비금액', '택배비'],
  externalProductId: ['상품번호', '노출상품id', '노출상품ID', '원상품번호', '상품코드'],
  externalItemId: ['옵션id', '옵션ID', '단품번호', '옵션코드', 'vendoritemid'],
  externalSku: ['판매자상품코드', '업체상품코드', '자체상품코드', '판매자관리코드', 'sku', '셀러코드'],
};

const NORM_ALIASES: Record<FieldKey, string[]> = Object.fromEntries(
  Object.entries(ALIASES).map(([k, v]) => [k, v.map(norm)])
) as Record<FieldKey, string[]>;

/** 헤더 배열 → 필드 매핑 자동 추론 (인덱스, 없으면 -1) */
export function autoMap(headers: string[]): Record<FieldKey, number> {
  const normalized = headers.map(norm);
  const out = {} as Record<FieldKey, number>;

  for (const key of Object.keys(ALIASES) as FieldKey[]) {
    const aliases = NORM_ALIASES[key];
    // 1) 정확히 일치
    let idx = normalized.findIndex((h) => aliases.includes(h));
    // 2) 부분 일치 (예: '수취인연락처1' 안에 '수취인연락처')
    if (idx < 0) idx = normalized.findIndex((h) => h && aliases.some((a) => h.includes(a)));
    out[key] = idx;
  }
  return out;
}

/** 헤더로 어떤 마켓 파일인지 추정 */
export function guessChannel(headers: string[]): string | null {
  const h = headers.map(norm).join('|');
  if (h.includes('노출상품id') || h.includes('등록옵션명') || h.includes('묶음배송번호')) return 'COUPANG';
  if (h.includes('상품주문번호') || h.includes('수취인연락처1') || h.includes('배송메세지')) return 'SMARTSTORE';
  if (h.includes('주문순번') || h.includes('11번가')) return 'ELEVENST';
  if (h.includes('장바구니번호') || h.includes('수령인명')) return 'GMARKET';
  return null;
}

/* ─────────────────────────────────────────────
 * 행 → 주문 변환
 * ───────────────────────────────────────────── */

function toNumber(v: string) {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * 마켓 주문일시 문자열 → Date.
 * 마켓 파일의 시각은 항상 한국시간이므로 KST(+09:00) 로 못박아 해석합니다.
 * (서버가 UTC 로 도는 경우 그냥 new Date() 하면 9시간이 밀립니다)
 */
function toDate(v: string): Date {
  const raw = String(v ?? '').trim();
  if (!raw) return new Date();

  const m = raw.match(
    /(\d{4})\D?(\d{1,2})\D?(\d{1,2})(?:\D+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (!m) return new Date();

  const [, y, mo, d, h = '0', mi = '0', se = '0'] = m;
  const pad = (x: string) => x.padStart(2, '0');
  const iso = `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(se)}+09:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/** 마켓 상태 문자열 → 자사 상태 */
export function mapCsvStatus(v: string): string {
  const s = String(v ?? '');
  if (/취소|주문취소/.test(s)) return 'CANCELLED';
  if (/반품|환불|교환/.test(s)) return 'REFUNDED';
  if (/배송완료|구매확정/.test(s)) return 'DELIVERED';
  if (/배송중|배송지시|발송/.test(s)) return 'SHIPPING';
  if (/준비|상품준비/.test(s)) return 'PREPARING';
  if (/입금대기|결제대기/.test(s)) return 'PENDING';
  return 'PAID';
}

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
  map: Record<FieldKey, number>;
  guessedChannel: string | null;
};

export function parseOrderFile(text: string): ParsedCsv {
  const rows = parseDelimited(text);
  if (rows.length === 0) {
    return { headers: [], rows: [], map: autoMap([]), guessedChannel: null };
  }

  // 마켓 엑셀은 위에 안내문이 몇 줄 붙는 경우가 있어, 가장 컬럼이 많은 앞쪽 줄을 헤더로 봅니다
  let headerIdx = 0;
  let best = rows[0].filter((c) => c.trim()).length;
  for (let i = 1; i < Math.min(rows.length, 8); i++) {
    const n = rows[i].filter((c) => c.trim()).length;
    if (n > best) {
      best = n;
      headerIdx = i;
    }
  }

  const headers = rows[headerIdx].map((h) => h.trim());
  const body = rows.slice(headerIdx + 1);

  return {
    headers,
    rows: body,
    map: autoMap(headers),
    guessedChannel: guessChannel(headers),
  };
}

/**
 * 행들을 주문 단위로 묶어 정규화합니다.
 * 마켓 파일은 '상품 1줄 = 1행' 이므로 주문번호가 같은 행을 하나로 합칩니다.
 */
export function rowsToOrders(
  rows: string[][],
  map: Record<FieldKey, number>
): { orders: NormalizedOrder[]; errors: string[] } {
  const get = (row: string[], key: FieldKey) => {
    const i = map[key];
    return i >= 0 && i < row.length ? String(row[i] ?? '').trim() : '';
  };

  const byOrder = new Map<string, NormalizedOrder>();
  const errors: string[] = [];

  rows.forEach((row, ri) => {
    const orderNo = get(row, 'channelOrderNo');
    if (!orderNo) {
      errors.push(`${ri + 2}행: 주문번호가 비어 있어 건너뜁니다.`);
      return;
    }

    const qty = Math.max(1, toNumber(get(row, 'quantity')) || 1);

    // 단가 컬럼이 있으면 그대로, 없으면 판매금액을 수량으로 나눕니다.
    // (예전처럼 '나누어떨어지면 나눈다' 식으로 추측하면 진짜 단가가 반토막 납니다)
    const unit = toNumber(get(row, 'price'));
    const total = toNumber(get(row, 'lineTotal'));
    const price = unit > 0 ? unit : qty > 0 ? Math.round(total / qty) : total;

    const item = {
      externalProductId: get(row, 'externalProductId'),
      externalItemId: get(row, 'externalItemId'),
      externalSku: get(row, 'externalSku'),
      productName: get(row, 'productName') || '상품',
      optionName: get(row, 'optionName'),
      price,
      quantity: qty,
    };

    const existing = byOrder.get(orderNo);
    if (existing) {
      existing.items.push(item);
      existing.itemTotal += item.price * item.quantity;
      existing.totalAmount = existing.itemTotal + existing.shippingFee;
      return;
    }

    const shippingFee = toNumber(get(row, 'shippingFee'));
    const itemTotal = item.price * item.quantity;

    byOrder.set(orderNo, {
      channelOrderNo: orderNo,
      orderedAt: toDate(get(row, 'orderedAt')),
      status: mapCsvStatus(get(row, 'status')),
      ordererName: get(row, 'ordererName') || get(row, 'receiver') || '고객',
      ordererPhone: get(row, 'ordererPhone'),
      ordererEmail: '',
      receiver: get(row, 'receiver') || get(row, 'ordererName') || '수취인',
      recvPhone: get(row, 'recvPhone') || get(row, 'ordererPhone'),
      zipcode: get(row, 'zipcode'),
      address1: get(row, 'address1'),
      address2: '',
      memo: get(row, 'memo'),
      itemTotal,
      shippingFee,
      totalAmount: itemTotal + shippingFee,
      items: [item],
      raw: row,
    });
  });

  return { orders: [...byOrder.values()], errors };
}
