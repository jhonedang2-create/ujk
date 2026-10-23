import { z } from 'zod';

export const MERCHANT_POLICY_KEY = 'commerce.merchant-policy.v1';
// Keep the existing key as the editable draft; public pages read a separate snapshot.
export const MERCHANT_POLICY_PUBLIC_KEY = 'commerce.merchant-policy-published.v1';
export const CHECKOUT_TERMS_VERSION = '2026-10-23';

const days = z.number().int().min(1).max(60).nullable();
export const merchantPolicySchema = z.object({
  revision: z.string().min(1).max(80),
  dispatchDays: days,
  deliveryMinDays: days,
  deliveryMaxDays: days,
  returnFee: z.number().int().min(0).max(100000).nullable(),
  exchangeFee: z.number().int().min(0).max(200000).nullable(),
  returnAddress: z.string().max(250),
  shippingNote: z.string().max(800),
  confirmed: z.boolean(),
  businessVerified: z.boolean(),
  privacyVerified: z.boolean(),
}).refine((p) => p.deliveryMinDays === null || p.deliveryMaxDays === null || p.deliveryMinDays <= p.deliveryMaxDays, { message: '배송기간의 최소값은 최대값보다 클 수 없습니다.' });
export type MerchantPolicy = z.infer<typeof merchantPolicySchema>;

export const EMPTY_MERCHANT_POLICY: MerchantPolicy = {
  revision: 'unconfirmed', dispatchDays: null, deliveryMinDays: null, deliveryMaxDays: null,
  returnFee: null, exchangeFee: null, returnAddress: '', shippingNote: '',
  confirmed: false, businessVerified: false, privacyVerified: false,
};

export function policyMissing(p: MerchantPolicy) {
  const missing: string[] = [];
  if (p.dispatchDays === null) missing.push('출고 준비기간');
  if (p.deliveryMinDays === null || p.deliveryMaxDays === null) missing.push('통상 배송기간');
  if (p.returnFee === null || p.exchangeFee === null) missing.push('반품·교환 운송비');
  if (!p.returnAddress.trim()) missing.push('반품지 주소');
  return missing;
}

export function parseMerchantPolicy(raw?: string | null): MerchantPolicy {
  try {
    const result = merchantPolicySchema.safeParse(JSON.parse(raw ?? 'null'));
    if (!result.success) return { ...EMPTY_MERCHANT_POLICY };
    const p = result.data;
    return { ...p, confirmed: p.confirmed && policyMissing(p).length === 0 };
  } catch { return { ...EMPTY_MERCHANT_POLICY }; }
}

export type MerchantPolicyState = { draft: MerchantPolicy; published: MerchantPolicy | null };

/** Confirmed records stored before draft/public separation remain public. */
export function parseMerchantPolicyState(draftRaw?: string | null, publishedRaw?: string | null): MerchantPolicyState {
  const draft = parseMerchantPolicy(draftRaw);
  const published = publishedRaw == null ? draft : parseMerchantPolicy(publishedRaw);
  return { draft, published: published.confirmed ? published : null };
}

/** Saving an internal draft must never withdraw the current customer-facing terms. */
export function merchantPolicyAfterSave(current: MerchantPolicyState, draft: MerchantPolicy): MerchantPolicyState {
  return { draft, published: draft.confirmed ? draft : current.published };
}

/** Browser required attributes alone are not a consent record. */
export function validateCheckoutConsent(fd: FormData, currentRevision: string): string | null {
  if (fd.get('agreeTerms') !== 'yes' || fd.get('agreePrivacy') !== 'yes') {
    return '구매 조건 및 주문 개인정보 수집·이용 안내를 확인하고 동의해 주세요.';
  }
  if (fd.get('termsVersion') !== CHECKOUT_TERMS_VERSION || fd.get('policyRevision') !== currentRevision) {
    return '구매 안내가 변경되었습니다. 주문서를 새로고침하고 최신 내용을 확인해 주세요.';
  }
  return null;
}
