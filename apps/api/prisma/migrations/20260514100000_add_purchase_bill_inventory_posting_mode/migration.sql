-- Purchase bill inventory posting mode groundwork.
-- DIRECT_EXPENSE_OR_ASSET preserves existing bill finalization behavior.
-- INVENTORY_CLEARING is preview/readiness groundwork only in this phase.
CREATE TYPE "PurchaseBillInventoryPostingMode" AS ENUM ('DIRECT_EXPENSE_OR_ASSET', 'INVENTORY_CLEARING');

ALTER TABLE "PurchaseBill"
  ADD COLUMN "inventoryPostingMode" "PurchaseBillInventoryPostingMode" NOT NULL DEFAULT 'DIRECT_EXPENSE_OR_ASSET';

CREATE INDEX "PurchaseBill_inventoryPostingMode_idx" ON "PurchaseBill"("inventoryPostingMode");
