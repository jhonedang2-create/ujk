'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { SITE } from '@/lib/site';
import { cn, num } from '@/lib/utils';
import { canAccessAdmin } from '@/lib/permissions';

const NAV = [
  {
    label: '회사소개',
    href: '/about',
    children: [
      { label: '인사말·기업개요', href: '/about' },
      { label: '연혁', href: '/about/history' },
      { label: '생산공정', href: '/about/process' },
      { label: '등록·인증현황', href: '/about/certification' },
      { label: '오시는길', href: '/about/location' },
    ],
  },
  {
    label: '제품',
    href: '/products',
    children: [
      { label: '전체보기', href: '/products' },
      { label: '재래김', href: '/products?category=jaerae-gim' },
      { label: '도시락김', href: '/products?category=lunchbox-gim' },
      { label: '식탁김', href: '/products?category=table-gim' },
      { label: '파래김', href: '/products?category=parae-gim' },
      { label: '선물세트', href: '/products?category=gift-set' },
    ],
  },
  {
    label: '대천김 안내',
    href: '/daecheon-gim',
    children: [
      { label: '대천김·우정김 안내', href: '/daecheon-gim' },
      { label: '대천우정김 제품', href: '/products' },
      { label: '제조사 위치', href: '/about/location' },
    ],
  },
  {
    label: '고객센터',
    href: '/notice',
    children: [
      { label: '공지사항', href: '/notice' },
      { label: '자주묻는질문', href: '/notice?type=FAQ' },
      { label: '문의하기', href: '/contact' },
      { label: '대량구매·납품문의', href: '/contact?type=BULK' },
    ],
  },
];

export default function Header() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const user = session?.user;
  const openChat = () => window.dispatchEvent(new Event('ujgim:open-chat'));

  return (
    <header className="sticky top-0 z-50 border-b border-gim-100 bg-white/95 backdrop-blur">
      {/* 상단 유틸 */}
      <div className="hidden border-b border-gim-100 bg-gim-50 lg:block">
        <div className="container-x flex h-9 items-center justify-end gap-4 text-xs text-gim-600">
          {user ? (
            <>
              <span className="font-medium text-gim-800">
                {user.name ?? '회원'}님 · 적립금 {num(user.point ?? 0)}P
              </span>
              <Link href="/mypage" className="hover:text-sea-700">마이페이지</Link>
              {canAccessAdmin(user) && (
                <Link href="/admin" className="font-semibold text-point hover:underline">관리자</Link>
              )}
              <button onClick={() => signOut({ callbackUrl: '/' })} className="hover:text-sea-700">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-sea-700">로그인</Link>
              <Link href="/register" className="hover:text-sea-700">회원가입</Link>
            </>
          )}
          <Link href="/mypage/orders" className="hover:text-sea-700">주문조회</Link>
          <span className="text-gim-300">|</span>
          <span>고객센터 {SITE.tel}</span>
        </div>
      </div>

      {/* 메인 네비 */}
      <div className="container-x flex h-[68px] items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sea-800 text-lg font-black text-white">
            禹
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-black text-sea-900">대천우정김</span>
            <span className="block text-[10px] font-medium tracking-widest text-gim-400">
              BORYEONG DAECHEON GIM
            </span>
          </span>
        </Link>

        <nav className="hidden lg:flex" onMouseLeave={() => setHovered(null)}>
          {NAV.map((item) => (
            <div key={item.label} className="relative" onMouseEnter={() => setHovered(item.label)}>
              <Link
                href={item.href}
                className="block px-6 py-6 text-[15px] font-semibold text-gim-800 hover:text-sea-700"
              >
                {item.label}
              </Link>
              {hovered === item.label && (
                <div className="absolute left-0 top-full w-52 rounded-b-xl border border-gim-100 bg-white py-2 shadow-lg">
                  {item.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className="block px-5 py-2 text-sm text-gim-600 hover:bg-gim-50 hover:text-sea-700"
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={openChat} className="btn-outline btn-sm hidden md:inline-flex">
            실시간 상담
          </button>
          <Link href="/cart" className="btn-outline btn-sm hidden sm:inline-flex">
            장바구니
          </Link>
          <Link href="/products" className="btn-primary btn-sm">제품 구매</Link>
          <button
            className="rounded p-2 lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="메뉴"
            aria-expanded={open}
            aria-controls="mobile-navigation"
          >
            <span className="block h-0.5 w-6 bg-gim-800" />
            <span className="mt-1.5 block h-0.5 w-6 bg-gim-800" />
            <span className="mt-1.5 block h-0.5 w-6 bg-gim-800" />
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      <div id="mobile-navigation" className={cn('border-t border-gim-100 lg:hidden', open ? 'block' : 'hidden')}>
        <div className="container-x py-4">
          {NAV.map((item) => (
            <div key={item.label} className="border-b border-gim-100 py-3 last:border-0">
              <p className="mb-2 text-sm font-bold text-gim-900">{item.label}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {item.children.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    onClick={() => setOpen(false)}
                    className="text-sm text-gim-600"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => { setOpen(false); openChat(); }} className="btn-outline btn-sm flex-1">실시간 상담</button>
            {user ? (
              <>
                <Link href="/mypage" className="btn-outline btn-sm flex-1">마이페이지</Link>
                {canAccessAdmin(user) && <Link href="/admin" className="btn-outline btn-sm flex-1">관리자</Link>}
                <button onClick={() => signOut({ callbackUrl: '/' })} className="btn-outline btn-sm flex-1">
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-outline btn-sm flex-1">로그인</Link>
                <Link href="/register" className="btn-primary btn-sm flex-1">회원가입</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
