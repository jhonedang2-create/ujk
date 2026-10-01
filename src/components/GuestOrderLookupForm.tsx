'use client';

import { useActionState } from 'react';
import { lookupOrder, type AccountCommerceResult } from '@/actions/account-commerce';
import { cn } from '@/lib/utils';

const initial: AccountCommerceResult = { ok: false, message: '' };

export default function GuestOrderLookupForm() {
  const [state, action, pending] = useActionState(lookupOrder, initial);

  return (
    <form action={action} className="card mx-auto max-w-xl p-7 sm:p-9">
      <div>
        <label className="label">주문번호</label>
        <input
          name="orderNo"
          required
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="주문 완료 화면 또는 안내문자의 주문번호"
          className="input"
        />
      </div>

      <div className="mt-5">
        <label className="label">주문자 또는 받는 분 연락처</label>
        <input
          name="phone"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="010-0000-0000"
          className="input"
        />
        <p className="mt-2 text-xs leading-5 text-gim-400">
          주문번호와 주문 시 입력한 연락처가 모두 일치해야 조회됩니다.
        </p>
      </div>

      {state.message && (
        <p
          className={cn(
            'mt-5 rounded-lg px-4 py-3 text-sm',
            state.ok ? 'bg-sea-50 text-sea-800' : 'bg-red-50 text-red-700'
          )}
        >
          {state.message}
        </p>
      )}

      <button disabled={pending} className="btn-primary mt-6 w-full">
        {pending ? '조회 중…' : '주문 조회'}
      </button>
    </form>
  );
}
