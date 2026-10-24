import Link from 'next/link';
import { requireOwner } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getDeliveryPolicy } from '@/lib/messaging/delivery-policy';
import MessageDeliveryControls from '@/components/admin/MessageDeliveryControls';

export const dynamic = 'force-dynamic';
export const metadata = { title: '카카오페이·알림톡 연동', robots: { index: false, follow: false } };

export default async function IntegrationControlsPage() {
  await requireOwner();
  const [policy, setting, templates] = await Promise.all([
    getDeliveryPolicy(), prisma.messageSetting.findUnique({ where: { id: 'default' } }),
    prisma.messageTemplate.findMany({ where: { code: { in: ['ORDER_PAID', 'SHIPPING'] } }, select: { code: true, kakaoTemplateId: true, isActive: true } }),
  ]);
  const payChecks: [string, boolean][] = [
    ['포트원 V1 가맹점 식별코드', !!process.env.NEXT_PUBLIC_PORTONE_IMP_CODE],
    ['포트원 V1 REST API Key', !!process.env.PORTONE_API_KEY],
    ['포트원 V1 REST API Secret', !!process.env.PORTONE_API_SECRET],
    ['카카오페이 채널키', !!process.env.NEXT_PUBLIC_PORTONE_KAKAOPAY_CHANNEL_KEY],
  ];
  const messageChecks: [string, boolean][] = [
    ['SOLAPI API Key · Secret', !!(setting?.apiKey && setting?.apiSecret)],
    ['발신번호', !!setting?.senderNumber], ['SOLAPI 카카오 채널 ID', !!setting?.pfId],
    ['결제완료 템플릿 ID', templates.some((t) => t.code === 'ORDER_PAID' && t.isActive && !!t.kakaoTemplateId)],
    ['배송시작 템플릿 ID', templates.some((t) => t.code === 'SHIPPING' && t.isActive && !!t.kakaoTemplateId)],
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-sea-700">COMMERCE CONNECTIONS</p><h1 className="mt-2 text-2xl font-bold">카카오페이·알림톡 연동</h1><p className="mt-2 text-sm text-gim-500">카카오 로그인과 결제·주문 알림은 별도 서비스입니다.</p></div><Link href="/admin/messages" className="btn-outline btn-sm">← 알림톡·문자 관리</Link></div>
      <div className="grid gap-5 lg:grid-cols-2">
        {([['카카오페이 결제', payChecks], ['주문·배송 알림톡', messageChecks]] as [string, [string, boolean][]][]).map(([title, rows]) => <section key={title} className="card p-6"><h2 className="text-base font-bold">{title}</h2><dl className="mt-4 divide-y divide-gim-100">{rows.map(([label, ready]) => <div key={label} className="flex items-center justify-between gap-3 py-3 text-sm"><dt>{label}</dt><dd className={ready ? 'text-sea-700' : 'text-amber-700'}>{ready ? '값 등록됨' : '등록 필요'}</dd></div>)}</dl><p className="mt-4 text-xs leading-5 text-gim-500">등록 여부만 표시합니다. 올바른 키인지, 가맹점·템플릿이 승인됐는지, 실제 결제·수신이 성공했는지는 별도 검증이 필요합니다.</p></section>)}
      </div>
      <MessageDeliveryControls policy={policy} initialEvents={{ autoOnPaid: setting?.autoOnPaid ?? true, autoOnDeposit: setting?.autoOnDeposit ?? false, autoOnShipping: setting?.autoOnShipping ?? true, autoOnDelivered: setting?.autoOnDelivered ?? false, autoOnCancelled: setting?.autoOnCancelled ?? false }} />
      <section className="card p-6"><h2 className="text-base font-bold">연결 순서</h2><div className="mt-4 space-y-4 text-sm leading-7 text-gim-600"><p><strong>카카오페이:</strong> 우정김 사업자로 포트원 가입·가맹점 심사 → 기존 사이트와 같은 V1 채널 등록 → Cloudflare에 인증정보 등록 → 테스트 환경에서 검증 → 운영 채널로 실결제·취소 확인 후 공개.</p><pre className="overflow-x-auto rounded-xl bg-gim-50 p-4 text-xs leading-6">{'NEXT_PUBLIC_PORTONE_IMP_CODE\nPORTONE_API_KEY (Secret)\nPORTONE_API_SECRET (Secret)\nNEXT_PUBLIC_PORTONE_KAKAOPAY_CHANNEL_KEY'}</pre><p>카카오 로그인 키를 위 항목에 재사용하지 마세요. 키·시크릿은 채팅, 소스코드, 공개 저장소에 올리지 마세요. 기존 V1 결제 코드에 V2 인증정보를 혼용하지 않습니다.</p><p><strong>알림톡:</strong> SOLAPI 가입 → 회사 비즈니스 채널 연결·발신번호 등록 → 결제완료·배송시작 템플릿 검수 → 기존 발송 설정과 주문 자동알림 탭에 발급값 등록 → 이 화면에서 발송 허용.</p><p>채널 ID는 카카오 Developers 앱 번호가 아닙니다. 관리자 문구 수정만으로 카카오 템플릿이 승인되지는 않습니다. 실패 시 문자 전환을 원하지 않으면 <strong>알림톡만</strong>을 유지하세요.</p></div></section>
    </div>
  );
}
