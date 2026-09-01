'use client';

import { useState } from 'react';
import { SERIES, makeFormatter, type ValueFormat } from './tokens';

export type BarRow = { label: string; value: number; sub?: string };

/**
 * 가로 막대 랭킹 (카테고리별 매출, 상품 TOP N).
 * 단일 계열이므로 모든 막대가 같은 색입니다.
 * (값이 클수록 진하게 = 길이를 색으로 이중 인코딩하는 안티패턴)
 */
export default function BarList({
  rows,
  format = 'plain',
  max: maxProp,
  showRank = false,
}: {
  rows: BarRow[];
  format?: ValueFormat;
  max?: number;
  showRank?: boolean;
}) {
  const valueFormat = makeFormatter(format);
  const [hover, setHover] = useState<number | null>(null);
  const max = maxProp ?? Math.max(1, ...rows.map((r) => r.value));

  if (rows.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-gim-400">
        해당 기간에 데이터가 없습니다.
      </div>
    );
  }

  return (
    <ul className="space-y-3.5">
      {rows.map((r, i) => {
        const w = Math.max(1.5, (r.value / max) * 100);
        return (
          <li
            key={r.label + i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="group"
          >
            <div className="mb-1.5 flex items-baseline gap-2">
              {showRank && (
                <span className="w-4 shrink-0 text-[11px] font-bold tabular-nums text-gim-300">
                  {i + 1}
                </span>
              )}
              <span className="line-clamp-1 flex-1 text-[13px] text-gim-800">{r.label}</span>
              {r.sub && <span className="shrink-0 text-[11px] text-gim-400">{r.sub}</span>}
              <span className="shrink-0 text-[13px] font-bold tabular-nums text-gim-900">
                {valueFormat(r.value)}
              </span>
            </div>
            {/* 막대: 높이 10px(≤24), 데이터 끝만 라운드 */}
            <div
              className="h-2.5 w-full overflow-hidden rounded-r-[4px] bg-gim-50"
              style={{ marginLeft: showRank ? 24 : 0, width: showRank ? 'calc(100% - 24px)' : '100%' }}
            >
              <div
                className="h-full rounded-r-[4px] transition-[width] duration-500"
                style={{
                  width: `${w}%`,
                  background: SERIES[0],
                  opacity: hover === null || hover === i ? 1 : 0.45,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
