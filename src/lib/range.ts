/**
 * 기간 계산 — Prisma 를 import 하지 않는 순수 모듈.
 * 클라이언트 컴포넌트(RangeFilter)에서도 안전하게 가져다 쓸 수 있습니다.
 * (analytics.ts 는 prisma 를 쓰므로 클라이언트에서 import 하면 안 됩니다)
 */

export type RangePreset = 'today' | '7d' | '30d' | '90d' | 'month' | 'year' | 'custom';

export const RANGE_LABEL: Record<RangePreset, string> = {
  today: '오늘',
  '7d': '최근 7일',
  '30d': '최근 30일',
  '90d': '최근 90일',
  month: '이번 달',
  year: '올해',
  custom: '직접 선택',
};

export type Range = {
  preset: RangePreset;
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  bucket: 'hour' | 'day' | 'week' | 'month';
  crossesYear: boolean;
  label: string;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmt(d: Date) {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** 프리셋(또는 직접 입력)을 실제 기간 + 비교 기간으로 변환 */
export function resolveRange(preset: string | undefined, from?: string, to?: string): Range {
  const p = (['today', '7d', '30d', '90d', 'month', 'year', 'custom'] as RangePreset[]).includes(
    preset as RangePreset
  )
    ? (preset as RangePreset)
    : '30d';

  const now = new Date();
  let start: Date;
  let end = endOfDay(now);

  if (p === 'custom' && from && to) {
    const f = new Date(from);
    const t = new Date(to);
    // 뒤집힌 입력도 안전하게 처리
    start = startOfDay(f <= t ? f : t);
    end = endOfDay(f <= t ? t : f);
  } else if (p === 'today') {
    start = startOfDay(now);
  } else if (p === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (p === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    const days = p === '7d' ? 7 : p === '90d' ? 90 : 30;
    start = startOfDay(addDays(now, -(days - 1)));
  }

  const spanMs = end.getTime() - start.getTime();
  const prevTo = new Date(start.getTime() - 1);
  const prevFrom = new Date(start.getTime() - 1 - spanMs);

  const days = Math.ceil(spanMs / 86_400_000);
  const bucket: Range['bucket'] =
    days <= 1 ? 'hour' : days <= 62 ? 'day' : days <= 400 ? 'week' : 'month';

  return {
    preset: p,
    from: start,
    to: end,
    prevFrom,
    prevTo,
    bucket,
    crossesYear: start.getFullYear() !== end.getFullYear(),
    label: p === 'custom' ? `${fmt(start)} ~ ${fmt(end)}` : RANGE_LABEL[p],
  };
}

export function bucketKey(d: Date, bucket: Range['bucket'], withYear = false) {
  if (bucket === 'hour') return `${String(d.getHours()).padStart(2, '0')}시`;
  if (bucket === 'month') return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;

  if (bucket === 'week') {
    const monday = new Date(d);
    const wd = (d.getDay() + 6) % 7; // 월=0
    monday.setDate(d.getDate() - wd);
    const md = `${String(monday.getMonth() + 1).padStart(2, '0')}.${String(monday.getDate()).padStart(2, '0')}~`;
    // 연도를 넘는 기간에서는 12월 말 주와 1월 초 주가 같은 키가 되지 않도록 연도를 붙입니다
    return withYear ? `${String(monday.getFullYear()).slice(2)}/${md}` : md;
  }

  const md = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  return withYear ? `${String(d.getFullYear()).slice(2)}/${md}` : md;
}

export function bucketLabel(bucket: Range['bucket']) {
  return bucket === 'hour' ? '시간별' : bucket === 'day' ? '일별' : bucket === 'week' ? '주별' : '월별';
}
