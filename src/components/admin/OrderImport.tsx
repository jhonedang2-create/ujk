'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FIELD_LABEL, REQUIRED_FIELDS, PRICE_FIELDS, type FieldKey } from '@/lib/channels/csv';
import { cn } from '@/lib/utils';
import type { ChannelRow } from './ChannelSettings';

type Parsed = {
  fileName: string;
  headers: string[];
  map: Record<FieldKey, number>;
  guessedChannel: string | null;
  totalRows: number;
  preview: string[][];
  rows: string[][];
};

type Result = {
  imported: number;
  skipped: number;
  failed: number;
  total: number;
  errors: string[];
};

const FIELDS = Object.keys(FIELD_LABEL) as FieldKey[];

export default function OrderImport({ channels }: { channels: ChannelRow[] }) {
  const router = useRouter();
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [channelCode, setChannelCode] = useState('');
  const [map, setMap] = useState<Record<FieldKey, number>>({} as Record<FieldKey, number>);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const usable = channels.filter((c) => c.isActive && c.code !== 'SELF');

  async function upload(file: File) {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/channels/parse', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);

      setParsed(json);
      setMap(json.map);
      setChannelCode(
        json.guessedChannel && usable.some((c) => c.code === json.guessedChannel)
          ? json.guessedChannel
          : (usable[0]?.code ?? '')
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '파일을 읽지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function doImport() {
    if (!parsed || !channelCode) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/channels/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelCode, rows: parsed.rows, map }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message ?? '적재에 실패했습니다.');
      setResult(json);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '적재 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  const missing = REQUIRED_FIELDS.filter((f) => (map[f] ?? -1) < 0);
  const noPrice = PRICE_FIELDS.every((f) => (map[f] ?? -1) < 0);
  const blocked = missing.length > 0 || noPrice;

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h2 className="text-base font-bold">1. 마켓 주문 파일 올리기</h2>
        <p className="mt-1.5 text-xs leading-6 text-gim-500">
          각 마켓 판매자센터에서 주문 목록을 내려받아 올리면, 컬럼을 자동으로 알아보고 자사몰 주문으로 등록합니다.
          <br />
          엑셀(.xlsx)은 <strong>다른 이름으로 저장 → CSV UTF-8</strong> 로 바꿔서 올려주세요. 같은 파일을 두 번 올려도 중복 등록되지 않습니다.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="btn-primary cursor-pointer px-6">
            {busy && !parsed ? '분석 중…' : '주문 파일 선택'}
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = '';
              }}
            />
          </label>
          {parsed && (
            <span className="text-xs text-gim-500">
              {parsed.fileName} · {parsed.totalRows}행 · 컬럼 {parsed.headers.length}개
              {parsed.guessedChannel && (
                <span className="ml-2 badge bg-sea-50 text-sea-800">
                  {channels.find((c) => c.code === parsed.guessedChannel)?.name ?? parsed.guessedChannel} 파일로 추정
                </span>
              )}
            </span>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</p>
        )}
      </div>

      {parsed && !result && (
        <>
          <div className="card p-6">
            <h2 className="text-base font-bold">2. 채널 선택 · 컬럼 확인</h2>
            <p className="mt-1.5 text-xs leading-6 text-gim-500">
              자동으로 맞춘 결과입니다. 틀린 항목만 바꿔주세요. <strong className="text-point">*</strong> 는 필수입니다.
              <br />
              <strong>단가</strong>는 1개 가격, <strong>판매금액</strong>은 수량이 곱해진 금액입니다.
              둘 중 하나만 지정하면 됩니다. (마켓마다 컬럼이 다르니 미리보기에서 숫자를 꼭 확인하세요)
            </p>

            <div className="mt-4 max-w-xs">
              <label className="label">이 파일은 어느 채널 주문인가요? *</label>
              <select
                value={channelCode}
                onChange={(e) => setChannelCode(e.target.value)}
                className="input"
              >
                <option value="">선택하세요</option>
                {usable.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((f) => {
                const isRequired = REQUIRED_FIELDS.includes(f);
                const unset = (map[f] ?? -1) < 0;
                return (
                  <div key={f}>
                    <label
                      className={cn(
                        'label',
                        isRequired && unset ? 'text-point' : ''
                      )}
                    >
                      {FIELD_LABEL[f]}
                    </label>
                    <select
                      value={map[f] ?? -1}
                      onChange={(e) => setMap({ ...map, [f]: Number(e.target.value) })}
                      className={cn(
                        'input py-2 text-sm',
                        isRequired && unset && 'border-point'
                      )}
                    >
                      <option value={-1}>— 사용 안 함 —</option>
                      {parsed.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `(${i + 1}번째 열)`}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-base font-bold">3. 미리보기</h2>
            <p className="mt-1.5 text-xs text-gim-500">앞 20행만 보여드립니다.</p>
            <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-gim-100">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gim-50">
                  <tr>
                    {parsed.headers.map((h, i) => {
                      const mapped = FIELDS.find((f) => map[f] === i);
                      return (
                        <th key={i} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                          <span className="text-gim-700">{h || `열 ${i + 1}`}</span>
                          {mapped && (
                            <span className="mt-0.5 block text-[10px] font-normal text-sea-600">
                              → {FIELD_LABEL[mapped].replace(' *', '')}
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gim-100">
                  {parsed.preview.map((row, ri) => (
                    <tr key={ri}>
                      {parsed.headers.map((_, ci) => (
                        <td key={ci} className="max-w-[180px] truncate px-3 py-2 text-gim-600">
                          {row[ci] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={doImport}
                disabled={busy || !channelCode || blocked}
                className="btn-primary px-8"
              >
                {busy ? '등록 중…' : `${parsed.totalRows}행 주문으로 등록하기`}
              </button>
              <button onClick={() => setParsed(null)} className="btn-outline">
                취소
              </button>
              {missing.length > 0 && (
                <span className="text-xs text-point">
                  필수 항목 미지정: {missing.map((m) => FIELD_LABEL[m].replace(' *', '')).join(', ')}
                </span>
              )}
              {noPrice && (
                <span className="text-xs text-point">
                  &lsquo;단가&rsquo; 또는 &lsquo;판매금액&rsquo; 중 하나는 반드시 지정해야 합니다.
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {result && (
        <div className="card p-6">
          <h2 className="text-base font-bold">등록 완료</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            {[
              ['파일 내 주문', result.total, 'text-gim-900'],
              ['신규 등록', result.imported, 'text-sea-700'],
              ['중복 건너뜀', result.skipped, 'text-gim-400'],
              ['실패', result.failed, 'text-point'],
            ].map(([label, v, color]) => (
              <div key={label as string} className="rounded-xl bg-gim-50 p-4">
                <p className="text-xs text-gim-500">{label as string}</p>
                <p className={cn('mt-1 text-2xl font-bold', color as string)}>{v as number}</p>
              </div>
            ))}
          </div>

          {result.errors?.length > 0 && (
            <details className="mt-5">
              <summary className="cursor-pointer text-sm font-medium text-gim-700">
                처리 메모 {result.errors.length}건 보기
              </summary>
              <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto rounded-lg bg-gim-50 p-4 text-xs text-gim-600">
                {result.errors.map((e, i) => (
                  <li key={i}>· {e}</li>
                ))}
              </ul>
            </details>
          )}

          <div className="mt-6 flex gap-2">
            <a href="/admin/orders" className="btn-primary">주문 관리로 이동</a>
            <button
              onClick={() => {
                setParsed(null);
                setResult(null);
              }}
              className="btn-outline"
            >
              다른 파일 올리기
            </button>
          </div>

          <p className="mt-5 rounded-lg bg-sea-50 px-4 py-3 text-xs leading-6 text-sea-900">
            <strong>&lsquo;미매칭&rsquo; 표시가 붙은 상품이 있나요?</strong> 자사몰에 같은 상품이 없거나
            상품코드가 달라서 연결하지 못한 경우입니다. 주문 자체는 정상 등록되었고, <strong>상품 연결</strong> 탭에서
            채널 상품번호나 판매자 상품코드를 한 번만 맞춰두면 다음부터는 자동으로 연결됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
