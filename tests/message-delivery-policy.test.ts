import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDeliveryPolicy, prepareSolapiMessage, kakaoVariables, renderKoreanVariables } from '../src/lib/messaging/delivery-rules';

const c = { apiKey: 'test-only', apiSecret: 'test-only', senderNumber: '0410000000', pfId: 'test-channel' };
const m = { to: '01000000000', text: '#{이름}님 주문 #{주문번호}', kakaoTemplateId: 'test-template', variables: { 이름: '테스트', 주문번호: 'TEST-1' } };
const enabled = { enabled: true, mode: 'ALIMTALK_ONLY' as const };

test('unset, malformed and non-boolean settings fail closed', () => {
  for (const raw of [undefined, '', 'null', '{broken', '[]', '{"enabled":"true","mode":"ALIMTALK_ONLY"}', '{"enabled":true,"mode":"UNKNOWN"}']) assert.equal(parseDeliveryPolicy(raw).enabled, false);
});
test('master stop also blocks otherwise valid messages', () => assert.throws(() => prepareSolapiMessage(c, m, { ...enabled, enabled: false }), /전체 발송/));
test('Alimtalk only disables charged SMS fallback', () => {
  const p = prepareSolapiMessage(c, m, enabled);
  assert.equal(p.type, 'ATA');
  assert.equal((p.kakaoOptions as Record<string, unknown>).disableSms, true);
});
test('SMS fallback requires explicit mode', () => assert.equal((prepareSolapiMessage(c, m, { enabled: true, mode: 'ALIMTALK_SMS' }).kakaoOptions as Record<string, unknown>).disableSms, false));
test('missing template or channel never becomes an SMS', () => {
  assert.throws(() => prepareSolapiMessage(c, { ...m, kakaoTemplateId: undefined }, enabled), /채널 또는/);
  assert.throws(() => prepareSolapiMessage({ ...c, pfId: '' }, m, { enabled: true, mode: 'ALIMTALK_SMS' }), /채널 또는/);
});
test('advertisements and legacy friend images cannot use Alimtalk mode', () => {
  assert.throws(() => prepareSolapiMessage(c, { ...m, isAd: true }, enabled), /정보성/);
  assert.throws(() => prepareSolapiMessage(c, { ...m, imageUrl: 'any-image' }, enabled), /이미지/);
});
test('Korean placeholders and SOLAPI variable names work', () => {
  assert.equal(renderKoreanVariables(m.text, m.variables), '테스트님 주문 TEST-1');
  assert.deepEqual(kakaoVariables(m.variables), { '#{이름}': '테스트', '#{주문번호}': 'TEST-1' });
  assert.deepEqual(kakaoVariables({ '#{이름}': '테스트' }), { '#{이름}': '테스트' });
});
test('SMS-only is deliberate and unknown variables are blocked', () => {
  const p = prepareSolapiMessage(c, m, { enabled: true, mode: 'SMS_ONLY' });
  assert.equal(p.kakaoOptions, undefined);
  assert.equal(p.text, '테스트님 주문 TEST-1');
  assert.throws(() => prepareSolapiMessage(c, { ...m, text: '#{없는변수}' }, { enabled: true, mode: 'SMS_ONLY' }), /치환되지/);
});
