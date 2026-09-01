import bcrypt from 'bcryptjs';
import type { ChannelAdapter, ChannelCredentials, FetchResult, NormalizedOrder } from './types';

/**
 * 네이버 커머스API (스마트스토어) 어댑터
 *
 * 토큰 발급
 *   POST https://api.commerce.naver.com/external/v1/oauth2/token
 *   timestamp          : 밀리초 (시계 오차 대비 현재-3초)
 *   client_secret_sign : base64( bcrypt("{clientId}_{timestamp}", salt = clientSecret) )
 *   grant_type=client_credentials, type=SELF
 *
 * 키 발급: 커머스API센터(apicenter.commerce.naver.com) > 내 애플리케이션 > 애플리케이션 등록
 *   cred1 = Client ID / cred2 = Client Secret
 *
 * ※ 판매자 본인 스토어를 직접 연동하는 '내스토어 애플리케이션' 기준입니다.
 *    여러 판매자를 대신 연동하려면 커머스솔루션 입점 또는 API대행사 등록이 별도로 필요합니다.
 */
const HOST = 'https://api.commerce.naver.com';

let cachedToken: { token: string; expiresAt: number; forKey: string } | null = null;

async function getToken(c: ChannelCredentials): Promise<string> {
  const now = Date.now();
  // 시크릿을 교체하면 캐시가 바로 무효화되도록 키에 함께 넣습니다
  const cacheKey = `${c.cred1}:${c.cred2.slice(-8)}`;
  if (cachedToken && cachedToken.forKey === cacheKey && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.token;
  }

  // Client Secret 은 bcrypt salt 형식($2a$04$…)이어야 합니다.
  // 아니면 bcryptjs 가 영문 예외를 그대로 던져서 원인을 알기 어렵습니다.
  if (!/^\$2[aby]?\$\d{2}\$/.test(c.cred2)) {
    throw new Error(
      'Client Secret 형식이 올바르지 않습니다. 커머스API센터에서 발급받은 값($2a$04$… 로 시작)을 그대로 붙여넣어 주세요.'
    );
  }

  const timestamp = String(now - 3000);
  const password = `${c.cred1}_${timestamp}`;
  // salt 자리에 clientSecret 을 그대로 넣는 것이 네이버 규격입니다
  const hashed = bcrypt.hashSync(password, c.cred2);
  const clientSecretSign = Buffer.from(hashed, 'utf-8').toString('base64');

  const body = new URLSearchParams({
    client_id: c.cred1,
    timestamp,
    client_secret_sign: clientSecretSign,
    grant_type: 'client_credentials',
    type: 'SELF',
  });

  const res = await fetch(`${HOST}/external/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(
      `네이버 토큰 발급 실패 (HTTP ${res.status}) ${String(json.message ?? json.error ?? '').slice(0, 200)}`
    );
  }

  cachedToken = {
    token: json.access_token,
    expiresAt: now + Number(json.expires_in ?? 3600) * 1000,
    forKey: cacheKey,
  };
  return cachedToken.token;
}

async function call(
  method: 'GET' | 'POST',
  path: string,
  c: ChannelCredentials,
  opts: { query?: string; body?: unknown } = {}
) {
  const token = await getToken(c);
  const res = await fetch(`${HOST}${path}${opts.query ? `?${opts.query}` : ''}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
    cache: 'no-store',
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(
      `네이버 API 오류 (HTTP ${res.status}) ${String(json.message ?? text).slice(0, 200)}`
    );
  }
  return json;
}

/** 네이버 상품주문 상태 → 자사 상태 */
function mapStatus(s: string) {
  switch (s) {
    case 'PAYED':
      return 'PAID';
    case 'DELIVERING':
      return 'SHIPPING';
    case 'DELIVERED':
    case 'PURCHASE_DECIDED':
      return 'DELIVERED';
    case 'CANCELED':
    case 'CANCELED_BY_NOPAYMENT':
      return 'CANCELLED';
    case 'RETURNED':
    case 'EXCHANGED':
      return 'REFUNDED';
    default:
      return 'PAID';
  }
}

type NaverProductOrder = {
  productOrder?: {
    productOrderId?: string;
    productId?: string;
    optionCode?: string;
    sellerProductCode?: string;
    productName?: string;
    productOption?: string;
    unitPrice?: number;
    quantity?: number;
    totalPaymentAmount?: number;
    deliveryFeeAmount?: number;
    productOrderStatus?: string;
    shippingAddress?: {
      name?: string;
      tel1?: string;
      zipCode?: string;
      baseAddress?: string;
      detailedAddress?: string;
    };
    shippingMemo?: string;
  };
  order?: {
    orderId?: string;
    ordererName?: string;
    ordererTel?: string;
    orderDate?: string;
  };
};

export const naverAdapter: ChannelAdapter = {
  key: 'naver',
  label: '네이버 스마트스토어',
  credLabels: ['Client ID', 'Client Secret'],

  async test(c) {
    if (!c.cred1 || !c.cred2) {
      return { ok: false, message: 'Client ID / Client Secret 을 입력해 주세요.' };
    }
    try {
      await getToken(c);
      return { ok: true, message: '네이버 커머스API 토큰 발급에 성공했습니다.' };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : '연결 실패' };
    }
  },

  async fetchOrders(c, from, to): Promise<FetchResult> {
    if (!c.cred1 || !c.cred2) {
      return { ok: false, orders: [], message: '인증정보가 설정되지 않았습니다.' };
    }

    try {
      // 1) 기간 내 변경된 상품주문 ID 목록
      //    네이버는 한 번에 최대 24시간 구간만 조회할 수 있어 하루 단위로 끊어 호출합니다.
      const ids = new Set<string>();
      const DAY = 24 * 60 * 60 * 1000;

      for (let t = from.getTime(); t < to.getTime(); t += DAY) {
        const segFrom = new Date(t);
        const segTo = new Date(Math.min(t + DAY - 1000, to.getTime()));
        const query = `lastChangedFrom=${encodeURIComponent(segFrom.toISOString())}&lastChangedTo=${encodeURIComponent(segTo.toISOString())}`;

        const json = (await call(
          'GET',
          '/external/v1/pay-order/seller/product-orders/last-changed-statuses',
          c,
          { query }
        )) as {
          data?: { lastChangeStatuses?: { productOrderId?: string }[] };
        };

        for (const row of json.data?.lastChangeStatuses ?? []) {
          if (row.productOrderId) ids.add(row.productOrderId);
        }
      }

      if (ids.size === 0) return { ok: true, orders: [] };

      // 2) 상세 조회 (한 번에 최대 300건)
      const all: NaverProductOrder[] = [];
      const list = [...ids];
      for (let i = 0; i < list.length; i += 300) {
        const json = (await call('POST', '/external/v1/pay-order/seller/product-orders/query', c, {
          body: { productOrderIds: list.slice(i, i + 300) },
        })) as { data?: NaverProductOrder[] };
        all.push(...(json.data ?? []));
      }

      // 3) 주문번호 기준으로 묶기 (네이버는 상품주문 단위로 내려옵니다)
      const byOrder = new Map<string, NaverProductOrder[]>();
      for (const po of all) {
        const key = po.order?.orderId ?? po.productOrder?.productOrderId ?? '';
        if (!key) continue;
        const arr = byOrder.get(key) ?? [];
        arr.push(po);
        byOrder.set(key, arr);
      }

      const orders: NormalizedOrder[] = [];
      for (const [orderId, group] of byOrder) {
        const head = group[0];
        const addr = head.productOrder?.shippingAddress ?? {};

        const items = group.map((po) => ({
          externalProductId: String(po.productOrder?.productId ?? ''),
          externalItemId: String(po.productOrder?.optionCode ?? ''),
          externalSku: String(po.productOrder?.sellerProductCode ?? ''),
          productName: po.productOrder?.productName ?? '상품',
          optionName: po.productOrder?.productOption ?? '',
          price: Number(po.productOrder?.unitPrice ?? 0),
          quantity: Number(po.productOrder?.quantity ?? 1),
        }));

        const itemTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
        const shippingFee = Number(head.productOrder?.deliveryFeeAmount ?? 0);

        orders.push({
          channelOrderNo: orderId,
          orderedAt: head.order?.orderDate ? new Date(head.order.orderDate) : new Date(),
          status: mapStatus(head.productOrder?.productOrderStatus ?? ''),
          ordererName: head.order?.ordererName ?? '네이버 고객',
          ordererPhone: head.order?.ordererTel ?? '',
          ordererEmail: '',
          receiver: addr.name ?? '',
          recvPhone: addr.tel1 ?? '',
          zipcode: addr.zipCode ?? '',
          address1: addr.baseAddress ?? '',
          address2: addr.detailedAddress ?? '',
          memo: head.productOrder?.shippingMemo ?? '',
          itemTotal,
          shippingFee,
          totalAmount: itemTotal + shippingFee,
          items,
          raw: group,
        });
      }

      return { ok: true, orders };
    } catch (e) {
      return { ok: false, orders: [], message: e instanceof Error ? e.message : '주문 조회 실패' };
    }
  },

  async pushStock(c, items) {
    let updated = 0;
    try {
      for (const it of items) {
        if (!it.externalProductId) continue;
        await call('POST', `/external/v1/products/origin-products/${it.externalProductId}/change-stock`, c, {
          body: { stockQuantity: Math.max(0, it.stock) },
        });
        updated++;
      }
      return { ok: true, updated, message: `${updated}건 재고를 반영했습니다.` };
    } catch (e) {
      return { ok: false, updated, message: e instanceof Error ? e.message : '재고 반영 실패' };
    }
  },
};
