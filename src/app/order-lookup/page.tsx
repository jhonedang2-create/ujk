import Link from 'next/link';

import GuestOrderLookupForm from '@/components/GuestOrderLookupForm';

export const metadata = {
  title: '주문조회',
  robots: { index: false, follow: false },
};

export default function OrderLookupPage() {
  return (
    <section className="container-x py-16 sm:py-20">
      <div className="mx-auto mb-8 max-w-xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-sea-700">ORDER LOOKUP</p>
        <h1 className="mt-3 text-2xl font-black sm:text-3xl">주문조회</h1>
        <p className="mt-3 text-sm leading-6 text-gim-500">
          회원은 마이페이지에서 전체 주문을 확인할 수 있고, 비회원 주문은 주문번호와 연락처로 조회할 수 있습니다.
        </p>
      </div>

      <GuestOrderLookupForm />

      <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-3 text-sm">
        <Link href="/login?callbackUrl=/mypage/orders" className="btn-outline btn-sm">
          회원 주문조회
        </Link>
        <Link href="/contact?type=ORDER" className="btn-outline btn-sm">
          주문 문의
        </Link>
      </div>
    </section>
  );
}
