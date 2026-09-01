'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requirePermission, requireOwner, auth } from '@/auth';
import { slugify } from '@/lib/utils';
import { cancelPaymentForOrder } from '@/lib/payments';
import { cleanRichText } from '@/lib/sanitize';
import { ROLES } from '@/lib/permissions';

export type Res = { ok: boolean; message: string };

const s = (fd: FormData, k: string, def = '') => String(fd.get(k) ?? def).trim();
const n = (fd: FormData, k: string, def = 0) => Number(fd.get(k) ?? def) || def;
const b = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';

/* ───────────────── 상품 ───────────────── */

export async function saveProduct(_prev: Res, fd: FormData): Promise<Res> {
  await requirePermission('products');

  const id = s(fd, 'id');
  const name = s(fd, 'name');
  if (!name) return { ok: false, message: '상품명을 입력해 주세요.' };

  const categoryId = s(fd, 'categoryId');
  if (!categoryId) return { ok: false, message: '카테고리를 선택해 주세요.' };

  let slug = s(fd, 'slug') || slugify(name);
  const dup = await prisma.product.findFirst({ where: { slug, ...(id ? { NOT: { id } } : {}) } });
  if (dup) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const data = {
    name,
    slug,
    categoryId,
    summary: s(fd, 'summary'),
    description: cleanRichText(s(fd, 'description')),
    price: n(fd, 'price'),
    listPrice: n(fd, 'listPrice'),
    cost: n(fd, 'cost'),
    stock: n(fd, 'stock'),
    sku: s(fd, 'sku') || null,
    origin: s(fd, 'origin', '국내산'),
    maker: s(fd, 'maker', '(주)대천우정김'),
    unit: s(fd, 'unit'),
    weight: n(fd, 'weight'),
    isActive: b(fd, 'isActive'),
    isFeatured: b(fd, 'isFeatured'),
    isBest: b(fd, 'isBest'),
    isNew: b(fd, 'isNew'),
    foodType: s(fd, 'foodType'),
    ingredients: s(fd, 'ingredients'),
    allergyInfo: s(fd, 'allergyInfo'),
    storageInfo: s(fd, 'storageInfo'),
    expiryInfo: s(fd, 'expiryInfo'),
    nutritionInfo: s(fd, 'nutritionInfo'),
    sourceUrl: s(fd, 'sourceUrl') || null,
  };

  // 이미지 URL 목록 (줄바꿈 구분)
  const imageUrls = s(fd, 'imageUrls')
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
  if (imageUrls.some((url) => !url.startsWith('/') && !/^https:\/\//i.test(url))) {
    return { ok: false, message: '상품 이미지는 HTTPS 주소 또는 사이트 내부 경로만 사용할 수 있습니다.' };
  }

  // 옵션 (형식: 이름|값|추가금|재고 — 줄바꿈 구분)
  const optionLines = s(fd, 'options')
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);

  await prisma.$transaction(async (tx) => {
    const product = id
      ? await tx.product.update({ where: { id }, data })
      : await tx.product.create({ data });
    const productId = product.id;

    await tx.productImage.deleteMany({ where: { productId } });
    if (imageUrls.length > 0) {
      await tx.productImage.createMany({
        data: imageUrls.map((url, i) => ({
          productId,
          url,
          alt: name,
          sortOrder: i,
          isMain: i === 0,
          source: url.startsWith('/uploads/') ? 'import' : 'external',
          sourceUrl: data.sourceUrl,
        })),
      });
    }

    // 주문 이력이 참조하는 옵션은 삭제하지 않고 비활성화해 FK와 주문 기록을 보존합니다.
    await tx.productOption.updateMany({ where: { productId }, data: { isActive: false } });
    if (optionLines.length > 0) {
      await tx.productOption.createMany({
        data: optionLines.map((line, i) => {
          const [oname, value, extra, stock] = line.split('|').map((x) => (x ?? '').trim());
          return {
            productId,
            name: oname || '옵션',
            value: value || oname,
            extraPrice: Math.max(0, Number(extra) || 0),
            stock: Math.max(0, Number(stock) || 0),
            sortOrder: i,
          };
        }),
      });
    }
  });

  revalidatePath('/admin/products');
  revalidatePath('/products');
  redirect('/admin/products');
}

export async function deleteProduct(id: string) {
  await requirePermission('products');
  await prisma.product.delete({ where: { id } }).catch(() => null);
  revalidatePath('/admin/products');
}

export async function toggleProductActive(id: string, isActive: boolean) {
  await requirePermission('products');
  await prisma.product.update({ where: { id }, data: { isActive } });
  revalidatePath('/admin/products');
}

/* ───────────────── 카테고리 ───────────────── */

export async function saveCategory(_prev: Res, fd: FormData): Promise<Res> {
  await requirePermission('categories');
  const id = s(fd, 'id');
  const name = s(fd, 'name');
  if (!name) return { ok: false, message: '카테고리명을 입력해 주세요.' };

  const data = {
    name,
    slug: s(fd, 'slug') || slugify(name),
    parentId: s(fd, 'parentId') || null,
    description: s(fd, 'description'),
    sortOrder: n(fd, 'sortOrder'),
    isActive: b(fd, 'isActive'),
  };

  if (id) await prisma.category.update({ where: { id }, data });
  else await prisma.category.create({ data });

  revalidatePath('/admin/categories');
  revalidatePath('/products');
  return { ok: true, message: '저장되었습니다.' };
}

export async function deleteCategory(id: string) {
  await requirePermission('categories');
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) return;
  await prisma.category.delete({ where: { id } }).catch(() => null);
  revalidatePath('/admin/categories');
}

/* ───────────────── 주문 ───────────────── */

/** 무통장입금 입금확인 처리 */
export async function confirmDeposit(orderId: string) {
  await requirePermission('orders');
  const { markOrderPaid } = await import('@/lib/payments');
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  if (!order) return { ok: false, message: '주문을 찾을 수 없습니다.' };
  if (order.status !== 'PENDING' || order.payment?.method !== 'BANK' || order.payment.status !== 'READY') {
    return { ok: false, message: '입금 대기 중인 무통장 주문만 확인할 수 있습니다.' };
  }

  await prisma.payment.upsert({
    where: { orderId },
    update: { depositedAt: new Date() },
    create: {
      orderId,
      method: 'BANK',
      status: 'READY',
      amount: order.totalAmount,
      merchantUid: order.orderNo,
      depositor: order.ordererName,
      depositedAt: new Date(),
    },
  });
  await markOrderPaid({ orderId, method: 'BANK', amount: order.totalAmount });

  const { notifyOrder } = await import('@/lib/messaging');
  await notifyOrder(orderId, 'ORDER_PAID').catch(() => null);

  revalidatePath('/admin/orders');
  return { ok: true, message: '입금이 확인되어 결제완료로 변경되었습니다.' };
}

export async function updateOrderStatus(orderId: string, status: string) {
  await requirePermission('orders');
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, message: '주문을 찾을 수 없습니다.' };
  const transitions: Record<string, string[]> = {
    PAID: ['PREPARING'],
    PREPARING: ['SHIPPING'],
    SHIPPING: ['DELIVERED'],
  };
  if (!transitions[order.status]?.includes(status)) {
    return { ok: false, message: `${order.status} 상태에서 ${status}(으)로 변경할 수 없습니다.` };
  }
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      ...(status === 'SHIPPING' ? { shippedAt: new Date() } : {}),
      ...(status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
    },
  });

  const { notifyOrder, templateCodeForStatus } = await import('@/lib/messaging');
  const code = templateCodeForStatus(status);
  if (code) await notifyOrder(orderId, code).catch(() => null);

  revalidatePath('/admin/orders');
  return { ok: true, message: '주문 상태가 변경되었습니다.' };
}

export async function updateTracking(_prev: Res, fd: FormData): Promise<Res> {
  await requirePermission('orders');
  const orderId = s(fd, 'orderId');
  const courier = s(fd, 'courier');
  const trackingNo = s(fd, 'trackingNo');
  if (!trackingNo) return { ok: false, message: '송장번호를 입력해 주세요.' };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !['PAID', 'PREPARING', 'SHIPPING'].includes(order.status)) {
    return { ok: false, message: '결제 완료 또는 상품 준비 중인 주문만 발송할 수 있습니다.' };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { courier, trackingNo, status: 'SHIPPING', shippedAt: new Date() },
  });

  // 고객에게 발송 안내 (알림톡 → 실패 시 문자). 설정에서 끌 수 있습니다.
  let notice = '';
  if (fd.get('notify') !== 'off') {
    const { notifyOrder } = await import('@/lib/messaging');
    const r = await notifyOrder(orderId, 'SHIPPING').catch(() => null);
    if (r) {
      notice = r.sent > 0 ? ' 고객에게 발송 안내를 보냈습니다.' : ` 알림 발송 실패: ${r.message}`;
    }
  }

  revalidatePath('/admin/orders');
  return { ok: true, message: `송장이 등록되고 배송중으로 변경되었습니다.${notice}` };
}

export async function adminCancelOrder(orderId: string, reason: string, manualRefundConfirmed = false) {
  await requirePermission('orders');
  try {
    const payment = await prisma.payment.findUnique({ where: { orderId } });
    if (!payment) return { ok: false, message: '결제 정보를 찾을 수 없습니다.' };
    const requiresManualRefund = payment.status === 'PAID' && !['TOSS', 'PORTONE'].includes(payment.method);
    if (requiresManualRefund && !manualRefundConfirmed) {
      return { ok: false, message: '외부에서 실제 환불을 완료한 뒤 다시 처리해 주세요.' };
    }
    if (requiresManualRefund) {
      const { settleOrderCancellation } = await import('@/lib/payments');
      await settleOrderCancellation(orderId, `수동 환불 확인: ${reason || '판매자 취소'}`);
    } else {
      await cancelPaymentForOrder(orderId, reason || '판매자 취소');
    }
    revalidatePath('/admin/orders');
    return { ok: true, message: '주문이 취소/환불 처리되었습니다.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : '취소 처리에 실패했습니다.' };
  }
}

/* ───────────────── 회원 ───────────────── */

export async function updateUserRole(userId: string, role: string) {
  await requireOwner();
  if (!(ROLES as readonly string[]).includes(role)) {
    return { ok: false, message: '올바르지 않은 권한입니다.' };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, message: '계정을 찾을 수 없습니다.' };

  const me = await auth();
  if (target.id === me?.user?.id && role !== 'ADMIN') {
    return { ok: false, message: '본인의 권한은 스스로 내릴 수 없습니다.' };
  }

  if (target.role === 'ADMIN' && role !== 'ADMIN') {
    const admins = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (admins <= 1) return { ok: false, message: '최고관리자가 최소 1명은 있어야 합니다.' };
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath('/admin/users');
  return { ok: true, message: '권한이 변경되었습니다.' };
}

export async function updateUserStatus(userId: string, status: string) {
  await requirePermission('users');
  if (!['ACTIVE', 'BANNED'].includes(status)) {
    return { ok: false, message: '올바르지 않은 계정 상태입니다.' };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, message: '계정을 찾을 수 없습니다.' };

  // 관리자 계정을 건드리는 건 최고관리자만
  if (target.role !== 'USER') {
    await requireOwner();
    if (status !== 'ACTIVE' && target.role === 'ADMIN') {
      const admins = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
      if (admins <= 1) {
        return { ok: false, message: '최고관리자가 최소 1명은 있어야 합니다.' };
      }
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { status } });
  revalidatePath('/admin/users');
  return { ok: true, message: status === 'ACTIVE' ? '차단이 해제되었습니다.' : '차단되었습니다.' };
}

export async function grantPoint(_prev: Res, fd: FormData): Promise<Res> {
  await requirePermission('users');
  const userId = s(fd, 'userId');
  const amount = n(fd, 'amount');
  const reason = s(fd, 'reason', '관리자 지급');
  if (!amount) return { ok: false, message: '금액을 입력해 주세요.' };

  const u = await prisma.user.update({
    where: { id: userId },
    data: { point: { increment: amount } },
  });
  await prisma.pointLog.create({
    data: { userId, amount, balance: u.point, reason },
  });

  revalidatePath('/admin/users');
  return { ok: true, message: '적립금이 반영되었습니다.' };
}

/* ───────────────── 콘텐츠 ───────────────── */

export async function saveHistory(_prev: Res, fd: FormData): Promise<Res> {
  await requirePermission('content');
  const id = s(fd, 'id');
  const data = {
    year: s(fd, 'year'),
    month: s(fd, 'month'),
    content: cleanRichText(s(fd, 'content')),
    sortOrder: n(fd, 'sortOrder'),
    isActive: true,
  };
  if (!data.year || !data.content) return { ok: false, message: '연도와 내용을 입력해 주세요.' };

  if (id) await prisma.history.update({ where: { id }, data });
  else await prisma.history.create({ data });

  revalidatePath('/admin/history');
  revalidatePath('/about/history');
  return { ok: true, message: '저장되었습니다.' };
}

export async function deleteHistory(id: string) {
  await requirePermission('content');
  await prisma.history.delete({ where: { id } }).catch(() => null);
  revalidatePath('/admin/history');
  revalidatePath('/about/history');
}

export async function savePost(_prev: Res, fd: FormData): Promise<Res> {
  await requirePermission('content');
  const id = s(fd, 'id');
  const data = {
    type: s(fd, 'type', 'NOTICE'),
    title: s(fd, 'title'),
    content: cleanRichText(s(fd, 'content')),
    isPinned: b(fd, 'isPinned'),
    isActive: b(fd, 'isActive'),
  };
  if (!data.title) return { ok: false, message: '제목을 입력해 주세요.' };

  if (id) await prisma.post.update({ where: { id }, data });
  else await prisma.post.create({ data });

  revalidatePath('/admin/posts');
  revalidatePath('/notice');
  return { ok: true, message: '저장되었습니다.' };
}

export async function deletePost(id: string) {
  await requirePermission('content');
  await prisma.post.delete({ where: { id } }).catch(() => null);
  revalidatePath('/admin/posts');
  revalidatePath('/notice');
}

export async function saveBanner(_prev: Res, fd: FormData): Promise<Res> {
  await requirePermission('content');
  const id = s(fd, 'id');
  const data = {
    title: s(fd, 'title'),
    subtitle: s(fd, 'subtitle'),
    imageUrl: s(fd, 'imageUrl'),
    linkUrl: s(fd, 'linkUrl'),
    position: s(fd, 'position', 'MAIN'),
    sortOrder: n(fd, 'sortOrder'),
    isActive: b(fd, 'isActive'),
  };
  if (!data.title) return { ok: false, message: '배너 제목을 입력해 주세요.' };

  if (id) await prisma.banner.update({ where: { id }, data });
  else await prisma.banner.create({ data });

  revalidatePath('/admin/banners');
  revalidatePath('/');
  return { ok: true, message: '저장되었습니다.' };
}

export async function deleteBanner(id: string) {
  await requirePermission('content');
  await prisma.banner.delete({ where: { id } }).catch(() => null);
  revalidatePath('/admin/banners');
  revalidatePath('/');
}

export async function answerInquiry(_prev: Res, fd: FormData): Promise<Res> {
  await requirePermission('inquiries');
  const id = s(fd, 'id');
  const answer = s(fd, 'answer');
  if (!answer) return { ok: false, message: '답변 내용을 입력해 주세요.' };

  await prisma.inquiry.update({
    where: { id },
    data: { answer, status: 'ANSWERED', answeredAt: new Date() },
  });
  revalidatePath('/admin/inquiries');
  return { ok: true, message: '답변이 저장되었습니다.' };
}

/* ───────────────── 글로벌 (수출국 / 판매채널) ───────────────── */

/**
 * 0 을 유효값으로 인정하는 숫자 파서.
 * Number('') 와 Number(null) 이 모두 0 이라서 Number.isFinite 만으로는 빈 값과 0 을 구분할 수 없습니다.
 */
function numOr(fd: FormData, key: string, def: number) {
  const raw = fd.get(key);
  if (raw === null || String(raw).trim() === '') return def;
  const v = Number(raw);
  return Number.isFinite(v) ? v : def;
}

/** 위경도 → 도트 지도 비율 좌표 */
function lonLatToMap(lon: number, lat: number) {
  return { mapX: ((lon + 180) / 360) * 100, mapY: ((84 - lat) / 144) * 100 };
}

export async function saveExportCountry(_prev: Res, fd: FormData): Promise<Res> {
  await requirePermission('content');
  const id = s(fd, 'id');
  const code = s(fd, 'code').toUpperCase();
  const name = s(fd, 'name');
  if (!code || !name) return { ok: false, message: '국가코드와 국가명을 입력해 주세요.' };

  const lon = Number(fd.get('lon'));
  const lat = Number(fd.get('lat'));
  const coords =
    Number.isFinite(lon) && Number.isFinite(lat) && (lon !== 0 || lat !== 0)
      ? lonLatToMap(lon, lat)
      : { mapX: numOr(fd, 'mapX', 50), mapY: numOr(fd, 'mapY', 50) };

  const data = {
    code,
    name,
    nameEn: s(fd, 'nameEn'),
    region: s(fd, 'region', 'ASIA'),
    since: s(fd, 'since'),
    partner: s(fd, 'partner'),
    channel: s(fd, 'channel'),
    note: s(fd, 'note'),
    sortOrder: n(fd, 'sortOrder'),
    isActive: b(fd, 'isActive'),
    ...coords,
  };

  const dup = await prisma.exportCountry.findFirst({
    where: { code, ...(id ? { NOT: { id } } : {}) },
  });
  if (dup) return { ok: false, message: `이미 등록된 국가코드입니다. (${code})` };

  if (id) await prisma.exportCountry.update({ where: { id }, data });
  else await prisma.exportCountry.create({ data });

  revalidatePath('/admin/global');
  revalidatePath('/global');
  revalidatePath('/');
  return { ok: true, message: '저장되었습니다.' };
}

export async function deleteExportCountry(id: string) {
  await requirePermission('content');
  await prisma.exportCountry.delete({ where: { id } }).catch(() => null);
  revalidatePath('/admin/global');
  revalidatePath('/global');
}

export async function saveSalesChannel(_prev: Res, fd: FormData): Promise<Res> {
  await requirePermission('content');
  const id = s(fd, 'id');
  const name = s(fd, 'name');
  if (!name) return { ok: false, message: '채널명을 입력해 주세요.' };

  const data = {
    name,
    type: s(fd, 'type', 'ONLINE'),
    url: s(fd, 'url'),
    note: s(fd, 'note'),
    sortOrder: n(fd, 'sortOrder'),
    isActive: b(fd, 'isActive'),
  };

  if (id) await prisma.salesChannel.update({ where: { id }, data });
  else await prisma.salesChannel.create({ data });

  revalidatePath('/admin/global');
  revalidatePath('/global');
  return { ok: true, message: '저장되었습니다.' };
}

export async function deleteSalesChannel(id: string) {
  await requirePermission('content');
  await prisma.salesChannel.delete({ where: { id } }).catch(() => null);
  revalidatePath('/admin/global');
  revalidatePath('/global');
}

/* ───────────────── 벤더 상품 일괄 등록 ───────────────── */

/**
 * 오픈마켓에서 파싱한 정보로 '판매중지' 상태의 상품 초안을 만듭니다.
 * 바로 판매되지 않으므로, 만든 뒤 내용을 검토하고 판매중으로 바꾸세요.
 */
export async function createDraftProduct(input: {
  name: string;
  price: number;
  categoryId: string;
  imageUrls: string[];
  sourceUrl: string;
  summary?: string;
}): Promise<{ ok: boolean; message: string; id?: string }> {
  await requirePermission('products');

  if (!input.name?.trim()) return { ok: false, message: '상품명이 비어 있습니다.' };
  if (!input.categoryId) return { ok: false, message: '카테고리를 선택해 주세요.' };

  let slug = slugify(input.name);
  const dup = await prisma.product.findFirst({ where: { slug } });
  if (dup) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const created = await prisma.product.create({
    data: {
      name: input.name.trim().slice(0, 120),
      slug,
      categoryId: input.categoryId,
      summary: (input.summary ?? '').slice(0, 200),
      price: Math.max(0, Math.round(input.price || 0)),
      stock: 0,
      isActive: false, // 검토 후 직접 켜세요
      isNew: true,
      sourceUrl: input.sourceUrl || null,
      images: {
        create: input.imageUrls.slice(0, 12).map((url, i) => ({
          url,
          alt: input.name,
          sortOrder: i,
          isMain: i === 0,
          source: 'import',
          sourceUrl: input.sourceUrl || null,
        })),
      },
    },
  });

  revalidatePath('/admin/products');
  return { ok: true, message: '상품 초안이 만들어졌습니다.', id: created.id };
}
