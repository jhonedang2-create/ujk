import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getAdapter, importOrders, logSync } from '@/lib/channels';
import { can } from '@/lib/permissions';
import { openSecret } from '@/lib/secret-box';

export const maxDuration = 180;

/**
 * 채널 API 동기화
 *   action: 'test'  — 인증정보 확인
 *           'orders'— 기간 내 주문 가져오기
 *           'stock' — 자사 재고를 채널로 밀어넣기
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!can(session?.user, 'channels')) {
    return NextResponse.json({ ok: false, message: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const { code, action, days } = await req.json();

    const channel = await prisma.channel.findUnique({ where: { code } });
    if (!channel) {
      return NextResponse.json({ ok: false, message: '채널을 찾을 수 없습니다.' }, { status: 404 });
    }

    const adapter = getAdapter(channel.adapter);
    if (!adapter) {
      return NextResponse.json(
        { ok: false, message: '이 채널은 API 연동을 지원하지 않습니다. 주문 파일 업로드를 이용해 주세요.' },
        { status: 400 }
      );
    }

    const cred = {
      cred1: openSecret(channel.cred1),
      cred2: openSecret(channel.cred2),
      cred3: openSecret(channel.cred3),
    };

    if (action === 'test') {
      const r = await adapter.test(cred);
      await prisma.channel.update({
        where: { code },
        data: {
          apiConnected: r.ok,
          lastSyncStatus: r.ok ? 'OK' : 'FAIL',
          lastSyncNote: r.message.slice(0, 300),
          lastSyncAt: new Date(),
        },
      }).catch(() => null);
      revalidatePath('/admin/channels');
      return NextResponse.json(r);
    }

    if (action === 'orders') {
      const d = Math.min(31, Math.max(1, Number(days) || 7));
      const to = new Date();
      const from = new Date(to.getTime() - d * 24 * 60 * 60 * 1000);

      const result = await adapter.fetchOrders(cred, from, to);
      if (!result.ok && result.orders.length === 0) {
        await logSync({
          channelCode: code,
          kind: 'ORDER_IMPORT',
          source: 'API',
          summary: { imported: 0, skipped: 0, failed: 1, errors: [result.message ?? ''] },
          message: result.message,
        });
        revalidatePath('/admin/channels');
        return NextResponse.json({ ok: false, message: result.message ?? '주문 조회 실패' }, { status: 400 });
      }

      const summary = await importOrders(code, result.orders, 'API');
      const status = await logSync({ channelCode: code, kind: 'ORDER_IMPORT', source: 'API', summary });

      revalidatePath('/admin/orders');
      revalidatePath('/admin/channels');
      revalidatePath('/admin/analytics');

      return NextResponse.json({ ok: true, status, fetched: result.orders.length, ...summary });
    }

    if (action === 'stock') {
      if (!adapter.pushStock) {
        return NextResponse.json({ ok: false, message: '재고 반영을 지원하지 않는 채널입니다.' }, { status: 400 });
      }

      const maps = await prisma.channelProduct.findMany({
        where: { channelCode: code, syncStock: true },
        include: { product: { select: { stock: true } } },
      });

      if (maps.length === 0) {
        return NextResponse.json(
          { ok: false, message: '재고를 반영할 상품 매핑이 없습니다. 먼저 상품 연결을 등록해 주세요.' },
          { status: 400 }
        );
      }

      const r = await adapter.pushStock(
        cred,
        maps.map((m) => ({
          externalProductId: m.externalProductId,
          externalItemId: m.externalItemId,
          stock: m.product.stock,
        }))
      );

      await prisma.syncLog.create({
        data: {
          channelCode: code,
          kind: 'STOCK_PUSH',
          source: 'API',
          status: r.ok ? 'OK' : 'FAIL',
          imported: r.updated,
          message: r.message.slice(0, 300),
        },
      });

      if (r.ok) {
        await prisma.channelProduct.updateMany({
          where: { channelCode: code, syncStock: true },
          data: { lastPushedAt: new Date() },
        });
      }

      revalidatePath('/admin/channels');
      return NextResponse.json(r);
    }

    return NextResponse.json({ ok: false, message: '알 수 없는 요청입니다.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : '동기화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
