import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { fmtDate } from '@/lib/utils';
import Empty from '@/components/Empty';

export const metadata = { title: '문의내역' };
export const dynamic = 'force-dynamic';

const STATUS: Record<string, string> = {
  OPEN: '답변 대기',
  ANSWERED: '답변 완료',
  CLOSED: '종료',
};

export default async function MyInquiriesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/mypage/inquiries');

  const rows = await prisma.inquiry.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">문의내역</h1>
          <p className="mt-1 text-sm text-gim-500">접수한 문의와 관리자 답변을 한곳에서 확인할 수 있습니다.</p>
        </div>
        <Link href="/contact" className="btn-primary btn-sm px-5">새 문의하기</Link>
      </div>

      {rows.length === 0 ? (
        <Empty text="접수한 문의가 없습니다." />
      ) : (
        <div className="space-y-3">
          {rows.map((q) => (
            <article key={q.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-gim-400">{fmtDate(q.createdAt, true)}</p>
                  <h2 className="mt-1 font-bold">{q.title}</h2>
                </div>
                <span className={q.status === 'ANSWERED' ? 'badge bg-sea-50 text-sea-800' : 'badge bg-gim-100 text-gim-600'}>
                  {STATUS[q.status] ?? q.status}
                </span>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gim-600">{q.content}</p>
              {q.answer && (
                <div className="mt-4 rounded-xl border-l-4 border-sea-700 bg-sea-50 p-4">
                  <p className="text-xs font-bold text-sea-800">대천우정김 답변</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gim-700">{q.answer}</p>
                  {q.answeredAt && <p className="mt-2 text-[11px] text-gim-400">{fmtDate(q.answeredAt, true)}</p>}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
