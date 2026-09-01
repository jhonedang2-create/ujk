import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PageHero from '@/components/PageHero';
import { fmtDate } from '@/lib/utils';
import { cleanRichText } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || !post.isActive) notFound();

  await prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => null);

  return (
    <>
      <PageHero title="고객센터" breadcrumb={[['고객센터', '/notice']]} />

      <article className="container-x py-16">
        <header className="border-b-2 border-gim-800 pb-5">
          <h1 className="text-2xl font-bold leading-snug">{post.title}</h1>
          <p className="mt-3 text-xs text-gim-400">
            {fmtDate(post.createdAt)} · 조회 {post.viewCount + 1}
          </p>
        </header>

        <div
          className="prose-kr min-h-[240px] border-b border-gim-100 py-10 text-[15px]"
          dangerouslySetInnerHTML={{ __html: cleanRichText(post.content) }}
        />

        <div className="mt-8 flex justify-center">
          <Link href={`/notice?type=${post.type}`} className="btn-outline">목록으로</Link>
        </div>
      </article>
    </>
  );
}
