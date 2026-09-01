'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ChatWidget from '@/components/chat/ChatWidget';

export default function AppShell({
  children,
  officeHours,
  csHours,
  tel,
}: {
  children: React.ReactNode;
  officeHours: boolean;
  csHours: string;
  tel: string;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <Header />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
      <ChatWidget officeHours={officeHours} csHours={csHours} tel={tel} />
    </>
  );
}
