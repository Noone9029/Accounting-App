-- CreateEnum
CREATE TYPE "PurchaseBillStatus" AS ENUM ('DRAFT', 'FINALIZED', 'VOIDED');

-- CreateEnum
CREATE TYPE "SupplierPaymentStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'PURCHASE_BILL';
ALTER TYPE "DocumentType" ADD VALUE 'SUPPLIER_PAYMENT_RECEIPT';

-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Branch" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Contact" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CreditNote" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CreditNoteAllocation" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CreditNoteLine" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CustomerPayment" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CustomerPaymentAllocation" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CustomerPaymentUnappliedAllocation" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CustomerRefund" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FiscalPeriod" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GeneratedDocument" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "JournalEntry" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "JournalLine" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "NumberSequence" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrganizationDocumentSettings" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrganizationMember" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Role" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SalesInvoice" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SalesInvoiceLine" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TaxRate" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ZatcaEgsUnit" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ZatcaInvoiceMetadata" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "invoiceUuid" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ZatcaOrganizationProfile" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ZatcaSubmissionLog" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "PurchaseBill" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "billNumber" TEXT NOT NULL,
    "supplierId" UUID NOT NULL,
    "branchId" UUID,
    "billDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "PurchaseBillStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "taxableTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "terms" TEXT,
    "createdById" UUID,
    "finalizedAt" TIMESTAMP(3),
    "journalEntryId" UUID,
    "reversalJournalEntryId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseBillLine" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "billId" UUID NOT NULL,
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

    CONSTRAINT "PurchaseBillLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "supplierId" UUID NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "SupplierPaymentStatus" NOT NULL DEFAULT 'POSTED',
    "amountPaid" DECIMAL(20,4) NOT NULL,
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

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPaymentAllocation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "billId" UUID NOT NULL,
    "amountApplied" DECIMAL(20,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseBill_journalEntryId_key" ON "PurchaseBill"("journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseBill_reversalJournalEntryId_key" ON "PurchaseBill"("reversalJournalEntryId");

-- CreateIndex
CREATE INDEX "PurchaseBill_organizationId_idx" ON "PurchaseBill"("organizationId");

-- CreateIndex
CREATE INDEX "PurchaseBill_supplierId_idx" ON "PurchaseBill"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseBill_status_idx" ON "PurchaseBill"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseBill_organizationId_billNumber_key" ON "PurchaseBill"("organizationId", "billNumber");

-- CreateIndex
CREATE INDEX "PurchaseBillLine_organizationId_idx" ON "PurchaseBillLine"("organizationId");

-- CreateIndex
CREATE INDEX "PurchaseBillLine_billId_idx" ON "PurchaseBillLine"("billId");

-- CreateIndex
CREATE INDEX "PurchaseBillLine_itemId_idx" ON "PurchaseBillLine"("itemId");

-- CreateIndex
CREATE INDEX "PurchaseBillLine_accountId_idx" ON "PurchaseBillLine"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_journalEntryId_key" ON "SupplierPayment"("journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_voidReversalJournalEntryId_key" ON "SupplierPayment"("voidReversalJournalEntryId");

-- CreateIndex
CREATE INDEX "SupplierPayment_organizationId_idx" ON "SupplierPayment"("organizationId");

-- CreateIndex
CREATE INDEX "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierPayment_status_idx" ON "SupplierPayment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_organizationId_paymentNumber_key" ON "SupplierPayment"("organizationId", "paymentNumber");

-- CreateIndex
CREATE INDEX "SupplierPaymentAllocation_organizationId_idx" ON "SupplierPaymentAllocation"("organizationId");

-- CreateIndex
CREATE INDEX "SupplierPaymentAllocation_paymentId_idx" ON "SupplierPaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "SupplierPaymentAllocation_billId_idx" ON "SupplierPaymentAllocation"("billId");

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_reversalJournalEntryId_fkey" FOREIGN KEY ("reversalJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBillLine" ADD CONSTRAINT "PurchaseBillLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBillLine" ADD CONSTRAINT "PurchaseBillLine_billId_fkey" FOREIGN KEY ("billId") REFERENCES "PurchaseBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBillLine" ADD CONSTRAINT "PurchaseBillLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBillLine" ADD CONSTRAINT "PurchaseBillLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBillLine" ADD CONSTRAINT "PurchaseBillLine_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_voidReversalJournalEntryId_fkey" FOREIGN KEY ("voidReversalJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "SupplierPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_billId_fkey" FOREIGN KEY ("billId") REFERENCES "PurchaseBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
