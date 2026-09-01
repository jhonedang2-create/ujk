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
        <div className="mb-14 grid overflow-hidden rounded-[2rem] bg-sea-950 text-white lg:grid-cols-[1.2fr_.8fr]">
          <div className="p-8 sm:p-12">
            <p className="eyebrow text-sea-300">OUR HISTORY</p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              대천의 바다에서 시작한
              <br />대천우정김의 걸어온 길
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-sea-100/80">
              최초 홈페이지에 수록된 회사 연혁을 그대로 복구했습니다. 판매량·인증·수상·설비 관련
              항목은 회사 제공자료 기준이며, 상용 공개 전 관련 증빙과 최종 대조가 필요합니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-white/10 p-px lg:grid-cols-1">
            <div className="flex flex-col justify-center bg-sea-900 p-7">
              <span className="text-[10px] font-bold tracking-[.18em] text-sea-300">BASE</span>
              <strong className="mt-2 text-xl">충남 보령</strong>
              <small className="mt-1 text-sea-200/70">회사 사업장 소재지</small>
            </div>
            <div className="flex flex-col justify-center bg-sea-900 p-7">
              <span className="text-[10px] font-bold tracking-[.18em] text-sea-300">RECORD</span>
              <strong className="mt-2 text-xl">2010—2026</strong>
              <small className="mt-1 text-sea-200/70">최초 홈페이지 수록 연혁</small>
            </div>
          </div>
        </div>

        {years.length === 0 && (
          <p className="text-sm text-gim-400">등록된 연혁이 없습니다. 관리자 페이지에서 등록해 주세요.</p>
        )}

        <div className="relative">
          <div className="absolute left-[7px] top-2 hidden h-[calc(100%-1rem)] w-px bg-gim-200 sm:block sm:left-[103px]" />

          {years.map((year) => (
            <div key={year} className="relative mb-12 rounded-2xl border border-gim-100 bg-white p-6 shadow-sm sm:flex sm:gap-10 sm:p-8">
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
                      <p className="text-[15px] font-medium leading-7 text-gim-800">{h.content}</p>
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
