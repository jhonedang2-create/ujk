'use client';

import { useActionState } from 'react';
import { optOut, type Res } from '@/actions/optout';

const initial: Res = { ok: false, message: '' };

export default function UnsubscribeForm({ prefill }: { prefill: string }) {
  const [state, action, pending] = useActionState(optOut, initial);

  if (state.ok) {
    return (
      <div className="card p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sea-50 text-3xl text-sea-700">
          ✓
        </div>
        <h2 className="mt-6 text-xl font-bold">수신거부 처리가 완료되었습니다</h2>
        <p className="mt-3 text-sm leading-6 text-gim-500">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="card p-8">
      <label className="label">휴대폰 번호</label>
      <input
        name="phone"
        required
        defaultValue={prefill}
        placeholder="010-0000-0000"
        className="input"
        inputMode="tel"
      />

      {state.message && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.message}</p>
      )}

      <button disabled={pending} className="btn-primary mt-6 w-full py-3.5">
        {pending ? '처리 중…' : '광고 수신 거부하기'}
      </button>
    </form>
  );
}
