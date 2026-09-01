import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { authConfig } from '@/auth.config';
import {
  canAccessAdmin,
  can,
  PERMISSION_LABEL,
  type Permission,
} from '@/lib/permissions';
import { clientKey, rateLimit } from '@/lib/rate-limit';

const credentialsSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    Credentials({
      name: '직원·관리자 로그인',
      credentials: {
        identifier: { label: '아이디 또는 이메일', type: 'text' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(raw, request) {
        const limited = rateLimit(`login:${clientKey(request.headers)}`, 10, 15 * 60 * 1000);
        if (!limited.ok) return null;
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { loginId: parsed.data.identifier },
              { email: parsed.data.identifier.toLowerCase() },
            ],
          },
        });
        if (!user?.password) return null;
        if (user.status === 'BANNED') return null;

        const ok = await bcrypt.compare(parsed.data.password, user.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    async jwt({ token, user, trigger }) {
      if (user?.id) token.uid = user.id;

      // 최신 권한을 다시 읽어, 계정 차단이나 권한 회수가 바로 먹히게 합니다.
      //
      // 참고: 이 콜백은 Edge 미들웨어에서는 돌지 않습니다(auth.config 에 jwt 콜백이 없음).
      // 서버 컴포넌트/서버 액션에서 auth() 를 부를 때 실행되며, RSC 에서는 쿠키를 다시
      // 굽지 못해 checkedAt 이 보존되지 않습니다. 즉 관리자 화면 렌더마다 한 번 조회됩니다.
      // 권한 회수는 레이아웃의 auth() 에서 걸러지므로 안전합니다.
      const STALE_MS = 60_000;
      const fresh =
        typeof token.checkedAt === 'number' && Date.now() - token.checkedAt < STALE_MS;

      if (token.uid && (trigger === 'signIn' || trigger === 'update' || !token.role || !fresh)) {
        let db = null;
        try {
          db = await prisma.user.findUnique({
            where: { id: token.uid as string },
            select: {
              role: true,
              name: true,
              image: true,
              status: true,
              point: true,
              grade: true,
              permissions: true,
            },
          });
        } catch {
          // DB 일시 장애로 전원이 로그아웃되면 안 됩니다.
          // 기존 클레임을 유지하고 다음 요청에서 다시 시도합니다. (checkedAt 을 갱신하지 않음)
          return token;
        }

        token.checkedAt = Date.now();

        if (!db || db.status === 'BANNED') {
          // 차단되었거나 삭제된 계정 — 모든 권한을 즉시 회수합니다
          token.role = 'USER';
          token.permissions = 'none';
          token.status = 'BANNED';
        } else {
          token.role = db.role;
          token.name = db.name;
          token.picture = db.image;
          token.point = db.point;
          token.grade = db.grade;
          token.permissions = db.permissions;
          token.status = db.status;
        }
      }
      return token;
    },

    // session 콜백은 auth.config.ts 에 정의되어 있습니다.
    // (미들웨어에서도 role 이 필요하므로 공용 설정에 둡니다)
  },
  events: {
    /**
     * 로그인 직후: 최근 로그인 기록 + 가입 경로 저장 + 비회원 장바구니 이관.
     *
     * signIn '콜백'이 아니라 '이벤트'에서 처리합니다.
     * 콜백은 계정이 만들어지기 전에 돌아서 최초 소셜 로그인 때 update 가 실패합니다.
     * 이벤트는 생성 이후에 돌고 user.id 가 항상 있어서, 이메일이 없는 카카오 계정도 잡힙니다.
     */
    async signIn({ user, account }) {
      if (user?.id) {
        await prisma.user
          .update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              ...(account && account.provider !== 'credentials'
                ? { provider: account.provider }
                : {}),
            },
          })
          .catch(() => null);
        const { mergeGuestCart } = await import('@/actions/cart');
        await mergeGuestCart(user.id).catch(() => null);
      }
    },

    async createUser({ user }) {
      // 소셜 가입 회원 웰컴 포인트
      if (user.id) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: {
              point: 3000,
              termsAgreedAt: new Date(),
              privacyAgreedAt: new Date(),
              termsVersion: '2026-09-01',
              privacyVersion: '2026-09-01',
            },
          }),
          prisma.pointLog.create({
            data: { userId: user.id, amount: 3000, balance: 3000, reason: '신규 가입 축하 적립금' },
          }),
        ]).catch(() => null);
      }
    },
  },
});

/**
 * 서버 컴포넌트/액션에서 관리자 여부 확인.
 * 기존 호출부 호환을 위해 이름은 그대로 두되, 실제로는 '관리자 페이지 접근 가능'을 뜻합니다.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user)) {
    throw new Error('관리자 권한이 필요합니다.');
  }
  return session;
}

/** 특정 기능 권한이 있는지 확인 (없으면 예외) */
export async function requirePermission(perm: Permission) {
  const session = await auth();
  if (!session?.user || !can(session.user, perm)) {
    throw new Error(`이 작업에는 '${PERMISSION_LABEL[perm]}' 권한이 필요합니다.`);
  }
  return session;
}

/** 최고관리자 전용 (직원 계정·API 키 등) */
export async function requireOwner() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('최고관리자만 할 수 있는 작업입니다.');
  }
  return session;
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error('로그인이 필요합니다.');
  return session;
}
