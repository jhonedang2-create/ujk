import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import StaffManager from '@/components/admin/StaffManager';
import { fmtDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: '직원 계정 관리' };

export default async function StaffPage() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') redirect('/admin');

  const [staff, logs] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MANAGER', 'STAFF'] } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 60 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">직원 계정 관리</h1>
        <p className="mt-1 text-sm text-gim-500">
          매니저·직원 계정을 만들고 볼 수 있는 메뉴를 지정합니다. 최고관리자만 이 화면에 들어올 수 있습니다.
        </p>
      </div>

      <StaffManager
        me={session.user.id}
        staff={staff.map((u) => ({
          id: u.id,
          email: u.email ?? '',
          name: u.name ?? '',
          phone: u.phone ?? '',
          role: u.role,
          position: u.position,
          memo: u.memo,
          permissions: u.permissions,
          status: u.status,
          lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
          createdAt: u.createdAt.toISOString(),
        }))}
        logs={logs.map((l) => ({
          id: l.id,
          userName: l.userName,
          action: l.action,
          target: l.target,
          detail: l.detail,
          at: fmtDate(l.createdAt, true),
        }))}
      />
    </div>
  );
}
