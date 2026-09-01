'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { SERIES, CHART, niceCeil, compact, makeFormatter, type ValueFormat } from './tokens';

export type Series = { name: string; values: number[] };

/**
 * 면적 + 선 차트 (기간별 추이).
 * - 선 2px / 끝점 마커 r=4 + 2px 서피스 링
 * - 면적은 계열 색 10% 워시
 * - 가로 크로스헤어 + 툴팁 (호버·키보드 모두 지원)
 * - 계열 2개일 때만 범례 (1개면 제목이 곧 범례)
 */
export default function AreaChart({
  labels,
  series,
  height = 260,
  format = 'plain',
}: {
  labels: string[];
  series: Series[];
  height?: number;
  format?: ValueFormat;
}) {
  const valueFormat = makeFormatter(format);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, ''); // React19 는 «r0» 형태라 영숫자만 남깁니다
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { t: 16, r: 20, b: 30, l: 56 };
  const plotW = Math.max(40, w - pad.l - pad.r);
  const plotH = height - pad.t - pad.b;

  const max = useMemo(() => {
    const m = Math.max(1, ...series.flatMap((s) => s.values));
    return niceCeil(m * 1.12);
  }, [series]);

  const n = labels.length;
  const x = (i: number) => (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => plotH - (v / max) * plotH;

  // 값이 작으면 반올림 결과가 겹칠 수 있어(예: max=2 → 0,1,1,2,2) 중복을 제거합니다.
  const ticks = Array.from(
    new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f)))
  ).sort((a, b) => a - b);

  // x축 라벨은 최대 7개만 (겹침 방지)
  const labelStep = Math.max(1, Math.ceil(n / 7));

  if (n === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-gim-400">
        해당 기간에 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      {series.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-4">
          {series.map((s, si) => (
            <span key={s.name} className="flex items-center gap-1.5 text-xs text-gim-600">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: SERIES[si % SERIES.length] }}
              />
              {s.name}
            </span>
          ))}
        </div>
      )}

      <svg
        width={w}
        height={height}
        role="img"
        aria-label={`${series.map((s) => s.name).join(', ')} 추이 차트`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mx = e.clientX - rect.left - pad.l;
          const i = n <= 1 ? 0 : Math.round((mx / plotW) * (n - 1));
          setHover(Math.min(n - 1, Math.max(0, i)));
        }}
        className="touch-none"
      >
        <defs>
          {series.map((_, si) => (
            <linearGradient key={si} id={`ac-${uid}-${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES[si % SERIES.length]} stopOpacity="0.16" />
              <stop offset="100%" stopColor={SERIES[si % SERIES.length]} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        <g transform={`translate(${pad.l},${pad.t})`}>
          {/* 그리드 + y축 눈금 */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={0} y1={y(t)} x2={plotW} y2={y(t)} stroke={CHART.grid} strokeWidth={1} />
              <text
                x={-10}
                y={y(t) + 4}
                textAnchor="end"
                fontSize={11}
                fill={CHART.inkMuted}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {compact(t)}
              </text>
            </g>
          ))}

          {/* 계열 */}
          {series.map((s, si) => {
            const color = SERIES[si % SERIES.length];
            const line = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
            const area = `${line} L${x(n - 1)},${plotH} L${x(0)},${plotH} Z`;
            const lastI = n - 1;
            return (
              <g key={s.name}>
                <path d={area} fill={`url(#ac-${uid}-${si})`} />
                <path
                  d={line}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* 끝점만 마커 — 모든 점에 숫자를 찍지 않습니다 */}
                <circle
                  cx={x(lastI)}
                  cy={y(s.values[lastI])}
                  r={4}
                  fill={color}
                  stroke={CHART.surface}
                  strokeWidth={2}
                />
              </g>
            );
          })}

          {/* 크로스헤어 */}
          {hover !== null && (
            <g pointerEvents="none">
              <line
                x1={x(hover)}
                y1={0}
                x2={x(hover)}
                y2={plotH}
                stroke={CHART.axis}
                strokeWidth={1}
              />
              {series.map((s, si) => (
                <circle
                  key={s.name}
                  cx={x(hover)}
                  cy={y(s.values[hover])}
                  r={4}
                  fill={SERIES[si % SERIES.length]}
                  stroke={CHART.surface}
                  strokeWidth={2}
                />
              ))}
            </g>
          )}

          {/* 기준선 */}
          <line x1={0} y1={plotH} x2={plotW} y2={plotH} stroke={CHART.axis} strokeWidth={1} />

          {/* x축 라벨 */}
          {labels.map((l, i) =>
            i % labelStep === 0 || i === n - 1 ? (
              <text
                key={i}
                x={x(i)}
                y={plotH + 18}
                textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                fontSize={11}
                fill={CHART.inkMuted}
              >
                {l}
              </text>
            ) : null
          )}
        </g>
      </svg>

      {/* 툴팁 */}
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 min-w-[132px] rounded-lg border border-gim-200 bg-white px-3 py-2 shadow-lg"
          style={{
            left: Math.min(Math.max(pad.l + x(hover) - 66, 0), Math.max(0, w - 150)),
            top: 0,
          }}
        >
          <p className="text-[11px] font-medium text-gim-500">{labels[hover]}</p>
          {series.map((s, si) => (
            <p key={s.name} className="mt-1 flex items-center gap-1.5 text-xs">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: SERIES[si % SERIES.length] }}
              />
              <span className="text-gim-500">{s.name}</span>
              <strong className="ml-auto tabular-nums text-gim-900">
                {valueFormat(s.values[hover])}
              </strong>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
