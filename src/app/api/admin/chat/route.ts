import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { can } from '@/lib/permissions';

/**
 * 관리자 상담 API
 *   rooms    : 상담방 목록 (+ 전체 미읽음 수)
 *   messages : 특정 방 메시지 (after 이후만 받으면 폴링 비용이 거의 없음)
 *   send     : 상담원 답장
 *   read     : 읽음 처리
 *   status   : 상담 종료/재개
 *   memo     : 고객 정보 수정
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!can(session?.user, 'chat')) {
    return NextResponse.json({ ok: false, message: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const action = body.action as string;

    if (action === 'rooms') {
      const rooms = await prisma.chatRoom.findMany({
        orderBy: [{ lastMessageAt: 'desc' }],
        take: 100,
      });
      const totalUnread = rooms.reduce((s, r) => s + r.unreadAdmin, 0);
      return NextResponse.json({ ok: true, rooms, totalUnread });
    }

    if (action === 'messages') {
      const roomId = String(body.roomId ?? '');
      if (!roomId) return NextResponse.json({ ok: false }, { status: 400 });

      const after = body.after ? new Date(body.after) : null;

      // 첫 로드는 최신 200건을 내려주고 오래된 순으로 뒤집습니다.
      // 이후 폴링은 after 이후 새 메시지만 가져옵니다.
      const messages = after
        ? await prisma.chatMessage.findMany({
            where: { roomId, createdAt: { gt: after } },
            orderBy: { createdAt: 'asc' },
          })
        : (
            await prisma.chatMessage.findMany({
              where: { roomId },
              orderBy: { createdAt: 'desc' },
              take: 200,
            })
          ).reverse();
      const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
      return NextResponse.json({ ok: true, messages, room });
    }

    if (action === 'send') {
      const roomId = String(body.roomId ?? '');
      const content = String(body.content ?? '').trim().slice(0, 2000);
      if (!roomId || !content) return NextResponse.json({ ok: false }, { status: 400 });

      const msg = await prisma.chatMessage.create({
        data: { roomId, sender: 'ADMIN', content },
      });
      await prisma.chatRoom.update({
        where: { id: roomId },
        data: {
          lastMessage: content,
          lastMessageAt: new Date(),
          unreadUser: { increment: 1 },
          unreadAdmin: 0,
          status: 'ANSWERED',
        },
      });
      return NextResponse.json({ ok: true, message: msg });
    }

    if (action === 'read') {
      const roomId = String(body.roomId ?? '');
      await prisma.chatRoom.update({ where: { id: roomId }, data: { unreadAdmin: 0 } });
      await prisma.chatMessage.updateMany({
        where: { roomId, sender: 'USER', isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'status') {
      const roomId = String(body.roomId ?? '');
      const status = String(body.status ?? 'OPEN');
      await prisma.chatRoom.update({ where: { id: roomId }, data: { status } });
      return NextResponse.json({ ok: true });
    }

    if (action === 'memo') {
      const roomId = String(body.roomId ?? '');
      await prisma.chatRoom.update({
        where: { id: roomId },
        data: {
          name: String(body.name ?? '고객').slice(0, 40),
          phone: String(body.phone ?? '').slice(0, 30),
          email: String(body.email ?? '').slice(0, 80),
        },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, message: '알 수 없는 요청입니다.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : '오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
