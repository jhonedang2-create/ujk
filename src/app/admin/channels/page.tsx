import { guardPage } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import ChannelManager from '@/components/admin/ChannelManager';
import { ADAPTERS } from '@/lib/channels';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: '판매채널 연동' };

export default async function ChannelsPage() {
  const session = await guardPage('channels');
  const isOwner = session.user.role === 'ADMIN';

  const [channels, products, maps, keys, logs, counts] = await Promise.all([
    prisma.channel.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.product.findMany({
      select: { id: true, name: true, sku: true, stock: true },
      orderBy: { name: 'asc' },
    }),
    prisma.channelProduct.findMany({
      include: { product: { select: { name: true, sku: true, stock: true } } },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
    prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.syncLog.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }),
    prisma.order.groupBy({ by: ['channelCode'], _count: true, _sum: { totalAmount: true } }),
  ]);

  const adapterInfo = Object.fromEntries(
    Object.entries(ADAPTERS).map(([k, a]) => [k, { label: a.label, credLabels: a.credLabels }])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">판매채널 연동</h1>
        <p className="mt-1 text-sm text-gim-500">
          오픈마켓 주문을 자사몰로 모아서 한 화면에서 관리합니다. API 연동과 주문 파일 업로드 두 가지 방법을 모두 지원합니다.
        </p>
      </div>

      <ChannelManager
        isOwner={isOwner}
        channels={channels.map((c) => ({
          code: c.code,
          name: c.name,
          type: c.type,
          color: c.color,
          adapter: c.adapter,
          syncMode: c.syncMode,
          autoSync: c.autoSync,
          isActive: c.isActive,
          sortOrder: c.sortOrder,
          hasCred: !!(c.cred1 && c.cred2),
          apiConnected: c.apiConnected,
          lastSyncAt: c.lastSyncAt ? c.lastSyncAt.toISOString() : null,
          lastSyncStatus: c.lastSyncStatus,
          lastSyncNote: c.lastSyncNote,
          orderCount: counts.find((x) => x.channelCode === c.code)?._count ?? 0,
          revenue: counts.find((x) => x.channelCode === c.code)?._sum.totalAmount ?? 0,
        }))}
        products={products}
        maps={maps.map((m) => ({
          id: m.id,
          channelCode: m.channelCode,
          productId: m.productId,
          productName: m.product.name,
          productStock: m.product.stock,
          externalProductId: m.externalProductId,
          externalItemId: m.externalItemId,
          externalName: m.externalName,
          externalSku: m.externalSku,
          syncStock: m.syncStock,
          lastPushedAt: m.lastPushedAt ? m.lastPushedAt.toISOString() : null,
        }))}
        apiKeys={(isOwner ? keys : []).map((k) => ({
          id: k.id,
          name: k.name,
          prefix: k.prefix,
          scopes: k.scopes,
          isActive: k.isActive,
          callCount: k.callCount,
          lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
          createdAt: k.createdAt.toISOString(),
        }))}
        logs={logs.map((l) => ({
          id: l.id,
          channelCode: l.channelCode,
          kind: l.kind,
          source: l.source,
          status: l.status,
          imported: l.imported,
          skipped: l.skipped,
          failed: l.failed,
          message: l.message,
          createdAt: l.createdAt.toISOString(),
        }))}
        adapterInfo={adapterInfo}
      />
    </div>
  );
}
