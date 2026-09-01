import { guardPage } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { fmtDate, num, won } from '@/lib/utils';
import { USER_GRADE } from '@/lib/site';
import Pagination from '@/components/Pagination';
import UserRowActions from '@/components/admin/UserRowActions';

export const dynamic = 'force-dynamic';
const SIZE = 20;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; role?: string }>;
}) {
  const session = await guardPage('users');
  const isOwner = session.user.role === 'ADMIN';

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const q = sp.q?.trim();

  const where = {
    ...(sp.role ? { role: sp.role } : {}),
    ...(q
      ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * SIZE,
      take: SIZE,
      include: {
        _count: { select: { orders: true } },
        orders: { where: { status: { in: ['PAID', 'PREPARING', 'SHIPPING', 'DELIVERED'] } }, select: { totalAmount: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">회원 관리 <span className="text-sm font-normal text-gim-400">({total})</span></h1>

      <form action="/admin/users" className="flex flex-wrap gap-2">
        <select name="role" defaultValue={sp.role ?? ''} className="input w-36 py-2">
          <option value="">전체 권한</option>
          <option value="USER">일반회원</option>
          <option value="ADMIN">관리자</option>
        </select>
        <input name="q" defaultValue={q} placeholder="이름 · 이메일 · 연락처" className="input w-60 py-2" />
        <button className="btn-outline btn-sm">검색</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
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
              const spent = u.orders.reduce((s, o) => s + o.totalAmount, 0);
              return (
                <tr key={u.id} className="hover:bg-gim-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {u.name ?? '-'}
                      {u.role === 'ADMIN' && <span className="badge ml-2 bg-point text-white">관리자</span>}
                      {u.status === 'BANNED' && <span className="badge ml-2 bg-gim-200 text-gim-600">차단</span>}
                    </p>
                    <p className="text-[11px] text-gim-400">
                      {u.email} · {u.phone ?? '-'} · {fmtDate(u.createdAt)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gim-600">
                    {u.provider === 'naver' ? '네이버' : u.provider === 'kakao' ? '카카오' : '이메일'}
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
                      name={u.name ?? u.email ?? ''}
                      isOwner={isOwner}
                    />
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={7} className="py-16 text-center text-gim-400">회원이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={Math.ceil(total / SIZE)} basePath="/admin/users" query={{ q, role: sp.role }} />
    </div>
  );
}
