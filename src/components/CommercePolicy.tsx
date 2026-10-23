import Link from 'next/link';
import { SITE, SHIPPING } from '@/lib/site';
import { won } from '@/lib/utils';
import type { MerchantPolicy } from '@/lib/merchant-policy-rules';

export default function CommercePolicy({ policy, compact = false }: { policy: MerchantPolicy; compact?: boolean }) {
  const delivery = policy.confirmed
    ? `결제 확인 후 ${policy.dispatchDays}영업일 이내 출고 준비, 출고 후 통상 ${policy.deliveryMinDays}~${policy.deliveryMaxDays}영업일 배송. 주말·공휴일 제외이며 기상·택배사 사정에 따른 지연은 개별 안내합니다.`
    : '별도 약정이 없는 선결제 주문은 결제일로부터 3영업일 이내에 공급에 필요한 조치를 합니다. 구체적인 출고·도착 예정일은 고객센터에서 확인할 수 있습니다.';
  return (
    <div className="space-y-5 text-sm leading-7 text-gim-700">
      <dl className="grid gap-3 rounded-xl bg-gim-50 p-5 sm:grid-cols-2">
        <div><dt className="text-xs text-gim-500">배송비</dt><dd className="mt-1 font-semibold">{won(SHIPPING.fee)} · 상품금액 {won(SHIPPING.freeThreshold)} 이상 무료</dd></div>
        <div><dt className="text-xs text-gim-500">배송기간</dt><dd className="mt-1">{delivery}</dd></div>
      </dl>
      <p className="text-xs leading-6 text-gim-500">실제 청구되는 배송비는 주문서의 최종 결제금액을 기준으로 합니다. 추가 운송비가 필요한 지역은 결제 전에 안내하고 동의 없이 별도 청구하지 않습니다.</p>
      {policy.confirmed && policy.shippingNote && <p className="whitespace-pre-wrap">{policy.shippingNote}</p>}
      {!compact && <>
        <section><h3 className="font-bold text-gim-900">주문 취소</h3><p>출고 전에는 주문번호와 함께 고객센터에 취소를 요청해 주세요. 이미 출고된 주문은 회수 및 반품 절차를 안내합니다. 결제가 완료되지 않은 주문은 주문조회에서 상태를 확인할 수 있습니다.</p></section>
        <section><h3 className="font-bold text-gim-900">교환·반품 접수기간</h3><p>계약내용에 관한 서면을 받은 날부터 7일 이내에 청약철회를 요청할 수 있습니다. 상품 공급이 그보다 늦으면 상품을 받은 날부터 7일입니다. 표시·광고 또는 계약내용과 다른 상품은 받은 날부터 3개월 이내, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내에 요청할 수 있습니다.</p></section>
        <section><h3 className="font-bold text-gim-900">반품이 제한되는 경우</h3><p>고객의 책임 있는 훼손, 사용·소비로 상품 가치가 현저히 감소한 경우 등 법령상 사유에 해당하면 제한될 수 있습니다. 단, 내용 확인을 위한 포장 훼손만으로 일괄 제한하지 않으며, 상품 하자·오배송에 대한 권리는 별도로 보장됩니다. 식품이라는 이유만으로 모든 반품을 금지하지 않습니다.</p></section>
        <section><h3 className="font-bold text-gim-900">운송비 부담</h3><p>단순변심 반품의 반환 운송비는 고객이 부담합니다. 하자·오배송·표시 내용 불일치 등 판매자 귀책인 경우 회사가 부담합니다. 단순변심으로 반품하여 무료배송 조건이 충족되지 않는 경우에는 주문 전에 안내한 배송비 기준을 적용합니다. 하자·오배송 등 판매자 귀책 반품에는 이를 적용하지 않습니다.</p>
          {policy.confirmed ? <p className="mt-2 font-medium">기본 반품 운송비 {won(policy.returnFee ?? 0)} / 교환 왕복 운송비 {won(policy.exchangeFee ?? 0)}. 도서산간·추가 회수비가 있으면 접수 전에 별도 안내합니다.</p> : <p className="mt-2">반품·교환 접수 시 운송비와 회수 방법을 먼저 안내합니다. 위약금이나 임의의 취소 수수료를 부과하지 않습니다.</p>}
        </section>
        <section><h3 className="font-bold text-gim-900">환불</h3><p>반환이 필요한 상품은 회사가 반환받은 날부터, 공급하지 않은 상품은 청약철회한 날부터 3영업일 이내에 환급합니다. 카드·간편결제는 원 결제 취소를 요청하며 실제 명세서 반영 시점은 결제사에 따라 달라질 수 있습니다. 적법한 환급 기한을 결제사 처리기간을 이유로 임의 연장하지 않습니다. 환급이 지연되는 경우 관계 법령에 따른 지연배상금을 지급합니다.</p></section>
        <section className="rounded-xl border border-gim-200 p-5"><h3 className="font-bold text-gim-900">접수 및 반품 주소</h3><p>{SITE.tel} · {SITE.email}</p><p>상담시간: {SITE.csHours}</p><p>반품지: {policy.confirmed ? policy.returnAddress : '고객센터에서 회수 방법과 반품 주소를 안내해 드립니다.'}</p><p className="mt-2 text-xs text-gim-500">회수 중 분실을 방지하기 위해 고객센터로 주문번호와 반품 사유를 알려주세요. 이 안내가 법령상 청약철회 권리를 제한하지는 않습니다.</p></section>
      </>}
      {compact && <p className="text-xs"><Link className="font-semibold text-sea-800 underline underline-offset-4" href="/policy/shipping" target="_blank" rel="noopener noreferrer">배송·교환·반품·환불 안내 전체 보기 ↗</Link></p>}
    </div>
  );
}
