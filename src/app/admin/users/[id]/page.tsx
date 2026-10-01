import Link from 'next/link';
import { notFound } from 'next/navigation';

import { guardPage } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { fmtDate, num, won } from '@/lib/utils';
import { ORDER_STATUS, USER_GRADE } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const metadata = { title: '회원 상세' };

const ROLE_LABEL: Record<string, string> = {
  USER: '일반회원',
  STAFF: '직원',
  MANAGER: '매니저',
  ADMIN: '최고관리자',
};

const PROVIDER_LABEL: Record<string, string> = {
  kakao: '카카오',
  naver: '네이버',
  credentials: '아이디·비밀번호',
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardPage('users');
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: [{ isDefault: 'desc' }, { id: 'asc' }] },
      orders: {
        include: { items: { take: 1 } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      points: { orderBy: { createdAt: 'desc' }, take: 10 },
      accessLogs: { orderBy: { createdAt: 'desc' }, take: 30 },
    },
  });
  if (!user) notFound();

  const paidStatuses = new Set(['PAID', 'PREPARING', 'SHIPPING', 'DELIVERED']);
  const paidOrders = user.orders.filter((o) => paidStatuses.has(o.status));
  const spent = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const aov = paidOrders.length ? Math.round(spent / paidOrders.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">{user.name || user.loginId || '회원'} 상세</h1>
            <span className="badge bg-sea-50 text-sea-800">{ROLE_LABEL[user.role] ?? user.role}</span>
            <span className={user.status === 'ACTIVE' ? 'badge bg-emerald-50 text-emerald-700' : 'badge bg-gim-100 text-gim-600'}>
              {user.status === 'ACTIVE' ? '정상' : user.status === 'BANNED' ? '차단' : '휴면'}
            </span>
          </div>
          <p className="mt-1 text-sm text-gim-500">
            로그인 ID {user.loginId || '-'} · 회원번호 {user.id}
          </p>
        </div>
        <Link href="/admin/users" className="btn-outline btn-sm">← 회원 목록</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5">
          <p className="text-xs text-gim-500">누적 구매액</p>
          <p className="mt-2 text-2xl font-black text-sea-800">{won(spent)}</p>
          <p className="mt-1 text-[11px] text-gim-400">결제완료 이상 {paidOrders.length}건</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gim-500">객단가</p>
          <p className="mt-2 text-2xl font-black text-sea-800">{won(aov)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gim-500">현재 적립금</p>
          <p className="mt-2 text-2xl font-black text-point">{num(user.point)}P</p>
          <p className="mt-1 text-[11px] text-gim-400">{USER_GRADE[user.grade] ?? user.grade} 등급</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gim-500">최근 접속</p>
          <p className="mt-2 text-base font-black text-gim-900">
            {user.lastAccessAt ? fmtDate(user.lastAccessAt, true) : '기록 없음'}
          </p>
          <p className="mt-1 text-[11px] text-gim-400">
            {user.lastAccessDevice || '-'} · {user.lastAccessOs || '-'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-base font-bold">회원 정보</h2>
          <dl className="mt-5 grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
            {[
              ['로그인 ID', user.loginId || '-'],
              ['이름', user.name || '-'],
              ['이메일', user.email || '-'],
              ['휴대폰', user.phone || '-'],
              ['가입 방식', PROVIDER_LABEL[user.provider ?? ''] ?? user.provider ?? '-'],
              ['회원 등급', USER_GRADE[user.grade] ?? user.grade],
              ['가입일', fmtDate(user.createdAt, true)],
              ['최근 로그인', user.lastLoginAt ? fmtDate(user.lastLoginAt, true) : '-'],
              ['마케팅 수신', user.agreeMarketing ? '동의' : '미동의'],
              ['SMS 수신', user.agreeSms ? '동의' : '미동의'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3 border-b border-gim-50 pb-2">
                <dt className="w-24 shrink-0 text-gim-400">{k}</dt>
                <dd className="min-w-0 break-all font-medium text-gim-800">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">접속 환경</h2>
              <p className="mt-1 text-xs text-gim-400">운영 배포 이후 로그인 회원 접속부터 기록됩니다.</p>
            </div>
            <span className="badge bg-gim-50 text-gim-500">90일 보관</span>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            {[
              ['최초 기록일', user.firstAccessAt ? fmtDate(user.firstAccessAt, true) : '-'],
              ['최초 기록 IP', user.firstAccessIp || '-'],
              ['최근 접속일', user.lastAccessAt ? fmtDate(user.lastAccessAt, true) : '-'],
              ['최근 IP', user.lastAccessIp || '-'],
              ['운영체제', user.lastAccessOs || '-'],
              ['브라우저', user.lastAccessBrowser || '-'],
              ['기기', user.lastAccessDevice || '-'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <dt className="w-24 shrink-0 text-gim-400">{k}</dt>
                <dd className="break-all font-medium text-gim-800">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-gim-100 px-6 py-4">
          <h2 className="text-base font-bold">최근 접속 기록</h2>
          <p className="mt-1 text-xs text-gim-400">
            동일 IP·브라우저 환경은 6시간 이내 중복 저장하지 않습니다.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gim-50 text-xs text-gim-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">접속일시</th>
                <th className="px-4 py-3 text-left font-medium">IP</th>
                <th className="px-4 py-3 text-left font-medium">환경</th>
                <th className="px-4 py-3 text-left font-medium">접속 페이지</th>
                <th className="px-4 py-3 text-left font-medium">유입 호스트</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gim-100">
              {user.accessLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(log.createdAt, true)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.ip || '-'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{log.device} · {log.os}</p>
                    <p className="text-[11px] text-gim-400">{log.browser}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gim-600">{log.path || '-'}</td>
                  <td className="px-4 py-3 text-xs text-gim-600">{log.referrerHost || '-'}</td>
                </tr>
              ))}
              {user.accessLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-gim-400">
                    아직 기록된 접속 이력이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-gim-100 px-6 py-4">
            <div>
              <h2 className="text-base font-bold">최근 주문</h2>
              <p className="mt-1 text-xs text-gim-400">최신 20건</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-gim-50 text-xs text-gim-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">주문</th>
                  <th className="px-4 py-3 text-left font-medium">지역</th>
                  <th className="px-4 py-3 text-left font-medium">유입</th>
                  <th className="px-4 py-3 text-right font-medium">금액</th>
                  <th className="px-4 py-3 text-center font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gim-100">
                {user.orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3">
                      <Link href={"/admin/orders/" + o.id} className="font-semibold text-sea-800 hover:underline">
                        {o.orderNo}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-gim-400">{fmtDate(o.createdAt, true)}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{[o.region1, o.region2].filter(Boolean).join(' ') || '-'}</td>
                    <td className="px-4 py-3 text-xs">{o.trafficSource || '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{won(o.totalAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="badge bg-gim-50 text-gim-700">{ORDER_STATUS[o.status] ?? o.status}</span>
                    </td>
                  </tr>
                ))}
                {user.orders.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-sm text-gim-400">주문 내역이 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-base font-bold">배송지</h2>
            <div className="mt-4 space-y-4">
              {user.addresses.map((a) => (
                <div key={a.id} className="rounded-xl bg-gim-50 p-4 text-sm">
                  <p className="font-bold">{a.label}{a.isDefault ? ' · 기본' : ''}</p>
                  <p className="mt-1 text-gim-600">{a.receiver} · {a.phone}</p>
                  <p className="mt-1 text-xs leading-5 text-gim-500">[{a.zipcode}] {a.address1} {a.address2}</p>
                </div>
              ))}
              {user.addresses.length === 0 && <p className="text-sm text-gim-400">저장된 배송지가 없습니다.</p>}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-base font-bold">최근 적립금 내역</h2>
            <ul className="mt-4 divide-y divide-gim-100">
              {user.points.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-gim-700">{p.reason}</p>
                    <p className="text-[11px] text-gim-400">{fmtDate(p.createdAt, true)}</p>
                  </div>
                  <span className={p.amount >= 0 ? 'font-bold text-sea-700' : 'font-bold text-point'}>
                    {p.amount >= 0 ? '+' : ''}{num(p.amount)}P
                  </span>
                </li>
              ))}
              {user.points.length === 0 && <li className="py-8 text-center text-sm text-gim-400">적립금 내역이 없습니다.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
