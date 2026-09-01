'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function StaffLoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = safeAdminPath(sp.get('callbackUrl') ?? '/admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    const result = await signIn('credentials', {
      identifier: String(fd.get('identifier') ?? ''),
      password: String(fd.get('password') ?? ''),
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError('계정 정보가 올바르지 않거나 접근 권한이 없습니다.');
      return;
    }

    router.replace(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="staff-identifier">계정</label>
        <input
          id="staff-identifier"
          name="identifier"
          type="text"
          required
          className="input"
          autoComplete="username"
        />
      </div>
      <div>
        <label className="label" htmlFor="staff-password">비밀번호</label>
        <input
          id="staff-password"
          name="password"
          type="password"
          required
          className="input"
          autoComplete="current-password"
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <button disabled={loading} className="btn-primary w-full py-3.5">
        {loading ? '확인 중…' : '로그인'}
      </button>
    </form>
  );
}

function safeAdminPath(raw: string) {
  try {
    const url = new URL(raw, 'http://local');
    return url.pathname.startsWith('/admin') ? `${url.pathname}${url.search}` : '/admin';
  } catch {
    return '/admin';
  }
}
