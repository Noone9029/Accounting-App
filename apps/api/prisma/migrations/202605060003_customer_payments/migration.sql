CREATE TYPE "CustomerPaymentStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');

CREATE TABLE "CustomerPayment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "paymentNumber" TEXT NOT NULL,
  "customerId" UUID NOT NULL,
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "status" "CustomerPaymentStatus" NOT NULL DEFAULT 'POSTED',
  "amountReceived" DECIMAL(20,4) NOT NULL,
  "unappliedAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "description" TEXT,
  "accountId" UUID NOT NULL,
  "journalEntryId" UUID,
  "voidReversalJournalEntryId" UUID,
  "createdById" UUID,
  "postedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerPaymentAllocation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "paymentId" UUID NOT NULL,
  "invoiceId" UUID NOT NULL,
  "amountApplied" DECIMAL(20,4) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerPaymentAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerPayment_journalEntryId_key" ON "CustomerPayment"("journalEntryId");
CREATE UNIQUE INDEX "CustomerPayment_voidReversalJournalEntryId_key" ON "CustomerPayment"("voidReversalJournalEntryId");
CREATE UNIQUE INDEX "CustomerPayment_organizationId_paymentNumber_key" ON "CustomerPayment"("organizationId", "paymentNumber");

CREATE INDEX "CustomerPayment_organizationId_idx" ON "CustomerPayment"("organizationId");
CREATE INDEX "CustomerPayment_customerId_idx" ON "CustomerPayment"("customerId");
CREATE INDEX "CustomerPayment_status_idx" ON "CustomerPayment"("status");
CREATE INDEX "CustomerPaymentAllocation_organizationId_idx" ON "CustomerPaymentAllocation"("organizationId");
CREATE INDEX "CustomerPaymentAllocation_paymentId_idx" ON "CustomerPaymentAllocation"("paymentId");
CREATE INDEX "CustomerPaymentAllocation_invoiceId_idx" ON "CustomerPaymentAllocation"("invoiceId");

ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_voidReversalJournalEntryId_fkey" FOREIGN KEY ("voidReversalJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentAllocation" ADD CONSTRAINT "CustomerPaymentAllocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentAllocation" ADD CONSTRAINT "CustomerPaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "CustomerPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentAllocation" ADD CONSTRAINT "CustomerPaymentAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
