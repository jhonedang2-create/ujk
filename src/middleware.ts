import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // 정적 파일·이미지 제외한 전체 경로에 적용
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|uploads).*)'],
};
