export type MessageType = 'SMS' | 'LMS' | 'ATA' | 'CTA';

export type OutgoingMessage = {
  to: string;
  text: string;
  /** 알림톡 템플릿 코드 (있으면 알림톡, 실패 시 문자로 자동 대체) */
  kakaoTemplateId?: string;
  /** 알림톡 치환 변수 */
  variables?: Record<string, string>;
  /** 친구톡 이미지 */
  imageUrl?: string;
  /** 광고성이면 true (친구톡 adFlag) */
  isAd?: boolean;
  subject?: string;
};

export type SendResult = {
  ok: boolean;
  /** 개별 결과 — 요청 순서와 동일 */
  results: {
    to: string;
    ok: boolean;
    messageId?: string;
    type?: string;
    errorCode?: string;
    errorMessage?: string;
  }[];
  message?: string;
};

export type ProviderCredentials = {
  apiKey: string;
  apiSecret: string;
  senderNumber: string;
  pfId: string;
};

export interface MessageProvider {
  key: string;
  label: string;
  test(c: ProviderCredentials): Promise<{ ok: boolean; message: string; balance?: number }>;
  send(c: ProviderCredentials, messages: OutgoingMessage[], scheduledAt?: Date): Promise<SendResult>;
}
