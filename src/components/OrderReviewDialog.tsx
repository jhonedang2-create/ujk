'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { won } from '@/lib/utils';

type Props = {
  fields: Record<string, string> | null;
  items: { id: string; name: string; quantity: number; price: number }[];
  total: number; shippingFee: number; pointUsed: number; methodLabel: string;
  paymentReady: boolean; pending: boolean; onClose: () => void; onConfirm: () => void;
};

export default function OrderReviewDialog({ fields, items, total, shippingFee, pointUsed, methodLabel, paymentReady, pending, onClose, onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (fields && !node.open) { previousFocus.current = document.activeElement as HTMLElement; node.showModal(); }
    if (!fields && node.open) { node.close(); previousFocus.current?.focus(); }
  }, [fields]);
  return <dialog ref={dialog} aria-labelledby="review-order-title" onCancel={(e) => { e.preventDefault(); if (!pending) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl p-0 shadow-2xl backdrop:bg-black/50">
    {fields && <div className="space-y-5 p-6 sm:p-8">
      <header className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold text-sea-700">ORDER REVIEW</p><h2 id="review-order-title" className="mt-1 text-xl font-bold">결제 전 주문 내용 확인</h2></div><button type="button" disabled={pending} onClick={onClose} className="btn-outline btn-sm" aria-label="확인창 닫고 주문서로 돌아가기">닫기</button></header>
      <ul className="divide-y divide-gim-100">{items.map((item) => <li key={item.id} className="flex items-start justify-between gap-4 py-3 text-sm"><span>{item.name}<small className="mt-1 block text-gim-500">수량 {item.quantity}개</small></span><strong className="shrink-0">{won(item.price * item.quantity)}</strong></li>)}</ul>
      <dl className="grid gap-3 rounded-xl bg-gim-50 p-5 text-sm sm:grid-cols-2"><div><dt className="text-xs text-gim-500">주문자</dt><dd className="mt-1">{fields.ordererName} · {fields.ordererPhone}</dd></div><div><dt className="text-xs text-gim-500">받는 분</dt><dd className="mt-1">{fields.receiver} · {fields.recvPhone}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-gim-500">배송지</dt><dd className="mt-1 break-words">[{fields.zipcode}] {fields.address1} {fields.address2}</dd></div></dl>
      <dl className="space-y-2 text-sm"><div className="flex justify-between"><dt>결제수단</dt><dd>{methodLabel}</dd></div><div className="flex justify-between"><dt>배송비</dt><dd>{shippingFee ? won(shippingFee) : '무료'}</dd></div>{pointUsed > 0 && <div className="flex justify-between"><dt>적립금 사용</dt><dd>-{won(pointUsed)}</dd></div>}<div className="flex justify-between border-t border-gim-200 pt-3 text-lg font-bold"><dt>최종 결제금액</dt><dd>{won(total)}</dd></div></dl>
      <p className="text-xs leading-6 text-gim-500">아래 버튼을 누르기 전에는 주문이 생성되거나 재고·적립금이 차감되지 않습니다. 잘못 입력한 정보는 주문서로 돌아가 수정해 주세요. <Link href="/policy/shipping" target="_blank" rel="noopener noreferrer" className="font-semibold underline">배송·반품 안내</Link></p>
      {!paymentReady && <p role="status" className="rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-900">선택한 결제수단은 아직 이용할 수 없습니다. 주문이나 결제를 접수하지 않았습니다. 이용 가능한 다른 결제수단을 선택하거나 고객센터로 문의해 주세요.</p>}
      <div className="flex flex-col gap-3 sm:flex-row"><button type="button" disabled={pending} onClick={onClose} className="btn-outline flex-1">주문서 수정</button><button type="button" disabled={pending || !paymentReady} onClick={onConfirm} className="btn-primary flex-1 disabled:opacity-50">{pending ? '처리 중…' : `${won(total)} 결제하기`}</button></div>
    </div>}
  </dialog>;
}
