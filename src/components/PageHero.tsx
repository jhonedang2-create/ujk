import Link from 'next/link';

export default function PageHero({
  title,
  subtitle,
  breadcrumb = [],
}: {
  title: string;
  subtitle?: string;
  breadcrumb?: [string, string][];
}) {
  return (
    <section className="border-b border-gim-100 bg-gradient-to-b from-sea-950 to-sea-800 py-14 text-white sm:py-20">
      <div className="container-x">
        <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-sea-200">
          <Link href="/" className="hover:text-white">홈</Link>
          {breadcrumb.map(([label, href]) => (
            <span key={href} className="flex items-center gap-1.5">
              <span>/</span>
              <Link href={href} className="hover:text-white">{label}</Link>
            </span>
          ))}
        </nav>
        <h1 className="text-3xl font-black sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-sm leading-6 text-sea-100 sm:text-base">{subtitle}</p>}
      </div>
    </section>
  );
}
