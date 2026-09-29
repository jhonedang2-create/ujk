// 이 작업 브랜치에서만 실행하는 일회성 설정 도구입니다. main 반영 전 제거합니다.
import { readFile, writeFile } from 'node:fs/promises';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
pkg.scripts['build:cloudflare'] = 'node scripts/build-cloudflare.mjs';
pkg.scripts['deploy:cloudflare'] = 'opennextjs-cloudflare deploy';
pkg.scripts['preview:cloudflare'] = 'opennextjs-cloudflare preview';
pkg.scripts['upload:cloudflare'] = 'opennextjs-cloudflare upload';
pkg.scripts['test:cloudflare'] = 'node scripts/smoke-cloudflare.mjs';
await writeFile('package.json', JSON.stringify(pkg, null, 2) + '\n');
let config = await readFile('next.config.mjs', 'utf8');
if (!config.includes('UJK_CLOUDFLARE')) {
  config = config.replace('  poweredByHeader: false,', "  poweredByHeader: false,\n  // Cloudflare 빌드 플래그만 치환하며 비밀값을 공개하지 않습니다.\n  env: { UJK_CLOUDFLARE: process.env.UJK_CLOUDFLARE === 'true' ? 'true' : 'false' },\n  serverExternalPackages: ['@prisma/client', '.prisma/client', '@prisma/adapter-pg', 'pg'],");
  config = config.replace('  images: {', "  images: {\n    // 유료 Images 기능을 자동 활성화하지 않고 원본 이미지를 제공합니다.\n    unoptimized: process.env.UJK_CLOUDFLARE === 'true',");
}
await writeFile('next.config.mjs', config);
let ignore = await readFile('.gitignore', 'utf8');
if (!ignore.includes('.open-next/')) ignore += '\n# Cloudflare build/runtime artifacts and secrets\n.open-next/\n.wrangler/\nprisma/.cloudflare/\n.dev.vars\n.dev.vars.*\n!.dev.vars.example\ncloudflare-smoke.log\n';
await writeFile('.gitignore', ignore);
let sitemap = await readFile('src/app/sitemap.ts', 'utf8');
if (!sitemap.includes('force-dynamic')) sitemap = "// 상품·게시글은 빌드 DB에 고정하지 않고 실제 요청 시 조회합니다.\nexport const dynamic = 'force-dynamic';\n\n" + sitemap;
await writeFile('src/app/sitemap.ts', sitemap);
let prisma = await readFile('src/lib/prisma.ts', 'utf8');
prisma = prisma.replace('WorkersのDATABASE_URLにPostgreSQL接続情報を設定してください。', 'Workers의 DATABASE_URL에 PostgreSQL 연결 정보를 설정해 주세요.');
await writeFile('src/lib/prisma.ts', prisma);
let smoke = await readFile('scripts/smoke-cloudflare.mjs', 'utf8');
smoke = smoke.replace('既に終了', '이미 종료됨');
await writeFile('scripts/smoke-cloudflare.mjs', smoke);
