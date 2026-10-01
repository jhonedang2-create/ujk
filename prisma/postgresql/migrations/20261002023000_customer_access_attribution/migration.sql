-- Customer access context and purchase attribution analytics
-- Additive/idempotent so production can be prepared before app deployment.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "firstAccessAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "firstAccessIp" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "firstAccessOs" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "firstAccessBrowser" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "firstAccessDevice" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "lastAccessAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastAccessIp" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "lastAccessOs" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "lastAccessBrowser" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "lastAccessDevice" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "region1" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "region2" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "trafficSource" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "trafficMedium" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "trafficCampaign" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "referrerHost" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "landingPath" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "UserAccessLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ip" TEXT NOT NULL DEFAULT '',
  "os" TEXT NOT NULL DEFAULT '',
  "browser" TEXT NOT NULL DEFAULT '',
  "device" TEXT NOT NULL DEFAULT '',
  "userAgent" TEXT NOT NULL DEFAULT '',
  "path" TEXT NOT NULL DEFAULT '',
  "referrerHost" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAccessLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserAccessLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UserAccessLog_userId_createdAt_idx" ON "UserAccessLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserAccessLog_ip_idx" ON "UserAccessLog"("ip");
CREATE INDEX IF NOT EXISTS "Order_region1_idx" ON "Order"("region1");
CREATE INDEX IF NOT EXISTS "Order_trafficSource_idx" ON "Order"("trafficSource");
