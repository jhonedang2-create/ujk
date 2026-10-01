import { guardPage } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { fmtDate, num, won } from '@/lib/utils';
import { USER_GRADE } from '@/lib/site';
import Pagination from '@/components/Pagination';
import UserRowActions from '@/components/admin/UserRowActions';
import AdminUserCreateForm from '@/components/admin/AdminUserCreateForm';

export const dynamic = 'force-dynamic';
const SIZE = 20;

const ROLE_LABEL: Record<string, string> = {
  USER: '일반회원',
  STAFF: '직원',
  MANAGER: '매니저',
  ADMIN: '최고관리자',
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; role?: string; status?: string }>;
}) {
  const session = await guardPage('users');
  const isOwner = session.user.role === 'ADMIN';

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const q = sp.q?.trim();

  const where = {
    ...(sp.role ? { role: sp.role } : {}),
    ...(sp.status ? { status: sp.status } : {}),
    ...(q
      ? {
          OR: [
            { loginId: { contains: q } },
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, users, activeCount, bannedCount, memberCount] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * SIZE,
      take: SIZE,
      include: {
        _count: { select: { orders: true } },
        orders: {
          where: { status: { in: ['PAID', 'PREPARING', 'SHIPPING', 'DELIVERED'] } },
          select: { totalAmount: true },
        },
      },
    }),
    prisma.user.count({ where: { role: 'USER', status: 'ACTIVE' } }),
    prisma.user.count({ where: { role: 'USER', status: 'BANNED' } }),
    prisma.user.count({ where: { role: 'USER' } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">회원 관리</h1>
          <p className="mt-1 text-sm text-gim-500">
            일반회원 생성·검색·차단·등급별 구매현황과 적립금을 관리합니다.
          </p>
        </div>
        <p className="text-xs text-gim-400">현재 검색 결과 {num(total)}명</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-gim-500">일반회원</p>
          <p className="mt-1 text-2xl font-black text-sea-800">{num(memberCount)}명</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gim-500">정상 이용</p>
          <p className="mt-1 text-2xl font-black text-sea-800">{num(activeCount)}명</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gim-500">차단 회원</p>
          <p className="mt-1 text-2xl font-black text-point">{num(bannedCount)}명</p>
        </div>
      </div>

      <AdminUserCreateForm />

      <form action="/admin/users" className="card flex flex-wrap items-end gap-2 p-4">
        <div>
          <label className="label text-xs">권한</label>
          <select name="role" defaultValue={sp.role ?? ''} className="input w-36 py-2">
            <option value="">전체 권한</option>
            <option value="USER">일반회원</option>
            <option value="STAFF">직원</option>
            <option value="MANAGER">매니저</option>
            <option value="ADMIN">최고관리자</option>
          </select>
        </div>
        <div>
          <label className="label text-xs">상태</label>
          <select name="status" defaultValue={sp.status ?? ''} className="input w-32 py-2">
            <option value="">전체 상태</option>
            <option value="ACTIVE">정상</option>
            <option value="BANNED">차단</option>
            <option value="DORMANT">휴면</option>
          </select>
        </div>
        <div className="min-w-[240px] flex-1">
          <label className="label text-xs">회원 검색</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="로그인 ID · 이름 · 이메일 · 연락처"
            className="input py-2"
          />
        </div>
        <button className="btn-outline btn-sm">검색</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-gim-50 text-xs text-gim-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">회원</th>
              <th className="px-4 py-3 text-center font-medium">가입경로</th>
              <th className="px-4 py-3 text-center font-medium">등급</th>
              <th className="px-4 py-3 text-right font-medium">주문</th>
              <th className="px-4 py-3 text-right font-medium">구매액</th>
              <th className="px-4 py-3 text-right font-medium">적립금</th>
              <th className="px-4 py-3 text-center font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gim-100">
            {users.map((u) => {
              const spent = u.orders.reduce((sum, o) => sum + o.totalAmount, 0);
              return (
                <tr key={u.id} className="hover:bg-gim-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {u.name ?? '-'}
                      {u.role !== 'USER' && (
                        <span className="badge ml-2 bg-point text-white">
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      )}
                      {u.status === 'BANNED' && (
                        <span className="badge ml-2 bg-gim-200 text-gim-600">차단</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gim-400">
                      ID {u.loginId ?? '-'} · {u.email ?? '-'} · {u.phone ?? '-'}
                    </p>
                    <p className="text-[10px] text-gim-300">가입 {fmtDate(u.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gim-600">
                    {u.provider === 'naver' ? '네이버' : u.provider === 'kakao' ? '카카오' : '아이디'}
                  </td>
                  <td className="px-4 py-3 text-center text-xs">{USER_GRADE[u.grade]}</td>
                  <td className="px-4 py-3 text-right">{u._count.orders}</td>
                  <td className="px-4 py-3 text-right font-semibold">{won(spent)}</td>
                  <td className="px-4 py-3 text-right text-point">{num(u.point)}P</td>
                  <td className="px-4 py-3">
                    <UserRowActions
                      id={u.id}
                      role={u.role}
                      status={u.status}
                      name={u.name ?? u.loginId ?? u.email ?? ''}
                      isOwner={isOwner}
                    />
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gim-400">
                  조건에 맞는 회원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={Math.ceil(total / SIZE)}
        basePath="/admin/users"
        query={{ q, role: sp.role, status: sp.status }}
      />
    </div>
  );
}
