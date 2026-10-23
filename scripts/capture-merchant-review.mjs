import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON || import.meta.url);
const { chromium } = require('playwright');
const base = new URL(process.env.REVIEW_BASE_URL || 'http://127.0.0.1:3000');
if (!['woojeonggim.com', '127.0.0.1', 'localhost'].includes(base.hostname)) throw new Error('Unexpected review origin');
const out = 'review-artifacts';
await fs.mkdir(out, { recursive: true });
const manifest = { origin: base.origin, environment: base.hostname === 'woojeonggim.com' ? 'production' : 'ci-preview-not-for-submission', capturedAt: new Date().toISOString(), commit: process.env.GITHUB_SHA || 'unknown', createdOrders: 0, paymentsExecuted: 0, checks: {}, files: [], notes: [] };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ko-KR' });
const page = await context.newPage();
page.on('dialog', (d) => d.dismiss());
// Absolute safety boundary: never submit checkout, orders or payment API calls.
await context.route('**/*', (route) => {
  const req = route.request(), u = new URL(req.url());
  if (req.method() !== 'GET' && req.method() !== 'HEAD' && (/^\/(?:checkout|api\/payments|api\/v1\/orders)(?:\/|$)/).test(u.pathname)) return route.abort('blockedbyclient');
  return route.continue();
});
async function capture(name) {
  await page.screenshot({ path: path.join(out, name), fullPage: true });
  manifest.files.push({ name, url: page.url() });
}
try {
  await page.goto(base.origin + '/products', { waitUntil: 'networkidle', timeout: 60000 });
  await capture('01-products.png');
  const product = page.locator('a[href^="/products/"]').first();
  await product.click(); await page.waitForLoadState('networkidle');
  manifest.checks.productVisible = await page.locator('h1').count() > 0;
  await capture('02-product-detail.png');
  const cart = page.getByRole('button', { name: /장바구니/ }).first();
  if (await cart.count()) {
    await cart.click(); await page.waitForTimeout(800);
    await page.goto(base.origin + '/cart', { waitUntil: 'networkidle' }); await capture('03-cart.png');
    await page.goto(base.origin + '/checkout', { waitUntil: 'networkidle' });
    manifest.checks.guestCheckout = new URL(page.url()).pathname === '/checkout' && await page.locator('[name="ordererName"]').count() > 0;
    await capture('04-guest-checkout.png');
    if (manifest.checks.guestCheckout) {
      await page.locator('[name="ordererName"]').fill('심사확인');
      await page.locator('[name="ordererPhone"]').fill('01000000000');
      // This is UI inspection only; no customer's data or account is used.
      try {
        const popupPromise = page.waitForEvent('popup', { timeout: 15000 });
        await page.getByRole('button', { name: '주소 검색', exact: true }).click();
        const popup = await popupPromise;
        await popup.waitForLoadState('domcontentloaded');
        const contexts = [popup, ...popup.frames().filter((f) => f !== popup.mainFrame())];
        let searched = false;
        for (const frame of contexts) {
          const input = frame.locator('input[type="text"], input[type="search"]').first();
          if (await input.isVisible().catch(() => false)) { await input.fill('보령시 황골길 42'); await input.press('Enter'); searched = true; break; }
        }
        if (searched) {
          await popup.waitForTimeout(1500);
          for (const frame of [popup, ...popup.frames().filter((f) => f !== popup.mainFrame())]) {
            const match = frame.getByText(/황골길 42/).first();
            if (await match.isVisible().catch(() => false)) { await match.click(); break; }
          }
        }
      } catch { manifest.notes.push('주소 검색 팝업 자동 검증 미완료. 수동 검증 필요.'); }
      manifest.checks.postcodeSelected = !!await page.locator('[name="address1"]').inputValue();
      if (await page.locator('[name="agreeTerms"]').count()) {
        await page.locator('[name="agreeTerms"]').check(); await page.locator('[name="agreePrivacy"]').check();
      }
      await capture('05-order-fields.png');
      const review = page.getByRole('button', { name: /주문 내용 확인/ });
      if (manifest.checks.postcodeSelected && await review.count()) {
        await review.click(); await page.waitForTimeout(300);
        manifest.checks.finalReview = await page.getByRole('dialog').isVisible();
        if (manifest.checks.finalReview) await capture('06-final-review-no-submit.png');
        await page.keyboard.press('Escape');
      } else manifest.checks.finalReview = false;
    }
  } else manifest.notes.push('장바구니 버튼을 확인하지 못했습니다.');
  for (const [url, file] of [['/policy/terms', '07-terms.png'], ['/policy/shipping', '08-shipping-returns.png'], ['/policy/privacy', '09-privacy.png']]) {
    const res = await page.goto(base.origin + url, { waitUntil: 'networkidle' });
    manifest.checks[url] = res?.status() === 200; await capture(file);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base.origin + '/products', { waitUntil: 'networkidle' }); await capture('10-mobile-products.png');
  manifest.checks.mobileNoHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
} catch (e) { manifest.notes.push('검사 중단: ' + String(e).slice(0, 400)); }
finally {
  await browser.close();
  await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(out, 'README.txt'), `촬영환경: ${manifest.environment}\n주소: ${manifest.origin}\n결제 및 실제 주문 생성: 실행하지 않음\nCI 미리보기 자료는 실제 운영본 제출자료를 대체하지 않습니다.\nmanifest.json의 성공/미확인 항목을 확인하세요.\n`);
  console.log(JSON.stringify(manifest, null, 2));
}
