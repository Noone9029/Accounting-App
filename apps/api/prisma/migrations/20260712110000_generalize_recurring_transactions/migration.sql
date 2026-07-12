-- Generalize the existing manual recurring-invoice workflow without dropping its compatibility tables.
CREATE TYPE "RecurringTransactionType" AS ENUM ('SALES_INVOICE', 'PURCHASE_BILL', 'EXPENSE', 'MANUAL_JOURNAL');
CREATE TYPE "RecurringTransactionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "RecurringFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');
CREATE TYPE "RecurringCatchUpPolicy" AS ENUM ('SKIP_MISSED', 'GENERATE_LATEST_ONLY', 'GENERATE_ALL');
CREATE TYPE "RecurringGenerationMode" AS ENUM ('DRAFT_ONLY');
CREATE TYPE "RecurringExchangeRatePolicy" AS ENUM ('BASE_CURRENCY_ONLY', 'FIXED_TEMPLATE_RATE', 'REQUIRE_RATE_AT_RUN', 'RATE_SNAPSHOT');
CREATE TYPE "RecurringRunStatus" AS ENUM ('PENDING', 'CLAIMED', 'GENERATED', 'BLOCKED', 'SKIPPED', 'FAILED', 'CANCELLED');
CREATE TYPE "RecurringRunTrigger" AS ENUM ('SCHEDULED', 'MANUAL', 'RETRY');
CREATE TYPE "RecurringExpenseProposalStatus" AS ENUM ('DRAFT', 'REVIEWED', 'CANCELLED');

CREATE TABLE "RecurringTransactionTemplate" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "transactionType" "RecurringTransactionType" NOT NULL,
  "templateCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "RecurringTransactionStatus" NOT NULL DEFAULT 'DRAFT',
  "timezone" TEXT NOT NULL,
  "frequency" "RecurringFrequency" NOT NULL,
  "interval" INTEGER NOT NULL DEFAULT 1,
  "dayOfWeek" INTEGER,
  "dayOfMonth" INTEGER,
  "monthOfYear" INTEGER,
  "startDate" DATE NOT NULL,
  "endDate" DATE,
  "nextRunAt" TIMESTAMPTZ(3) NOT NULL,
  "lastRunAt" TIMESTAMPTZ(3),
  "catchUpPolicy" "RecurringCatchUpPolicy" NOT NULL DEFAULT 'SKIP_MISSED',
  "generationMode" "RecurringGenerationMode" NOT NULL DEFAULT 'DRAFT_ONLY',
  "templateVersion" INTEGER NOT NULL DEFAULT 1,
  "currencyCode" TEXT NOT NULL,
  "exchangeRatePolicy" "RecurringExchangeRatePolicy" NOT NULL DEFAULT 'BASE_CURRENCY_ONLY',
  "fixedExchangeRate" DECIMAL(18,8),
  "rateSnapshotId" UUID,
  "partyId" UUID,
  "branchId" UUID,
  "paidThroughAccountId" UUID,
  "paymentTermsDays" INTEGER NOT NULL DEFAULT 0,
  "reference" TEXT,
  "notes" TEXT,
  "terms" TEXT,
  "taxMode" "SalesInvoiceTaxMode",
  "inventoryPostingMode" "PurchaseBillInventoryPostingMode",
  "subtotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "discountTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "taxableTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "total" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "createdByUserId" UUID,
  "updatedByUserId" UUID,
  "archivedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "RecurringTransactionTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecurringTransactionTemplate_schedule_valid" CHECK (
    "interval" > 0
    AND ("dayOfWeek" IS NULL OR "dayOfWeek" BETWEEN 0 AND 6)
    AND ("dayOfMonth" IS NULL OR "dayOfMonth" BETWEEN 1 AND 31)
    AND ("monthOfYear" IS NULL OR "monthOfYear" BETWEEN 1 AND 12)
    AND ("endDate" IS NULL OR "endDate" >= "startDate")
    AND "templateVersion" > 0
    AND "paymentTermsDays" >= 0
  ),
  CONSTRAINT "RecurringTransactionTemplate_fx_policy_valid" CHECK (
    ("exchangeRatePolicy" = 'FIXED_TEMPLATE_RATE' AND "fixedExchangeRate" IS NOT NULL AND "fixedExchangeRate" > 0 AND "rateSnapshotId" IS NULL)
    OR ("exchangeRatePolicy" = 'RATE_SNAPSHOT' AND "rateSnapshotId" IS NOT NULL AND "fixedExchangeRate" IS NULL)
    OR ("exchangeRatePolicy" IN ('BASE_CURRENCY_ONLY', 'REQUIRE_RATE_AT_RUN') AND "fixedExchangeRate" IS NULL AND "rateSnapshotId" IS NULL)
  )
);

CREATE TABLE "RecurringTransactionTemplateLine" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "templateId" UUID NOT NULL,
  "itemId" UUID,
  "accountId" UUID NOT NULL,
  "taxRateId" UUID,
  "costCenterId" UUID,
  "projectId" UUID,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(20,4) NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "discountRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
  "debit" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "credit" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "lineGrossAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "taxableAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "RecurringTransactionTemplateLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecurringTransactionTemplateLine_amounts_valid" CHECK (
    "quantity" > 0 AND "unitPrice" >= 0 AND "discountRate" BETWEEN 0 AND 100
    AND "debit" >= 0 AND "credit" >= 0 AND NOT ("debit" > 0 AND "credit" > 0)
  )
);

CREATE TABLE "RecurringTransactionRun" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "templateId" UUID NOT NULL,
  "templateVersion" INTEGER NOT NULL,
  "scheduledFor" TIMESTAMPTZ(3) NOT NULL,
  "scheduledLocalDate" DATE NOT NULL,
  "timezone" TEXT NOT NULL,
  "trigger" "RecurringRunTrigger" NOT NULL,
  "status" "RecurringRunStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "idempotencyKey" TEXT NOT NULL,
  "workerClaimId" TEXT,
  "startedAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  "generatedSalesInvoiceId" UUID,
  "generatedPurchaseBillId" UUID,
  "generatedJournalEntryId" UUID,
  "generatedExpenseProposalId" UUID,
  "failureCode" TEXT,
  "failureMessageSafe" TEXT,
  "failureRetriable" BOOLEAN NOT NULL DEFAULT false,
  "requestId" TEXT,
  "sourceSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "RecurringTransactionRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecurringTransactionRun_attempt_count_valid" CHECK ("attemptCount" >= 0),
  CONSTRAINT "RecurringTransactionRun_one_generated_target" CHECK (
    num_nonnulls("generatedSalesInvoiceId", "generatedPurchaseBillId", "generatedJournalEntryId", "generatedExpenseProposalId") <= 1
  )
);

CREATE TABLE "RecurringExpenseProposal" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "status" "RecurringExpenseProposalStatus" NOT NULL DEFAULT 'DRAFT',
  "proposedDate" DATE NOT NULL,
  "contactId" UUID,
  "branchId" UUID,
  "paidThroughAccountId" UUID NOT NULL,
  "currency" TEXT NOT NULL,
  "baseCurrency" TEXT NOT NULL,
  "exchangeRate" DECIMAL(18,8),
  "rateDate" DATE,
  "rateSource" "CurrencyRateSource",
  "rateSnapshotId" UUID,
  "subtotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "discountTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "taxableTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "total" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "description" TEXT,
  "notes" TEXT,
  "reviewIdempotencyKey" TEXT,
  "reviewedCashExpenseId" UUID,
  "reviewedByUserId" UUID,
  "reviewedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "RecurringExpenseProposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringExpenseProposalLine" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "proposalId" UUID NOT NULL,
  "itemId" UUID,
  "accountId" UUID NOT NULL,
  "taxRateId" UUID,
  "costCenterId" UUID,
  "projectId" UUID,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(20,4) NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "discountRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
  "lineGrossAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "taxableAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "RecurringExpenseProposalLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecurringTransactionTemplate_organizationId_id_key" ON "RecurringTransactionTemplate"("organizationId", "id");
CREATE UNIQUE INDEX "RecurringTransactionTemplate_organizationId_templateCode_key" ON "RecurringTransactionTemplate"("organizationId", "templateCode");
CREATE INDEX "RecurringTransactionTemplate_organizationId_status_nextRunAt_idx" ON "RecurringTransactionTemplate"("organizationId", "status", "nextRunAt");
CREATE INDEX "RecurringTransactionTemplate_organizationId_transactionType_status_idx" ON "RecurringTransactionTemplate"("organizationId", "transactionType", "status");
CREATE INDEX "RecurringTransactionTemplate_organizationId_partyId_idx" ON "RecurringTransactionTemplate"("organizationId", "partyId");
CREATE INDEX "RecurringTransactionTemplate_organizationId_branchId_idx" ON "RecurringTransactionTemplate"("organizationId", "branchId");
CREATE INDEX "RecurringTransactionTemplate_organizationId_paidThroughAccountId_idx" ON "RecurringTransactionTemplate"("organizationId", "paidThroughAccountId");
CREATE INDEX "RecurringTransactionTemplate_organizationId_currencyCode_idx" ON "RecurringTransactionTemplate"("organizationId", "currencyCode");
CREATE INDEX "RecurringTransactionTemplate_organizationId_rateSnapshotId_idx" ON "RecurringTransactionTemplate"("organizationId", "rateSnapshotId");
CREATE INDEX "RecurringTransactionTemplate_createdByUserId_idx" ON "RecurringTransactionTemplate"("createdByUserId");
CREATE INDEX "RecurringTransactionTemplate_updatedByUserId_idx" ON "RecurringTransactionTemplate"("updatedByUserId");

CREATE UNIQUE INDEX "RecurringTransactionTemplateLine_organizationId_templateId_sortOrder_key" ON "RecurringTransactionTemplateLine"("organizationId", "templateId", "sortOrder");
CREATE INDEX "RecurringTransactionTemplateLine_organizationId_templateId_idx" ON "RecurringTransactionTemplateLine"("organizationId", "templateId");
CREATE INDEX "RecurringTransactionTemplateLine_organizationId_itemId_idx" ON "RecurringTransactionTemplateLine"("organizationId", "itemId");
CREATE INDEX "RecurringTransactionTemplateLine_organizationId_accountId_idx" ON "RecurringTransactionTemplateLine"("organizationId", "accountId");
CREATE INDEX "RecurringTransactionTemplateLine_organizationId_taxRateId_idx" ON "RecurringTransactionTemplateLine"("organizationId", "taxRateId");
CREATE INDEX "RecurringTransactionTemplateLine_organizationId_costCenterId_idx" ON "RecurringTransactionTemplateLine"("organizationId", "costCenterId");
CREATE INDEX "RecurringTransactionTemplateLine_organizationId_projectId_idx" ON "RecurringTransactionTemplateLine"("organizationId", "projectId");

CREATE UNIQUE INDEX "RecurringTransactionRun_generatedSalesInvoiceId_key" ON "RecurringTransactionRun"("generatedSalesInvoiceId");
CREATE UNIQUE INDEX "RecurringTransactionRun_generatedPurchaseBillId_key" ON "RecurringTransactionRun"("generatedPurchaseBillId");
CREATE UNIQUE INDEX "RecurringTransactionRun_generatedJournalEntryId_key" ON "RecurringTransactionRun"("generatedJournalEntryId");
CREATE UNIQUE INDEX "RecurringTransactionRun_generatedExpenseProposalId_key" ON "RecurringTransactionRun"("generatedExpenseProposalId");
CREATE UNIQUE INDEX "RecurringTransactionRun_organizationId_id_key" ON "RecurringTransactionRun"("organizationId", "id");
CREATE UNIQUE INDEX "RecurringTransactionRun_organizationId_templateId_scheduledFor_key" ON "RecurringTransactionRun"("organizationId", "templateId", "scheduledFor");
CREATE UNIQUE INDEX "RecurringTransactionRun_organizationId_idempotencyKey_key" ON "RecurringTransactionRun"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "RecurringTransactionRun_organizationId_generatedSalesInvoiceId_key" ON "RecurringTransactionRun"("organizationId", "generatedSalesInvoiceId");
CREATE UNIQUE INDEX "RecurringTransactionRun_organizationId_generatedPurchaseBillId_key" ON "RecurringTransactionRun"("organizationId", "generatedPurchaseBillId");
CREATE UNIQUE INDEX "RecurringTransactionRun_organizationId_generatedJournalEntryId_key" ON "RecurringTransactionRun"("organizationId", "generatedJournalEntryId");
CREATE UNIQUE INDEX "RecurringTransactionRun_organizationId_generatedExpenseProposalId_key" ON "RecurringTransactionRun"("organizationId", "generatedExpenseProposalId");
CREATE INDEX "RecurringTransactionRun_organizationId_status_scheduledFor_idx" ON "RecurringTransactionRun"("organizationId", "status", "scheduledFor");
CREATE INDEX "RecurringTransactionRun_organizationId_templateId_createdAt_idx" ON "RecurringTransactionRun"("organizationId", "templateId", "createdAt");
CREATE INDEX "RecurringTransactionRun_workerClaimId_idx" ON "RecurringTransactionRun"("workerClaimId");
CREATE INDEX "RecurringTransactionRun_requestId_idx" ON "RecurringTransactionRun"("requestId");

CREATE UNIQUE INDEX "RecurringExpenseProposal_reviewedCashExpenseId_key" ON "RecurringExpenseProposal"("reviewedCashExpenseId");
CREATE UNIQUE INDEX "RecurringExpenseProposal_organizationId_id_key" ON "RecurringExpenseProposal"("organizationId", "id");
CREATE UNIQUE INDEX "RecurringExpenseProposal_organizationId_reviewIdempotencyKey_key" ON "RecurringExpenseProposal"("organizationId", "reviewIdempotencyKey");
CREATE UNIQUE INDEX "RecurringExpenseProposal_organizationId_reviewedCashExpenseId_key" ON "RecurringExpenseProposal"("organizationId", "reviewedCashExpenseId");
CREATE INDEX "RecurringExpenseProposal_organizationId_status_proposedDate_idx" ON "RecurringExpenseProposal"("organizationId", "status", "proposedDate");
CREATE INDEX "RecurringExpenseProposal_organizationId_contactId_idx" ON "RecurringExpenseProposal"("organizationId", "contactId");
CREATE INDEX "RecurringExpenseProposal_organizationId_branchId_idx" ON "RecurringExpenseProposal"("organizationId", "branchId");
CREATE INDEX "RecurringExpenseProposal_organizationId_paidThroughAccountId_idx" ON "RecurringExpenseProposal"("organizationId", "paidThroughAccountId");
CREATE INDEX "RecurringExpenseProposal_organizationId_rateSnapshotId_idx" ON "RecurringExpenseProposal"("organizationId", "rateSnapshotId");
CREATE INDEX "RecurringExpenseProposal_reviewedByUserId_idx" ON "RecurringExpenseProposal"("reviewedByUserId");

CREATE UNIQUE INDEX "RecurringExpenseProposalLine_organizationId_proposalId_sortOrder_key" ON "RecurringExpenseProposalLine"("organizationId", "proposalId", "sortOrder");
CREATE INDEX "RecurringExpenseProposalLine_organizationId_proposalId_idx" ON "RecurringExpenseProposalLine"("organizationId", "proposalId");
CREATE INDEX "RecurringExpenseProposalLine_organizationId_itemId_idx" ON "RecurringExpenseProposalLine"("organizationId", "itemId");
CREATE INDEX "RecurringExpenseProposalLine_organizationId_accountId_idx" ON "RecurringExpenseProposalLine"("organizationId", "accountId");
CREATE INDEX "RecurringExpenseProposalLine_organizationId_taxRateId_idx" ON "RecurringExpenseProposalLine"("organizationId", "taxRateId");
CREATE INDEX "RecurringExpenseProposalLine_organizationId_costCenterId_idx" ON "RecurringExpenseProposalLine"("organizationId", "costCenterId");
CREATE INDEX "RecurringExpenseProposalLine_organizationId_projectId_idx" ON "RecurringExpenseProposalLine"("organizationId", "projectId");

CREATE UNIQUE INDEX "CashExpense_organizationId_id_key" ON "CashExpense"("organizationId", "id");
CREATE UNIQUE INDEX "Branch_organizationId_id_key" ON "Branch"("organizationId", "id");
CREATE UNIQUE INDEX "Item_organizationId_id_key" ON "Item"("organizationId", "id");
CREATE UNIQUE INDEX "TaxRate_organizationId_id_key" ON "TaxRate"("organizationId", "id");
CREATE UNIQUE INDEX "CostCenter_organizationId_id_key" ON "CostCenter"("organizationId", "id");
CREATE UNIQUE INDEX "Project_organizationId_id_key" ON "Project"("organizationId", "id");

ALTER TABLE "RecurringTransactionTemplate" ADD CONSTRAINT "RecurringTransactionTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionTemplate" ADD CONSTRAINT "RecurringTransactionTemplate_organizationId_rateSnapshotId_fkey" FOREIGN KEY ("organizationId", "rateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionTemplate" ADD CONSTRAINT "RecurringTransactionTemplate_organizationId_partyId_fkey" FOREIGN KEY ("organizationId", "partyId") REFERENCES "Contact"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionTemplate" ADD CONSTRAINT "RecurringTransactionTemplate_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "Branch"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionTemplate" ADD CONSTRAINT "RecurringTransactionTemplate_organizationId_paidThroughAccountId_fkey" FOREIGN KEY ("organizationId", "paidThroughAccountId") REFERENCES "Account"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionTemplate" ADD CONSTRAINT "RecurringTransactionTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionTemplate" ADD CONSTRAINT "RecurringTransactionTemplate_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecurringTransactionTemplateLine" ADD CONSTRAINT "RecurringTransactionTemplateLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionTemplateLine" ADD CONSTRAINT "RecurringTransactionTemplateLine_organizationId_templateId_fkey" FOREIGN KEY ("organizationId", "templateId") REFERENCES "RecurringTransactionTemplate"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionTemplateLine" ADD CONSTRAINT "RecurringTransactionTemplateLine_organizationId_itemId_fkey" FOREIGN KEY ("organizationId", "itemId") REFERENCES "Item"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionTemplateLine" ADD CONSTRAINT "RecurringTransactionTemplateLine_organizationId_accountId_fkey" FOREIGN KEY ("organizationId", "accountId") REFERENCES "Account"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionTemplateLine" ADD CONSTRAINT "RecurringTransactionTemplateLine_organizationId_taxRateId_fkey" FOREIGN KEY ("organizationId", "taxRateId") REFERENCES "TaxRate"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionTemplateLine" ADD CONSTRAINT "RecurringTransactionTemplateLine_organizationId_costCenterId_fkey" FOREIGN KEY ("organizationId", "costCenterId") REFERENCES "CostCenter"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionTemplateLine" ADD CONSTRAINT "RecurringTransactionTemplateLine_organizationId_projectId_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "RecurringTransactionRun" ADD CONSTRAINT "RecurringTransactionRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionRun" ADD CONSTRAINT "RecurringTransactionRun_organizationId_templateId_fkey" FOREIGN KEY ("organizationId", "templateId") REFERENCES "RecurringTransactionTemplate"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionRun" ADD CONSTRAINT "RecurringTransactionRun_organizationId_generatedSalesInvoiceId_fkey" FOREIGN KEY ("organizationId", "generatedSalesInvoiceId") REFERENCES "SalesInvoice"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionRun" ADD CONSTRAINT "RecurringTransactionRun_organizationId_generatedPurchaseBillId_fkey" FOREIGN KEY ("organizationId", "generatedPurchaseBillId") REFERENCES "PurchaseBill"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringTransactionRun" ADD CONSTRAINT "RecurringTransactionRun_organizationId_generatedJournalEntryId_fkey" FOREIGN KEY ("organizationId", "generatedJournalEntryId") REFERENCES "JournalEntry"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "RecurringExpenseProposal" ADD CONSTRAINT "RecurringExpenseProposal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseProposal" ADD CONSTRAINT "RecurringExpenseProposal_organizationId_contactId_fkey" FOREIGN KEY ("organizationId", "contactId") REFERENCES "Contact"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseProposal" ADD CONSTRAINT "RecurringExpenseProposal_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "Branch"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseProposal" ADD CONSTRAINT "RecurringExpenseProposal_organizationId_paidThroughAccountId_fkey" FOREIGN KEY ("organizationId", "paidThroughAccountId") REFERENCES "Account"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseProposal" ADD CONSTRAINT "RecurringExpenseProposal_organizationId_rateSnapshotId_fkey" FOREIGN KEY ("organizationId", "rateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseProposal" ADD CONSTRAINT "RecurringExpenseProposal_organizationId_reviewedCashExpenseId_fkey" FOREIGN KEY ("organizationId", "reviewedCashExpenseId") REFERENCES "CashExpense"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseProposal" ADD CONSTRAINT "RecurringExpenseProposal_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecurringTransactionRun" ADD CONSTRAINT "RecurringTransactionRun_organizationId_generatedExpenseProposalId_fkey" FOREIGN KEY ("organizationId", "generatedExpenseProposalId") REFERENCES "RecurringExpenseProposal"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "RecurringExpenseProposalLine" ADD CONSTRAINT "RecurringExpenseProposalLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseProposalLine" ADD CONSTRAINT "RecurringExpenseProposalLine_organizationId_proposalId_fkey" FOREIGN KEY ("organizationId", "proposalId") REFERENCES "RecurringExpenseProposal"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseProposalLine" ADD CONSTRAINT "RecurringExpenseProposalLine_organizationId_itemId_fkey" FOREIGN KEY ("organizationId", "itemId") REFERENCES "Item"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseProposalLine" ADD CONSTRAINT "RecurringExpenseProposalLine_organizationId_accountId_fkey" FOREIGN KEY ("organizationId", "accountId") REFERENCES "Account"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseProposalLine" ADD CONSTRAINT "RecurringExpenseProposalLine_organizationId_taxRateId_fkey" FOREIGN KEY ("organizationId", "taxRateId") REFERENCES "TaxRate"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseProposalLine" ADD CONSTRAINT "RecurringExpenseProposalLine_organizationId_costCenterId_fkey" FOREIGN KEY ("organizationId", "costCenterId") REFERENCES "CostCenter"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseProposalLine" ADD CONSTRAINT "RecurringExpenseProposalLine_organizationId_projectId_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Stop before backfill if old records cannot be represented without guessing.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "RecurringInvoiceTemplate" legacy
    JOIN "Organization" org ON org."id" = legacy."organizationId"
    WHERE legacy."interval" < 1
      OR legacy."nextRunDate" < legacy."startDate"
      OR (legacy."endDate" IS NOT NULL AND (legacy."endDate" < legacy."startDate" OR legacy."nextRunDate" > legacy."endDate"))
      OR BTRIM(legacy."currency") = ''
      OR BTRIM(org."timezone") = ''
      OR NOT EXISTS (SELECT 1 FROM pg_timezone_names tz WHERE tz.name = org."timezone")
      OR (legacy."dayOfWeek" IS NOT NULL AND legacy."dayOfWeek" NOT BETWEEN 0 AND 6)
      OR (legacy."dayOfMonth" IS NOT NULL AND legacy."dayOfMonth" NOT BETWEEN 1 AND 31)
      OR (legacy."monthOfYear" IS NOT NULL AND legacy."monthOfYear" NOT BETWEEN 1 AND 12)
  ) OR EXISTS (
    SELECT 1
    FROM "RecurringInvoiceTemplateLine" line
    JOIN "RecurringInvoiceTemplate" legacy ON legacy."id" = line."templateId"
    WHERE line."organizationId" <> legacy."organizationId"
  ) OR EXISTS (
    SELECT 1
    FROM "RecurringInvoiceTemplateLine"
    GROUP BY "organizationId", "templateId", "sortOrder"
    HAVING COUNT(*) > 1
  ) OR EXISTS (
    SELECT 1
    FROM "RecurringInvoiceRun" run
    JOIN "RecurringInvoiceTemplate" legacy ON legacy."id" = run."templateId"
    WHERE run."organizationId" <> legacy."organizationId" OR run."generatedInvoiceId" IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM "RecurringInvoiceRun"
    GROUP BY "organizationId", "templateId", "runDate"::date
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Recurring transaction migration blocked: legacy recurring invoice schedule cannot be mapped deterministically.';
  END IF;
END $$;

INSERT INTO "RecurringTransactionTemplate" (
  "id", "organizationId", "transactionType", "templateCode", "name", "status", "timezone", "frequency", "interval",
  "dayOfWeek", "dayOfMonth", "monthOfYear", "startDate", "endDate", "nextRunAt", "lastRunAt", "catchUpPolicy",
  "generationMode", "templateVersion", "currencyCode", "exchangeRatePolicy", "partyId", "branchId", "paymentTermsDays",
  "reference", "notes", "terms", "taxMode", "subtotal", "discountTotal", "taxableTotal", "taxTotal", "total",
  "createdByUserId", "updatedByUserId", "archivedAt", "createdAt", "updatedAt"
)
SELECT legacy."id", legacy."organizationId", 'SALES_INVOICE'::"RecurringTransactionType", legacy."templateNumber", legacy."name",
  CASE legacy."status"::text
    WHEN 'DRAFT' THEN 'DRAFT'::"RecurringTransactionStatus"
    WHEN 'ACTIVE' THEN 'ACTIVE'::"RecurringTransactionStatus"
    WHEN 'PAUSED' THEN 'PAUSED'::"RecurringTransactionStatus"
    WHEN 'ENDED' THEN 'COMPLETED'::"RecurringTransactionStatus"
    ELSE 'ARCHIVED'::"RecurringTransactionStatus"
  END,
  org."timezone", legacy."frequency"::text::"RecurringFrequency", legacy."interval", legacy."dayOfWeek", legacy."dayOfMonth", legacy."monthOfYear",
  legacy."startDate"::date, legacy."endDate"::date,
  legacy."nextRunDate"::date::timestamp AT TIME ZONE org."timezone",
  CASE WHEN legacy."lastRunDate" IS NULL THEN NULL ELSE legacy."lastRunDate"::date::timestamp AT TIME ZONE org."timezone" END,
  'SKIP_MISSED'::"RecurringCatchUpPolicy", 'DRAFT_ONLY'::"RecurringGenerationMode", 1, UPPER(legacy."currency"),
  CASE WHEN UPPER(legacy."currency") = UPPER(org."baseCurrency")
    THEN 'BASE_CURRENCY_ONLY'::"RecurringExchangeRatePolicy"
    ELSE 'REQUIRE_RATE_AT_RUN'::"RecurringExchangeRatePolicy"
  END,
  legacy."customerId", legacy."branchId", legacy."paymentTermsDays", legacy."reference", legacy."notes", legacy."terms", legacy."taxMode",
  legacy."subtotal", legacy."discountTotal", legacy."taxableTotal", legacy."taxTotal", legacy."total",
  legacy."createdById", legacy."createdById",
  CASE WHEN legacy."status"::text = 'CANCELLED' THEN legacy."updatedAt" ELSE NULL END,
  legacy."createdAt", legacy."updatedAt"
FROM "RecurringInvoiceTemplate" legacy
JOIN "Organization" org ON org."id" = legacy."organizationId";

INSERT INTO "RecurringTransactionTemplateLine" (
  "id", "organizationId", "templateId", "itemId", "accountId", "taxRateId", "description", "quantity", "unitPrice",
  "discountRate", "lineGrossAmount", "discountAmount", "taxableAmount", "taxAmount", "lineTotal", "sortOrder", "createdAt", "updatedAt"
)
SELECT line."id", line."organizationId", line."templateId", line."itemId", line."accountId", line."taxRateId", line."description",
  line."quantity", line."unitPrice", line."discountRate", line."lineGrossAmount", line."discountAmount", line."taxableAmount",
  line."taxAmount", line."lineTotal", line."sortOrder", line."createdAt", line."updatedAt"
FROM "RecurringInvoiceTemplateLine" line;

INSERT INTO "RecurringTransactionRun" (
  "id", "organizationId", "templateId", "templateVersion", "scheduledFor", "scheduledLocalDate", "timezone", "trigger", "status",
  "attemptCount", "idempotencyKey", "startedAt", "completedAt", "generatedSalesInvoiceId", "failureRetriable", "sourceSnapshot", "createdAt", "updatedAt"
)
SELECT run."id", run."organizationId", run."templateId", 1,
  run."runDate"::date::timestamp AT TIME ZONE org."timezone", run."runDate"::date, org."timezone",
  'MANUAL'::"RecurringRunTrigger", 'GENERATED'::"RecurringRunStatus", 1,
  'legacy-recurring-invoice-run:' || run."id"::text, run."createdAt", run."createdAt", run."generatedInvoiceId", false,
  jsonb_build_object(
    'legacyRecurringInvoiceRunId', run."id",
    'invoiceDate', run."invoiceDate",
    'dueDate', run."dueDate",
    'periodStart', run."periodStart",
    'periodEnd', run."periodEnd",
    'generatedById', run."generatedById"
  ),
  run."createdAt", run."createdAt"
FROM "RecurringInvoiceRun" run
JOIN "Organization" org ON org."id" = run."organizationId";
