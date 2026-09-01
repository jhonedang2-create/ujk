'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  saveExportCountry,
  deleteExportCountry,
  saveSalesChannel,
  deleteSalesChannel,
  type Res,
} from '@/actions/admin';
import WorldMap from '@/components/WorldMap';
import { cn } from '@/lib/utils';

type Country = {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  region: string;
  mapX: number;
  mapY: number;
  since: string;
  partner: string;
  channel: string;
  note: string;
  sortOrder: number;
  isActive: boolean;
};

type Channel = {
  id: string;
  name: string;
  type: string;
  url: string;
  note: string;
  sortOrder: number;
  isActive: boolean;
};

const REGION: Record<string, string> = {
  ASIA: '아시아',
  AMERICAS: '미주',
  EUROPE: '유럽',
  OCEANIA: '오세아니아',
  MEA: '중동·아프리카',
};

const CH_TYPE: Record<string, string> = { ONLINE: '온라인', OFFLINE: '오프라인', EXPORT: '수출' };

const initial: Res = { ok: false, message: '' };

export default function GlobalManager({
  countries,
  channels,
}: {
  countries: Country[];
  channels: Channel[];
}) {
  const [tab, setTab] = useState<'country' | 'channel'>('country');

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(['country', 'channel'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold',
              tab === t ? 'bg-sea-800 text-white' : 'bg-white text-gim-600 border border-gim-200'
            )}
          >
            {t === 'country' ? `수출 국가 (${countries.length})` : `판매 채널 (${channels.length})`}
          </button>
        ))}
      </div>

      {tab === 'country' ? (
        <CountryTab countries={countries} />
      ) : (
        <ChannelTab channels={channels} />
      )}
    </div>
  );
}

function CountryTab({ countries }: { countries: Country[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Country | null>(null);
  const [state, formAction, pending] = useActionState(saveExportCountry, initial);
  const [, start] = useTransition();

  return (
    <>
      <div className="rounded-2xl border border-gim-100 bg-white p-5">
        <p className="mb-3 text-sm font-bold">지도 미리보기</p>
        <WorldMap
          flat
          height={300}
          points={countries
            .filter((c) => c.isActive)
            .map((c) => ({
              code: c.code,
              name: c.name,
              nameEn: c.nameEn,
              x: c.mapX,
              y: c.mapY,
              since: c.since,
              channel: c.channel,
              home: c.code === 'KR',
            }))}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-gim-50 text-xs text-gim-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">국가</th>
                <th className="px-4 py-3 text-left font-medium">권역</th>
                <th className="px-4 py-3 text-left font-medium">유통 채널</th>
                <th className="px-4 py-3 text-center font-medium">노출</th>
                <th className="px-4 py-3 text-center font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gim-100">
              {countries.map((c) => (
                <tr key={c.id} className="hover:bg-gim-50">
                  <td className="px-4 py-3">
                    <span className="font-semibold">{c.name}</span>
                    <span className="ml-2 text-[11px] text-gim-400">{c.code}</span>
                    {c.since && <p className="text-[11px] text-gim-400">{c.since}년~</p>}
                  </td>
                  <td className="px-4 py-3 text-gim-600">{REGION[c.region] ?? c.region}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-gim-500">{c.channel || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        'badge',
                        c.isActive ? 'bg-sea-50 text-sea-800' : 'bg-gim-100 text-gim-500'
                      )}
                    >
                      {c.isActive ? '노출' : '숨김'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1.5">
                      <button onClick={() => setEditing(c)} className="btn-outline btn-sm">수정</button>
                      <button
                        onClick={() => {
                          if (!confirm(`${c.name} 을(를) 삭제할까요?`)) return;
                          start(async () => {
                            await deleteExportCountry(c.id);
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
              {countries.length === 0 && (
                <tr><td colSpan={5} className="py-14 text-center text-gim-400">등록된 국가가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <form key={editing?.id ?? 'new'} action={formAction} className="card h-fit p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-bold">{editing ? '국가 수정' : '국가 추가'}</h2>
            {editing && (
              <button type="button" onClick={() => setEditing(null)} className="text-xs text-gim-400 hover:text-sea-700">
                새로 추가
              </button>
            )}
          </div>

          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">국가코드 *</label>
                <input name="code" required defaultValue={editing?.code} placeholder="US" className="input uppercase" />
              </div>
              <div>
                <label className="label">권역</label>
                <select name="region" defaultValue={editing?.region ?? 'ASIA'} className="input">
                  {Object.entries(REGION).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">국가명 *</label>
              <input name="name" required defaultValue={editing?.name} placeholder="미국" className="input" />
            </div>
            <div>
              <label className="label">영문명</label>
              <input name="nameEn" defaultValue={editing?.nameEn} placeholder="United States" className="input" />
            </div>

            <div className="rounded-lg bg-gim-50 p-3.5">
              <p className="mb-2 text-xs font-semibold text-gim-700">지도 위치</p>
              <p className="mb-2.5 text-[11px] leading-4 text-gim-500">
                경도·위도를 넣으면 지도 좌표가 자동 계산됩니다. (예: 미국 -98 / 39, 일본 138 / 36)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input name="lon" type="number" step="0.1" placeholder="경도" className="input py-2 text-sm" />
                <input name="lat" type="number" step="0.1" placeholder="위도" className="input py-2 text-sm" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  name="mapX"
                  type="number"
                  step="0.1"
                  defaultValue={editing?.mapX ?? 50}
                  className="input py-2 text-xs"
                  title="지도 X (0~100)"
                />
                <input
                  name="mapY"
                  type="number"
                  step="0.1"
                  defaultValue={editing?.mapY ?? 50}
                  className="input py-2 text-xs"
                  title="지도 Y (0~100)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">수출 시작연도</label>
                <input name="since" defaultValue={editing?.since} placeholder="2023" className="input" />
              </div>
              <div>
                <label className="label">정렬</label>
                <input name="sortOrder" type="number" defaultValue={editing?.sortOrder ?? 0} className="input" />
              </div>
            </div>
            <div>
              <label className="label">현지 파트너</label>
              <input name="partner" defaultValue={editing?.partner} className="input" />
            </div>
            <div>
              <label className="label">유통 채널 설명</label>
              <input name="channel" defaultValue={editing?.channel} placeholder="현지 한인마트 · 온라인몰" className="input" />
            </div>
            <div>
              <label className="label">메모</label>
              <input name="note" defaultValue={editing?.note} className="input" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} className="h-4 w-4 accent-sea-700" />
              홈페이지에 노출
            </label>
          </div>

          {state.message && (
            <p className={cn('mt-4 rounded-lg px-4 py-2.5 text-sm', state.ok ? 'bg-sea-50 text-sea-800' : 'bg-red-50 text-red-700')}>
              {state.message}
            </p>
          )}

          <button disabled={pending} className="btn-primary mt-5 w-full">
            {pending ? '저장 중…' : '저장'}
          </button>
        </form>
      </div>
    </>
  );
}

function ChannelTab({ channels }: { channels: Channel[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Channel | null>(null);
  const [state, formAction, pending] = useActionState(saveSalesChannel, initial);
  const [, start] = useTransition();

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-gim-50 text-xs text-gim-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">채널명</th>
              <th className="px-4 py-3 text-left font-medium">구분</th>
              <th className="px-4 py-3 text-left font-medium">링크</th>
              <th className="px-4 py-3 text-center font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gim-100">
            {channels.map((c) => (
              <tr key={c.id} className="hover:bg-gim-50">
                <td className="px-4 py-3">
                  <span className="font-semibold">{c.name}</span>
                  {!c.isActive && <span className="badge ml-2 bg-gim-100 text-gim-500">숨김</span>}
                  {c.note && <p className="text-[11px] text-gim-400">{c.note}</p>}
                </td>
                <td className="px-4 py-3 text-gim-600">{CH_TYPE[c.type] ?? c.type}</td>
                <td className="max-w-[180px] truncate px-4 py-3 text-[11px] text-gim-400">{c.url || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-1.5">
                    <button onClick={() => setEditing(c)} className="btn-outline btn-sm">수정</button>
                    <button
                      onClick={() => {
                        if (!confirm('삭제하시겠습니까?')) return;
                        start(async () => {
                          await deleteSalesChannel(c.id);
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
            {channels.length === 0 && (
              <tr><td colSpan={4} className="py-14 text-center text-gim-400">등록된 채널이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form key={editing?.id ?? 'new'} action={formAction} className="card h-fit p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold">{editing ? '채널 수정' : '채널 추가'}</h2>
          {editing && (
            <button type="button" onClick={() => setEditing(null)} className="text-xs text-gim-400 hover:text-sea-700">
              새로 추가
            </button>
          )}
        </div>

        {editing && <input type="hidden" name="id" value={editing.id} />}

        <div className="space-y-4">
          <div>
            <label className="label">채널명 *</label>
            <input name="name" required defaultValue={editing?.name} placeholder="네이버 스마트스토어" className="input" />
          </div>
          <div>
            <label className="label">구분</label>
            <select name="type" defaultValue={editing?.type ?? 'ONLINE'} className="input">
              {Object.entries(CH_TYPE).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">링크 URL</label>
            <input name="url" defaultValue={editing?.url} className="input" />
          </div>
          <div>
            <label className="label">설명</label>
            <input name="note" defaultValue={editing?.note} className="input" />
          </div>
          <div>
            <label className="label">정렬</label>
            <input name="sortOrder" type="number" defaultValue={editing?.sortOrder ?? 0} className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} className="h-4 w-4 accent-sea-700" />
            홈페이지에 노출
          </label>
        </div>

        {state.message && (
          <p className={cn('mt-4 rounded-lg px-4 py-2.5 text-sm', state.ok ? 'bg-sea-50 text-sea-800' : 'bg-red-50 text-red-700')}>
            {state.message}
          </p>
        )}

        <button disabled={pending} className="btn-primary mt-5 w-full">
          {pending ? '저장 중…' : '저장'}
        </button>
      </form>
    </div>
  );
}
