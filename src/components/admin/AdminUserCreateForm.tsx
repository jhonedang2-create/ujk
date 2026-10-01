'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserByAdmin, type Res } from '@/actions/admin';
import { cn } from '@/lib/utils';

const initial: Res = { ok: false, message: '' };

export default function AdminUserCreateForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createUserByAdmin, initial);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    router.refresh();
  }, [state.ok, router]);

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gim-50"
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-bold text-gim-900">일반회원 직접 생성</p>
          <p className="mt-1 text-xs text-gim-500">
            전화 주문·오프라인 고객 등 계정이 필요한 고객을 관리자가 직접 등록할 수 있습니다.
          </p>
        </div>
        <span className="btn-primary btn-sm shrink-0">{open ? '닫기' : '+ 회원 추가'}</span>
      </button>

      {open && (
        <form ref={formRef} action={action} className="border-t border-gim-100 bg-gim-50/40 p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="label">로그인 ID *</label>
              <input
                name="loginId"
                required
                minLength={3}
                maxLength={40}
                autoComplete="off"
                placeholder="예: honggildong"
                className="input"
              />
              <p className="mt-1 text-[11px] text-gim-400">영문·숫자·점·밑줄·하이픈 사용</p>
            </div>
            <div>
              <label className="label">이름 *</label>
              <input name="name" required maxLength={50} className="input" />
            </div>
            <div>
              <label className="label">휴대폰</label>
              <input name="phone" inputMode="tel" placeholder="010-0000-0000" className="input" />
            </div>
            <div>
              <label className="label">이메일</label>
              <input name="email" type="email" autoComplete="off" placeholder="선택 입력" className="input" />
            </div>
            <div>
              <label className="label">초기 비밀번호 *</label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="8자 이상 영문 + 숫자"
                className="input"
              />
            </div>
            <div>
              <label className="label">초기 적립금</label>
              <input
                name="initialPoint"
                type="number"
                min={0}
                max={10000000}
                defaultValue={0}
                className="input"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button disabled={pending} className="btn-primary">
              {pending ? '생성 중…' : '회원 생성'}
            </button>
            <p className="text-xs text-gim-500">
              생성 계정은 즉시 ACTIVE 상태이며 아이디·비밀번호 방식으로 로그인할 수 있습니다.
            </p>
          </div>

          {state.message && (
            <p
              className={cn(
                'mt-4 rounded-lg px-4 py-3 text-sm',
                state.ok ? 'bg-sea-50 text-sea-800' : 'bg-red-50 text-red-700'
              )}
            >
              {state.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
