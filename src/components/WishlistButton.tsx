'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toggleWishlist } from '@/actions/member-commerce';
import { cn } from '@/lib/utils';

export default function WishlistButton({
  productId,
  initialActive = false,
  compact = false,
}: {
  productId: string;
  initialActive?: boolean;
  compact?: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const pathname = usePathname();
  const router = useRouter();

  function onToggle() {
    start(async () => {
      const res = await toggleWishlist(productId);
      if (!res.ok && res.message === '로그인이 필요합니다.') {
        router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
        return;
      }
      if (typeof res.active === 'boolean') setActive(res.active);
      setMessage(res.message);
      router.refresh();
    });
  }

  return (
    <div className={compact ? '' : 'space-y-1'}>
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        aria-pressed={active}
        className={cn(
          compact
            ? 'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold'
            : 'btn-outline w-full py-3',
          active && 'border-point/40 bg-point/5 text-point'
        )}
      >
        <span aria-hidden="true">{active ? '♥' : '♡'}</span>
        {pending ? '처리 중…' : active ? '찜한 상품' : '찜하기'}
      </button>
      {!compact && message && <p className="text-center text-[11px] text-gim-400">{message}</p>}
    </div>
  );
}
