BEGIN;

CREATE TYPE "FxRevaluationStatus" AS ENUM ('DRAFT', 'REVIEWED', 'POSTED', 'REVERSED', 'FAILED');
CREATE TYPE "FxMonetarySourceType" AS ENUM ('CUSTOMER_RECEIVABLE', 'SUPPLIER_PAYABLE');

CREATE UNIQUE INDEX "Contact_organizationId_id_key" ON "Contact"("organizationId", "id");

ALTER TABLE "CustomerPaymentAllocation"
  ADD COLUMN "sourceBaseAmountApplied" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "carryingRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
  ADD COLUMN "carryingRateSnapshotId" UUID,
  ADD COLUMN "carryingRevaluationLineId" UUID;
ALTER TABLE "CustomerPaymentUnappliedAllocation"
  ADD COLUMN "sourceBaseAmountApplied" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "carryingRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
  ADD COLUMN "carryingRateSnapshotId" UUID,
  ADD COLUMN "carryingRevaluationLineId" UUID;
ALTER TABLE "SupplierPaymentAllocation"
  ADD COLUMN "sourceBaseAmountApplied" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "carryingRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
  ADD COLUMN "carryingRateSnapshotId" UUID,
  ADD COLUMN "carryingRevaluationLineId" UUID;
ALTER TABLE "SupplierPaymentUnappliedAllocation"
  ADD COLUMN "sourceBaseAmountApplied" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "carryingRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
  ADD COLUMN "carryingRateSnapshotId" UUID,
  ADD COLUMN "carryingRevaluationLineId" UUID;

UPDATE "CustomerPaymentAllocation"
SET "sourceBaseAmountApplied" = "documentBaseAmountApplied",
    "carryingRate" = "recognitionRate";
UPDATE "CustomerPaymentUnappliedAllocation"
SET "sourceBaseAmountApplied" = "documentBaseAmountApplied",
    "carryingRate" = "recognitionRate";
UPDATE "SupplierPaymentAllocation"
SET "sourceBaseAmountApplied" = "documentBaseAmountApplied",
    "carryingRate" = "recognitionRate";
UPDATE "SupplierPaymentUnappliedAllocation"
SET "sourceBaseAmountApplied" = "documentBaseAmountApplied",
    "carryingRate" = "recognitionRate";

ALTER TABLE "CustomerPaymentAllocation" ADD CONSTRAINT "CustomerPaymentAllocation_carrying_evidence_valid" CHECK (
  "sourceBaseAmountApplied" >= 0 AND "carryingRate" > 0
);
ALTER TABLE "CustomerPaymentUnappliedAllocation" ADD CONSTRAINT "CustomerPaymentUnappliedAllocation_carrying_evidence_valid" CHECK (
  "sourceBaseAmountApplied" >= 0 AND "carryingRate" > 0
);
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_carrying_evidence_valid" CHECK (
  "sourceBaseAmountApplied" >= 0 AND "carryingRate" > 0
);
ALTER TABLE "SupplierPaymentUnappliedAllocation" ADD CONSTRAINT "SupplierPaymentUnappliedAllocation_carrying_evidence_valid" CHECK (
  "sourceBaseAmountApplied" >= 0 AND "carryingRate" > 0
);

CREATE TABLE "FxRevaluationRun" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "revaluationDate" DATE NOT NULL,
  "status" "FxRevaluationStatus" NOT NULL DEFAULT 'DRAFT',
  "rateDate" DATE NOT NULL,
  "requestedByUserId" UUID NOT NULL,
  "reviewedByUserId" UUID,
  "postedByUserId" UUID,
  "reversedByUserId" UUID,
  "postedJournalEntryId" UUID,
  "reversalJournalEntryId" UUID,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "activeScopeKey" TEXT,
  "reviewIdempotencyKey" TEXT,
  "postIdempotencyKey" TEXT,
  "reversalIdempotencyKey" TEXT,
  "reviewedAt" TIMESTAMPTZ(3),
  "postedAt" TIMESTAMPTZ(3),
  "reversedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "FxRevaluationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FxRevaluationLine" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "revaluationRunId" UUID NOT NULL,
  "sourceType" "FxMonetarySourceType" NOT NULL,
  "salesInvoiceId" UUID,
  "purchaseBillId" UUID,
  "counterpartyId" UUID,
  "currencyCode" TEXT NOT NULL,
  "baseCurrencyCode" TEXT NOT NULL,
  "openTransactionAmount" DECIMAL(20,4) NOT NULL,
  "sourceBaseOpenAmount" DECIMAL(20,4) NOT NULL,
  "carryingBaseAmount" DECIMAL(20,4) NOT NULL,
  "closingRate" DECIMAL(18,8) NOT NULL,
  "revaluedBaseAmount" DECIMAL(20,4) NOT NULL,
  "unrealizedGainAmount" DECIMAL(20,4) NOT NULL,
  "unrealizedLossAmount" DECIMAL(20,4) NOT NULL,
  "rateSnapshotId" UUID NOT NULL,
  "priorRevaluationLineId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FxRevaluationLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FxRevaluationLine_source_exactly_one" CHECK (
    ("sourceType" = 'CUSTOMER_RECEIVABLE' AND "salesInvoiceId" IS NOT NULL AND "purchaseBillId" IS NULL)
    OR ("sourceType" = 'SUPPLIER_PAYABLE' AND "salesInvoiceId" IS NULL AND "purchaseBillId" IS NOT NULL)
  ),
  CONSTRAINT "FxRevaluationLine_amounts_valid" CHECK (
    "openTransactionAmount" > 0
    AND "sourceBaseOpenAmount" >= 0
    AND "carryingBaseAmount" >= 0
    AND "closingRate" > 0
    AND "revaluedBaseAmount" >= 0
    AND "unrealizedGainAmount" >= 0
    AND "unrealizedLossAmount" >= 0
    AND NOT ("unrealizedGainAmount" > 0 AND "unrealizedLossAmount" > 0)
  )
);

CREATE TABLE "FxMonetaryBalance" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "sourceType" "FxMonetarySourceType" NOT NULL,
  "salesInvoiceId" UUID,
  "purchaseBillId" UUID,
  "currencyCode" TEXT NOT NULL,
  "baseCurrencyCode" TEXT NOT NULL,
  "openTransactionAmount" DECIMAL(20,4) NOT NULL,
  "sourceBaseOpenAmount" DECIMAL(20,4) NOT NULL,
  "carryingBaseAmount" DECIMAL(20,4) NOT NULL,
  "carryingRate" DECIMAL(18,8) NOT NULL,
  "rateSnapshotId" UUID NOT NULL,
  "lastRevaluationLineId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "FxMonetaryBalance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FxMonetaryBalance_source_exactly_one" CHECK (
    ("sourceType" = 'CUSTOMER_RECEIVABLE' AND "salesInvoiceId" IS NOT NULL AND "purchaseBillId" IS NULL)
    OR ("sourceType" = 'SUPPLIER_PAYABLE' AND "salesInvoiceId" IS NULL AND "purchaseBillId" IS NOT NULL)
  ),
  CONSTRAINT "FxMonetaryBalance_amounts_valid" CHECK (
    "openTransactionAmount" >= 0
    AND "sourceBaseOpenAmount" >= 0
    AND "carryingBaseAmount" >= 0
    AND "carryingRate" > 0
  )
);

CREATE UNIQUE INDEX "FxRevaluationRun_organizationId_id_key" ON "FxRevaluationRun"("organizationId", "id");
CREATE UNIQUE INDEX "FxRevaluationRun_organizationId_idempotencyKey_key" ON "FxRevaluationRun"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "FxRevaluationRun_organizationId_activeScopeKey_key" ON "FxRevaluationRun"("organizationId", "activeScopeKey");
CREATE UNIQUE INDEX "FxRevaluationRun_organizationId_reviewIdempotencyKey_key" ON "FxRevaluationRun"("organizationId", "reviewIdempotencyKey");
CREATE UNIQUE INDEX "FxRevaluationRun_organizationId_postIdempotencyKey_key" ON "FxRevaluationRun"("organizationId", "postIdempotencyKey");
CREATE UNIQUE INDEX "FxRevaluationRun_organizationId_reversalIdempotencyKey_key" ON "FxRevaluationRun"("organizationId", "reversalIdempotencyKey");
CREATE UNIQUE INDEX "FxRevaluationRun_organizationId_postedJournalEntryId_key" ON "FxRevaluationRun"("organizationId", "postedJournalEntryId");
CREATE UNIQUE INDEX "FxRevaluationRun_organizationId_reversalJournalEntryId_key" ON "FxRevaluationRun"("organizationId", "reversalJournalEntryId");
CREATE INDEX "FxRevaluationRun_organizationId_revaluationDate_idx" ON "FxRevaluationRun"("organizationId", "revaluationDate");
CREATE INDEX "FxRevaluationRun_organizationId_status_idx" ON "FxRevaluationRun"("organizationId", "status");
CREATE INDEX "FxRevaluationRun_requestedByUserId_idx" ON "FxRevaluationRun"("requestedByUserId");
CREATE INDEX "FxRevaluationRun_reviewedByUserId_idx" ON "FxRevaluationRun"("reviewedByUserId");
CREATE INDEX "FxRevaluationRun_postedByUserId_idx" ON "FxRevaluationRun"("postedByUserId");
CREATE INDEX "FxRevaluationRun_reversedByUserId_idx" ON "FxRevaluationRun"("reversedByUserId");

CREATE UNIQUE INDEX "FxRevaluationLine_organizationId_id_key" ON "FxRevaluationLine"("organizationId", "id");
CREATE UNIQUE INDEX "FxRevaluationLine_revaluationRunId_salesInvoiceId_key" ON "FxRevaluationLine"("revaluationRunId", "salesInvoiceId");
CREATE UNIQUE INDEX "FxRevaluationLine_revaluationRunId_purchaseBillId_key" ON "FxRevaluationLine"("revaluationRunId", "purchaseBillId");
CREATE INDEX "FxRevaluationLine_organizationId_sourceType_idx" ON "FxRevaluationLine"("organizationId", "sourceType");
CREATE INDEX "FxRevaluationLine_organizationId_salesInvoiceId_idx" ON "FxRevaluationLine"("organizationId", "salesInvoiceId");
CREATE INDEX "FxRevaluationLine_organizationId_purchaseBillId_idx" ON "FxRevaluationLine"("organizationId", "purchaseBillId");
CREATE INDEX "FxRevaluationLine_organizationId_counterpartyId_idx" ON "FxRevaluationLine"("organizationId", "counterpartyId");
CREATE INDEX "FxRevaluationLine_organizationId_rateSnapshotId_idx" ON "FxRevaluationLine"("organizationId", "rateSnapshotId");
CREATE INDEX "FxRevaluationLine_organizationId_priorRevaluationLineId_idx" ON "FxRevaluationLine"("organizationId", "priorRevaluationLineId");

CREATE UNIQUE INDEX "FxMonetaryBalance_organizationId_id_key" ON "FxMonetaryBalance"("organizationId", "id");
CREATE UNIQUE INDEX "FxMonetaryBalance_organizationId_salesInvoiceId_key" ON "FxMonetaryBalance"("organizationId", "salesInvoiceId");
CREATE UNIQUE INDEX "FxMonetaryBalance_organizationId_purchaseBillId_key" ON "FxMonetaryBalance"("organizationId", "purchaseBillId");
CREATE UNIQUE INDEX "FxMonetaryBalance_organizationId_lastRevaluationLineId_key" ON "FxMonetaryBalance"("organizationId", "lastRevaluationLineId");
CREATE INDEX "FxMonetaryBalance_organizationId_sourceType_idx" ON "FxMonetaryBalance"("organizationId", "sourceType");
CREATE INDEX "FxMonetaryBalance_organizationId_rateSnapshotId_idx" ON "FxMonetaryBalance"("organizationId", "rateSnapshotId");

CREATE INDEX "cpa_org_carry_rate_snapshot_idx" ON "CustomerPaymentAllocation"("organizationId", "carryingRateSnapshotId");
CREATE INDEX "cpa_org_carry_reval_line_idx" ON "CustomerPaymentAllocation"("organizationId", "carryingRevaluationLineId");
CREATE INDEX "cpua_org_carry_rate_snapshot_idx" ON "CustomerPaymentUnappliedAllocation"("organizationId", "carryingRateSnapshotId");
CREATE INDEX "cpua_org_carry_reval_line_idx" ON "CustomerPaymentUnappliedAllocation"("organizationId", "carryingRevaluationLineId");
CREATE INDEX "spa_org_carry_rate_snapshot_idx" ON "SupplierPaymentAllocation"("organizationId", "carryingRateSnapshotId");
CREATE INDEX "spa_org_carry_reval_line_idx" ON "SupplierPaymentAllocation"("organizationId", "carryingRevaluationLineId");
CREATE INDEX "spua_org_carry_rate_snapshot_idx" ON "SupplierPaymentUnappliedAllocation"("organizationId", "carryingRateSnapshotId");
CREATE INDEX "spua_org_carry_reval_line_idx" ON "SupplierPaymentUnappliedAllocation"("organizationId", "carryingRevaluationLineId");

ALTER TABLE "FxRevaluationRun" ADD CONSTRAINT "FxRevaluationRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FxRevaluationRun" ADD CONSTRAINT "FxRevaluationRun_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FxRevaluationRun" ADD CONSTRAINT "FxRevaluationRun_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FxRevaluationRun" ADD CONSTRAINT "FxRevaluationRun_postedByUserId_fkey" FOREIGN KEY ("postedByUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FxRevaluationRun" ADD CONSTRAINT "FxRevaluationRun_reversedByUserId_fkey" FOREIGN KEY ("reversedByUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FxRevaluationRun" ADD CONSTRAINT "FxRevaluationRun_org_posted_journal_fkey" FOREIGN KEY ("organizationId", "postedJournalEntryId") REFERENCES "JournalEntry"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FxRevaluationRun" ADD CONSTRAINT "FxRevaluationRun_org_reversal_journal_fkey" FOREIGN KEY ("organizationId", "reversalJournalEntryId") REFERENCES "JournalEntry"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "FxRevaluationLine" ADD CONSTRAINT "FxRevaluationLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FxRevaluationLine" ADD CONSTRAINT "FxRevaluationLine_org_run_fkey" FOREIGN KEY ("organizationId", "revaluationRunId") REFERENCES "FxRevaluationRun"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FxRevaluationLine" ADD CONSTRAINT "FxRevaluationLine_org_invoice_fkey" FOREIGN KEY ("organizationId", "salesInvoiceId") REFERENCES "SalesInvoice"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FxRevaluationLine" ADD CONSTRAINT "FxRevaluationLine_org_bill_fkey" FOREIGN KEY ("organizationId", "purchaseBillId") REFERENCES "PurchaseBill"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FxRevaluationLine" ADD CONSTRAINT "FxRevaluationLine_org_counterparty_fkey" FOREIGN KEY ("organizationId", "counterpartyId") REFERENCES "Contact"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FxRevaluationLine" ADD CONSTRAINT "FxRevaluationLine_org_rate_snapshot_fkey" FOREIGN KEY ("organizationId", "rateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FxRevaluationLine" ADD CONSTRAINT "FxRevaluationLine_org_prior_line_fkey" FOREIGN KEY ("organizationId", "priorRevaluationLineId") REFERENCES "FxRevaluationLine"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "FxMonetaryBalance" ADD CONSTRAINT "FxMonetaryBalance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FxMonetaryBalance" ADD CONSTRAINT "FxMonetaryBalance_org_invoice_fkey" FOREIGN KEY ("organizationId", "salesInvoiceId") REFERENCES "SalesInvoice"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FxMonetaryBalance" ADD CONSTRAINT "FxMonetaryBalance_org_bill_fkey" FOREIGN KEY ("organizationId", "purchaseBillId") REFERENCES "PurchaseBill"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FxMonetaryBalance" ADD CONSTRAINT "FxMonetaryBalance_org_rate_snapshot_fkey" FOREIGN KEY ("organizationId", "rateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FxMonetaryBalance" ADD CONSTRAINT "FxMonetaryBalance_org_last_line_fkey" FOREIGN KEY ("organizationId", "lastRevaluationLineId") REFERENCES "FxRevaluationLine"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "CustomerPaymentAllocation" ADD CONSTRAINT "cpa_org_carrying_rate_snapshot_fkey" FOREIGN KEY ("organizationId", "carryingRateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentAllocation" ADD CONSTRAINT "cpa_org_carrying_revaluation_line_fkey" FOREIGN KEY ("organizationId", "carryingRevaluationLineId") REFERENCES "FxRevaluationLine"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentUnappliedAllocation" ADD CONSTRAINT "cpua_org_carrying_rate_snapshot_fkey" FOREIGN KEY ("organizationId", "carryingRateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentUnappliedAllocation" ADD CONSTRAINT "cpua_org_carrying_revaluation_line_fkey" FOREIGN KEY ("organizationId", "carryingRevaluationLineId") REFERENCES "FxRevaluationLine"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "spa_org_carrying_rate_snapshot_fkey" FOREIGN KEY ("organizationId", "carryingRateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "spa_org_carrying_revaluation_line_fkey" FOREIGN KEY ("organizationId", "carryingRevaluationLineId") REFERENCES "FxRevaluationLine"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "SupplierPaymentUnappliedAllocation" ADD CONSTRAINT "spua_org_carrying_rate_snapshot_fkey" FOREIGN KEY ("organizationId", "carryingRateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "SupplierPaymentUnappliedAllocation" ADD CONSTRAINT "spua_org_carrying_revaluation_line_fkey" FOREIGN KEY ("organizationId", "carryingRevaluationLineId") REFERENCES "FxRevaluationLine"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT;
