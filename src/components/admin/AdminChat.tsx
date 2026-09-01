'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Room = {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  topic: string;
  unreadAdmin: number;
  lastMessage: string;
  lastMessageAt: string;
  entryPath: string;
  createdAt: string;
};

type Msg = {
  id: string;
  sender: 'USER' | 'ADMIN' | 'BOT';
  content: string;
  createdAt: string;
};

const TEMPLATES = [
  ['배송 안내', '결제 확인 후 순차 발송합니다. 정확한 출고 일정은 주문번호와 함께 문의해 주세요. 송장번호는 발송 처리 후 주문내역에서 확인할 수 있습니다.'],
  ['입금 안내', '무통장입금 계좌는 주문완료 화면과 주문내역에서 확인하실 수 있습니다. 입금 확인 후 바로 발송해 드리겠습니다.'],
  ['대량구매', '대량구매 문의 감사합니다. 필요하신 수량과 납기를 알려주시면 견적서를 보내드리겠습니다.'],
  ['부재 안내', '문의 주셔서 감사합니다. 담당자가 확인한 뒤 순서대로 답변드리겠습니다.'],
  ['마무리', '더 궁금하신 점 있으시면 언제든 말씀해 주세요. 좋은 하루 보내세요! 😊'],
];

export default function AdminChat() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [sending, setSending] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const lastAt = useRef<string | null>(null);

  const post = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/admin/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }, []);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => {
      const el = bodyRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const refreshRooms = useCallback(async () => {
    const json = await post({ action: 'rooms' }).catch(() => null);
    if (json?.ok) setRooms(json.rooms);
  }, [post]);

  // 방 목록 폴링 (4초)
  useEffect(() => {
    let alive = true;
    async function tick() {
      const json = await post({ action: 'rooms' }).catch(() => null);
      if (alive && json?.ok) setRooms(json.rooms);
      if (alive) timer = setTimeout(tick, 4000);
    }
    let timer = setTimeout(tick, 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [post]);

  // 활성 방 메시지 폴링 (2.5초) — after 이후만 받아 트래픽 최소화
  useEffect(() => {
    if (!activeId) return;
    let alive = true;
    lastAt.current = null;
    setMessages([]);

    async function tick() {
      const json = await post({
        action: 'messages',
        roomId: activeId,
        after: lastAt.current,
      }).catch(() => null);

      if (alive && json?.ok && json.messages?.length) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m: Msg) => m.id));
          const next = [...prev, ...json.messages.filter((m: Msg) => !seen.has(m.id))];
          next.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          if (next.length) lastAt.current = next[next.length - 1].createdAt;
          return next;
        });
        scrollDown();
      }
      if (alive) timer = setTimeout(tick, 2500);
    }

    let timer = setTimeout(tick, 0);
    post({ action: 'read', roomId: activeId });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [activeId, post, scrollDown]);

  const active = rooms.find((r) => r.id === activeId);
  const shown = rooms.filter((r) =>
    filter === 'ALL' ? true : filter === 'OPEN' ? r.status !== 'CLOSED' : r.status === 'CLOSED'
  );
  const totalUnread = rooms.reduce((s, r) => s + r.unreadAdmin, 0);

  async function send(content: string) {
    const body = content.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    setText('');

    // 낙관적 렌더링 후, 서버가 돌려준 실제 메시지로 교체합니다.
    // (교체하지 않으면 폴링이 같은 메시지를 한 번 더 붙여서 두 번 보입니다)
    const tempId = `tmp_${Date.now()}`;
    setMessages((p) => [
      ...p,
      { id: tempId, sender: 'ADMIN', content: body, createdAt: new Date().toISOString() },
    ]);
    scrollDown();

    const json = await post({ action: 'send', roomId: activeId, content: body }).catch(() => null);

    if (json?.ok && json.message) {
      const real: Msg = json.message;
      // 임시 말풍선과, 폴링이 먼저 붙였을 수도 있는 실제 메시지를 함께 제거한 뒤 하나만 남깁니다
      setMessages((p) =>
        [...p.filter((m) => m.id !== tempId && m.id !== real.id), real].sort((x, y) =>
          x.createdAt.localeCompare(y.createdAt)
        )
      );
      // 폴링이 방금 저장한 메시지를 다시 가져오지 않도록 커서를 옮깁니다
      if (!lastAt.current || real.createdAt > lastAt.current) lastAt.current = real.createdAt;
    } else {
      // 전송 실패 시 임시 말풍선 제거
      setMessages((p) => p.filter((m) => m.id !== tempId));
    }

    setSending(false);
    refreshRooms();
  }

  return (
    <div className="grid h-[calc(100vh-220px)] min-h-[520px] grid-cols-1 gap-4 lg:grid-cols-[300px_1fr_260px]">
      {/* 상담 목록 */}
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gim-100 bg-white">
        <div className="flex shrink-0 items-center gap-1 border-b border-gim-100 p-2">
          {(['ALL', 'OPEN', 'CLOSED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 rounded-lg px-2 py-2 text-xs font-semibold',
                filter === f ? 'bg-sea-800 text-white' : 'text-gim-500 hover:bg-gim-50'
              )}
            >
              {f === 'ALL' ? `전체 ${totalUnread > 0 ? `(${totalUnread})` : ''}` : f === 'OPEN' ? '진행중' : '종료'}
            </button>
          ))}
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-gim-100 overflow-y-auto">
          {shown.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setActiveId(r.id)}
                className={cn(
                  'w-full px-4 py-3.5 text-left transition',
                  activeId === r.id ? 'bg-sea-50' : 'hover:bg-gim-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-gim-900">{r.name}</span>
                  {r.status === 'CLOSED' && (
                    <span className="badge bg-gim-100 text-gim-500">종료</span>
                  )}
                  {r.unreadAdmin > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-point px-1.5 text-[11px] font-bold text-white">
                      {r.unreadAdmin}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-gim-500">
                  {r.lastMessage || r.topic || '(메시지 없음)'}
                </p>
                <p className="mt-0.5 text-[10px] text-gim-400">{relTime(r.lastMessageAt)}</p>
              </button>
            </li>
          ))}
          {shown.length === 0 && (
            <li className="px-4 py-16 text-center text-sm text-gim-400">상담 내역이 없습니다.</li>
          )}
        </ul>
      </aside>

      {/* 대화 */}
      <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gim-100 bg-white">
        {!active ? (
          <div className="flex flex-1 items-center justify-center text-sm text-gim-400">
            왼쪽에서 상담을 선택하세요.
          </div>
        ) : (
          <>
            <header className="flex shrink-0 items-center gap-3 border-b border-gim-100 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gim-900">{active.name}</p>
                <p className="text-[11px] text-gim-400">
                  {active.phone || '연락처 미입력'} · 유입 {active.entryPath || '/'}
                </p>
              </div>
              <button
                onClick={async () => {
                  await post({
                    action: 'status',
                    roomId: active.id,
                    status: active.status === 'CLOSED' ? 'OPEN' : 'CLOSED',
                  });
                  await refreshRooms();
                }}
                className="btn-outline btn-sm"
              >
                {active.status === 'CLOSED' ? '상담 재개' : '상담 종료'}
              </button>
            </header>

            <div ref={bodyRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gim-50 px-5 py-4">
              {messages.map((m) => (
                <div key={m.id} className={cn('flex', m.sender === 'ADMIN' && 'justify-end')}>
                  <div className="max-w-[70%]">
                    <p
                      className={cn(
                        'mb-1 text-[11px] font-medium',
                        m.sender === 'ADMIN' ? 'text-right text-sea-700' : 'text-gim-500'
                      )}
                    >
                      {m.sender === 'USER' ? active.name : m.sender === 'ADMIN' ? '나(상담원)' : '자동안내'}
                    </p>
                    <div
                      className={cn(
                        'whitespace-pre-wrap break-words px-4 py-2.5 text-[13px] leading-6 shadow-sm',
                        m.sender === 'ADMIN'
                          ? 'rounded-2xl rounded-br-md bg-sea-800 text-white'
                          : m.sender === 'BOT'
                            ? 'rounded-2xl rounded-bl-md border border-gim-200 bg-white text-gim-500'
                            : 'rounded-2xl rounded-bl-md bg-white text-gim-800'
                      )}
                    >
                      {m.content}
                    </div>
                    <p
                      className={cn(
                        'mt-1 text-[10px] text-gim-400',
                        m.sender === 'ADMIN' && 'text-right'
                      )}
                    >
                      {new Date(m.createdAt).toLocaleString('ko-KR', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(text);
              }}
              className="shrink-0 border-t border-gim-100 p-3"
            >
              <div className="mb-2 flex flex-wrap gap-1.5">
                {TEMPLATES.map(([label, body]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setText(body)}
                    className="rounded-full border border-gim-200 px-2.5 py-1 text-[11px] text-gim-600 hover:bg-gim-50"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(text);
                    }
                  }}
                  rows={2}
                  placeholder="답장을 입력하세요. (Enter 전송 / Shift+Enter 줄바꿈)"
                  className="input flex-1 resize-none py-2.5 text-sm"
                />
                <button
                  disabled={!text.trim() || sending}
                  className="btn-primary h-[62px] shrink-0 px-6"
                >
                  전송
                </button>
              </div>
            </form>
          </>
        )}
      </section>

      {/* 고객 정보 */}
      <aside className="hidden min-h-0 flex-col overflow-y-auto rounded-2xl border border-gim-100 bg-white p-5 lg:flex">
        <h3 className="text-sm font-bold text-gim-900">고객 정보</h3>
        {!active ? (
          <p className="mt-4 text-xs text-gim-400">상담을 선택하면 표시됩니다.</p>
        ) : (
          <form
            key={active.id}
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await post({
                action: 'memo',
                roomId: active.id,
                name: fd.get('name'),
                phone: fd.get('phone'),
                email: fd.get('email'),
              });
            }}
            className="mt-4 space-y-3"
          >
            <div>
              <label className="label text-xs">이름</label>
              <input name="name" defaultValue={active.name} className="input py-2 text-sm" />
            </div>
            <div>
              <label className="label text-xs">연락처</label>
              <input name="phone" defaultValue={active.phone} className="input py-2 text-sm" />
            </div>
            <div>
              <label className="label text-xs">이메일</label>
              <input name="email" defaultValue={active.email} className="input py-2 text-sm" />
            </div>
            <button className="btn-outline btn-sm w-full">저장</button>

            <dl className="space-y-2 border-t border-gim-100 pt-4 text-xs">
              <div className="flex justify-between">
                <dt className="text-gim-400">첫 문의</dt>
                <dd className="text-gim-700">
                  {new Date(active.createdAt).toLocaleDateString('ko-KR')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gim-400">유입 경로</dt>
                <dd className="truncate text-gim-700">{active.entryPath || '/'}</dd>
              </div>
            </dl>

            {active.phone && (
              <a href={`tel:${active.phone}`} className="btn-outline btn-sm w-full">
                전화 걸기
              </a>
            )}
          </form>
        )}
      </aside>
    </div>
  );
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}
