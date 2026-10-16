'use client';

import { useActionState, useState } from 'react';
import { saveMessageDelivery } from '@/actions/message-delivery';
import type { DeliveryPolicy, DeliveryMode } from '@/lib/messaging/delivery-rules';

type Events = { autoOnPaid: boolean; autoOnDeposit: boolean; autoOnShipping: boolean; autoOnDelivered: boolean; autoOnCancelled: boolean };
const OPTIONS: [keyof Events, string][] = [
  ['autoOnPaid', '결제완료'], ['autoOnDeposit', '무통장 입금안내'], ['autoOnShipping', '배송시작·송장등록'],
  ['autoOnDelivered', '배송완료'], ['autoOnCancelled', '주문취소'],
];

export default function MessageDeliveryControls({ policy, initialEvents }: { policy: DeliveryPolicy; initialEvents: Events }) {
  const [state, action, pending] = useActionState(saveMessageDelivery, { ok: false, message: '' });
  const [enabled, setEnabled] = useState(policy.enabled);
  const [mode, setMode] = useState<DeliveryMode>(policy.mode);
  const [events, setEvents] = useState(initialEvents);
  return (
    <form action={action} className="card space-y-6 p-6 sm:p-8">
      <div>
        <h2 className="text-lg font-bold">알림톡·문자 발송 제어</h2>
        <p className="mt-2 text-sm leading-6 text-gim-500">자동알림·수동발송·예약접수에 공통 적용합니다. 설정 저장 자체로 메시지가 발송되지는 않습니다.</p>
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-gim-200 p-4">
        <input type="checkbox" name="enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-5 w-5 accent-sea-700" />
        <span><strong>유료 메시지 발송 허용</strong><small className="mt-1 block text-gim-500">체크 해제 후 저장하면 새로운 발송 요청을 모두 차단합니다.</small></span>
      </label>
      <fieldset>
        <legend className="mb-3 text-sm font-bold">발송 방식</legend>
        <div className="grid gap-3 lg:grid-cols-3">
          {([
            ['ALIMTALK_ONLY', '알림톡만', '권장 · 실패해도 문자 비용이 발생하지 않습니다.'],
            ['ALIMTALK_SMS', '알림톡 → 문자', '알림톡 실패 시 문자 요금으로 대체 발송됩니다.'],
            ['SMS_ONLY', '문자만', '모든 안내를 SMS/LMS로 발송합니다.'],
          ] as const).map(([value, title, description]) => (
            <label key={value} className={'cursor-pointer rounded-xl border p-4 ' + (mode === value ? 'border-sea-700 bg-sea-50' : 'border-gim-200')}>
              <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="mr-2 accent-sea-700" />
              <strong className="text-sm">{title}</strong><p className="mt-2 text-xs leading-5 text-gim-500">{description}</p>
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-gim-500">알림톡 방식에서는 채널·템플릿이 없으면 발송을 차단합니다. 임의로 문자로 바꾸지 않습니다. 광고·수동 문자는 문자 모드에서만 지원합니다.</p>
      </fieldset>
      <fieldset className="border-t border-gim-100 pt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <legend className="text-sm font-bold">주문 자동알림</legend>
          <button type="button" className="btn-outline btn-sm" onClick={() => setEvents({ autoOnPaid: true, autoOnDeposit: false, autoOnShipping: true, autoOnDelivered: false, autoOnCancelled: false })}>결제·배송 두 가지만 선택</button>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {OPTIONS.map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" name={key} checked={events[key]} onChange={(e) => setEvents({ ...events, [key]: e.target.checked })} className="h-4 w-4 accent-sea-700" />{label}</label>)}
        </div>
      </fieldset>
      {enabled && <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"><input type="checkbox" name="acknowledgeCost" required className="mt-1 h-4 w-4" /><span>발송 건별 요금이 발생함을 확인했습니다. 등록한 템플릿의 승인은 SOLAPI 콘솔에서 확인했으며, 발송량·충전금액은 별도로 관리합니다.</span></label>}
      {state.message && <p role="status" className={'rounded-xl p-4 text-sm ' + (state.ok ? 'bg-sea-50 text-sea-800' : 'bg-red-50 text-red-800')}>{state.message}</p>}
      <div className="flex flex-wrap items-center gap-4"><button disabled={pending} className="btn-primary">{pending ? '저장 중…' : '발송 정책 저장'}</button><span className="text-xs text-gim-500">월 예산 상한이나 이미 접수된 예약의 취소 기능은 아닙니다.</span></div>
    </form>
  );
}
