import Link from 'next/link';
import { won, discountRate } from '@/lib/utils';

export type ProductCardData = {
  slug: string;
  name: string;
  summary: string;
  price: number;
  listPrice: number;
  stock: number;
  isBest?: boolean;
  isNew?: boolean;
  images: { url: string; alt: string }[];
};

export default function ProductCard({ p }: { p: ProductCardData }) {
  const img = p.images[0]?.url;
  const rate = discountRate(p.price, p.listPrice);
  const soldOut = p.stock <= 0;

  return (
    <Link href={`/products/${p.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-gim-50">
        {img ? (
          // 외부 벤더 이미지도 그대로 쓸 수 있도록 <img> 사용
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={p.images[0]?.alt || p.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gim-300">
            이미지 준비중
          </div>
        )}

        <div className="absolute left-3 top-3 flex gap-1.5">
          {p.isBest && <span className="badge bg-point text-white">BEST</span>}
          {p.isNew && <span className="badge bg-sea-700 text-white">NEW</span>}
        </div>

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-sm font-bold text-white">품절</span>
          </div>
        )}
      </div>

      <div className="mt-3.5">
        <p className="line-clamp-1 text-[15px] font-semibold text-gim-900 group-hover:text-sea-700">
          {p.name}
        </p>
        <p className="mt-1 line-clamp-1 text-xs text-gim-500">{p.summary}</p>
        <p className="mt-2 flex items-baseline gap-2">
          {rate > 0 && <span className="text-sm font-bold text-point">{rate}%</span>}
          <span className="text-lg font-bold text-gim-900">{won(p.price)}</span>
          {rate > 0 && (
            <span className="text-xs text-gim-400 line-through">{won(p.listPrice)}</span>
          )}
        </p>
      </div>
    </Link>
  );
}
