import { guardPage } from '@/lib/guard';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProductForm from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await guardPage('products');
  const { id } = await params;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        options: { orderBy: { sortOrder: 'asc' } },
      },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">상품 수정</h1>
      <ProductForm
        categories={categories}
        data={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          categoryId: product.categoryId,
          summary: product.summary,
          description: product.description,
          price: product.price,
          listPrice: product.listPrice,
          cost: product.cost,
          stock: product.stock,
          sku: product.sku ?? '',
          origin: product.origin,
          maker: product.maker,
          unit: product.unit,
          weight: product.weight,
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          isBest: product.isBest,
          isNew: product.isNew,
          foodType: product.foodType,
          ingredients: product.ingredients,
          allergyInfo: product.allergyInfo,
          storageInfo: product.storageInfo,
          expiryInfo: product.expiryInfo,
          nutritionInfo: product.nutritionInfo,
          sourceUrl: product.sourceUrl ?? '',
          imageUrls: product.images.map((i) => i.url),
          options: product.options.map((o) => `${o.name}|${o.value}|${o.extraPrice}|${o.stock}`),
        }}
      />
    </div>
  );
}
