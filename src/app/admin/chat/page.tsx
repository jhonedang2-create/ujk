import { guardPage } from '@/lib/guard';
import AdminChat from '@/components/admin/AdminChat';

export const metadata = { title: '실시간 상담' };

export default async function AdminChatPage() {
  await guardPage('chat');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">실시간 상담</h1>
        <p className="mt-1 text-sm text-gim-500">
          홈페이지 우측 하단 채팅으로 들어온 문의입니다. 답장하면 고객 화면에 3초 안에 표시됩니다.
        </p>
      </div>
      <AdminChat />
    </div>
  );
}
