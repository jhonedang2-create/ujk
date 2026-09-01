'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { can, type Permission, type PermissionHolder } from '@/lib/permissions';

type Item = [href: string, label: string, perm: Permission];

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: '현황',
    items: [
      ['/admin', '대시보드', 'dashboard'],
      ['/admin/analytics', '매출 분석', 'analytics'],
    ],
  },
  {
    title: '판매',
    items: [
      ['/admin/orders', '주문 관리', 'orders'],
      ['/admin/channels', '판매채널 연동', 'channels'],
      ['/admin/products', '상품 관리', 'products'],
      ['/admin/categories', '카테고리', 'categories'],
    ],
  },
  {
    title: '고객',
    items: [
      ['/admin/chat', '실시간 상담', 'chat'],
      ['/admin/inquiries', '문의 관리', 'inquiries'],
      ['/admin/messages', '알림톡·문자', 'messages'],
      ['/admin/users', '회원 관리', 'users'],
    ],
  },
  {
    title: '콘텐츠',
    items: [
      ['/admin/global', '글로벌·판매채널', 'content'],
      ['/admin/posts', '공지/FAQ', 'content'],
      ['/admin/banners', '배너 관리', 'content'],
      ['/admin/history', '연혁 관리', 'content'],
    ],
  },
  {
    title: '운영',
    items: [['/admin/staff', '직원 계정', 'staff']],
  },
];

export default function AdminNav({
  badges,
  me,
  mobile = false,
}: {
  badges: Record<string, number>;
  me: PermissionHolder;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  // 권한 없는 메뉴는 아예 보이지 않습니다
  const groups = GROUPS.map((g) => ({
    ...g,
    // 직원 계정 메뉴는 최고관리자 전용이라 권한과 별개로 한 번 더 거릅니다
    items: g.items.filter(
      ([href, , perm]) =>
        can(me, perm) && (href !== '/admin/staff' || me.role === 'ADMIN')
    ),
  })).filter((g) => g.items.length > 0);

  const ALL = groups.flatMap((g) => g.items);

  if (mobile) {
    return (
      <div className="flex gap-1 overflow-x-auto border-b border-gim-200 bg-white px-3 py-2">
        {ALL.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'relative shrink-0 rounded-lg px-3 py-2 text-xs font-medium',
              isActive(href) ? 'bg-sea-800 text-white' : 'text-gim-600'
            )}
          >
            {label}
            {(badges[href] ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-point px-1.5 text-[10px] font-bold text-white">
                {badges[href]}
              </span>
            )}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <nav className="flex-1 overflow-y-auto p-3">
      {groups.map((g) => (
        <div key={g.title} className="mb-4">
          <p className="px-3.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gim-300">
            {g.title}
          </p>
          {g.items.map(([href, label]) => {
            const n = badges[href] ?? 0;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium transition',
                  isActive(href)
                    ? 'bg-sea-50 text-sea-800'
                    : 'text-gim-600 hover:bg-gim-50 hover:text-sea-800'
                )}
              >
                <span className="flex-1">{label}</span>
                {n > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-point px-1.5 text-[10px] font-bold text-white">
                    {n > 99 ? '99+' : n}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
