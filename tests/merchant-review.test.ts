import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_MERCHANT_POLICY, parseMerchantPolicy, parseMerchantPolicyState, merchantPolicyAfterSave, policyMissing, validateCheckoutConsent, CHECKOUT_TERMS_VERSION, type MerchantPolicy } from '../src/lib/merchant-policy-rules';

const confirmedPolicy = (revision: string): MerchantPolicy => ({
  ...EMPTY_MERCHANT_POLICY, revision, dispatchDays: 2, deliveryMinDays: 1, deliveryMaxDays: 3,
  returnFee: 3000, exchangeFee: 6000, returnAddress: 'test-only-return-address', confirmed: true,
  businessVerified: true, privacyVerified: true,
});

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
test('confirmed legacy policy stays published when its first new draft is saved', () => {
  const legacy = confirmedPolicy('legacy-public');
  const current = parseMerchantPolicyState(JSON.stringify(legacy));
  assert.deepEqual(current.published, legacy);
  const next = merchantPolicyAfterSave(current, { ...legacy, revision: 'first-draft', returnFee: null, confirmed: false });
  const reloaded = parseMerchantPolicyState(JSON.stringify(next.draft), JSON.stringify(next.published));
  assert.equal(reloaded.draft.returnFee, null);
  assert.deepEqual(reloaded.published, legacy);
});
test('editing an existing draft preserves public fees and the checkout consent revision', () => {
  const published = confirmedPolicy('public-r1');
  const current = parseMerchantPolicyState(JSON.stringify({ ...published, revision: 'draft-r1', confirmed: false }), JSON.stringify(published));
  const next = merchantPolicyAfterSave(current, { ...current.draft, revision: 'draft-r2', returnFee: 5000 });
  assert.equal(next.published?.returnFee, 3000);
  const fd = new FormData();
  fd.set('agreeTerms', 'yes'); fd.set('agreePrivacy', 'yes');
  fd.set('termsVersion', CHECKOUT_TERMS_VERSION); fd.set('policyRevision', 'public-r1');
  assert.equal(validateCheckoutConsent(fd, next.published!.revision), null);
});
test('internal review checks use the latest draft without republishing shipping terms', () => {
  const published = confirmedPolicy('public-r1');
  const current = parseMerchantPolicyState(JSON.stringify(published), JSON.stringify(published));
  const next = merchantPolicyAfterSave(current, { ...published, revision: 'review-update', confirmed: false, businessVerified: false, privacyVerified: false });
  assert.equal(next.draft.businessVerified, false);
  assert.equal(next.draft.privacyVerified, false);
  assert.equal(next.published?.revision, 'public-r1');
});
test('explicit publication replaces the public snapshot and invalidates older checkout consent', () => {
  const previous = confirmedPolicy('public-r1');
  const current = parseMerchantPolicyState(JSON.stringify(previous), JSON.stringify(previous));
  const nextPolicy = { ...confirmedPolicy('public-r2'), returnFee: 5000 };
  const next = merchantPolicyAfterSave(current, nextPolicy);
  assert.deepEqual(next.published, nextPolicy);
  const fd = new FormData();
  fd.set('agreeTerms', 'yes'); fd.set('agreePrivacy', 'yes');
  fd.set('termsVersion', CHECKOUT_TERMS_VERSION); fd.set('policyRevision', 'public-r1');
  assert.ok(validateCheckoutConsent(fd, next.published!.revision));
});
test('a first unconfirmed draft and an invalid stored public snapshot cannot become public', () => {
  const current = parseMerchantPolicyState();
  const next = merchantPolicyAfterSave(current, { ...EMPTY_MERCHANT_POLICY, revision: 'draft-only', returnFee: 0 });
  assert.equal(next.published, null);
  assert.equal(parseMerchantPolicyState(JSON.stringify(confirmedPolicy('legacy')), 'bad-json').published, null);
});
