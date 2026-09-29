import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBuildTarget, getBuildSteps, runBuild } from './build.mjs';

const silent = () => {};

test('ordinary local and GitHub CI builds stay on the original Node.js path', () => {
  for (const env of [{}, { CI: 'true' }, { WORKERS_CI: '0' }, { WORKERS_CI: 'false' }, { UJK_CLOUDFLARE: 'false' }]) {
    assert.equal(getBuildTarget(env), 'node');
  }
});

test('Cloudflare injected WORKERS_CI selects OpenNext without dashboard edits', () => {
  for (const env of [{ WORKERS_CI: '1' }, { WORKERS_CI: 'true' }, { CI: 'true', WORKERS_CI: '1' }]) {
    assert.equal(getBuildTarget(env), 'cloudflare');
  }
});

test('explicit Cloudflare build flag still works', () => {
  assert.equal(getBuildTarget({ UJK_CLOUDFLARE: 'true' }), 'cloudflare');
});

test('Cloudflare delegates exactly once and does not recursively run npm build', () => {
  const steps = getBuildSteps({ WORKERS_CI: '1' });
  assert.equal(steps.length, 1);
  assert.match(steps[0][0], /scripts[/\\]build-cloudflare\.mjs$/);
  const calls = [];
  assert.equal(runBuild({ env: { WORKERS_CI: '1' }, log: silent, spawn: (...args) => {
    calls.push(args); return { status: 0 };
  } }), 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], process.execPath);
  assert.equal(calls[0][2].shell, false);
});

test('Node.js keeps Prisma generation before Next.js compilation', () => {
  const steps = getBuildSteps({});
  assert.equal(steps.length, 2);
  assert.match(steps[0][0], /prisma[/\\]build[/\\]index\.js$/);
  assert.equal(steps[0][1], 'generate');
  assert.match(steps[1][0], /next[/\\]dist[/\\]bin[/\\]next$/);
  assert.equal(steps[1][1], 'build');
});

test('a failed step stops subsequent commands and preserves its exit status', () => {
  let calls = 0;
  assert.equal(runBuild({ env: {}, log: silent, spawn: () => { calls += 1; return { status: 7 }; } }), 7);
  assert.equal(calls, 1);
});

test('spawn errors and signals are not reported as success', () => {
  assert.throws(() => runBuild({ env: {}, log: silent, spawn: () => ({ error: new Error('missing executable') }) }), /missing executable/);
  assert.throws(() => runBuild({ env: {}, log: silent, spawn: () => ({ signal: 'SIGTERM', status: null }) }), /SIGTERM/);
  assert.equal(runBuild({ env: {}, log: silent, spawn: () => ({ status: null }) }), 1);
});

test('environment reaches child unchanged but is never printed by the router', () => {
  const env = { WORKERS_CI: '1', AUTH_SECRET: 'test-only-not-a-real-key' };
  const logs = [];
  assert.equal(runBuild({ env, log: (text) => logs.push(text), spawn: (_command, _args, options) => {
    assert.equal(options.env, env);
    return { status: 0 };
  } }), 0);
  assert(!logs.join('\n').includes(env.AUTH_SECRET));
});
