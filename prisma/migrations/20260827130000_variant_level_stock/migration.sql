-- Move stock ownership from Product to ProductVariant, and drop the
-- BY_PRODUCT date stock mode (superseded by individual/dedicated pools).

-- Step 1: add the new column as nullable so we can backfill it.
ALTER TABLE "ProductVariant" ADD COLUMN "stockGroupId" TEXT;

-- Step 2: backfill every existing variant with its parent product's
-- current stock group, so nothing changes for existing data.
UPDATE "ProductVariant" v
SET "stockGroupId" = p."stockGroupId"
FROM "Product" p
WHERE v."productId" = p."id";

-- Step 3: now safe to enforce NOT NULL.
ALTER TABLE "ProductVariant" ALTER COLUMN "stockGroupId" SET NOT NULL;

-- Step 4: index + FK for the new column.
CREATE INDEX "ProductVariant_stockGroupId_idx" ON "ProductVariant"("stockGroupId");
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_stockGroupId_fkey" FOREIGN KEY ("stockGroupId") REFERENCES "StockGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 5: drop the old product-level stock group column.
ALTER TABLE "Product" DROP CONSTRAINT "Product_stockGroupId_fkey";
DROP INDEX "Product_stockGroupId_idx";
ALTER TABLE "Product" DROP COLUMN "stockGroupId";

-- Step 6: drop ProductStock (BY_PRODUCT mode, 0 rows in use).
DROP TABLE "ProductStock";

-- Step 7: drop the now-unused per-product movement key.
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_productId_fkey";
ALTER TABLE "StockMovement" DROP COLUMN "productId";

-- Step 8: remove BY_PRODUCT from DateStockMode.
BEGIN;
CREATE TYPE "DateStockMode_new" AS ENUM ('BY_GROUP', 'UNLIMITED');
ALTER TABLE "DeliveryDate" ALTER COLUMN "stockMode" DROP DEFAULT;
ALTER TABLE "DeliveryDate" ALTER COLUMN "stockMode" TYPE "DateStockMode_new" USING ("stockMode"::text::"DateStockMode_new");
ALTER TYPE "DateStockMode" RENAME TO "DateStockMode_old";
ALTER TYPE "DateStockMode_new" RENAME TO "DateStockMode";
DROP TYPE "DateStockMode_old";
ALTER TABLE "DeliveryDate" ALTER COLUMN "stockMode" SET DEFAULT 'BY_GROUP';
COMMIT;
