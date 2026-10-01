import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
let nodeClient: PrismaClient | undefined;
// Workers의 소켓은 요청 간 공유하지 않고, 동일 요청의 병렬 조회만 공유합니다.
const requestClients = new WeakMap<object, PrismaClient>();

export function getPrisma(): PrismaClient {
  if (process.env.UJK_CLOUDFLARE === 'true') {
    const { env, ctx } = getCloudflareContext();
    const existing = requestClients.get(ctx);
    if (existing) return existing;
    const managed = env.HYPERDRIVE;
    // 바인딩이 있는데 잘못된 경우 직접 접속으로 조용히 우회하지 않습니다.
    const connectionString = managed
      ? managed.connectionString
      : (env.DATABASE_URL || process.env.DATABASE_URL);
    if (!connectionString || !/^postgres(ql)?:\/\//.test(connectionString)) {
      throw new Error('Workers의 PostgreSQL 연결 설정을 확인해 주세요.');
    }
    const limits = {
      max: 3,
      maxUses: 1,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 1_000,
    };
    let adapter: PrismaPg;
    if (managed) {
      // Cloudflare가 제공한 로컬 연결을 사용합니다. 원본 DB와의 TLS/인증은
      // Hyperdrive가 담당하므로 직접 접속용 ssl 옵션을 혼합하지 않습니다.
      adapter = new PrismaPg({ connectionString, ...limits });
    } else {
      // Hyperdrive를 사용하지 않는 배포의 기존 검증된 TLS 설정은 유지합니다.
      const url = new URL(connectionString);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (!local && url.searchParams.get('sslmode') === 'disable') {
        throw new Error('운영 PostgreSQL 연결은 TLS가 필요합니다.');
      }
      for (const key of ['pgbouncer', 'connection_limit', 'schema', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat']) {
        url.searchParams.delete(key);
      }
      const ca = env.DATABASE_SSL_CA || process.env.DATABASE_SSL_CA;
      adapter = new PrismaPg({
        connectionString: url.toString(),
        ...limits,
        ssl: local ? false : { rejectUnauthorized: true, ...(ca ? { ca: ca.replace(/\\n/g, '\n') } : {}) },
      });
    }
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

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    if (property === 'then') return undefined;
    const client = getPrisma();
    const value = Reflect.get(client, property, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
