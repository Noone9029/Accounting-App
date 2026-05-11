CREATE TYPE "CreditNoteStatus" AS ENUM ('DRAFT', 'FINALIZED', 'VOIDED');

ALTER TYPE "DocumentType" ADD VALUE 'CREDIT_NOTE';

CREATE TABLE "CreditNote" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "creditNoteNumber" TEXT NOT NULL,
  "customerId" UUID NOT NULL,
  "originalInvoiceId" UUID,
  "branchId" UUID,
  "issueDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "status" "CreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
  "subtotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "discountTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "taxableTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "total" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "unappliedAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "reason" TEXT,
  "createdById" UUID,
  "finalizedAt" TIMESTAMP(3),
  "journalEntryId" UUID,
  "reversalJournalEntryId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditNoteLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "creditNoteId" UUID NOT NULL,
  "itemId" UUID,
  "description" TEXT NOT NULL,
  "accountId" UUID NOT NULL,
  "quantity" DECIMAL(20,4) NOT NULL,
  "unitPrice" DECIMAL(20,4) NOT NULL,
  "discountRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
  "taxRateId" UUID,
  "lineGrossAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "taxableAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreditNoteLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreditNote_journalEntryId_key" ON "CreditNote"("journalEntryId");
CREATE UNIQUE INDEX "CreditNote_reversalJournalEntryId_key" ON "CreditNote"("reversalJournalEntryId");
CREATE UNIQUE INDEX "CreditNote_organizationId_creditNoteNumber_key" ON "CreditNote"("organizationId", "creditNoteNumber");

CREATE INDEX "CreditNote_organizationId_idx" ON "CreditNote"("organizationId");
CREATE INDEX "CreditNote_customerId_idx" ON "CreditNote"("customerId");
CREATE INDEX "CreditNote_originalInvoiceId_idx" ON "CreditNote"("originalInvoiceId");
CREATE INDEX "CreditNote_status_idx" ON "CreditNote"("status");
CREATE INDEX "CreditNoteLine_organizationId_idx" ON "CreditNoteLine"("organizationId");
CREATE INDEX "CreditNoteLine_creditNoteId_idx" ON "CreditNoteLine"("creditNoteId");
CREATE INDEX "CreditNoteLine_itemId_idx" ON "CreditNoteLine"("itemId");
CREATE INDEX "CreditNoteLine_accountId_idx" ON "CreditNoteLine"("accountId");

ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_reversalJournalEntryId_fkey" FOREIGN KEY ("reversalJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreditNoteLine" ADD CONSTRAINT "CreditNoteLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditNoteLine" ADD CONSTRAINT "CreditNoteLine_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditNoteLine" ADD CONSTRAINT "CreditNoteLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreditNoteLine" ADD CONSTRAINT "CreditNoteLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditNoteLine" ADD CONSTRAINT "CreditNoteLine_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
