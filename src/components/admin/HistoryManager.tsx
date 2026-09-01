'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveHistory, deleteHistory, type Res } from '@/actions/admin';

type Row = { id: string; year: string; month: string; content: string; sortOrder: number };
const initial: Res = { ok: false, message: '' };

export default function HistoryManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [state, formAction, pending] = useActionState(saveHistory, initial);
  const [, start] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-gim-50 text-xs text-gim-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">연도</th>
              <th className="px-4 py-3 text-left font-medium">월</th>
              <th className="px-4 py-3 text-left font-medium">내용</th>
              <th className="px-4 py-3 text-center font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gim-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gim-50">
                <td className="px-4 py-3 font-bold text-sea-800">{r.year}</td>
                <td className="px-4 py-3 text-gim-500">{r.month ? `${r.month}월` : '-'}</td>
                <td className="px-4 py-3">{r.content}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-1.5">
                    <button onClick={() => setEditing(r)} className="btn-outline btn-sm">수정</button>
                    <button
                      onClick={() => {
                        if (!confirm('삭제하시겠습니까?')) return;
                        start(async () => { await deleteHistory(r.id); router.refresh(); });
                      }}
                      className="btn-sm rounded-lg px-3 py-1.5 text-xs font-semibold text-point hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="py-14 text-center text-gim-400">등록된 연혁이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form key={editing?.id ?? 'new'} action={formAction} className="card h-fit p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold">{editing ? '연혁 수정' : '연혁 추가'}</h2>
          {editing && (
            <button type="button" onClick={() => setEditing(null)} className="text-xs text-gim-400 hover:text-sea-700">
              새로 추가
            </button>
          )}
        </div>

        {editing && <input type="hidden" name="id" value={editing.id} />}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">연도 *</label>
              <input name="year" required defaultValue={editing?.year} placeholder="2026" className="input" />
            </div>
            <div>
              <label className="label">월</label>
              <input name="month" defaultValue={editing?.month} placeholder="03" className="input" />
            </div>
          </div>
          <div>
            <label className="label">내용 *</label>
            <textarea name="content" required rows={3} defaultValue={editing?.content} className="input resize-none" />
          </div>
          <div>
            <label className="label">같은 연도 내 정렬 순서</label>
            <input name="sortOrder" type="number" defaultValue={editing?.sortOrder ?? 0} className="input" />
          </div>
        </div>

        {state.message && (
          <p className={`mt-4 rounded-lg px-4 py-2.5 text-sm ${state.ok ? 'bg-sea-50 text-sea-800' : 'bg-red-50 text-red-700'}`}>
            {state.message}
          </p>
        )}

        <button disabled={pending} className="btn-primary mt-5 w-full">
          {pending ? '저장 중…' : '저장'}
        </button>
      </form>
    </div>
  );
}
