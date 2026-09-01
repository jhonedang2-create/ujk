import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import PageHero from '@/components/PageHero';

const MENU: [string, string][] = [
  ['/mypage', '마이페이지 홈'],
  ['/mypage/orders', '주문 내역'],
  ['/mypage/points', '적립금 내역'],
];

export default async function MypageLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/mypage');

  return (
    <>
      <PageHero
        title="마이페이지"
        subtitle={`${session.user.name ?? '고객'}님, 반갑습니다.`}
        breadcrumb={[['마이페이지', '/mypage']]}
      />
      <section className="container-x py-14">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          <aside>
            <nav className="space-y-1">
              {MENU.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium text-gim-600 hover:bg-gim-50 hover:text-sea-800"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </aside>
          <div>{children}</div>
        </div>
      </section>
    </>
  );
}
