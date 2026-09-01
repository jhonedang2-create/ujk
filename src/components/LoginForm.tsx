'use client';

import Link from 'next/link';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import SocialSetupGuide from './SocialSetupGuide';

export default function LoginForm({
  social,
}: {
  social: { naver: boolean; kakao: boolean };
}) {
  const sp = useSearchParams();
  const rawCallback = sp.get('callbackUrl') ?? '/';
  const callbackUrl = safePath(rawCallback);
  const [socialConsent, setSocialConsent] = useState(false);
  const error = loginErrorMessage(sp.get('error'));
  const hasSocial = social.naver || social.kakao;

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {hasSocial && (
        <>
          <div className="space-y-2.5">
            {social.kakao && (
              <button
                disabled={!socialConsent}
                onClick={() => signIn('kakao', { callbackUrl })}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#FEE500] py-4 text-[15px] font-bold text-[#191600] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <KakaoIcon />
                카카오로 시작하기
              </button>
            )}
            {social.naver && (
              <button
                disabled={!socialConsent}
                onClick={() => signIn('naver', { callbackUrl })}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#03C75A] py-4 text-[15px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <NaverIcon />
                네이버로 시작하기
              </button>
            )}
          </div>

          <p className="mt-5 text-center text-xs leading-6 text-gim-500">
            처음이신가요? 위 버튼을 누르면 <strong className="text-gim-700">가입과 로그인이 한 번에</strong> 됩니다.
            <br />
            따로 아이디나 비밀번호를 만들지 않으셔도 됩니다.
          </p>
          <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-lg bg-gim-50 p-3 text-[11px] leading-5 text-gim-600">
            <input type="checkbox" checked={socialConsent} onChange={(e) => setSocialConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-sea-700" />
            <span>(필수) <Link href="/policy/terms" target="_blank" className="underline">이용약관</Link>과 <Link href="/policy/privacy" target="_blank" className="underline">개인정보 수집·이용</Link>에 동의합니다.</span>
          </label>
        </>
      )}

      {!hasSocial && <SocialSetupGuide />}
    </div>
  );
}

/** 같은 사이트 경로만 통과시킵니다 */
function safePath(raw: string) {
  try {
    const u = new URL(raw, 'http://local');
    return u.origin === 'http://local' || typeof window === 'undefined'
      ? `${u.pathname}${u.search}`
      : u.host === window.location.host
        ? `${u.pathname}${u.search}`
        : '/';
  } catch {
    return raw.startsWith('/') ? raw : '/';
  }
}

function loginErrorMessage(code: string | null) {
  if (!code) return '';
  if (code === 'OAuthAccountNotLinked') {
    return '이 이메일은 다른 방법으로 이미 가입되어 있습니다. 처음 가입할 때 쓰신 카카오 또는 네이버로 로그인해 주세요.';
  }
  if (code === 'AccessDenied') return '로그인이 취소되었거나 권한이 없습니다.';
  if (code === 'Configuration') {
    return '로그인 설정에 문제가 있습니다. 관리자에게 문의해 주세요.';
  }
  return '로그인에 실패했습니다. 다시 시도해 주세요.';
}

function KakaoIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3C6.9 3 2.8 6.2 2.8 10.2c0 2.5 1.7 4.8 4.2 6.1l-1 3.7c-.1.3.2.5.5.4l4.4-2.9c.4 0 .7.1 1.1.1 5.1 0 9.2-3.2 9.2-7.2S17.1 3 12 3z" />
    </svg>
  );
}

function NaverIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M12.2 10.6 7.6 4H4v12h3.8V9.4l4.6 6.6H16V4h-3.8v6.6z" />
    </svg>
  );
}
