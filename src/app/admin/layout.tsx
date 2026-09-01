import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { SITE } from '@/lib/site';
import AdminNav from '@/components/admin/AdminNav';
import { canAccessAdmin, ROLE_LABEL, type Role } from '@/lib/permissions';

export const metadata = { title: '관리자' };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/admin');
  if (!canAccessAdmin(session.user)) redirect('/');

  const me = {
    role: session.user.role,
    permissions: session.user.permissions,
  };

  const [chatUnread, newOrders, openInquiries] = await Promise.all([
    prisma.chatRoom.aggregate({ _sum: { unreadAdmin: true } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.inquiry.count({ where: { status: 'OPEN' } }),
  ]);

  const badges: Record<string, number> = {
    '/admin/chat': chatUnread._sum.unreadAdmin ?? 0,
    '/admin/orders': newOrders,
    '/admin/inquiries': openInquiries,
  };

  return (
    <div className="min-h-screen bg-gim-50">
      <div className="mx-auto flex max-w-[1560px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-gim-200 bg-white lg:flex">
          <div className="border-b border-gim-100 px-6 py-5">
            <p className="flex items-center gap-2 text-sm font-black text-sea-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sea-800 text-xs text-white">
                禹
              </span>
              {SITE.nameShort} 관리자
            </p>
            <p className="mt-1.5 text-[11px] text-gim-400">
              {session.user.name} 님 ·{' '}
              <span className="font-semibold text-gim-500">
                {ROLE_LABEL[(session.user.role as Role) ?? 'STAFF'] ?? session.user.role}
              </span>
            </p>
          </div>

          <AdminNav badges={badges} me={me} />

          <div className="border-t border-gim-100 p-3">
            <Link
              href="/"
              className="block rounded-lg px-3.5 py-2.5 text-sm text-gim-400 hover:bg-gim-50"
            >
              ← 쇼핑몰로 이동
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="lg:hidden">
            <AdminNav badges={badges} me={me} mobile />
          </div>
          <div className="p-5 sm:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
