'use client';

import { useState, useTransition } from 'react';
import { setReviewVisibility } from '@/actions/review-admin';

export default function ReviewAdminActions({ id, active }: { id: string; active: boolean }) {
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          const res = await setReviewVisibility(id, !active);
          setMessage(res.message);
        })}
        className={active ? 'btn-outline btn-sm text-red-600' : 'btn-primary btn-sm'}
      >
        {pending ? '처리 중…' : active ? '숨김' : '공개 복구'}
      </button>
      {message && <p className="mt-1 text-[10px] text-gim-400">{message}</p>}
    </div>
  );
}
