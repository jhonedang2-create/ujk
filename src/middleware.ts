import NextAuth from 'next-auth';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { authConfig } from '@/auth.config';

// Auth.js evaluates authConfig.authorized before invoking this wrapper.
const authMiddleware = NextAuth(authConfig).auth(() => NextResponse.next());

// Explicit export for Next 16 static analysis; preserve Edge/OpenNext compatibility.
export function middleware(request: NextRequest, event: NextFetchEvent) {
  return authMiddleware(request, event);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|uploads).*)'],
};
