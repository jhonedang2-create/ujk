import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

// This test creates ONE clearly marked, unpaid fixture order. Never run against a deployment.
let base;
try { base = new URL(process.env.REVIEW_BASE_URL || 'http://127.0.0.1:3000'); }
catch { throw new Error('Checkout mutation tests require a valid loopback URL.'); }
const bankFixture = 'CI_TEST_ONLY_NOT_A_BANK_ACCOUNT';
if (process.env.CI !== 'true' || process.env.DATABASE_URL !== 'file:./ci.db' ||
    process.env.BANK_ACCOUNT !== bankFixture || process.env.UJK_CLOUDFLARE === 'true' ||
    base.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(base.hostname) ||
    base.username || base.password) {
  throw new Error('Checkout mutation tests require the isolated CI SQLite database, loopback server and exact test bank fixture.');
}

const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON || import.meta.url);
const { chromium } = require('playwright');
const appRequire = createRequire(import.meta.url);
const { PrismaClient } = appRequire('@prisma/client');
const out = process.env.REVIEW_OUTPUT_DIR || 'review-artifacts';
await fs.mkdir(out, { recursive: true });

const result = {
  environment: 'isolated-ci-sqlite-not-production-not-for-submission',
  origin: base.origin,
  checkedAt: new Date().toISOString(),
  status: 'running',
  paymentsExecuted: 0,
  ciTestOrdersCreated: 0,
  checkoutActionRequests: 0,
  blockedExternalRequests: 0,
  blockedPaymentRequests: 0,
  blockedOtherWrites: 0,
  checks: {},
  notes: ['This script creates an unpaid CI test order only. It does not execute a payment or submit merchant-review documents.'],
};
let phase = 'initial-database-guard';
let browser;
let failure;
let initialOrderCount;
const db = new PrismaClient({ datasources: { db: { url: 'file:./ci.db' } } });
const check = (name, value, message) => { assert.ok(value, message || name); result.checks[name] = true; };

async function inventory() {
  const [products, options] = await Promise.all([
    db.product.findMany({ select: { id: true, stock: true }, orderBy: { id: 'asc' } }),
    db.productOption.findMany({ select: { id: true, stock: true }, orderBy: { id: 'asc' } }),
  ]);
  return { products, options };
}

async function waitUntil(read, message) {
  const end = Date.now() + 15_000;
  while (Date.now() < end) {
    if (await read()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(message);
}

try {
  initialOrderCount = await db.order.count();
  check('initialOrderCountZero', initialOrderCount === 0);
  check('initialPaymentCountZero', await db.payment.count() === 0);
  check('initialConsentCountZero', await db.siteSetting.count({ where: { key: { startsWith: 'checkout.consent.' } } }) === 0);
  const initialInventory = await inventory();
  const cartSelection = { id: true, productId: true, optionId: true, quantity: true };
  const otherCartsBefore = await db.cartItem.findMany({ select: cartSelection, orderBy: { id: 'asc' } });
  browser = await chromium.launch({ headless: true });
  // A fresh context has no administrator session and no cart from the capture/admin tests.
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ko-KR', serviceWorkers: 'block' });
  await context.route('**/*', (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (/^\/api\/payments(?:\/|$)/.test(url.pathname)) {
      result.blockedPaymentRequests++;
      return route.abort('blockedbyclient');
    }
    if (url.origin !== base.origin) {
      result.blockedExternalRequests++;
      return route.abort('blockedbyclient');
    }
    if (!['GET', 'HEAD'].includes(request.method())) {
      if (!/^\/(products\/[^/]+|cart|checkout)\/?$/.test(url.pathname)) {
        result.blockedOtherWrites++;
        return route.abort('blockedbyclient');
      }
      if (url.pathname === '/checkout') result.checkoutActionRequests++;
    }
    return route.continue();
  });
  const page = await context.newPage();
  const errors = [];
  context.on('response', (response) => {
    if (new URL(response.url()).origin === base.origin && response.status() >= 500) {
      // Store paths only; completion URLs contain private order lookup tokens.
      errors.push({ path: new URL(response.url()).pathname, status: response.status() });
    }
  });
  async function go(target, pathname) {
    const response = await target.goto(base.origin + pathname, { waitUntil: 'networkidle', timeout: 60_000 });
    assert.ok(response && response.status() < 400, 'Local page did not load');
    assert.equal(new URL(target.url()).origin, base.origin, 'Unexpected redirect origin');
  }
  async function fillCheckout() {
    await page.locator('[name="ordererName"]').fill('CI주문검증');
    await page.locator('[name="ordererPhone"]').fill('01000000000');
    await page.getByRole('button', { name: '직접 입력', exact: true }).click();
    await page.locator('[name="zipcode"]').fill('33491');
    await page.locator('[name="address1"]').fill('충청남도 보령시 CI 검증 전용 주소');
    await page.locator('[name="address2"]').fill('CI TEST ONLY · 실제 배송 금지');
    await page.locator('[name="memo"]').fill('CI TEST ONLY · 입금·결제·배송 실행 금지');
    await page.locator('[name="agreeTerms"]').check();
    await page.locator('[name="agreePrivacy"]').check();
    // Verify the SERVER also has the test bank fixture before permitting a mutation.
    assert.ok((await page.locator('main').innerText()).includes(bankFixture), 'Server bank fixture mismatch');
    await page.getByRole('button', { name: /주문 내용 확인/ }).click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });
  }
  async function confirmOrder() {
    const submit = page.getByRole('dialog').getByRole('button', { name: /결제하기/ });
    assert.ok(await submit.isEnabled(), 'Test bank order is not ready');
    const [response] = await Promise.all([
      page.waitForResponse((response) => response.request().method() === 'POST' &&
        new URL(response.url()).origin === base.origin && new URL(response.url()).pathname === '/checkout', { timeout: 30_000 }),
      submit.click(),
    ]);
    assert.ok(response.ok(), 'Checkout server action request failed');
  }

  phase = 'guest-cart-and-review';
  await go(page, '/products');
  await page.locator('a[href^="/products/"]').first().click();
  await page.getByRole('button', { name: '장바구니', exact: true }).click();
  await page.getByText('장바구니에 담았습니다.', { exact: true }).waitFor();
  const guestCookie = (await context.cookies(base.origin)).find((cookie) => cookie.name === 'ujgim_cart');
  assert.ok(guestCookie?.value, 'Guest cart cookie missing');
  const guestKey = guestCookie.value;
  const initialCart = await db.cartItem.findMany({ where: { guestKey }, include: { product: true, option: true } });
  assert.equal(initialCart.length, 1, 'Expected one item in the new guest cart');
  const cartItem = initialCart[0];
  assert.equal(cartItem.userId, null, 'Test must remain anonymous');
  assert.equal(cartItem.quantity, 1);
  assert.ok(cartItem.product.stock >= 2 && (!cartItem.option || cartItem.option.stock >= 2), 'Fixture requires stock for two units');
  await go(page, '/checkout');
  await fillCheckout();
  check('guestReviewWithoutOrder', await db.order.count() === 0);
  await page.getByRole('dialog').getByText('수량 1개', { exact: true }).waitFor();

  phase = 'stale-snapshot-rejection';
  // Change the same cart through another real guest tab; the first dialog remains frozen.
  const cartTab = await context.newPage();
  await go(cartTab, '/cart');
  await cartTab.getByRole('button', { name: '+', exact: true }).first().click();
  await waitUntil(async () => (await db.cartItem.findUnique({ where: { id: cartItem.id } }))?.quantity === 2, 'Cart quantity update did not finish');
  await page.getByRole('dialog').getByText('수량 1개', { exact: true }).waitFor();
  await confirmOrder();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByText('장바구니의 상품·옵션·수량 또는 가격이 변경되었습니다. 주문서를 새로고침하고 주문 내용을 다시 확인해 주세요.', { exact: true }).waitFor();
  check('staleSnapshotRejected', await db.order.count() === 0);
  check('staleSnapshotCreatedNoPayment', await db.payment.count() === 0);
  check('staleSnapshotCreatedNoConsent', await db.siteSetting.count({ where: { key: { startsWith: 'checkout.consent.' } } }) === 0);
  assert.deepEqual(await inventory(), initialInventory, 'Rejected order must not reserve any stock');
  result.checks.staleSnapshotPreservedAllStock = true;
  check('staleSnapshotPreservedCart', (await db.cartItem.findUnique({ where: { id: cartItem.id } }))?.quantity === 2);
  check('changedOrderRequiresFreshConsent', !await page.locator('[name="agreeTerms"]').isChecked() && !await page.locator('[name="agreePrivacy"]').isChecked());
  await cartTab.close();

  phase = 'fresh-ci-bank-order';
  await go(page, '/checkout');
  const termsVersion = await page.locator('[name="termsVersion"]').inputValue();
  const policyRevision = await page.locator('[name="policyRevision"]').inputValue();
  const privacy = await db.siteSetting.findUnique({ where: { key: 'commerce.privacy-published.v1' } });
  const privacyRevision = privacy ? JSON.parse(privacy.value).revision : 'built-in-2026-10-23';
  await fillCheckout();
  const dialog = page.getByRole('dialog');
  await dialog.getByText('수량 2개', { exact: true }).waitFor();
  const totalText = await dialog.getByText('최종 결제금액', { exact: true }).locator('..').locator('dd').innerText();
  const confirmedTotal = Number(totalText.replace(/[^0-9]/g, ''));
  assert.ok(Number.isSafeInteger(confirmedTotal) && confirmedTotal > 0, 'Final amount unavailable');
  await confirmOrder();
  await page.waitForURL((url) => url.origin === base.origin && url.pathname === '/checkout/complete', { timeout: 30_000 });
  const publicToken = new URL(page.url()).searchParams.get('token');
  assert.ok(publicToken, 'Created test order lookup token missing');

  phase = 'created-order-database-and-result';
  const order = await db.order.findUniqueOrThrow({ where: { publicToken }, include: { items: true, payment: true } });
  check('exactlyOneCiOrder', await db.order.count() === 1);
  check('anonymousFixtureOrder', order.userId === null && order.ordererName === 'CI주문검증' && order.memo.includes('CI TEST ONLY'));
  check('orderPendingAndStockReserved', order.status === 'PENDING' && order.stockReserved && order.rewardPoint === 0);
  check('confirmedAmountPreserved', order.totalAmount === confirmedTotal && order.pointUsed === 0);
  check('unpaidBankPaymentOnly', await db.payment.count() === 1 && order.payment?.method === 'BANK' &&
    order.payment.status === 'READY' && order.payment.amount === confirmedTotal && order.payment.bankAccount === bankFixture &&
    order.payment.paidAt === null && order.payment.paymentKey === null && order.payment.impUid === null);
  assert.equal(order.items.length, 1);
  const item = order.items[0];
  check('reviewedCartItemPreserved', item.productId === cartItem.productId && item.optionId === cartItem.optionId &&
    item.quantity === 2 && item.price === cartItem.product.price + (cartItem.option?.extraPrice ?? 0));
  check('onlyThisGuestCartCleared', await db.cartItem.count({ where: { guestKey } }) === 0);
  assert.deepEqual(await db.cartItem.findMany({ select: cartSelection, orderBy: { id: 'asc' } }), otherCartsBefore, 'Other guest carts must remain unchanged');
  result.checks.otherGuestCartsPreserved = true;

  const expectedInventory = {
    products: initialInventory.products.map((row) => ({ ...row, stock: row.stock - (row.id === cartItem.productId ? 2 : 0) })),
    options: initialInventory.options.map((row) => ({ ...row, stock: row.stock - (row.id === cartItem.optionId ? 2 : 0) })),
  };
  assert.deepEqual(await inventory(), expectedInventory, 'Only the ordered product/option may reserve two units');
  result.checks.exactStockReservation = true;
  const consentRow = await db.siteSetting.findUniqueOrThrow({ where: { key: 'checkout.consent.' + order.id } });
  const consent = JSON.parse(consentRow.value);
  check('consentVersionsMatchReviewedPages', consent.terms === true && consent.privacy === true &&
    consent.termsVersion === termsVersion && consent.policyRevision === policyRevision &&
    consent.policySnapshot?.revision === policyRevision && consent.privacyRevision === privacyRevision);
  check('storedReviewMatchesCreatedOrder', consent.reviewSnapshot?.version === 1 &&
    consent.reviewSnapshot.privacyRevision === privacyRevision && consent.reviewSnapshot.total === confirmedTotal &&
    consent.reviewSnapshot.pointUsed === 0 && consent.reviewSnapshot.pointBalance === 0 &&
    consent.reviewSnapshot.items?.length === 1 && consent.reviewSnapshot.items[0].id === cartItem.id &&
    consent.reviewSnapshot.items[0].quantity === 2 && consent.reviewSnapshot.items[0].price === item.price);
  check('exactlyOneConsentRecord', await db.siteSetting.count({ where: { key: { startsWith: 'checkout.consent.' } } }) === 1);
  await page.getByRole('heading', { name: '주문이 정상적으로 접수되었습니다', exact: true }).waitFor();
  await page.getByText('입금/결제 대기', { exact: true }).waitFor();
  await page.getByText('아래 계좌로 입금해 주시면 입금 확인 후 상품을 준비합니다.', { exact: true }).waitFor();
  result.checks.completionShowsAwaitingDeposit = true;
  check('noPaymentApiRequests', result.blockedPaymentRequests === 0);
  check('noUnexpectedWrites', result.blockedOtherWrites === 0);
  check('twoCheckoutServerActionCalls', result.checkoutActionRequests === 2);
  check('noLocalServerErrors', errors.length === 0);
  result.status = 'passed';
} catch (error) {
  failure = error;
  result.status = 'failed';
  // Do not print raw Playwright traces, URLs, cookies, order tokens or environment values.
  result.failure = { phase, kind: error instanceof Error ? error.name : 'UnknownError' };
} finally {
  try {
    result.finalOrderCount = await db.order.count();
    if (typeof initialOrderCount === 'number') result.ciTestOrdersCreated = result.finalOrderCount - initialOrderCount;
  } catch { /* initial DB guard may have failed */ }
  await browser?.close();
  await db.$disconnect();
  await fs.writeFile(path.join(out, 'checkout-flow-checks.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
if (failure) process.exitCode = 1;
