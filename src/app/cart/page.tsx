import Link from 'next/link';
import { getCartItems } from '@/actions/cart';
import CartList from '@/components/CartList';
import PageHero from '@/components/PageHero';
import Empty from '@/components/Empty';

export const metadata = { title: '장바구니' };
export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const items = await getCartItems();

  const plain = items.map((it) => ({
    id: it.id,
    quantity: it.quantity,
    productSlug: it.product.slug,
    productName: it.product.name,
    imageUrl: it.product.images[0]?.url ?? '',
    price: it.product.price + (it.option?.extraPrice ?? 0),
    stock: it.product.stock,
    optionName: it.option ? `${it.option.name}: ${it.option.value}` : '',
  }));

  return (
    <>
      <PageHero title="장바구니" breadcrumb={[['장바구니', '/cart']]} />
      <section className="container-x py-14">
        {plain.length === 0 ? (
          <>
            <Empty text="장바구니가 비어 있습니다." sub="마음에 드는 상품을 담아보세요." />
            <div className="mt-6 text-center">
              <Link href="/products" className="btn-primary">제품 보러가기</Link>
            </div>
          </>
        ) : (
          <CartList items={plain} />
        )}
      </section>
    </>
  );
}
