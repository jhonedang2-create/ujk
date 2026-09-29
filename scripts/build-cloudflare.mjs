import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

// DB 연결/마이그레이션/seed 없이 배포 파일만 만듭니다.
// 개발 SQLite 및 기존 PostgreSQL 스키마를 덮어쓰지 않습니다.
const root = process.cwd();
const generated = path.join(root, 'prisma', '.cloudflare');
const source = await readFile(path.join(root, 'prisma/postgresql/schema.prisma'), 'utf8');
if (!/provider\s*=\s*"postgresql"/.test(source)) throw new Error('PostgreSQL schema not found');
const schema = source.replace(/generator client\s*\{[\s\S]*?\}/, 'generator client {\n  provider = "prisma-client-js"\n  engineType = "client"\n}');
if (schema === source) throw new Error('Prisma generator could not be configured');
await mkdir(generated, { recursive: true });
await writeFile(path.join(generated, 'schema.prisma'), schema);

// 이 값은 빌드 도구의 스키마 검사용이며, 실제 Workers 런타임 비밀값을 대체하지 않습니다.
const env = {
  ...process.env,
  UJK_CLOUDFLARE: 'true',
  NEXT_TELEMETRY_DISABLED: '1',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://build_only:build_only@127.0.0.1:1/ujk',
  DIRECT_URL: process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://build_only:build_only@127.0.0.1:1/ujk',
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://woojeonggim.com',
};
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run('npx', ['--no-install', 'prisma', 'generate', '--schema', 'prisma/.cloudflare/schema.prisma']);
// npm run build는 SQLite client를 다시 생성하므로 여기서는 직접 next build를 실행합니다.
run('npx', ['--no-install', 'next', 'build']);
run('npx', ['--no-install', 'opennextjs-cloudflare', 'build', '--skipNextBuild']);
