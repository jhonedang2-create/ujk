import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      point: number;
      grade: string;
      permissions: string;
      status: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    role?: string;
    point?: number;
    grade?: string;
    permissions?: string;
    status?: string;
    checkedAt?: number;
  }
}
