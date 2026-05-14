-- Inventory accounting design settings. These mappings are preview-only and do not enable automatic GL posting.
ALTER TABLE "InventorySettings"
  ADD COLUMN "enableInventoryAccounting" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "inventoryAssetAccountId" UUID,
  ADD COLUMN "cogsAccountId" UUID,
  ADD COLUMN "inventoryAdjustmentGainAccountId" UUID,
  ADD COLUMN "inventoryAdjustmentLossAccountId" UUID;

CREATE INDEX "InventorySettings_inventoryAssetAccountId_idx" ON "InventorySettings"("inventoryAssetAccountId");
CREATE INDEX "InventorySettings_cogsAccountId_idx" ON "InventorySettings"("cogsAccountId");
CREATE INDEX "InventorySettings_inventoryAdjustmentGainAccountId_idx" ON "InventorySettings"("inventoryAdjustmentGainAccountId");
CREATE INDEX "InventorySettings_inventoryAdjustmentLossAccountId_idx" ON "InventorySettings"("inventoryAdjustmentLossAccountId");

ALTER TABLE "InventorySettings"
  ADD CONSTRAINT "InventorySettings_inventoryAssetAccountId_fkey"
  FOREIGN KEY ("inventoryAssetAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventorySettings"
  ADD CONSTRAINT "InventorySettings_cogsAccountId_fkey"
  FOREIGN KEY ("cogsAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventorySettings"
  ADD CONSTRAINT "InventorySettings_inventoryAdjustmentGainAccountId_fkey"
  FOREIGN KEY ("inventoryAdjustmentGainAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventorySettings"
  ADD CONSTRAINT "InventorySettings_inventoryAdjustmentLossAccountId_fkey"
  FOREIGN KEY ("inventoryAdjustmentLossAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
