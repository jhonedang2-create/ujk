import PageHero from '@/components/PageHero';
import CommercePolicy from '@/components/CommercePolicy';
import { getMerchantPolicy } from '@/lib/merchant-policy';

export const dynamic = 'force-dynamic';
export const metadata = { title: '배송·교환·반품·환불 안내', description: '대천우정김 주문의 배송비와 배송기간, 주문 취소 및 교환·반품·환불 접수 방법을 안내합니다.', alternates: { canonical: '/policy/shipping' } };

export default async function ShippingPolicyPage() {
  const policy = await getMerchantPolicy();
  return <><PageHero title="배송·교환·반품·환불 안내" breadcrumb={[["구매 안내", '/policy/shipping']]} /><section className="container-x max-w-4xl py-12 sm:py-16"><CommercePolicy policy={policy} /></section></>;
}
