'use server';

import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireOwner, auth } from '@/auth';
import {
  PERMISSIONS,
  ROLE_PRESET,
  NO_PERMISSION,
  type Permission,
  type Role,
} from '@/lib/permissions';
import { normalizePhone } from '@/lib/messaging/solapi';

export type Res = { ok: boolean; message: string; password?: string };

const s = (fd: FormData, k: string, def = '') => String(fd.get(k) ?? def).trim();

async function log(action: string, target: string, detail = '') {
  const session = await auth();
  await prisma.adminLog
    .create({
      data: {
        userId: session?.user?.id ?? '',
        userName: session?.user?.name ?? '',
        action,
        target: target.slice(0, 200),
        detail: detail.slice(0, 500),
      },
    })
    .catch(() => null);
}

/** 읽기 쉬운 임시 비밀번호 (혼동되는 문자 제외) */
function tempPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(14);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('') + '!';
}

function pickPermissions(fd: FormData, role: Role): string {
  const checked = PERMISSIONS.filter((p) => fd.get(`perm_${p}`) === 'on');
  const preset = ROLE_PRESET[role] ?? [];

  // 하나도 안 고른 경우 — 빈 문자열로 저장하면 '지정 안 함'이 되어
  // 역할 기본 권한이 되살아납니다. 표식을 넣어 진짜 0개로 만듭니다.
  if (checked.length === 0) return NO_PERMISSION;

  // 역할 기본값과 똑같으면 빈 값으로 저장 → 나중에 역할 정책이 바뀌면 자동 반영
  const same =
    checked.length === preset.length && checked.every((p) => preset.includes(p as Permission));
  return same ? '' : checked.join(',');
}

/* ── 직원 계정 만들기 ── */

export async function createStaff(_prev: Res, fd: FormData): Promise<Res> {
  await requireOwner();

  const email = s(fd, 'email').toLowerCase();
  const name = s(fd, 'name');
  const role = s(fd, 'role', 'STAFF') as Role;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: '이메일 형식이 올바르지 않습니다.' };
  }
  if (!name) return { ok: false, message: '이름을 입력해 주세요.' };
  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(role)) {
    return { ok: false, message: '역할을 선택해 주세요.' };
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return {
      ok: false,
      message:
        exists.role === 'USER'
          ? '이미 일반회원으로 가입된 이메일입니다. 회원 관리에서 역할을 바꿔주세요.'
          : '이미 등록된 직원 계정입니다.',
    };
  }

  const password = s(fd, 'password') || tempPassword();
  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^\w]/.test(password)) {
    return { ok: false, message: '비밀번호는 12자 이상이며 영문 대·소문자, 숫자, 특수문자를 포함해야 합니다.' };
  }

  const session = await auth();

  await prisma.user.create({
    data: {
      email,
      name,
      password: await bcrypt.hash(password, 10),
      phone: s(fd, 'phone'),
      phoneNorm: normalizePhone(s(fd, 'phone')),
      role,
      position: s(fd, 'position'),
      memo: s(fd, 'memo'),
      permissions: pickPermissions(fd, role),
      provider: 'credentials',
      createdById: session?.user?.id ?? null,
    },
  });

  await log('STAFF_CREATE', email, `${role} / ${name}`);
  revalidatePath('/admin/staff');

  return {
    ok: true,
    message: '직원 계정이 만들어졌습니다. 아래 비밀번호를 본인에게 전달하세요.',
    password,
  };
}

/* ── 수정 ── */

export async function updateStaff(_prev: Res, fd: FormData): Promise<Res> {
  await requireOwner();

  const id = s(fd, 'id');
  if (!id) return { ok: false, message: '대상이 없습니다.' };

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { ok: false, message: '계정을 찾을 수 없습니다.' };

  const session = await auth();
  const roleRaw = s(fd, 'role', target.role);
  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(roleRaw)) {
    return { ok: false, message: '역할 값이 올바르지 않습니다.' };
  }
  const role = roleRaw as Role;

  // 자기 자신의 최고관리자 권한은 못 내립니다 (관리자가 0명이 되는 사고 방지)
  if (target.id === session?.user?.id && target.role === 'ADMIN' && role !== 'ADMIN') {
    return { ok: false, message: '본인의 최고관리자 권한은 내릴 수 없습니다.' };
  }

  if (target.role === 'ADMIN' && role !== 'ADMIN') {
    const admins = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (admins <= 1) {
      return { ok: false, message: '최고관리자가 최소 1명은 있어야 합니다.' };
    }
  }

  await prisma.user.update({
    where: { id },
    data: {
      name: s(fd, 'name', target.name ?? ''),
      phone: s(fd, 'phone'),
      phoneNorm: normalizePhone(s(fd, 'phone')),
      position: s(fd, 'position'),
      memo: s(fd, 'memo'),
      role,
      permissions: pickPermissions(fd, role),
    },
  });

  await log('STAFF_UPDATE', target.email ?? id, role);
  revalidatePath('/admin/staff');
  return { ok: true, message: '저장되었습니다. (본인이 다시 로그인하면 권한이 적용됩니다)' };
}

/* ── 비밀번호 초기화 ── */

export async function resetStaffPassword(id: string): Promise<Res> {
  await requireOwner();
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { ok: false, message: '계정을 찾을 수 없습니다.' };

  const password = tempPassword();
  await prisma.user.update({
    where: { id },
    data: { password: await bcrypt.hash(password, 10) },
  });

  await log('STAFF_RESET_PW', target.email ?? id);
  revalidatePath('/admin/staff');
  return { ok: true, message: '새 비밀번호가 발급되었습니다.', password };
}

/* ── 사용 중지 / 재개 ── */

export async function toggleStaffActive(id: string, active: boolean): Promise<Res> {
  await requireOwner();

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { ok: false, message: '계정을 찾을 수 없습니다.' };

  const session = await auth();
  if (target.id === session?.user?.id && !active) {
    return { ok: false, message: '본인 계정은 중지할 수 없습니다.' };
  }

  if (!active && target.role === 'ADMIN') {
    const admins = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (admins <= 1) return { ok: false, message: '최고관리자가 최소 1명은 있어야 합니다.' };
  }

  await prisma.user.update({
    where: { id },
    data: { status: active ? 'ACTIVE' : 'BANNED' },
  });

  await log(active ? 'STAFF_ENABLE' : 'STAFF_DISABLE', target.email ?? id);
  revalidatePath('/admin/staff');
  return { ok: true, message: active ? '계정을 다시 사용합니다.' : '계정 사용을 중지했습니다.' };
}
