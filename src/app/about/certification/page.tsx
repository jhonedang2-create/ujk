import { prisma } from '@/lib/prisma';
import PageHero from '@/components/PageHero';
import Empty from '@/components/Empty';

export const metadata = { title: '인증현황' };
export const dynamic = 'force-dynamic';

export default async function CertificationPage() {
  const certs = await prisma.certification.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <>
      <PageHero
        title="인증현황"
        subtitle="말보다 확실한 증거. 대천우정김이 보유한 인증과 등록 현황입니다."
        breadcrumb={[['회사소개', '/about'], ['인증현황', '/about/certification']]}
      />

      <section className="container-x py-16 sm:py-20">
        {certs.length === 0 ? (
          <Empty text="등록된 인증 정보가 없습니다." sub="관리자 페이지에서 인증서를 등록해 주세요." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {certs.map((c) => (
              <div key={c.id} className="card overflow-hidden">
                <div className="flex aspect-[3/4] items-center justify-center bg-gim-50">
                  {c.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt={c.name} className="h-full w-full object-contain p-4" />
                  ) : (
                    <span className="text-xs text-gim-300">인증서 이미지 준비중</span>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-sm font-bold text-gim-900">{c.name}</p>
                  {c.issuer && <p className="mt-1 text-xs text-gim-500">{c.issuer}</p>}
                  {c.number && <p className="mt-0.5 text-xs text-gim-400">인증번호 {c.number}</p>}
                  {c.issuedAt && <p className="mt-0.5 text-xs text-gim-400">취득 {c.issuedAt}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-10 text-xs leading-6 text-gim-400">
          ※ 인증 정보는 갱신 시점에 따라 변동될 수 있습니다. 최신 인증서 원본이 필요하신 경우 고객센터로 요청해 주세요.
        </p>
      </section>
    </>
  );
}
