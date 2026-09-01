'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { savePost, deletePost, type Res } from '@/actions/admin';

type Post = {
  id: string;
  type: string;
  title: string;
  content: string;
  isPinned: boolean;
  isActive: boolean;
  createdAt: string;
};

const TYPES: Record<string, string> = { NOTICE: '공지사항', PRESS: '보도자료', FAQ: '자주묻는질문' };
const initial: Res = { ok: false, message: '' };

export default function PostManager({ posts }: { posts: Post[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Post | null>(null);
  const [state, formAction, pending] = useActionState(savePost, initial);
  const [, start] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-gim-50 text-xs text-gim-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">구분</th>
              <th className="px-4 py-3 text-left font-medium">제목</th>
              <th className="px-4 py-3 text-center font-medium">작성일</th>
              <th className="px-4 py-3 text-center font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gim-100">
            {posts.map((p) => (
              <tr key={p.id} className="hover:bg-gim-50">
                <td className="px-4 py-3 text-xs text-gim-500">{TYPES[p.type] ?? p.type}</td>
                <td className="px-4 py-3">
                  {p.isPinned && <span className="badge mr-2 bg-point text-white">중요</span>}
                  {!p.isActive && <span className="badge mr-2 bg-gim-100 text-gim-500">숨김</span>}
                  <span className="font-medium">{p.title}</span>
                </td>
                <td className="px-4 py-3 text-center text-xs text-gim-400">{p.createdAt}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-1.5">
                    <button onClick={() => setEditing(p)} className="btn-outline btn-sm">수정</button>
                    <button
                      onClick={() => {
                        if (!confirm('삭제하시겠습니까?')) return;
                        start(async () => { await deletePost(p.id); router.refresh(); });
                      }}
                      className="btn-sm rounded-lg px-3 py-1.5 text-xs font-semibold text-point hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr><td colSpan={4} className="py-14 text-center text-gim-400">게시글이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form key={editing?.id ?? 'new'} action={formAction} className="card h-fit p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold">{editing ? '게시글 수정' : '게시글 작성'}</h2>
          {editing && (
            <button type="button" onClick={() => setEditing(null)} className="text-xs text-gim-400 hover:text-sea-700">
              새로 작성
            </button>
          )}
        </div>

        {editing && <input type="hidden" name="id" value={editing.id} />}

        <div className="space-y-4">
          <div>
            <label className="label">구분</label>
            <select name="type" defaultValue={editing?.type ?? 'NOTICE'} className="input">
              {Object.entries(TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">제목 *</label>
            <input name="title" required defaultValue={editing?.title} className="input" />
          </div>
          <div>
            <label className="label">내용 (HTML 가능)</label>
            <textarea
              name="content"
              rows={10}
              defaultValue={editing?.content}
              className="input resize-none font-mono text-xs"
            />
          </div>
          <div className="flex gap-5">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isPinned" defaultChecked={editing?.isPinned} className="h-4 w-4 accent-sea-700" />
              상단 고정
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} className="h-4 w-4 accent-sea-700" />
              게시하기
            </label>
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
