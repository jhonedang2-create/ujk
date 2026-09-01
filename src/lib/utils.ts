export function won(n: number | null | undefined) {
  return `${(n ?? 0).toLocaleString('ko-KR')}원`;
}

export function num(n: number | null | undefined) {
  return (n ?? 0).toLocaleString('ko-KR');
}

export function fmtDate(d: Date | string | null | undefined, withTime = false) {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  if (!withTime) return `${y}.${m}.${day}`;
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

export function discountRate(price: number, listPrice: number) {
  if (!listPrice || listPrice <= price) return 0;
  return Math.round(((listPrice - price) / listPrice) * 100);
}

/** 주문번호: 20260824-4자리랜덤 */
export function makeOrderNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const t = String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
  return `${ymd}-${t}${rand}`;
}

export function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60) || `item-${Date.now()}`;
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function maskName(name: string) {
  if (!name) return '';
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}
