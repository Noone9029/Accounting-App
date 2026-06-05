-- Add non-posting sales quote/proforma workflow.
ALTER TYPE "NumberSequenceScope" ADD VALUE 'SALES_QUOTE';

CREATE TYPE "SalesQuoteStatus" AS ENUM (
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
  'CONVERTED'
);

CREATE TABLE "SalesQuote" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "quoteNumber" TEXT NOT NULL,
  "customerId" UUID NOT NULL,
  "branchId" UUID,
  "status" "SalesQuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "issueDate" TIMESTAMP(3) NOT NULL,
  "expiryDate" TIMESTAMP(3),
  "reference" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "taxMode" "SalesInvoiceTaxMode" NOT NULL DEFAULT 'TAX_EXCLUSIVE',
  "subtotal" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "discountTotal" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "taxableTotal" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "total" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "terms" TEXT,
  "createdById" UUID,
  "convertedSalesInvoiceId" UUID,
  "convertedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "expiredAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesQuote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesQuoteLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "quoteId" UUID NOT NULL,
  "itemId" UUID,
  "description" TEXT NOT NULL,
  "accountId" UUID NOT NULL,
  "quantity" DECIMAL(20, 4) NOT NULL,
  "unitPrice" DECIMAL(20, 4) NOT NULL,
  "discountRate" DECIMAL(7, 4) NOT NULL DEFAULT 0,
  "taxRateId" UUID,
  "lineGrossAmount" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "taxableAmount" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "lineSubtotal" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesQuoteLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesQuote_organizationId_quoteNumber_key" ON "SalesQuote"("organizationId", "quoteNumber");
CREATE UNIQUE INDEX "SalesQuote_convertedSalesInvoiceId_key" ON "SalesQuote"("convertedSalesInvoiceId");
CREATE INDEX "SalesQuote_organizationId_idx" ON "SalesQuote"("organizationId");
CREATE INDEX "SalesQuote_customerId_idx" ON "SalesQuote"("customerId");
CREATE INDEX "SalesQuote_branchId_idx" ON "SalesQuote"("branchId");
CREATE INDEX "SalesQuote_status_idx" ON "SalesQuote"("status");
CREATE INDEX "SalesQuote_issueDate_idx" ON "SalesQuote"("issueDate");

CREATE INDEX "SalesQuoteLine_organizationId_idx" ON "SalesQuoteLine"("organizationId");
CREATE INDEX "SalesQuoteLine_quoteId_idx" ON "SalesQuoteLine"("quoteId");
CREATE INDEX "SalesQuoteLine_itemId_idx" ON "SalesQuoteLine"("itemId");
CREATE INDEX "SalesQuoteLine_accountId_idx" ON "SalesQuoteLine"("accountId");
CREATE INDEX "SalesQuoteLine_taxRateId_idx" ON "SalesQuoteLine"("taxRateId");

ALTER TABLE "SalesQuote"
  ADD CONSTRAINT "SalesQuote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesQuote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesQuote_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesQuote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesQuote_convertedSalesInvoiceId_fkey" FOREIGN KEY ("convertedSalesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesQuoteLine"
  ADD CONSTRAINT "SalesQuoteLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesQuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "SalesQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesQuoteLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesQuoteLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SalesQuoteLine_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
