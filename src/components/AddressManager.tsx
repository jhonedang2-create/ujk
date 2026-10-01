'use client';

import { useActionState, useState, useTransition } from 'react';
import {
  deleteAddress,
  saveAddress,
  setDefaultAddress,
  type CommerceResult,
} from '@/actions/member-commerce';
import { cn } from '@/lib/utils';

type Address = {
  id: string;
  label: string;
  receiver: string;
  phone: string;
  zipcode: string;
  address1: string;
  address2: string;
  isDefault: boolean;
};

const initial: CommerceResult = { ok: false, message: '' };

function AddressForm({
  address,
  onClose,
}: {
  address?: Address;
  onClose?: () => void;
}) {
  const [state, action, pending] = useActionState(saveAddress, initial);
  return (
    <form action={action} className="rounded-2xl border border-gim-100 bg-white p-5">
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">배송지 이름</label>
          <input name="label" className="input" defaultValue={address?.label ?? '집'} maxLength={30} />
        </div>
        <div>
          <label className="label">받는 분 *</label>
          <input name="receiver" required className="input" defaultValue={address?.receiver ?? ''} />
        </div>
        <div>
          <label className="label">연락처 *</label>
          <input name="phone" required className="input" inputMode="tel" placeholder="010-0000-0000" defaultValue={address?.phone ?? ''} />
        </div>
        <div>
          <label className="label">우편번호 *</label>
          <input name="zipcode" required className="input" inputMode="numeric" defaultValue={address?.zipcode ?? ''} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">기본주소 *</label>
          <input name="address1" required className="input" defaultValue={address?.address1 ?? ''} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">상세주소</label>
          <input name="address2" className="input" defaultValue={address?.address2 ?? ''} />
        </div>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm text-gim-600">
        <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault ?? false} className="h-4 w-4 accent-sea-700" />
        기본 배송지로 설정
      </label>
      {state.message && (
        <p className={cn('mt-4 rounded-lg px-3 py-2 text-sm', state.ok ? 'bg-sea-50 text-sea-800' : 'bg-red-50 text-red-700')}>
          {state.message}
        </p>
      )}
      <div className="mt-5 flex gap-2">
        <button disabled={pending} className="btn-primary px-6">
          {pending ? '저장 중…' : address ? '수정 저장' : '배송지 추가'}
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="btn-outline px-5">취소</button>
        )}
      </div>
    </form>
  );
}

function AddressCard({ a }: { a: Address }) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();

  if (editing) return <AddressForm address={a} onClose={() => setEditing(false)} />;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <strong className="text-sm">{a.label}</strong>
            {a.isDefault && <span className="badge bg-sea-50 text-sea-800">기본 배송지</span>}
          </div>
          <p className="mt-3 text-sm font-semibold">{a.receiver} · {a.phone}</p>
          <p className="mt-1 text-sm leading-6 text-gim-600">[{a.zipcode}] {a.address1} {a.address2}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing(true)} className="btn-outline btn-sm">수정</button>
          {!a.isDefault && (
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => {
                const res = await setDefaultAddress(a.id);
                setMessage(res.message);
              })}
              className="btn-outline btn-sm"
            >
              기본설정
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm('이 배송지를 삭제할까요?')) return;
              start(async () => {
                const res = await deleteAddress(a.id);
                setMessage(res.message);
              });
            }}
            className="btn-outline btn-sm text-red-600"
          >
            삭제
          </button>
        </div>
      </div>
      {message && <p className="mt-3 text-xs text-gim-500">{message}</p>}
    </div>
  );
}

export default function AddressManager({ addresses }: { addresses: Address[] }) {
  return (
    <div className="space-y-6">
      <AddressForm />
      <div className="space-y-3">
        {addresses.length === 0 ? (
          <p className="rounded-2xl bg-gim-50 py-10 text-center text-sm text-gim-400">저장된 배송지가 없습니다.</p>
        ) : (
          addresses.map((a) => <AddressCard key={a.id} a={a} />)
        )}
      </div>
    </div>
  );
}
