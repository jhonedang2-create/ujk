'use client';

import { useActionState, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveChannelProduct, deleteChannelProduct, type Res } from '@/actions/channels';
import { cn, fmtDate } from '@/lib/utils';
import type { ChannelRow } from './ChannelSettings';

export type MapRow = {
  id: string;
  channelCode: string;
  productId: string;
  productName: string;
  productStock: number;
  externalProductId: string;
  externalItemId: string;
  externalName: string;
  externalSku: string;
  syncStock: boolean;
  lastPushedAt: string | null;
};

const initial: Res = { ok: false, message: '' };

export default function ChannelProductMap({
  channels,
  products,
  maps,
}: {
  channels: ChannelRow[];
  products: { id: string; name: string; sku: string | null; stock: number }[];
  maps: MapRow[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<MapRow | null>(null);
  const [state, formAction, pending] = useActionState(saveChannelProduct, initial);
  const [, start] = useTransition();

  const shown = useMemo(
    () => (filter ? maps.filter((m) => m.channelCode === filter) : maps),
    [maps, filter]
  );

  const channelName = (code: string) => channels.find((c) => c.code === code)?.name ?? code;
  const usable = channels.filter((c) => c.isActive && c.code !== 'SELF');

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-sea-200 bg-sea-50 p-4 text-xs leading-6 text-sea-900">
        <strong>상품 연결이 왜 필요한가요?</strong>
        <br />
        마켓 주문에는 그쪽 상품번호만 들어 있어서, 자사몰의 어떤 상품인지 알려줘야 <strong>재고가 자동으로 빠지고</strong>{' '}
        매출 분석에도 정확히 잡힙니다. 한 번만 맞춰두면 됩니다.
        <br />
        가장 쉬운 방법은 각 마켓에 <strong>판매자 상품코드(SKU)를 자사몰 상품코드와 똑같이</strong> 넣어두는 것입니다.
        그러면 연결을 따로 등록하지 않아도 자동으로 매칭됩니다.
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('')}
              className={cn(
                'rounded-lg px-3.5 py-2 text-xs font-semibold',
                !filter ? 'bg-sea-800 text-white' : 'border border-gim-200 bg-white text-gim-600'
              )}
            >
              전체 {maps.length}
            </button>
            {usable.map((c) => {
              const n = maps.filter((m) => m.channelCode === c.code).length;
              return (
                <button
                  key={c.code}
                  onClick={() => setFilter(c.code)}
                  className={cn(
                    'rounded-lg px-3.5 py-2 text-xs font-semibold',
                    filter === c.code ? 'bg-sea-800 text-white' : 'border border-gim-200 bg-white text-gim-600'
                  )}
                >
                  {c.name} {n}
                </button>
              );
            })}
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-gim-50 text-xs text-gim-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">채널</th>
                  <th className="px-4 py-3 text-left font-medium">채널 상품번호 / SKU</th>
                  <th className="px-4 py-3 text-left font-medium">자사 상품</th>
                  <th className="px-4 py-3 text-center font-medium">재고연동</th>
                  <th className="px-4 py-3 text-center font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gim-100">
                {shown.map((m) => (
                  <tr key={m.id} className="hover:bg-gim-50">
                    <td className="px-4 py-3 text-gim-600">{channelName(m.channelCode)}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">{m.externalProductId}</span>
                      {m.externalItemId && (
                        <span className="ml-1 font-mono text-[11px] text-gim-400">/{m.externalItemId}</span>
                      )}
                      {m.externalSku && (
                        <p className="text-[11px] text-gim-400">SKU {m.externalSku}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="line-clamp-1">{m.productName}</span>
                      <p className="text-[11px] text-gim-400">재고 {m.productStock}개</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          'badge',
                          m.syncStock ? 'bg-sea-50 text-sea-800' : 'bg-gim-100 text-gim-500'
                        )}
                      >
                        {m.syncStock ? '켜짐' : '꺼짐'}
                      </span>
                      {m.lastPushedAt && (
                        <p className="mt-0.5 text-[10px] text-gim-400">{fmtDate(m.lastPushedAt)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button onClick={() => setEditing(m)} className="btn-outline btn-sm">수정</button>
                        <button
                          onClick={() => {
                            if (!confirm('연결을 삭제할까요?')) return;
                            start(async () => {
                              await deleteChannelProduct(m.id);
                              router.refresh();
                            });
                          }}
                          className="btn-sm rounded-lg px-3 py-1.5 text-xs font-semibold text-point hover:bg-red-50"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-gim-400">
                      등록된 상품 연결이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form key={editing?.id ?? 'new'} action={formAction} className="card h-fit p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-bold">{editing ? '연결 수정' : '상품 연결 추가'}</h2>
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-xs text-gim-400 hover:text-sea-700"
              >
                새로 추가
              </button>
            )}
          </div>

          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div className="space-y-4">
            <div>
              <label className="label">채널 *</label>
              <select
                name="channelCode"
                required
                defaultValue={editing?.channelCode ?? filter ?? ''}
                className="input"
              >
                <option value="">선택하세요</option>
                {usable.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">자사몰 상품 *</label>
              <select name="productId" required defaultValue={editing?.productId} className="input">
                <option value="">선택하세요</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.sku ? ` (${p.sku})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">채널 상품번호</label>
              <input
                name="externalProductId"
                defaultValue={editing?.externalProductId}
                placeholder="예: 7123456789"
                className="input font-mono text-sm"
              />
              <p className="mt-1 text-[11px] text-gim-400">
                마켓 상품 상세 URL 이나 판매자센터 상품목록에서 확인할 수 있습니다.
              </p>
            </div>

            <div>
              <label className="label">채널 옵션번호 (단품)</label>
              <input
                name="externalItemId"
                defaultValue={editing?.externalItemId}
                placeholder="옵션이 없으면 비워두세요"
                className="input font-mono text-sm"
              />
            </div>

            <div>
              <label className="label">판매자 상품코드 (SKU)</label>
              <input
                name="externalSku"
                defaultValue={editing?.externalSku}
                placeholder="자사 상품코드와 같게 넣어두면 자동 매칭됩니다"
                className="input font-mono text-sm"
              />
            </div>

            <div>
              <label className="label">채널 표시 상품명 (메모)</label>
              <input name="externalName" defaultValue={editing?.externalName} className="input" />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="syncStock"
                defaultChecked={editing?.syncStock ?? true}
                className="h-4 w-4 accent-sea-700"
              />
              재고 자동 반영 대상에 포함
            </label>
          </div>

          {state.message && (
            <p
              className={cn(
                'mt-4 rounded-lg px-4 py-2.5 text-sm',
                state.ok ? 'bg-sea-50 text-sea-800' : 'bg-red-50 text-red-700'
              )}
            >
              {state.message}
            </p>
          )}

          <button disabled={pending} className="btn-primary mt-5 w-full">
            {pending ? '저장 중…' : '저장'}
          </button>
        </form>
      </div>
    </div>
  );
}
