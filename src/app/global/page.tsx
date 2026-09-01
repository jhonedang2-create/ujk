import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { SITE } from '@/lib/site';
import PageHero from '@/components/PageHero';
import WorldMap, { type MapPoint } from '@/components/WorldMap';
import Empty from '@/components/Empty';

export const metadata = {
  title: '공식 판매채널',
  description: '대천우정김의 확인된 공식 온라인 판매 채널을 안내합니다.',
};
export const dynamic = 'force-dynamic';

const REGION: Record<string, string> = {
  ASIA: '아시아',
  AMERICAS: '미주',
  EUROPE: '유럽',
  OCEANIA: '오세아니아',
  MEA: '중동·아프리카',
};

export default async function GlobalPage() {
  const [countries, channels] = await Promise.all([
    prisma.exportCountry.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.salesChannel.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
  ]);

  const points: MapPoint[] = countries.map((c) => ({
    code: c.code,
    name: c.name,
    nameEn: c.nameEn,
    x: c.mapX,
    y: c.mapY,
    since: c.since,
    channel: c.channel,
    home: c.code === 'KR',
  }));

  const exportCountries = countries.filter((c) => c.code !== 'KR');
  const byRegion = Object.keys(REGION)
    .map((r) => ({ key: r, label: REGION[r], list: exportCountries.filter((c) => c.region === r) }))
    .filter((g) => g.list.length > 0);

  const online = channels.filter((c) => c.type === 'ONLINE');
  const offline = channels.filter((c) => c.type === 'OFFLINE');
  const exportCh = channels.filter((c) => c.type === 'EXPORT');

  return (
    <>
      <PageHero
        title="공식 판매채널"
        subtitle="대천우정김 제품을 만날 수 있는 확인된 판매처를 안내합니다."
        breadcrumb={[['글로벌·판매채널', '/global']]}
      />

      {/* 실제 등록된 수출 실적이 있을 때만 공개합니다. */}
      {exportCountries.length > 0 && (
      <section className="border-b border-gim-100 bg-gradient-to-b from-sea-50/60 to-white py-16 sm:py-20">
        <div className="container-x">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-widest text-sea-600">GLOBAL NETWORK</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">수출 현황</h2>
            </div>
            <dl className="flex gap-8">
              <div>
                <dt className="text-xs text-gim-400">수출 국가</dt>
                <dd className="text-3xl font-black text-sea-800">
                  {exportCountries.length}
                  <span className="ml-1 text-base font-bold">개국</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gim-400">진출 권역</dt>
                <dd className="text-3xl font-black text-sea-800">
                  {byRegion.length}
                  <span className="ml-1 text-base font-bold">개 권역</span>
                </dd>
              </div>
            </dl>
          </div>

          {points.length === 0 ? (
            <Empty
              text="아직 등록된 수출 국가가 없습니다."
              sub="관리자 페이지 &gt; 글로벌 관리에서 등록하면 이 지도에 표시됩니다."
            />
          ) : (
            <>
              <div className="rounded-3xl border border-gim-100 bg-white p-4 sm:p-8">
                <WorldMap points={points} />
                <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-gim-500">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-point" /> 본사 · 생산공장 (대한민국 보령)
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-sea-600" /> 수출 국가
                  </span>
                </div>
              </div>

              {/* 권역별 */}
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {byRegion.map((g) => (
                  <div key={g.key} className="card p-6">
                    <p className="text-xs font-semibold tracking-wider text-sea-600">{g.label}</p>
                    <p className="mt-1 text-2xl font-black text-gim-900">{g.list.length}개국</p>
                    <ul className="mt-4 space-y-2.5">
                      {g.list.map((c) => (
                        <li key={c.id} className="flex items-baseline gap-2 text-sm">
                          <span className="font-semibold text-gim-800">{c.name}</span>
                          {c.since && <span className="text-[11px] text-gim-400">{c.since}~</span>}
                          {c.channel && (
                            <span className="ml-auto truncate text-[11px] text-gim-500">{c.channel}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
      )}

      {/* 판매 채널 */}
      <section className="container-x py-16 sm:py-20">
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-widest text-sea-600">SALES CHANNEL</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">판매 채널</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gim-500">
            운영 주체와 판매자 정보가 확인된 채널만 안내합니다. 가격과 구성은 각 판매처에서 다시 확인해 주세요.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {[
            ['온라인', online, '자사몰 · 오픈마켓'],
            ['오프라인', offline, '유통 · 급식 · 특판'],
            ['수출', exportCh, '해외 바이어 · 현지 유통'],
          ].filter(([, list]) => (list as typeof channels).length > 0).map(([label, list, sub]) => {
            const rows = list as typeof channels;
            return (
              <div key={label as string} className="card p-7">
                <p className="text-base font-bold text-gim-900">{label as string}</p>
                <p className="mt-1 text-xs text-gim-400">{sub as string}</p>
                <ul className="mt-5 space-y-3">
                  {rows.map((c) => (
                    <li key={c.id} className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sea-500" />
                      <div className="min-w-0">
                        {c.url ? (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-gim-800 hover:text-sea-700 hover:underline"
                          >
                            {c.name}
                          </a>
                        ) : (
                          <span className="text-sm font-semibold text-gim-800">{c.name}</span>
                        )}
                        {c.note && <p className="text-xs text-gim-500">{c.note}</p>}
                      </div>
                    </li>
                  ))}
                  {rows.length === 0 && <li className="text-xs text-gim-400">등록된 채널이 없습니다.</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* 바이어 문의 */}
      <section className="bg-sea-900 py-16 text-white sm:py-20">
        <div className="container-x grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="text-xs font-semibold tracking-widest text-sea-300">BUSINESS INQUIRY</p>
            <h2 className="mt-3 text-2xl font-black leading-snug sm:text-3xl">
              대량구매 · 유통 제휴를
              <br />문의해 주세요
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-sea-100">
              필요한 제품과 수량, 희망 납기를 알려주시면 담당자가 가능 여부를 확인한 뒤 연락드립니다.
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/5 p-7">
            <p className="text-sm font-bold">사업 제휴 문의</p>
            <p className="mt-3 text-2xl font-black">{SITE.tel}</p>
            <p className="mt-1 text-xs text-sea-200">{SITE.email}</p>
            <p className="mt-4 text-xs leading-5 text-sea-200">{SITE.csHours}</p>
            <Link href="/contact?type=PARTNER" className="btn-point mt-6 w-full">
              대량구매 · 제휴 문의하기
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
