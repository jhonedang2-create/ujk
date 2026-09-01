'use client';

import { useId } from 'react';

/**
 * 자체 제작 브랜드 그래픽 (외부 이미지·라이브러리 없음).
 * 전부 인라인 SVG라 어떤 화면에서도 선명하고, 용량은 몇 KB 수준입니다.
 */

/** 히어로 배경: 바다 레이어 + 부유하는 김 시트 */
export function HeroArt({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 720"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ha-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c2029" />
          <stop offset="55%" stopColor="#123642" />
          <stop offset="100%" stopColor="#1e4f5e" />
        </linearGradient>
        <radialGradient id="ha-glow" cx="72%" cy="22%" r="55%">
          <stop offset="0%" stopColor="#7db8c6" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#7db8c6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ha-sheet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a2a1f" />
          <stop offset="50%" stopColor="#0f1a12" />
          <stop offset="100%" stopColor="#22331f" />
        </linearGradient>
        <pattern id="ha-fiber" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M0 13 Q6 8 13 13 T26 13" stroke="#4b7a55" strokeWidth="0.9" fill="none" opacity="0.5" />
          <path d="M13 0 Q18 6 13 13 T13 26" stroke="#3d6647" strokeWidth="0.7" fill="none" opacity="0.4" />
        </pattern>
      </defs>

      <rect width="1440" height="720" fill="url(#ha-sea)" />
      <rect width="1440" height="720" fill="url(#ha-glow)" />

      {/* 물결 레이어 */}
      {[
        { y: 470, o: 0.10, d: '18s', a: 26 },
        { y: 530, o: 0.14, d: '13s', a: 34 },
        { y: 600, o: 0.20, d: '9s', a: 22 },
      ].map((w, i) => (
        <g key={i} opacity={w.o}>
          <path
            d={`M-200 ${w.y} q 180 -${w.a} 360 0 t 360 0 t 360 0 t 360 0 t 360 0 V720 H-200 Z`}
            fill="#aed4dd"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              from="0 0"
              to="720 0"
              dur={w.d}
              repeatCount="indefinite"
            />
          </path>
        </g>
      ))}

      {/* 부유하는 김 시트 */}
      <g opacity="0.9">
        <g transform="translate(1010 150) rotate(-9)">
          <animateTransform
            attributeName="transform"
            type="translate"
            values="1010 150; 1010 172; 1010 150"
            dur="7s"
            repeatCount="indefinite"
            additive="sum"
          />
          <rect x="-150" y="-105" width="300" height="210" rx="8" fill="url(#ha-sheet)" />
          <rect x="-150" y="-105" width="300" height="210" rx="8" fill="url(#ha-fiber)" opacity="0.65" />
          <rect
            x="-150"
            y="-105"
            width="300"
            height="210"
            rx="8"
            fill="none"
            stroke="#5d8f66"
            strokeWidth="1.2"
            opacity="0.5"
          />
        </g>

        <g transform="translate(1210 380) rotate(12)" opacity="0.75">
          <animateTransform
            attributeName="transform"
            type="translate"
            values="1210 380; 1210 358; 1210 380"
            dur="9s"
            repeatCount="indefinite"
            additive="sum"
          />
          <rect x="-110" y="-78" width="220" height="156" rx="7" fill="url(#ha-sheet)" />
          <rect x="-110" y="-78" width="220" height="156" rx="7" fill="url(#ha-fiber)" opacity="0.6" />
        </g>
      </g>

      {/* 기포 */}
      {[
        [220, 620, 4, '6s'],
        [340, 660, 3, '8s'],
        [520, 600, 5, '7s'],
        [1180, 640, 3.5, '9s'],
        [860, 670, 4.5, '10s'],
      ].map(([cx, cy, r, dur], i) => (
        <circle key={i} cx={cx as number} cy={cy as number} r={r as number} fill="#aed4dd" opacity="0.25">
          <animate attributeName="cy" values={`${cy};${(cy as number) - 260}`} dur={dur as string} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0" dur={dur as string} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

/** 섹션 경계 물결 */
export function WaveDivider({
  flip = false,
  className = 'text-white',
}: {
  flip?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 1440 90"
      preserveAspectRatio="none"
      className={`block h-[60px] w-full sm:h-[90px] ${className} ${flip ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path
        d="M0 46 Q 180 6 360 46 T 720 46 T 1080 46 T 1440 46 V90 H0 Z"
        fill="currentColor"
        opacity="0.35"
      />
      <path
        d="M0 62 Q 180 26 360 62 T 720 62 T 1080 62 T 1440 62 V90 H0 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** 김 결 텍스처 — 카드/배너 배경용 */
export function GimTexture({ className = '' }: { className?: string }) {
  // 한 페이지에 여러 번 쓰이므로 패턴 id 가 겹치지 않게 합니다
  const pid = `gt-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id={pid} width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M0 15 Q7 9 15 15 T30 15" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
          <path d="M15 0 Q21 7 15 15 T15 30" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.35" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  );
}

/* ── 공정 아이콘 (선 아이콘 세트) ────────────────────────── */

const ICON = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function ProcessIcon({ step, className = 'h-7 w-7' }: { step: number; className?: string }) {
  const paths: Record<number, React.ReactNode> = {
    1: ( // 원초 선별
      <>
        <path d="M12 3c-4 3-6 6-6 9a6 6 0 0012 0c0-3-2-6-6-9z" {...ICON} />
        <path d="M12 9v9M9 12l3 2 3-2" {...ICON} />
      </>
    ),
    2: ( // 세척
      <>
        <path d="M4 15c2-1.5 4-1.5 6 0s4 1.5 6 0 3-1 4 0" {...ICON} />
        <path d="M4 19c2-1.5 4-1.5 6 0s4 1.5 6 0 3-1 4 0" {...ICON} />
        <path d="M8 4v5M12 3v6M16 5v4" {...ICON} />
      </>
    ),
    3: ( // 초제
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" {...ICON} />
        <path d="M3 10h18M3 14h18M9 6v12M15 6v12" {...ICON} />
      </>
    ),
    4: ( // 건조
      <>
        <circle cx="12" cy="12" r="4" {...ICON} />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" {...ICON} />
      </>
    ),
    5: ( // 구이
      <>
        <path d="M12 3s3 3 3 6a3 3 0 01-6 0c0-3 3-6 3-6z" {...ICON} />
        <path d="M5 14c0 4 3 7 7 7s7-3 7-7" {...ICON} />
        <path d="M8 14h8" {...ICON} />
      </>
    ),
    6: ( // 검사
      <>
        <circle cx="11" cy="11" r="6" {...ICON} />
        <path d="M15.5 15.5L21 21M8.5 11l2 2 4-4" {...ICON} />
      </>
    ),
    7: ( // 포장
      <>
        <path d="M3 8l9-5 9 5v8l-9 5-9-5V8z" {...ICON} />
        <path d="M3 8l9 5 9-5M12 13v8" {...ICON} />
      </>
    ),
    8: ( // 출고
      <>
        <rect x="1" y="7" width="13" height="9" rx="1.5" {...ICON} />
        <path d="M14 10h4l3 3v3h-7z" {...ICON} />
        <circle cx="6" cy="18" r="2" {...ICON} />
        <circle cx="17" cy="18" r="2" {...ICON} />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {paths[step] ?? paths[1]}
    </svg>
  );
}

/** 핵심 가치 아이콘 */
export function ValueIcon({ name, className = 'h-8 w-8' }: { name: string; className?: string }) {
  const map: Record<string, React.ReactNode> = {
    origin: (
      <>
        <path d="M12 21s-7-5.5-7-11a7 7 0 1114 0c0 5.5-7 11-7 11z" {...ICON} />
        <circle cx="12" cy="10" r="2.5" {...ICON} />
      </>
    ),
    fire: (
      <>
        <path d="M12 2s4 4 4 8a4 4 0 01-8 0c0-4 4-8 4-8z" {...ICON} />
        <path d="M6 15c0 3.3 2.7 6 6 6s6-2.7 6-6" {...ICON} />
      </>
    ),
    shield: (
      <>
        <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z" {...ICON} />
        <path d="M9 12l2 2 4-4" {...ICON} />
      </>
    ),
    truck: (
      <>
        <rect x="1" y="6" width="13" height="10" rx="1.5" {...ICON} />
        <path d="M14 9h4l3 3.5V16h-7z" {...ICON} />
        <circle cx="6" cy="18.5" r="1.8" {...ICON} />
        <circle cx="17" cy="18.5" r="1.8" {...ICON} />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" {...ICON} />
        <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" {...ICON} />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {map[name] ?? map.origin}
    </svg>
  );
}
