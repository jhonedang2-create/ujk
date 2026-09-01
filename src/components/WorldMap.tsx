'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { LAND, MAP_COLS, MAP_ROWS } from './WorldMapData';
import { cn } from '@/lib/utils';

export type MapPoint = {
  code: string;
  name: string;
  nameEn?: string;
  x: number; // 0~100
  y: number; // 0~100
  since?: string;
  channel?: string;
  home?: boolean; // 본사(한국)
};

/**
 * 입체 도트 세계지도.
 *
 * 외부 지도 라이브러리·타일 이미지 없이 CSS 3D 변환 + SVG 로만 그립니다.
 * - 바닥면(육지 도트 + 항로)을 X축으로 눕혀 원근을 줍니다
 * - 마커는 바닥에서 수직으로 서는 기둥(pillar)으로, 역회전시켜 화면을 향하게 합니다
 * - 애니메이션을 끈 사용자(prefers-reduced-motion)에게는 평면으로 보여줍니다
 */
export default function WorldMap({
  points,
  height = 420,
  flat = false,
  tone = 'light',
}: {
  points: MapPoint[];
  height?: number;
  /** 관리자 미리보기처럼 좁은 자리에서는 평면이 보기 편합니다 */
  flat?: boolean;
  /** 배경이 어두운 섹션에서는 'dark' */
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  const [active, setActive] = useState<MapPoint | null>(null);
  const [is3d, setIs3d] = useState(!flat);
  const [mounted, setMounted] = useState(false);
  const [reduce, setReduce] = useState(false);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const r = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setReduce(r);
      if (r) setIs3d(false);
    }
  }, []);

  const W = 1200;
  const H = (W / MAP_COLS) * MAP_ROWS * 1.02;
  const step = W / MAP_COLS;
  const r = step * 0.28;

  const px = (p: MapPoint) => (p.x / 100) * W;
  const py = (p: MapPoint) => (p.y / 100) * H;

  const home = useMemo(() => points.find((p) => p.home), [points]);
  const others = useMemo(() => points.filter((p) => !p.home), [points]);

  // 바닥면을 눕히면 위아래로 눌려 보이므로 입체일 때 여유를 조금 더 줍니다
  const tilt = 54;
  const sceneHeight = is3d ? Math.round(height * 1.08) : height;

  return (
    <div className="relative w-full select-none" style={{ minHeight: sceneHeight }}>
      {/* 평면/입체 전환 */}
      <button
        type="button"
        onClick={() => setIs3d((v) => !v)}
        className="absolute right-0 top-0 z-20 rounded-lg border border-current/20 px-3 py-1.5 text-[11px] font-semibold opacity-60 transition hover:opacity-100"
      >
        {is3d ? '평면으로 보기' : '입체로 보기'}
      </button>

      <div
        className="relative w-full"
        style={{
          height: sceneHeight,
          perspective: is3d ? '1100px' : undefined,
          perspectiveOrigin: '50% 30%',
        }}
      >
        {/* ── 바닥면 ── */}
        <div
          className="absolute inset-x-0 top-1/2 origin-center transition-transform duration-700 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: is3d
              ? `translateY(-50%) rotateX(${tilt}deg) rotateZ(-7deg) scale(1.18)`
              : 'translateY(-50%)',
          }}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full overflow-visible"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="수출 국가 지도"
          >
            <defs>
              <radialGradient id={`wm-sea-${uid}`} cx="50%" cy="45%" r="70%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.10" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
              <filter id={`wm-soft-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>

            {/* 바다 — 은은한 원형 그라디언트로 구면 느낌 */}
            <ellipse
              cx={W / 2}
              cy={H / 2}
              rx={W * 0.52}
              ry={H * 0.62}
              fill={`url(#wm-sea-${uid})`}
              className={dark ? 'text-sea-300' : 'text-sea-400'}
            />

            {/* 육지 도트 — 아래쪽에 그림자를 한 겹 깔아 두께를 줍니다 */}
            {is3d && (
              <g fill="currentColor" className={dark ? 'text-black/40' : 'text-sea-950/20'}>
                {LAND.map((row, ri) =>
                  row.split('').map((c, ci) =>
                    c === '1' ? (
                      <circle
                        key={`s-${ri}-${ci}`}
                        cx={ci * step + step / 2 + 1.5}
                        cy={ri * step + step / 2 + 2.5}
                        r={r}
                      />
                    ) : null
                  )
                )}
              </g>
            )}

            <g fill="currentColor" className={dark ? 'text-sea-200/45' : 'text-sea-700/40'}>
              {LAND.map((row, ri) =>
                row.split('').map((c, ci) =>
                  c === '1' ? (
                    <circle
                      key={`${ri}-${ci}`}
                      cx={ci * step + step / 2}
                      cy={ri * step + step / 2}
                      r={r}
                    />
                  ) : null
                )
              )}
            </g>

            {/* 항로 — 바닥면에 그려 '지나가는 길'로 읽히게 합니다 */}
            {home && (
              <g>
                {others.map((p) => {
                  const x1 = px(home);
                  const y1 = py(home);
                  const x2 = px(p);
                  const y2 = py(p);
                  const mx = (x1 + x2) / 2;
                  const my = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.14 - 14;
                  const dim = active && active.code !== p.code;
                  return (
                    <path
                      key={`l-${p.code}`}
                      d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
                      fill="none"
                      stroke="currentColor"
                      className={dark ? 'text-sea-300' : 'text-sea-400'}
                      strokeWidth={dim ? 1.2 : 2}
                      strokeOpacity={dim ? 0.15 : 0.55}
                      strokeLinecap="round"
                      strokeDasharray="6 8"
                    >
                      {!reduce && (
                        <animate
                          attributeName="stroke-dashoffset"
                          from="28"
                          to="0"
                          dur="1.8s"
                          repeatCount="indefinite"
                        />
                      )}
                    </path>
                  );
                })}
              </g>
            )}

            {/* 마커 발밑 그림자 */}
            {is3d &&
              points.map((p) => (
                <ellipse
                  key={`sh-${p.code}`}
                  cx={px(p)}
                  cy={py(p)}
                  rx={p.home ? 16 : 12}
                  ry={p.home ? 7 : 5}
                  className={dark ? 'fill-black/40' : 'fill-sea-950/25'}
                  filter={`url(#wm-soft-${uid})`}
                />
              ))}

            {/* 마커 발밑 링 */}
            {points.map((p) => (
              <g key={`ring-${p.code}`}>
                <ellipse
                  cx={px(p)}
                  cy={py(p)}
                  rx={p.home ? 13 : 9}
                  ry={is3d ? (p.home ? 5.5 : 4) : p.home ? 13 : 9}
                  fill="none"
                  strokeWidth={2}
                  className={
                    p.home
                      ? 'stroke-point/70'
                      : dark
                        ? 'stroke-sea-300/70'
                        : 'stroke-sea-500/60'
                  }
                />
                {p.home && !reduce && (
                  <ellipse
                    cx={px(p)}
                    cy={py(p)}
                    rx={13}
                    ry={is3d ? 5.5 : 13}
                    fill="none"
                    strokeWidth={2}
                    className="stroke-point/50"
                  >
                    <animate attributeName="rx" values="13;34" dur="2.6s" repeatCount="indefinite" />
                    <animate
                      attributeName="ry"
                      values={is3d ? '5.5;14' : '13;34'}
                      dur="2.6s"
                      repeatCount="indefinite"
                    />
                    <animate attributeName="opacity" values="0.6;0" dur="2.6s" repeatCount="indefinite" />
                  </ellipse>
                )}
              </g>
            ))}
          </svg>

          {/* ── 기둥 마커 (바닥면 위에 수직으로 세움) ── */}
          {mounted &&
            points.map((p) => {
              const on = active?.code === p.code;
              const tall = p.home ? 62 : 40;
              return (
                <div
                  key={`pin-${p.code}`}
                  className="absolute"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transformStyle: 'preserve-3d',
                    // 바닥의 기울기를 상쇄해 화면을 향해 똑바로 세웁니다
                    transform: is3d ? `rotateZ(7deg) rotateX(-${tilt}deg)` : 'none',
                  }}
                  onMouseEnter={() => setActive(p)}
                  onMouseLeave={() => setActive(null)}
                >
                  <div className="relative" style={{ width: 0, height: 0 }}>
                    {/* 기둥 */}
                    <div
                      className={cn(
                        'absolute left-1/2 -translate-x-1/2 rounded-full transition-all duration-300',
                        p.home ? 'w-[3px]' : 'w-[2px]'
                      )}
                      style={{
                        height: is3d ? (on ? tall + 10 : tall) : 0,
                        bottom: 0,
                        background: p.home
                          ? 'linear-gradient(to top, rgba(200,68,47,0), rgba(200,68,47,0.95))'
                          : 'linear-gradient(to top, rgba(75,150,169,0), rgba(75,150,169,0.9))',
                      }}
                    />

                    {/* 머리 */}
                    <button
                      type="button"
                      aria-label={`${p.name}${p.channel ? ` — ${p.channel}` : ''}`}
                      onClick={() => setActive(on ? null : p)}
                      onFocus={() => setActive(p)}
                      onBlur={() => setActive(null)}
                      className={cn(
                        'absolute left-1/2 -translate-x-1/2 rounded-full border-2 border-white transition-all duration-300',
                        p.home ? 'bg-point' : dark ? 'bg-sea-300' : 'bg-sea-500',
                        on ? 'scale-125' : 'scale-100'
                      )}
                      style={{
                        width: p.home ? 16 : 12,
                        height: p.home ? 16 : 12,
                        bottom: is3d ? (on ? tall + 10 : tall) - (p.home ? 8 : 6) : -(p.home ? 8 : 6),
                        boxShadow: p.home
                          ? '0 4px 14px rgba(200,68,47,0.55)'
                          : '0 4px 12px rgba(30,79,94,0.45)',
                      }}
                    />

                    {/* 라벨 */}
                    {(on || p.home) && (
                      <div
                        className={cn(
                          'pointer-events-none absolute left-1/2 w-max -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-lg transition',
                          p.home
                          ? 'bg-point text-white'
                          : dark
                            ? 'bg-white/95 text-gim-900'
                            : 'bg-white text-gim-900'
                        )}
                        style={{
                          bottom: is3d ? (on ? tall + 10 : tall) + 14 : 14,
                        }}
                      >
                        {p.name}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── 상세 카드 ── */}
      {active && !active.home && (
        <div className="pointer-events-none absolute bottom-0 left-0 z-10 w-64 rounded-xl border border-gim-200 bg-white p-4 shadow-xl">
          <p className="text-sm font-bold text-gim-900">{active.name}</p>
          {active.nameEn && <p className="text-[11px] text-gim-400">{active.nameEn}</p>}
          {active.since && <p className="mt-2 text-xs text-gim-600">수출 시작 {active.since}년</p>}
          {active.channel && <p className="mt-0.5 text-xs text-gim-500">{active.channel}</p>}
        </div>
      )}
    </div>
  );
}
