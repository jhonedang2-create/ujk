import { guardPage } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import BannerManager from '@/components/admin/BannerManager';

export const dynamic = 'force-dynamic';

export default async function AdminBannersPage() {
  await guardPage('content');

  const banners = await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">배너 관리</h1>
        <p className="mt-1 text-sm text-gim-500">
          MAIN 위치의 첫 번째 배너가 메인 페이지 대문(히어로)으로 사용됩니다.
        </p>
      </div>
      <BannerManager
        banners={banners.map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle,
          imageUrl: b.imageUrl,
          linkUrl: b.linkUrl,
          position: b.position,
          sortOrder: b.sortOrder,
          isActive: b.isActive,
        }))}
      />
    </div>
  );
}
