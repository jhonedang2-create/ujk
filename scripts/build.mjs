import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

/**
 * Workers Builds가 주입하는 WORKERS_CI를 기준으로만 자동 전환합니다.
 * 일반 GitHub CI의 CI=true만으로 SQLite 개발 빌드를 바꾸지 않습니다.
 */
export function getBuildTarget(env = process.env) {
  return env.WORKERS_CI === '1' || env.WORKERS_CI === 'true' || env.UJK_CLOUDFLARE === 'true'
    ? 'cloudflare'
    : 'node';
}

export function getBuildSteps(env = process.env) {
  if (getBuildTarget(env) === 'cloudflare') {
    return [[path.join(root, 'scripts/build-cloudflare.mjs')]];
  }
  // 기존 npm run build 동작: prisma generate && next build.
  // npx 다운로드나 플랫폼별 shell 인용 없이 설치된 CLI만 실행합니다.
  return [
    [path.join(root, 'node_modules/prisma/build/index.js'), 'generate'],
    [path.join(root, 'node_modules/next/dist/bin/next'), 'build'],
  ];
}

export function runBuild({ env = process.env, spawn = spawnSync, log = console.log } = {}) {
  const target = getBuildTarget(env);
  log(target === 'cloudflare'
    ? '[ujk] Cloudflare build: generating PostgreSQL client, Next.js and OpenNext output.'
    : '[ujk] Node.js build: preserving the existing development build.');

  for (const args of getBuildSteps(env)) {
    const result = spawn(process.execPath, args, {
      cwd: root,
      env,
      stdio: 'inherit',
      shell: false,
    });
    if (result.error) throw result.error;
    if (result.signal) throw new Error(`Build terminated by ${result.signal}`);
    if (result.status !== 0) return Number.isInteger(result.status) && result.status > 0 ? result.status : 1;
  }
  return 0;
}

// import해서 분기/실패 처리를 검사할 때 실제 빌드를 실행하지 않습니다.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = runBuild();
  } catch (error) {
    console.error('[ujk] Build failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exitCode = 1;
  }
}
