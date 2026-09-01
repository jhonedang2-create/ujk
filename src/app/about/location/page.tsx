import { SITE } from '@/lib/site';
import PageHero from '@/components/PageHero';

export const metadata = { title: '오시는길' };

export default function LocationPage() {
  const q = encodeURIComponent(`${SITE.name} ${SITE.address}`);

  return (
    <>
      <PageHero
        title="오시는길"
        subtitle={SITE.address}
        breadcrumb={[['회사소개', '/about'], ['오시는길', '/about/location']]}
      />

      <section className="container-x py-16 sm:py-20">
        {/* 지도: 별도 API 키 없이 동작하는 OSM 임베드. 카카오맵 키가 있으면 교체하세요. */}
        <div className="overflow-hidden rounded-xl border border-gim-200">
          <iframe
            title="오시는길 지도"
            className="h-[420px] w-full"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${SITE.map.lng - 0.01}%2C${SITE.map.lat - 0.008}%2C${SITE.map.lng + 0.01}%2C${SITE.map.lat + 0.008}&layer=mapnik&marker=${SITE.map.lat}%2C${SITE.map.lng}`}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`https://map.kakao.com/link/search/${q}`}
            target="_blank"
            rel="noreferrer"
            className="btn-outline btn-sm"
          >
            카카오맵으로 열기
          </a>
          <a
            href={`https://map.naver.com/p/search/${q}`}
            target="_blank"
            rel="noreferrer"
            className="btn-outline btn-sm"
          >
            네이버지도로 열기
          </a>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="card p-7">
            <h3 className="text-lg font-bold">본사 · 공장</h3>
            <dl className="mt-5 space-y-3 text-sm">
              {[
                ['주소', SITE.address],
                ['우편번호', SITE.zipcode],
                ['전화', SITE.tel],
                ['팩스', SITE.fax],
                ['이메일', SITE.email],
                ['상담시간', SITE.csHours],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-4">
                  <dt className="w-20 shrink-0 font-semibold text-gim-500">{k}</dt>
                  <dd className="text-gim-800">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card p-7">
            <h3 className="text-lg font-bold">교통 안내</h3>
            <div className="mt-5 space-y-5 text-sm leading-6 text-gim-700">
              <div>
                <p className="font-semibold text-sea-800">자가용</p>
                <p className="mt-1 text-gim-600">
                  서해안고속도로 대천IC에서 보령 시내 방면으로 이동 후 남곡동 황골길로 진입하세요.
                </p>
              </div>
              <div>
                <p className="font-semibold text-sea-800">기차</p>
                <p className="mt-1 text-gim-600">
                  장항선 대천역 하차 → 택시 약 10분 소요.
                </p>
              </div>
              <div>
                <p className="font-semibold text-sea-800">고속버스</p>
                <p className="mt-1 text-gim-600">
                  보령(대천) 종합터미널 하차 → 택시 약 10분 소요.
                </p>
              </div>
              <p className="rounded-lg bg-gim-50 p-4 text-xs text-gim-500">
                ※ 방문 가능 여부와 정확한 경로는 출발 전 고객센터로 확인해 주세요.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
