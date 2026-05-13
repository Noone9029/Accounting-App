CREATE TYPE "WarehouseStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TYPE "StockMovementType" AS ENUM (
  'OPENING_BALANCE',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'PURCHASE_RECEIPT_PLACEHOLDER',
  'SALES_ISSUE_PLACEHOLDER'
);

CREATE TABLE "Warehouse" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "WarehouseStatus" NOT NULL DEFAULT 'ACTIVE',
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  "city" TEXT,
  "countryCode" TEXT NOT NULL DEFAULT 'SA',
  "phone" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StockMovement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "itemId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL,
  "movementDate" TIMESTAMP(3) NOT NULL,
  "type" "StockMovementType" NOT NULL,
  "quantity" DECIMAL(20,4) NOT NULL,
  "unitCost" DECIMAL(20,4),
  "totalCost" DECIMAL(20,4),
  "referenceType" TEXT,
  "referenceId" TEXT,
  "description" TEXT,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Warehouse_organizationId_code_key" ON "Warehouse"("organizationId", "code");
CREATE INDEX "Warehouse_organizationId_idx" ON "Warehouse"("organizationId");
CREATE INDEX "Warehouse_organizationId_status_idx" ON "Warehouse"("organizationId", "status");
CREATE INDEX "StockMovement_organizationId_idx" ON "StockMovement"("organizationId");
CREATE INDEX "StockMovement_itemId_idx" ON "StockMovement"("itemId");
CREATE INDEX "StockMovement_warehouseId_idx" ON "StockMovement"("warehouseId");
CREATE INDEX "StockMovement_organizationId_itemId_warehouseId_idx" ON "StockMovement"("organizationId", "itemId", "warehouseId");
CREATE INDEX "StockMovement_organizationId_movementDate_idx" ON "StockMovement"("organizationId", "movementDate");
CREATE INDEX "StockMovement_organizationId_type_idx" ON "StockMovement"("organizationId", "type");

ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
