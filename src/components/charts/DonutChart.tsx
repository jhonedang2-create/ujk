'use client';

import { useState } from 'react';
import { SERIES, CHART, pct, makeFormatter, type ValueFormat } from './tokens';

export type Slice = { label: string; value: number };

/**
 * 도넛 (전체 대비 비중). 세그먼트 6개 이하에서만 사용합니다.
 * 세그먼트 사이는 2px 서피스 간격으로 분리 (테두리 X).
 * 접근성: 범례 + 직접 라벨 + 표보기 → 색만으로 구분하지 않습니다.
 */
export default function DonutChart({
  slices,
  size = 168,
  format = 'plain',
}: {
  slices: Slice[];
  size?: number;
  format?: ValueFormat;
}) {
  const valueFormat = makeFormatter(format);
  const [hover, setHover] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);

  if (total <= 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-gim-400">
        해당 기간에 데이터가 없습니다.
      </div>
    );
  }

  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const gap = 2; // 서피스 간격 (px)

  let acc = 0;
  const arcs = slices.map((s, i) => {
    const frac = s.value / total;
    const len = Math.max(0, frac * c - gap);
    const dash = `${len} ${c - len}`;
    const offset = -acc * c;
    acc += frac;
    return { ...s, dash, offset, frac, color: SERIES[i % SERIES.length] };
  });

  const top = arcs.reduce((a, b) => (b.value > a.value ? b : a), arcs[0]);

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label="결제수단 비중">
          <g transform={`translate(${size / 2},${size / 2}) rotate(-90)`}>
            <circle r={r} fill="none" stroke={CHART.grid} strokeWidth={18} />
            {arcs.map((a, i) => (
              <circle
                key={a.label}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={hover === i ? 22 : 18}
                strokeDasharray={a.dash}
                strokeDashoffset={a.offset}
                opacity={hover === null || hover === i ? 1 : 0.4}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ transition: 'stroke-width .15s, opacity .15s', cursor: 'default' }}
              />
            ))}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-gim-400">
            {hover === null ? '최다 비중' : arcs[hover].label}
          </span>
          <span className="text-xl font-bold text-gim-900">
            {hover === null ? `${pct(top.value, total)}%` : `${pct(arcs[hover].value, total)}%`}
          </span>
          <span className="text-[11px] text-gim-500">
            {hover === null ? top.label : valueFormat(arcs[hover].value)}
          </span>
        </div>
      </div>

      {/* 범례 = 직접 라벨 겸용 */}
      <ul className="min-w-[160px] flex-1 space-y-2.5">
        {arcs.map((a, i) => (
          <li
            key={a.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="flex items-center gap-2 text-sm"
          >
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.color }} />
            <span className="flex-1 text-gim-600">{a.label}</span>
            <span className="tabular-nums text-gim-400">{pct(a.value, total)}%</span>
            <span className="w-24 text-right font-semibold tabular-nums text-gim-900">
              {valueFormat(a.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
