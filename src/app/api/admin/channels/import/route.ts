import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  rowsToOrders,
  REQUIRED_FIELDS,
  PRICE_FIELDS,
  FIELD_LABEL,
  type FieldKey,
} from '@/lib/channels/csv';
import { importOrders, logSync } from '@/lib/channels';
import { can } from '@/lib/permissions';

export const maxDuration = 120;

/** 확정된 컬럼매핑으로 실제 주문을 적재합니다. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!can(session?.user, 'channels')) {
    return NextResponse.json({ ok: false, message: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      channelCode: string;
      rows: string[][];
      map: Record<FieldKey, number>;
    };

    if (!body.channelCode) {
      return NextResponse.json({ ok: false, message: '채널을 선택해 주세요.' }, { status: 400 });
    }

    // 존재하지 않는 채널로 넣으면 주문은 들어가고 이력 저장에서 터집니다. 먼저 막습니다.
    const channel = await prisma.channel.findUnique({ where: { code: body.channelCode } });
    if (!channel) {
      return NextResponse.json({ ok: false, message: '알 수 없는 채널입니다.' }, { status: 400 });
    }

    const missing = REQUIRED_FIELDS.filter((f) => (body.map?.[f] ?? -1) < 0);
    if (PRICE_FIELDS.every((f) => (body.map?.[f] ?? -1) < 0)) {
      missing.push('price');
    }
    if (missing.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: `필수 항목이 지정되지 않았습니다: ${missing.map((m) => FIELD_LABEL[m].replace(' *', '')).join(', ')}`,
        },
        { status: 400 }
      );
    }

    const { orders, errors } = rowsToOrders(body.rows ?? [], body.map);
    if (orders.length === 0) {
      return NextResponse.json(
        { ok: false, message: '가져올 주문이 없습니다.', errors },
        { status: 400 }
      );
    }

    const summary = await importOrders(body.channelCode, orders, 'CSV');
    // 스프레드로 넘기면 항목이 수만 개일 때 스택이 터집니다
    summary.errors = [...errors.slice(0, 200), ...summary.errors].slice(0, 500);

    const status = await logSync({
      channelCode: body.channelCode,
      kind: 'ORDER_IMPORT',
      source: 'CSV',
      summary,
    });

    revalidatePath('/admin/orders');
    revalidatePath('/admin/channels');
    revalidatePath('/admin/analytics');

    return NextResponse.json({ ok: true, status, ...summary, total: orders.length });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : '적재 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
