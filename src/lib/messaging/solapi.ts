import crypto from 'node:crypto';
import type { MessageProvider, OutgoingMessage, SendResult, ProviderCredentials } from './types';

/**
 * 솔라피(SOLAPI) 발송 어댑터
 *
 * 인증
 *   Authorization: HMAC-SHA256 apiKey={키}, date={ISO8601}, salt={랜덤}, signature={HMAC_SHA256_HEX(date+salt, secret)}
 *   date 는 서버 시각과 15분 이상 차이 나면 거부됩니다.
 *
 * 엔드포인트
 *   POST https://api.solapi.com/messages/v4/send-many/detail   (단건·대량 공통)
 *   GET  https://api.solapi.com/cash/v1/balance                (잔액 조회 = 연결 확인용)
 *
 * ※ 다른 업체(NCP SENS·알리고 등)를 쓰려면 이 파일을 본떠 하나 더 만들고
 *   messaging/index.ts 의 PROVIDERS 에 등록하면 됩니다.
 */
const HOST = 'https://api.solapi.com';

function authHeader(c: ProviderCredentials) {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex'); // 12~64자
  const signature = crypto
    .createHmac('sha256', c.apiSecret)
    .update(date + salt)
    .digest('hex');

  return `HMAC-SHA256 apiKey=${c.apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function call(
  method: 'GET' | 'POST',
  path: string,
  c: ProviderCredentials,
  body?: unknown
) {
  const res = await fetch(`${HOST}${path}`, {
    method,
    headers: {
      Authorization: authHeader(c),
      'Content-Type': 'application/json; charset=utf-8',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* 비정상 응답 */
  }

  if (!res.ok) {
    const msg = String(json.errorMessage ?? json.message ?? text).slice(0, 300);
    throw new Error(`발송 API 오류 (HTTP ${res.status}) ${msg}`);
  }
  return json;
}

/** 국내 번호 정규화 — 하이픈 제거, +82 → 0 */
export function normalizePhone(raw: string) {
  let p = String(raw ?? '').replace(/[^\d+]/g, '');
  if (p.startsWith('+82')) p = `0${p.slice(3)}`;
  else if (p.startsWith('82') && p.length > 10) p = `0${p.slice(2)}`;
  return p.replace(/\D/g, '');
}

export function isValidMobile(raw: string) {
  const p = normalizePhone(raw);
  return /^01[016789]\d{7,8}$/.test(p);
}

export const solapiProvider: MessageProvider = {
  key: 'solapi',
  label: 'SOLAPI (솔라피)',

  async test(c) {
    if (!c.apiKey || !c.apiSecret) {
      return { ok: false, message: 'API Key 와 API Secret 을 입력해 주세요.' };
    }
    try {
      const json = (await call('GET', '/cash/v1/balance', c)) as {
        balance?: number;
        point?: number;
      };
      const balance = Number(json.balance ?? 0) + Number(json.point ?? 0);
      return {
        ok: true,
        balance,
        message: `연결에 성공했습니다. 잔액 ${balance.toLocaleString('ko-KR')}원`,
      };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : '연결 실패' };
    }
  },

  async send(c, messages, scheduledAt): Promise<SendResult> {
    if (!c.senderNumber) {
      return { ok: false, results: [], message: '발신번호가 설정되지 않았습니다.' };
    }

    const payload = {
      messages: messages.map((m) => {
        const base: Record<string, unknown> = {
          to: normalizePhone(m.to),
          from: normalizePhone(c.senderNumber),
          text: m.text,
        };
        if (m.subject) base.subject = m.subject;

        // 알림톡 / 친구톡
        if (c.pfId && (m.kakaoTemplateId || m.imageUrl)) {
          base.kakaoOptions = {
            pfId: c.pfId,
            ...(m.kakaoTemplateId ? { templateId: m.kakaoTemplateId } : {}),
            ...(m.variables ? { variables: m.variables } : {}),
            ...(m.imageUrl ? { imageId: m.imageUrl } : {}),
            ...(m.isAd ? { adFlag: true } : {}),
            // 알림톡이 실패하면 문자로 자동 대체 발송
            disableSms: false,
          };
        }
        return base;
      }),
      ...(scheduledAt ? { scheduledDate: scheduledAt.toISOString() } : {}),
      allowDuplicates: true,
    };

    try {
      const json = (await call('POST', '/messages/v4/send-many/detail', c, payload)) as {
        groupInfo?: { groupId?: string };
        failedMessageList?: { to?: string; statusMessage?: string; statusCode?: string }[];
      };

      const failed = new Map(
        (json.failedMessageList ?? []).map((f) => [
          normalizePhone(String(f.to ?? '')),
          f,
        ])
      );

      return {
        ok: true,
        results: messages.map((m) => {
          const p = normalizePhone(m.to);
          const f = failed.get(p);
          return f
            ? {
                to: m.to,
                ok: false,
                errorCode: String(f.statusCode ?? ''),
                errorMessage: String(f.statusMessage ?? '발송 실패'),
              }
            : {
                to: m.to,
                ok: true,
                messageId: json.groupInfo?.groupId ?? '',
                type: m.kakaoTemplateId ? 'ATA' : undefined,
              };
        }),
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : '발송 실패';
      return {
        ok: false,
        message: msg,
        results: messages.map((m) => ({ to: m.to, ok: false, errorMessage: msg })),
      };
    }
  },
};
