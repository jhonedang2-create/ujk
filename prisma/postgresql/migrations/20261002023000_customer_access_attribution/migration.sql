-- Customer access context and purchase attribution analytics
ALTER TABLE "User"
  ADD COLUMN "firstAccessAt" TIMESTAMP(3),
  ADD COLUMN "firstAccessIp" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "firstAccessOs" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "firstAccessBrowser" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "firstAccessDevice" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "lastAccessAt" TIMESTAMP(3),
  ADD COLUMN "lastAccessIp" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "lastAccessOs" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "lastAccessBrowser" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "lastAccessDevice" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Order"
  ADD COLUMN "region1" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "region2" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "trafficSource" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "trafficMedium" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "trafficCampaign" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "referrerHost" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "landingPath" TEXT NOT NULL DEFAULT '';

CREATE TABLE "UserAccessLog" (
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

CREATE INDEX "UserAccessLog_userId_createdAt_idx" ON "UserAccessLog"("userId", "createdAt");
CREATE INDEX "UserAccessLog_ip_idx" ON "UserAccessLog"("ip");
CREATE INDEX "Order_region1_idx" ON "Order"("region1");
CREATE INDEX "Order_trafficSource_idx" ON "Order"("trafficSource");
