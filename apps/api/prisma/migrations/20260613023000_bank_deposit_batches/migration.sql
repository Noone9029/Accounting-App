-- Add bank deposit batch storage for manual treasury grouping.
-- This is additive only and does not backfill or mutate existing records.

CREATE TYPE "BankDepositBatchStatus" AS ENUM ('DRAFT', 'POSTED', 'MATCHED', 'VOIDED');

CREATE TYPE "BankDepositBatchLineSourceType" AS ENUM (
  'CUSTOMER_PAYMENT',
  'RECEIPT',
  'MANUAL_CASH_RECEIPT',
  'CHEQUE_PLACEHOLDER',
  'OTHER_CLEARING_ITEM'
);

CREATE TABLE "BankDepositBatch" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "bankAccountProfileId" UUID NOT NULL,
  "depositDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "status" "BankDepositBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "memo" TEXT,
  "totalAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "statementTransactionId" UUID,
  "createdById" UUID,
  "updatedById" UUID,
  "postedAt" TIMESTAMP(3),
  "matchedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BankDepositBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BankDepositBatchLine" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "batchId" UUID NOT NULL,
  "sourceType" "BankDepositBatchLineSourceType" NOT NULL,
  "sourceId" TEXT,
  "counterpartyName" TEXT,
  "reference" TEXT,
  "amount" DECIMAL(20,4) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "memo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BankDepositBatchLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankDepositBatch_statementTransactionId_key" ON "BankDepositBatch"("statementTransactionId");
CREATE INDEX "BankDepositBatch_organizationId_idx" ON "BankDepositBatch"("organizationId");
CREATE INDEX "BankDepositBatch_bankAccountProfileId_idx" ON "BankDepositBatch"("bankAccountProfileId");
CREATE INDEX "BankDepositBatch_organizationId_bankAccountProfileId_idx" ON "BankDepositBatch"("organizationId", "bankAccountProfileId");
CREATE INDEX "BankDepositBatch_organizationId_status_idx" ON "BankDepositBatch"("organizationId", "status");
CREATE INDEX "BankDepositBatch_statementTransactionId_idx" ON "BankDepositBatch"("statementTransactionId");

CREATE INDEX "BankDepositBatchLine_organizationId_idx" ON "BankDepositBatchLine"("organizationId");
CREATE INDEX "BankDepositBatchLine_batchId_idx" ON "BankDepositBatchLine"("batchId");
CREATE INDEX "BankDepositBatchLine_organizationId_sourceType_sourceId_idx" ON "BankDepositBatchLine"("organizationId", "sourceType", "sourceId");

ALTER TABLE "BankDepositBatch"
  ADD CONSTRAINT "BankDepositBatch_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankDepositBatch"
  ADD CONSTRAINT "BankDepositBatch_bankAccountProfileId_fkey"
  FOREIGN KEY ("bankAccountProfileId") REFERENCES "BankAccountProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BankDepositBatch"
  ADD CONSTRAINT "BankDepositBatch_statementTransactionId_fkey"
  FOREIGN KEY ("statementTransactionId") REFERENCES "BankStatementTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BankDepositBatch"
  ADD CONSTRAINT "BankDepositBatch_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BankDepositBatch"
  ADD CONSTRAINT "BankDepositBatch_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BankDepositBatchLine"
  ADD CONSTRAINT "BankDepositBatchLine_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankDepositBatchLine"
  ADD CONSTRAINT "BankDepositBatchLine_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "BankDepositBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankDepositBatchLine"
  ADD CONSTRAINT "BankDepositBatchLine_amount_positive_check"
  CHECK ("amount" > 0);
