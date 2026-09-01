'use client';

import { useActionState, useState } from 'react';
import { answerInquiry, type Res } from '@/actions/admin';

type Item = {
  id: string;
  type: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  title: string;
  content: string;
  status: string;
  answer: string;
  createdAt: string;
};

const initial: Res = { ok: false, message: '' };

export default function InquiryList({ items }: { items: Item[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(answerInquiry, initial);

  if (items.length === 0) {
    return <p className="card py-16 text-center text-sm text-gim-400">문의가 없습니다.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it.id} className="card overflow-hidden">
          <button
            onClick={() => setOpenId(openId === it.id ? null : it.id)}
            className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-gim-50"
          >
            <span
              className={`badge shrink-0 ${
                it.status === 'OPEN' ? 'bg-point text-white' : 'bg-gim-100 text-gim-500'
              }`}
            >
              {it.status === 'OPEN' ? '미답변' : '답변완료'}
            </span>
            <span className="shrink-0 text-xs text-gim-500">{it.type}</span>
            <span className="line-clamp-1 flex-1 text-sm font-medium">{it.title}</span>
            <span className="hidden shrink-0 text-xs text-gim-400 sm:block">{it.name}</span>
            <span className="shrink-0 text-xs text-gim-400">{it.createdAt}</span>
          </button>

          {openId === it.id && (
            <div className="border-t border-gim-100 bg-gim-50 p-5">
              <dl className="mb-4 grid gap-2 text-xs sm:grid-cols-2">
                {[
                  ['이름', it.name],
                  ['연락처', it.phone],
                  ['이메일', it.email || '-'],
                  ['회사', it.company || '-'],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="w-14 text-gim-400">{k}</dt>
                    <dd className="text-gim-700">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="rounded-lg bg-white p-4 text-sm leading-6 text-gim-700 whitespace-pre-wrap">
                {it.content}
              </div>

              <form action={formAction} className="mt-4">
                <input type="hidden" name="id" value={it.id} />
                <label className="label">답변 내용</label>
                <textarea
                  name="answer"
                  rows={5}
                  defaultValue={it.answer}
                  className="input resize-none bg-white"
                  placeholder="고객에게 전달할 답변을 입력하세요."
                />
                <div className="mt-3 flex items-center gap-3">
                  <button disabled={pending} className="btn-primary btn-sm">
                    {pending ? '저장 중…' : '답변 저장'}
                  </button>
                  <a href={`tel:${it.phone}`} className="btn-outline btn-sm">전화 걸기</a>
                  {it.email && <a href={`mailto:${it.email}`} className="btn-outline btn-sm">메일 보내기</a>}
                  {state.message && <span className="text-xs text-sea-700">{state.message}</span>}
                </div>
              </form>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
