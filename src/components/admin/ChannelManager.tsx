'use client';

import { useState } from 'react';
import { cn, won, num, fmtDate } from '@/lib/utils';
import ChannelSettings, { type ChannelRow } from './ChannelSettings';
import OrderImport from './OrderImport';
import ChannelProductMap, { type MapRow } from './ChannelProductMap';
import ApiKeyManager, { type KeyRow } from './ApiKeyManager';

export type LogRow = {
  id: string;
  channelCode: string;
  kind: string;
  source: string;
  status: string;
  imported: number;
  skipped: number;
  failed: number;
  message: string;
  createdAt: string;
};

export type AdapterInfo = Record<string, { label: string; credLabels: (string | undefined)[] }>;

const TABS = [
  ['channels', '채널 연동'],
  ['import', '주문 파일 가져오기'],
  ['products', '상품 연결'],
  ['api', '외부 솔루션 API'],
  ['logs', '동기화 이력'],
] as const;

/** 최고관리자만 볼 수 있는 탭 (API 키가 그대로 보이는 화면) */
const OWNER_ONLY: string[] = ['api'];

type Tab = (typeof TABS)[number][0];

export default function ChannelManager({
  isOwner,
  channels,
  products,
  maps,
  apiKeys,
  logs,
  adapterInfo,
}: {
  isOwner: boolean;
  channels: ChannelRow[];
  products: { id: string; name: string; sku: string | null; stock: number }[];
  maps: MapRow[];
  apiKeys: KeyRow[];
  logs: LogRow[];
  adapterInfo: AdapterInfo;
}) {
  const [tab, setTab] = useState<Tab>('channels');

  const totalOrders = channels.reduce((s, c) => s + c.orderCount, 0);
  const totalRevenue = channels.reduce((s, c) => s + c.revenue, 0);

  return (
    <div className="space-y-5">
      {/* 채널별 요약 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {channels
          .filter((c) => c.isActive)
          .slice(0, 4)
          .map((c) => (
            <div key={c.code} className="rounded-2xl border border-gim-100 bg-white p-5">
              <p className="flex items-center gap-2 text-xs font-medium text-gim-500">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                {c.name}
              </p>
              <p className="mt-2 text-2xl font-bold text-gim-900">{won(c.revenue)}</p>
              <p className="mt-1 text-[11px] text-gim-400">
                주문 {num(c.orderCount)}건
                {totalRevenue > 0 && ` · 비중 ${Math.round((c.revenue / totalRevenue) * 100)}%`}
              </p>
            </div>
          ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.filter(([t]) => isOwner || !OWNER_ONLY.includes(t)).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold transition',
              tab === t ? 'bg-sea-800 text-white' : 'border border-gim-200 bg-white text-gim-600 hover:bg-gim-50'
            )}
          >
            {label}
            {t === 'logs' && logs.length > 0 && (
              <span className="ml-1.5 text-[11px] text-gim-400">{logs.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'channels' && <ChannelSettings channels={channels} adapterInfo={adapterInfo} />}
      {tab === 'import' && <OrderImport channels={channels} />}
      {tab === 'products' && (
        <ChannelProductMap channels={channels} products={products} maps={maps} />
      )}
      {tab === 'api' && isOwner && <ApiKeyManager apiKeys={apiKeys} />}
      {tab === 'logs' && <LogTable logs={logs} channels={channels} />}

      {tab === 'channels' && (
        <p className="text-xs leading-6 text-gim-400">
          총 {num(totalOrders)}건 · {won(totalRevenue)} (전체 채널 누적)
        </p>
      )}
    </div>
  );
}

function LogTable({ logs, channels }: { logs: LogRow[]; channels: ChannelRow[] }) {
  const name = (code: string) => channels.find((c) => c.code === code)?.name ?? code;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-gim-50 text-xs text-gim-500">
          <tr>
            <th className="px-4 py-3 text-left font-medium">일시</th>
            <th className="px-4 py-3 text-left font-medium">채널</th>
            <th className="px-4 py-3 text-left font-medium">작업</th>
            <th className="px-4 py-3 text-center font-medium">결과</th>
            <th className="px-4 py-3 text-right font-medium">신규</th>
            <th className="px-4 py-3 text-right font-medium">중복</th>
            <th className="px-4 py-3 text-right font-medium">실패</th>
            <th className="px-4 py-3 text-left font-medium">메모</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gim-100">
          {logs.map((l) => (
            <tr key={l.id} className="hover:bg-gim-50">
              <td className="whitespace-nowrap px-4 py-3 text-xs text-gim-500">
                {fmtDate(l.createdAt, true)}
              </td>
              <td className="px-4 py-3">{name(l.channelCode)}</td>
              <td className="px-4 py-3 text-gim-600">
                {l.kind === 'ORDER_IMPORT' ? '주문 가져오기' : l.kind === 'STOCK_PUSH' ? '재고 반영' : l.kind}
                <span className="ml-1.5 text-[11px] text-gim-400">
                  {l.source === 'CSV' ? '파일' : 'API'}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={cn(
                    'badge',
                    l.status === 'OK'
                      ? 'bg-sea-50 text-sea-800'
                      : l.status === 'PARTIAL'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'
                  )}
                >
                  {l.status === 'OK' ? '성공' : l.status === 'PARTIAL' ? '일부실패' : '실패'}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{l.imported}</td>
              <td className="px-4 py-3 text-right tabular-nums text-gim-400">{l.skipped}</td>
              <td className="px-4 py-3 text-right tabular-nums text-point">{l.failed || ''}</td>
              <td className="max-w-[260px] truncate px-4 py-3 text-xs text-gim-500">{l.message}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={8} className="py-16 text-center text-gim-400">
                아직 동기화 이력이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
