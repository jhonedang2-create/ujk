'use client';

import { useEffect, useState } from 'react';

/**
 * 소셜 로그인 키가 아직 없을 때 보여주는 설정 안내.
 * 콜백 URL 을 현재 접속 주소에서 만들어 그대로 복사할 수 있게 합니다.
 */
export default function SocialSetupGuide() {
  const [origin, setOrigin] = useState('http://localhost:3000');
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      /* 클립보드 권한이 없으면 무시 — 사용자가 직접 선택해 복사하면 됩니다 */
    }
  };

  const naverCb = `${origin}/api/auth/callback/naver`;
  const kakaoCb = `${origin}/api/auth/callback/kakao`;

  return (
    <div>
      {/* 버튼 미리보기 — 실제로 어떻게 보일지 */}
      <div className="space-y-2.5">
        <button
          disabled
          className="flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl bg-[#FEE500]/40 py-4 text-[15px] font-bold text-[#191600]/40"
        >
          <LockIcon />
          카카오로 시작하기
        </button>
        <button
          disabled
          className="flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl bg-[#03C75A]/35 py-4 text-[15px] font-bold text-white/70"
        >
          <LockIcon />
          네이버로 시작하기
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-900">
          간편 로그인은 키를 발급받아야 켜집니다
        </p>
        <p className="mt-1.5 text-xs leading-6 text-amber-800">
          카카오·네이버가 각각 발급하는 앱 키가 있어야 동작합니다. 무료이고 10분이면 끝납니다.
        </p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-3 rounded-lg bg-amber-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-800"
        >
          {open ? '안내 닫기' : '설정 방법 보기'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-5 rounded-xl border border-gim-200 bg-white p-5">
          {/* 카카오 */}
          <section>
            <p className="flex items-center gap-2 text-sm font-bold text-gim-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FEE500] text-[11px] font-black text-[#191600]">
                K
              </span>
              카카오 로그인
            </p>
            <ol className="mt-3 space-y-2 text-xs leading-6 text-gim-600">
              <li>
                1.{' '}
                <a
                  href="https://developers.kakao.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-sea-700 underline"
                >
                  developers.kakao.com
                </a>{' '}
                로그인 → <strong>내 애플리케이션 → 애플리케이션 추가하기</strong>
              </li>
              <li>2. 앱 이름 · 회사명 입력 후 저장</li>
              <li>
                3. <strong>앱 설정 → 플랫폼 → Web 플랫폼 등록</strong> 에 사이트 주소 입력
                <CopyRow value={origin} copied={copied === 'ko'} onCopy={() => copy(origin, 'ko')} />
              </li>
              <li>
                4. <strong>제품 설정 → 카카오 로그인</strong> 활성화 ON
              </li>
              <li>
                5. 같은 화면 <strong>Redirect URI</strong> 에 아래 주소 등록
                <CopyRow value={kakaoCb} copied={copied === 'kc'} onCopy={() => copy(kakaoCb, 'kc')} />
              </li>
              <li>
                6. <strong>동의항목</strong> 에서 닉네임(필수), 이메일(선택) 설정
              </li>
              <li>
                7. <strong>앱 설정 → 앱 키</strong> 의 <strong>REST API 키</strong> 복사 →{' '}
                <code className="rounded bg-gim-100 px-1">AUTH_KAKAO_ID</code>
              </li>
              <li>
                8. <strong>제품 설정 → 카카오 로그인 → 보안</strong> 에서 Client Secret 생성 후{' '}
                <strong>사용함</strong> 으로 변경 →{' '}
                <code className="rounded bg-gim-100 px-1">AUTH_KAKAO_SECRET</code>
              </li>
            </ol>
          </section>

          {/* 네이버 */}
          <section className="border-t border-gim-100 pt-5">
            <p className="flex items-center gap-2 text-sm font-bold text-gim-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#03C75A] text-[11px] font-black text-white">
                N
              </span>
              네이버 로그인
            </p>
            <ol className="mt-3 space-y-2 text-xs leading-6 text-gim-600">
              <li>
                1.{' '}
                <a
                  href="https://developers.naver.com/apps/#/register"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-sea-700 underline"
                >
                  developers.naver.com
                </a>{' '}
                → <strong>애플리케이션 등록</strong>
              </li>
              <li>
                2. 사용 API : <strong>네이버 로그인</strong> 선택 / 제공 정보 : 이름, 이메일 체크
              </li>
              <li>
                3. 환경 : <strong>PC 웹</strong> 선택 후 서비스 URL 입력
                <CopyRow value={origin} copied={copied === 'no'} onCopy={() => copy(origin, 'no')} />
              </li>
              <li>
                4. <strong>Callback URL</strong> 에 아래 주소 입력
                <CopyRow value={naverCb} copied={copied === 'nc'} onCopy={() => copy(naverCb, 'nc')} />
              </li>
              <li>
                5. 등록 후 <strong>Client ID</strong> →{' '}
                <code className="rounded bg-gim-100 px-1">AUTH_NAVER_ID</code>,{' '}
                <strong>Client Secret</strong> →{' '}
                <code className="rounded bg-gim-100 px-1">AUTH_NAVER_SECRET</code>
              </li>
            </ol>
          </section>

          {/* .env */}
          <section className="border-t border-gim-100 pt-5">
            <p className="text-sm font-bold text-gim-900">발급받은 키 넣는 곳</p>
            <p className="mt-1.5 text-xs text-gim-500">
              프로젝트 폴더의 <code className="rounded bg-gim-100 px-1">.env</code> 파일을 열어
              따옴표 안에 붙여넣으세요.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-gim-900 p-4 text-[11px] leading-6 text-gim-100">
{`AUTH_KAKAO_ID="여기에 REST API 키"
AUTH_KAKAO_SECRET="여기에 Client Secret"
AUTH_NAVER_ID="여기에 Client ID"
AUTH_NAVER_SECRET="여기에 Client Secret"`}
            </pre>

            <div className="mt-4 rounded-lg border-2 border-point/30 bg-point/5 p-4">
              <p className="text-xs font-bold text-point">⚠️ 저장한 뒤 개발 서버를 반드시 껐다 켜세요</p>
              <p className="mt-1 text-[11px] leading-5 text-gim-600">
                Next.js 는 시작할 때 한 번만 <code className="rounded bg-white px-1">.env</code> 를 읽습니다.
                켜둔 채로 저장하면 아무 변화가 없습니다.
                <br />
                터미널에서 <strong>Ctrl+C</strong> → <code className="rounded bg-white px-1">npm run dev</code>
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function CopyRow({
  value,
  copied,
  onCopy,
}: {
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <span className="mt-1.5 flex items-center gap-2 rounded-lg bg-gim-50 p-2">
      <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-gim-700">{value}</code>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 rounded-md bg-white px-2.5 py-1 text-[10px] font-bold text-gim-600 shadow-sm hover:text-sea-700"
      >
        {copied ? '복사됨' : '복사'}
      </button>
    </span>
  );
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10V7a4 4 0 118 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
