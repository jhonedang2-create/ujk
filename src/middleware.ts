import NextAuth from 'next-auth';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { authConfig } from '@/auth.config';

// The event parameter selects the middleware overload, not the route-handler overload.
// Auth.js still evaluates authConfig.authorized before invoking this function.
const authMiddleware = NextAuth(authConfig).auth(
  (_request: NextRequest, _event: NextFetchEvent) => NextResponse.next()
);

export function middleware(request: NextRequest, event: NextFetchEvent) {
  return authMiddleware(request, event);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|uploads).*)'],
};
