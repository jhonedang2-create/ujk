'use client';

import { SERIES, CHART } from './tokens';

/**
 * 지표 타일: 라벨 · 값 · (선택) 전기간 대비 증감 · (선택) 스파크라인
 * 큰 숫자는 비례폭 숫자(기본값)를 씁니다. tabular-nums 는 표 안에서만.
 */
export default function StatTile({
  label,
  value,
  delta,
  deltaLabel = '이전 기간 대비',
  upIsGood = true,
  spark,
  hero = false,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  upIsGood?: boolean;
  spark?: number[];
  hero?: boolean;
}) {
  const good = delta == null ? null : upIsGood ? delta >= 0 : delta <= 0;

  return (
    <div
      className={`rounded-2xl border border-gim-100 bg-white p-5 ${
        hero ? 'sm:p-7' : ''
      }`}
    >
      <p className="text-xs font-medium text-gim-500">{label}</p>
      <p
        className={`mt-2 font-bold tracking-tight text-gim-900 ${
          hero ? 'text-4xl sm:text-5xl' : 'text-2xl'
        }`}
      >
        {value}
      </p>

      {delta != null && (
        <p className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className="font-semibold"
            style={{ color: good ? CHART.good : CHART.bad }}
          >
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="text-gim-400">{deltaLabel}</span>
        </p>
      )}

      {spark && spark.length > 1 && <Spark values={spark} accent={hero} />}
    </div>
  );
}

function Spark({ values, accent }: { values: number[]; accent?: boolean }) {
  const w = 120;
  const h = 32;
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - ((v - min) / span) * (h - 4) - 2;
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');

  return (
    <svg width={w} height={h} className="mt-3 overflow-visible" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke={accent ? SERIES[0] : CHART.axis}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={x(values.length - 1)}
        cy={y(values[values.length - 1])}
        r={3.5}
        fill={SERIES[0]}
        stroke={CHART.surface}
        strokeWidth={2}
      />
    </svg>
  );
}
