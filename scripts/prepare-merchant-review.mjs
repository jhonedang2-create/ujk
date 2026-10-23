import fs from 'node:fs';

// Bounded, repeatable source edits. Abort on an unexpected baseline instead of overwriting unrelated work.
function edit(path, from, to) {
  const source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${path}: expected one known anchor, found ${count}`);
  fs.writeFileSync(path, source.replace(from, to));
  console.log(`Updated ${path}`);
}

edit('src/lib/permissions.ts', "  ['/admin/analytics', 'analytics'],", "  ['/admin/merchant-review', 'settings'],\n  ['/admin/analytics', 'analytics'],");
edit('src/components/admin/AdminNav.tsx', "items: [['/admin/staff', '직원 계정', 'staff']],", "items: [['/admin/merchant-review', '결제 심사 준비', 'settings'], ['/admin/staff', '직원 계정', 'staff']],");
edit('src/components/admin/AdminNav.tsx', "(href !== '/admin/staff' || me.role === 'ADMIN')", "(!['/admin/staff', '/admin/merchant-review'].includes(href) || me.role === 'ADMIN')");
edit('src/components/Footer.tsx', "['이용약관', '/policy/terms'],", "['배송·교환·반품', '/policy/shipping'],\n              ['이용약관', '/policy/terms'],");

const product = 'src/app/products/[slug]/page.tsx';
edit(product, "import ProductBuyBox from '@/components/ProductBuyBox';", "import ProductBuyBox from '@/components/ProductBuyBox';\nimport CommercePolicy from '@/components/CommercePolicy';\nimport { getMerchantPolicy } from '@/lib/merchant-policy';");
edit(product, "  if (!product || !product.isActive) notFound();", "  if (!product || !product.isActive) notFound();\n  const merchantPolicy = await getMerchantPolicy();");
{
  const source = fs.readFileSync(product, 'utf8');
  const start = source.indexOf('      {/* 교환/반품 안내 */}');
  const end = source.indexOf('      {related.length > 0 && (', start);
  if (!source.includes('<CommercePolicy policy={merchantPolicy} />')) {
    if (start < 0 || end < start) throw new Error('Product shipping section anchors changed');
    fs.writeFileSync(product, source.slice(0, start) + `      {/* 실제 운영정책과 법정 청약철회 안내를 공통으로 사용합니다. */}\n      <section id="shipping-guide" className="mt-14 scroll-mt-32">\n        <h2 className="mb-5 border-b-2 border-gim-800 pb-3 text-lg font-bold">배송·교환·반품·환불 안내</h2>\n        <CommercePolicy policy={merchantPolicy} />\n      </section>\n\n` + source.slice(end));
  }
}

const checkout = 'src/app/checkout/page.tsx';
edit(checkout, "import { SITE } from '@/lib/site';", "import { SITE } from '@/lib/site';\nimport { getMerchantPolicy } from '@/lib/merchant-policy';");
edit(checkout, "  const session = await auth();", "  const session = await auth();\n  const merchantPolicy = await getMerchantPolicy();");
edit(checkout, "        <CheckoutForm\n          items={rows}", "        <CheckoutForm\n          merchantPolicy={merchantPolicy}\n          items={rows}");

const form = 'src/components/CheckoutForm.tsx';
edit(form, "import { useMemo, useState, useTransition } from 'react';", "import { useMemo, useRef, useState, useTransition } from 'react';\nimport Link from 'next/link';\nimport OrderReviewDialog from '@/components/OrderReviewDialog';\nimport CommercePolicy from '@/components/CommercePolicy';\nimport { CHECKOUT_TERMS_VERSION, type MerchantPolicy } from '@/lib/merchant-policy-rules';");
edit(form, "export default function CheckoutForm({\n  items,", "export default function CheckoutForm({\n  merchantPolicy,\n  items,");
edit(form, "}: {\n  items: Item[];", "}: {\n  merchantPolicy: MerchantPolicy;\n  items: Item[];");
edit(form, "  const router = useRouter();", "  const router = useRouter();\n  const formRef = useRef<HTMLFormElement>(null);\n  const [reviewFields, setReviewFields] = useState<Record<string, string> | null>(null);");
edit(form, "  function onSubmit(e: React.FormEvent<HTMLFormElement>) {\n    e.preventDefault();\n    setError('');\n    const fd = new FormData(e.currentTarget);", `  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!e.currentTarget.reportValidity()) return;
    setError('');
    setReviewFields(Object.fromEntries([...new FormData(e.currentTarget)].map(([key, value]) => [key, String(value)])));
  }

  function submitReviewedOrder() {
    const node = formRef.current;
    if (!node || !node.reportValidity()) return;
    const fd = new FormData(node);
    setError('');`);
edit(form, "        setError(res.message);\n        return;", "        setError(res.message);\n        setReviewFields(null);\n        return;");
edit(form, "        setError(err instanceof Error ? err.message : '결제창 호출에 실패했습니다.');", "        setError(err instanceof Error ? err.message : '결제창 호출에 실패했습니다.');\n        setReviewFields(null);");
edit(form, '      <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1fr_360px]">', '      <form ref={formRef} onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1fr_360px]">\n        <input type="hidden" name="termsVersion" value={CHECKOUT_TERMS_VERSION} />\n        <input type="hidden" name="policyRevision" value={merchantPolicy.revision} />');
const oldConsent = `            <label className="mt-5 flex items-start gap-2 text-xs leading-5 text-gim-600">
              <input type="checkbox" required className="mt-0.5 h-4 w-4 accent-sea-700" />
              <span>
                주문 내용을 확인하였으며, 결제 진행 및 개인정보 제3자 제공(배송)에 동의합니다. (필수)
              </span>
            </label>`;
const newConsent = `            <div className="mt-5 space-y-3 border-t border-gim-100 pt-4 text-xs leading-6 text-gim-600">
              <label className="flex items-start gap-2"><input type="checkbox" name="agreeTerms" value="yes" required className="mt-1 h-4 w-4 shrink-0 accent-sea-700" /><span>상품·수량·금액 및 구매조건을 확인했고 <Link href="/policy/terms" target="_blank" rel="noopener noreferrer" className="font-bold underline">이용약관</Link>과 <Link href="/policy/shipping" target="_blank" rel="noopener noreferrer" className="font-bold underline">배송·반품 안내</Link>에 동의합니다. (필수)</span></label>
              <div className="rounded-lg bg-gim-50 p-3">주문 개인정보: 주문자·수령인 이름, 연락처, 배송지 및 선택 입력한 이메일. 목적: 주문 처리·배송·결제 확인·고객 응대. 거래기록은 관련 법령에 따라 5년, 소비자 불만·분쟁 기록은 3년 보관합니다. 동의를 거부할 수 있으나 주문 처리가 제한됩니다.</div>
              <label className="flex items-start gap-2"><input type="checkbox" name="agreePrivacy" value="yes" required className="mt-1 h-4 w-4 shrink-0 accent-sea-700" /><span>주문에 필요한 개인정보 수집·이용 안내와 <Link href="/policy/privacy" target="_blank" rel="noopener noreferrer" className="font-bold underline">개인정보처리방침</Link>을 확인하고 동의합니다. (필수)</span></label>
            </div>`;
edit(form, oldConsent, newConsent);
edit(form, "{pending ? '처리 중…' : `${won(total)} 결제하기`}", "{pending ? '처리 중…' : `${won(total)} 주문 내용 확인`}");
edit(form, '      </form>\n    </>\n  );', `      </form>
      <section className="mt-10 border-t border-gim-100 pt-8"><h2 className="mb-4 text-base font-bold">배송·반품 안내</h2><CommercePolicy policy={merchantPolicy} compact /></section>
      <OrderReviewDialog
        fields={reviewFields} items={items} total={total} shippingFee={shippingFee} pointUsed={pointUsed}
        methodLabel={method === 'BANK' ? '무통장입금' : method === 'TOSS' ? '신용카드' : method === 'KAKAOPAY' ? '카카오페이' : '네이버페이'}
        paymentReady={method === 'BANK' ? !!bank.account : method === 'TOSS' ? !!tossClientKey : !!portoneCode && !!(method === 'KAKAOPAY' ? kakaoPayChannelKey : naverPayChannelKey)}
        pending={pending} onClose={() => setReviewFields(null)} onConfirm={submitReviewedOrder}
      />
    </>
  );`);
edit('src/components/OrderReviewDialog.tsx', 'w-[calc(100%-2rem)]', 'w-[calc(100%_-_2rem)]');

const order = 'src/actions/order.ts';
edit(order, "import { cookies } from 'next/headers';", "import { cookies } from 'next/headers';\nimport { getMerchantPolicy } from '@/lib/merchant-policy';\nimport { CHECKOUT_TERMS_VERSION, validateCheckoutConsent } from '@/lib/merchant-policy-rules';");
edit(order, "export async function createOrder(formData: FormData): Promise<CreateOrderResult> {", `export async function createOrder(formData: FormData): Promise<CreateOrderResult> {
  const merchantPolicy = await getMerchantPolicy();
  const consentError = validateCheckoutConsent(formData, merchantPolicy.revision);
  if (consentError) return { ok: false, message: consentError };`);
edit(order, "  const d = parsed.data;", `  const d = parsed.data;
  if (d.method === 'BANK' && !SITE.bank.account) return { ok: false, message: '입금 계좌가 아직 등록되지 않아 주문을 접수하지 않았습니다. 고객센터로 문의해 주세요.' };
  if (d.method === 'TOSS' && (!process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || !process.env.TOSS_SECRET_KEY)) return { ok: false, message: '카드결제 설정이 완료되지 않았습니다.' };
  if (d.method === 'PORTONE' && (!process.env.PORTONE_API_KEY || !process.env.PORTONE_API_SECRET || !process.env.NEXT_PUBLIC_PORTONE_IMP_CODE)) return { ok: false, message: '간편결제 설정이 완료되지 않았습니다.' };`);
edit(order, "    await tx.payment.create({", `    // Retain the version actually accepted with this order. Never store credentials here.
    await tx.siteSetting.create({ data: {
      key: 'checkout.consent.' + created.id,
      value: JSON.stringify({ acceptedAt: new Date().toISOString(), termsVersion: CHECKOUT_TERMS_VERSION, policyRevision: merchantPolicy.revision, policySnapshot: merchantPolicy, terms: true, privacy: true }),
    } });
    await tx.payment.create({`);

// Keep the policy draft review requirement visible to the owner. Do not invent processor contracts.
console.log('Merchant review integration applied. Privacy vendor/overseas-transfer review remains owner-confirmed, not auto-approved.');
