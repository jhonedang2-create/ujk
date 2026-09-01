'use client';

import { useState } from 'react';

/**
 * 모든 차트의 공통 껍데기.
 * - 제목/설명
 * - '표 보기' 토글 — 차트로 못 읽는 값을 표로도 항상 제공 (접근성 필수)
 * - CSV 내려받기
 */
export default function ChartCard({
  title,
  subtitle,
  action,
  table,
  csvName,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  table?: { head: string[]; rows: (string | number)[][] };
  csvName?: string;
  children: React.ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);

  function downloadCsv() {
    if (!table) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [table.head, ...table.rows].map((r) => r.map(esc).join(',')).join('\r\n');
    // 엑셀 한글 깨짐 방지용 BOM
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${csvName ?? title}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section className="rounded-2xl border border-gim-100 bg-white p-5 sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-gim-900">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-gim-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          {action}
          {table && (
            <>
              <button
                onClick={() => setShowTable((v) => !v)}
                aria-pressed={showTable}
                className="rounded-lg border border-gim-200 px-2.5 py-1.5 text-[11px] font-medium text-gim-600 hover:bg-gim-50"
              >
                {showTable ? '차트 보기' : '표 보기'}
              </button>
              <button
                onClick={downloadCsv}
                className="rounded-lg border border-gim-200 px-2.5 py-1.5 text-[11px] font-medium text-gim-600 hover:bg-gim-50"
              >
                CSV
              </button>
            </>
          )}
        </div>
      </header>

      {showTable && table ? (
        <div className="max-h-[360px] overflow-auto rounded-xl border border-gim-100">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gim-50 text-xs text-gim-500">
              <tr>
                {table.head.map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-2.5 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gim-100">
              {table.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td
                      key={ci}
                      className={`px-4 py-2.5 ${
                        ci === 0
                          ? 'text-gim-800'
                          : 'text-right tabular-nums text-gim-700'
                      }`}
                    >
                      {typeof c === 'number' ? c.toLocaleString('ko-KR') : c}
                    </td>
                  ))}
                </tr>
              ))}
              {table.rows.length === 0 && (
                <tr>
                  <td colSpan={table.head.length} className="py-12 text-center text-gim-400">
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
