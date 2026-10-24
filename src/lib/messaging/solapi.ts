import crypto from 'node:crypto';
import type { MessageProvider, OutgoingMessage, SendResult, ProviderCredentials } from './types';
import { getDeliveryPolicy } from './delivery-policy';
import { prepareSolapiMessage } from './delivery-rules';

const HOST = 'https://api.solapi.com';

function authHeader(c: ProviderCredentials) {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const signature = crypto.createHmac('sha256', c.apiSecret).update(date + salt).digest('hex');
  return `HMAC-SHA256 apiKey=${c.apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function call(method: 'GET' | 'POST', path: string, c: ProviderCredentials, body?: unknown) {
  const res = await fetch(`${HOST}${path}`, {
    method, headers: { Authorization: authHeader(c), 'Content-Type': 'application/json; charset=utf-8' },
    ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try { json = text ? JSON.parse(text) : {}; } catch { /* Fail safely below. */ }
  // Do not expose provider payloads, credentials, or recipient details in errors.
  if (!res.ok) throw new Error(`발송 서비스 요청 실패 (HTTP ${res.status}). SOLAPI 이력을 확인해 주세요.`);
  return json;
}

export function normalizePhone(raw: string) {
  let p = String(raw ?? '').replace(/[^\d+]/g, '');
  if (p.startsWith('+82')) p = `0${p.slice(3)}`;
  else if (p.startsWith('82') && p.length > 10) p = `0${p.slice(2)}`;
  return p.replace(/\D/g, '');
}
export function isValidMobile(raw: string) { return /^01[016789]\d{7,8}$/.test(normalizePhone(raw)); }

function failed(messages: OutgoingMessage[], message: string): SendResult {
  return { ok: false, message, results: messages.map((m) => ({ to: m.to, ok: false, errorMessage: message })) };
}

export const solapiProvider: MessageProvider = {
  key: 'solapi', label: 'SOLAPI (솔라피)',
  async test(c) {
    if (!c.apiKey || !c.apiSecret) return { ok: false, message: 'API Key 와 API Secret 을 입력해 주세요.' };
    try {
      const json = await call('GET', '/cash/v1/balance', c);
      const balance = Number(json.balance ?? 0) + Number(json.point ?? 0);
      return { ok: true, balance, message: `연결에 성공했습니다. 잔액 ${balance.toLocaleString('ko-KR')}원` };
    } catch { return { ok: false, message: '연결을 확인하지 못했습니다. 인증정보와 SOLAPI 상태를 확인해 주세요.' }; }
  },
  async send(c, messages, scheduledAt): Promise<SendResult> {
    let payloadMessages: Record<string, unknown>[];
    try {
      const policy = await getDeliveryPolicy();
      payloadMessages = messages.map((m) => prepareSolapiMessage(
        { ...c, senderNumber: normalizePhone(c.senderNumber) }, { ...m, to: normalizePhone(m.to) }, policy
      ));
    } catch (error) {
      const message = error instanceof Error ? error.message : '발송 정책 확인 실패';
      const expected = ['전체 발송', 'SOLAPI 인증', '발신번호', '이미지·', '치환되지', '알림톡은', '카카오 채널'].some((prefix) => message.startsWith(prefix));
      return failed(messages, expected ? message : '발송 정책을 확인하지 못해 발송을 차단했습니다.');
    }
    if (messages.length === 0) return { ok: true, results: [], message: '발송 대상이 없습니다.' };
    try {
      const json = await call('POST', '/messages/v4/send-many/detail', c, {
        messages: payloadMessages, ...(scheduledAt ? { scheduledDate: scheduledAt.toISOString() } : {}), allowDuplicates: false,
      }) as { groupInfo?: { groupId?: string }; failedMessageList?: { to?: string; statusMessage?: string; statusCode?: string }[] };
      if (!json.groupInfo?.groupId && !json.failedMessageList?.length) {
        return failed(messages, '발송 접수 결과를 확인할 수 없습니다. 자동 재시도하지 말고 SOLAPI 이력을 확인해 주세요.');
      }
      const errors = new Map((json.failedMessageList ?? []).map((f) => [normalizePhone(String(f.to ?? '')), f]));
      return {
        ok: errors.size === 0,
        message: scheduledAt ? '예약 요청을 접수했습니다. 최종 발송 여부는 SOLAPI 이력에서 확인해 주세요.' : '발송 요청을 접수했습니다. 접수 성공은 최종 수신 성공을 뜻하지 않습니다.',
        results: messages.map((m, i) => {
          const f = errors.get(normalizePhone(m.to));
          return f ? { to: m.to, ok: false, errorCode: String(f.statusCode ?? ''), errorMessage: 'SOLAPI가 발송 요청을 거절했습니다. 업체 이력을 확인해 주세요.' }
            : { to: m.to, ok: true, messageId: json.groupInfo?.groupId ?? '', type: payloadMessages[i].type === 'ATA' ? 'ATA' : undefined };
        }),
      };
    } catch {
      // A timed-out submission may already have been accepted. Never retry blindly.
      return failed(messages, '발송 접수 결과를 확인하지 못했습니다. 중복 발송 방지를 위해 SOLAPI 이력을 확인한 후 재시도해 주세요.');
    }
  },
};
