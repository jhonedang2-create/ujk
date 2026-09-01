import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCartItems } from '@/actions/cart';
import CheckoutForm from '@/components/CheckoutForm';
import PageHero from '@/components/PageHero';
import { SITE } from '@/lib/site';

export const metadata = { title: '주문/결제' };
export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const items = await getCartItems();
  if (items.length === 0) redirect('/cart');

  const session = await auth();

  const [user, address] = session?.user?.id
    ? await Promise.all([
        prisma.user.findUnique({ where: { id: session.user.id } }),
        prisma.address.findFirst({
          where: { userId: session.user.id },
          orderBy: { isDefault: 'desc' },
        }),
      ])
    : [null, null];

  const rows = items.map((it) => ({
    id: it.id,
    name: it.product.name,
    optionName: it.option ? `${it.option.name}: ${it.option.value}` : '',
    imageUrl: it.product.images[0]?.url ?? '',
    price: it.product.price + (it.option?.extraPrice ?? 0),
    quantity: it.quantity,
  }));

  return (
    <>
      <PageHero title="주문 / 결제" breadcrumb={[['장바구니', '/cart'], ['주문/결제', '/checkout']]} />
      <section className="container-x py-14">
        {!session?.user && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sea-50 p-5">
            <p className="text-sm text-sea-900">
              로그인하시면 적립금 사용과 주문내역 조회가 가능합니다.
            </p>
            <div className="flex gap-2">
              <Link href="/login?callbackUrl=/checkout" className="btn-primary btn-sm">로그인</Link>
              <Link href="/register" className="btn-outline btn-sm">회원가입</Link>
            </div>
          </div>
        )}

        <CheckoutForm
          items={rows}
          bank={{ name: SITE.bank.name, account: SITE.bank.account, holder: SITE.bank.holder }}
          user={{
            name: user?.name ?? '',
            phone: user?.phone ?? '',
            email: user?.email ?? '',
            point: user?.point ?? 0,
            loggedIn: !!session?.user,
          }}
          address={
            address
              ? {
                  receiver: address.receiver,
                  phone: address.phone,
                  zipcode: address.zipcode,
                  address1: address.address1,
                  address2: address.address2,
                }
              : null
          }
          tossClientKey={process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? ''}
          portoneCode={process.env.NEXT_PUBLIC_PORTONE_IMP_CODE ?? ''}
          portonePg={process.env.NEXT_PUBLIC_PORTONE_PG ?? 'html5_inicis'}
        />
      </section>
    </>
  );
}
