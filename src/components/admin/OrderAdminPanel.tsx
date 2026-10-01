'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  confirmDeposit,
  updateOrderStatus,
  updateTracking,
  adminCancelOrder,
  type Res,
} from '@/actions/admin';
import { ORDER_STATUS } from '@/lib/site';
import { cn } from '@/lib/utils';

const initial: Res = { ok: false, message: '' };
const COURIERS = ['CJ대한통운', '우체국택배', '한진택배', '롯데택배', '로젠택배', '경동택배'];

export default function OrderAdminPanel({
  orderId,
  status,
  method,
  courier,
  trackingNo,
}: {
  orderId: string;
  status: string;
  method: string;
  courier: string;
  trackingNo: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const [trackState, trackAction, trackPending] = useActionState(updateTracking, initial);
  const nextStatus: Record<string, string | undefined> = {
    PAID: 'PREPARING',
    PREPARING: 'SHIPPING',
    SHIPPING: 'DELIVERED',
  };

  useEffect(() => {
    if (trackState.ok) router.refresh();
  }, [trackState.ok, router]);

  const trackingUrl =
    trackingNo
      ? `https://search.naver.com/search.naver?query=${encodeURIComponent(
          `${courier || ''} ${trackingNo}`
        )}`
      : '';

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gim-100 bg-gim-50/70 px-6 py-4">
        <div>
          <p className="text-sm font-bold">주문 처리</p>
          <p className="mt-0.5 text-xs text-gim-500">
            입금 확인 → 상품 준비 → 송장 등록 → 배송완료 순서로 처리합니다.
          </p>
        </div>
        <span className="badge bg-sea-800 px-3 py-1 text-white">
          {ORDER_STATUS[status]}
        </span>
      </div>

      <div className="space-y-6 p-6">
        {method === 'BANK' && status === 'PENDING' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">무통장입금 확인 필요</p>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              실제 입금 내역을 확인한 뒤 처리하세요. 확인하면 결제완료 상태로 변경됩니다.
            </p>
            <button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await confirmDeposit(orderId);
                  setMsg(r.message);
                  router.refresh();
                })
              }
              className="btn-primary btn-sm mt-3"
            >
              입금 확인 처리
            </button>
          </div>
        )}

        {nextStatus[status] && (
          <div className="rounded-xl border border-gim-100 p-4">
            <p className="text-xs font-bold text-gim-700">다음 주문 단계</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-sm text-gim-500">
                {ORDER_STATUS[status]} → <strong className="text-gim-800">{ORDER_STATUS[nextStatus[status]!]}</strong>
              </span>
              <button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const next = nextStatus[status]!;
                    const r = await updateOrderStatus(orderId, next);
                    if (r) setMsg(r.message);
                    router.refresh();
                  })
                }
                className="btn-outline btn-sm"
              >
                {ORDER_STATUS[nextStatus[status]!]} 처리
              </button>
            </div>
          </div>
        )}

        {['PAID', 'PREPARING', 'SHIPPING'].includes(status) && (
          <div className="rounded-xl border border-sea-100 bg-sea-50/40 p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-sea-900">배송 · 송장 관리</p>
                <p className="mt-1 text-xs leading-5 text-sea-700">
                  송장을 저장하면 주문이 자동으로 배송중 상태가 됩니다.
                </p>
              </div>
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline btn-sm bg-white"
                >
                  현재 배송조회 ↗
                </a>
              )}
            </div>

            <form action={trackAction} className="grid gap-4 lg:grid-cols-[180px_minmax(220px,1fr)_auto] lg:items-end">
              <input type="hidden" name="orderId" value={orderId} />

              <div>
                <label className="label text-xs">택배사 *</label>
                <input
                  name="courier"
                  list="courier-list"
                  required
                  defaultValue={courier || 'CJ대한통운'}
                  placeholder="택배사"
                  className="input py-2"
                />
                <datalist id="courier-list">
                  {COURIERS.map((name) => <option key={name} value={name} />)}
                </datalist>
              </div>

              <div>
                <label className="label text-xs">송장번호 *</label>
                <input
                  name="trackingNo"
                  required
                  defaultValue={trackingNo}
                  autoComplete="off"
                  placeholder="숫자 또는 하이픈 포함 송장번호"
                  className="input py-2"
                />
              </div>

              <button disabled={trackPending} className="btn-primary min-h-[40px] whitespace-nowrap">
                {trackPending
                  ? '저장 중…'
                  : status === 'SHIPPING' && trackingNo
                    ? '송장 정보 수정'
                    : '송장 등록 + 배송중'}
              </button>

              <label className="flex items-center gap-2 text-xs text-gim-600 lg:col-span-3">
                <input name="notify" type="checkbox" defaultChecked className="h-4 w-4 accent-sea-700" />
                고객에게 배송 시작 알림을 보냅니다. (알림톡 설정 시 알림톡, 실패 시 문자)
              </label>
            </form>
          </div>
        )}

        {!['CANCELLED', 'REFUNDED'].includes(status) && (
          <div className="border-t border-gim-100 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-gim-700">취소 · 환불</p>
                <p className="mt-1 max-w-2xl text-[11px] leading-5 text-gim-400">
                  카드·간편결제는 PG 취소 요청과 함께 재고·적립금이 복구됩니다.
                  무통장·외부채널 결제는 실제 환불을 먼저 완료한 뒤 처리하세요.
                </p>
              </div>
              <button
                disabled={pending}
                onClick={() => {
                  const reason = prompt('취소/환불 사유를 입력하세요.', '판매자 취소');
                  if (reason === null) return;
                  const manualRefund = status !== 'PENDING' && !['TOSS', 'PORTONE'].includes(method);
                  if (
                    manualRefund &&
                    !confirm(
                      '무통장 또는 외부채널에서 고객에게 실제 환불을 완료했습니까? 확인을 누르면 재고·적립금과 주문 상태가 최종 정산됩니다.'
                    )
                  ) return;
                  start(async () => {
                    const r = await adminCancelOrder(orderId, reason, manualRefund);
                    setMsg(r.message);
                    router.refresh();
                  });
                }}
                className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-point hover:bg-red-50"
              >
                주문 취소 / 환불
              </button>
            </div>
          </div>
        )}

        {(msg || trackState.message) && (
          <p
            className={cn(
              'rounded-lg px-4 py-3 text-sm',
              trackState.message && !trackState.ok ? 'bg-red-50 text-red-700' : 'bg-sea-50 text-sea-800'
            )}
          >
            {msg || trackState.message}
          </p>
        )}
      </div>
    </div>
  );
}
