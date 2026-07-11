-- AlterTable
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "categories_parentId_idx" ON "categories"("parentId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_parentId_fkey'
  ) THEN
    ALTER TABLE "categories"
      ADD CONSTRAINT "categories_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "categories"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
