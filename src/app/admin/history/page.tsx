import { guardPage } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import HistoryManager from '@/components/admin/HistoryManager';

export const dynamic = 'force-dynamic';

export default async function AdminHistoryPage() {
  await guardPage('content');

  const rows = await prisma.history.findMany({
    orderBy: [{ year: 'desc' }, { sortOrder: 'asc' }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">연혁 관리</h1>
        <p className="mt-1 text-sm text-gim-500">
          여기서 등록한 내용이 회사소개 &gt; 연혁 페이지에 연도별로 정리되어 표시됩니다.
        </p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <p className="font-bold">⚠️ 공개 전 증빙을 확인해 주세요</p>
        <p className="mt-1">
          증빙이 확인된 실제 회사 이력만 등록해 주세요. 저장한 내용은 공개 페이지에 바로 표시됩니다.
          사실과 다른 실적·인증을 홈페이지에 표시하면 「표시·광고의 공정화에 관한 법률」상
          허위·과장광고에 해당할 수 있습니다.
        </p>
      </div>

      <HistoryManager
        rows={rows.map((r) => ({
          id: r.id,
          year: r.year,
          month: r.month,
          content: r.content,
          sortOrder: r.sortOrder,
        }))}
      />
    </div>
  );
}
