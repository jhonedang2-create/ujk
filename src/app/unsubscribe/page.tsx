import { prisma } from '@/lib/prisma';
import PageHero from '@/components/PageHero';
import UnsubscribeForm from '@/components/UnsubscribeForm';
import { SITE } from '@/lib/site';

export const metadata = { title: '광고 수신거부' };
export const dynamic = 'force-dynamic';

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const sp = await searchParams;

  // 링크에 토큰이 있으면 번호를 미리 채워줍니다
  let prefill = '';
  if (sp.t) {
    const row = await prisma.optOutToken.findUnique({ where: { token: sp.t } });
    if (row) prefill = row.phone;
  }

  return (
    <>
      <PageHero
        title="광고 수신거부"
        subtitle="번호를 입력하시면 앞으로 광고성 문자를 보내지 않습니다. 수수료는 들지 않습니다."
        breadcrumb={[['광고 수신거부', '/unsubscribe']]}
      />

      <section className="container-x max-w-lg py-16">
        <UnsubscribeForm prefill={prefill} />

        <div className="mt-8 space-y-3 rounded-xl bg-gim-50 p-6 text-xs leading-6 text-gim-600">
          <p>
            <strong className="text-gim-800">주문·배송 안내는 계속 발송됩니다.</strong> 결제완료,
            발송 안내 같은 거래 관련 정보는 수신거부 대상이 아닙니다. 이 페이지는 할인·이벤트 등
            광고성 문자에만 적용됩니다.
          </p>
          <p>
            처리는 즉시 반영되며, 별도 비용이 발생하지 않습니다.
            (정보통신망법 제50조제4항·제6항)
          </p>
          <p>
            문의 : {SITE.nameShort} {SITE.tel} · {SITE.email}
          </p>
        </div>
      </section>
    </>
  );
}
