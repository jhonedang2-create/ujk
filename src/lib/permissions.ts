/**
 * 관리자 권한 (RBAC)
 *
 * 역할이 기본 권한 묶음을 주고, 개별 계정에 permissions 를 직접 넣으면 그 값이 우선합니다.
 * Prisma 나 next/headers 를 import 하지 않는 순수 모듈이라 클라이언트에서도 안전합니다.
 */

export const PERMISSIONS = [
  'dashboard',
  'analytics',
  'orders',
  'channels',
  'products',
  'categories',
  'chat',
  'inquiries',
  'users',
  'messages',
  'content',
  'staff',
  'settings',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABEL: Record<Permission, string> = {
  dashboard: '대시보드',
  analytics: '매출 분석',
  orders: '주문 관리',
  channels: '판매채널 연동',
  products: '상품 관리',
  categories: '카테고리',
  chat: '실시간 상담',
  inquiries: '문의 관리',
  users: '회원 관리',
  messages: '알림톡·문자',
  content: '콘텐츠(공지·배너·연혁·글로벌)',
  staff: '직원 계정 관리',
  settings: '연동 인증정보·API 키',
};

export const PERMISSION_NOTE: Partial<Record<Permission, string>> = {
  analytics: '매출·객단가 등 경영 지표가 보입니다',
  messages: '고객에게 문자를 보낼 수 있습니다',
  staff: '다른 직원의 권한을 바꿀 수 있습니다',
  settings: '마켓 API 키를 보고 바꿀 수 있습니다',
};

export const ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'USER'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: '최고관리자',
  MANAGER: '매니저',
  STAFF: '직원',
  USER: '일반회원',
};

export const ROLE_DESC: Record<Role, string> = {
  ADMIN: '모든 기능. 직원 계정과 API 키까지 관리합니다.',
  MANAGER: '운영 전반. 직원 계정 관리와 인증정보 열람은 제외됩니다.',
  STAFF: '주문 처리와 고객 응대 위주. 매출 지표는 보이지 않습니다.',
  USER: '쇼핑몰 일반 회원 (관리자 페이지 접근 불가)',
};

/** 역할별 기본 권한 */
export const ROLE_PRESET: Record<Role, Permission[]> = {
  ADMIN: [...PERMISSIONS],
  MANAGER: [
    'dashboard',
    'analytics',
    'orders',
    'channels',
    'products',
    'categories',
    'chat',
    'inquiries',
    'users',
    'messages',
    'content',
  ],
  STAFF: ['dashboard', 'orders', 'products', 'chat', 'inquiries'],
  USER: [],
};

export type PermissionHolder = {
  role?: string | null;
  permissions?: string | null;
};

/**
 * 권한을 하나도 주지 않은 상태를 '역할 기본값'과 구분하기 위한 표식.
 * (빈 문자열로 저장하면 "지정 안 함"이 되어 역할 기본값이 살아납니다)
 */
export const NO_PERMISSION = 'none';

/** 이 계정이 실제로 가진 권한 목록 */
export function permissionsOf(u: PermissionHolder | null | undefined): Permission[] {
  if (!u?.role) return [];

  const raw = (u.permissions ?? '').trim();

  // 개별 지정이 있는 경우
  if (raw !== '') {
    if (raw === NO_PERMISSION) return [];
    const custom = raw
      .split(',')
      .map((p) => p.trim())
      .filter((p): p is Permission => (PERMISSIONS as readonly string[]).includes(p));

    return custom;
  }

  return ROLE_PRESET[(u.role as Role) in ROLE_PRESET ? (u.role as Role) : 'USER'];
}

export function can(u: PermissionHolder | null | undefined, perm: Permission): boolean {
  return permissionsOf(u).includes(perm);
}

/** 관리자 페이지에 들어올 수 있는지 (권한이 하나라도 있으면 가능) */
export function canAccessAdmin(u: PermissionHolder | null | undefined): boolean {
  return permissionsOf(u).length > 0;
}

/** 경로 → 필요한 권한 */
export const ROUTE_PERMISSION: [string, Permission][] = [
  ['/admin/analytics', 'analytics'],
  ['/admin/orders', 'orders'],
  ['/admin/channels', 'channels'],
  ['/admin/products', 'products'],
  ['/admin/categories', 'categories'],
  ['/admin/chat', 'chat'],
  ['/admin/inquiries', 'inquiries'],
  ['/admin/users', 'users'],
  ['/admin/messages', 'messages'],
  ['/admin/staff', 'staff'],
  ['/admin/posts', 'content'],
  ['/admin/banners', 'content'],
  ['/admin/history', 'content'],
  ['/admin/global', 'content'],
  // '/admin' 은 일부러 넣지 않습니다.
  // 여기에 넣으면 dashboard 권한이 없는 계정이 로그인 → 리다이렉트를 무한 반복합니다.
  // 관리자 화면 출입 자체는 canAccessAdmin() 이 판단합니다.
];

export function permissionForPath(pathname: string): Permission | null {
  const hit = ROUTE_PERMISSION.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
  return hit ? hit[1] : null;
}
