import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { can } from '@/lib/permissions';
import { getSetting } from '@/lib/messaging';
import MessageManager from '@/components/admin/MessageManager';
import { fmtDate } from '@/lib/utils';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const metadata = { title: '알림톡 · 문자' };

export default async function MessagesPage() {
  const session = await auth();
  if (!can(session?.user, 'messages')) redirect('/admin');

  const setting = await getSetting();

  const [templates, campaigns, logs, counts] = await Promise.all([
    prisma.messageTemplate.findMany({ orderBy: { code: 'asc' } }),
    prisma.campaign.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.messageLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.user.count({ where: { agreeMarketing: true, status: 'ACTIVE', phoneNorm: { not: '' } } }),
  ]);

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">알림톡 · 문자</h1>
        <p className="mt-1 text-sm text-gim-500">
          주문 안내 자동 발송과 홍보 문자를 한 곳에서 관리합니다.
        </p>
      </div>

      <MessageManager
        isOwner={session?.user?.role === 'ADMIN'}
        agreedCount={counts}
        defaultOptOutUrl={`${site.replace(/\/$/, '')}/unsubscribe`}
        senderName={SITE.nameShort}
        senderTel={SITE.tel}
        setting={{
          provider: setting.provider,
          hasKey: !!(setting.apiKey && setting.apiSecret),
          senderNumber: setting.senderNumber,
          pfId: setting.pfId,
          channelName: setting.channelName,
          autoOnPaid: setting.autoOnPaid,
          autoOnDeposit: setting.autoOnDeposit,
          autoOnShipping: setting.autoOnShipping,
          autoOnDelivered: setting.autoOnDelivered,
          autoOnCancelled: setting.autoOnCancelled,
          adPrefix: setting.adPrefix,
          adOptOutText: setting.adOptOutText,
          adOptOutUrl: setting.adOptOutUrl,
        }}
        templates={templates.map((t) => ({
          code: t.code,
          name: t.name,
          kakaoTemplateId: t.kakaoTemplateId,
          smsText: t.smsText,
          description: t.description,
          isActive: t.isActive,
        }))}
        campaigns={campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          body: c.body,
          isAd: c.isAd,
          targetType: c.targetType,
          status: c.status,
          total: c.total,
          sent: c.sent,
          failed: c.failed,
          blocked: c.blocked,
          scheduledAt: c.scheduledAt ? fmtDate(c.scheduledAt, true) : null,
          createdAt: fmtDate(c.createdAt, true),
        }))}
        logs={logs.map((l) => ({
          id: l.id,
          to: l.to,
          name: l.name,
          type: l.type,
          status: l.status,
          blockReason: l.blockReason,
          errorMessage: l.errorMessage,
          isAd: l.isAd,
          body: l.body,
          at: fmtDate(l.createdAt, true),
        }))}
      />
    </div>
  );
}
