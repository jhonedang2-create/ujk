import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import AddressManager from '@/components/AddressManager';

export const metadata = { title: '배송지 관리' };
export const dynamic = 'force-dynamic';

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/mypage/addresses');

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">배송지 관리</h1>
        <p className="mt-1 text-sm text-gim-500">자주 쓰는 배송지를 저장해 주문할 때 빠르게 불러올 수 있습니다.</p>
      </div>
      <AddressManager addresses={addresses} />
    </div>
  );
}
