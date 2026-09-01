'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProduct, toggleProductActive } from '@/actions/admin';

export default function ProductRowActions({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex justify-center gap-1.5">
      <Link href={`/admin/products/${id}`} className="btn-outline btn-sm">수정</Link>
      <button
        disabled={pending}
        onClick={() => start(async () => { await toggleProductActive(id, !isActive); router.refresh(); })}
        className="btn-outline btn-sm"
      >
        {isActive ? '중지' : '판매'}
      </button>
      <button
        disabled={pending}
        onClick={() => {
          if (!confirm('이 상품을 삭제할까요? 주문 이력이 있으면 삭제되지 않습니다.')) return;
          start(async () => { await deleteProduct(id); router.refresh(); });
        }}
        className="btn-sm rounded-lg px-3 py-1.5 text-xs font-semibold text-point hover:bg-red-50"
      >
        삭제
      </button>
    </div>
  );
}
