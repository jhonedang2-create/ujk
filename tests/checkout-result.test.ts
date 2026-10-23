import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutResultState } from '../src/lib/checkout-result-rules';

test('verified payment remains successful after a lost browser callback', () => {
  const result = checkoutResultState('PAID', { status: 'PAID', method: 'PORTONE' });
  assert.equal(result.tone, 'success');
  assert.equal(result.title, '결제가 정상적으로 확인되었습니다');
});
test('an unverified gateway order is never described as paid', () => {
  assert.equal(checkoutResultState('PENDING', { status: 'READY', method: 'TOSS' }).tone, 'pending');
  assert.equal(checkoutResultState('PENDING', null).tone, 'pending');
});
test('bank details appear only while a bank order is awaiting payment', () => {
  assert.equal(checkoutResultState('PENDING', { status: 'READY', method: 'BANK' }).showBank, true);
  assert.equal(checkoutResultState('PAID', { status: 'PAID', method: 'BANK' }).showBank, false);
  assert.equal(checkoutResultState('CANCELLED', { status: 'READY', method: 'BANK' }).showBank, false);
});
test('refunded orders do not display the former payment as a new success', () => {
  const result = checkoutResultState('REFUNDED', { status: 'PAID', method: 'PORTONE' });
  assert.equal(result.title, '환불 처리된 주문입니다');
  assert.equal(result.showBank, false);
});
