'use client';

import { useActionState } from 'react';
import { changeMyPassword, type AccountCommerceResult } from '@/actions/account-commerce';
import { cn } from '@/lib/utils';

const initial: AccountCommerceResult = { ok: false, message: '' };

export default function PasswordChangeForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changeMyPassword, initial);

  if (!hasPassword) {
    return (
      <div className="card p-7">
        <h2 className="text-base font-bold">비밀번호</h2>
        <p className="mt-3 text-sm leading-6 text-gim-500">
          카카오·네이버로 가입한 계정은 해당 로그인 서비스에서 비밀번호를 관리합니다.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="card p-7">
      <div className="mb-5">
        <h2 className="text-base font-bold">비밀번호 변경</h2>
        <p className="mt-1 text-xs leading-5 text-gim-400">
          일반 회원은 8자 이상 영문·숫자 조합을 사용해 주세요.
        </p>
      </div>

      <div className="grid gap-4">
        <div>
          <label className="label">현재 비밀번호</label>
          <input
            type="password"
            name="currentPassword"
            required
            autoComplete="current-password"
            className="input"
          />
        </div>
        <div>
          <label className="label">새 비밀번호</label>
          <input
            type="password"
            name="newPassword"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
          />
        </div>
        <div>
          <label className="label">새 비밀번호 확인</label>
          <input
            type="password"
            name="confirmPassword"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
          />
        </div>
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

      <button disabled={pending} className="btn-primary mt-6 px-8">
        {pending ? '변경 중…' : '비밀번호 변경'}
      </button>
    </form>
  );
}
