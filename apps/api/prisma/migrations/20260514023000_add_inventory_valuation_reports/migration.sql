-- Inventory valuation settings are operational/reporting only.
CREATE TYPE "InventoryValuationMethod" AS ENUM ('MOVING_AVERAGE', 'FIFO_PLACEHOLDER');

ALTER TABLE "Item"
ADD COLUMN "reorderPoint" DECIMAL(20,4),
ADD COLUMN "reorderQuantity" DECIMAL(20,4);

CREATE TABLE "InventorySettings" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "valuationMethod" "InventoryValuationMethod" NOT NULL DEFAULT 'MOVING_AVERAGE',
  "allowNegativeStock" BOOLEAN NOT NULL DEFAULT false,
  "trackInventoryValue" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InventorySettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventorySettings_organizationId_key" ON "InventorySettings"("organizationId");
CREATE INDEX "InventorySettings_organizationId_idx" ON "InventorySettings"("organizationId");

ALTER TABLE "InventorySettings"
ADD CONSTRAINT "InventorySettings_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
