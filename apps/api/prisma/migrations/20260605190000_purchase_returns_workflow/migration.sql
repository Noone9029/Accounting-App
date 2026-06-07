-- Add controlled operational purchase returns. This is additive and does not
-- create journals, stock movements, debit notes, refunds, AP balance changes,
-- VAT effects, or source document mutations.
CREATE TYPE "PurchaseReturnStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'COMPLETED',
  'VOIDED',
  'CANCELLED'
);

ALTER TYPE "NumberSequenceScope" ADD VALUE IF NOT EXISTS 'PURCHASE_RETURN';

CREATE TABLE "PurchaseReturn" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "supplierId" UUID NOT NULL,
  "purchaseReturnNumber" TEXT NOT NULL,
  "status" "PurchaseReturnStatus" NOT NULL DEFAULT 'DRAFT',
  "returnDate" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "reference" TEXT,
  "sourcePurchaseBillId" UUID,
  "sourcePurchaseOrderId" UUID,
  "sourcePurchaseReceiptId" UUID,
  "sourceMatchingReviewId" UUID,
  "relatedPurchaseDebitNoteId" UUID,
  "relatedSupplierRefundId" UUID,
  "notes" TEXT,
  "createdByUserId" UUID,
  "approvedByUserId" UUID,
  "approvedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseReturn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseReturnLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "purchaseReturnId" UUID NOT NULL,
  "itemId" UUID,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(20,4) NOT NULL,
  "unitCost" DECIMAL(20,4),
  "sourcePurchaseBillLineId" UUID,
  "sourcePurchaseReceiptLineId" UUID,
  "sourcePurchaseOrderLineId" UUID,
  "reason" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseReturnLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PurchaseReturn_organizationId_purchaseReturnNumber_key" ON "PurchaseReturn"("organizationId", "purchaseReturnNumber");
CREATE INDEX "PurchaseReturn_organizationId_idx" ON "PurchaseReturn"("organizationId");
CREATE INDEX "PurchaseReturn_supplierId_idx" ON "PurchaseReturn"("supplierId");
CREATE INDEX "PurchaseReturn_status_idx" ON "PurchaseReturn"("status");
CREATE INDEX "PurchaseReturn_sourcePurchaseBillId_idx" ON "PurchaseReturn"("sourcePurchaseBillId");
CREATE INDEX "PurchaseReturn_sourcePurchaseOrderId_idx" ON "PurchaseReturn"("sourcePurchaseOrderId");
CREATE INDEX "PurchaseReturn_sourcePurchaseReceiptId_idx" ON "PurchaseReturn"("sourcePurchaseReceiptId");
CREATE INDEX "PurchaseReturn_sourceMatchingReviewId_idx" ON "PurchaseReturn"("sourceMatchingReviewId");
CREATE INDEX "PurchaseReturn_relatedPurchaseDebitNoteId_idx" ON "PurchaseReturn"("relatedPurchaseDebitNoteId");
CREATE INDEX "PurchaseReturn_relatedSupplierRefundId_idx" ON "PurchaseReturn"("relatedSupplierRefundId");
CREATE INDEX "PurchaseReturn_organizationId_returnDate_idx" ON "PurchaseReturn"("organizationId", "returnDate");

CREATE INDEX "PurchaseReturnLine_organizationId_idx" ON "PurchaseReturnLine"("organizationId");
CREATE INDEX "PurchaseReturnLine_purchaseReturnId_idx" ON "PurchaseReturnLine"("purchaseReturnId");
CREATE INDEX "PurchaseReturnLine_itemId_idx" ON "PurchaseReturnLine"("itemId");
CREATE INDEX "PurchaseReturnLine_sourcePurchaseBillLineId_idx" ON "PurchaseReturnLine"("sourcePurchaseBillLineId");
CREATE INDEX "PurchaseReturnLine_sourcePurchaseReceiptLineId_idx" ON "PurchaseReturnLine"("sourcePurchaseReceiptLineId");
CREATE INDEX "PurchaseReturnLine_sourcePurchaseOrderLineId_idx" ON "PurchaseReturnLine"("sourcePurchaseOrderLineId");

ALTER TABLE "PurchaseReturn"
  ADD CONSTRAINT "PurchaseReturn_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReturn_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReturn_sourcePurchaseBillId_fkey" FOREIGN KEY ("sourcePurchaseBillId") REFERENCES "PurchaseBill"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReturn_sourcePurchaseOrderId_fkey" FOREIGN KEY ("sourcePurchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReturn_sourcePurchaseReceiptId_fkey" FOREIGN KEY ("sourcePurchaseReceiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReturn_sourceMatchingReviewId_fkey" FOREIGN KEY ("sourceMatchingReviewId") REFERENCES "PurchaseMatchingReview"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReturn_relatedPurchaseDebitNoteId_fkey" FOREIGN KEY ("relatedPurchaseDebitNoteId") REFERENCES "PurchaseDebitNote"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReturn_relatedSupplierRefundId_fkey" FOREIGN KEY ("relatedSupplierRefundId") REFERENCES "SupplierRefund"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReturn_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReturn_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseReturnLine"
  ADD CONSTRAINT "PurchaseReturnLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReturnLine_purchaseReturnId_fkey" FOREIGN KEY ("purchaseReturnId") REFERENCES "PurchaseReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReturnLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReturnLine_sourcePurchaseBillLineId_fkey" FOREIGN KEY ("sourcePurchaseBillLineId") REFERENCES "PurchaseBillLine"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReturnLine_sourcePurchaseReceiptLineId_fkey" FOREIGN KEY ("sourcePurchaseReceiptLineId") REFERENCES "PurchaseReceiptLine"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseReturnLine_sourcePurchaseOrderLineId_fkey" FOREIGN KEY ("sourcePurchaseOrderLineId") REFERENCES "PurchaseOrderLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
