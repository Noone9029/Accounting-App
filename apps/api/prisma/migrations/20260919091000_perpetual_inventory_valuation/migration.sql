-- Additive only. Existing movements are deliberately not repriced or silently backfilled.
CREATE TABLE "InventoryMovementPosting" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "movementId" UUID NOT NULL,
  "journalEntryId" UUID,
  "reviewedById" UUID NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovementPosting_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryMovementPosting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  CONSTRAINT "InventoryMovementPosting_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "StockMovement"("id"),
  CONSTRAINT "InventoryMovementPosting_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id"),
  CONSTRAINT "InventoryMovementPosting_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
);
CREATE UNIQUE INDEX "InventoryMovementPosting_movementId_key" ON "InventoryMovementPosting"("movementId");
CREATE UNIQUE INDEX "InventoryMovementPosting_journalEntryId_key" ON "InventoryMovementPosting"("journalEntryId");
CREATE INDEX "InventoryMovementPosting_organizationId_idx" ON "InventoryMovementPosting"("organizationId");
CREATE TABLE "InventoryValuationBalance" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "itemId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL,
  "quantity" DECIMAL(20,4) NOT NULL,
  "value" DECIMAL(20,4) NOT NULL,
  "sequence" INTEGER NOT NULL,
  "lastMovementDate" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryValuationBalance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryValuationBalance_nonnegative" CHECK ("quantity" >= 0 AND "value" >= 0 AND ("quantity" > 0 OR "value" = 0)),
  CONSTRAINT "InventoryValuationBalance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  CONSTRAINT "InventoryValuationBalance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id"),
  CONSTRAINT "InventoryValuationBalance_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
);
CREATE UNIQUE INDEX "InventoryValuationBalance_organizationId_itemId_warehouseId_key" ON "InventoryValuationBalance"("organizationId", "itemId", "warehouseId");
ALTER TABLE "StockMovement"
  ADD COLUMN "valuationVersion" INTEGER,
  ADD COLUMN "valuationSequence" INTEGER,
  ADD COLUMN "valuationQuantityAfter" DECIMAL(20,4),
  ADD COLUMN "valuationValueAfter" DECIMAL(20,4),
  ADD COLUMN "valuationSourceValue" DECIMAL(20,4),
  ADD COLUMN "valuationSourceMovementId" UUID;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_valuationSourceMovementId_fkey"
  FOREIGN KEY ("valuationSourceMovementId") REFERENCES "StockMovement"("id");
CREATE UNIQUE INDEX "StockMovement_valuation_sequence_key" ON "StockMovement"("organizationId", "itemId", "warehouseId", "valuationSequence") WHERE "valuationVersion" = 1;
CREATE INDEX "StockMovement_valuation_source_idx" ON "StockMovement"("organizationId", "valuationSourceMovementId");
CREATE FUNCTION ledgerbyte_immutable_inventory_valuation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."valuationVersion" = 1 THEN
    RAISE EXCEPTION 'Valued inventory movements are immutable; post an open-period correction';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "StockMovement_immutable_valuation" BEFORE UPDATE OR DELETE ON "StockMovement"
  FOR EACH ROW EXECUTE FUNCTION ledgerbyte_immutable_inventory_valuation();
