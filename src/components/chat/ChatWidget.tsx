'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { QUICK_REPLIES, isOfficeHours } from '@/lib/chat';
import { cn } from '@/lib/utils';

type Msg = {
  id: string;
  sender: 'USER' | 'ADMIN' | 'BOT';
  content: string;
  createdAt: string;
};

const POLL_OPEN = 3000;
const POLL_CLOSED = 12000;

export default function ChatWidget({
  officeHours: initialOfficeHours,
  csHours,
  tel,
}: {
  officeHours: boolean;
  csHours: string;
  tel: string;
}) {
  const pathname = usePathname();
  // 서버 값으로 시작하고, 마운트 후 브라우저 시간 기준으로 다시 계산합니다.
  // (레이아웃이 캐시되어도 '상담 중' 표시가 틀어지지 않도록)
  const [officeHours, setOfficeHours] = useState(initialOfficeHours);
  useEffect(() => {
    const check = () => setOfficeHours(isOfficeHours());
    check();
    const t = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  const [open, setOpen] = useState(false);
  const [booted, setBooted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const [teaser, setTeaser] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const lastAt = useRef<string | null>(null);

  // 관리자 페이지에서는 위젯을 띄우지 않습니다
  const hidden = pathname?.startsWith('/admin');

  const scrollDown = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      const el = bodyRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    });
  }, []);

  const merge = useCallback((incoming: Msg[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const next = [...prev, ...incoming.filter((m) => !seen.has(m.id))];
      next.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      if (next.length) lastAt.current = next[next.length - 1].createdAt;
      return next;
    });
  }, []);

  /** 창을 처음 열 때만 방을 만듭니다 (그전에는 쿠키도 안 만듦) */
  const boot = useCallback(async () => {
    if (booted) return;
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'init', path: pathname }),
    });
    const json = await res.json();
    if (json.ok) {
      setMessages(json.messages ?? []);
      if (json.messages?.length) lastAt.current = json.messages[json.messages.length - 1].createdAt;
      setBooted(true);
      setUnread(0);
      scrollDown(false);
    }
  }, [booted, pathname, scrollDown]);

  // 헤더·구매 안내 등 사이트 어디서든 같은 상담창을 열 수 있게 합니다.
  useEffect(() => {
    const openChat = () => {
      setTeaser(false);
      setOpen(true);
      void boot();
    };
    window.addEventListener('ujgim:open-chat', openChat);
    return () => window.removeEventListener('ujgim:open-chat', openChat);
  }, [boot]);

  // 폴링 — 열려 있으면 3초, 닫혀 있으면 12초. 실시간 소켓 없이도 즉각적으로 느껴집니다.
  // 한 번도 열지 않은 방문자에게는 아예 요청을 보내지 않습니다.
  useEffect(() => {
    if (hidden || (!booted && !open)) return;
    let alive = true;

    async function tick() {
      if (!alive) return;
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'poll', after: lastAt.current, open }),
        });
        const json = await res.json();
        if (json.ok) {
          if (json.messages?.length) {
            merge(json.messages);
            if (open) scrollDown();
            else setUnread((u) => u + json.messages.filter((m: Msg) => m.sender !== 'USER').length);
          }
        }
      } catch {
        /* 네트워크 일시 오류는 조용히 넘어갑니다 */
      }
      if (alive) timer = setTimeout(tick, open ? POLL_OPEN : POLL_CLOSED);
    }

    let timer = setTimeout(tick, open ? POLL_OPEN : POLL_CLOSED);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [open, hidden, booted, merge, scrollDown]);

  // 처음 방문 12초 뒤 말풍선으로 한 번 슬쩍
  useEffect(() => {
    if (hidden) return;
    const seen = typeof window !== 'undefined' && sessionStorage.getItem('ujgim_chat_teaser');
    if (seen) return;
    const t = setTimeout(() => {
      setTeaser(true);
      try {
        sessionStorage.setItem('ujgim_chat_teaser', '1');
      } catch {
        /* 시크릿 모드 등에서 실패해도 무시 */
      }
    }, 12000);
    return () => clearTimeout(t);
  }, [hidden]);

  async function send(content: string) {
    const body = content.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');

    // 낙관적 렌더링 — 내 말풍선을 먼저 띄웁니다
    const temp: Msg = {
      id: `tmp_${Date.now()}`,
      sender: 'USER',
      content: body,
      createdAt: new Date().toISOString(),
    };
    setMessages((p) => [...p, temp]);
    scrollDown();
    setTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', content: body, path: pathname }),
      });
      const json = await res.json();
      // 입력 중 표시를 잠깐 보여준 뒤 실제 메시지로 교체 (사람처럼 보이게)
      setTimeout(() => {
        setTyping(false);
        if (json.ok) {
          setMessages(json.messages ?? []);
          if (json.messages?.length)
            lastAt.current = json.messages[json.messages.length - 1].createdAt;
        }
        scrollDown();
      }, 900);
    } catch {
      setTyping(false);
    } finally {
      setSending(false);
    }
  }

  if (hidden) return null;

  const showQuick = messages.filter((m) => m.sender === 'USER').length === 0;

  return (
    <>
      {/* 런처 */}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3 print:hidden">
        {teaser && !open && (
          <button
            onClick={() => {
              setTeaser(false);
              setOpen(true);
              boot();
            }}
            className="max-w-[240px] animate-[chatpop_.3s_ease-out] rounded-2xl rounded-br-md border border-gim-100 bg-white px-4 py-3 text-left text-[13px] leading-5 text-gim-700 shadow-xl"
          >
            <span className="font-semibold text-sea-800">궁금한 점 있으세요?</span>
            <br />
            배송·선물세트·대량구매 무엇이든 물어보세요.
          </button>
        )}

        <button
          onClick={() => {
            setTeaser(false);
            setOpen((v) => !v);
            if (!open) {
              boot();
              setUnread(0);
            }
          }}
          aria-label="상담 채팅 열기"
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-sea-800 text-white shadow-xl transition hover:bg-sea-900 active:scale-95"
        >
          {!open && officeHours && (
            <span className="absolute inset-0 animate-ping rounded-full bg-sea-600 opacity-20" />
          )}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            {open ? (
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
          {unread > 0 && !open && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-point px-1 text-[11px] font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>

      {/* 패널 */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] flex h-[min(560px,calc(100vh-140px))] w-[min(380px,calc(100vw-2.5rem))] animate-[chatpop_.22s_ease-out] flex-col overflow-hidden rounded-2xl border border-gim-200 bg-white shadow-2xl print:hidden">
          {/* 헤더 */}
          <header className="shrink-0 bg-sea-900 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-base font-black">
                禹
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">대천우정김 고객센터</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-sea-200">
                  <span
                    className={cn(
                      'inline-block h-1.5 w-1.5 rounded-full',
                      officeHours ? 'bg-green-400' : 'bg-gim-400'
                    )}
                  />
                  {officeHours ? '상담원 응대 중 · 보통 5분 내 답변' : '지금은 부재중 · 메시지 남겨주세요'}
                </p>
              </div>
              <a
                href={`tel:${tel}`}
                className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold hover:bg-white/20"
              >
                전화
              </a>
            </div>
          </header>

          {/* 본문 */}
          <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto bg-gim-50 px-4 py-4">
            {messages.map((m, i) => (
              <Bubble key={m.id} msg={m} prev={messages[i - 1]} />
            ))}

            {typing && (
              <div className="flex items-end gap-2">
                <Avatar />
                <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-gim-300"
                      style={{ animationDelay: `${d * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {showQuick && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full border border-sea-200 bg-white px-3 py-1.5 text-[12px] text-sea-800 transition hover:bg-sea-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 입력 */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
            className="shrink-0 border-t border-gim-100 bg-white p-3"
          >
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
                rows={1}
                placeholder="메시지를 입력하세요…"
                className="max-h-24 min-h-[42px] flex-1 resize-none rounded-xl border border-gim-200 px-3.5 py-2.5 text-sm outline-none focus:border-sea-500"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-sea-800 text-white transition disabled:opacity-40"
                aria-label="보내기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M4 12l16-8-6 8 6 8-16-8z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-gim-400">
              {officeHours ? '상담시간 내에는 상담원이 직접 답변합니다.' : csHours}
            </p>
          </form>
        </div>
      )}
    </>
  );
}

function Avatar() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sea-800 text-[11px] font-black text-white">
      禹
    </span>
  );
}

function Bubble({ msg, prev }: { msg: Msg; prev?: Msg }) {
  const mine = msg.sender === 'USER';
  const showAvatar = !mine && prev?.sender !== msg.sender;
  const time = new Date(msg.createdAt).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={cn('flex items-end gap-2', mine && 'justify-end')}>
      {!mine && (showAvatar ? <Avatar /> : <span className="w-7 shrink-0" />)}
      <div className={cn('max-w-[76%]', mine && 'items-end')}>
        {!mine && showAvatar && (
          <p className="mb-1 text-[11px] font-medium text-gim-500">
            {msg.sender === 'ADMIN' ? '상담원' : '자동안내'}
          </p>
        )}
        <div
          className={cn(
            'whitespace-pre-wrap break-words px-3.5 py-2.5 text-[13px] leading-6 shadow-sm',
            mine
              ? 'rounded-2xl rounded-br-md bg-sea-800 text-white'
              : 'rounded-2xl rounded-bl-md bg-white text-gim-800'
          )}
        >
          {msg.content}
        </div>
        <p className={cn('mt-1 text-[10px] text-gim-400', mine && 'text-right')}>{time}</p>
      </div>
    </div>
  );
}
