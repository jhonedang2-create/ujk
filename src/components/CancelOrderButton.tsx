'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelMyOrder } from '@/actions/order';

export default function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState('');

  if (!confirming) {
    return (
      <div className="text-right">
        {msg && <p className="mb-2 text-xs text-red-600">{msg}</p>}
        <button onClick={() => setConfirming(true)} className="btn-outline btn-sm">
          주문 취소
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-gim-50 p-4 text-right">
      <p className="mb-3 text-sm text-gim-700">정말 이 주문을 취소하시겠습니까?</p>
      <div className="flex justify-end gap-2">
        <button onClick={() => setConfirming(false)} className="btn-outline btn-sm">
          아니요
        </button>
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await cancelMyOrder(orderId);
              if (!res.ok) {
                setMsg(res.message);
                setConfirming(false);
              } else {
                router.push('/mypage/orders');
                router.refresh();
              }
            })
          }
          className="btn-point btn-sm"
        >
          {pending ? '취소 중…' : '주문 취소하기'}
        </button>
      </div>
    </div>
  );
}
