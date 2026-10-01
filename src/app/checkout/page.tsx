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

  const [user, addresses] = session?.user?.id
    ? await Promise.all([
        prisma.user.findUnique({ where: { id: session.user.id } }),
        prisma.address.findMany({
          where: { userId: session.user.id },
          orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
        }),
      ])
    : [null, []];

  const rows = items.map((it) => ({
    id: it.id,
    productId: it.product.id,
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
            addresses[0]
              ? {
                  id: addresses[0].id,
                  label: addresses[0].label,
                  receiver: addresses[0].receiver,
                  phone: addresses[0].phone,
                  zipcode: addresses[0].zipcode,
                  address1: addresses[0].address1,
                  address2: addresses[0].address2,
                  isDefault: addresses[0].isDefault,
                }
              : null
          }
          addresses={addresses.map((a) => ({
            id: a.id,
            label: a.label,
            receiver: a.receiver,
            phone: a.phone,
            zipcode: a.zipcode,
            address1: a.address1,
            address2: a.address2,
            isDefault: a.isDefault,
          }))}
          tossClientKey={process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? ''}
          portoneCode={process.env.NEXT_PUBLIC_PORTONE_IMP_CODE ?? ''}
          portonePg={process.env.NEXT_PUBLIC_PORTONE_PG ?? 'html5_inicis'}
          kakaoPayChannelKey={process.env.NEXT_PUBLIC_PORTONE_KAKAOPAY_CHANNEL_KEY ?? ''}
          naverPayChannelKey={process.env.NEXT_PUBLIC_PORTONE_NAVERPAY_CHANNEL_KEY ?? ''}
        />
      </section>
    </>
  );
}
