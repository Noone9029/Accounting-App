-- Add explicit manual inventory asset posting links for purchase receipts.
ALTER TABLE "PurchaseReceipt"
  ADD COLUMN "inventoryAssetJournalEntryId" UUID,
  ADD COLUMN "inventoryAssetReversalJournalEntryId" UUID,
  ADD COLUMN "inventoryAssetPostedAt" TIMESTAMP(3),
  ADD COLUMN "inventoryAssetPostedById" UUID,
  ADD COLUMN "inventoryAssetReversedAt" TIMESTAMP(3),
  ADD COLUMN "inventoryAssetReversedById" UUID;

CREATE UNIQUE INDEX "PurchaseReceipt_inventoryAssetJournalEntryId_key" ON "PurchaseReceipt"("inventoryAssetJournalEntryId");
CREATE UNIQUE INDEX "PurchaseReceipt_inventoryAssetReversalJournalEntryId_key" ON "PurchaseReceipt"("inventoryAssetReversalJournalEntryId");
CREATE INDEX "PurchaseReceipt_inventoryAssetPostedById_idx" ON "PurchaseReceipt"("inventoryAssetPostedById");
CREATE INDEX "PurchaseReceipt_inventoryAssetReversedById_idx" ON "PurchaseReceipt"("inventoryAssetReversedById");

ALTER TABLE "PurchaseReceipt"
  ADD CONSTRAINT "PurchaseReceipt_inventoryAssetJournalEntryId_fkey"
  FOREIGN KEY ("inventoryAssetJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseReceipt"
  ADD CONSTRAINT "PurchaseReceipt_inventoryAssetReversalJournalEntryId_fkey"
  FOREIGN KEY ("inventoryAssetReversalJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseReceipt"
  ADD CONSTRAINT "PurchaseReceipt_inventoryAssetPostedById_fkey"
  FOREIGN KEY ("inventoryAssetPostedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseReceipt"
  ADD CONSTRAINT "PurchaseReceipt_inventoryAssetReversedById_fkey"
  FOREIGN KEY ("inventoryAssetReversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
