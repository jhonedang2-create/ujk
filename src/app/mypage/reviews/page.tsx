import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { fmtDate } from '@/lib/utils';
import ReviewForm from '@/components/ReviewForm';
import Empty from '@/components/Empty';

export const metadata = { title: '구매후기' };
export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/mypage/reviews');
  const userId = session.user.id;

  const items = await prisma.orderItem.findMany({
    where: { order: { userId, status: 'DELIVERED' } },
    include: {
      order: { select: { orderNo: true, createdAt: true, deliveredAt: true } },
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        },
      },
    },
    orderBy: { order: { createdAt: 'desc' } },
    take: 100,
  });

  const reviews = items.length
    ? await prisma.review.findMany({
        where: { userId, orderItemId: { in: items.map((i) => i.id) } },
      })
    : [];
  const byItem = new Map(reviews.map((r) => [r.orderItemId, r]));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">구매후기</h1>
        <p className="mt-1 text-sm text-gim-500">배송완료된 실제 구매 상품에만 후기를 남길 수 있습니다.</p>
      </div>

      {items.length === 0 ? (
        <Empty text="후기를 작성할 배송완료 상품이 없습니다." />
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const review = byItem.get(item.id);
            return (
              <article key={item.id} className="card p-5">
                <div className="flex gap-4">
                  <Link href={`/products/${item.product.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gim-50">
                    {item.product.images[0]?.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.product.images[0].url} alt="" className="h-full w-full object-contain p-1" />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gim-400">
                      {fmtDate(item.order.deliveredAt ?? item.order.createdAt)} · 주문 {item.order.orderNo}
                    </p>
                    <Link href={`/products/${item.product.slug}`} className="mt-1 block font-semibold hover:text-sea-700">
                      {item.productName}
                    </Link>
                    {item.optionName && <p className="text-xs text-gim-400">{item.optionName}</p>}
                  </div>
                </div>

                {review ? (
                  <div className="mt-4 rounded-xl bg-sea-50 p-4">
                    <p className="text-sm text-point">{'★'.repeat(review.rating)}</p>
                    <p className="mt-2 text-sm leading-6 text-gim-700">{review.content}</p>
                    <p className="mt-2 text-[11px] text-gim-400">{fmtDate(review.createdAt)} 작성</p>
                  </div>
                ) : (
                  <ReviewForm orderItemId={item.id} />
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
