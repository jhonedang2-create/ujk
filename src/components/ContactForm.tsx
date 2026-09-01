'use client';

import { useActionState } from 'react';
import { submitInquiry, type ActionState } from '@/actions/contact';
import { INQUIRY_TYPE } from '@/lib/site';

const initial: ActionState = { ok: false, message: '' };

export default function ContactForm({ defaultType }: { defaultType: string }) {
  const [state, formAction, pending] = useActionState(submitInquiry, initial);

  if (state.ok) {
    return (
      <div className="card flex flex-col items-center justify-center p-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sea-50 text-3xl text-sea-700">
          ✓
        </div>
        <h2 className="mt-6 text-xl font-bold">문의가 접수되었습니다</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-gim-500">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="card p-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">문의 유형 *</label>
          <select name="type" defaultValue={defaultType} className="input">
            {Object.entries(INQUIRY_TYPE).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">이름 *</label>
          <input name="name" required className="input" />
        </div>
        <div>
          <label className="label">연락처 *</label>
          <input name="phone" required className="input" placeholder="010-0000-0000" />
        </div>
        <div>
          <label className="label">이메일</label>
          <input name="email" type="email" className="input" />
        </div>
        <div>
          <label className="label">회사/기관명</label>
          <input name="company" className="input" placeholder="개인이시면 비워두세요" />
        </div>

        <div className="sm:col-span-2">
          <label className="label">제목 *</label>
          <input name="title" required className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">문의 내용 *</label>
          <textarea name="content" required rows={9} className="input resize-none" />
        </div>
      </div>

      <label className="mt-5 flex items-start gap-2 text-xs leading-5 text-gim-600">
        <input type="checkbox" name="agreePrivacy" required className="mt-0.5 h-4 w-4 accent-sea-700" />
        <span>개인정보 수집·이용에 동의합니다. (필수)</span>
      </label>

      {state.message && !state.ok && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.message}</p>
      )}

      <button disabled={pending} className="btn-primary mt-6 w-full py-3.5 sm:w-auto sm:px-12">
        {pending ? '접수 중…' : '문의 접수하기'}
      </button>
    </form>
  );
}
