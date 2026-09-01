import Link from 'next/link';
import { SITE } from '@/lib/site';
import PageHero from '@/components/PageHero';

export const metadata = { title: '회사소개' };

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="회사소개"
        subtitle={SITE.description}
        breadcrumb={[['회사소개', '/about']]}
      />

      <section className="container-x py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="text-xs font-semibold tracking-widest text-sea-600">GREETINGS</p>
            <h2 className="mt-3 text-3xl font-black leading-snug">
              한 장의 김에도
              <br />신뢰를 담습니다
            </h2>
          </div>
          <div className="prose-kr text-[15px]">
            <p>
              안녕하십니까. {SITE.name} 홈페이지를 찾아주신 여러분께 진심으로 감사드립니다.
            </p>
            <p>
              저희 {SITE.name}은 충청남도 보령시 대천에 자리 잡은 김 가공 전문 기업입니다.
              조수간만의 차가 크고 일조량이 풍부한 대천 앞바다에서 자란 우수한 국산 원초만을
              엄선하여, 조미김·재래김·파래김을 생산하고 있습니다.
            </p>
            <p>
              &lsquo;내 가족이 먹는 김&rsquo;이라는 마음가짐으로 원초 선별부터 세척, 건조, 구이, 포장에
              이르는 전 과정을 직접 관리합니다. 화학 첨가물은 최소화하고, 신선한 기름과 천일염만으로
              대천김 본연의 고소함을 살리는 것이 저희의 원칙입니다.
            </p>
            <p>
              대천우정김의 제품 정보와 표시사항을 정확하게 전달하고, 안심하고 주문할 수 있는
              제조사 직영 온라인몰이 되겠습니다. 변함없는 관심과 성원을 부탁드립니다.
            </p>
            <p className="mt-6 font-semibold text-gim-900">
              {SITE.name} 대표이사 {SITE.ceo}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-gim-50 py-16 sm:py-20">
        <div className="container-x">
          <h2 className="section-title mb-8">기업 개요</h2>
          <div className="overflow-hidden rounded-xl border border-gim-200 bg-white">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gim-100">
                {[
                  ['회사명', SITE.name],
                  ['영문명', SITE.nameEn],
                  ['대표이사', SITE.ceo],
                  ['사업자등록번호', SITE.bizNo],
                  ['본사 주소', SITE.address],
                  ['대표 전화', `${SITE.tel} (FAX ${SITE.fax})`],
                  ['이메일', SITE.email],
                  ['사업 분야', '조미김·재래김·파래김 제조 및 판매'],
                  ['주요 품목', '조미구이 재래김, 파래김, 가정용 김 · 선물용 김 세트'],
                  ['판매 채널', '자사몰, 우체국쇼핑, 온라인 오픈마켓'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <th className="w-40 bg-gim-50 px-5 py-3.5 text-left font-semibold text-gim-700 sm:w-52">
                      {k}
                    </th>
                    <td className="px-5 py-3.5 text-gim-800">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            {[
              ['연혁', '/about/history', '걸어온 길'],
              ['생산공정', '/about/process', '만드는 과정'],
              ['인증현황', '/about/certification', '품질의 근거'],
              ['오시는길', '/about/location', '찾아오시는 방법'],
            ].map(([label, href, sub]) => (
              <Link
                key={href}
                href={href}
                className="card p-6 transition hover:border-sea-300 hover:shadow-sm"
              >
                <p className="text-base font-bold text-gim-900">{label}</p>
                <p className="mt-1 text-xs text-gim-500">{sub}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
