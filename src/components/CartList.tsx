'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateCartQty, removeCartItem, clearCart } from '@/actions/cart';
import { won } from '@/lib/utils';
import { SHIPPING, calcShippingFee } from '@/lib/site';

export type CartRow = {
  id: string;
  quantity: number;
  productSlug: string;
  productName: string;
  imageUrl: string;
  price: number;
  stock: number;
  optionName: string;
};

export default function CartList({ items }: { items: CartRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [checked, setChecked] = useState<string[]>(items.map((i) => i.id));

  const selected = items.filter((i) => checked.includes(i.id));
  const itemTotal = selected.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingFee = calcShippingFee(itemTotal);

  const toggle = (id: string) =>
    setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const allChecked = checked.length === items.length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="flex items-center justify-between border-b-2 border-gim-800 pb-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={() => setChecked(allChecked ? [] : items.map((i) => i.id))}
              className="h-4 w-4 accent-sea-700"
            />
            전체선택 ({checked.length}/{items.length})
          </label>
          <button
            onClick={() => start(async () => { await clearCart(); router.refresh(); })}
            className="text-xs text-gim-400 hover:text-point"
          >
            전체 비우기
          </button>
        </div>

        <ul className="divide-y divide-gim-100">
          {items.map((it) => (
            <li key={it.id} className="flex gap-4 py-5">
              <input
                type="checkbox"
                checked={checked.includes(it.id)}
                onChange={() => toggle(it.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-sea-700"
              />

              <Link href={`/products/${it.productSlug}`} className="shrink-0">
                <div className="h-24 w-24 overflow-hidden rounded-lg bg-gim-50">
                  {it.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.imageUrl} alt={it.productName} className="h-full w-full object-cover" />
                  )}
                </div>
              </Link>

              <div className="flex-1">
                <Link href={`/products/${it.productSlug}`} className="text-[15px] font-semibold hover:text-sea-700">
                  {it.productName}
                </Link>
                {it.optionName && <p className="mt-1 text-xs text-gim-400">{it.optionName}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center rounded-lg border border-gim-200">
                    <button
                      onClick={() => start(async () => { await updateCartQty(it.id, it.quantity - 1); router.refresh(); })}
                      disabled={pending || it.quantity <= 1}
                      className="h-8 w-8 text-gim-600 hover:bg-gim-50 disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-sm">{it.quantity}</span>
                    <button
                      onClick={() => start(async () => { await updateCartQty(it.id, it.quantity + 1); router.refresh(); })}
                      disabled={pending || it.quantity >= it.stock}
                      className="h-8 w-8 text-gim-600 hover:bg-gim-50 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-base font-bold">{won(it.price * it.quantity)}</span>
                </div>
              </div>

              <button
                onClick={() => start(async () => { await removeCartItem(it.id); router.refresh(); })}
                className="h-fit text-lg text-gim-300 hover:text-point"
                aria-label="삭제"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 결제 요약 */}
      <aside className="h-fit lg:sticky lg:top-28">
        <div className="card p-6">
          <h3 className="text-base font-bold">결제 예상금액</h3>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gim-500">상품금액</dt>
              <dd className="font-medium">{won(itemTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gim-500">배송비</dt>
              <dd className="font-medium">{shippingFee === 0 ? '무료' : won(shippingFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-gim-100 pt-3">
              <dt className="font-bold">총 결제금액</dt>
              <dd className="text-xl font-black text-point">{won(itemTotal + shippingFee)}</dd>
            </div>
          </dl>

          {itemTotal > 0 && itemTotal < SHIPPING.freeThreshold && (
            <p className="mt-4 rounded-lg bg-sea-50 p-3 text-xs text-sea-800">
              {won(SHIPPING.freeThreshold - itemTotal)} 더 담으면 무료배송!
            </p>
          )}

          <Link
            href="/checkout"
            className="btn-point mt-5 w-full py-4"
            aria-disabled={selected.length === 0}
          >
            주문하기
          </Link>
          <Link href="/products" className="btn-outline mt-2 w-full">계속 쇼핑하기</Link>
          <p className="mt-4 text-[11px] leading-5 text-gim-400">
            ※ 선택하지 않은 상품도 장바구니에 남아 있으면 함께 주문됩니다. 주문에서 제외할 상품은 삭제해 주세요.
          </p>
        </div>
      </aside>
    </div>
  );
}
