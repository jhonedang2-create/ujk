import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm';
import PageHero from '@/components/PageHero';
import { socialEnabled } from '@/auth.config';

export const metadata = { title: '로그인' };

export default function LoginPage() {
  return (
    <>
      <PageHero
        title="로그인"
        subtitle="카카오·네이버 계정으로 바로 시작하세요."
        breadcrumb={[['로그인', '/login']]}
      />
      <section className="container-x max-w-md py-16">
        <Suspense fallback={<p className="text-center text-sm text-gim-400">불러오는 중…</p>}>
          <LoginForm social={socialEnabled} />
        </Suspense>
      </section>
    </>
  );
}
