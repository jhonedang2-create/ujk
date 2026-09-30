// Workers의 비밀값은 런타임에 주입합니다. 실제 값이나 서비스 키를 이 파일에 넣지 마세요.
interface CloudflareEnv {
  HYPERDRIVE?: { connectionString: string };
  DATABASE_URL?: string;
  DATABASE_SSL_CA?: string;
  AUTH_SECRET?: string;
  AUTH_URL?: string;
  AUTH_TRUST_HOST?: string;
  UJK_CLOUDFLARE?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_STORAGE_BUCKET?: string;
  UPLOAD_STORAGE?: string;
}
