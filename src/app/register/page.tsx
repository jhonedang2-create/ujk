import RegisterForm from '@/components/RegisterForm';
import PageHero from '@/components/PageHero';
import { socialEnabled } from '@/auth.config';

export const metadata = { title: '회원가입' };

export default function RegisterPage() {
  return (
    <>
      <PageHero
        title="회원가입"
        subtitle="카카오·네이버 계정으로 3초면 끝납니다. 가입 즉시 3,000원 적립금을 드립니다."
        breadcrumb={[['회원가입', '/register']]}
      />
      <section className="container-x max-w-md py-16">
        <RegisterForm social={socialEnabled} />
      </section>
    </>
  );
}
