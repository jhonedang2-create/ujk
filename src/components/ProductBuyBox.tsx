'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addToCart } from '@/actions/cart';
import { won, num } from '@/lib/utils';

type Option = { id: string; name: string; value: string; extraPrice: number; stock: number };

export default function ProductBuyBox({
  productId,
  price,
  stock,
  options,
}: {
  productId: string;
  price: number;
  stock: number;
  options: Option[];
}) {
  const router = useRouter();
  const [optionId, setOptionId] = useState<string>(options[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();

  const selected = options.find((o) => o.id === optionId);
  const unitPrice = price + (selected?.extraPrice ?? 0);
  const maxQty = useMemo(
    () => Math.max(1, Math.min(stock, selected ? selected.stock || stock : stock)),
    [stock, selected]
  );
  const soldOut = stock <= 0;

  function submit(then: 'cart' | 'buy') {
    if (soldOut) return;
    const fd = new FormData();
    fd.set('productId', productId);
    if (optionId) fd.set('optionId', optionId);
    fd.set('quantity', String(qty));

    start(async () => {
      const res = await addToCart(fd);
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      if (then === 'buy') router.push('/checkout');
      else {
        setMsg('장바구니에 담았습니다.');
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      {options.length > 0 && (
        <div>
          <label className="label">{options[0].name}</label>
          <select
            className="input"
            value={optionId}
            onChange={(e) => setOptionId(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id} disabled={o.stock <= 0}>
                {o.value}
                {o.extraPrice ? ` (+${num(o.extraPrice)}원)` : ''}
                {o.stock <= 0 ? ' — 품절' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">수량</label>
        <div className="inline-flex items-center rounded-lg border border-gim-200">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="h-11 w-11 text-lg text-gim-600 hover:bg-gim-50"
          >
            −
          </button>
          <input
            className="h-11 w-16 border-x border-gim-200 text-center text-sm outline-none"
            value={qty}
            onChange={(e) => {
              const v = Number(e.target.value.replace(/\D/g, '') || 1);
              setQty(Math.min(Math.max(1, v), maxQty));
            }}
          />
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            className="h-11 w-11 text-lg text-gim-600 hover:bg-gim-50"
          >
            +
          </button>
          <span className="px-4 text-xs text-gim-400">재고 {stock}개</span>
        </div>
      </div>

      <div className="flex items-baseline justify-between border-t border-gim-100 pt-5">
        <span className="text-sm font-semibold text-gim-600">총 상품금액</span>
        <span className="text-2xl font-black text-point">{won(unitPrice * qty)}</span>
      </div>

      {msg && <p className="rounded-lg bg-sea-50 px-4 py-2.5 text-sm text-sea-800">{msg}</p>}

      <div className="flex gap-2.5">
        <button
          onClick={() => submit('cart')}
          disabled={pending || soldOut}
          className="btn-outline flex-1 py-4"
        >
          장바구니
        </button>
        <button
          onClick={() => submit('buy')}
          disabled={pending || soldOut}
          className="btn-point flex-1 py-4"
        >
          {soldOut ? '품절' : '바로 구매'}
        </button>
      </div>
    </div>
  );
}
