import type { NextAuthConfig } from 'next-auth';
import { canAccessAdmin, permissionForPath, can } from '@/lib/permissions';
import type { Provider } from 'next-auth/providers';
import Naver from 'next-auth/providers/naver';
import Kakao from 'next-auth/providers/kakao';

/** .env 에 키가 채워진 소셜 로그인만 활성화합니다. */
export const socialEnabled = {
  naver: !!process.env.AUTH_NAVER_ID && !!process.env.AUTH_NAVER_SECRET,
  kakao: !!process.env.AUTH_KAKAO_ID && !!process.env.AUTH_KAKAO_SECRET,
};

const socialProviders: Provider[] = [];

if (socialEnabled.naver) {
  socialProviders.push(
    Naver({
      clientId: process.env.AUTH_NAVER_ID!,
      clientSecret: process.env.AUTH_NAVER_SECRET!,
    })
  );
}

if (socialEnabled.kakao) {
  socialProviders.push(
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID!,
      clientSecret: process.env.AUTH_KAKAO_SECRET!,
    })
  );
}

/**
 * Edge 런타임(미들웨어)에서도 안전한 설정.
 * Prisma / bcrypt 같은 Node 전용 모듈은 여기 두지 않습니다.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  providers: socialProviders,
  callbacks: {
    /**
     * 미들웨어(Edge)도 이 설정만 로드하므로, JWT 클레임 → 세션 투영은
     * 반드시 여기(공용 설정)에 있어야 /admin 권한 검사가 동작합니다.
     */
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? session.user.id;
        session.user.role = (token.role as string) ?? 'USER';
        session.user.point = (token.point as number) ?? 0;
        session.user.grade = (token.grade as string) ?? 'BASIC';
        session.user.permissions = (token.permissions as string) ?? '';
        session.user.status = (token.status as string) ?? 'ACTIVE';
      }
      return session;
    },

    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const u = auth?.user as { role?: string; permissions?: string; status?: string } | undefined;

      if (u?.status === 'BANNED') return false;

      if (pathname.startsWith('/admin')) {
        // 고객 로그인 화면에 내부 계정 폼을 노출하지 않고 전용 경로로 보냅니다.
        if (!isLoggedIn) {
          const target = new URL('/staff/sign-in', request.nextUrl);
          target.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`);
          return Response.redirect(target);
        }
        // 로그인은 했는데 관리자 권한이 없으면 쇼핑몰 홈으로 (로그인 화면으로 보내면 무한루프)
        if (!canAccessAdmin(u)) return Response.redirect(new URL('/', request.nextUrl));

        const need = permissionForPath(pathname);
        if (need && !can(u, need)) {
          // 권한 없는 하위 메뉴 → 대시보드로. 대시보드 자체가 막히는 일은
          // permissionsOf 가 dashboard 를 항상 포함시키므로 발생하지 않습니다.
          return Response.redirect(new URL('/admin', request.nextUrl));
        }
        return true;
      }
      if (pathname.startsWith('/mypage')) return isLoggedIn;
      return true; // 비회원 주문 허용
    },
  },
} satisfies NextAuthConfig;
