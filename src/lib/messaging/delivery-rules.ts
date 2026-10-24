import type { OutgoingMessage, ProviderCredentials } from './types';

export const DELIVERY_POLICY_KEY = 'messaging.delivery-policy.v1';
export const DELIVERY_MODES = ['ALIMTALK_ONLY', 'ALIMTALK_SMS', 'SMS_ONLY'] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];
export type DeliveryPolicy = { enabled: boolean; mode: DeliveryMode };
export const SAFE_DELIVERY_POLICY: DeliveryPolicy = { enabled: false, mode: 'ALIMTALK_ONLY' };

/** Missing/corrupt settings must never enable a paid message submission. */
export function parseDeliveryPolicy(raw?: string | null): DeliveryPolicy {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object') return { ...SAFE_DELIVERY_POLICY };
    const v = value as Record<string, unknown>;
    if (!DELIVERY_MODES.includes(v.mode as DeliveryMode)) return { ...SAFE_DELIVERY_POLICY };
    return { enabled: v.enabled === true, mode: v.mode as DeliveryMode };
  } catch { return { ...SAFE_DELIVERY_POLICY }; }
}

/** SOLAPI expects keys such as #{이름}, not bare Korean variable names. */
export function kakaoVariables(vars: Record<string, string> = {}) {
  return Object.fromEntries(Object.entries(vars).map(([key, value]) => [
    key.startsWith('#{') && key.endsWith('}') ? key : '#{' + key + '}',
    String(value),
  ]));
}

export function renderKoreanVariables(text: string, vars: Record<string, string> = {}) {
  return text.replace(/#\{([^{}]+)\}/gu, (original, key: string) =>
    vars[key] ?? vars[original] ?? original
  );
}

/** All checks run BEFORE invoking the paid provider API. */
export function prepareSolapiMessage(c: ProviderCredentials, m: OutgoingMessage, policy: DeliveryPolicy) {
  if (!policy.enabled) throw new Error('전체 발송이 중지되어 있습니다. 관리자 > 알림톡·문자 > 연동·발송 제어를 확인해 주세요.');
  if (!c.apiKey || !c.apiSecret) throw new Error('SOLAPI 인증정보가 등록되지 않았습니다.');
  if (!c.senderNumber) throw new Error('발신번호를 등록해 주세요.');
  if (m.imageUrl) throw new Error('이미지·브랜드 메시지는 현재 주문 알림 연동 대상이 아닙니다.');
  const text = renderKoreanVariables(m.text, m.variables);
  if (policy.mode === 'SMS_ONLY' && /#\{[^{}]+\}/u.test(text)) {
    throw new Error('치환되지 않은 변수가 있어 문자 발송을 중단했습니다.');
  }
  const base: Record<string, unknown> = { to: m.to, from: c.senderNumber, text };
  if (m.subject) base.subject = m.subject;
  if (policy.mode !== 'SMS_ONLY') {
    if (m.isAd) throw new Error('알림톡은 주문·배송 정보성 안내에만 사용합니다. 광고 문자는 별도 문자 모드를 선택해 주세요.');
    if (!c.pfId || !m.kakaoTemplateId) {
      throw new Error('카카오 채널 또는 승인된 알림톡 템플릿 ID가 없습니다. 문자로 자동 전환하지 않았습니다.');
    }
    base.type = 'ATA';
    base.kakaoOptions = {
      pfId: c.pfId,
      templateId: m.kakaoTemplateId,
      variables: kakaoVariables(m.variables),
      disableSms: policy.mode !== 'ALIMTALK_SMS',
    };
  }
  return base;
}
