'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { RANGE_LABEL, type RangePreset } from '@/lib/range';
import { cn } from '@/lib/utils';

const PRESETS: RangePreset[] = ['today', '7d', '30d', '90d', 'month', 'year'];

/** 페이지 전체를 감싸는 단일 기간 필터 (차트 카드 안에 두지 않습니다) */
export default function RangeFilter({
  current,
  from,
  to,
}: {
  current: RangePreset;
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(current === 'custom');
  const [f, setF] = useState(from ?? '');
  const [t, setT] = useState(to ?? '');

  const go = (p: RangePreset) => router.push(`${pathname}?range=${p}`);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gim-100 bg-white p-3">
      {PRESETS.map((p) => (
        <button
          key={p}
          onClick={() => {
            setOpen(false);
            go(p);
          }}
          className={cn(
            'rounded-lg px-3.5 py-2 text-xs font-semibold transition',
            current === p ? 'bg-sea-800 text-white' : 'text-gim-600 hover:bg-gim-50'
          )}
        >
          {RANGE_LABEL[p]}
        </button>
      ))}

      <span className="mx-1 h-5 w-px bg-gim-100" />

      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'rounded-lg px-3.5 py-2 text-xs font-semibold transition',
          current === 'custom' ? 'bg-sea-800 text-white' : 'text-gim-600 hover:bg-gim-50'
        )}
      >
        직접 선택
      </button>

      {open && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={f}
            onChange={(e) => setF(e.target.value)}
            className="input w-auto py-1.5 text-xs"
          />
          <span className="text-xs text-gim-400">~</span>
          <input
            type="date"
            value={t}
            onChange={(e) => setT(e.target.value)}
            className="input w-auto py-1.5 text-xs"
          />
          <button
            disabled={!f || !t}
            onClick={() => router.push(`${pathname}?range=custom&from=${f}&to=${t}`)}
            className="btn-primary btn-sm"
          >
            조회
          </button>
        </div>
      )}
    </div>
  );
}
