type PaymentState = { status: string; method: string } | null;

/** The persisted payment state is authoritative, even if the browser lost the callback. */
export function checkoutResultState(orderStatus: string, payment: PaymentState) {
  if (orderStatus === 'REFUNDED' || payment?.status === 'REFUNDED') {
    return { title: '환불 처리된 주문입니다', description: '반영 시점은 결제수단에 따라 다를 수 있습니다. 아래 주문조회에서 처리 내역을 확인해 주세요.', tone: 'pending', showBank: false } as const;
  }
  if (orderStatus === 'CANCELLED' || payment?.status === 'CANCELLED') {
    return { title: '취소된 주문입니다', description: '아래 주문조회에서 취소 상태를 확인할 수 있습니다. 이 주문에는 입금하지 마세요.', tone: 'pending', showBank: false } as const;
  }
  if (payment?.status === 'PAID') {
    return { title: '결제가 정상적으로 확인되었습니다', description: '아래 주문조회에서 상품 준비 및 배송 상태를 확인할 수 있습니다.', tone: 'success', showBank: false } as const;
  }
  if (orderStatus === 'PENDING' && payment?.method === 'BANK' && payment.status === 'READY') {
    return { title: '주문이 정상적으로 접수되었습니다', description: '아래 계좌로 입금해 주시면 입금 확인 후 상품을 준비합니다.', tone: 'success', showBank: true } as const;
  }
  if (payment?.status === 'FAILED') {
    return { title: '결제가 완료되지 않았습니다', description: '아래 주문번호로 주문 상태를 확인해 주세요. 이미 승인 또는 출금 안내를 받았다면 다시 결제하기 전에 고객센터로 문의해 주세요.', tone: 'error', showBank: false } as const;
  }
  return { title: '결제 상태를 확인해 주세요', description: '주문은 접수되었으나 아직 결제 완료가 확인되지 않았습니다. 새 주문을 만들거나 다시 결제하기 전에 아래 주문조회에서 상태를 확인해 주세요.', tone: 'pending', showBank: false } as const;
}
