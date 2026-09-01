import { guardPage } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import GlobalManager from '@/components/admin/GlobalManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: '글로벌 관리' };

export default async function AdminGlobalPage() {
  await guardPage('content');

  const [countries, channels] = await Promise.all([
    prisma.exportCountry.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.salesChannel.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">글로벌 · 판매채널 관리</h1>
        <p className="mt-1 text-sm text-gim-500">
          여기서 등록한 내용이 홈페이지 <strong>글로벌·판매채널</strong> 페이지의 지도와 목록에 그대로 표시됩니다.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <p className="font-bold">⚠️ 공개 전 증빙을 확인해 주세요</p>
        <p className="mt-1">
          수출 국가와 판매채널은 저장 즉시 공개 페이지에 표시됩니다. 계약·거래 내역 등 근거가 있는
          정보만 등록하고, 확인되지 않은 항목은 &lsquo;노출 끄기&rsquo;로 유지해 주세요.
        </p>
      </div>

      <GlobalManager
        countries={countries.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          nameEn: c.nameEn,
          region: c.region,
          mapX: c.mapX,
          mapY: c.mapY,
          since: c.since,
          partner: c.partner,
          channel: c.channel,
          note: c.note,
          sortOrder: c.sortOrder,
          isActive: c.isActive,
        }))}
        channels={channels.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          url: c.url,
          note: c.note,
          sortOrder: c.sortOrder,
          isActive: c.isActive,
        }))}
      />
    </div>
  );
}
