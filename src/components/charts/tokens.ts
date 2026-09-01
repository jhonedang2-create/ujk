/**
 * 차트 색상 토큰
 *
 * 카테고리 팔레트는 색각이상(CVD) 검증을 통과한 조합만 사용합니다.
 * 검증 결과 (surface #ffffff, all-pairs):
 *   Lightness band PASS / Chroma floor PASS
 *   CVD separation  worst ΔE 9.2 (기준 8 이상)
 *   Normal-vision   worst ΔE 24.0 (기준 15 이상)
 *   Contrast        aqua 2.82:1 → 직접 라벨 + 표보기로 보완 (relief rule)
 *
 * 슬롯 순서를 바꾸거나 4번째 색을 추가하지 마세요. 검증이 깨집니다.
 * 계열이 4개 이상이면 '기타'로 묶거나 차트를 나누세요.
 */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a'] as const;

export const CHART = {
  surface: '#ffffff',
  plane: '#f6f5f2',
  inkPrimary: '#231e19',
  inkSecondary: '#584d3d',
  inkMuted: '#9b8e74',
  grid: '#e9e6df',
  axis: '#d3cdc0',
  good: '#0ca30c',
  bad: '#d03b3b',
} as const;

/** 축 눈금을 깔끔한 수(1·2·5 × 10^n)로 올림 */
export function niceCeil(v: number) {
  if (v <= 0) return 10;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const n = v / base;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * base;
}

/** 축·범례용 축약 표기 (1,284 / 12.9만 / 4.2억) */
export function compact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 100_000_000) return `${(n / 100_000_000).toFixed(abs >= 1_000_000_000 ? 0 : 1)}억`;
  if (abs >= 10_000) return `${(n / 10_000).toFixed(abs >= 100_000 ? 0 : 1)}만`;
  return n.toLocaleString('ko-KR');
}

export function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

/** 서버 컴포넌트에서 함수를 prop 으로 넘길 수 없으므로 문자열로 지정합니다 */
export type ValueFormat = 'won' | 'plain' | 'count';

export function makeFormatter(f: ValueFormat = 'plain') {
  if (f === 'won') return (v: number) => `${(v ?? 0).toLocaleString('ko-KR')}원`;
  if (f === 'count') return (v: number) => `${(v ?? 0).toLocaleString('ko-KR')}건`;
  return (v: number) => (v ?? 0).toLocaleString('ko-KR');
}
