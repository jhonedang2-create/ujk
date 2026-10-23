import assert from 'node:assert/strict';
import test from 'node:test';
import { checkoutPaymentError, checkoutPointError, checkoutReviewError, makeCheckoutReviewSnapshot, reviewInputError, type CheckoutPaymentReadiness, type CheckoutReviewItem } from '../src/lib/checkout-review-rules';
const valid = { ordererName: '검수용', receiver: '검수용', ordererPhone: '01000000000', recvPhone: '01000000000', zipcode: '33491', address1: '충청남도 보령시 황골길 42', agreeTerms: 'yes', agreePrivacy: 'yes' };
test('valid manual address can reach the confirmation screen', () => assert.equal(reviewInputError(valid), null));
test('empty readonly address cannot bypass confirmation validation', () => assert.ok(reviewInputError({ ...valid, zipcode: '', address1: '' })));
test('postal code is five numeric digits', () => { for (const zipcode of ['123', '123456', 'abcde']) assert.ok(reviewInputError({ ...valid, zipcode })); });
test('both consents are mandatory for the confirmation screen', () => { assert.ok(reviewInputError({ ...valid, agreePrivacy: '' })); assert.ok(reviewInputError({ ...valid, agreeTerms: '' })); });

const cart: CheckoutReviewItem[] = [
  { id: 'cart-1', productId: 'seaweed-1', optionId: 'option-1', name: '도시락김', optionName: '포장: 10봉', price: 10000, quantity: 2 },
  { id: 'cart-2', productId: 'seaweed-2', optionId: null, name: '재래김', optionName: '', price: 5000, quantity: 1 },
];
const reviewed = () => makeCheckoutReviewSnapshot({ items: cart, shippingFee: 3000, pointBalance: 2000, pointUsed: 1000, privacyRevision: 'privacy-v1' });

test('an unchanged order can proceed regardless of database row ordering', () => {
  const shown = reviewed();
  assert.equal(shown.total, 27000);
  assert.equal(checkoutReviewError(JSON.stringify(shown), { ...shown, items: [...shown.items].reverse() }), null);
});

test('confirmation retains a copy of the exact reviewed items', () => {
  const items = cart.map((item) => ({ ...item }));
  const shown = makeCheckoutReviewSnapshot({ items, shippingFee: 3000, pointBalance: 2000, pointUsed: 1000, privacyRevision: 'privacy-v1' });
  items[0].quantity = 3;
  assert.equal(shown.items[0].quantity, 2);
  assert.equal(shown.total, 27000);
});

test('missing, malformed and unsupported review snapshots cannot authorize an order', () => {
  for (const raw of [null, '', 'not json', '{}', JSON.stringify({ ...reviewed(), version: 2 })]) {
    assert.ok(checkoutReviewError(raw, reviewed()));
  }
});

test('a different product or option with the same total still requires a new review', () => {
  const shown = reviewed();
  for (const change of [{ productId: 'replacement-product' }, { optionId: 'replacement-option' }, { optionName: '포장: 다른 구성' }]) {
    const current = { ...shown, items: shown.items.map((item, i) => i === 0 ? { ...item, ...change } : item) };
    assert.equal(current.total, shown.total);
    assert.match(checkoutReviewError(JSON.stringify(shown), current) ?? '', /상품·옵션·수량/);
  }
});

test('changed quantities, prices and cart membership cannot reuse the earlier confirmation', () => {
  const shown = reviewed();
  for (const items of [
    cart.map((item, i) => i === 0 ? { ...item, quantity: 3 } : item),
    cart.map((item, i) => i === 0 ? { ...item, price: 11000 } : item),
    cart.slice(0, 1),
    [...cart, { ...cart[1], id: 'cart-3' }],
  ]) {
    const current = makeCheckoutReviewSnapshot({ ...shown, items });
    assert.ok(checkoutReviewError(JSON.stringify(shown), current));
  }
});

test('shipping and total changes require renewed approval', () => {
  const shown = reviewed();
  assert.ok(checkoutReviewError(JSON.stringify(shown), { ...shown, shippingFee: 5000, total: 29000 }));
  assert.ok(checkoutReviewError(JSON.stringify({ ...shown, total: 1000 }), shown));
});

test('point balance changes and changed point deductions require a new review', () => {
  const shown = reviewed();
  assert.match(checkoutReviewError(JSON.stringify(shown), { ...shown, pointBalance: 1000 }) ?? '', /적립금/);
  assert.match(checkoutReviewError(JSON.stringify(shown), { ...shown, pointUsed: 500, total: 27500 }) ?? '', /적립금/);
});

test('insufficient or anonymous points are rejected instead of silently clamped', () => {
  assert.ok(checkoutPointError(1000, 500, 25000, true));
  assert.ok(checkoutPointError(1000, 2000, 500, true));
  assert.ok(checkoutPointError(1000, 2000, 25000, false));
  assert.ok(checkoutPointError(0.5, 2000, 25000, true));
  assert.equal(checkoutPointError(1000, 1000, 25000, true), null);
  assert.equal(checkoutPointError(0, 0, 25000, false), null);
});

test('privacy publication invalidates an already reviewed order even when the price is unchanged', () => {
  const shown = reviewed();
  assert.match(checkoutReviewError(JSON.stringify(shown), { ...shown, privacyRevision: 'privacy-v2' }) ?? '', /개인정보처리방침/);
});

test('noninteger or unsafe numbers cannot bypass the review validation', () => {
  const shown = reviewed();
  for (const invalid of [
    { ...shown, total: -1 },
    { ...shown, pointUsed: 0.5 },
    { ...shown, itemTotal: Number.MAX_SAFE_INTEGER + 1 },
    { ...shown, items: [{ ...shown.items[0], quantity: 1.5 }, shown.items[1]] },
  ]) assert.ok(checkoutReviewError(JSON.stringify(invalid), shown));
});

const ready: CheckoutPaymentReadiness = {
  bankAccount: 'test-only-account', tossClientKey: 'test-only-client-key', portoneCode: 'test-only-store',
  kakaoPayChannelKey: 'test-only-kakao', naverPayChannelKey: 'test-only-naver', tossSdkReady: true, portoneSdkReady: true,
};
test('missing SDKs and selected payment configuration block an order before creation', () => {
  assert.ok(checkoutPaymentError('TOSS', { ...ready, tossSdkReady: false }));
  assert.ok(checkoutPaymentError('TOSS', { ...ready, tossClientKey: '' }));
  assert.ok(checkoutPaymentError('KAKAOPAY', { ...ready, portoneSdkReady: false }));
  assert.ok(checkoutPaymentError('NAVERPAY', { ...ready, naverPayChannelKey: '' }));
  assert.ok(checkoutPaymentError('KAKAOPAY', { ...ready, portoneCode: '' }));
  assert.ok(checkoutPaymentError('BANK', { ...ready, bankAccount: '' }));
});
test('a payment only needs its own SDK and configuration', () => {
  assert.equal(checkoutPaymentError('BANK', { ...ready, tossSdkReady: false, portoneSdkReady: false }), null);
  assert.equal(checkoutPaymentError('TOSS', { ...ready, portoneSdkReady: false }), null);
  assert.equal(checkoutPaymentError('KAKAOPAY', { ...ready, tossSdkReady: false, naverPayChannelKey: '' }), null);
  assert.equal(checkoutPaymentError('NAVERPAY', { ...ready, tossSdkReady: false, kakaoPayChannelKey: '' }), null);
});
