CREATE TYPE "CustomerRefundStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');

CREATE TYPE "CustomerRefundSourceType" AS ENUM ('CUSTOMER_PAYMENT', 'CREDIT_NOTE');

ALTER TYPE "DocumentType" ADD VALUE 'CUSTOMER_REFUND';

ALTER TYPE "NumberSequenceScope" ADD VALUE 'CUSTOMER_REFUND';

CREATE TABLE "CustomerRefund" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "refundNumber" TEXT NOT NULL,
  "customerId" UUID NOT NULL,
  "sourceType" "CustomerRefundSourceType" NOT NULL,
  "sourcePaymentId" UUID,
  "sourceCreditNoteId" UUID,
  "refundDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "status" "CustomerRefundStatus" NOT NULL DEFAULT 'POSTED',
  "amountRefunded" DECIMAL(20,4) NOT NULL,
  "accountId" UUID NOT NULL,
  "description" TEXT,
  "journalEntryId" UUID,
  "voidReversalJournalEntryId" UUID,
  "createdById" UUID,
  "postedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CustomerRefund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerRefund_journalEntryId_key" ON "CustomerRefund"("journalEntryId");
CREATE UNIQUE INDEX "CustomerRefund_voidReversalJournalEntryId_key" ON "CustomerRefund"("voidReversalJournalEntryId");
CREATE UNIQUE INDEX "CustomerRefund_organizationId_refundNumber_key" ON "CustomerRefund"("organizationId", "refundNumber");
CREATE INDEX "CustomerRefund_organizationId_idx" ON "CustomerRefund"("organizationId");
CREATE INDEX "CustomerRefund_customerId_idx" ON "CustomerRefund"("customerId");
CREATE INDEX "CustomerRefund_sourcePaymentId_idx" ON "CustomerRefund"("sourcePaymentId");
CREATE INDEX "CustomerRefund_sourceCreditNoteId_idx" ON "CustomerRefund"("sourceCreditNoteId");
CREATE INDEX "CustomerRefund_status_idx" ON "CustomerRefund"("status");

ALTER TABLE "CustomerRefund" ADD CONSTRAINT "CustomerRefund_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerRefund" ADD CONSTRAINT "CustomerRefund_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerRefund" ADD CONSTRAINT "CustomerRefund_sourcePaymentId_fkey" FOREIGN KEY ("sourcePaymentId") REFERENCES "CustomerPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerRefund" ADD CONSTRAINT "CustomerRefund_sourceCreditNoteId_fkey" FOREIGN KEY ("sourceCreditNoteId") REFERENCES "CreditNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerRefund" ADD CONSTRAINT "CustomerRefund_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerRefund" ADD CONSTRAINT "CustomerRefund_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerRefund" ADD CONSTRAINT "CustomerRefund_voidReversalJournalEntryId_fkey" FOREIGN KEY ("voidReversalJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerRefund" ADD CONSTRAINT "CustomerRefund_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
