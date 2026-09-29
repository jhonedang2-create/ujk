import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { writeFile, readFile, rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

// 실제 서비스 DB로 이 테스트를 실행하지 못하도록 차단합니다.
const url = new URL(process.env.DATABASE_URL || 'postgresql://missing@invalid/invalid');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Smoke test requires a disposable local database');
assert(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD, 'Disposable admin account is required');
assert((process.env.AUTH_SECRET || '').length >= 32, 'Test AUTH_SECRET is required');
try { await readFile('.dev.vars'); throw new Error('Existing .dev.vars will not be overwritten'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const vars = {
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_URL: 'http://127.0.0.1:8787',
  AUTH_TRUST_HOST: 'true', UJK_CLOUDFLARE: 'true',
};
await writeFile('.dev.vars', Object.entries(vars).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { mode: 0o600 });
const fd = openSync('cloudflare-smoke.log', 'w', 0o600);
const child = spawn('npx', ['--no-install', 'wrangler', 'dev', '--local', '--ip', '127.0.0.1', '--port', '8787'], {
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' },
  detached: process.platform !== 'win32', stdio: ['ignore', fd, fd],
});
closeSync(fd);
const base = 'http://127.0.0.1:8787';
const cookies = new Map();
let passed = 0;
async function request(path, init = {}, authenticated = false) {
  const headers = new Headers(init.headers);
  if (authenticated && cookies.size) headers.set('Cookie', [...cookies].map(([k, v]) => `${k}=${v}`).join('; '));
  const response = await fetch(base + path, { ...init, headers, redirect: 'manual', signal: AbortSignal.timeout(30_000) });
  if (authenticated) {
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0];
      const index = pair.indexOf('=');
      cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }
  return response;
}
function pass(name) { passed += 1; console.log(`PASS ${name}`); }
try {
  let started = false;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Worker exited (${child.exitCode})`);
    try {
      const response = await fetch(base + '/api/health', { signal: AbortSignal.timeout(2_000) });
      if (response.ok) { started = true; break; }
    } catch { /* 아직 시작 중 */ }
    await delay(1_000);
  }
  assert(started, 'Worker did not start within 120 seconds');
  for (const path of ['/api/health', '/api/ready']) {
    const response = await request(path);
    const body = await response.text();
    assert.equal(response.status, 200, `${path}: ${body.slice(0, 500)}`);
    pass(path);
  }
  for (const path of ['/', '/products', '/staff/sign-in', '/login']) {
    const response = await request(path);
    const html = await response.text();
    assert.equal(response.status, 200, `${path}: ${html.slice(0, 300)}`);
    assert(html.includes('우정김'), `${path}: expected application HTML`);
    pass(`SSR ${path}`);
  }
  const admin = await request('/admin');
  assert([302, 303, 307, 308].includes(admin.status));
  assert((admin.headers.get('location') || '').includes('/staff/sign-in'));
  pass('anonymous admin is protected');
  const forbidden = await request('/api/admin/upload', { method: 'POST' });
  assert.equal(forbidden.status, 403);
  pass('anonymous upload is forbidden');
  const invalidImage = await request('/uploads/not-an-image.txt');
  assert.equal(invalidImage.status, 404);
  pass('invalid image path is rejected');
  const anonymous = await request('/api/auth/session');
  assert.equal(anonymous.status, 200);
  assert.equal((await anonymous.json())?.user, undefined);
  pass('anonymous session');
  const csrfResponse = await request('/api/auth/csrf', {}, true);
  assert.equal(csrfResponse.status, 200);
  const csrf = await csrfResponse.json();
  assert(csrf.csrfToken);
  const login = await request('/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, identifier: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD, callbackUrl: base + '/admin' }),
  }, true);
  assert(login.status < 400, `Credentials callback status ${login.status}`);
  const sessionResponse = await request('/api/auth/session', {}, true);
  const session = await sessionResponse.json();
  assert.equal(session.user?.role, 'ADMIN', 'Credentials login must create an administrator session');
  pass('credentials login and database-backed admin session');
  const dashboard = await request('/admin', {}, true);
  assert.equal(dashboard.status, 200);
  await dashboard.text();
  pass('authenticated administrator dashboard');
  const concurrent = await Promise.all(Array.from({ length: 4 }, async () => {
    const response = await request('/products');
    await response.text();
    return response.status;
  }));
  assert(concurrent.every((status) => status === 200));
  pass('parallel requests use isolated database connections');
  console.log(`CLOUDFLARE_SMOKE_OK: ${passed} checks passed. No production database or Cloudflare deployment was used.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Smoke test failed');
  process.exitCode = 1;
} finally {
  try { if (process.platform === 'win32') child.kill('SIGTERM'); else process.kill(-child.pid, 'SIGTERM'); } catch { /* 이미 종료됨 */ }
  await rm('.dev.vars', { force: true });
}
