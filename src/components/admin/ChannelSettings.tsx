'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveChannel, clearChannelCredentials, type Res } from '@/actions/channels';
import { cn, won, num, fmtDate } from '@/lib/utils';
import type { AdapterInfo } from './ChannelManager';

export type ChannelRow = {
  code: string;
  name: string;
  type: string;
  color: string;
  adapter: string;
  syncMode: string;
  autoSync: boolean;
  isActive: boolean;
  sortOrder: number;
  hasCred: boolean;
  apiConnected: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string;
  lastSyncNote: string;
  orderCount: number;
  revenue: number;
};

const initial: Res = { ok: false, message: '' };

export default function ChannelSettings({
  channels,
  adapterInfo,
}: {
  channels: ChannelRow[];
  adapterInfo: AdapterInfo;
}) {
  const router = useRouter();
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(saveChannel, initial);
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState<Record<string, string>>({});
  const [, start] = useTransition();

  async function callSync(code: string, action: 'test' | 'orders' | 'stock', days = 7) {
    setBusy(`${code}:${action}`);
    setResult((r) => ({ ...r, [code]: '' }));
    try {
      const res = await fetch('/api/admin/channels/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, action, days }),
      });
      const json = await res.json();

      const msg = json.ok
        ? action === 'orders'
          ? `가져온 주문 ${json.fetched ?? 0}건 · 신규 ${json.imported} · 중복 ${json.skipped}${json.failed ? ` · 실패 ${json.failed}` : ''}`
          : (json.message ?? '완료되었습니다.')
        : (json.message ?? '실패했습니다.');

      setResult((r) => ({ ...r, [code]: msg }));
      router.refresh();
    } catch (e) {
      setResult((r) => ({ ...r, [code]: e instanceof Error ? e.message : '요청 실패' }));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-3">
      {channels.map((c) => {
        const info = c.adapter ? adapterInfo[c.adapter] : null;
        const open = openCode === c.code;

        return (
          <div key={c.code} className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 p-5">
              <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: c.color }} />

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-gim-900">
                  {c.name}
                  <span className="badge bg-gim-100 text-gim-500">{c.code}</span>
                  {!c.isActive && <span className="badge bg-gim-100 text-gim-400">사용안함</span>}
                  {c.adapter ? (
                    c.apiConnected ? (
                      <span className="badge bg-green-50 text-green-700">API 연결됨</span>
                    ) : c.hasCred ? (
                      <span className="badge bg-amber-50 text-amber-700">키 입력됨 · 미확인</span>
                    ) : (
                      <span className="badge bg-gim-100 text-gim-500">API 미설정</span>
                    )
                  ) : (
                    <span className="badge bg-gim-100 text-gim-500">파일 업로드 전용</span>
                  )}
                </p>
                <p className="mt-1 text-[11px] text-gim-400">
                  주문 {num(c.orderCount)}건 · {won(c.revenue)}
                  {c.lastSyncAt && ` · 최근 동기화 ${fmtDate(c.lastSyncAt, true)}`}
                  {c.lastSyncNote && ` (${c.lastSyncNote})`}
                </p>
              </div>

              {c.adapter && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => callSync(c.code, 'test')}
                    disabled={!!busy || !c.hasCred}
                    className="btn-outline btn-sm"
                  >
                    {busy === `${c.code}:test` ? '확인 중…' : '연결 확인'}
                  </button>
                  <button
                    onClick={() => callSync(c.code, 'orders', 7)}
                    disabled={!!busy || !c.hasCred}
                    className="btn-primary btn-sm"
                  >
                    {busy === `${c.code}:orders` ? '가져오는 중…' : '최근 7일 주문 가져오기'}
                  </button>
                  <button
                    onClick={() => callSync(c.code, 'stock')}
                    disabled={!!busy || !c.hasCred}
                    className="btn-outline btn-sm"
                  >
                    재고 반영
                  </button>
                </div>
              )}

              <button
                onClick={() => setOpenCode(open ? null : c.code)}
                className="btn-outline btn-sm"
              >
                {open ? '닫기' : '설정'}
              </button>
            </div>

            {result[c.code] && (
              <p className="mx-5 mb-4 rounded-lg bg-sea-50 px-4 py-2.5 text-xs text-sea-800">
                {result[c.code]}
              </p>
            )}

            {open && (
              <form action={formAction} className="border-t border-gim-100 bg-gim-50 p-5">
                <input type="hidden" name="code" value={c.code} />
                <input type="hidden" name="adapter" value={c.adapter} />
                <input type="hidden" name="type" value={c.type} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">채널 이름</label>
                    <input name="name" defaultValue={c.name} className="input bg-white" />
                  </div>
                  <div>
                    <label className="label">표시 색상</label>
                    <div className="flex gap-2">
                      <input
                        name="color"
                        defaultValue={c.color}
                        className="input bg-white font-mono text-xs"
                      />
                      <span
                        className="h-10 w-10 shrink-0 rounded-lg border border-gim-200"
                        style={{ background: c.color }}
                      />
                    </div>
                  </div>

                  {info && (
                    <>
                      <div className="sm:col-span-2">
                        <p className="rounded-lg border border-sea-200 bg-sea-50 px-4 py-3 text-xs leading-6 text-sea-900">
                          <strong>{info.label} API 키 발급 위치</strong>
                          <br />
                          {c.adapter === 'coupang'
                            ? '쿠팡 윙 → 판매자정보 → 추가판매정보 → Open API 발급 (업체코드는 같은 화면에서 확인)'
                            : '커머스API센터(apicenter.commerce.naver.com) → 내 애플리케이션 → 애플리케이션 등록 → 내스토어 앱'}
                        </p>
                      </div>

                      {info.credLabels.map((label, i) =>
                        label ? (
                          <div key={i} className={i === 2 ? 'sm:col-span-2' : ''}>
                            <label className="label">{label}</label>
                            <input
                              name={`cred${i + 1}`}
                              type={i === 1 ? 'password' : 'text'}
                              placeholder={c.hasCred ? '●●●●●  (변경할 때만 입력)' : ''}
                              className="input bg-white font-mono text-xs"
                              autoComplete="off"
                            />
                          </div>
                        ) : null
                      )}
                    </>
                  )}

                  <div>
                    <label className="label">연동 방식</label>
                    <select name="syncMode" defaultValue={c.syncMode} className="input bg-white">
                      <option value="MANUAL">주문 파일 업로드</option>
                      <option value="API" disabled={!c.adapter}>
                        API 자동 연동{!c.adapter ? ' (미지원)' : ''}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="label">정렬 순서</label>
                    <input
                      name="sortOrder"
                      type="number"
                      defaultValue={c.sortOrder}
                      className="input bg-white"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-5">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={c.isActive}
                      className="h-4 w-4 accent-sea-700"
                    />
                    이 채널 사용
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="autoSync"
                      defaultChecked={c.autoSync}
                      disabled={!c.adapter}
                      className="h-4 w-4 accent-sea-700"
                    />
                    예약 자동 동기화 사용
                  </label>

                  {c.hasCred && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm('저장된 인증정보를 지울까요?')) return;
                        start(async () => {
                          await clearChannelCredentials(c.code);
                          router.refresh();
                        });
                      }}
                      className="text-xs text-point hover:underline"
                    >
                      인증정보 삭제
                    </button>
                  )}
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

                <button disabled={pending} className="btn-primary mt-4 px-8">
                  {pending ? '저장 중…' : '저장'}
                </button>
              </form>
            )}
          </div>
        );
      })}

      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <strong>인증정보 보관 안내</strong> — API 키는 현재 데이터베이스에 평문으로 저장됩니다.
        개발·소규모 운영에는 문제없지만, 실제 운영 서버에 올리기 전에는 환경변수나 시크릿 매니저(AWS KMS,
        Vercel 환경변수 등)로 옮기시길 권합니다. DB 백업 파일이 유출되면 키도 함께 노출됩니다.
      </p>
    </div>
  );
}
