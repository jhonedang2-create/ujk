/** 채널 어댑터 공통 규격 — 채널이 늘어나도 이 형태만 맞추면 됩니다. */

export type NormalizedOrderItem = {
  externalProductId: string;
  externalItemId: string;
  externalSku: string; // 판매자 상품코드 (자사 SKU 와 매칭)
  productName: string;
  optionName: string;
  price: number; // 단가
  quantity: number;
};

export type NormalizedOrder = {
  channelOrderNo: string; // 채널 주문번호 (필수 — 중복 방지 키)
  orderedAt: Date;
  status: string; // 자사 상태로 변환된 값

  ordererName: string;
  ordererPhone: string;
  ordererEmail: string;

  receiver: string;
  recvPhone: string;
  zipcode: string;
  address1: string;
  address2: string;
  memo: string;

  itemTotal: number;
  shippingFee: number;
  totalAmount: number;

  items: NormalizedOrderItem[];
  raw?: unknown;
};

export type FetchResult = {
  ok: boolean;
  orders: NormalizedOrder[];
  message?: string;
};

export type ChannelCredentials = {
  cred1: string;
  cred2: string;
  cred3: string;
};

export interface ChannelAdapter {
  /** 어댑터 식별자 — Channel.adapter 에 저장되는 값 */
  key: string;
  label: string;
  /** 인증정보 입력칸 라벨 (관리자 화면에 그대로 표시됩니다) */
  credLabels: [string, string, string?];
  /** 연결 확인 — 실제 호출 한 번으로 키가 맞는지 검사 */
  test(c: ChannelCredentials): Promise<{ ok: boolean; message: string }>;
  /** 기간 내 주문 가져오기 */
  fetchOrders(c: ChannelCredentials, from: Date, to: Date): Promise<FetchResult>;
  /** 재고 밀어넣기 (지원하지 않으면 생략) */
  pushStock?(
    c: ChannelCredentials,
    items: { externalProductId: string; externalItemId: string; stock: number }[]
  ): Promise<{ ok: boolean; updated: number; message: string }>;
}
