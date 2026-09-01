import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { absoluteUrl } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, posts] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.post.findMany({ where: { isActive: true }, select: { id: true, updatedAt: true } }),
  ]);

  const fixed: MetadataRoute.Sitemap = [
    ['', 1, 'daily'],
    ['/daecheon-gim', 0.9, 'weekly'],
    ['/products', 0.9, 'daily'],
    ['/about', 0.7, 'monthly'],
    ['/about/process', 0.7, 'monthly'],
    ['/about/location', 0.7, 'monthly'],
    ['/notice', 0.6, 'weekly'],
    ['/contact', 0.5, 'monthly'],
  ].map(([path, priority, changeFrequency]) => ({
    url: absoluteUrl(String(path) || '/'),
    lastModified: new Date(),
    changeFrequency: changeFrequency as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: Number(priority),
  }));

  return [
    ...fixed,
    ...products.map((p) => ({
      url: absoluteUrl(`/products/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...posts.map((p) => ({
      url: absoluteUrl(`/notice/${p.id}`),
      lastModified: p.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
