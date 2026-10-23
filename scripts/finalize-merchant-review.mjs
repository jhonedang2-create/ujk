import fs from 'node:fs';
function edit(path, from, to) {
  const source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (source.split(from).length !== 2) throw new Error(`Unexpected source anchor in ${path}`);
  fs.writeFileSync(path, source.replace(from, to));
}
// Next 15 is outside the adapter's supported window. Keep the established webpack build,
// upgrade to supported Next 16, and retain all compatibility/security gates.
edit('scripts/build-cloudflare.mjs', "['--no-install', 'next', 'build']", "['--no-install', 'next', 'build', '--webpack']");
edit('scripts/build.mjs', "[path.join(root, 'node_modules/next/dist/bin/next'), 'build']", "[path.join(root, 'node_modules/next/dist/bin/next'), 'build', '--webpack']");
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.engines.node = '>=22.0.0';
pkg.scripts['build:postgres'] = 'prisma generate --schema prisma/postgresql/schema.prisma && next build --webpack';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
const form = 'src/components/CheckoutForm.tsx';
edit(form, "import OrderReviewDialog from '@/components/OrderReviewDialog';", "import OrderReviewDialog from '@/components/OrderReviewDialog';\nimport { reviewInputError } from '@/lib/checkout-review-rules';");
edit(form, "  const [sameAsOrderer, setSameAsOrderer] = useState(!address);", "  const [sameAsOrderer, setSameAsOrderer] = useState(!address);\n  const [manualAddress, setManualAddress] = useState(false);");
edit(form, "      setError('주소 검색 스크립트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');", "      setManualAddress(true);\n      setError('주소 검색을 불러오지 못했습니다. 우편번호와 기본주소를 직접 입력할 수 있습니다.');");
edit(form, '                  readOnly\n                    placeholder="우편번호"', '                  readOnly={!manualAddress}\n                    onChange={(e) => setAddr({ ...addr, zipcode: e.target.value.replace(/\\D/g, "").slice(0, 5) })}\n                    inputMode="numeric"\n                    maxLength={5}\n                    aria-label="우편번호"\n                    placeholder="우편번호"');
edit(form, '                  readOnly\n                  placeholder="기본 주소"', '                  readOnly={!manualAddress}\n                  onChange={(e) => setAddr({ ...addr, address1: e.target.value })}\n                  maxLength={150}\n                  aria-label="기본 주소"\n                  placeholder="기본 주소"');
edit(form, '                    주소 검색\n                  </button>', '                    주소 검색\n                  </button>\n                  <button type="button" onClick={() => setManualAddress(!manualAddress)} className="btn-outline btn-sm px-4" aria-pressed={manualAddress}>{manualAddress ? "검색 입력으로" : "직접 입력"}</button>');
edit(form, "    setReviewFields(Object.fromEntries([...new FormData(e.currentTarget)].map(([key, value]) => [key, String(value)])));", "    const fields = Object.fromEntries([...new FormData(e.currentTarget)].map(([key, value]) => [key, String(value)]));\n    const validation = reviewInputError(fields);\n    if (validation) { setError(validation); return; }\n    setReviewFields(fields);");
// A bank transfer is not an SDK redirect. Payment controls never create an order during review.
edit(form, "{pending ? '처리 중…' : `${won(total)} 주문 내용 확인`}", "{pending ? '처리 중…' : `${won(total)} 주문 내용 확인`}");
const order = 'src/actions/order.ts';
edit(order, "  zipcode: z.string().trim().min(3, '우편번호를 입력해 주세요.').max(10),", "  zipcode: z.string().trim().regex(/^\\d{5}$/, '5자리 우편번호를 입력해 주세요.'),");
edit('src/app/admin/merchant-review/page.tsx', "import MerchantReviewForm from '@/components/admin/MerchantReviewForm';", "import MerchantReviewForm from '@/components/admin/MerchantReviewForm';\nimport MerchantSubmissionPack from '@/components/admin/MerchantSubmissionPack';");
edit('src/app/admin/merchant-review/page.tsx', '    <MerchantReviewForm key={policy.revision} policy={policy} />', '    <MerchantReviewForm key={policy.revision} policy={policy} />\n    <MerchantSubmissionPack policy={policy} site={{ name: SITE.name, ceo: SITE.ceo, bizNo: SITE.bizNo, address: SITE.address, tel: SITE.tel, email: SITE.email }} />');
console.log('Final review integration prepared without runtime DB access or payment activation.');
