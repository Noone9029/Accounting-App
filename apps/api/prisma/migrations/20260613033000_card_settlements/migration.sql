-- Add operational credit/prepaid card settlement storage.
-- This is additive only and does not backfill or mutate existing records.

CREATE TYPE "CardSettlementType" AS ENUM (
  'CREDIT_CARD_PAYDOWN',
  'CREDIT_CARD_CREDIT',
  'PREPAID_CARD_TOP_UP'
);

CREATE TYPE "CardSettlementStatus" AS ENUM (
  'DRAFT',
  'POSTED',
  'MATCHED',
  'VOIDED'
);

CREATE TABLE "CardSettlement" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "settlementType" "CardSettlementType" NOT NULL,
  "fundingBankAccountProfileId" UUID,
  "cardAccountProfileId" UUID NOT NULL,
  "settlementDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "amount" DECIMAL(20,4) NOT NULL,
  "status" "CardSettlementStatus" NOT NULL DEFAULT 'DRAFT',
  "memo" TEXT,
  "reference" TEXT,
  "statementTransactionId" UUID,
  "createdById" UUID,
  "updatedById" UUID,
  "postedAt" TIMESTAMP(3),
  "matchedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CardSettlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CardSettlement_statementTransactionId_key" ON "CardSettlement"("statementTransactionId");
CREATE INDEX "CardSettlement_organizationId_idx" ON "CardSettlement"("organizationId");
CREATE INDEX "CardSettlement_cardAccountProfileId_idx" ON "CardSettlement"("cardAccountProfileId");
CREATE INDEX "CardSettlement_fundingBankAccountProfileId_idx" ON "CardSettlement"("fundingBankAccountProfileId");
CREATE INDEX "CardSettlement_organizationId_status_idx" ON "CardSettlement"("organizationId", "status");
CREATE INDEX "CardSettlement_organizationId_settlementType_idx" ON "CardSettlement"("organizationId", "settlementType");
CREATE INDEX "CardSettlement_statementTransactionId_idx" ON "CardSettlement"("statementTransactionId");

ALTER TABLE "CardSettlement"
  ADD CONSTRAINT "CardSettlement_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CardSettlement"
  ADD CONSTRAINT "CardSettlement_fundingBankAccountProfileId_fkey"
  FOREIGN KEY ("fundingBankAccountProfileId") REFERENCES "BankAccountProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CardSettlement"
  ADD CONSTRAINT "CardSettlement_cardAccountProfileId_fkey"
  FOREIGN KEY ("cardAccountProfileId") REFERENCES "BankAccountProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CardSettlement"
  ADD CONSTRAINT "CardSettlement_statementTransactionId_fkey"
  FOREIGN KEY ("statementTransactionId") REFERENCES "BankStatementTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CardSettlement"
  ADD CONSTRAINT "CardSettlement_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CardSettlement"
  ADD CONSTRAINT "CardSettlement_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CardSettlement"
  ADD CONSTRAINT "CardSettlement_amount_positive_check"
  CHECK ("amount" > 0);
