import { SITE } from '@/lib/site';
import PageHero from '@/components/PageHero';
import ContactForm from '@/components/ContactForm';

export const metadata = { title: '문의하기' };

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;

  return (
    <>
      <PageHero
        title="문의하기"
        subtitle="제품·주문·대량구매·제휴 등 무엇이든 문의해 주세요. 담당자가 확인 후 연락드립니다."
        breadcrumb={[['고객센터', '/notice'], ['문의하기', '/contact']]}
      />

      <section className="container-x py-16">
        <div className="grid gap-10 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-5">
            <div className="card p-6">
              <p className="text-sm font-bold text-gim-900">고객센터</p>
              <p className="mt-2 text-2xl font-black text-sea-800">{SITE.tel}</p>
              <p className="mt-2 text-xs leading-5 text-gim-500">{SITE.csHours}</p>
            </div>
            <div className="card p-6 text-sm leading-6 text-gim-600">
              <p className="font-bold text-gim-900">본사 · 공장</p>
              <p className="mt-2">{SITE.address}</p>
              <p className="mt-2">FAX {SITE.fax}</p>
              <p>{SITE.email}</p>
            </div>
            <div className="card bg-gim-50 p-6 text-xs leading-5 text-gim-500">
              <p className="mb-2 font-bold text-gim-800">개인정보 수집·이용 안내</p>
              <p>
                수집항목 : 이름, 연락처, 이메일, 문의내용<br />
                수집목적 : 문의 접수 및 답변 회신<br />
                보유기간 : 문의 처리 완료 후 3년 (관계 법령에 따름)<br />
                동의를 거부할 수 있으나, 이 경우 문의 접수가 제한됩니다.
              </p>
            </div>
          </aside>

          <ContactForm defaultType={sp.type ?? 'GENERAL'} />
        </div>
      </section>
    </>
  );
}
