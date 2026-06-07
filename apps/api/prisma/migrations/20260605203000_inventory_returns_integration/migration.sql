-- Add explicit operational inventory return movements without changing accounting/AP/AR/VAT behavior.
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'PURCHASE_RETURN_OUT';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'SALES_RETURN_IN';

ALTER TABLE "PurchaseReturn"
  ADD COLUMN "inventoryReturnPostedByUserId" UUID,
  ADD COLUMN "inventoryReturnPostedAt" TIMESTAMP(3);

ALTER TABLE "PurchaseReturnLine"
  ADD COLUMN "stockMovementId" UUID;

CREATE UNIQUE INDEX "PurchaseReturnLine_stockMovementId_key" ON "PurchaseReturnLine"("stockMovementId");
CREATE INDEX "PurchaseReturn_inventoryReturnPostedByUserId_idx" ON "PurchaseReturn"("inventoryReturnPostedByUserId");

ALTER TABLE "PurchaseReturn"
  ADD CONSTRAINT "PurchaseReturn_inventoryReturnPostedByUserId_fkey"
  FOREIGN KEY ("inventoryReturnPostedByUserId")
  REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "PurchaseReturnLine"
  ADD CONSTRAINT "PurchaseReturnLine_stockMovementId_fkey"
  FOREIGN KEY ("stockMovementId")
  REFERENCES "StockMovement"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
