-- Operational purchase receiving and sales stock issue documents. No GL posting.
CREATE TYPE "PurchaseReceiptStatus" AS ENUM ('POSTED', 'VOIDED');
CREATE TYPE "SalesStockIssueStatus" AS ENUM ('POSTED', 'VOIDED');

ALTER TYPE "NumberSequenceScope" ADD VALUE 'PURCHASE_RECEIPT';
ALTER TYPE "NumberSequenceScope" ADD VALUE 'SALES_STOCK_ISSUE';

CREATE TABLE "PurchaseReceipt" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "receiptNumber" TEXT NOT NULL,
  "purchaseOrderId" UUID,
  "purchaseBillId" UUID,
  "supplierId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL,
  "receiptDate" TIMESTAMP(3) NOT NULL,
  "status" "PurchaseReceiptStatus" NOT NULL DEFAULT 'POSTED',
  "notes" TEXT,
  "createdById" UUID,
  "postedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseReceiptLine" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "receiptId" UUID NOT NULL,
  "itemId" UUID NOT NULL,
  "purchaseOrderLineId" UUID,
  "purchaseBillLineId" UUID,
  "quantity" DECIMAL(20,4) NOT NULL,
  "unitCost" DECIMAL(20,4),
  "stockMovementId" UUID,
  "voidStockMovementId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PurchaseReceiptLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesStockIssue" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "issueNumber" TEXT NOT NULL,
  "salesInvoiceId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL,
  "issueDate" TIMESTAMP(3) NOT NULL,
  "status" "SalesStockIssueStatus" NOT NULL DEFAULT 'POSTED',
  "notes" TEXT,
  "createdById" UUID,
  "postedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SalesStockIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesStockIssueLine" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "issueId" UUID NOT NULL,
  "itemId" UUID NOT NULL,
  "salesInvoiceLineId" UUID,
  "quantity" DECIMAL(20,4) NOT NULL,
  "unitCost" DECIMAL(20,4),
  "stockMovementId" UUID,
  "voidStockMovementId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SalesStockIssueLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PurchaseReceipt_organizationId_receiptNumber_key" ON "PurchaseReceipt"("organizationId", "receiptNumber");
CREATE INDEX "PurchaseReceipt_organizationId_idx" ON "PurchaseReceipt"("organizationId");
CREATE INDEX "PurchaseReceipt_purchaseOrderId_idx" ON "PurchaseReceipt"("purchaseOrderId");
CREATE INDEX "PurchaseReceipt_purchaseBillId_idx" ON "PurchaseReceipt"("purchaseBillId");
CREATE INDEX "PurchaseReceipt_supplierId_idx" ON "PurchaseReceipt"("supplierId");
CREATE INDEX "PurchaseReceipt_warehouseId_idx" ON "PurchaseReceipt"("warehouseId");
CREATE INDEX "PurchaseReceipt_organizationId_status_idx" ON "PurchaseReceipt"("organizationId", "status");
CREATE INDEX "PurchaseReceipt_organizationId_receiptDate_idx" ON "PurchaseReceipt"("organizationId", "receiptDate");

CREATE UNIQUE INDEX "PurchaseReceiptLine_stockMovementId_key" ON "PurchaseReceiptLine"("stockMovementId");
CREATE UNIQUE INDEX "PurchaseReceiptLine_voidStockMovementId_key" ON "PurchaseReceiptLine"("voidStockMovementId");
CREATE INDEX "PurchaseReceiptLine_organizationId_idx" ON "PurchaseReceiptLine"("organizationId");
CREATE INDEX "PurchaseReceiptLine_receiptId_idx" ON "PurchaseReceiptLine"("receiptId");
CREATE INDEX "PurchaseReceiptLine_itemId_idx" ON "PurchaseReceiptLine"("itemId");
CREATE INDEX "PurchaseReceiptLine_purchaseOrderLineId_idx" ON "PurchaseReceiptLine"("purchaseOrderLineId");
CREATE INDEX "PurchaseReceiptLine_purchaseBillLineId_idx" ON "PurchaseReceiptLine"("purchaseBillLineId");

CREATE UNIQUE INDEX "SalesStockIssue_organizationId_issueNumber_key" ON "SalesStockIssue"("organizationId", "issueNumber");
CREATE INDEX "SalesStockIssue_organizationId_idx" ON "SalesStockIssue"("organizationId");
CREATE INDEX "SalesStockIssue_salesInvoiceId_idx" ON "SalesStockIssue"("salesInvoiceId");
CREATE INDEX "SalesStockIssue_customerId_idx" ON "SalesStockIssue"("customerId");
CREATE INDEX "SalesStockIssue_warehouseId_idx" ON "SalesStockIssue"("warehouseId");
CREATE INDEX "SalesStockIssue_organizationId_status_idx" ON "SalesStockIssue"("organizationId", "status");
CREATE INDEX "SalesStockIssue_organizationId_issueDate_idx" ON "SalesStockIssue"("organizationId", "issueDate");

CREATE UNIQUE INDEX "SalesStockIssueLine_stockMovementId_key" ON "SalesStockIssueLine"("stockMovementId");
CREATE UNIQUE INDEX "SalesStockIssueLine_voidStockMovementId_key" ON "SalesStockIssueLine"("voidStockMovementId");
CREATE INDEX "SalesStockIssueLine_organizationId_idx" ON "SalesStockIssueLine"("organizationId");
CREATE INDEX "SalesStockIssueLine_issueId_idx" ON "SalesStockIssueLine"("issueId");
CREATE INDEX "SalesStockIssueLine_itemId_idx" ON "SalesStockIssueLine"("itemId");
CREATE INDEX "SalesStockIssueLine_salesInvoiceLineId_idx" ON "SalesStockIssueLine"("salesInvoiceLineId");

ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_purchaseBillId_fkey" FOREIGN KEY ("purchaseBillId") REFERENCES "PurchaseBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES "PurchaseOrderLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_purchaseBillLineId_fkey" FOREIGN KEY ("purchaseBillLineId") REFERENCES "PurchaseBillLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_stockMovementId_fkey" FOREIGN KEY ("stockMovementId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_voidStockMovementId_fkey" FOREIGN KEY ("voidStockMovementId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesStockIssue" ADD CONSTRAINT "SalesStockIssue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesStockIssue" ADD CONSTRAINT "SalesStockIssue_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesStockIssue" ADD CONSTRAINT "SalesStockIssue_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesStockIssue" ADD CONSTRAINT "SalesStockIssue_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesStockIssue" ADD CONSTRAINT "SalesStockIssue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesStockIssueLine" ADD CONSTRAINT "SalesStockIssueLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesStockIssueLine" ADD CONSTRAINT "SalesStockIssueLine_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "SalesStockIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesStockIssueLine" ADD CONSTRAINT "SalesStockIssueLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesStockIssueLine" ADD CONSTRAINT "SalesStockIssueLine_salesInvoiceLineId_fkey" FOREIGN KEY ("salesInvoiceLineId") REFERENCES "SalesInvoiceLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesStockIssueLine" ADD CONSTRAINT "SalesStockIssueLine_stockMovementId_fkey" FOREIGN KEY ("stockMovementId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesStockIssueLine" ADD CONSTRAINT "SalesStockIssueLine_voidStockMovementId_fkey" FOREIGN KEY ("voidStockMovementId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
