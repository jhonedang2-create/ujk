import { z } from 'zod';

/** Pure checkout validation shared with no-network tests. Review never writes an order. */
export function reviewInputError(fields: Record<string, string>): string | null {
  for (const key of ['ordererName', 'receiver']) {
    if ((fields[key] ?? '').trim().length < 2) return '주문자와 받는 분 이름을 확인해 주세요.';
  }
  for (const key of ['ordererPhone', 'recvPhone']) {
    const phone = (fields[key] ?? '').replace(/[^\d]/g, '');
    if (phone.length < 9 || phone.length > 13) return '연락처를 확인해 주세요.';
  }
  if (!/^\d{5}$/.test((fields.zipcode ?? '').trim())) return '5자리 우편번호를 입력해 주세요.';
  if ((fields.address1 ?? '').trim().length < 5) return '기본 배송주소를 입력해 주세요.';
  if (fields.agreeTerms !== 'yes' || fields.agreePrivacy !== 'yes') return '구매조건과 주문 개인정보 안내에 동의해 주세요.';
  return null;
}

const money = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const reviewItemSchema = z.object({
  id: z.string().min(1).max(200),
  productId: z.string().min(1).max(200),
  optionId: z.string().min(1).max(200).nullable(),
  name: z.string().min(1).max(1000),
  optionName: z.string().max(1000),
  price: money,
  quantity: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});
const reviewSnapshotSchema = z.object({
  version: z.literal(1),
  items: z.array(reviewItemSchema).min(1).max(1000),
  itemTotal: money,
  shippingFee: money,
  pointBalance: money,
  pointUsed: money,
  total: money,
  privacyRevision: z.string().min(1).max(80),
});

export type CheckoutReviewItem = z.infer<typeof reviewItemSchema>;
export type CheckoutReviewSnapshot = z.infer<typeof reviewSnapshotSchema>;

/** Keep the values shown in the review dialog, without retaining customer details. */
export function makeCheckoutReviewSnapshot(input: {
  items: CheckoutReviewItem[];
  shippingFee: number;
  pointBalance: number;
  pointUsed: number;
  privacyRevision: string;
}): CheckoutReviewSnapshot {
  const items = input.items.map(({ id, productId, optionId, name, optionName, price, quantity }) =>
    ({ id, productId, optionId, name, optionName, price, quantity }));
  const itemTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return {
    version: 1, items, itemTotal, shippingFee: input.shippingFee,
    pointBalance: input.pointBalance, pointUsed: input.pointUsed,
    total: itemTotal + input.shippingFee - input.pointUsed,
    privacyRevision: input.privacyRevision,
  };
}

/** Never silently reduce the points selected by the buyer and increase their charge. */
export function checkoutPointError(pointUsed: number, pointBalance: number, itemTotal: number, loggedIn: boolean): string | null {
  if (!Number.isSafeInteger(pointUsed) || pointUsed < 0) return '사용할 적립금을 다시 입력해 주세요.';
  if ((!loggedIn && pointUsed > 0) || pointUsed > pointBalance || pointUsed > itemTotal) {
    return '사용 가능한 적립금 또는 상품금액이 변경되었습니다. 주문서를 새로고침하고 적립금을 다시 선택해 주세요.';
  }
  return null;
}

/** Server totals remain authoritative; a stale review must not authorize a different order. */
export function checkoutReviewError(raw: FormDataEntryValue | null, current: CheckoutReviewSnapshot): string | null {
  if (typeof raw !== 'string' || raw.length > 500_000) return '주문 확인 정보가 없습니다. 주문서를 새로고침하고 다시 확인해 주세요.';
  let decoded: unknown;
  try { decoded = JSON.parse(raw); } catch { return '주문 확인 정보가 올바르지 않습니다. 주문서를 새로고침해 주세요.'; }
  const parsed = reviewSnapshotSchema.safeParse(decoded);
  if (!parsed.success) return '주문 확인 정보가 올바르지 않습니다. 주문서를 새로고침하고 다시 확인해 주세요.';
  const reviewed = parsed.data;
  if (reviewed.privacyRevision !== current.privacyRevision) {
    return '개인정보처리방침이 변경되었습니다. 주문서를 새로고침하고 최신 안내에 다시 동의해 주세요.';
  }
  const orderedItems = (items: CheckoutReviewItem[]) => [...items].sort((a, b) => a.id.localeCompare(b.id));
  if (JSON.stringify(orderedItems(reviewed.items)) !== JSON.stringify(orderedItems(current.items))) {
    return '장바구니의 상품·옵션·수량 또는 가격이 변경되었습니다. 주문서를 새로고침하고 주문 내용을 다시 확인해 주세요.';
  }
  if (reviewed.pointBalance !== current.pointBalance || reviewed.pointUsed !== current.pointUsed) {
    return '적립금 정보가 변경되었습니다. 주문서를 새로고침하고 사용 금액을 다시 확인해 주세요.';
  }
  if (reviewed.itemTotal !== current.itemTotal || reviewed.shippingFee !== current.shippingFee || reviewed.total !== current.total) {
    return '주문 금액 또는 배송비가 변경되었습니다. 주문서를 새로고침하고 최종 금액을 다시 확인해 주세요.';
  }
  return null;
}

export type CheckoutPaymentMethod = 'BANK' | 'TOSS' | 'KAKAOPAY' | 'NAVERPAY';
export type CheckoutPaymentReadiness = {
  bankAccount: string; tossClientKey: string; portoneCode: string;
  kakaoPayChannelKey: string; naverPayChannelKey: string;
  tossSdkReady: boolean; portoneSdkReady: boolean;
};

/** Check before creating the order, including the SDK actually needed for this method. */
export function checkoutPaymentError(method: CheckoutPaymentMethod, ready: CheckoutPaymentReadiness): string | null {
  if (method === 'BANK') return ready.bankAccount ? null : '입금 계좌가 아직 등록되지 않았습니다. 고객센터로 문의해 주세요.';
  if (method === 'TOSS') {
    if (!ready.tossClientKey) return '카드결제 설정이 아직 완료되지 않았습니다.';
    return ready.tossSdkReady ? null : '카드결제 창을 불러오지 못했습니다. 잠시 후 다시 시도하거나 다른 결제수단을 선택해 주세요.';
  }
  const channelKey = method === 'KAKAOPAY' ? ready.kakaoPayChannelKey : ready.naverPayChannelKey;
  if (!ready.portoneCode || !channelKey) return '선택한 간편결제 설정이 아직 완료되지 않았습니다.';
  return ready.portoneSdkReady ? null : '간편결제 창을 불러오지 못했습니다. 잠시 후 다시 시도하거나 다른 결제수단을 선택해 주세요.';
}
