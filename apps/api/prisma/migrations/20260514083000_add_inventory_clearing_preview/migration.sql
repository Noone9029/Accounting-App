-- Inventory clearing design settings for purchase receipt preview and future bill/receipt matching.
-- These columns do not enable purchase receipt GL posting.
CREATE TYPE "InventoryPurchasePostingMode" AS ENUM ('DISABLED', 'PREVIEW_ONLY');

ALTER TABLE "InventorySettings"
  ADD COLUMN "inventoryClearingAccountId" UUID,
  ADD COLUMN "purchaseReceiptPostingMode" "InventoryPurchasePostingMode" NOT NULL DEFAULT 'DISABLED';

CREATE INDEX "InventorySettings_inventoryClearingAccountId_idx" ON "InventorySettings"("inventoryClearingAccountId");

ALTER TABLE "InventorySettings"
  ADD CONSTRAINT "InventorySettings_inventoryClearingAccountId_fkey"
  FOREIGN KEY ("inventoryClearingAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
