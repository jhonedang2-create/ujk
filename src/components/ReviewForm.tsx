'use client';

import { useActionState } from 'react';
import { submitReview, type CommerceResult } from '@/actions/member-commerce';
import { cn } from '@/lib/utils';

const initial: CommerceResult = { ok: false, message: '' };

export default function ReviewForm({ orderItemId }: { orderItemId: string }) {
  const [state, action, pending] = useActionState(submitReview, initial);

  return (
    <form action={action} className="mt-4 rounded-xl bg-gim-50 p-4">
      <input type="hidden" name="orderItemId" value={orderItemId} />
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <div>
          <label className="label">별점</label>
          <select name="rating" defaultValue="5" className="input">
            <option value="5">★★★★★ 5점</option>
            <option value="4">★★★★ 4점</option>
            <option value="3">★★★ 3점</option>
            <option value="2">★★ 2점</option>
            <option value="1">★ 1점</option>
          </select>
        </div>
        <div>
          <label className="label">구매후기</label>
          <textarea
            name="content"
            required
            minLength={5}
            maxLength={2000}
            rows={3}
            className="input h-auto resize-y"
            placeholder="제품의 맛, 포장, 배송 등에 대한 후기를 남겨주세요."
          />
        </div>
      </div>
      {state.message && (
        <p className={cn('mt-3 text-sm', state.ok ? 'text-sea-700' : 'text-red-600')}>{state.message}</p>
      )}
      <button disabled={pending} className="btn-primary btn-sm mt-3 px-5">
        {pending ? '등록 중…' : '후기 등록'}
      </button>
    </form>
  );
}
