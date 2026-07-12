-- AlterTable
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "country" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "page_views_sessionId_idx" ON "page_views"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "page_views_country_idx" ON "page_views"("country");

-- CreateTable
CREATE TABLE IF NOT EXISTS "site_visitors" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "country" TEXT,
    "countryName" TEXT,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_visitors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "site_visitors_visitorId_key" ON "site_visitors"("visitorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "site_visitors_lastSeenAt_idx" ON "site_visitors"("lastSeenAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "site_visitors_country_idx" ON "site_visitors"("country");
