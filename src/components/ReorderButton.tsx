'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reorder } from '@/actions/member-commerce';

export default function ReorderButton({ orderId }: { orderId: string }) {
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          const res = await reorder(orderId);
          setMessage(res.message);
          if (res.ok) router.push('/cart');
        })}
        className="btn-primary btn-sm px-5"
      >
        {pending ? '담는 중…' : '이 주문 그대로 다시 담기'}
      </button>
      {message && <p className="mt-2 text-xs text-gim-500">{message}</p>}
    </div>
  );
}
