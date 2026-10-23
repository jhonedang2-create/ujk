import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON || import.meta.url);
const { chromium } = require('playwright');
const base = new URL(process.env.REVIEW_BASE_URL || 'http://127.0.0.1:3000');
if (!['woojeonggim.com', '127.0.0.1', 'localhost'].includes(base.hostname)) throw new Error('Unexpected origin');
const out = process.env.REVIEW_OUTPUT_DIR || 'review-artifacts';
await fs.mkdir(out, { recursive: true });
const manifest = { origin: base.origin, environment: base.hostname === 'woojeonggim.com' ? 'production' : 'ci-preview-not-for-submission', capturedAt: new Date().toISOString(), commit: process.env.GITHUB_SHA || 'unknown', submittedOrders: 0, paymentsExecuted: 0, blockedSubmissions: 0, checks: {}, files: [], notes: [] };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ko-KR' });
const page = await context.newPage();
await context.route('**/*', (route) => {
  const req = route.request(), u = new URL(req.url());
  if (req.method() !== 'GET' && req.method() !== 'HEAD' && /^\/(checkout|api\/payments|api\/v1\/orders)(\/|$)/.test(u.pathname)) { manifest.blockedSubmissions++; return route.abort('blockedbyclient'); }
  return route.continue();
});
page.on('dialog', (d) => d.dismiss());
const badResponses = [];
page.on('response', (r) => { if (r.url().startsWith(base.origin) && r.status() >= 500) badResponses.push({ url: new URL(r.url()).pathname, status: r.status() }); });
async function capture(name, fullPage = true) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, name), fullPage, type: 'jpeg', quality: 88 });
  manifest.files.push({ name, url: page.url() });
}
async function go(p) { const r = await page.goto(base.origin + p, { waitUntil: 'networkidle', timeout: 60000 }); if (!r || r.status() >= 400) throw new Error('Page failed: ' + p); }
let failure;
try {
  await go('/products'); await capture('01-products.jpg');
  await page.locator('a[href^="/products/"]').first().click(); await page.waitForLoadState('networkidle');
  manifest.checks.productVisible = await page.locator('h1').isVisible(); await capture('02-product-detail.jpg');
  await page.getByRole('button', { name: /장바구니/ }).first().click(); await page.waitForTimeout(800);
  await go('/cart'); await capture('03-cart.jpg');
  await go('/checkout');
  manifest.checks.guestCheckout = new URL(page.url()).pathname === '/checkout' && await page.locator('[name="ordererName"]').isVisible();
  if (!manifest.checks.guestCheckout) throw new Error('Guest checkout unavailable');
  await capture('04-guest-checkout.jpg');
  await page.locator('[name="ordererName"]').fill('심사확인');
  await page.locator('[name="ordererPhone"]').fill('01000000000');
  // Use the actual supported manual-address UI. Do not mutate DOM or fake a postcode callback.
  await page.getByRole('button', { name: '직접 입력', exact: true }).click();
  await page.locator('[name="zipcode"]').fill('33491');
  await page.locator('[name="address1"]').fill('충청남도 보령시 황골길 42');
  await page.locator('[name="address2"]').fill('검수용 입력 · 주문하지 않음');
  await page.locator('[name="agreeTerms"]').check(); await page.locator('[name="agreePrivacy"]').check();
  manifest.checks.manualAddress = true;
  await capture('05-order-fields.jpg');
  await page.getByRole('button', { name: /주문 내용 확인/ }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  manifest.checks.finalReview = true;
  await capture('06-final-review-no-submit.jpg', false);
  await page.keyboard.press('Escape');
  manifest.checks.reviewCloses = !await page.getByRole('dialog').isVisible();
  for (const [p, file] of [['/policy/terms', '07-terms.jpg'], ['/policy/shipping', '08-shipping-returns.jpg'], ['/policy/privacy', '09-privacy.jpg']]) { await go(p); manifest.checks[p] = true; await capture(file); }
  await go('/'); await page.locator('footer').scrollIntoViewIfNeeded(); await capture('10-business-footer.jpg', false);
  await page.setViewportSize({ width: 390, height: 844 });
  await go('/checkout'); await capture('11-mobile-checkout.jpg');
  manifest.checks.mobileNoHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  manifest.checks.noServerErrors = badResponses.length === 0;
  manifest.checks.noSubmitRequests = manifest.blockedSubmissions === 0;
  if (!manifest.checks.mobileNoHorizontalOverflow || !manifest.checks.noSubmitRequests || !manifest.checks.noServerErrors) throw new Error('UI safety or layout regression');
} catch (e) { failure = e; manifest.notes.push(String(e).slice(0, 500)); }
finally {
  await browser.close();
  manifest.notes.push('주소 검색 외부 서비스와 실제 결제/주문 접수는 이 검사에서 검증하지 않음. 직접 주소 입력과 최종 확인 UI만 검사.');
  await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(out, 'README.txt'), `환경: ${manifest.environment}\n원본 주소: ${manifest.origin}\n실제 결제·주문 접수 실행 안 함.\n미리보기 이미지는 운영 제출자료를 대체하지 않습니다. 운영 배포 및 정책 확정 후 다시 캡처하세요.\n`);
  console.log(JSON.stringify(manifest, null, 2));
}
if (failure) throw failure;
