import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'node:crypto';
import { rateLimit } from '@/lib/rate-limit';

/**
 * 외부 솔루션(사방넷·이지어드민 등)이 자사몰을 읽고 쓸 때 쓰는 API 키 인증.
 *   헤더: Authorization: Bearer ujk_xxxxx   또는   X-API-Key: ujk_xxxxx
 */
export async function requireApiKey(req: NextRequest, scope: string) {
  const header = req.headers.get('authorization') ?? '';
  const key = header.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : (req.headers.get('x-api-key') ?? '').trim();

  if (!key) {
    return { error: NextResponse.json({ ok: false, message: 'API 키가 필요합니다.' }, { status: 401 }) };
  }

  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  const row = await prisma.apiKey.findUnique({ where: { key: keyHash } });
  if (!row || !row.isActive) {
    return { error: NextResponse.json({ ok: false, message: '유효하지 않은 API 키입니다.' }, { status: 401 }) };
  }

  const limited = rateLimit(`external-api:${row.id}`, 600, 60 * 1000);
  if (!limited.ok) {
    return {
      error: NextResponse.json(
        { ok: false, message: '호출 한도를 초과했습니다.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
      ),
    };
  }

  if (!row.scopes.split(',').includes(scope)) {
    return {
      error: NextResponse.json(
        { ok: false, message: `이 키에는 ${scope} 권한이 없습니다.` },
        { status: 403 }
      ),
    };
  }

  await prisma.apiKey
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date(), callCount: { increment: 1 } } })
    .catch(() => null);

  return { apiKey: row };
}
