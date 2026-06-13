-- CreateEnum
CREATE TYPE "ChequeInstrumentType" AS ENUM ('RECEIVED', 'ISSUED');

-- CreateEnum
CREATE TYPE "ChequeInstrumentStatus" AS ENUM ('DRAFT', 'RECEIVED', 'ISSUED', 'DEPOSITED', 'CLEARED', 'BOUNCED', 'VOIDED');

-- CreateEnum
CREATE TYPE "ChequeCounterpartyType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'OTHER');

-- CreateTable
CREATE TABLE "ChequeInstrument" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "chequeType" "ChequeInstrumentType" NOT NULL,
    "status" "ChequeInstrumentStatus" NOT NULL DEFAULT 'DRAFT',
    "bankAccountProfileId" UUID,
    "depositBatchId" UUID,
    "statementTransactionId" UUID,
    "counterpartyType" "ChequeCounterpartyType",
    "counterpartyId" TEXT,
    "counterpartyName" TEXT NOT NULL,
    "chequeNumber" TEXT NOT NULL,
    "drawerBankName" TEXT,
    "payeeName" TEXT,
    "issueDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "depositDate" TIMESTAMP(3),
    "clearedDate" TIMESTAMP(3),
    "bouncedDate" TIMESTAMP(3),
    "voidedDate" TIMESTAMP(3),
    "amount" DECIMAL(20,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "reference" TEXT,
    "memo" TEXT,
    "bounceReason" TEXT,
    "voidReason" TEXT,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChequeInstrument_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChequeInstrument_amount_check" CHECK ("amount" > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "ChequeInstrument_statementTransactionId_key" ON "ChequeInstrument"("statementTransactionId");

-- CreateIndex
CREATE INDEX "ChequeInstrument_organizationId_idx" ON "ChequeInstrument"("organizationId");

-- CreateIndex
CREATE INDEX "ChequeInstrument_organizationId_chequeType_idx" ON "ChequeInstrument"("organizationId", "chequeType");

-- CreateIndex
CREATE INDEX "ChequeInstrument_organizationId_status_idx" ON "ChequeInstrument"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ChequeInstrument_bankAccountProfileId_idx" ON "ChequeInstrument"("bankAccountProfileId");

-- CreateIndex
CREATE INDEX "ChequeInstrument_depositBatchId_idx" ON "ChequeInstrument"("depositBatchId");

-- CreateIndex
CREATE INDEX "ChequeInstrument_statementTransactionId_idx" ON "ChequeInstrument"("statementTransactionId");

-- CreateIndex
CREATE INDEX "ChequeInstrument_organizationId_chequeNumber_idx" ON "ChequeInstrument"("organizationId", "chequeNumber");

-- CreateIndex
CREATE INDEX "ChequeInstrument_organizationId_counterpartyType_counterpartyId_idx" ON "ChequeInstrument"("organizationId", "counterpartyType", "counterpartyId");

-- AddForeignKey
ALTER TABLE "ChequeInstrument" ADD CONSTRAINT "ChequeInstrument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChequeInstrument" ADD CONSTRAINT "ChequeInstrument_bankAccountProfileId_fkey" FOREIGN KEY ("bankAccountProfileId") REFERENCES "BankAccountProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChequeInstrument" ADD CONSTRAINT "ChequeInstrument_depositBatchId_fkey" FOREIGN KEY ("depositBatchId") REFERENCES "BankDepositBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChequeInstrument" ADD CONSTRAINT "ChequeInstrument_statementTransactionId_fkey" FOREIGN KEY ("statementTransactionId") REFERENCES "BankStatementTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChequeInstrument" ADD CONSTRAINT "ChequeInstrument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChequeInstrument" ADD CONSTRAINT "ChequeInstrument_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
