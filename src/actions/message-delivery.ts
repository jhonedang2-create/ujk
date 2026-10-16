'use server';

import { requireOwner } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { DELIVERY_MODES, DELIVERY_POLICY_KEY, type DeliveryMode } from '@/lib/messaging/delivery-rules';

export type DeliveryResult = { ok: boolean; message: string };

/** Saves controls only. Never sends a message or performs a payment. */
export async function saveMessageDelivery(_previous: DeliveryResult, fd: FormData): Promise<DeliveryResult> {
  const session = await requireOwner();
  const enabled = fd.get('enabled') === 'on';
  const mode = String(fd.get('mode') ?? '');
  if (!DELIVERY_MODES.includes(mode as DeliveryMode)) return { ok: false, message: '발송 방식을 다시 선택해 주세요.' };
  const events = {
    autoOnPaid: fd.get('autoOnPaid') === 'on',
    autoOnDeposit: fd.get('autoOnDeposit') === 'on',
    autoOnShipping: fd.get('autoOnShipping') === 'on',
    autoOnDelivered: fd.get('autoOnDelivered') === 'on',
    autoOnCancelled: fd.get('autoOnCancelled') === 'on',
  };
  try {
    await prisma.$transaction(async (tx) => {
      const setting = await tx.messageSetting.findUnique({ where: { id: 'default' } });
      if (enabled) {
        if (!setting?.apiKey || !setting.apiSecret || !setting.senderNumber) {
          throw new Error('먼저 발송 설정에서 SOLAPI 키와 발신번호를 등록해 주세요. 발송은 켜지지 않았습니다.');
        }
        if (setting.provider !== 'solapi') throw new Error('지원하는 발송 업체는 SOLAPI입니다.');
        if (mode !== 'SMS_ONLY') {
          if (!setting.pfId) throw new Error('알림톡 채널 ID를 먼저 등록해 주세요.');
          const codes = [
            ...(events.autoOnPaid ? ['ORDER_PAID'] : []),
            ...(events.autoOnDeposit ? ['DEPOSIT_WAIT'] : []),
            ...(events.autoOnShipping ? ['SHIPPING'] : []),
            ...(events.autoOnDelivered ? ['DELIVERED'] : []),
            ...(events.autoOnCancelled ? ['CANCELLED'] : []),
          ];
          const templates = await tx.messageTemplate.findMany({
            where: { code: { in: codes }, isActive: true, kakaoTemplateId: { not: '' } }, select: { code: true },
          });
          if (codes.some((code) => !templates.some((t) => t.code === code))) {
            throw new Error('켜려는 자동알림의 승인된 템플릿 ID를 모두 등록해 주세요.');
          }
        }
        if (fd.get('acknowledgeCost') !== 'on') throw new Error('유료 발송 안내를 확인해 주세요.');
      }
      const value = JSON.stringify({ enabled, mode });
      await tx.siteSetting.upsert({ where: { key: DELIVERY_POLICY_KEY }, update: { value }, create: { key: DELIVERY_POLICY_KEY, value } });
      await tx.messageSetting.upsert({ where: { id: 'default' }, update: events, create: { id: 'default', ...events } });
      await tx.adminLog.create({ data: {
        userId: session.user.id ?? '', userName: session.user.name ?? '',
        action: 'MESSAGE_DELIVERY_POLICY', target: 'default',
        detail: JSON.stringify({ enabled, mode, ...events }),
      } });
    });
  } catch (error) {
    const known = error instanceof Error ? error.message : '';
    const safe = ['먼저 ', '지원하는 ', '알림톡 ', '켜려는 ', '유료 '].some((prefix) => known.startsWith(prefix));
    return { ok: false, message: safe ? known : '설정을 저장하지 못했습니다. 기존 발송 상태를 확인해 주세요.' };
  }
  revalidatePath('/admin/messages');
  revalidatePath('/admin/messages/controls');
  return { ok: true, message: enabled ? '발송 설정을 저장했습니다. 이후 발생하는 주문 이벤트에 적용됩니다.' : '전체 발송을 중지했습니다. 이미 업체에 접수된 예약 발송은 SOLAPI에서 별도로 취소해야 합니다.' };
}
