-- Add optional serial, batch, bin/location traceability groundwork without changing existing quantities, valuation, FIFO, COGS, journals, AP/AR, VAT, or ZATCA behavior.
CREATE TYPE "ItemTrackingMode" AS ENUM ('NONE', 'SERIAL', 'BATCH', 'SERIAL_AND_BATCH');
CREATE TYPE "InventoryBinLocationType" AS ENUM ('BIN', 'SHELF', 'ZONE', 'STAGING', 'RECEIVING', 'SHIPPING', 'IN_TRANSIT', 'RETURNS', 'QUARANTINE', 'OTHER');
CREATE TYPE "InventoryBinLocationStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "InventoryBatchStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'QUARANTINED', 'CLOSED');
CREATE TYPE "InventorySerialNumberStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'ISSUED', 'RETURNED', 'QUARANTINED', 'LOST', 'SCRAPPED');

ALTER TABLE "Item"
  ADD COLUMN "trackingMode" "ItemTrackingMode" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "expiryTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "binTrackingEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "InventoryBinLocation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "InventoryBinLocationType" NOT NULL DEFAULT 'BIN',
  "status" "InventoryBinLocationStatus" NOT NULL DEFAULT 'ACTIVE',
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InventoryBinLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryBatch" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "itemId" UUID NOT NULL,
  "batchNumber" TEXT NOT NULL,
  "lotNumber" TEXT,
  "manufactureDate" TIMESTAMP(3),
  "expiryDate" TIMESTAMP(3),
  "status" "InventoryBatchStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventorySerialNumber" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "itemId" UUID NOT NULL,
  "serialNumber" TEXT NOT NULL,
  "batchId" UUID,
  "status" "InventorySerialNumberStatus" NOT NULL DEFAULT 'AVAILABLE',
  "currentWarehouseId" UUID,
  "currentBinLocationId" UUID,
  "lastMovementId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InventorySerialNumber_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StockMovement"
  ADD COLUMN "batchId" UUID,
  ADD COLUMN "serialNumberId" UUID,
  ADD COLUMN "binLocationId" UUID,
  ADD COLUMN "fromBinLocationId" UUID,
  ADD COLUMN "toBinLocationId" UUID;

CREATE UNIQUE INDEX "InventoryBinLocation_organizationId_warehouseId_code_key" ON "InventoryBinLocation"("organizationId", "warehouseId", "code");
CREATE INDEX "InventoryBinLocation_organizationId_idx" ON "InventoryBinLocation"("organizationId");
CREATE INDEX "InventoryBinLocation_warehouseId_idx" ON "InventoryBinLocation"("warehouseId");
CREATE INDEX "InventoryBinLocation_organizationId_warehouseId_idx" ON "InventoryBinLocation"("organizationId", "warehouseId");
CREATE INDEX "InventoryBinLocation_organizationId_type_idx" ON "InventoryBinLocation"("organizationId", "type");
CREATE INDEX "InventoryBinLocation_organizationId_status_idx" ON "InventoryBinLocation"("organizationId", "status");

CREATE UNIQUE INDEX "InventoryBatch_organizationId_itemId_batchNumber_key" ON "InventoryBatch"("organizationId", "itemId", "batchNumber");
CREATE INDEX "InventoryBatch_organizationId_idx" ON "InventoryBatch"("organizationId");
CREATE INDEX "InventoryBatch_itemId_idx" ON "InventoryBatch"("itemId");
CREATE INDEX "InventoryBatch_organizationId_status_idx" ON "InventoryBatch"("organizationId", "status");
CREATE INDEX "InventoryBatch_organizationId_expiryDate_idx" ON "InventoryBatch"("organizationId", "expiryDate");

CREATE UNIQUE INDEX "InventorySerialNumber_organizationId_itemId_serialNumber_key" ON "InventorySerialNumber"("organizationId", "itemId", "serialNumber");
CREATE INDEX "InventorySerialNumber_organizationId_idx" ON "InventorySerialNumber"("organizationId");
CREATE INDEX "InventorySerialNumber_itemId_idx" ON "InventorySerialNumber"("itemId");
CREATE INDEX "InventorySerialNumber_batchId_idx" ON "InventorySerialNumber"("batchId");
CREATE INDEX "InventorySerialNumber_currentWarehouseId_idx" ON "InventorySerialNumber"("currentWarehouseId");
CREATE INDEX "InventorySerialNumber_currentBinLocationId_idx" ON "InventorySerialNumber"("currentBinLocationId");
CREATE INDEX "InventorySerialNumber_lastMovementId_idx" ON "InventorySerialNumber"("lastMovementId");
CREATE INDEX "InventorySerialNumber_organizationId_status_idx" ON "InventorySerialNumber"("organizationId", "status");

CREATE INDEX "StockMovement_batchId_idx" ON "StockMovement"("batchId");
CREATE INDEX "StockMovement_serialNumberId_idx" ON "StockMovement"("serialNumberId");
CREATE INDEX "StockMovement_binLocationId_idx" ON "StockMovement"("binLocationId");
CREATE INDEX "StockMovement_fromBinLocationId_idx" ON "StockMovement"("fromBinLocationId");
CREATE INDEX "StockMovement_toBinLocationId_idx" ON "StockMovement"("toBinLocationId");

ALTER TABLE "InventoryBinLocation"
  ADD CONSTRAINT "InventoryBinLocation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryBinLocation_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryBatch"
  ADD CONSTRAINT "InventoryBatch_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryBatch_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventorySerialNumber"
  ADD CONSTRAINT "InventorySerialNumber_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "InventorySerialNumber_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InventorySerialNumber_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "InventoryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "InventorySerialNumber_currentWarehouseId_fkey"
  FOREIGN KEY ("currentWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "InventorySerialNumber_currentBinLocationId_fkey"
  FOREIGN KEY ("currentBinLocationId") REFERENCES "InventoryBinLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "InventorySerialNumber_lastMovementId_fkey"
  FOREIGN KEY ("lastMovementId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StockMovement"
  ADD CONSTRAINT "StockMovement_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "InventoryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "StockMovement_serialNumberId_fkey"
  FOREIGN KEY ("serialNumberId") REFERENCES "InventorySerialNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "StockMovement_binLocationId_fkey"
  FOREIGN KEY ("binLocationId") REFERENCES "InventoryBinLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "StockMovement_fromBinLocationId_fkey"
  FOREIGN KEY ("fromBinLocationId") REFERENCES "InventoryBinLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "StockMovement_toBinLocationId_fkey"
  FOREIGN KEY ("toBinLocationId") REFERENCES "InventoryBinLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
