import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { SITE } from '@/lib/site';
import { fmtDate } from '@/lib/utils';
import ProductCard from '@/components/ProductCard';
import WorldMap, { type MapPoint } from '@/components/WorldMap';
import { WaveDivider, ValueIcon, GimTexture } from '@/components/brand/Art';

export const dynamic = 'force-dynamic';

const VALUES = [
  ['origin', '국내산 김 원재료', '상품별 원산지와 원재료를 상세페이지와 제품 포장에 안내합니다.'],
  ['fire', '용도별 제품 구성', '전장 재래김부터 도시락김·식탁김까지 필요한 구성으로 고를 수 있습니다.'],
  ['shield', '제조사 직접 운영', '사업자 정보와 제조사 주소, 고객센터를 자사몰에서 확인할 수 있습니다.'],
  ['truck', '전국 택배 배송', '결제·입금 확인 후 순차 출고하며 배송 상태를 주문내역에서 확인할 수 있습니다.'],
] as const;

export default async function HomePage() {
  const [banners, featured, best, productCount, categories, notices, countries] = await Promise.all([
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
    prisma.product.count({ where: { isActive: true } }),
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
          {/* 실제 제품이 아닌 식탁 연출 이미지입니다. 상품 패키지는 우측 카드에 별도로 표시합니다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero?.imageUrl && !hero.imageUrl.startsWith('data:') ? hero.imageUrl : '/story/hero-sea-table.webp'}
            alt="따뜻한 밥과 바삭한 김을 차린 식탁 연출 이미지"
            className="h-full w-full object-cover object-[64%_center] opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-sea-950 via-sea-950/90 to-sea-950/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-sea-950/60 via-transparent to-sea-950/25" />
        </div>

        <div className="container-x relative flex min-h-[720px] items-center py-24 sm:py-32 lg:py-36">
          <div className="max-w-3xl">
            <p className="reveal eyebrow mb-5 inline-flex items-center gap-2 rounded-full border border-sea-400/30 bg-sea-900/50 px-4 py-2 text-sea-100 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-sea-300" />
              충청남도 보령시 · 대천우정김 직영 자사몰
            </p>

            <h1 className="reveal reveal-1 max-w-3xl text-[2.8rem] font-black leading-[1.08] tracking-[-0.055em] sm:text-6xl lg:text-[4.6rem]">
              {hero?.title ?? '서해의 바삭함을'}
              <br />
              <span className="bg-gradient-to-r from-[#f4dfaa] to-[#d7b45f] bg-clip-text text-transparent">
                {hero?.subtitle ?? '한 장에 담다'}
              </span>
            </h1>

            <p className="reveal reveal-2 mt-7 max-w-xl text-[15px] leading-8 text-sea-50/90 sm:text-base">
              따뜻한 밥 한 숟갈이 기다려지는 바삭한 김.
              <br className="hidden sm:block" />
              보령 대천에서 만드는 실제 제품과 구성을 확인해 보세요.
            </p>

            <div className="reveal reveal-3 mt-10 flex flex-wrap gap-3">
              <Link href="/products" className="btn bg-[#e5ca86] px-8 py-4 text-base text-sea-950 shadow-xl shadow-black/15 hover:bg-[#f0dba7]">
                전체 상품 쇼핑하기
              </Link>
              <Link href="/cart" className="btn glass px-8 py-4 text-base text-white hover:bg-white/20">장바구니 보기</Link>
            </div>

            <dl className="reveal reveal-4 mt-14 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
              {[
                ['직영몰', '바로 주문'],
                ['상품 구성', `${productCount}종`],
                ['무료배송', '3만원↑'],
                ['상담', '실시간 채팅'],
              ].map(([label, value]) => (
                <div key={label} className="bg-sea-950/60 px-4 py-4 backdrop-blur-sm sm:px-5 sm:py-5">
                  <dd className="text-lg font-black sm:text-2xl">{value}</dd>
                  <dt className="mt-1 text-[10px] text-sea-200 sm:text-[11px]">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
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
        <div className="container-x grid items-center gap-12 pt-10 lg:grid-cols-[1.05fr_.95fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-black/25">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/story/family-table.webp"
              alt="김과 밥을 차린 가족 식탁 연출 이미지"
              className="aspect-[4/3] h-full w-full object-cover"
              loading="lazy"
            />
            <span className="absolute bottom-4 left-4 rounded-full bg-sea-950/75 px-3 py-1.5 text-[10px] text-sea-100 backdrop-blur-sm">
              식탁 연출 이미지 · 실제 상품은 제품 사진 참조
            </span>
          </div>

          <div>
            <p className="eyebrow text-sea-300">BRAND STORY</p>
            <h2 className="mt-3 text-3xl font-black leading-snug sm:text-4xl">
              매일 먹는 김이라서
              <br />더 정직하게 소개합니다
            </h2>
            <p className="mt-6 text-sm leading-7 text-sea-100/90">
              {SITE.name}은 충청남도 보령시에서 조미구이재래김과 도시락김을 판매합니다.
              제품 구성과 가격, 제조사 정보는 실제 판매 제품을 기준으로 안내합니다.
            </p>
            <p className="mt-4 text-sm leading-7 text-sea-100/90">
              원재료, 알레르기, 영양성분과 소비기한은 생산 시점에 따라 달라질 수 있으므로
              수령한 제품 포장 표시를 가장 정확한 기준으로 확인해 주세요.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                ['01', '실제 제품 사진'],
                ['02', '구성·가격 공개'],
                ['03', '사업자 정보 확인'],
              ].map(([n, t]) => (
                <div key={n} className="rounded-2xl border border-white/12 bg-white/[0.06] p-4">
                  <p className="text-[10px] font-bold text-sea-300">{n}</p>
                  <p className="mt-2 text-xs font-bold leading-5">{t}</p>
                </div>
              ))}
            </div>
            <Link href="/about" className="btn-outline mt-8 border-white/25 bg-transparent text-white hover:bg-white/10">
              회사 정보 보기
            </Link>
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
