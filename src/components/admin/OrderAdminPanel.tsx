'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  confirmDeposit,
  updateOrderStatus,
  updateTracking,
  adminCancelOrder,
  type Res,
} from '@/actions/admin';
import { ORDER_STATUS } from '@/lib/site';

const initial: Res = { ok: false, message: '' };

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

  return (
    <div className="card space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold">주문 처리</span>
        <span className="badge bg-sea-800 px-3 py-1 text-white">{ORDER_STATUS[status]}</span>
      </div>

      {/* 무통장 입금확인 */}
      {method === 'BANK' && status === 'PENDING' && (
        <div className="rounded-lg bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            무통장입금 대기중입니다. 통장 입금 확인 후 아래 버튼을 눌러주세요.
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

      {/* 상태 변경 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gim-500">상태 변경:</span>
        {nextStatus[status] && [nextStatus[status]!].map((s) => (
          <button
            key={s}
            disabled={pending || status === s}
            onClick={() =>
              start(async () => {
                const r = await updateOrderStatus(orderId, s);
                if (r) setMsg(r.message);
                router.refresh();
              })
            }
            className="btn-outline btn-sm disabled:opacity-40"
          >
            {ORDER_STATUS[s]}
          </button>
        ))}
      </div>

      {/* 송장 등록 */}
      {['PAID', 'PREPARING', 'SHIPPING'].includes(status) && (
      <form action={trackAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="orderId" value={orderId} />
        <div>
          <label className="label text-xs">택배사</label>
          <input name="courier" defaultValue={courier || '대한통운'} className="input w-36 py-2" />
        </div>
        <div>
          <label className="label text-xs">송장번호</label>
          <input name="trackingNo" defaultValue={trackingNo} className="input w-52 py-2" />
        </div>
        <button disabled={trackPending} className="btn-primary btn-sm">
          {trackPending ? '저장 중…' : '송장 등록 + 배송중'}
        </button>
      </form>
      )}

      {/* 취소/환불 */}
      {!['CANCELLED', 'REFUNDED'].includes(status) && (
        <div className="border-t border-gim-100 pt-4">
          <button
            disabled={pending}
            onClick={() => {
              const reason = prompt('취소/환불 사유를 입력하세요.', '판매자 취소');
              if (reason === null) return;
              const manualRefund = status !== 'PENDING' && !['TOSS', 'PORTONE'].includes(method);
              if (
                manualRefund &&
                !confirm('무통장 또는 외부채널에서 고객에게 실제 환불을 완료했습니까? 확인을 누르면 재고·적립금과 주문 상태가 최종 정산됩니다.')
              ) return;
              start(async () => {
                const r = await adminCancelOrder(orderId, reason, manualRefund);
                setMsg(r.message);
                router.refresh();
              });
            }}
            className="btn-sm rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-point hover:bg-red-50"
          >
            주문 취소 / 환불 처리
          </button>
          <p className="mt-2 text-[11px] text-gim-400">
            ※ 카드·간편결제 건은 PG사에 결제취소 요청이 함께 전송되며, 재고와 적립금이 복구됩니다.
            무통장·외부채널 결제는 실제 환불 완료 확인 후 로컬 정산됩니다.
          </p>
        </div>
      )}

      {(msg || trackState.message) && (
        <p className="rounded-lg bg-sea-50 px-4 py-2.5 text-sm text-sea-800">
          {msg || trackState.message}
        </p>
      )}
    </div>
  );
}
