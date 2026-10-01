import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import ProductCard from '@/components/ProductCard';
import WishlistButton from '@/components/WishlistButton';
import Empty from '@/components/Empty';

export const metadata = { title: '찜한 상품' };
export const dynamic = 'force-dynamic';

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/mypage/wishlist');

  const rows = await prisma.wishlist.findMany({
    where: { userId: session.user.id, product: { isActive: true } },
    include: {
      product: {
        include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">찜한 상품</h1>
        <p className="mt-1 text-sm text-gim-500">관심 있는 상품을 모아두고 나중에 바로 구매할 수 있습니다.</p>
      </div>

      {rows.length === 0 ? (
        <Empty text="찜한 상품이 없습니다." />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
          {rows.map(({ product }) => (
            <div key={product.id}>
              <ProductCard p={product} />
              <div className="mt-3">
                <WishlistButton productId={product.id} initialActive compact />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
