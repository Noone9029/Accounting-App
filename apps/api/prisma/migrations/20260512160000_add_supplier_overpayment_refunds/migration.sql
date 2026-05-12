CREATE TYPE "SupplierRefundStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');

CREATE TYPE "SupplierRefundSourceType" AS ENUM ('SUPPLIER_PAYMENT', 'PURCHASE_DEBIT_NOTE');

ALTER TYPE "DocumentType" ADD VALUE 'SUPPLIER_REFUND';

ALTER TYPE "NumberSequenceScope" ADD VALUE 'SUPPLIER_REFUND';

CREATE TABLE "SupplierPaymentUnappliedAllocation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "billId" UUID NOT NULL,
    "amountApplied" DECIMAL(20,4) NOT NULL,
    "reversedAt" TIMESTAMP(3),
    "reversedById" UUID,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPaymentUnappliedAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierRefund" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "refundNumber" TEXT NOT NULL,
    "supplierId" UUID NOT NULL,
    "sourceType" "SupplierRefundSourceType" NOT NULL,
    "sourcePaymentId" UUID,
    "sourceDebitNoteId" UUID,
    "refundDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "SupplierRefundStatus" NOT NULL DEFAULT 'POSTED',
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

    CONSTRAINT "SupplierRefund_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupplierPaymentUnappliedAllocation_organizationId_idx" ON "SupplierPaymentUnappliedAllocation"("organizationId");
CREATE INDEX "SupplierPaymentUnappliedAllocation_paymentId_idx" ON "SupplierPaymentUnappliedAllocation"("paymentId");
CREATE INDEX "SupplierPaymentUnappliedAllocation_billId_idx" ON "SupplierPaymentUnappliedAllocation"("billId");
CREATE INDEX "SupplierPaymentUnappliedAllocation_reversedAt_idx" ON "SupplierPaymentUnappliedAllocation"("reversedAt");
CREATE INDEX "SupplierPaymentUnappliedAllocation_reversedById_idx" ON "SupplierPaymentUnappliedAllocation"("reversedById");

CREATE UNIQUE INDEX "SupplierRefund_journalEntryId_key" ON "SupplierRefund"("journalEntryId");
CREATE UNIQUE INDEX "SupplierRefund_voidReversalJournalEntryId_key" ON "SupplierRefund"("voidReversalJournalEntryId");
CREATE UNIQUE INDEX "SupplierRefund_organizationId_refundNumber_key" ON "SupplierRefund"("organizationId", "refundNumber");
CREATE INDEX "SupplierRefund_organizationId_idx" ON "SupplierRefund"("organizationId");
CREATE INDEX "SupplierRefund_supplierId_idx" ON "SupplierRefund"("supplierId");
CREATE INDEX "SupplierRefund_sourcePaymentId_idx" ON "SupplierRefund"("sourcePaymentId");
CREATE INDEX "SupplierRefund_sourceDebitNoteId_idx" ON "SupplierRefund"("sourceDebitNoteId");
CREATE INDEX "SupplierRefund_status_idx" ON "SupplierRefund"("status");

ALTER TABLE "SupplierPaymentUnappliedAllocation" ADD CONSTRAINT "SupplierPaymentUnappliedAllocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierPaymentUnappliedAllocation" ADD CONSTRAINT "SupplierPaymentUnappliedAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "SupplierPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierPaymentUnappliedAllocation" ADD CONSTRAINT "SupplierPaymentUnappliedAllocation_billId_fkey" FOREIGN KEY ("billId") REFERENCES "PurchaseBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierPaymentUnappliedAllocation" ADD CONSTRAINT "SupplierPaymentUnappliedAllocation_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupplierRefund" ADD CONSTRAINT "SupplierRefund_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierRefund" ADD CONSTRAINT "SupplierRefund_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierRefund" ADD CONSTRAINT "SupplierRefund_sourcePaymentId_fkey" FOREIGN KEY ("sourcePaymentId") REFERENCES "SupplierPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplierRefund" ADD CONSTRAINT "SupplierRefund_sourceDebitNoteId_fkey" FOREIGN KEY ("sourceDebitNoteId") REFERENCES "PurchaseDebitNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplierRefund" ADD CONSTRAINT "SupplierRefund_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierRefund" ADD CONSTRAINT "SupplierRefund_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplierRefund" ADD CONSTRAINT "SupplierRefund_voidReversalJournalEntryId_fkey" FOREIGN KEY ("voidReversalJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplierRefund" ADD CONSTRAINT "SupplierRefund_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
