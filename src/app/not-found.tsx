import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <p className="text-6xl font-black text-sea-200">404</p>
      <h1 className="mt-6 text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="mt-3 text-sm text-gim-500">
        주소가 변경되었거나 삭제된 페이지일 수 있습니다.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn-primary">홈으로</Link>
        <Link href="/products" className="btn-outline">제품 보기</Link>
      </div>
    </div>
  );
}
