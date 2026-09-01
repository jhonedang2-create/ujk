'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requirePermission, requireOwner } from '@/auth';
import { sealSecret } from '@/lib/secret-box';

export type Res = { ok: boolean; message: string; secret?: string };

const s = (fd: FormData, k: string, def = '') => String(fd.get(k) ?? def).trim();
const b = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';
const n = (fd: FormData, k: string, def = 0) => {
  const raw = fd.get(k);
  if (raw === null || String(raw).trim() === '') return def;
  const v = Number(raw);
  return Number.isFinite(v) ? v : def;
};

/* ── 채널 ── */

export async function saveChannel(_prev: Res, fd: FormData): Promise<Res> {
  await requirePermission('settings');
  const code = s(fd, 'code');
  if (!code) return { ok: false, message: '채널 코드가 없습니다.' };

  const existing = await prisma.channel.findUnique({ where: { code } });

  const data = {
    name: s(fd, 'name') || code,
    type: s(fd, 'type', 'OPENMARKET'),
    color: s(fd, 'color', '#2a78d6'),
    adapter: s(fd, 'adapter'),
    syncMode: s(fd, 'syncMode', 'MANUAL'),
    autoSync: b(fd, 'autoSync'),
    isActive: b(fd, 'isActive'),
    sortOrder: n(fd, 'sortOrder'),
    // 인증정보는 값이 들어온 경우에만 덮어씁니다 (빈칸 저장으로 키가 날아가지 않게)
    ...(s(fd, 'cred1') ? { cred1: sealSecret(s(fd, 'cred1')) } : {}),
    ...(s(fd, 'cred2') ? { cred2: sealSecret(s(fd, 'cred2')) } : {}),
    ...(s(fd, 'cred3') ? { cred3: sealSecret(s(fd, 'cred3')) } : {}),
  };

  if (existing) await prisma.channel.update({ where: { code }, data });
  else await prisma.channel.create({ data: { code, ...data } });

  revalidatePath('/admin/channels');
  revalidatePath('/admin/orders');
  return { ok: true, message: '저장되었습니다.' };
}

export async function clearChannelCredentials(code: string) {
  await requirePermission('settings');
  await prisma.channel.update({
    where: { code },
    data: { cred1: '', cred2: '', cred3: '', apiConnected: false, lastSyncNote: '' },
  });
  revalidatePath('/admin/channels');
}

/* ── 상품 ↔ 채널 매핑 ── */

export async function saveChannelProduct(_prev: Res, fd: FormData): Promise<Res> {
  await requirePermission('channels');

  const channelCode = s(fd, 'channelCode');
  const productId = s(fd, 'productId');
  const externalProductId = s(fd, 'externalProductId');

  if (!channelCode || !productId) return { ok: false, message: '채널과 상품을 선택해 주세요.' };
  if (!externalProductId && !s(fd, 'externalSku')) {
    return { ok: false, message: '채널 상품번호 또는 판매자 상품코드 중 하나는 입력해야 합니다.' };
  }

  const id = s(fd, 'id');
  const data = {
    channelCode,
    productId,
    optionId: s(fd, 'optionId') || null,
    externalProductId: externalProductId || s(fd, 'externalSku'),
    externalItemId: s(fd, 'externalItemId'),
    externalName: s(fd, 'externalName'),
    externalSku: s(fd, 'externalSku'),
    syncStock: b(fd, 'syncStock'),
  };

  try {
    if (id) await prisma.channelProduct.update({ where: { id }, data });
    else await prisma.channelProduct.create({ data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('Unique constraint') || msg.includes('P2002')) {
      return { ok: false, message: '이미 등록된 채널 상품번호입니다.' };
    }
    return { ok: false, message: `저장에 실패했습니다. ${msg.slice(0, 160)}` };
  }

  revalidatePath('/admin/channels');
  return { ok: true, message: '상품 연결이 저장되었습니다.' };
}

export async function deleteChannelProduct(id: string) {
  await requirePermission('channels');
  await prisma.channelProduct.delete({ where: { id } }).catch(() => null);
  revalidatePath('/admin/channels');
}

/* ── 외부 솔루션용 API 키 ── */

export async function createApiKey(_prev: Res, fd: FormData): Promise<Res> {
  await requireOwner();
  const name = s(fd, 'name');
  if (!name) return { ok: false, message: '용도를 입력해 주세요. (예: 사방넷 연동)' };

  const secret = `ujk_${crypto.randomBytes(24).toString('hex')}`;
  const key = crypto.createHash('sha256').update(secret).digest('hex');
  const scopes = [
    b(fd, 'ordersRead') ? 'orders:read' : '',
    b(fd, 'ordersWrite') ? 'orders:write' : '',
    b(fd, 'productsRead') ? 'products:read' : '',
    b(fd, 'productsWrite') ? 'products:write' : '',
  ]
    .filter(Boolean)
    .join(',');

  if (!scopes) return { ok: false, message: '권한을 하나 이상 선택해 주세요.' };

  await prisma.apiKey.create({ data: { name, key, prefix: secret.slice(0, 12), scopes } });
  revalidatePath('/admin/channels');
  return { ok: true, message: '키가 발급되었습니다. 지금 복사해 안전한 곳에 보관하세요.', secret };
}

export async function toggleApiKey(id: string, isActive: boolean) {
  await requireOwner();
  await prisma.apiKey.update({ where: { id }, data: { isActive } });
  revalidatePath('/admin/channels');
}

export async function deleteApiKey(id: string) {
  await requireOwner();
  await prisma.apiKey.delete({ where: { id } }).catch(() => null);
  revalidatePath('/admin/channels');
}
