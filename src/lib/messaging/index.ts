import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { SITE } from '@/lib/site';
import { solapiProvider, normalizePhone, isValidMobile } from './solapi';
import {
  decorateAd,
  isNightTime,
  messageTypeOf,
  byteLength,
  type AdOptions,
} from './compliance';
import type { MessageProvider, OutgoingMessage } from './types';

export * from './types';
export * from './compliance';
export { normalizePhone, isValidMobile };

export const PROVIDERS: Record<string, MessageProvider> = {
  solapi: solapiProvider,
};

/* ── 설정 ───────────────────────────────────── */

export async function getSetting() {
  const found = await prisma.messageSetting.findUnique({ where: { id: 'default' } });
  if (found) return found;
  return prisma.messageSetting.create({ data: { id: 'default' } });
}

export function providerOf(key: string) {
  return PROVIDERS[key] ?? null;
}

export function adOptionsFrom(
  setting: { adPrefix: string; adOptOutText: string; adOptOutUrl: string },
  baseUrl?: string
): AdOptions {
  const site = baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return {
    prefix: setting.adPrefix || '(광고)',
    optOutText: setting.adOptOutText || '무료수신거부 ',
    optOutUrl: setting.adOptOutUrl || `${site.replace(/\/$/, '')}/unsubscribe`,
    senderName: SITE.nameShort,
    senderContact: SITE.tel,
  };
}

/* ── 템플릿 ─────────────────────────────────── */

/** #{변수} 치환 */
export function render(text: string, vars: Record<string, string>) {
  return text.replace(/#\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export const TEMPLATE_VARS = [
  ['이름', '주문자 이름'],
  ['주문번호', '주문번호'],
  ['상품명', '대표 상품명 (여러 건이면 "외 N건")'],
  ['금액', '결제금액 (콤마 포함)'],
  ['택배사', '택배사 이름'],
  ['송장번호', '운송장 번호'],
  ['조회링크', '배송 조회 주소'],
  ['입금계좌', '무통장 입금 계좌'],
  ['쇼핑몰', '쇼핑몰 이름'],
] as const;

/* ── 발송 ───────────────────────────────────── */

export type SendOptions = {
  isAd?: boolean;
  templateCode?: string;
  campaignId?: string;
  orderId?: string;
  scheduledAt?: Date;
  /** 광고 수신동의 검사를 건너뛸지 (정보성 메시지는 true) */
  skipConsent?: boolean;
};

export type SendSummary = {
  ok: boolean;
  sent: number;
  failed: number;
  blocked: number;
  message: string;
  blockedDetail: { to: string; reason: string }[];
};

export type Recipient = {
  to: string;
  name?: string;
  userId?: string | null;
  variables?: Record<string, string>;
};

/**
 * 실제 발송. 법규 검사 → 수신동의 필터 → 발송 → 이력 기록 순으로 처리합니다.
 *
 * 광고성(isAd)일 때 자동으로 걸리는 안전장치:
 *   1. 마케팅 수신동의(agreeMarketing)가 false 인 번호는 제외
 *   2. 21시~08시면 전량 차단 (예약 발송은 허용)
 *   3. (광고) 표기 · 전송자 명칭 · 무료 수신거부 문구 자동 삽입
 */
export async function sendMessages(
  recipients: Recipient[],
  body: string,
  opts: SendOptions = {}
): Promise<SendSummary> {
  const setting = await getSetting();
  const provider = providerOf(setting.provider);

  const empty: SendSummary = {
    ok: false,
    sent: 0,
    failed: 0,
    blocked: 0,
    message: '',
    blockedDetail: [],
  };

  if (!provider) {
    return { ...empty, message: '발송 업체가 설정되지 않았습니다. (관리자 > 알림톡·문자 > 설정)' };
  }
  if (!setting.apiKey || !setting.apiSecret || !setting.senderNumber) {
    return { ...empty, message: 'API 키 또는 발신번호가 없습니다. 발송 설정을 먼저 완료해 주세요.' };
  }

  const isAd = !!opts.isAd;
  const blockedDetail: { to: string; reason: string }[] = [];

  // ── 1. 야간 광고 차단 (예약 발송은 예외) ──
  if (isAd && setting.adNightBlock && !opts.scheduledAt && isNightTime()) {
    return {
      ...empty,
      blocked: recipients.length,
      message:
        '지금은 광고 전송이 금지된 시간(21시~08시)입니다. 예약 발송으로 보내주세요. (정보통신망법 제50조제3항)',
    };
  }

  // ── 2. 번호 정리 + 중복 제거 ──
  const seen = new Set<string>();
  let list = recipients
    .map((r) => ({ ...r, to: normalizePhone(r.to) }))
    .filter((r) => {
      if (!isValidMobile(r.to)) {
        blockedDetail.push({ to: r.to, reason: '휴대폰 번호 형식 오류' });
        return false;
      }
      if (seen.has(r.to)) return false;
      seen.add(r.to);
      return true;
    });

  // ── 3. 광고 수신동의 필터 ──
  if (isAd && !opts.skipConsent) {
    const phones = list.map((r) => r.to);
    const [users, optOuts] = await Promise.all([
      prisma.user.findMany({
        where: { phoneNorm: { in: phones } },
        select: { phoneNorm: true, agreeMarketing: true },
      }),
      prisma.optOutToken.findMany({
        where: { phone: { in: phones }, usedAt: { not: null } },
        select: { phone: true },
      }),
    ]);

    const consent = new Map(users.map((u) => [u.phoneNorm, u.agreeMarketing]));
    const optedOut = new Set(optOuts.map((o) => normalizePhone(o.phone)));

    list = list.filter((r) => {
      if (optedOut.has(r.to)) {
        blockedDetail.push({ to: r.to, reason: '수신거부 처리된 번호' });
        return false;
      }
      // 회원이면 동의 여부를 따르고, 회원이 아니면 보내지 않습니다
      if (!consent.has(r.to)) {
        blockedDetail.push({ to: r.to, reason: '회원이 아니라 수신동의를 확인할 수 없음' });
        return false;
      }
      if (!consent.get(r.to)) {
        blockedDetail.push({ to: r.to, reason: '마케팅 수신 미동의' });
        return false;
      }
      return true;
    });
  }

  if (list.length === 0) {
    return {
      ...empty,
      blocked: blockedDetail.length,
      blockedDetail,
      message: '보낼 수 있는 대상이 없습니다.',
    };
  }

  // ── 4. 광고 법정 문구 삽입 ──
  const adOpts = adOptionsFrom(setting);
  const finalBody = isAd ? decorateAd(body, adOpts) : body.trim();

  // ── 5. 템플릿(알림톡) 조회 ──
  const template = opts.templateCode
    ? await prisma.messageTemplate.findUnique({ where: { code: opts.templateCode } })
    : null;

  const outgoing: OutgoingMessage[] = list.map((r) => {
    const text = render(finalBody, {
      쇼핑몰: SITE.nameShort,
      이름: r.name ?? '고객',
      ...(r.variables ?? {}),
    });
    return {
      to: r.to,
      text,
      isAd,
      ...(template?.kakaoTemplateId
        ? { kakaoTemplateId: template.kakaoTemplateId, variables: r.variables }
        : {}),
      ...(byteLength(text) > 90 ? { subject: SITE.nameShort } : {}),
    };
  });

  // ── 6. 발송 ──
  const result = await provider.send(
    {
      apiKey: setting.apiKey,
      apiSecret: setting.apiSecret,
      senderNumber: setting.senderNumber,
      pfId: setting.pfId,
    },
    outgoing,
    opts.scheduledAt
  );

  // ── 7. 이력 기록 ──
  let sent = 0;
  let failed = 0;

  const rows = outgoing.map((m, i) => {
    const r = result.results[i];
    const person = list[i];
    const ok = !!r?.ok;
    if (ok) sent++;
    else failed++;

    return {
      to: m.to,
      name: person?.name ?? '',
      type: (template?.kakaoTemplateId ? 'ATA' : messageTypeOf(m.text)) as string,
      templateCode: opts.templateCode ?? null,
      campaignId: opts.campaignId ?? null,
      orderId: opts.orderId ?? null,
      userId: person?.userId ?? null,
      body: m.text.slice(0, 2000),
      isAd,
      status: ok ? 'SENT' : 'FAILED',
      providerMsgId: r?.messageId ?? '',
      errorCode: r?.errorCode ?? '',
      errorMessage: r?.errorMessage ?? '',
      sentAt: ok ? new Date() : null,
    };
  });

  const blockedRows = blockedDetail.map((b) => ({
    to: b.to,
    name: '',
    type: 'SMS',
    templateCode: opts.templateCode ?? null,
    campaignId: opts.campaignId ?? null,
    orderId: opts.orderId ?? null,
    userId: null,
    body: '',
    isAd,
    status: 'BLOCKED',
    blockReason: b.reason,
    providerMsgId: '',
    errorCode: '',
    errorMessage: '',
    sentAt: null,
  }));

  await prisma.messageLog.createMany({ data: [...rows, ...blockedRows] }).catch(() => null);

  return {
    ok: result.ok && failed === 0,
    sent,
    failed,
    blocked: blockedDetail.length,
    blockedDetail,
    message:
      result.message ??
      `발송 ${sent}건 · 실패 ${failed}건${blockedDetail.length ? ` · 제외 ${blockedDetail.length}건` : ''}`,
  };
}

/* ── 주문 알림 (정보성 — 수신동의 불필요) ────────── */

const ORDER_STATUS_TEMPLATE: Record<string, string> = {
  PAID: 'ORDER_PAID',
  PENDING: 'DEPOSIT_WAIT',
  SHIPPING: 'SHIPPING',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

/** 설정에서 이 상황의 자동발송이 켜져 있는지 */
function autoEnabled(
  setting: Awaited<ReturnType<typeof getSetting>>,
  code: string
) {
  switch (code) {
    case 'ORDER_PAID':
      return setting.autoOnPaid;
    case 'DEPOSIT_WAIT':
      return setting.autoOnDeposit;
    case 'SHIPPING':
      return setting.autoOnShipping;
    case 'DELIVERED':
      return setting.autoOnDelivered;
    case 'CANCELLED':
      return setting.autoOnCancelled;
    default:
      return false;
  }
}

/**
 * 주문 상태 변화에 따른 알림을 보냅니다.
 * 주문 안내는 '정보성'이라 광고 수신동의가 없어도 보낼 수 있고 야간 제한도 없습니다.
 * (거래 관계에서 발생한 정보 제공이므로 정보통신망법 제50조의 광고에 해당하지 않습니다)
 */
export async function notifyOrder(
  orderId: string,
  code: string,
  opts: { force?: boolean } = {}
): Promise<SendSummary | null> {
  const setting = await getSetting();
  if (!opts.force && !autoEnabled(setting, code)) return null;
  if (!setting.apiKey || !setting.senderNumber) return null;

  const [order, template] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId }, include: { items: true, payment: true } }),
    prisma.messageTemplate.findUnique({ where: { code } }),
  ]);

  if (!order || !template || !template.isActive) return null;

  const phone = normalizePhone(order.ordererPhone || order.recvPhone);
  if (!isValidMobile(phone)) return null;

  const first = order.items[0]?.productName ?? '상품';
  const productName =
    order.items.length > 1 ? `${first} 외 ${order.items.length - 1}건` : first;

  const trackUrl = order.trackingNo
    ? `https://search.naver.com/search.naver?query=${encodeURIComponent(`${order.courier ?? ''} ${order.trackingNo}`)}`
    : '';

  const vars: Record<string, string> = {
    이름: order.ordererName,
    주문번호: order.orderNo,
    상품명: productName,
    금액: order.totalAmount.toLocaleString('ko-KR'),
    택배사: order.courier ?? '',
    송장번호: order.trackingNo ?? '',
    조회링크: trackUrl,
    입금계좌: `${order.payment?.bankName ?? SITE.bank.name} ${order.payment?.bankAccount ?? SITE.bank.account}`,
    쇼핑몰: SITE.nameShort,
  };

  return sendMessages(
    [{ to: phone, name: order.ordererName, userId: order.userId, variables: vars }],
    template.smsText,
    { isAd: false, templateCode: code, orderId: order.id, skipConsent: true }
  );
}

export function templateCodeForStatus(status: string) {
  return ORDER_STATUS_TEMPLATE[status] ?? null;
}

/* ── 수신거부 ───────────────────────────────── */

export async function issueOptOutToken(phone: string, userId?: string | null) {
  const token = crypto.randomBytes(16).toString('hex');
  await prisma.optOutToken.create({
    data: { token, phone: normalizePhone(phone), userId: userId ?? null },
  });
  return token;
}
