-- Add non-posting delivery note workflow for Sales/AR fulfillment documentation.
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'DELIVERY_NOTE';
ALTER TYPE "NumberSequenceScope" ADD VALUE IF NOT EXISTS 'DELIVERY_NOTE';

CREATE TYPE "DeliveryNoteStatus" AS ENUM (
  'DRAFT',
  'ISSUED',
  'DELIVERED',
  'CANCELLED',
  'VOIDED'
);

CREATE TABLE "DeliveryNote" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "deliveryNoteNumber" TEXT NOT NULL,
  "customerId" UUID NOT NULL,
  "branchId" UUID,
  "status" "DeliveryNoteStatus" NOT NULL DEFAULT 'DRAFT',
  "issueDate" TIMESTAMP(3) NOT NULL,
  "deliveryDate" TIMESTAMP(3),
  "reference" TEXT,
  "relatedSalesInvoiceId" UUID,
  "relatedSalesQuoteId" UUID,
  "relatedSalesStockIssueId" UUID,
  "deliveryAddress" TEXT,
  "notes" TEXT,
  "instructions" TEXT,
  "createdById" UUID,
  "issuedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliveryNoteLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "deliveryNoteId" UUID NOT NULL,
  "itemId" UUID,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(20, 4) NOT NULL,
  "unitOfMeasure" TEXT,
  "sourceSalesInvoiceLineId" UUID,
  "sourceSalesQuoteLineId" UUID,
  "sourceSalesStockIssueLineId" UUID,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryNoteLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryNote_organizationId_deliveryNoteNumber_key" ON "DeliveryNote"("organizationId", "deliveryNoteNumber");
CREATE INDEX "DeliveryNote_organizationId_idx" ON "DeliveryNote"("organizationId");
CREATE INDEX "DeliveryNote_customerId_idx" ON "DeliveryNote"("customerId");
CREATE INDEX "DeliveryNote_branchId_idx" ON "DeliveryNote"("branchId");
CREATE INDEX "DeliveryNote_status_idx" ON "DeliveryNote"("status");
CREATE INDEX "DeliveryNote_issueDate_idx" ON "DeliveryNote"("issueDate");
CREATE INDEX "DeliveryNote_deliveryDate_idx" ON "DeliveryNote"("deliveryDate");
CREATE INDEX "DeliveryNote_relatedSalesInvoiceId_idx" ON "DeliveryNote"("relatedSalesInvoiceId");
CREATE INDEX "DeliveryNote_relatedSalesQuoteId_idx" ON "DeliveryNote"("relatedSalesQuoteId");
CREATE INDEX "DeliveryNote_relatedSalesStockIssueId_idx" ON "DeliveryNote"("relatedSalesStockIssueId");

CREATE INDEX "DeliveryNoteLine_organizationId_idx" ON "DeliveryNoteLine"("organizationId");
CREATE INDEX "DeliveryNoteLine_deliveryNoteId_idx" ON "DeliveryNoteLine"("deliveryNoteId");
CREATE INDEX "DeliveryNoteLine_itemId_idx" ON "DeliveryNoteLine"("itemId");
CREATE INDEX "DeliveryNoteLine_sourceSalesInvoiceLineId_idx" ON "DeliveryNoteLine"("sourceSalesInvoiceLineId");
CREATE INDEX "DeliveryNoteLine_sourceSalesQuoteLineId_idx" ON "DeliveryNoteLine"("sourceSalesQuoteLineId");
CREATE INDEX "DeliveryNoteLine_sourceSalesStockIssueLineId_idx" ON "DeliveryNoteLine"("sourceSalesStockIssueLineId");

ALTER TABLE "DeliveryNote"
  ADD CONSTRAINT "DeliveryNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DeliveryNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DeliveryNote_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "DeliveryNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "DeliveryNote_relatedSalesInvoiceId_fkey" FOREIGN KEY ("relatedSalesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "DeliveryNote_relatedSalesQuoteId_fkey" FOREIGN KEY ("relatedSalesQuoteId") REFERENCES "SalesQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "DeliveryNote_relatedSalesStockIssueId_fkey" FOREIGN KEY ("relatedSalesStockIssueId") REFERENCES "SalesStockIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeliveryNoteLine"
  ADD CONSTRAINT "DeliveryNoteLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DeliveryNoteLine_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DeliveryNoteLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "DeliveryNoteLine_sourceSalesInvoiceLineId_fkey" FOREIGN KEY ("sourceSalesInvoiceLineId") REFERENCES "SalesInvoiceLine"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "DeliveryNoteLine_sourceSalesQuoteLineId_fkey" FOREIGN KEY ("sourceSalesQuoteLineId") REFERENCES "SalesQuoteLine"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "DeliveryNoteLine_sourceSalesStockIssueLineId_fkey" FOREIGN KEY ("sourceSalesStockIssueLineId") REFERENCES "SalesStockIssueLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
