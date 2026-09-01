'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function ProductGallery({
  images,
  name,
}: {
  images: { id: string; url: string; alt: string }[];
  name: string;
}) {
  const [idx, setIdx] = useState(0);
  const main = images[idx];

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-xl bg-gim-50">
        {main ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={main.url} alt={main.alt || name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gim-300">
            이미지 준비중
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((im, i) => (
            <button
              key={im.id}
              onClick={() => setIdx(i)}
              className={cn(
                'aspect-square overflow-hidden rounded-lg border-2',
                i === idx ? 'border-sea-700' : 'border-transparent opacity-70 hover:opacity-100'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt={im.alt || name} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
