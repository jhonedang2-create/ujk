-- This application accesses PostgreSQL only through the Next.js server and Prisma.
-- Block all browser/Data API roles and keep RLS enabled as defense in depth.

DO $$
DECLARE
  app_table record;
BEGIN
  FOR app_table IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      app_table.schema_name,
      app_table.table_name
    );
  END LOOP;
END
$$;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public
  FROM PUBLIC, anon, authenticated, service_role;

-- Prevent future Prisma migrations from automatically exposing new objects.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;
