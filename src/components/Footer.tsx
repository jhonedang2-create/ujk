import Link from 'next/link';
import { SITE } from '@/lib/site';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-gim-100 bg-gim-50">
      <div className="container-x py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="text-lg font-black text-sea-900">{SITE.name}</p>
            <p className="mt-3 text-sm leading-6 text-gim-600">{SITE.tagline}</p>
            <div className="mt-4 space-y-1 text-xs leading-5 text-gim-500">
              <p>주소 : {SITE.address}</p>
              <p>대표 : {SITE.ceo} &nbsp;|&nbsp; 사업자등록번호 : {SITE.bizNo}</p>
              <p>통신판매업신고 : {SITE.mailOrderNo}</p>
              <p>개인정보보호책임자 : {SITE.privacyOfficer}</p>
              <p>TEL : {SITE.tel} &nbsp;|&nbsp; FAX : {SITE.fax} &nbsp;|&nbsp; E-MAIL : {SITE.email}</p>
            </div>
          </div>

          <FooterCol
            title="회사소개"
            links={[
              ['기업개요', '/about'],
              ['연혁', '/about/history'],
              ['생산공정', '/about/process'],
              ['등록·인증현황', '/about/certification'],
              ['오시는길', '/about/location'],
            ]}
          />
          <FooterCol
            title="쇼핑"
            links={[
              ['전체상품', '/products'],
              ['선물세트', '/products?category=gift-set'],
              ['장바구니', '/cart'],
              ['주문조회', '/mypage/orders'],
            ]}
          />
          <FooterCol
            title="고객센터"
            links={[
              ['공지사항', '/notice'],
              ['문의하기', '/contact'],
              ['이용약관', '/policy/terms'],
              ['개인정보처리방침', '/policy/privacy'],
            ]}
          />
        </div>

        <div className="mt-10 rounded-xl border border-gim-200 bg-white p-5">
          <p className="text-sm font-bold text-gim-800">고객센터 {SITE.tel}</p>
          <p className="mt-1 text-xs text-gim-500">{SITE.csHours}</p>
          {SITE.bank.account && (
            <p className="mt-3 text-xs text-gim-500">
              무통장입금 : {SITE.bank.name} {SITE.bank.account} (예금주 : {SITE.bank.holder})
            </p>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-gim-400">
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="mb-3 text-sm font-bold text-gim-900">{title}</p>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-sm text-gim-600 hover:text-sea-700">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
