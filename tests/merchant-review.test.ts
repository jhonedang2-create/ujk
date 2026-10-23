import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_MERCHANT_POLICY, parseMerchantPolicy, policyMissing, validateCheckoutConsent, CHECKOUT_TERMS_VERSION } from '../src/lib/merchant-policy-rules';

test('missing and corrupt policies never invent shipping time or fees', () => {
  for (const raw of [undefined, 'bad-json', '{}', 'null']) {
    const p = parseMerchantPolicy(raw); assert.equal(p.confirmed, false); assert.equal(p.returnFee, null); assert.equal(p.dispatchDays, null);
  }
});
test('confirmation alone does not publish incomplete policy', () => assert.equal(parseMerchantPolicy(JSON.stringify({ ...EMPTY_MERCHANT_POLICY, confirmed: true })).confirmed, false));
test('zero fee is deliberate; blanks are not zero', () => {
  const p = { ...EMPTY_MERCHANT_POLICY, dispatchDays: 2, deliveryMinDays: 1, deliveryMaxDays: 3, returnFee: 0, exchangeFee: 0, returnAddress: 'test-only-address', confirmed: true };
  assert.equal(policyMissing(p).length, 0); assert.equal(parseMerchantPolicy(JSON.stringify(p)).confirmed, true);
});
test('invalid periods cannot be accepted', () => assert.equal(parseMerchantPolicy(JSON.stringify({ ...EMPTY_MERCHANT_POLICY, dispatchDays: -1 })).confirmed, false));
test('server checks both consents and displayed versions', () => {
  const fd = new FormData(); assert.ok(validateCheckoutConsent(fd, 'r1'));
  fd.set('agreeTerms', 'yes'); fd.set('agreePrivacy', 'yes'); assert.ok(validateCheckoutConsent(fd, 'r1'));
  fd.set('termsVersion', CHECKOUT_TERMS_VERSION); fd.set('policyRevision', 'r1'); assert.equal(validateCheckoutConsent(fd, 'r1'), null);
  assert.ok(validateCheckoutConsent(fd, 'r2'));
});
