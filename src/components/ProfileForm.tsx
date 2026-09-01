'use client';

import { useActionState } from 'react';
import { saveProfile, type Res } from '@/actions/profile';
import { cn } from '@/lib/utils';

const initial: Res = { ok: false, message: '' };

export default function ProfileForm({
  name,
  phone,
  agreeMarketing,
  needsPhone,
}: {
  name: string;
  phone: string;
  agreeMarketing: boolean;
  needsPhone: boolean;
}) {
  const [state, action, pending] = useActionState(saveProfile, initial);

  return (
    <form action={action} className={cn('card p-7', needsPhone && 'border-point/40 bg-point/[0.03]')}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-bold">내 정보</h2>
        {needsPhone && (
          <span className="badge bg-point text-white">연락처를 입력해 주세요</span>
        )}
      </div>

      {needsPhone && (
        <p className="mb-5 rounded-lg bg-point/5 px-4 py-3 text-xs leading-6 text-point">
          카카오·네이버 계정에는 전화번호가 포함되지 않습니다.
          <strong> 주문·배송 알림을 받으시려면 연락처를 한 번만 입력</strong>해 주세요.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">이름 *</label>
          <input name="name" required defaultValue={name} className="input" />
        </div>
        <div>
          <label className="label">휴대폰 번호</label>
          <input
            name="phone"
            defaultValue={phone}
            placeholder="010-0000-0000"
            inputMode="tel"
            className="input"
          />
        </div>
      </div>

      <label className="mt-5 flex items-start gap-2.5 rounded-lg bg-gim-50 p-4 text-sm">
        <input
          type="checkbox"
          name="agreeMarketing"
          defaultChecked={agreeMarketing}
          className="mt-0.5 h-4 w-4 accent-sea-700"
        />
        <span>
          <strong>할인·이벤트 안내 받기</strong>
          <span className="mt-0.5 block text-[11px] leading-5 text-gim-500">
            선택 사항입니다. 켜지 않아도 주문·배송 안내는 정상적으로 받으실 수 있습니다.
            언제든 다시 끄거나 문자 하단의 수신거부 링크로 해지할 수 있습니다.
          </span>
        </span>
      </label>

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

      <button disabled={pending} className="btn-primary mt-5 px-8">
        {pending ? '저장 중…' : '저장'}
      </button>
    </form>
  );
}
