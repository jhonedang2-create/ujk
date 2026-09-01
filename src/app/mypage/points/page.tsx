import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { fmtDate, num } from '@/lib/utils';
import Empty from '@/components/Empty';

export const metadata = { title: '적립금 내역' };
export const dynamic = 'force-dynamic';

export default async function PointsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/mypage/points');
  const userId = session.user.id;

  const [user, logs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.pointLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between p-7">
        <p className="text-sm font-semibold text-gim-600">보유 적립금</p>
        <p className="text-3xl font-black text-point">{num(user?.point)}P</p>
      </div>

      {logs.length === 0 ? (
        <Empty text="적립금 내역이 없습니다." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gim-50 text-xs text-gim-500">
              <tr>
                <th className="px-5 py-3 text-left font-medium">일자</th>
                <th className="px-5 py-3 text-left font-medium">내용</th>
                <th className="px-5 py-3 text-right font-medium">증감</th>
                <th className="px-5 py-3 text-right font-medium">잔액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gim-100">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-5 py-3.5 text-gim-500">{fmtDate(l.createdAt)}</td>
                  <td className="px-5 py-3.5">{l.reason}</td>
                  <td className={`px-5 py-3.5 text-right font-semibold ${l.amount > 0 ? 'text-sea-700' : 'text-point'}`}>
                    {l.amount > 0 ? '+' : ''}{num(l.amount)}P
                  </td>
                  <td className="px-5 py-3.5 text-right text-gim-500">{num(l.balance)}P</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
