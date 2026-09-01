import { guardPage } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { fmtDate } from '@/lib/utils';
import PostManager from '@/components/admin/PostManager';

export const dynamic = 'force-dynamic';

export default async function AdminPostsPage() {
  await guardPage('content');

  const posts = await prisma.post.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">공지사항 / FAQ 관리</h1>
      <PostManager
        posts={posts.map((p) => ({
          id: p.id,
          type: p.type,
          title: p.title,
          content: p.content,
          isPinned: p.isPinned,
          isActive: p.isActive,
          createdAt: fmtDate(p.createdAt),
        }))}
      />
    </div>
  );
}
