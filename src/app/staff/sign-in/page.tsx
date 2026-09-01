import { Suspense } from 'react';
import type { Metadata } from 'next';
import StaffLoginForm from '@/components/StaffLoginForm';

export const metadata: Metadata = {
  title: '내부 운영 로그인',
  robots: { index: false, follow: false, nocache: true },
};

export default function StaffSignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sea-950 px-5 py-16">
      <section className="w-full max-w-sm rounded-2xl border border-white/10 bg-white p-7 shadow-2xl sm:p-9">
        <p className="text-[10px] font-bold tracking-[0.2em] text-sea-700">PRIVATE ACCESS</p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-gim-900">내부 운영 로그인</h1>
        <p className="mt-2 mb-7 text-xs leading-6 text-gim-500">
          허가된 운영 계정만 접근할 수 있습니다.
        </p>
        <Suspense fallback={<p className="text-center text-sm text-gim-400">불러오는 중…</p>}>
          <StaffLoginForm />
        </Suspense>
      </section>
    </main>
  );
}
