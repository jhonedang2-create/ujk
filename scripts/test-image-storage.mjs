import assert from 'node:assert/strict';
import { imageStorageReady, saveImage, readStoredImage, validImageName, MAX_IMAGE_BYTES } from '../src/lib/image-storage.ts';

// 실제 Supabase/API 키를 사용하지 않는 저장소 단위검사입니다.
const keys = ['UPLOAD_STORAGE', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_STORAGE_BUCKET', 'UJK_CLOUDFLARE', 'ALLOW_LOCAL_UPLOADS'];
const originalEnv = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2F2QAAAAASUVORK5CYII=', 'base64'));
const filename = 'a39e5a20-13c6-4516-9d5f-e6e753d7bf29.png';
const calls = [];
let fetchResponse = () => new Response('{}', { status: 200 });
globalThis.fetch = async (input, init) => {
  calls.push({ url: String(input), init });
  assert(String(input).startsWith('https://unitcheck.supabase.co/'), 'No live network is allowed');
  return fetchResponse();
};
let passed = 0;
function pass(name) { passed += 1; console.log(`PASS storage: ${name}`); }
try {
  for (const key of keys) delete process.env[key];
  process.env.UJK_CLOUDFLARE = 'true';
  process.env.ALLOW_LOCAL_UPLOADS = 'true';
  assert.equal(imageStorageReady(), false);
  await assert.rejects(() => saveImage(png), /저장소/);
  assert.equal(calls.length, 0);
  pass('Workers never falls back to ephemeral local disk');

  for (const name of ['../secret.txt', '%2e%2e%2fsecret', 'test.svg', `${filename}/more`, 'test.html']) {
    assert.equal(validImageName(name), false);
    assert.equal((await readStoredImage(name)).status, 404);
  }
  assert.equal(validImageName(filename), true);
  pass('raster UUID path validation');

  process.env.UPLOAD_STORAGE = 'supabase';
  process.env.SUPABASE_URL = 'https://unitcheck.supabase.co';
  process.env.SUPABASE_STORAGE_BUCKET = 'ujk-images';
  assert.equal(imageStorageReady(), false);
  assert.equal((await readStoredImage(filename)).status, 503);
  pass('missing server key fails closed');

  process.env.SUPABASE_SERVICE_ROLE_KEY = 'unit-test-not-a-real-api-key';
  assert.equal(imageStorageReady(), true);
  process.env.SUPABASE_URL = 'https://attacker.example';
  assert.throws(() => imageStorageReady());
  process.env.SUPABASE_URL = 'https://unitcheck.supabase.co';
  process.env.SUPABASE_STORAGE_BUCKET = '../other';
  assert.throws(() => imageStorageReady());
  process.env.SUPABASE_STORAGE_BUCKET = 'ujk-images';
  pass('invalid destination and bucket are rejected');

  await assert.rejects(() => saveImage(new Uint8Array()), /5MB/);
  await assert.rejects(() => saveImage(new Uint8Array(MAX_IMAGE_BYTES + 1)), /5MB/);
  await assert.rejects(() => saveImage(new TextEncoder().encode('<svg onload="alert(1)"/>')), /형식/);
  assert.equal(calls.length, 0);
  pass('empty, oversize and executable image formats are rejected');

  const saved = await saveImage(png);
  assert(saved.startsWith('/uploads/'));
  assert(validImageName(saved.slice('/uploads/'.length)));
  const upload = calls.at(-1);
  assert.equal(upload.init.method, 'POST');
  assert.equal(upload.init.headers['Content-Type'], 'image/png');
  assert.equal(upload.init.headers['x-upsert'], 'false');
  assert.equal(upload.init.redirect, 'error');
  assert(!saved.includes(process.env.SUPABASE_SERVICE_ROLE_KEY));
  pass('valid image saved with no-overwrite and same-origin URL');

  fetchResponse = () => new Response(new Uint8Array(png).buffer, { headers: { 'content-length': String(png.length) } });
  const image = await readStoredImage(filename);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('content-type'), 'image/png');
  assert.equal(image.headers.get('x-content-type-options'), 'nosniff');
  assert(!JSON.stringify([...image.headers]).includes(process.env.SUPABASE_SERVICE_ROLE_KEY));
  assert.deepEqual(new Uint8Array(await image.arrayBuffer()), png);
  assert(calls.at(-1).url.includes('/object/authenticated/ujk-images/'));
  pass('private storage is relayed without exposing the key');

  fetchResponse = () => new Response('internal-details-not-for-users', { status: 401 });
  const failure = await readStoredImage(filename);
  assert.equal(failure.status, 503);
  assert.equal(failure.headers.get('cache-control'), 'no-store');
  assert(!(await failure.text()).includes('internal-details'));
  fetchResponse = () => new Response('internal-details', { status: 404 });
  assert.equal((await readStoredImage(filename)).status, 404);
  pass('storage errors do not leak upstream response bodies');

  fetchResponse = () => new Response('oversize', { headers: { 'content-length': String(MAX_IMAGE_BYTES + 1) } });
  assert.equal((await readStoredImage(filename)).status, 502);
  pass('oversize stored response is rejected');
  console.log(`STORAGE_TEST_OK: ${passed} checks passed with mocked fetch; no live storage was contacted.`);
} finally {
  globalThis.fetch = originalFetch;
  for (const key of keys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
}
