import { prisma } from '@/lib/prisma';
import PageHero from '@/components/PageHero';
import Empty from '@/components/Empty';

export const metadata = { title: '등록·인증현황' };
export const dynamic = 'force-dynamic';

export default async function CertificationPage() {
  const certs = await prisma.certification.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <>
      <PageHero
        title="등록·인증현황"
        subtitle="사업자 등록과 통신판매업 신고를 포함해 확인 가능한 등록·인증 정보를 안내합니다."
        breadcrumb={[['회사소개', '/about'], ['등록·인증현황', '/about/certification']]}
      />

      <section className="container-x py-16 sm:py-20">
        <div className="mb-12 max-w-3xl">
          <p className="eyebrow">DOCUMENTS &amp; REGISTRATION</p>
          <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
            확인 가능한 정보만
            <br />투명하게 공개합니다
          </h2>
          <p className="mt-5 text-sm leading-7 text-gim-500">
            아래 번호는 회사의 사업자·통신판매 등록 정보입니다. 품질·위생 인증은 인증서 원본과
            유효기간을 확인한 뒤 별도 항목으로 공개합니다.
          </p>
        </div>

        {certs.length === 0 ? (
          <Empty text="등록된 인증 정보가 없습니다." sub="관리자 페이지에서 인증서를 등록해 주세요." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {certs.map((c) => (
              <div key={c.id} className="overflow-hidden rounded-3xl border border-gim-100 bg-white shadow-sm">
                <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-gradient-to-br from-sea-950 to-sea-800 text-white">
                  <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_center,white_0,transparent_1px)] [background-size:18px_18px]" />
                  {c.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt={c.name} className="relative h-full w-full object-contain p-4" />
                  ) : (
                    <div className="relative text-center">
                      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl">✓</span>
                      <span className="mt-3 block text-[10px] font-bold tracking-[.18em] text-sea-200">REGISTERED DOCUMENT</span>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-base font-black text-gim-900">{c.name}</p>
                    <span className="rounded-full bg-sea-50 px-2.5 py-1 text-[9px] font-bold text-sea-700">등록정보</span>
                  </div>
                  {c.issuer && <p className="mt-2 text-xs text-gim-500">발급·신고기관 {c.issuer}</p>}
                  {c.number && <p className="mt-1 text-xs font-semibold text-gim-700">번호 {c.number}</p>}
                  {c.issuedAt && <p className="mt-1 text-xs text-gim-400">등록 {c.issuedAt}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-10 text-xs leading-6 text-gim-400">
          ※ 등록·인증 정보는 갱신 시점에 따라 변동될 수 있습니다. 최신 원본 확인이 필요하신 경우 고객센터로 요청해 주세요.
        </p>
      </section>
    </>
  );
}
