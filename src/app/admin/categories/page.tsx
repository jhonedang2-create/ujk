import { guardPage } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import CategoryManager from '@/components/admin/CategoryManager';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  await guardPage('categories');

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">카테고리 관리</h1>
      <CategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          parentId: c.parentId ?? '',
          description: c.description,
          sortOrder: c.sortOrder,
          isActive: c.isActive,
          productCount: c._count.products,
        }))}
      />
    </div>
  );
}
