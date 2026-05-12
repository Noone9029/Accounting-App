-- CreateEnum
CREATE TYPE "PurchaseDebitNoteStatus" AS ENUM ('DRAFT', 'FINALIZED', 'VOIDED');

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'PURCHASE_DEBIT_NOTE';

-- AlterEnum
ALTER TYPE "NumberSequenceScope" ADD VALUE 'PURCHASE_DEBIT_NOTE';

-- CreateTable
CREATE TABLE "PurchaseDebitNote" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "debitNoteNumber" TEXT NOT NULL,
    "supplierId" UUID NOT NULL,
    "originalBillId" UUID,
    "branchId" UUID,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "PurchaseDebitNoteStatus" NOT NULL DEFAULT 'DRAFT',
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

    CONSTRAINT "PurchaseDebitNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseDebitNoteLine" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "debitNoteId" UUID NOT NULL,
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

    CONSTRAINT "PurchaseDebitNoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseDebitNoteAllocation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "debitNoteId" UUID NOT NULL,
    "billId" UUID NOT NULL,
    "amountApplied" DECIMAL(20,4) NOT NULL,
    "reversedAt" TIMESTAMP(3),
    "reversedById" UUID,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseDebitNoteAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseDebitNote_journalEntryId_key" ON "PurchaseDebitNote"("journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseDebitNote_reversalJournalEntryId_key" ON "PurchaseDebitNote"("reversalJournalEntryId");

-- CreateIndex
CREATE INDEX "PurchaseDebitNote_organizationId_idx" ON "PurchaseDebitNote"("organizationId");

-- CreateIndex
CREATE INDEX "PurchaseDebitNote_supplierId_idx" ON "PurchaseDebitNote"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseDebitNote_originalBillId_idx" ON "PurchaseDebitNote"("originalBillId");

-- CreateIndex
CREATE INDEX "PurchaseDebitNote_status_idx" ON "PurchaseDebitNote"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseDebitNote_organizationId_debitNoteNumber_key" ON "PurchaseDebitNote"("organizationId", "debitNoteNumber");

-- CreateIndex
CREATE INDEX "PurchaseDebitNoteLine_organizationId_idx" ON "PurchaseDebitNoteLine"("organizationId");

-- CreateIndex
CREATE INDEX "PurchaseDebitNoteLine_debitNoteId_idx" ON "PurchaseDebitNoteLine"("debitNoteId");

-- CreateIndex
CREATE INDEX "PurchaseDebitNoteLine_itemId_idx" ON "PurchaseDebitNoteLine"("itemId");

-- CreateIndex
CREATE INDEX "PurchaseDebitNoteLine_accountId_idx" ON "PurchaseDebitNoteLine"("accountId");

-- CreateIndex
CREATE INDEX "PurchaseDebitNoteAllocation_organizationId_idx" ON "PurchaseDebitNoteAllocation"("organizationId");

-- CreateIndex
CREATE INDEX "PurchaseDebitNoteAllocation_debitNoteId_idx" ON "PurchaseDebitNoteAllocation"("debitNoteId");

-- CreateIndex
CREATE INDEX "PurchaseDebitNoteAllocation_billId_idx" ON "PurchaseDebitNoteAllocation"("billId");

-- CreateIndex
CREATE INDEX "PurchaseDebitNoteAllocation_reversedAt_idx" ON "PurchaseDebitNoteAllocation"("reversedAt");

-- CreateIndex
CREATE INDEX "PurchaseDebitNoteAllocation_reversedById_idx" ON "PurchaseDebitNoteAllocation"("reversedById");

-- AddForeignKey
ALTER TABLE "PurchaseDebitNote" ADD CONSTRAINT "PurchaseDebitNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDebitNote" ADD CONSTRAINT "PurchaseDebitNote_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDebitNote" ADD CONSTRAINT "PurchaseDebitNote_originalBillId_fkey" FOREIGN KEY ("originalBillId") REFERENCES "PurchaseBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDebitNote" ADD CONSTRAINT "PurchaseDebitNote_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDebitNote" ADD CONSTRAINT "PurchaseDebitNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDebitNote" ADD CONSTRAINT "PurchaseDebitNote_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDebitNote" ADD CONSTRAINT "PurchaseDebitNote_reversalJournalEntryId_fkey" FOREIGN KEY ("reversalJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDebitNoteLine" ADD CONSTRAINT "PurchaseDebitNoteLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDebitNoteLine" ADD CONSTRAINT "PurchaseDebitNoteLine_debitNoteId_fkey" FOREIGN KEY ("debitNoteId") REFERENCES "PurchaseDebitNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDebitNoteLine" ADD CONSTRAINT "PurchaseDebitNoteLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDebitNoteLine" ADD CONSTRAINT "PurchaseDebitNoteLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDebitNoteLine" ADD CONSTRAINT "PurchaseDebitNoteLine_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDebitNoteAllocation" ADD CONSTRAINT "PurchaseDebitNoteAllocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDebitNoteAllocation" ADD CONSTRAINT "PurchaseDebitNoteAllocation_debitNoteId_fkey" FOREIGN KEY ("debitNoteId") REFERENCES "PurchaseDebitNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDebitNoteAllocation" ADD CONSTRAINT "PurchaseDebitNoteAllocation_billId_fkey" FOREIGN KEY ("billId") REFERENCES "PurchaseBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDebitNoteAllocation" ADD CONSTRAINT "PurchaseDebitNoteAllocation_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
