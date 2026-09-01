import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function Pagination({
  page,
  totalPages,
  basePath,
  query = {},
}: {
  page: number;
  totalPages: number;
  basePath: string;
  query?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => v && sp.set(k, v));
    sp.set('page', String(p));
    return `${basePath}?${sp.toString()}`;
  };

  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={href(page - 1)} className="btn-outline btn-sm">이전</Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={href(p)}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium',
            p === page ? 'bg-sea-800 text-white' : 'text-gim-600 hover:bg-gim-50'
          )}
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link href={href(page + 1)} className="btn-outline btn-sm">다음</Link>
      )}
    </nav>
  );
}
