import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getClientIp, parseUserAgent } from '@/lib/client-context';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse(null, { status: 204 });

  const ua = (req.headers.get('user-agent') ?? '').slice(0, 1000);
  const ip = getClientIp(req.headers);
  const env = parseUserAgent(ua);

  let body: { path?: string; referrerHost?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body가 없어도 접속 환경 자체는 기록할 수 있습니다.
  }

  const path = String(body.path ?? '').slice(0, 180);
  const referrerHost = String(body.referrerHost ?? '').slice(0, 120);
  const now = new Date();
  const dedupeSince = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const retentionCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { firstAccessAt: true },
  });
  if (!user) return new NextResponse(null, { status: 204 });

  const recent = await prisma.userAccessLog.findFirst({
    where: {
      userId: session.user.id,
      createdAt: { gte: dedupeSince },
      ip,
      userAgent: ua,
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: {
        ...(!user.firstAccessAt
          ? {
              firstAccessAt: now,
              firstAccessIp: ip,
              firstAccessOs: env.os,
              firstAccessBrowser: env.browser,
              firstAccessDevice: env.device,
            }
          : {}),
        lastAccessAt: now,
        lastAccessIp: ip,
        lastAccessOs: env.os,
        lastAccessBrowser: env.browser,
        lastAccessDevice: env.device,
      },
    });

    if (!recent) {
      await tx.userAccessLog.create({
        data: {
          userId: session.user.id,
          ip,
          os: env.os,
          browser: env.browser,
          device: env.device,
          userAgent: ua,
          path,
          referrerHost,
        },
      });
    }

    await tx.userAccessLog.deleteMany({
      where: { userId: session.user.id, createdAt: { lt: retentionCutoff } },
    });
  });

  return new NextResponse(null, { status: 204 });
}
