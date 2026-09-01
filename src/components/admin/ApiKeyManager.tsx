'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createApiKey, toggleApiKey, deleteApiKey, type Res } from '@/actions/channels';
import { cn, fmtDate, num } from '@/lib/utils';

export type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string;
  isActive: boolean;
  callCount: number;
  lastUsedAt: string | null;
  createdAt: string;
};

const initial: Res = { ok: false, message: '' };

const SCOPE_LABEL: Record<string, string> = {
  'orders:read': '주문 조회',
  'orders:write': '주문 수정(송장·상태)',
  'products:read': '상품·재고 조회',
  'products:write': '상품·재고 수정',
};

export default function ApiKeyManager({ apiKeys }: { apiKeys: KeyRow[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createApiKey, initial);
  const [copied, setCopied] = useState('');
  const [, start] = useTransition();

  const base = typeof window !== 'undefined' ? window.location.origin : 'https://ujgim.co.kr';

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-sea-200 bg-sea-50 p-4 text-xs leading-6 text-sea-900">
        <strong>이건 반대 방향 연동입니다.</strong>
        <br />
        위쪽 &lsquo;채널 연동&rsquo;이 <em>마켓 → 자사몰</em>로 주문을 가져오는 것이라면, 여기서 발급한 키는{' '}
        <em>사방넷·이지어드민·플레이오토 같은 외부 통합관리 솔루션이 자사몰 주문을 읽어가도록</em> 문을 열어주는 용도입니다.
        <br />
        솔루션 쪽에 &lsquo;자체 쇼핑몰 REST API 연동&rsquo; 항목이 있으면 아래 주소와 키를 넣으면 됩니다.
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {apiKeys.map((k) => (
            <div key={k.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[15px] font-bold text-gim-900">
                    {k.name}
                    {!k.isActive && <span className="badge bg-gim-100 text-gim-500">사용중지</span>}
                  </p>
                  <p className="mt-1 text-[11px] text-gim-400">
                    발급 {fmtDate(k.createdAt)} · 호출 {num(k.callCount)}회
                    {k.lastUsedAt && ` · 최근 ${fmtDate(k.lastUsedAt, true)}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {k.scopes.split(',').map((s) => (
                      <span key={s} className="badge bg-gim-100 text-gim-600">
                        {SCOPE_LABEL[s] ?? s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() =>
                      start(async () => {
                        await toggleApiKey(k.id, !k.isActive);
                        router.refresh();
                      })
                    }
                    className="btn-outline btn-sm"
                  >
                    {k.isActive ? '중지' : '재개'}
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm('이 키를 삭제할까요? 연동 중인 솔루션이 즉시 끊깁니다.')) return;
                      start(async () => {
                        await deleteApiKey(k.id);
                        router.refresh();
                      });
                    }}
                    className="btn-sm rounded-lg px-3 py-1.5 text-xs font-semibold text-point hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg bg-gim-50 p-3">
                <code className="min-w-0 flex-1 truncate font-mono text-xs text-gim-700">
                  {`${k.prefix || 'ujk_'}${'•'.repeat(32)}`}
                </code>
                <span className="text-[11px] text-gim-400">원문 미보관</span>
              </div>
            </div>
          ))}

          {apiKeys.length === 0 && (
            <p className="card py-16 text-center text-sm text-gim-400">
              발급된 API 키가 없습니다.
            </p>
          )}

          <div className="card p-5">
            <p className="text-sm font-bold text-gim-900">연동 정보</p>
            <dl className="mt-4 space-y-3 text-xs">
              <div>
                <dt className="text-gim-400">주문 조회</dt>
                <dd className="mt-0.5 break-all font-mono text-gim-700">
                  GET {base}/api/v1/orders?from=2026-08-01&amp;to=2026-08-31
                </dd>
              </div>
              <div>
                <dt className="text-gim-400">송장 등록 / 상태 변경</dt>
                <dd className="mt-0.5 break-all font-mono text-gim-700">
                  PATCH {base}/api/v1/orders/&#123;주문번호&#125;
                </dd>
              </div>
              <div>
                <dt className="text-gim-400">상품·재고 조회</dt>
                <dd className="mt-0.5 break-all font-mono text-gim-700">GET {base}/api/v1/products</dd>
              </div>
              <div>
                <dt className="text-gim-400">재고 수정</dt>
                <dd className="mt-0.5 break-all font-mono text-gim-700">
                  PATCH {base}/api/v1/products/&#123;SKU&#125;
                </dd>
              </div>
              <div>
                <dt className="text-gim-400">인증 헤더</dt>
                <dd className="mt-0.5 break-all font-mono text-gim-700">
                  Authorization: Bearer &#123;발급받은 키&#125;
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <form className="card h-fit p-6" action={formAction}>
          <h2 className="mb-5 text-base font-bold">새 키 발급</h2>

          <div className="space-y-4">
            <div>
              <label className="label">용도 *</label>
              <input name="name" required placeholder="예: 사방넷 연동" className="input" />
            </div>

            <div>
              <label className="label">권한</label>
              <div className="space-y-2.5 rounded-lg bg-gim-50 p-4">
                {[
                  ['ordersRead', '주문 조회', true],
                  ['ordersWrite', '주문 수정 (송장·상태)', true],
                  ['productsRead', '상품·재고 조회', true],
                  ['productsWrite', '상품·재고 수정', false],
                ].map(([name, label, def]) => (
                  <label key={name as string} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={name as string}
                      defaultChecked={def as boolean}
                      className="h-4 w-4 accent-sea-700"
                    />
                    {label as string}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-5 text-gim-400">
                필요한 권한만 켜세요. 재고 수정 권한은 솔루션이 자사몰 재고를 덮어쓸 수 있으니
                의도한 경우에만 켜시길 권합니다.
              </p>
            </div>
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

          {state.secret && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
              <p className="text-[11px] font-semibold text-amber-900">이 키는 다시 표시되지 않습니다.</p>
              <code className="mt-2 block break-all text-xs text-gim-800">{state.secret}</code>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(state.secret!);
                  setCopied('new');
                }}
                className="btn-outline btn-sm mt-2"
              >
                {copied === 'new' ? '복사됨' : '키 복사'}
              </button>
            </div>
          )}

          <button disabled={pending} className="btn-primary mt-5 w-full">
            {pending ? '발급 중…' : '키 발급'}
          </button>
        </form>
      </div>
    </div>
  );
}
