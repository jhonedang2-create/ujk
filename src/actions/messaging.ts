'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requirePermission, requireOwner, auth } from '@/auth';
import {
  getSetting,
  providerOf,
  sendMessages,
  adOptionsFrom,
  decorateAd,
  checkAdCompliance,
  normalizePhone,
  isValidMobile,
  parseKstLocal,
  notifyOrder,
  type Recipient,
} from '@/lib/messaging';

export type Res = { ok: boolean; message: string };

const s = (fd: FormData, k: string, def = '') => String(fd.get(k) ?? def).trim();
const b = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';

async function log(action: string, target: string, detail = '') {
  const session = await auth();
  await prisma.adminLog
    .create({
      data: {
        userId: session?.user?.id ?? '',
        userName: session?.user?.name ?? '',
        action,
        target: target.slice(0, 200),
        detail: detail.slice(0, 500),
      },
    })
    .catch(() => null);
}

/* ── 설정 ── */

export async function saveMessageSetting(_prev: Res, fd: FormData): Promise<Res> {
  await requireOwner();

  const data = {
    provider: s(fd, 'provider', 'solapi'),
    senderNumber: normalizePhone(s(fd, 'senderNumber')),
    pfId: s(fd, 'pfId'),
    channelName: s(fd, 'channelName'),
    autoOnPaid: b(fd, 'autoOnPaid'),
    autoOnDeposit: b(fd, 'autoOnDeposit'),
    autoOnShipping: b(fd, 'autoOnShipping'),
    autoOnDelivered: b(fd, 'autoOnDelivered'),
    autoOnCancelled: b(fd, 'autoOnCancelled'),
    adNightBlock: true, // 법정 의무 — 끄지 못하게 고정
    adPrefix: s(fd, 'adPrefix', '(광고)') || '(광고)',
    adOptOutText: s(fd, 'adOptOutText', '무료수신거부 '),
    adOptOutUrl: s(fd, 'adOptOutUrl'),
    // 키는 입력했을 때만 덮어씁니다
    ...(s(fd, 'apiKey') ? { apiKey: s(fd, 'apiKey') } : {}),
    ...(s(fd, 'apiSecret') ? { apiSecret: s(fd, 'apiSecret') } : {}),
  };

  await prisma.messageSetting.upsert({
    where: { id: 'default' },
    update: data,
    create: { id: 'default', ...data },
  });

  await log('MESSAGE_SETTING', 'default');
  revalidatePath('/admin/messages');
  return { ok: true, message: '저장되었습니다.' };
}

export async function testMessageProvider(): Promise<Res & { balance?: number }> {
  await requireOwner();
  const setting = await getSetting();
  const provider = providerOf(setting.provider);
  if (!provider) return { ok: false, message: '발송 업체가 선택되지 않았습니다.' };

  const r = await provider.test({
    apiKey: setting.apiKey,
    apiSecret: setting.apiSecret,
    senderNumber: setting.senderNumber,
    pfId: setting.pfId,
  });
  return r;
}

/* ── 템플릿 ── */

export async function saveTemplate(_prev: Res, fd: FormData): Promise<Res> {
  await requirePermission('messages');
  const code = s(fd, 'code');
  if (!code) return { ok: false, message: '템플릿 코드가 없습니다.' };
  const smsText = s(fd, 'smsText');
  if (!smsText) return { ok: false, message: '문구를 입력해 주세요.' };

  await prisma.messageTemplate.upsert({
    where: { code },
    update: {
      name: s(fd, 'name') || code,
      kakaoTemplateId: s(fd, 'kakaoTemplateId'),
      smsText,
      isActive: b(fd, 'isActive'),
    },
    create: {
      code,
      name: s(fd, 'name') || code,
      kakaoTemplateId: s(fd, 'kakaoTemplateId'),
      smsText,
      isActive: b(fd, 'isActive'),
    },
  });

  revalidatePath('/admin/messages');
  return { ok: true, message: '저장되었습니다.' };
}

/** 주문 하나를 골라 알림을 다시 보냅니다 (테스트·재발송용) */
export async function resendOrderNotice(orderId: string, code: string): Promise<Res> {
  await requirePermission('messages');
  const r = await notifyOrder(orderId, code, { force: true });
  if (!r) return { ok: false, message: '발송 설정 또는 템플릿을 확인해 주세요.' };
  await log('MESSAGE_RESEND', orderId, code);
  revalidatePath('/admin/messages');
  return { ok: r.sent > 0, message: r.message };
}

/* ── 개별 발송 ── */

export async function sendDirect(_prev: Res, fd: FormData): Promise<Res> {
  await requirePermission('messages');

  const raw = s(fd, 'to');
  const body = s(fd, 'body');
  const isAd = b(fd, 'isAd');
  if (!raw) return { ok: false, message: '받는 번호를 입력해 주세요.' };
  if (!body) return { ok: false, message: '내용을 입력해 주세요.' };

  const numbers = raw
    .split(/[\s,;\n]+/)
    .map(normalizePhone)
    .filter(isValidMobile);

  if (numbers.length === 0) return { ok: false, message: '올바른 휴대폰 번호가 없습니다.' };
  if (numbers.length > 100) {
    return { ok: false, message: '개별 발송은 한 번에 100건까지입니다. 대량 발송을 이용해 주세요.' };
  }

  const users = await prisma.user.findMany({
    where: { phoneNorm: { in: numbers } },
    select: { id: true, name: true, phoneNorm: true },
  });
  const byPhone = new Map(users.map((u) => [u.phoneNorm, u]));

  const recipients: Recipient[] = numbers.map((n) => ({
    to: n,
    name: byPhone.get(n)?.name ?? '고객',
    userId: byPhone.get(n)?.id ?? null,
  }));

  const r = await sendMessages(recipients, body, { isAd });
  await log('MESSAGE_SEND', `${numbers.length}건`, isAd ? '광고' : '정보');
  revalidatePath('/admin/messages');

  return { ok: r.sent > 0, message: r.message };
}

/* ── 대량(캠페인) 발송 ── */

export type TargetType = 'ALL' | 'GRADE' | 'BUYER' | 'NONBUYER' | 'MANUAL';

/** 조건에 맞는 대상 수 미리보기 */
export async function previewTargets(
  targetType: string,
  detail: string
): Promise<{ total: number; agreed: number; sample: string[] }> {
  await requirePermission('messages');

  if (targetType === 'MANUAL') {
    const nums = detail
      .split(/[\s,;\n]+/)
      .map(normalizePhone)
      .filter(isValidMobile);
    const uniq = [...new Set(nums)];
    return { total: uniq.length, agreed: uniq.length, sample: uniq.slice(0, 5) };
  }

  const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const where =
    targetType === 'GRADE'
      ? { grade: detail || 'BASIC' }
      : targetType === 'BUYER'
        ? { orders: { some: { createdAt: { gte: since90 }, status: { not: 'CANCELLED' } } } }
        : targetType === 'NONBUYER'
          ? { orders: { none: {} } }
          : {};

  const base = { ...where, status: 'ACTIVE', phoneNorm: { not: '' } };

  const [total, agreedUsers] = await Promise.all([
    prisma.user.count({ where: base }),
    prisma.user.findMany({
      where: { ...base, agreeMarketing: true },
      select: { phoneNorm: true, name: true },
      take: 5000,
    }),
  ]);

  return {
    total,
    agreed: agreedUsers.length,
    sample: agreedUsers.slice(0, 5).map((u) => `${u.name ?? ''} ${u.phoneNorm}`.trim()),
  };
}

export async function sendCampaign(_prev: Res, fd: FormData): Promise<Res> {
  await requirePermission('messages');

  const name = s(fd, 'name');
  const body = s(fd, 'body');
  const targetType = s(fd, 'targetType', 'ALL');
  const targetDetail = s(fd, 'targetDetail');
  const isAd = fd.get('isAd') !== 'off'; // 홍보는 기본 광고성
  const scheduledRaw = s(fd, 'scheduledAt');

  if (!name) return { ok: false, message: '캠페인 이름을 입력해 주세요.' };
  if (!body) return { ok: false, message: '내용을 입력해 주세요.' };

  const setting = await getSetting();
  const adOpts = adOptionsFrom(setting);
  const finalBody = isAd ? decorateAd(body, adOpts) : body;

  // datetime-local 값("2026-08-26T09:00")에는 시간대가 없어서 서버 로컬로 해석됩니다.
  // 서버가 UTC 면 9시간이 밀리므로 KST 로 못박습니다.
  let scheduledAt: Date | undefined;
  if (scheduledRaw) {
    const parsed = parseKstLocal(scheduledRaw);
    if (!parsed) return { ok: false, message: '예약 시각이 올바르지 않습니다.' };
    if (parsed.getTime() < Date.now() - 60_000) {
      return { ok: false, message: '예약 시각이 이미 지났습니다.' };
    }
    scheduledAt = parsed;
  }

  // 법정 요건 점검 (예약이면 예약 시각 기준)
  if (isAd) {
    const issues = checkAdCompliance(finalBody, adOpts, scheduledAt ?? new Date());
    const errors = issues.filter((i) => i.level === 'error');
    if (errors.length > 0) {
      return { ok: false, message: errors.map((e) => e.message).join(' / ') };
    }
  }

  // 대상 수집
  let recipients: Recipient[] = [];

  if (targetType === 'MANUAL') {
    const nums = [
      ...new Set(targetDetail.split(/[\s,;\n]+/).map(normalizePhone).filter(isValidMobile)),
    ];
    const users = await prisma.user.findMany({
      where: { phoneNorm: { in: nums } },
      select: { id: true, name: true, phoneNorm: true },
    });
    const byPhone = new Map(users.map((u) => [u.phoneNorm, u]));
    recipients = nums.map((n) => ({
      to: n,
      name: byPhone.get(n)?.name ?? '고객',
      userId: byPhone.get(n)?.id ?? null,
    }));
  } else {
    const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const where =
      targetType === 'GRADE'
        ? { grade: targetDetail || 'BASIC' }
        : targetType === 'BUYER'
          ? { orders: { some: { createdAt: { gte: since90 }, status: { not: 'CANCELLED' } } } }
          : targetType === 'NONBUYER'
            ? { orders: { none: {} } }
            : {};

    const users = await prisma.user.findMany({
      where: {
        ...where,
        status: 'ACTIVE',
        phoneNorm: { not: '' },
        ...(isAd ? { agreeMarketing: true } : {}),
      },
      select: { id: true, name: true, phoneNorm: true },
      take: 20000,
    });
    recipients = users.map((u) => ({
      to: u.phoneNorm,
      name: u.name ?? '고객',
      userId: u.id,
    }));
  }

  if (recipients.length === 0) {
    return { ok: false, message: '조건에 맞는 대상이 없습니다. (광고는 수신동의한 회원만 대상이 됩니다)' };
  }

  const campaign = await prisma.campaign.create({
    data: {
      name,
      type: 'LMS',
      body: finalBody,
      isAd,
      targetType,
      targetDetail: targetDetail.slice(0, 2000),
      scheduledAt: scheduledAt ?? null,
      status: 'SENDING',
      total: recipients.length,
      createdById: (await auth())?.user?.id ?? '',
    },
  });

  const r = await sendMessages(recipients, finalBody, {
    isAd,
    campaignId: campaign.id,
    scheduledAt,
  });

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: r.sent > 0 ? 'DONE' : 'FAILED',
      sent: r.sent,
      failed: r.failed,
      blocked: r.blocked,
      sentAt: new Date(),
    },
  });

  await log('CAMPAIGN_SEND', name, `${r.sent}건 발송`);
  revalidatePath('/admin/messages');

  return {
    ok: r.sent > 0,
    message: `${r.message}${scheduledAt ? ' (예약 접수됨)' : ''}`,
  };
}
