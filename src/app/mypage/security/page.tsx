import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import PasswordChangeForm from '@/components/PasswordChangeForm';

export const metadata = { title: '계정 보안' };
export const dynamic = 'force-dynamic';

export default async function SecurityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/mypage/security');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      loginId: true,
      provider: true,
      password: true,
      lastLoginAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">계정 보안</h1>
        <p className="mt-1 text-sm text-gim-500">
          로그인 정보와 비밀번호를 안전하게 관리합니다.
        </p>
      </div>

      <div className="card p-7">
        <h2 className="text-base font-bold">로그인 정보</h2>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex gap-4">
            <dt className="w-24 shrink-0 text-gim-400">로그인 방식</dt>
            <dd className="font-medium">
              {user?.provider === 'naver'
                ? '네이버'
                : user?.provider === 'kakao'
                ? '카카오'
                : '아이디·비밀번호'}
            </dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-24 shrink-0 text-gim-400">아이디</dt>
            <dd>{user?.loginId || '-'}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-24 shrink-0 text-gim-400">이메일</dt>
            <dd>{user?.email || '-'}</dd>
          </div>
        </dl>
      </div>

      <PasswordChangeForm hasPassword={Boolean(user?.password)} />
    </div>
  );
}
