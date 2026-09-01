'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createStaff,
  updateStaff,
  resetStaffPassword,
  toggleStaffActive,
  type Res,
} from '@/actions/staff';
import {
  PERMISSIONS,
  PERMISSION_LABEL,
  PERMISSION_NOTE,
  ROLE_LABEL,
  ROLE_DESC,
  ROLE_PRESET,
  permissionsOf,
  type Role,
  type Permission,
} from '@/lib/permissions';
import { cn, fmtDate } from '@/lib/utils';

export type StaffRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  position: string;
  memo: string;
  permissions: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
};

type LogRow = {
  id: string;
  userName: string;
  action: string;
  target: string;
  detail: string;
  at: string;
};

const ACTION_LABEL: Record<string, string> = {
  STAFF_CREATE: '직원 계정 생성',
  STAFF_UPDATE: '직원 정보 수정',
  STAFF_RESET_PW: '비밀번호 초기화',
  STAFF_ENABLE: '계정 사용 재개',
  STAFF_DISABLE: '계정 사용 중지',
  MESSAGE_SEND: '문자 발송',
  CAMPAIGN_SEND: '홍보 발송',
  MESSAGE_RESEND: '알림 재발송',
  MESSAGE_SETTING: '발송 설정 변경',
};

const initial: Res = { ok: false, message: '' };
const ROLES: Role[] = ['ADMIN', 'MANAGER', 'STAFF'];

export default function StaffManager({
  me,
  staff,
  logs,
}: {
  me: string;
  staff: StaffRow[];
  logs: LogRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'list' | 'logs'>('list');
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  const [notice, setNotice] = useState('');
  const [, start] = useTransition();

  const [createState, createAction, creatingPending] = useActionState(createStaff, initial);
  const [updateState, updateAction, updatePending] = useActionState(updateStaff, initial);

  // 새 계정 발급 결과를 화면에 잡아둡니다
  if (createState.ok && createState.password && !issued) {
    setIssued({ email: '새 계정', password: createState.password });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(['list', 'logs'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold',
              tab === t ? 'bg-sea-800 text-white' : 'border border-gim-200 bg-white text-gim-600'
            )}
          >
            {t === 'list' ? `직원 ${staff.length}명` : '활동 기록'}
          </button>
        ))}
        {tab === 'list' && (
          <button
            onClick={() => {
              setCreating(true);
              setEditing(null);
              setIssued(null);
            }}
            className="btn-primary btn-sm ml-auto px-5"
          >
            + 직원 계정 만들기
          </button>
        )}
      </div>

      {issued && (
        <div className="rounded-xl border-2 border-sea-300 bg-sea-50 p-5">
          <p className="text-sm font-bold text-sea-900">임시 비밀번호가 발급되었습니다</p>
          <p className="mt-1 text-xs text-sea-800">
            이 화면을 벗어나면 다시 볼 수 없습니다. 본인에게 전달하고 첫 로그인 후 바꾸게 하세요.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-white p-3">
            <code className="flex-1 font-mono text-base font-bold text-gim-900">
              {issued.password}
            </code>
            <button
              onClick={() => navigator.clipboard?.writeText(issued.password)}
              className="btn-outline btn-sm"
            >
              복사
            </button>
            <button onClick={() => setIssued(null)} className="btn-ghost btn-sm">
              닫기
            </button>
          </div>
        </div>
      )}

      {notice && (
        <p className="rounded-lg bg-sea-50 px-4 py-3 text-sm text-sea-800">{notice}</p>
      )}

      {tab === 'logs' ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-gim-50 text-xs text-gim-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">일시</th>
                <th className="px-4 py-3 text-left font-medium">담당자</th>
                <th className="px-4 py-3 text-left font-medium">한 일</th>
                <th className="px-4 py-3 text-left font-medium">대상</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gim-100">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-gim-50">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gim-500">{l.at}</td>
                  <td className="px-4 py-3">{l.userName || '-'}</td>
                  <td className="px-4 py-3 text-gim-700">{ACTION_LABEL[l.action] ?? l.action}</td>
                  <td className="px-4 py-3 text-xs text-gim-500">
                    {l.target}
                    {l.detail && <span className="ml-1.5 text-gim-400">({l.detail})</span>}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-gim-400">
                    기록이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <div className="space-y-3">
            {staff.map((u) => {
              const perms = permissionsOf(u);
              const isCustom = !!u.permissions;
              return (
                <div key={u.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-gim-900">
                        {u.name || '(이름 없음)'}
                        <span
                          className={cn(
                            'badge',
                            u.role === 'ADMIN'
                              ? 'bg-point text-white'
                              : u.role === 'MANAGER'
                                ? 'bg-sea-700 text-white'
                                : 'bg-gim-200 text-gim-700'
                          )}
                        >
                          {ROLE_LABEL[u.role as Role] ?? u.role}
                        </span>
                        {u.position && (
                          <span className="badge bg-gim-100 text-gim-600">{u.position}</span>
                        )}
                        {u.status !== 'ACTIVE' && (
                          <span className="badge bg-gim-100 text-gim-400">사용중지</span>
                        )}
                        {u.id === me && <span className="text-[11px] text-gim-400">(나)</span>}
                      </p>
                      <p className="mt-1 text-[11px] text-gim-400">
                        {u.email} {u.phone && `· ${u.phone}`} · 가입 {fmtDate(u.createdAt)}
                        {u.lastLoginAt && ` · 최근 로그인 ${fmtDate(u.lastLoginAt, true)}`}
                      </p>

                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {perms.map((p) => (
                          <span key={p} className="badge bg-gim-50 text-gim-600">
                            {PERMISSION_LABEL[p]}
                          </span>
                        ))}
                        {isCustom && (
                          <span className="badge bg-amber-50 text-amber-700">개별 지정</span>
                        )}
                      </div>
                      {u.memo && <p className="mt-2 text-xs text-gim-500">{u.memo}</p>}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <button
                        onClick={() => {
                          setEditing(u);
                          setCreating(false);
                          setIssued(null);
                        }}
                        className="btn-outline btn-sm"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm(`${u.name} 님의 비밀번호를 새로 발급할까요?`)) return;
                          start(async () => {
                            const r = await resetStaffPassword(u.id);
                            if (r.password) setIssued({ email: u.email, password: r.password });
                            else setNotice(r.message);
                            router.refresh();
                          });
                        }}
                        className="btn-outline btn-sm"
                      >
                        비번 초기화
                      </button>
                      <button
                        onClick={() =>
                          start(async () => {
                            const r = await toggleStaffActive(u.id, u.status !== 'ACTIVE');
                            setNotice(r.message);
                            router.refresh();
                          })
                        }
                        className="btn-outline btn-sm"
                      >
                        {u.status === 'ACTIVE' ? '중지' : '재개'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {(creating || editing) && (
            <StaffForm
              key={editing?.id ?? 'new'}
              editing={editing}
              action={editing ? updateAction : createAction}
              state={editing ? updateState : createState}
              pending={editing ? updatePending : creatingPending}
              onClose={() => {
                setCreating(false);
                setEditing(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function StaffForm({
  editing,
  action,
  state,
  pending,
  onClose,
}: {
  editing: StaffRow | null;
  action: (fd: FormData) => void;
  state: Res;
  pending: boolean;
  onClose: () => void;
}) {
  const [role, setRole] = useState<Role>((editing?.role as Role) ?? 'STAFF');
  const [perms, setPerms] = useState<Permission[]>(
    editing ? permissionsOf(editing) : ROLE_PRESET.STAFF
  );

  function changeRole(r: Role) {
    setRole(r);
    setPerms(ROLE_PRESET[r]); // 역할을 바꾸면 기본 권한으로 리셋
  }

  return (
    <form action={action} className="card h-fit p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-bold">{editing ? '직원 정보 수정' : '직원 계정 만들기'}</h2>
        <button type="button" onClick={onClose} className="text-xs text-gim-400 hover:text-sea-700">
          닫기
        </button>
      </div>

      {editing && <input type="hidden" name="id" value={editing.id} />}
      <input type="hidden" name="role" value={role} />

      <div className="space-y-4">
        <div>
          <label className="label">이름 *</label>
          <input name="name" required defaultValue={editing?.name} className="input" />
        </div>

        {!editing && (
          <div>
            <label className="label">이메일 (로그인 아이디) *</label>
            <input
              name="email"
              type="email"
              required
              placeholder="staff@ujgim.co.kr"
              className="input"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">연락처</label>
            <input name="phone" defaultValue={editing?.phone} className="input" />
          </div>
          <div>
            <label className="label">직책</label>
            <input
              name="position"
              defaultValue={editing?.position}
              placeholder="물류팀장"
              className="input"
            />
          </div>
        </div>

        {!editing && (
          <div>
            <label className="label">초기 비밀번호</label>
            <input
              name="password"
              type="text"
              minLength={8}
              placeholder="비우면 자동 생성됩니다"
              className="input font-mono text-sm"
            />
          </div>
        )}

        <div>
          <label className="label">역할 *</label>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <label
                key={r}
                className={cn(
                  'flex cursor-pointer gap-3 rounded-lg border p-3.5 transition',
                  role === r ? 'border-sea-600 bg-sea-50' : 'border-gim-200 hover:bg-gim-50'
                )}
              >
                <input
                  type="radio"
                  checked={role === r}
                  onChange={() => changeRole(r)}
                  className="mt-0.5 h-4 w-4 accent-sea-700"
                />
                <span>
                  <span className="block text-sm font-semibold text-gim-900">{ROLE_LABEL[r]}</span>
                  <span className="mt-0.5 block text-[11px] leading-5 text-gim-500">
                    {ROLE_DESC[r]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">볼 수 있는 메뉴</label>
          <p className="mb-2 text-[11px] text-gim-400">
            역할을 고르면 기본값이 채워집니다. 필요하면 개별로 켜고 끄세요.
          </p>
          <div className="space-y-1.5 rounded-lg bg-gim-50 p-4">
            {PERMISSIONS.map((p) => (
              <label key={p} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`perm_${p}`}
                  checked={perms.includes(p)}
                  onChange={(e) =>
                    setPerms((prev) =>
                      e.target.checked ? [...prev, p] : prev.filter((x) => x !== p)
                    )
                  }
                  className="mt-0.5 h-4 w-4 accent-sea-700"
                />
                <span>
                  {PERMISSION_LABEL[p]}
                  {PERMISSION_NOTE[p] && (
                    <span className="ml-1.5 text-[11px] text-point">{PERMISSION_NOTE[p]}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">메모</label>
          <input name="memo" defaultValue={editing?.memo} className="input" />
        </div>
      </div>

      {state.message && (
        <p
          className={cn(
            'mt-4 rounded-lg px-4 py-2.5 text-sm leading-6',
            state.ok ? 'bg-sea-50 text-sea-800' : 'bg-red-50 text-red-700'
          )}
        >
          {state.message}
        </p>
      )}

      <button disabled={pending} className="btn-primary mt-5 w-full">
        {pending ? '저장 중…' : editing ? '저장' : '계정 만들기'}
      </button>
    </form>
  );
}
