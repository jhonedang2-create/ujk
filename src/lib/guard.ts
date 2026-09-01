import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { can, type Permission } from '@/lib/permissions';

/**
 * 관리자 페이지 상단에서 호출하는 권한 가드.
 * 미들웨어에서도 한 번 걸러지지만, 레이아웃과 페이지가 병렬로 렌더링되므로
 * 페이지 자체에서도 한 번 더 확인합니다.
 */
export async function guardPage(perm: Permission) {
  const session = await auth();
  if (!session?.user) redirect('/staff/sign-in?callbackUrl=/admin');
  if (!can(session.user, perm)) redirect('/admin');
  return session;
}
