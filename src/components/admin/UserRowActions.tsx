'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserRole, updateUserStatus, grantPoint } from '@/actions/admin';

export default function UserRowActions({
  id,
  role,
  status,
  name,
  isOwner,
}: {
  id: string;
  role: string;
  status: string;
  name: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex gap-1.5">
        {/* 권한 변경은 최고관리자만 — 버튼 자체를 감춥니다 */}
        {isOwner && (
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await updateUserRole(id, role === 'ADMIN' ? 'USER' : 'ADMIN');
                if (r && !r.ok) setMsg(r.message);
                router.refresh();
              })
            }
            className="btn-outline btn-sm"
          >
            {role === 'ADMIN' ? '권한해제' : '관리자로'}
          </button>
        )}
        {(isOwner || role === 'USER') && (
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await updateUserStatus(id, status === 'BANNED' ? 'ACTIVE' : 'BANNED');
                if (r && !r.ok) setMsg(r.message);
                router.refresh();
              })
            }
            className="btn-outline btn-sm"
          >
            {status === 'BANNED' ? '차단해제' : '차단'}
          </button>
        )}
        <button onClick={() => setOpen(!open)} className="btn-outline btn-sm">적립금</button>
      </div>

      {msg && <p className="text-[11px] text-point">{msg}</p>}

      {open && (
        <form
          action={async (fd) => {
            await grantPoint({ ok: false, message: '' }, fd);
            setOpen(false);
            router.refresh();
          }}
          className="flex gap-1.5 rounded-lg bg-gim-50 p-2"
        >
          <input type="hidden" name="userId" value={id} />
          <input name="amount" type="number" placeholder="금액" className="input w-24 py-1.5 text-xs" />
          <input name="reason" placeholder="사유" defaultValue={`${name} 관리자 지급`} className="input w-32 py-1.5 text-xs" />
          <button className="btn-primary btn-sm">지급</button>
        </form>
      )}
    </div>
  );
}
