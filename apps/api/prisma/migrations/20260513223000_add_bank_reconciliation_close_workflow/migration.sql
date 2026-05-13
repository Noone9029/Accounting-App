-- CreateEnum
CREATE TYPE "BankReconciliationStatus" AS ENUM ('DRAFT', 'CLOSED', 'VOIDED');

-- AlterEnum
ALTER TYPE "NumberSequenceScope" ADD VALUE 'BANK_RECONCILIATION';

-- CreateTable
CREATE TABLE "BankReconciliation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "bankAccountProfileId" UUID NOT NULL,
    "reconciliationNumber" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "statementOpeningBalance" DECIMAL(20,4),
    "statementClosingBalance" DECIMAL(20,4) NOT NULL,
    "ledgerClosingBalance" DECIMAL(20,4) NOT NULL,
    "difference" DECIMAL(20,4) NOT NULL,
    "status" "BankReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdById" UUID,
    "closedById" UUID,
    "voidedById" UUID,
    "closedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankReconciliationItem" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "reconciliationId" UUID NOT NULL,
    "statementTransactionId" UUID NOT NULL,
    "statusAtClose" "BankStatementTransactionStatus" NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "type" "BankStatementTransactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankReconciliationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankReconciliation_organizationId_reconciliationNumber_key" ON "BankReconciliation"("organizationId", "reconciliationNumber");

-- CreateIndex
CREATE INDEX "BankReconciliation_organizationId_idx" ON "BankReconciliation"("organizationId");

-- CreateIndex
CREATE INDEX "BankReconciliation_bankAccountProfileId_idx" ON "BankReconciliation"("bankAccountProfileId");

-- CreateIndex
CREATE INDEX "BankReconciliation_organizationId_bankAccountProfileId_status_idx" ON "BankReconciliation"("organizationId", "bankAccountProfileId", "status");

-- CreateIndex
CREATE INDEX "BankReconciliation_organizationId_bankAccountProfileId_periodStart_periodEnd_idx" ON "BankReconciliation"("organizationId", "bankAccountProfileId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "BankReconciliationItem_reconciliationId_statementTransactionId_key" ON "BankReconciliationItem"("reconciliationId", "statementTransactionId");

-- CreateIndex
CREATE INDEX "BankReconciliationItem_organizationId_idx" ON "BankReconciliationItem"("organizationId");

-- CreateIndex
CREATE INDEX "BankReconciliationItem_reconciliationId_idx" ON "BankReconciliationItem"("reconciliationId");

-- CreateIndex
CREATE INDEX "BankReconciliationItem_statementTransactionId_idx" ON "BankReconciliationItem"("statementTransactionId");

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_bankAccountProfileId_fkey" FOREIGN KEY ("bankAccountProfileId") REFERENCES "BankAccountProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationItem" ADD CONSTRAINT "BankReconciliationItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationItem" ADD CONSTRAINT "BankReconciliationItem_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "BankReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationItem" ADD CONSTRAINT "BankReconciliationItem_statementTransactionId_fkey" FOREIGN KEY ("statementTransactionId") REFERENCES "BankStatementTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
