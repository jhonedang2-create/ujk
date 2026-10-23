import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewInputError } from '../src/lib/checkout-review-rules';
const valid = { ordererName: '검수용', receiver: '검수용', ordererPhone: '01000000000', recvPhone: '01000000000', zipcode: '33491', address1: '충청남도 보령시 황골길 42', agreeTerms: 'yes', agreePrivacy: 'yes' };
test('valid manual address can reach the confirmation screen', () => assert.equal(reviewInputError(valid), null));
test('empty readonly address cannot bypass confirmation validation', () => assert.ok(reviewInputError({ ...valid, zipcode: '', address1: '' })));
test('postal code is five numeric digits', () => { for (const zipcode of ['123', '123456', 'abcde']) assert.ok(reviewInputError({ ...valid, zipcode })); });
test('both consents are mandatory for the confirmation screen', () => { assert.ok(reviewInputError({ ...valid, agreePrivacy: '' })); assert.ok(reviewInputError({ ...valid, agreeTerms: '' })); });
