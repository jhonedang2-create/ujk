import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { SITE } from '@/lib/site';
import { fmtDate } from '@/lib/utils';
import ProductCard from '@/components/ProductCard';
import WorldMap, { type MapPoint } from '@/components/WorldMap';
import { HeroArt, WaveDivider, ValueIcon, GimTexture } from '@/components/brand/Art';

export const dynamic = 'force-dynamic';

const VALUES = [
  ['origin', '국내산 김 원재료', '상품별 원산지와 원재료를 상세페이지와 제품 포장에 안내합니다.'],
  ['fire', '용도별 제품 구성', '전장 재래김부터 도시락김·식탁김까지 필요한 구성으로 고를 수 있습니다.'],
  ['shield', '제조사 정보 공개', '사업자 정보와 제조사 주소, 고객센터를 공식몰에서 확인할 수 있습니다.'],
  ['truck', '전국 택배 배송', '결제·입금 확인 후 순차 출고하며 배송 상태를 주문내역에서 확인할 수 있습니다.'],
] as const;

export default async function HomePage() {
  const [banners, featured, best, categories, notices, countries] = await Promise.all([
    prisma.banner.findMany({
      where: { isActive: true, position: 'MAIN' },
      orderBy: { sortOrder: 'asc' },
      take: 5,
    }),
    prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.product.findMany({
      where: { isActive: true, isBest: true },
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      orderBy: { soldCount: 'desc' },
      take: 4,
    }),
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.post.findMany({
      where: { isActive: true, type: 'NOTICE' },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 4,
    }),
    prisma.exportCountry.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  const hero = banners[0];
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
  const exportCount = countries.filter((c) => c.code !== 'KR').length;

  return (
    <>
      {/* ── HERO ───────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-sea-950 text-white">
        <div className="absolute inset-0 -z-10">
          {hero?.imageUrl && !hero.imageUrl.startsWith('data:') ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero.imageUrl} alt="" className="h-full w-full object-cover opacity-45" />
              <div className="absolute inset-0 bg-gradient-to-r from-sea-950 via-sea-950/85 to-sea-950/20" />
            </>
          ) : (
            <HeroArt className="h-full w-full" />
          )}
        </div>

        <div className="container-x relative py-28 sm:py-36 lg:py-44">
          <p className="reveal eyebrow mb-5 inline-flex items-center gap-2 rounded-full border border-sea-400/30 bg-sea-900/40 px-4 py-2 text-sea-100 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-sea-300" />
            충청남도 보령시 · 대천우정김 공식 홈페이지
          </p>

          <h1 className="reveal reveal-1 max-w-3xl text-[2.6rem] font-black leading-[1.12] tracking-tight sm:text-6xl lg:text-[4.2rem]">
            {hero?.title ?? '보령에서 만드는 대천우정김'}
            <br />
            <span className="bg-gradient-to-r from-sea-200 to-sea-400 bg-clip-text text-transparent">
              {hero?.subtitle ?? '공식 제품과 판매처를 확인하세요.'}
            </span>
          </h1>

          <p className="reveal reveal-2 mt-7 max-w-xl text-[15px] leading-8 text-sea-100/90 sm:text-base">
            국내산 재래김을 사용한 조미김을 다양한 구성으로 소개합니다.
            <br className="hidden sm:block" />
            고소하고 짭조름한 전통 대천김의 맛, {SITE.name}이 지켜갑니다.
          </p>

          <div className="reveal reveal-3 mt-10 flex flex-wrap gap-3">
            <Link href="/products" className="btn-point px-8 py-4 text-base shadow-lg shadow-point/20">
              제품 보러가기
            </Link>
            <Link href="/about" className="btn glass px-8 py-4 text-base text-white hover:bg-white/20">
              회사 소개
            </Link>
          </div>

          <dl className="reveal reveal-4 mt-16 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10">
            {[
              ['사업장', '보령시'],
              ['대표전화', SITE.tel],
              ['무료배송', '3만원↑'],
            ].map(([label, value]) => (
              <div key={label} className="bg-sea-950/60 px-5 py-5 backdrop-blur-sm">
                <dd className="text-2xl font-black sm:text-3xl">{value}</dd>
                <dt className="mt-1 text-[11px] text-sea-200">{label}</dt>
              </div>
            ))}
          </dl>
        </div>

        <WaveDivider className="absolute bottom-0 left-0 text-white" />
      </section>

      {/* ── 핵심 가치 ──────────────────────────── */}
      <section className="container-x py-16 sm:py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(([icon, title, desc], i) => (
            <div
              key={title}
              className={`lift reveal reveal-${i + 1} rounded-2xl border border-gim-100 bg-white p-7`}
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sea-50 text-sea-700">
                <ValueIcon name={icon} />
              </span>
              <p className="mt-5 text-base font-bold text-gim-900">{title}</p>
              <p className="mt-2 text-sm leading-6 text-gim-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 카테고리 ───────────────────────────── */}
      <section className="container-x pb-16 sm:pb-20">
        <div className="mb-9 text-center">
          <p className="eyebrow">PRODUCTS</p>
          <h2 className="section-title mt-2">제품 카테고리</h2>
          <p className="section-sub">재래김·도시락김·식탁김을 용도와 구성에 맞게 고르세요.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className="lift group relative overflow-hidden rounded-2xl border border-gim-100 bg-gradient-to-br from-gim-50 to-white p-6 text-center"
            >
              <GimTexture className="pointer-events-none absolute inset-0 h-full w-full text-sea-800/[0.05]" />
              <p className="relative text-base font-bold text-gim-900 group-hover:text-sea-800">
                {c.name}
              </p>
              <p className="relative mt-1.5 line-clamp-2 text-xs leading-5 text-gim-500">
                {c.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── BEST ───────────────────────────────── */}
      {best.length > 0 && (
        <section className="bg-gim-50 py-16 sm:py-20">
          <div className="container-x">
            <div className="mb-9 flex items-end justify-between">
              <div>
                <p className="eyebrow">BEST SELLER</p>
                <h2 className="section-title mt-2">베스트 상품</h2>
                <p className="section-sub">가장 많이 사랑받은 대천우정김 인기 제품</p>
              </div>
              <Link href="/products" className="btn-ghost btn-sm hidden sm:inline-flex">
                전체보기 →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {best.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 글로벌 ─────────────────────────────── */}
      {exportCount > 0 && (
        <section className="relative overflow-hidden bg-sea-950 py-20 text-white">
          <div className="container-x">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_1.6fr] lg:items-center">
              <div>
                <p className="eyebrow text-sea-300">GLOBAL</p>
                <h2 className="mt-3 text-3xl font-black leading-snug sm:text-4xl">
                  대천의 김,
                  <br />
                  세계로 나갑니다
                </h2>
                <p className="mt-6 text-sm leading-7 text-sea-100/90">
                  국내 자사몰과 오픈마켓은 물론, 해외 유통 파트너를 통해
                  현지 마트와 온라인몰에도 제품을 공급하고 있습니다.
                </p>
                <dl className="mt-8 flex gap-10">
                  <div>
                    <dd className="text-4xl font-black text-sea-200">{exportCount}</dd>
                    <dt className="mt-1 text-xs text-sea-300">수출 국가</dt>
                  </div>
                  <div>
                    <dd className="text-4xl font-black text-sea-200">
                      {new Set(countries.filter((c) => c.code !== 'KR').map((c) => c.region)).size}
                    </dd>
                    <dt className="mt-1 text-xs text-sea-300">진출 권역</dt>
                  </div>
                </dl>
                <Link href="/global" className="btn glass mt-9 px-7 py-3.5 text-white hover:bg-white/20">
                  판매채널 자세히 보기
                </Link>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
                <WorldMap points={points} height={360} tone="dark" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 추천 상품 ──────────────────────────── */}
      {featured.length > 0 && (
        <section className="container-x py-16 sm:py-20">
          <div className="mb-9 flex items-end justify-between">
            <div>
              <p className="eyebrow">RECOMMEND</p>
              <h2 className="section-title mt-2">추천 상품</h2>
              <p className="section-sub">명절 선물세트부터 가정용 실속 구성까지</p>
            </div>
            <Link href="/products" className="btn-ghost btn-sm hidden sm:inline-flex">
              전체보기 →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* ── 브랜드 스토리 ──────────────────────── */}
      <section className="relative bg-sea-900 py-20 text-white">
        <WaveDivider flip className="absolute -top-px left-0 text-white" />
        <div className="container-x grid items-center gap-12 pt-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-sea-300">BRAND STORY</p>
            <h2 className="mt-3 text-3xl font-black leading-snug sm:text-4xl">
              대천 바다의 시간을
              <br />그대로 담았습니다
            </h2>
            <p className="mt-6 text-sm leading-7 text-sea-100/90">
              충청남도 보령 대천 앞바다는 밀물과 썰물의 차가 크고 일조량이 풍부해
              김 양식에 최적의 조건을 갖춘 곳입니다. {SITE.name}은 이곳에서 자란 원초 중에서도
              두께와 향이 고른 것만 골라, 씻고 말리고 굽는 모든 과정을 자체 공장에서 관리합니다.
            </p>
            <p className="mt-4 text-sm leading-7 text-sea-100/90">
              화학 첨가물을 최소화하고 신선한 기름과 천일염만으로 맛을 냅니다.
              한 장을 먹어도 다른 김, 그것이 저희가 지키는 기준입니다.
            </p>
            <Link
              href="/about/process"
              className="btn-outline mt-9 border-white/25 bg-transparent text-white hover:bg-white/10"
            >
              생산공정 보기
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              ['원초 선별', '두께·향·색이 균일한 상품 원초만 선별'],
              ['세척·건조', '깨끗한 물로 반복 세척 후 저온 건조'],
              ['고온 구이', '단시간 고온 구이로 바삭한 식감 완성'],
              ['위생 포장', '질소 충전 포장으로 신선도 유지'],
            ].map(([t, d], i) => (
              <div key={t} className="rounded-2xl border border-white/12 bg-white/[0.06] p-5">
                <p className="text-[11px] font-bold tracking-wider text-sea-300">STEP {i + 1}</p>
                <p className="mt-2 text-sm font-bold">{t}</p>
                <p className="mt-1.5 text-xs leading-5 text-sea-100/70">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 공지 + 문의 ────────────────────────── */}
      <section className="container-x py-16 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="card p-8">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold">공지사항</h3>
              <Link href="/notice" className="text-xs text-gim-500 hover:text-sea-700">
                더보기 +
              </Link>
            </div>
            <ul className="divide-y divide-gim-100">
              {notices.length === 0 && (
                <li className="py-4 text-sm text-gim-400">등록된 공지사항이 없습니다.</li>
              )}
              {notices.map((n) => (
                <li key={n.id}>
                  <Link href={`/notice/${n.id}`} className="flex items-center justify-between py-3.5">
                    <span className="line-clamp-1 text-sm text-gim-700 hover:text-sea-700">
                      {n.isPinned && <span className="mr-2 text-xs font-bold text-point">중요</span>}
                      {n.title}
                    </span>
                    <span className="ml-4 shrink-0 text-xs text-gim-400">{fmtDate(n.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="card relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-gim-50 to-white p-8">
            <GimTexture className="pointer-events-none absolute inset-0 h-full w-full text-sea-800/[0.04]" />
            <div className="relative">
              <h3 className="text-lg font-bold">대량구매 · 납품 문의</h3>
              <p className="mt-2 text-sm leading-6 text-gim-600">
                기업 명절 선물세트와 단체·유통 대량구매 문의를 받고 있습니다.
                담당자가 확인 후 영업일 기준 1일 이내에 연락드립니다.
              </p>
            </div>
            <div className="relative mt-6">
              <p className="text-xl font-black text-sea-800">{SITE.tel}</p>
              <p className="mt-1 text-xs text-gim-500">{SITE.csHours}</p>
              <Link href="/contact?type=BULK" className="btn-primary mt-5 w-full sm:w-auto">
                문의 남기기
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
