import PageHero from '@/components/PageHero';
import { ProcessIcon, WaveDivider, GimTexture } from '@/components/brand/Art';

export const metadata = { title: '생산공정' };

const STEPS = [
  { t: '원재료 입고', d: '입고된 김 원재료의 표시사항과 상태를 확인합니다.' },
  { t: '원재료 선별', d: '제품 생산에 사용할 원재료를 기준에 따라 구분하고 준비합니다.' },
  { t: '구이', d: '제품 규격에 맞춰 김을 굽는 공정을 진행합니다.' },
  { t: '조미', d: '상품 유형에 따라 기름과 소금 등으로 조미합니다.' },
  { t: '절단·포장', d: '전장김, 도시락김, 식탁김 등 상품 규격에 맞춰 나누어 포장합니다.' },
  { t: '표시 확인·출고', d: '상품명, 구성, 원재료, 소비기한 등 제품 표시를 확인한 뒤 주문 순서에 따라 출고합니다.' },
];

export default function ProcessPage() {
  return (
    <>
      <PageHero
        title="생산공정"
        subtitle="원재료 입고부터 포장과 출고까지 제품의 기본 흐름을 안내합니다."
        breadcrumb={[['회사소개', '/about'], ['생산공정', '/about/process']]}
      />

      <section className="container-x py-16 sm:py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div
              key={s.t}
              className={`lift reveal reveal-${(i % 4) + 1} relative overflow-hidden rounded-2xl border border-gim-100 bg-white p-6`}
            >
              <GimTexture className="pointer-events-none absolute inset-0 h-full w-full text-sea-800/[0.04]" />
              <div className="relative flex items-start justify-between">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sea-50 text-sea-700">
                  <ProcessIcon step={i + 1} />
                </span>
                <span className="text-2xl font-black text-gim-100">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <p className="relative mt-5 text-base font-bold text-gim-900">{s.t}</p>
              <p className="relative mt-2 text-sm leading-6 text-gim-500">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative bg-sea-900 py-16 text-white sm:py-20">
        <WaveDivider flip className="absolute -top-px left-0 text-white" />
        <div className="container-x pt-8">
          <p className="eyebrow text-sea-300">QUALITY CONTROL</p>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">제품 정보 확인 원칙</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              ['제조사 표시', '제조사명과 사업장 주소, 고객센터 정보를 공개합니다.'],
              ['상품 구성', '매수와 봉 수를 상품명과 상세정보에 함께 표시합니다.'],
              ['식품 표시', '원재료·보관방법·소비기한은 실제 제품 포장 표시를 우선합니다.'],
              ['고객 문의', '표시사항이나 주문 내용이 다를 경우 고객센터에서 확인합니다.'],
            ].map(([t, d]) => (
              <li key={t} className="rounded-2xl border border-white/12 bg-white/[0.06] p-6">
                <p className="text-sm font-bold text-sea-200">{t}</p>
                <p className="mt-2 text-sm leading-6 text-sea-100/80">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
