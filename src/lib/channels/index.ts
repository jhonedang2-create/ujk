import { prisma } from '@/lib/prisma';
import { coupangAdapter } from './coupang';
import { naverAdapter } from './naver';
import type { ChannelAdapter, NormalizedOrder } from './types';
import { settleOrderCancellation } from '@/lib/payments';

export * from './types';
export { coupangAdapter, naverAdapter };

export const ADAPTERS: Record<string, ChannelAdapter> = {
  coupang: coupangAdapter,
  naver: naverAdapter,
};

export function getAdapter(key: string): ChannelAdapter | null {
  return ADAPTERS[key] ?? null;
}

/** 기본 채널 (시드에서 생성) */
export const DEFAULT_CHANNELS = [
  { code: 'SELF', name: '자사몰', type: 'SELF', color: '#1e4f5e', adapter: '', syncMode: 'MANUAL', sortOrder: 0 },
  { code: 'SMARTSTORE', name: '네이버 스마트스토어', type: 'OPENMARKET', color: '#03C75A', adapter: 'naver', syncMode: 'API', sortOrder: 1 },
  { code: 'COUPANG', name: '쿠팡', type: 'OPENMARKET', color: '#eb6834', adapter: 'coupang', syncMode: 'API', sortOrder: 2 },
  { code: 'ELEVENST', name: '11번가', type: 'OPENMARKET', color: '#e34948', adapter: '', syncMode: 'MANUAL', sortOrder: 3 },
  { code: 'GMARKET', name: 'G마켓', type: 'OPENMARKET', color: '#1baf7a', adapter: '', syncMode: 'MANUAL', sortOrder: 4 },
  { code: 'AUCTION', name: '옥션', type: 'OPENMARKET', color: '#eda100', adapter: '', syncMode: 'MANUAL', sortOrder: 5 },
  { code: 'OFFLINE', name: '오프라인·납품', type: 'OFFLINE', color: '#584d3d', adapter: '', syncMode: 'MANUAL', sortOrder: 6 },
  { code: 'ETC', name: '기타 채널', type: 'OPENMARKET', color: '#9b8e74', adapter: '', syncMode: 'MANUAL', sortOrder: 7 },
] as const;

const UNMATCHED_SKU = '__UNMATCHED__';

/** 미매칭 품목을 담아둘 숨김 상품 (없으면 만들어서 재사용) */
async function getUnmatchedProductId(): Promise<string | null> {
  const found = await prisma.product.findFirst({ where: { sku: UNMATCHED_SKU } });
  if (found) return found.id;

  const category =
    (await prisma.category.findFirst({ orderBy: { sortOrder: 'asc' } })) ?? null;
  if (!category) return null;

  const created = await prisma.product
    .create({
      data: {
        name: '[미매칭 주문 품목]',
        slug: `unmatched-${Date.now().toString(36)}`,
        sku: UNMATCHED_SKU,
        categoryId: category.id,
        summary: '오픈마켓 주문 중 자사 상품과 연결되지 않은 품목이 임시로 담기는 자리입니다.',
        price: 0,
        stock: 0,
        isActive: false, // 쇼핑몰에는 노출되지 않습니다
      },
    })
    .catch(() => null);

  return created?.id ?? null;
}

export type ImportSummary = {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
};

/**
 * 정규화된 주문을 자사 DB 에 넣습니다.
 *
 * - externalKey("{채널}:{채널주문번호}") 로 중복을 막습니다. 같은 파일을 두 번 올려도 안전합니다.
 * - 채널 상품 매핑(ChannelProduct)이나 SKU 로 자사 상품을 찾고, 못 찾으면 '미매칭' 으로 둡니다.
 *   (주문은 그대로 들어오고, 매칭만 나중에 이어붙이면 됩니다)
 * - 오픈마켓 주문은 이미 결제가 끝난 건이므로 자사 재고를 차감합니다.
 */
export async function importOrders(
  channelCode: string,
  orders: NormalizedOrder[],
  source: 'API' | 'CSV'
): Promise<ImportSummary> {
  const summary: ImportSummary = { imported: 0, skipped: 0, failed: 0, errors: [] };
  if (orders.length === 0) return summary;

  // 매칭용 사전 로딩
  const [maps, products] = await Promise.all([
    prisma.channelProduct.findMany({ where: { channelCode } }),
    prisma.product.findMany({ select: { id: true, sku: true, name: true } }),
  ]);

  const byExternal = new Map(
    maps.map((m) => [`${m.externalProductId}|${m.externalItemId}`, m])
  );
  const bySku = new Map(maps.filter((m) => m.externalSku).map((m) => [m.externalSku, m]));
  const productBySku = new Map(products.filter((p) => p.sku).map((p) => [p.sku as string, p]));
  const productByName = new Map(products.map((p) => [p.name.replace(/\s/g, ''), p]));

  // 미매칭 품목은 전용 플레이스홀더에 붙입니다.
  // (임의의 실제 상품에 붙이면 카테고리별 매출이 엉뚱한 곳으로 잡힙니다)
  const fallbackProduct = await getUnmatchedProductId();

  for (const o of orders) {
    const externalKey = `${channelCode}:${o.channelOrderNo}`;

    try {
      const exists = await prisma.order.findUnique({ where: { externalKey } });
      if (exists) {
        if (['CANCELLED', 'REFUNDED'].includes(o.status) && !['CANCELLED', 'REFUNDED'].includes(exists.status)) {
          await settleOrderCancellation(exists.id, `${channelCode} 주문 상태 동기화`);
        } else if (exists.status !== 'PENDING' && ['PAID', 'PREPARING', 'SHIPPING', 'DELIVERED'].includes(o.status)) {
          await prisma.order.update({
            where: { id: exists.id },
            data: {
              status: o.status,
              ...(o.status === 'SHIPPING' && !exists.shippedAt ? { shippedAt: new Date() } : {}),
              ...(o.status === 'DELIVERED' && !exists.deliveredAt ? { deliveredAt: new Date() } : {}),
            },
          });
        }
        summary.skipped++;
        continue;
      }

      // 상품 매칭
      const resolved = o.items.map((it) => {
        const m =
          byExternal.get(`${it.externalProductId}|${it.externalItemId}`) ??
          byExternal.get(`${it.externalProductId}|`) ??
          (it.externalSku ? bySku.get(it.externalSku) : undefined);

        let productId = m?.productId ?? null;
        let optionId = m?.optionId ?? null;

        if (!productId && it.externalSku) {
          productId = productBySku.get(it.externalSku)?.id ?? null;
        }
        if (!productId) {
          productId = productByName.get(it.productName.replace(/\s/g, ''))?.id ?? null;
        }

        return { it, productId, optionId, matched: !!productId };
      });

      const unmatched = resolved.filter((r) => !r.matched).length;

      if (!fallbackProduct && unmatched > 0) {
        summary.failed++;
        summary.errors.push(
          `${o.channelOrderNo}: 매칭할 상품이 없습니다. 상품을 먼저 등록해 주세요.`
        );
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            // 채널 코드를 자르면 SMARTSTORE / SMARTSTORE2 가 충돌합니다. 전체를 씁니다.
            orderNo: `${channelCode}-${o.channelOrderNo}`.slice(0, 80),
            channelCode,
            channelOrderNo: o.channelOrderNo,
            externalKey,
            channelRaw: source === 'CSV' ? '' : JSON.stringify(o.raw ?? {}).slice(0, 20000),

            ordererName: o.ordererName,
            ordererPhone: o.ordererPhone,
            ordererEmail: o.ordererEmail,
            receiver: o.receiver,
            recvPhone: o.recvPhone,
            zipcode: o.zipcode,
            address1: o.address1,
            address2: o.address2,
            memo: o.memo,

            itemTotal: o.itemTotal,
            shippingFee: o.shippingFee,
            totalAmount: o.totalAmount,
            status: o.status,
            stockReserved: !['CANCELLED', 'REFUNDED', 'PENDING'].includes(o.status),
            createdAt: o.orderedAt,

            items: {
              create: resolved.map((r) => ({
                productId: (r.productId ?? fallbackProduct) as string,
                optionId: r.optionId,
                productName: r.matched
                  ? r.it.productName
                  : `[미매칭] ${r.it.productName}`,
                optionName: r.it.optionName,
                imageUrl: '',
                price: r.it.price,
                quantity: r.it.quantity,
              })),
            },
          },
        });

        await tx.payment.create({
          data: {
            orderId: created.id,
            method: 'EXTERNAL',
            provider: channelCode,
            status: ['CANCELLED', 'REFUNDED', 'PENDING'].includes(o.status) ? 'READY' : 'PAID',
            amount: o.totalAmount,
            merchantUid: o.channelOrderNo,
            paidAt: ['CANCELLED', 'REFUNDED', 'PENDING'].includes(o.status) ? null : o.orderedAt,
          },
        });

        // 결제된 주문만 재고 차감 (0 아래로 내려가지 않게 막습니다)
        if (!['CANCELLED', 'REFUNDED', 'PENDING'].includes(o.status)) {
          for (const r of resolved) {
            if (!r.matched || !r.productId) continue;
            const reserved = await tx.product.updateMany({
              where: { id: r.productId, stock: { gte: r.it.quantity } },
              data: { stock: { decrement: r.it.quantity }, soldCount: { increment: r.it.quantity } },
            });
            // 외부채널에서 이미 판매된 주문은 재고 부족이어도 매출에는 반영하되 재고를 음수로 만들지 않습니다.
            if (reserved.count === 0) {
              await tx.product.update({
                where: { id: r.productId },
                data: { soldCount: { increment: r.it.quantity } },
              });
            }
            if (r.optionId) {
              await tx.productOption.updateMany({
                where: { id: r.optionId, productId: r.productId, stock: { gte: r.it.quantity } },
                data: { stock: { decrement: r.it.quantity } },
              });
            }
          }
        }
      });

      summary.imported++;
      if (unmatched > 0) {
        summary.errors.push(
          `${o.channelOrderNo}: ${unmatched}개 품목이 자사 상품과 매칭되지 않았습니다. (주문은 등록됨)`
        );
      }
    } catch (e) {
      summary.failed++;
      summary.errors.push(
        `${o.channelOrderNo}: ${e instanceof Error ? e.message : '알 수 없는 오류'}`
      );
    }
  }

  return summary;
}

/** 동기화 이력 기록 */
export async function logSync(params: {
  channelCode: string;
  kind: string;
  source: string;
  summary: ImportSummary;
  message?: string;
}) {
  const { channelCode, kind, source, summary } = params;
  const status = summary.failed > 0 ? (summary.imported > 0 ? 'PARTIAL' : 'FAIL') : 'OK';

  await prisma.syncLog.create({
    data: {
      channelCode,
      kind,
      source,
      status,
      imported: summary.imported,
      skipped: summary.skipped,
      failed: summary.failed,
      message:
        params.message ??
        `신규 ${summary.imported}건 · 중복 ${summary.skipped}건 · 실패 ${summary.failed}건`,
      detail: JSON.stringify(summary.errors.slice(0, 50)),
    },
  });

  await prisma.channel.update({
    where: { code: channelCode },
    data: {
      lastSyncAt: new Date(),
      lastSyncStatus: status,
      lastSyncNote: `신규 ${summary.imported} · 중복 ${summary.skipped} · 실패 ${summary.failed}`,
    },
  }).catch(() => null);

  return status;
}
