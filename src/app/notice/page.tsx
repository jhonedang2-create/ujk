import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PageHero from '@/components/PageHero';
import Pagination from '@/components/Pagination';
import Empty from '@/components/Empty';
import { fmtDate, cn } from '@/lib/utils';

export const metadata = { title: '공지사항' };
export const dynamic = 'force-dynamic';

const TABS: [string, string][] = [
  ['NOTICE', '공지사항'],
  ['PRESS', '보도자료'],
  ['FAQ', '자주묻는질문'],
];
const SIZE = 10;

export default async function NoticePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const type = TABS.some(([t]) => t === sp.type) ? sp.type! : 'NOTICE';
  const page = Math.max(1, Number(sp.page ?? 1));
  const q = sp.q?.trim();

  const where = {
    isActive: true,
    type,
    ...(q ? { title: { contains: q } } : {}),
  };

  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * SIZE,
      take: SIZE,
    }),
  ]);

  return (
    <>
      <PageHero title="고객센터" subtitle="대천우정김의 새로운 소식과 자주 묻는 질문을 확인하세요." breadcrumb={[['고객센터', '/notice']]} />

      <section className="container-x py-16">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {TABS.map(([t, label]) => (
              <Link
                key={t}
                href={`/notice?type=${t}`}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-semibold',
                  t === type ? 'bg-sea-800 text-white' : 'bg-gim-50 text-gim-600 hover:bg-gim-100'
                )}
              >
                {label}
              </Link>
            ))}
          </div>

          <form className="flex gap-2" action="/notice">
            <input type="hidden" name="type" value={type} />
            <input name="q" defaultValue={q} placeholder="제목 검색" className="input w-52 py-2" />
            <button className="btn-outline btn-sm">검색</button>
          </form>
        </div>

        {posts.length === 0 ? (
          <Empty text="등록된 게시글이 없습니다." />
        ) : (
          <ul className="border-t-2 border-gim-800">
            {posts.map((p) => (
              <li key={p.id} className="border-b border-gim-100">
                <Link href={`/notice/${p.id}`} className="flex items-center gap-4 px-2 py-5 hover:bg-gim-50">
                  {p.isPinned && <span className="badge bg-point text-white">중요</span>}
                  <span className="line-clamp-1 flex-1 text-[15px] text-gim-800">{p.title}</span>
                  <span className="hidden text-xs text-gim-400 sm:block">조회 {p.viewCount}</span>
                  <span className="shrink-0 text-xs text-gim-400">{fmtDate(p.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={page}
          totalPages={Math.ceil(total / SIZE)}
          basePath="/notice"
          query={{ type, q }}
        />
      </section>
    </>
  );
}
