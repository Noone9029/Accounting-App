-- CreateEnum
CREATE TYPE "InventoryAdjustmentStatus" AS ENUM ('DRAFT', 'APPROVED', 'VOIDED');

-- CreateEnum
CREATE TYPE "InventoryAdjustmentType" AS ENUM ('INCREASE', 'DECREASE');

-- CreateEnum
CREATE TYPE "WarehouseTransferStatus" AS ENUM ('POSTED', 'VOIDED');

-- AlterEnum
ALTER TYPE "NumberSequenceScope" ADD VALUE 'INVENTORY_ADJUSTMENT';
ALTER TYPE "NumberSequenceScope" ADD VALUE 'WAREHOUSE_TRANSFER';

-- CreateTable
CREATE TABLE "InventoryAdjustment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "adjustmentNumber" TEXT NOT NULL,
    "itemId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "type" "InventoryAdjustmentType" NOT NULL,
    "status" "InventoryAdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
    "adjustmentDate" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(20,4) NOT NULL,
    "unitCost" DECIMAL(20,4),
    "totalCost" DECIMAL(20,4),
    "reason" TEXT,
    "createdById" UUID,
    "approvedById" UUID,
    "voidedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "stockMovementId" UUID,
    "voidStockMovementId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseTransfer" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "itemId" UUID NOT NULL,
    "fromWarehouseId" UUID NOT NULL,
    "toWarehouseId" UUID NOT NULL,
    "status" "WarehouseTransferStatus" NOT NULL DEFAULT 'POSTED',
    "transferDate" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(20,4) NOT NULL,
    "unitCost" DECIMAL(20,4),
    "totalCost" DECIMAL(20,4),
    "description" TEXT,
    "createdById" UUID,
    "postedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "fromStockMovementId" UUID,
    "toStockMovementId" UUID,
    "voidFromStockMovementId" UUID,
    "voidToStockMovementId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryAdjustment_stockMovementId_key" ON "InventoryAdjustment"("stockMovementId");
CREATE UNIQUE INDEX "InventoryAdjustment_voidStockMovementId_key" ON "InventoryAdjustment"("voidStockMovementId");
CREATE UNIQUE INDEX "InventoryAdjustment_organizationId_adjustmentNumber_key" ON "InventoryAdjustment"("organizationId", "adjustmentNumber");
CREATE INDEX "InventoryAdjustment_organizationId_idx" ON "InventoryAdjustment"("organizationId");
CREATE INDEX "InventoryAdjustment_itemId_idx" ON "InventoryAdjustment"("itemId");
CREATE INDEX "InventoryAdjustment_warehouseId_idx" ON "InventoryAdjustment"("warehouseId");
CREATE INDEX "InventoryAdjustment_organizationId_status_idx" ON "InventoryAdjustment"("organizationId", "status");
CREATE INDEX "InventoryAdjustment_organizationId_adjustmentDate_idx" ON "InventoryAdjustment"("organizationId", "adjustmentDate");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseTransfer_fromStockMovementId_key" ON "WarehouseTransfer"("fromStockMovementId");
CREATE UNIQUE INDEX "WarehouseTransfer_toStockMovementId_key" ON "WarehouseTransfer"("toStockMovementId");
CREATE UNIQUE INDEX "WarehouseTransfer_voidFromStockMovementId_key" ON "WarehouseTransfer"("voidFromStockMovementId");
CREATE UNIQUE INDEX "WarehouseTransfer_voidToStockMovementId_key" ON "WarehouseTransfer"("voidToStockMovementId");
CREATE UNIQUE INDEX "WarehouseTransfer_organizationId_transferNumber_key" ON "WarehouseTransfer"("organizationId", "transferNumber");
CREATE INDEX "WarehouseTransfer_organizationId_idx" ON "WarehouseTransfer"("organizationId");
CREATE INDEX "WarehouseTransfer_itemId_idx" ON "WarehouseTransfer"("itemId");
CREATE INDEX "WarehouseTransfer_fromWarehouseId_idx" ON "WarehouseTransfer"("fromWarehouseId");
CREATE INDEX "WarehouseTransfer_toWarehouseId_idx" ON "WarehouseTransfer"("toWarehouseId");
CREATE INDEX "WarehouseTransfer_organizationId_status_idx" ON "WarehouseTransfer"("organizationId", "status");
CREATE INDEX "WarehouseTransfer_organizationId_transferDate_idx" ON "WarehouseTransfer"("organizationId", "transferDate");

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_stockMovementId_fkey" FOREIGN KEY ("stockMovementId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_voidStockMovementId_fkey" FOREIGN KEY ("voidStockMovementId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_fromStockMovementId_fkey" FOREIGN KEY ("fromStockMovementId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_toStockMovementId_fkey" FOREIGN KEY ("toStockMovementId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_voidFromStockMovementId_fkey" FOREIGN KEY ("voidFromStockMovementId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_voidToStockMovementId_fkey" FOREIGN KEY ("voidToStockMovementId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
