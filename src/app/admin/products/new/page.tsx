import { guardPage } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import ProductForm from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  await guardPage('products');

  const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">상품 등록</h1>
      <ProductForm
        categories={categories}
        data={{
          name: '', slug: '', categoryId: '', summary: '', description: '',
          price: 0, listPrice: 0, cost: 0, stock: 0, sku: '',
          origin: '국내산', maker: '(주)대천우정김', unit: '', weight: 0,
          isActive: true, isFeatured: false, isBest: false, isNew: true,
          foodType: '', ingredients: '', allergyInfo: '',
          storageInfo: '직사광선을 피해 서늘한 곳에 보관',
          expiryInfo: '', nutritionInfo: '', sourceUrl: '',
          imageUrls: [], options: [],
        }}
      />
    </div>
  );
}
