import NextAuth from 'next-auth';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { authConfig } from '@/auth.config';

const authMiddleware = NextAuth(authConfig).auth;

// Explicit function export is required by Next 16 static analysis.
// Keep the Edge middleware compatible with OpenNext rather than moving to Node proxy.
export function middleware(request: NextRequest, event: NextFetchEvent) {
  return authMiddleware(request, event);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|uploads).*)'],
};
