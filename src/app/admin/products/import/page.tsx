import { guardPage } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import VendorImport from '@/components/admin/VendorImport';

export const dynamic = 'force-dynamic';
export const metadata = { title: '벤더 상품 일괄 등록' };

export default async function ImportPage() {
  await guardPage('products');

  const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">벤더 상품 일괄 등록</h1>
        <p className="mt-1 text-sm text-gim-500">
          다나와·쿠팡·스마트스토어 등에 이미 올려둔 자사 상품 주소를 붙여넣으면
          이미지와 상품명·가격을 가져와 상품 초안을 만들어 드립니다.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <p className="font-bold">저작권 확인은 필수입니다</p>
        <p className="mt-1">
          자사가 직접 촬영했거나 사용 권한을 가진 이미지에만 사용하세요. 오픈마켓이나 대행사가
          제작한 상세페이지·연출컷은 무단 사용 시 저작권 분쟁이 생길 수 있습니다.
          가져온 이미지는 <strong>판매중지 상태의 초안</strong>으로 저장되니, 검토 후 판매중으로 바꿔주세요.
        </p>
      </div>

      <VendorImport categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
