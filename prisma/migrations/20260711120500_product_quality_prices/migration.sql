-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "qualityPrices" JSONB NOT NULL DEFAULT '{}';
