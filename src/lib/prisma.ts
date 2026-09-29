import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
let nodeClient: PrismaClient | undefined;
// WorkersではTCP接続を異なるリクエストで使い回せません。
// 同じリクエスト内の並行処理・$transactionだけが同じclientを共有します。
const requestClients = new WeakMap<object, PrismaClient>();

export function getPrisma(): PrismaClient {
  if (process.env.UJK_CLOUDFLARE === 'true') {
    const { env, ctx } = getCloudflareContext();
    const existing = requestClients.get(ctx);
    if (existing) return existing;
    const connectionString = env.DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString || !/^postgres(ql)?:\/\//.test(connectionString)) {
      throw new Error('Workers의 DATABASE_URL에 PostgreSQL 연결 정보를 설정해 주세요.');
    }
    const url = new URL(connectionString);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (!local && url.searchParams.get('sslmode') === 'disable') {
      throw new Error('운영 PostgreSQL 연결은 TLS가 필요합니다.');
    }
    // Prisma 네이티브 엔진 전용 파라미터를 pg에 전달하지 않습니다.
    for (const key of ['pgbouncer', 'connection_limit', 'schema', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat']) {
      url.searchParams.delete(key);
    }
    const ca = env.DATABASE_SSL_CA || process.env.DATABASE_SSL_CA;
    const adapter = new PrismaPg({
      connectionString: url.toString(),
      max: 3,
      maxUses: 1,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 1_000,
      ssl: local ? false : { rejectUnauthorized: true, ...(ca ? { ca: ca.replace(/\\n/g, '\n') } : {}) },
    });
    const client = new PrismaClient({ adapter, log: ['error'] });
    requestClients.set(ctx, client);
    return client;
  }
  // 기존 Node.js/SQLite 개발 및 일반 PostgreSQL 배포 동작은 유지합니다.
  nodeClient ??= globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = nodeClient;
  return nodeClient;
}

// 기존 import { prisma } 호출부와 Auth.js adapter를 유지하면서 초기화를 요청 시점으로 미룹니다.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    if (property === 'then') return undefined;
    const client = getPrisma();
    const value = Reflect.get(client, property, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
