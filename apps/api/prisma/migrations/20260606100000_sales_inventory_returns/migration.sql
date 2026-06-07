-- Add explicit customer-side operational inventory return documents without changing AR/VAT/ZATCA/accounting behavior.
CREATE TYPE "SalesInventoryReturnStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'RECEIVED', 'VOIDED', 'CANCELLED');

ALTER TYPE "NumberSequenceScope" ADD VALUE IF NOT EXISTS 'SALES_INVENTORY_RETURN';

CREATE TABLE "SalesInventoryReturn" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "salesReturnNumber" TEXT NOT NULL,
  "status" "SalesInventoryReturnStatus" NOT NULL DEFAULT 'DRAFT',
  "returnDate" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "reference" TEXT,
  "sourceSalesInvoiceId" UUID,
  "sourceCreditNoteId" UUID,
  "sourceDeliveryNoteId" UUID,
  "sourceSalesStockIssueId" UUID,
  "notes" TEXT,
  "createdByUserId" UUID,
  "approvedByUserId" UUID,
  "inventoryReturnPostedByUserId" UUID,
  "approvedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "inventoryReturnPostedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SalesInventoryReturn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesInventoryReturnLine" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "salesInventoryReturnId" UUID NOT NULL,
  "itemId" UUID,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(20,4) NOT NULL,
  "sourceSalesInvoiceLineId" UUID,
  "sourceCreditNoteLineId" UUID,
  "sourceDeliveryNoteLineId" UUID,
  "sourceSalesStockIssueLineId" UUID,
  "warehouseId" UUID,
  "stockMovementId" UUID,
  "reason" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SalesInventoryReturnLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesInventoryReturn_organizationId_salesReturnNumber_key" ON "SalesInventoryReturn"("organizationId", "salesReturnNumber");
CREATE INDEX "SalesInventoryReturn_organizationId_idx" ON "SalesInventoryReturn"("organizationId");
CREATE INDEX "SalesInventoryReturn_customerId_idx" ON "SalesInventoryReturn"("customerId");
CREATE INDEX "SalesInventoryReturn_status_idx" ON "SalesInventoryReturn"("status");
CREATE INDEX "SalesInventoryReturn_returnDate_idx" ON "SalesInventoryReturn"("returnDate");
CREATE INDEX "SalesInventoryReturn_sourceSalesInvoiceId_idx" ON "SalesInventoryReturn"("sourceSalesInvoiceId");
CREATE INDEX "SalesInventoryReturn_sourceCreditNoteId_idx" ON "SalesInventoryReturn"("sourceCreditNoteId");
CREATE INDEX "SalesInventoryReturn_sourceDeliveryNoteId_idx" ON "SalesInventoryReturn"("sourceDeliveryNoteId");
CREATE INDEX "SalesInventoryReturn_sourceSalesStockIssueId_idx" ON "SalesInventoryReturn"("sourceSalesStockIssueId");
CREATE INDEX "SalesInventoryReturn_inventoryReturnPostedByUserId_idx" ON "SalesInventoryReturn"("inventoryReturnPostedByUserId");

CREATE UNIQUE INDEX "SalesInventoryReturnLine_stockMovementId_key" ON "SalesInventoryReturnLine"("stockMovementId");
CREATE INDEX "SalesInventoryReturnLine_organizationId_idx" ON "SalesInventoryReturnLine"("organizationId");
CREATE INDEX "SalesInventoryReturnLine_salesInventoryReturnId_idx" ON "SalesInventoryReturnLine"("salesInventoryReturnId");
CREATE INDEX "SalesInventoryReturnLine_itemId_idx" ON "SalesInventoryReturnLine"("itemId");
CREATE INDEX "SalesInventoryReturnLine_warehouseId_idx" ON "SalesInventoryReturnLine"("warehouseId");
CREATE INDEX "SalesInventoryReturnLine_sourceSalesInvoiceLineId_idx" ON "SalesInventoryReturnLine"("sourceSalesInvoiceLineId");
CREATE INDEX "SalesInventoryReturnLine_sourceCreditNoteLineId_idx" ON "SalesInventoryReturnLine"("sourceCreditNoteLineId");
CREATE INDEX "SalesInventoryReturnLine_sourceDeliveryNoteLineId_idx" ON "SalesInventoryReturnLine"("sourceDeliveryNoteLineId");
CREATE INDEX "SalesInventoryReturnLine_sourceSalesStockIssueLineId_idx" ON "SalesInventoryReturnLine"("sourceSalesStockIssueLineId");

ALTER TABLE "SalesInventoryReturn"
  ADD CONSTRAINT "SalesInventoryReturn_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesInventoryReturn_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesInventoryReturn_sourceSalesInvoiceId_fkey"
  FOREIGN KEY ("sourceSalesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesInventoryReturn_sourceCreditNoteId_fkey"
  FOREIGN KEY ("sourceCreditNoteId") REFERENCES "CreditNote"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesInventoryReturn_sourceDeliveryNoteId_fkey"
  FOREIGN KEY ("sourceDeliveryNoteId") REFERENCES "DeliveryNote"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesInventoryReturn_sourceSalesStockIssueId_fkey"
  FOREIGN KEY ("sourceSalesStockIssueId") REFERENCES "SalesStockIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesInventoryReturn_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesInventoryReturn_approvedByUserId_fkey"
  FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesInventoryReturn_inventoryReturnPostedByUserId_fkey"
  FOREIGN KEY ("inventoryReturnPostedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesInventoryReturnLine"
  ADD CONSTRAINT "SalesInventoryReturnLine_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesInventoryReturnLine_salesInventoryReturnId_fkey"
  FOREIGN KEY ("salesInventoryReturnId") REFERENCES "SalesInventoryReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesInventoryReturnLine_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesInventoryReturnLine_sourceSalesInvoiceLineId_fkey"
  FOREIGN KEY ("sourceSalesInvoiceLineId") REFERENCES "SalesInvoiceLine"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesInventoryReturnLine_sourceCreditNoteLineId_fkey"
  FOREIGN KEY ("sourceCreditNoteLineId") REFERENCES "CreditNoteLine"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesInventoryReturnLine_sourceDeliveryNoteLineId_fkey"
  FOREIGN KEY ("sourceDeliveryNoteLineId") REFERENCES "DeliveryNoteLine"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesInventoryReturnLine_sourceSalesStockIssueLineId_fkey"
  FOREIGN KEY ("sourceSalesStockIssueLineId") REFERENCES "SalesStockIssueLine"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesInventoryReturnLine_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesInventoryReturnLine_stockMovementId_fkey"
  FOREIGN KEY ("stockMovementId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
