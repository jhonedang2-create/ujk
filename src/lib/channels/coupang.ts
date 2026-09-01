import crypto from 'node:crypto';
import type { ChannelAdapter, ChannelCredentials, FetchResult, NormalizedOrder } from './types';

/**
 * 쿠팡 Open API 어댑터
 *
 * 인증(HMAC) 규격
 *   datetime  : UTC 기준 yyMMdd'T'HHmmss'Z'
 *   message   : datetime + method + path + query   (query 는 '?' 제외)
 *   signature : HMAC-SHA256(secretKey, message) 의 hex
 *   헤더      : Authorization: CEA algorithm=HmacSHA256, access-key=…, signed-date=…, signature=…
 *
 * 키 발급: 쿠팡 윙 > 판매자정보 > 추가판매정보 > Open API 발급
 *   cred1 = Access Key / cred2 = Secret Key / cred3 = 업체코드(vendorId, 'A0000…' 형식)
 */
const HOST = 'https://api-gateway.coupang.com';

function signedDate(d = new Date()) {
  // UTC yyMMddTHHmmssZ
  const iso = d.toISOString(); // 2026-08-24T10:20:30.000Z
  return `${iso.slice(2, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}T${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}Z`;
}

function authHeader(method: string, path: string, query: string, c: ChannelCredentials) {
  const dt = signedDate();
  const message = dt + method + path + query;
  const signature = crypto.createHmac('sha256', c.cred2).update(message, 'utf8').digest('hex');
  return `CEA algorithm=HmacSHA256, access-key=${c.cred1}, signed-date=${dt}, signature=${signature}`;
}

async function call(
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  query: string,
  c: ChannelCredentials,
  body?: unknown
) {
  const res = await fetch(`${HOST}${path}${query ? `?${query}` : ''}`, {
    method,
    headers: {
      Authorization: authHeader(method, path, query, c),
      'Content-Type': 'application/json;charset=UTF-8',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* 쿠팡이 HTML 오류를 돌려주는 경우 */
  }

  if (!res.ok) {
    throw new Error(
      `쿠팡 API 오류 (HTTP ${res.status}) ${String(json.message ?? text).slice(0, 200)}`
    );
  }
  return json;
}

/**
 * 쿠팡의 createdAtFrom/To 는 한국시간 기준입니다.
 * 서버가 UTC 로 돌면 로컬시각을 그대로 보낼 경우 최근 9시간 주문이 통째로 빠집니다.
 * 그래서 항상 Asia/Seoul 로 변환해 보냅니다.
 */
const KST = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function ymdhm(d: Date) {
  // sv-SE 로케일은 "2026-08-24 10:20" 형태로 나옵니다
  return KST.format(d).replace(' ', 'T');
}

/** 쿠팡 주문 상태 → 자사 상태 */
function mapStatus(s: string) {
  switch (s) {
    case 'ACCEPT': // 결제완료
      return 'PAID';
    case 'INSTRUCT': // 상품준비중
      return 'PREPARING';
    case 'DEPARTURE': // 배송지시
    case 'DELIVERING': // 배송중
      return 'SHIPPING';
    case 'FINAL_DELIVERY': // 배송완료
      return 'DELIVERED';
    case 'NONE_TRACKING':
      return 'SHIPPING';
    default:
      return 'PAID';
  }
}

type CoupangOrderSheet = {
  orderId: number;
  orderedAt: string;
  status: string;
  shippingPrice?: number;
  orderer?: { name?: string; email?: string; safeNumber?: string; ordererNumber?: string };
  receiver?: {
    name?: string;
    safeNumber?: string;
    receiverNumber?: string;
    postCode?: string;
    addr1?: string;
    addr2?: string;
  };
  parcelPrintMessage?: string;
  orderItems?: {
    vendorItemId?: number;
    productId?: number;
    sellerProductId?: number;
    sellerProductName?: string;
    sellerProductItemName?: string;
    externalVendorSkuCode?: string;
    salesPrice?: number;
    shippingCount?: number;
  }[];
};

export const coupangAdapter: ChannelAdapter = {
  key: 'coupang',
  label: '쿠팡',
  credLabels: ['Access Key', 'Secret Key', '업체코드 (vendorId)'],

  async test(c) {
    if (!c.cred1 || !c.cred2 || !c.cred3) {
      return { ok: false, message: 'Access Key / Secret Key / 업체코드를 모두 입력해 주세요.' };
    }
    try {
      const to = new Date();
      const from = new Date(to.getTime() - 60 * 60 * 1000);
      const path = `/v2/providers/openapi/apis/api/v4/vendors/${c.cred3}/ordersheets`;
      const query = `createdAtFrom=${ymdhm(from)}&createdAtTo=${ymdhm(to)}&status=ACCEPT&maxPerPage=1`;
      await call('GET', path, query, c);
      return { ok: true, message: '쿠팡 연결에 성공했습니다.' };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : '연결 실패' };
    }
  },

  async fetchOrders(c, from, to): Promise<FetchResult> {
    if (!c.cred1 || !c.cred2 || !c.cred3) {
      return { ok: false, orders: [], message: '인증정보가 설정되지 않았습니다.' };
    }

    const path = `/v2/providers/openapi/apis/api/v4/vendors/${c.cred3}/ordersheets`;
    const statuses = ['ACCEPT', 'INSTRUCT', 'DEPARTURE', 'DELIVERING', 'FINAL_DELIVERY'];
    const orders: NormalizedOrder[] = [];

    try {
      for (const status of statuses) {
        let nextToken = '';
        // 페이지네이션 (안전 상한 20페이지)
        for (let page = 0; page < 20; page++) {
          const query =
            `createdAtFrom=${ymdhm(from)}&createdAtTo=${ymdhm(to)}&status=${status}&maxPerPage=50` +
            (nextToken ? `&nextToken=${nextToken}` : '');

          const json = (await call('GET', path, query, c)) as {
            data?: CoupangOrderSheet[];
            nextToken?: string;
          };

          for (const o of json.data ?? []) {
            const items = (o.orderItems ?? []).map((it) => ({
              externalProductId: String(it.sellerProductId ?? it.productId ?? ''),
              externalItemId: String(it.vendorItemId ?? ''),
              externalSku: String(it.externalVendorSkuCode ?? ''),
              productName: it.sellerProductName ?? '상품',
              optionName: it.sellerProductItemName ?? '',
              price: Number(it.salesPrice ?? 0),
              quantity: Number(it.shippingCount ?? 1),
            }));

            const itemTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
            const shippingFee = Number(o.shippingPrice ?? 0);

            orders.push({
              channelOrderNo: String(o.orderId),
              orderedAt: new Date(o.orderedAt),
              status: mapStatus(o.status),
              ordererName: o.orderer?.name ?? '쿠팡 고객',
              ordererPhone: o.orderer?.safeNumber ?? o.orderer?.ordererNumber ?? '',
              ordererEmail: o.orderer?.email ?? '',
              receiver: o.receiver?.name ?? '',
              recvPhone: o.receiver?.safeNumber ?? o.receiver?.receiverNumber ?? '',
              zipcode: o.receiver?.postCode ?? '',
              address1: o.receiver?.addr1 ?? '',
              address2: o.receiver?.addr2 ?? '',
              memo: o.parcelPrintMessage ?? '',
              itemTotal,
              shippingFee,
              totalAmount: itemTotal + shippingFee,
              items,
              raw: o,
            });
          }

          nextToken = json.nextToken ?? '';
          if (!nextToken) break;
        }
      }

      return { ok: true, orders };
    } catch (e) {
      return { ok: false, orders, message: e instanceof Error ? e.message : '주문 조회 실패' };
    }
  },

  async pushStock(c, items) {
    let updated = 0;
    try {
      for (const it of items) {
        if (!it.externalItemId) continue;
        const path = `/v2/providers/openapi/apis/api/v1/marketplace/vendor-items/${it.externalItemId}/quantities/${Math.max(0, it.stock)}`;
        await call('PUT', path, '', c);
        updated++;
      }
      return { ok: true, updated, message: `${updated}건 재고를 반영했습니다.` };
    } catch (e) {
      return {
        ok: false,
        updated,
        message: e instanceof Error ? e.message : '재고 반영 실패',
      };
    }
  },
};
