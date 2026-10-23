import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

// This regression writes test policies, so it must never target a deployed site or real DB.
const base = new URL(process.env.REVIEW_BASE_URL || 'http://127.0.0.1:3000');
if (process.env.CI !== 'true' || process.env.DATABASE_URL !== 'file:./ci.db' ||
    base.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(base.hostname)) {
  throw new Error('Policy mutation tests require the isolated CI SQLite database and loopback server.');
}
if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) throw new Error('Missing isolated CI login');
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON || import.meta.url);
const { chromium } = require('playwright');
const out = process.env.REVIEW_OUTPUT_DIR || 'review-artifacts';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const admin = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ko-KR' });
const guest = await browser.newContext({ locale: 'ko-KR' });
for (const context of [admin, guest]) {
  await context.route('**/*', (route) => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin !== base.origin || /^\/api\/payments\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
}
const page = await admin.newPage();
const publicPage = await guest.newPage();
const checks = { isolatedEnvironment: true, staffLogin: false, publicationVisible: false, draftPreservesPublicPolicy: false, publicRevisionPreserved: false, noOrders: false };
let failure;
try {
  await page.goto(`${base.origin}/staff/sign-in?callbackUrl=%2Fadmin%2Fmerchant-review`, { waitUntil: 'networkidle' });
  await page.getByLabel('계정', { exact: true }).fill(process.env.ADMIN_USERNAME);
  await page.getByLabel('비밀번호', { exact: true }).fill(process.env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await page.waitForURL(`${base.origin}/admin/merchant-review`);
  await page.getByRole('heading', { name: '카카오페이 독립몰 심사 준비', exact: true }).waitFor();
  checks.staffLogin = true;
  const form = page.locator('form').filter({ has: page.getByRole('heading', { name: '배송·반품 운영정책', exact: true }) });
  for (const [name, value] of Object.entries({ dispatchDays: '2', deliveryMinDays: '1', deliveryMaxDays: '3', returnFee: '3500', exchangeFee: '7000', returnAddress: 'CI 검증용 공개 주소 · 실제 반품지 아님' })) {
    await form.locator(`[name="${name}"]`).fill(value);
  }
  await form.locator('[name="confirmed"]').check();
  async function saveAndWait() {
    const revision = await form.locator('[name="expectedRevision"]').inputValue();
    await form.getByRole('button', { name: '정책 저장', exact: true }).click();
    await page.waitForFunction((old) => {
      const field = document.querySelector('form input[name="expectedRevision"]');
      return field && field.value !== old;
    }, revision);
  }
  await saveAndWait();
  await publicPage.goto(`${base.origin}/policy/shipping`, { waitUntil: 'networkidle' });
  const publishedText = await publicPage.locator('main').innerText();
  assert.match(publishedText, /CI 검증용 공개 주소/);
  assert.match(publishedText, /기본 반품 운송비 3,500원/);
  checks.publicationVisible = true;
  const publishedRevision = await form.locator('[name="expectedRevision"]').inputValue();
  await form.locator('[name="returnFee"]').fill('9100');
  await form.locator('[name="returnAddress"]').fill('CI 미공개 초안 주소');
  await form.locator('[name="confirmed"]').uncheck();
  await form.locator('[name="confirmDraftOnly"]').check();
  await saveAndWait();
  await page.getByText('미공개 초안', { exact: true }).waitFor();
  await publicPage.reload({ waitUntil: 'networkidle' });
  assert.equal(await publicPage.locator('main').innerText(), publishedText);
  checks.draftPreservesPublicPolicy = true;
  const appRequire = createRequire(import.meta.url);
  const { PrismaClient } = appRequire('@prisma/client');
  const db = new PrismaClient();
  try {
    const row = await db.siteSetting.findUniqueOrThrow({ where: { key: 'commerce.merchant-policy-published.v1' } });
    assert.equal(JSON.parse(row.value).revision, publishedRevision);
    checks.publicRevisionPreserved = true;
    assert.equal(await db.order.count(), 0);
    checks.noOrders = true;
  } finally { await db.$disconnect(); }
  await page.screenshot({ path: path.join(out, '12-admin-merchant-review.jpg'), fullPage: true, type: 'jpeg', quality: 88 });
} catch (error) { failure = error; }
finally {
  await browser.close();
  await fs.writeFile(path.join(out, 'admin-policy-checks.json'), JSON.stringify({ environment: 'ci-preview-not-for-submission', checks }, null, 2));
  console.log(JSON.stringify(checks));
}
if (failure) throw failure;
