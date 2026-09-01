import { guardPage } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { fmtDate } from '@/lib/utils';
import { INQUIRY_TYPE } from '@/lib/site';
import InquiryList from '@/components/admin/InquiryList';

export const dynamic = 'force-dynamic';

export default async function AdminInquiriesPage() {
  await guardPage('inquiries');

  const inquiries = await prisma.inquiry.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">
        문의 관리{' '}
        <span className="text-sm font-normal text-gim-400">
          (미답변 {inquiries.filter((i) => i.status === 'OPEN').length}건)
        </span>
      </h1>

      <p className="rounded-xl border border-gim-200 bg-white p-4 text-xs leading-6 text-gim-500">
        홈페이지 <strong>문의하기</strong> 폼으로 들어온 내용입니다.
        우측 하단 채팅으로 들어온 실시간 상담은 <a href="/admin/chat" className="text-sea-700 underline">실시간 상담</a> 메뉴에서 확인하세요.
      </p>

      <InquiryList
        items={inquiries.map((i) => ({
          id: i.id,
          type: INQUIRY_TYPE[i.type] ?? i.type,
          name: i.name,
          phone: i.phone,
          email: i.email,
          company: i.company,
          title: i.title,
          content: i.content,
          status: i.status,
          answer: i.answer,
          createdAt: fmtDate(i.createdAt, true),
        }))}
      />
    </div>
  );
}
