import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { greeting, autoReply, handoffMessage } from '@/lib/chat';
import { clientKey, rateLimit } from '@/lib/rate-limit';

const COOKIE = 'ujgim_chat';

async function getVisitorKey(create: boolean) {
  const store = await cookies();
  let key = store.get(COOKIE)?.value ?? null;
  if (!key && create) {
    key = `v_${crypto.randomUUID()}`;
    store.set(COOKIE, key, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 90,
      path: '/',
    });
  }
  return key;
}

/**
 * 고객용 상담 API — 한 엔드포인트에서 action 으로 분기합니다.
 *   init : 방 조회/생성 + 첫 인사
 *   send : 고객 메시지 저장 + 자동응답
 *   poll : 마지막 메시지 이후 새 메시지만 가져오기 (실시간처럼 보이게 3초 주기)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action as 'init' | 'send' | 'poll';

    if (action === 'poll') {
      const key = await getVisitorKey(false);
      if (!key) return NextResponse.json({ ok: true, messages: [], status: 'OPEN' });

      const room = await prisma.chatRoom.findUnique({ where: { visitorKey: key } });
      if (!room) return NextResponse.json({ ok: true, messages: [], status: 'OPEN' });

      const after = body.after ? new Date(body.after) : new Date(0);
      const messages = await prisma.chatMessage.findMany({
        where: { roomId: room.id, createdAt: { gt: after } },
        orderBy: { createdAt: 'asc' },
      });

      // 고객이 창을 보고 있으면 읽음 처리
      if (body.open && room.unreadUser > 0) {
        await prisma.chatRoom.update({ where: { id: room.id }, data: { unreadUser: 0 } });
      }

      return NextResponse.json({
        ok: true,
        roomId: room.id,
        status: room.status,
        unread: room.unreadUser,
        messages,
      });
    }

    const key = await getVisitorKey(true);
    const session = await auth();

    let room = await prisma.chatRoom.findUnique({ where: { visitorKey: key! } });

    if (!room) {
      room = await prisma.chatRoom.create({
        data: {
          visitorKey: key!,
          userId: session?.user?.id ?? null,
          name: session?.user?.name ?? '고객',
          email: session?.user?.email ?? '',
          entryPath: String(body.path ?? ''),
          userAgent: req.headers.get('user-agent')?.slice(0, 200) ?? '',
          lastMessage: '',
        },
      });
      await prisma.chatMessage.create({
        data: { roomId: room.id, sender: 'BOT', content: greeting(), isRead: true },
      });
    }

    if (action === 'send') {
      const limited = rateLimit(`chat:${clientKey(req.headers)}`, 30, 10 * 60 * 1000);
      if (!limited.ok) {
        return NextResponse.json({ ok: false, message: '메시지가 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, { status: 429 });
      }
      const content = String(body.content ?? '').trim().slice(0, 2000);
      if (!content) return NextResponse.json({ ok: false, message: '내용을 입력해 주세요.' }, { status: 400 });

      await prisma.chatMessage.create({
        data: { roomId: room.id, sender: 'USER', content },
      });

      const isFirstUserMsg =
        (await prisma.chatMessage.count({ where: { roomId: room.id, sender: 'USER' } })) === 1;

      await prisma.chatRoom.update({
        where: { id: room.id },
        data: {
          lastMessage: content,
          lastMessageAt: new Date(),
          unreadAdmin: { increment: 1 },
          status: 'OPEN',
          ...(isFirstUserMsg ? { topic: content.slice(0, 60) } : {}),
          ...(body.name ? { name: String(body.name).slice(0, 40) } : {}),
          ...(body.phone ? { phone: String(body.phone).slice(0, 30) } : {}),
        },
      });

      // 규칙 기반 1차 자동응답 (상담원이 아직 붙기 전)
      const reply = autoReply(content);
      const answeredByHuman = await prisma.chatMessage.count({
        where: { roomId: room.id, sender: 'ADMIN' },
      });

      if (answeredByHuman === 0) {
        const botText = reply ?? handoffMessage();
        await prisma.chatMessage.create({
          data: { roomId: room.id, sender: 'BOT', content: botText },
        });
      }
    }

    // 최신 100건을 가져와 오래된 순으로 뒤집습니다.
    // (asc + take 로 하면 대화가 100건을 넘는 순간 옛날 메시지만 돌아옵니다)
    const recent = await prisma.chatMessage.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const messages = recent.reverse();

    await prisma.chatRoom.update({ where: { id: room.id }, data: { unreadUser: 0 } });

    return NextResponse.json({ ok: true, roomId: room.id, status: room.status, messages });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : '오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
