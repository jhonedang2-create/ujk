'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveCategory, deleteCategory, type Res } from '@/actions/admin';

type Cat = {
  id: string;
  name: string;
  slug: string;
  parentId: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

const initial: Res = { ok: false, message: '' };

export default function CategoryManager({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Cat | null>(null);
  const [state, formAction, pending] = useActionState(saveCategory, initial);
  const [, start] = useTransition();

  const key = editing?.id ?? 'new';

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-gim-50 text-xs text-gim-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">카테고리</th>
              <th className="px-4 py-3 text-left font-medium">slug</th>
              <th className="px-4 py-3 text-right font-medium">상품수</th>
              <th className="px-4 py-3 text-center font-medium">노출</th>
              <th className="px-4 py-3 text-center font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gim-100">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-gim-50">
                <td className="px-4 py-3">
                  {c.parentId && <span className="mr-1 text-gim-300">└</span>}
                  <span className="font-medium">{c.name}</span>
                  {c.description && <p className="text-[11px] text-gim-400">{c.description}</p>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gim-500">{c.slug}</td>
                <td className="px-4 py-3 text-right">{c.productCount}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`badge ${c.isActive ? 'bg-sea-50 text-sea-800' : 'bg-gim-100 text-gim-500'}`}>
                    {c.isActive ? '노출' : '숨김'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-1.5">
                    <button onClick={() => setEditing(c)} className="btn-outline btn-sm">수정</button>
                    <button
                      onClick={() => {
                        if (c.productCount > 0) {
                          alert('상품이 등록된 카테고리는 삭제할 수 없습니다.');
                          return;
                        }
                        if (!confirm('삭제하시겠습니까?')) return;
                        start(async () => { await deleteCategory(c.id); router.refresh(); });
                      }}
                      className="btn-sm rounded-lg px-3 py-1.5 text-xs font-semibold text-point hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={5} className="py-14 text-center text-gim-400">카테고리가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form key={key} action={formAction} className="card h-fit p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold">{editing ? '카테고리 수정' : '카테고리 추가'}</h2>
          {editing && (
            <button type="button" onClick={() => setEditing(null)} className="text-xs text-gim-400 hover:text-sea-700">
              새로 만들기
            </button>
          )}
        </div>

        {editing && <input type="hidden" name="id" value={editing.id} />}

        <div className="space-y-4">
          <div>
            <label className="label">카테고리명 *</label>
            <input name="name" required defaultValue={editing?.name} className="input" />
          </div>
          <div>
            <label className="label">slug (URL)</label>
            <input name="slug" defaultValue={editing?.slug} className="input" placeholder="예) jomi-gim" />
          </div>
          <div>
            <label className="label">상위 카테고리</label>
            <select name="parentId" defaultValue={editing?.parentId ?? ''} className="input">
              <option value="">없음 (최상위)</option>
              {categories
                .filter((c) => !c.parentId && c.id !== editing?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="label">설명</label>
            <input name="description" defaultValue={editing?.description} className="input" />
          </div>
          <div>
            <label className="label">정렬 순서</label>
            <input name="sortOrder" type="number" defaultValue={editing?.sortOrder ?? 0} className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} className="h-4 w-4 accent-sea-700" />
            노출하기
          </label>
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
