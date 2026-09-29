import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
// 비밀값, 사용자 정보, DB 오류 원문을 공개하지 않는 준비 상태 확인입니다.
export async function GET() {
  let database = false;
  try { await prisma.$queryRaw`SELECT 1`; database = true; } catch { /* 응답에는 세부 오류를 노출하지 않습니다. */ }
  const authentication = (process.env.AUTH_SECRET || '').length >= 32;
  const ready = database && authentication;
  return Response.json({ status: ready ? 'ready' : 'not_ready', database, authentication }, {
    status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' },
  });
}
