import { prisma } from '@/lib/prisma';
import PageHero from '@/components/PageHero';

export const metadata = { title: '연혁' };
export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const rows = await prisma.history.findMany({
    where: { isActive: true },
    orderBy: [{ year: 'desc' }, { sortOrder: 'asc' }],
  });

  const grouped = rows.reduce<Record<string, typeof rows>>((acc, r) => {
    (acc[r.year] ||= []).push(r);
    return acc;
  }, {});

  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  return (
    <>
      <PageHero
        title="연혁"
        subtitle="작은 김 공장에서 시작해 보령을 대표하는 김 가공 기업으로. 대천우정김이 걸어온 길입니다."
        breadcrumb={[['회사소개', '/about'], ['연혁', '/about/history']]}
      />

      <section className="container-x py-16 sm:py-20">
        {years.length === 0 && (
          <p className="text-sm text-gim-400">등록된 연혁이 없습니다. 관리자 페이지에서 등록해 주세요.</p>
        )}

        <div className="relative">
          <div className="absolute left-[7px] top-2 hidden h-[calc(100%-1rem)] w-px bg-gim-200 sm:block sm:left-[103px]" />

          {years.map((year) => (
            <div key={year} className="relative mb-12 sm:flex sm:gap-10">
              <div className="mb-4 sm:mb-0 sm:w-[104px] sm:shrink-0 sm:text-right">
                <span className="text-2xl font-black text-sea-800">{year}</span>
              </div>

              <ul className="space-y-4 sm:flex-1 sm:pl-10">
                {grouped[year].map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[46px] top-2 hidden h-[15px] w-[15px] rounded-full border-[3px] border-sea-600 bg-white sm:block" />
                    <div className="flex gap-4">
                      {h.month && (
                        <span className="w-9 shrink-0 pt-0.5 text-sm font-bold text-gim-400">
                          {h.month}월
                        </span>
                      )}
                      <p className="text-[15px] leading-7 text-gim-800">{h.content}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
