'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import SocialSetupGuide from './SocialSetupGuide';

/**
 * 회원가입 = 소셜 로그인.
 * 이메일·비밀번호 가입은 없앴습니다. (직원 계정만 관리자가 직접 발급)
 */
export default function RegisterForm({
  social,
}: {
  social: { naver: boolean; kakao: boolean };
}) {
  const hasSocial = social.naver || social.kakao;
  const [consent, setConsent] = useState(false);

  if (!hasSocial) {
    return (
      <div>
        <SocialSetupGuide />
        <p className="mt-6 text-center text-sm text-gim-500">
          직원이신가요?{' '}
          <Link href="/login" className="font-semibold text-sea-700 hover:underline">
            이메일로 로그인
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2.5">
        {social.kakao && (
          <button
            disabled={!consent}
            onClick={() => signIn('kakao', { callbackUrl: '/' })}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#FEE500] py-4 text-[15px] font-bold text-[#191600] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <KakaoIcon />
            카카오로 3초만에 가입
          </button>
        )}
        {social.naver && (
          <button
            disabled={!consent}
            onClick={() => signIn('naver', { callbackUrl: '/' })}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#03C75A] py-4 text-[15px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <NaverIcon />
            네이버로 3초만에 가입
          </button>
        )}
      </div>

      <ul className="mt-8 space-y-3">
        {[
          ['비밀번호를 따로 만들지 않아도 됩니다', '쓰던 카카오·네이버 계정 그대로 로그인합니다.'],
          ['가입 즉시 3,000원 적립금', '첫 주문부터 바로 쓰실 수 있습니다.'],
          ['구매 금액의 1% 추가 적립', '다음 주문에 현금처럼 사용됩니다.'],
          ['주문·배송 알림을 카카오톡으로', '송장이 등록되면 바로 알려드립니다.'],
        ].map(([t, d]) => (
          <li key={t} className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sea-50 text-[11px] font-bold text-sea-700">
              ✓
            </span>
            <span>
              <span className="block text-sm font-semibold text-gim-800">{t}</span>
              <span className="block text-xs leading-5 text-gim-500">{d}</span>
            </span>
          </li>
        ))}
      </ul>

      <label className="mt-8 flex cursor-pointer items-start gap-3 rounded-xl bg-gim-50 p-4 text-[11px] leading-5 text-gim-600">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-sea-700" />
        <span>
          (필수) <Link href="/policy/terms" target="_blank" className="underline">이용약관</Link>과{' '}
          <Link href="/policy/privacy" target="_blank" className="underline">개인정보 수집·이용</Link>에 동의합니다.
          마케팅 수신은 마이페이지에서 별도로 선택합니다.
        </span>
      </label>

      <p className="mt-6 text-center text-sm text-gim-500">
        이미 가입하셨나요?{' '}
        <Link href="/login" className="font-semibold text-sea-700 hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
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
