-- Keep merchant-reported, physical-channel sales distinct from recorded online orders.
ALTER TABLE "products" ADD COLUMN "reportedSalesFloor" INTEGER NOT NULL DEFAULT 0;

-- The merchant confirmed a minimum of 1,000 lifetime sales per currently active item.
-- Products activated or created in future do not automatically inherit this claim.
UPDATE "products" SET "reportedSalesFloor" = 1000 WHERE "status" = 'ACTIVE';
