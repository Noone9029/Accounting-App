-- AlterTable
ALTER TABLE "Attachment" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CashExpense" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CashExpenseLine" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InventoryVarianceProposal" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InventoryVarianceProposalEvent" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StockMovement" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SupplierPaymentUnappliedAllocation" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SupplierRefund" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Warehouse" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "AuthTokenRateLimitEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "email" TEXT NOT NULL,
    "purpose" "AuthTokenPurpose" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthTokenRateLimitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthTokenRateLimitEvent_organizationId_email_purpose_create_idx" ON "AuthTokenRateLimitEvent"("organizationId", "email", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "AuthTokenRateLimitEvent_email_purpose_createdAt_idx" ON "AuthTokenRateLimitEvent"("email", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "AuthTokenRateLimitEvent_ipAddress_purpose_createdAt_idx" ON "AuthTokenRateLimitEvent"("ipAddress", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "AuthTokenRateLimitEvent_organizationId_purpose_createdAt_idx" ON "AuthTokenRateLimitEvent"("organizationId", "purpose", "createdAt");

-- AddForeignKey
ALTER TABLE "AuthTokenRateLimitEvent" ADD CONSTRAINT "AuthTokenRateLimitEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "BankReconciliation_organizationId_bankAccountProfileId_periodSt" RENAME TO "BankReconciliation_organizationId_bankAccountProfileId_peri_idx";

-- RenameIndex
ALTER INDEX "BankReconciliation_organizationId_bankAccountProfileId_status_i" RENAME TO "BankReconciliation_organizationId_bankAccountProfileId_stat_idx";

-- RenameIndex
ALTER INDEX "BankReconciliationItem_reconciliationId_statementTransactionId_" RENAME TO "BankReconciliationItem_reconciliationId_statementTransactio_key";

-- RenameIndex
ALTER INDEX "BankReconciliationReviewEvent_organizationId_reconciliationId_c" RENAME TO "BankReconciliationReviewEvent_organizationId_reconciliation_idx";

-- RenameIndex
ALTER INDEX "InventoryVarianceProposalEvent_organizationId_proposalId_create" RENAME TO "InventoryVarianceProposalEvent_organizationId_proposalId_cr_idx";
