-- Add deterministic bank-rule metadata and explicit application audit rows.
-- This migration does not create live bank feeds, bank credentials, payment
-- initiation, reconciliation state changes, or accounting postings.
CREATE TYPE "BankRuleDirection" AS ENUM (
  'ANY',
  'DEBIT',
  'CREDIT'
);

CREATE TYPE "BankRuleActionType" AS ENUM (
  'SUGGEST_CATEGORIZE',
  'SUGGEST_IGNORE',
  'SUGGEST_MATCH_CANDIDATES',
  'CATEGORIZE',
  'IGNORE'
);

CREATE TYPE "BankRuleApplicationType" AS ENUM (
  'DRY_RUN',
  'APPLIED'
);

CREATE TYPE "BankRuleApplicationStatus" AS ENUM (
  'SUGGESTED',
  'APPLIED',
  'FAILED'
);

CREATE TABLE "BankRule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "bankAccountProfileId" UUID,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "direction" "BankRuleDirection" NOT NULL DEFAULT 'ANY',
  "descriptionContains" TEXT,
  "descriptionRegex" TEXT,
  "referenceContains" TEXT,
  "bankReferenceContains" TEXT,
  "counterpartyContains" TEXT,
  "amountEquals" DECIMAL(20,4),
  "amountMin" DECIMAL(20,4),
  "amountMax" DECIMAL(20,4),
  "currencyEquals" TEXT,
  "sourceFormat" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "actionType" "BankRuleActionType" NOT NULL,
  "categorizeAccountId" UUID,
  "ignoreReason" TEXT,
  "autoApply" BOOLEAN NOT NULL DEFAULT false,
  "lastDryRunAt" TIMESTAMP(3),
  "lastAppliedAt" TIMESTAMP(3),
  "createdById" UUID,
  "updatedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BankRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BankRuleApplication" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "bankRuleId" UUID NOT NULL,
  "bankStatementTransactionId" UUID NOT NULL,
  "bankAccountProfileId" UUID NOT NULL,
  "actionType" "BankRuleActionType" NOT NULL,
  "evaluationType" "BankRuleApplicationType" NOT NULL DEFAULT 'APPLIED',
  "status" "BankRuleApplicationStatus" NOT NULL,
  "matchedReasons" JSONB NOT NULL,
  "result" JSONB,
  "appliedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankRuleApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BankRule_organizationId_idx" ON "BankRule"("organizationId");
CREATE INDEX "BankRule_organizationId_enabled_idx" ON "BankRule"("organizationId", "enabled");
CREATE INDEX "BankRule_organizationId_bankAccountProfileId_idx" ON "BankRule"("organizationId", "bankAccountProfileId");
CREATE INDEX "BankRule_organizationId_priority_idx" ON "BankRule"("organizationId", "priority");
CREATE INDEX "BankRule_categorizeAccountId_idx" ON "BankRule"("categorizeAccountId");
CREATE INDEX "BankRule_createdById_idx" ON "BankRule"("createdById");
CREATE INDEX "BankRule_updatedById_idx" ON "BankRule"("updatedById");

CREATE INDEX "BankRuleApplication_organizationId_idx" ON "BankRuleApplication"("organizationId");
CREATE INDEX "BankRuleApplication_bankRuleId_idx" ON "BankRuleApplication"("bankRuleId");
CREATE INDEX "BankRuleApplication_bankStatementTransactionId_idx" ON "BankRuleApplication"("bankStatementTransactionId");
CREATE INDEX "BankRuleApplication_bankAccountProfileId_idx" ON "BankRuleApplication"("bankAccountProfileId");
CREATE INDEX "BankRuleApplication_appliedById_idx" ON "BankRuleApplication"("appliedById");

ALTER TABLE "BankRule"
  ADD CONSTRAINT "BankRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "BankRule_bankAccountProfileId_fkey" FOREIGN KEY ("bankAccountProfileId") REFERENCES "BankAccountProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "BankRule_categorizeAccountId_fkey" FOREIGN KEY ("categorizeAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "BankRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "BankRule_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BankRuleApplication"
  ADD CONSTRAINT "BankRuleApplication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "BankRuleApplication_bankRuleId_fkey" FOREIGN KEY ("bankRuleId") REFERENCES "BankRule"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "BankRuleApplication_bankStatementTransactionId_fkey" FOREIGN KEY ("bankStatementTransactionId") REFERENCES "BankStatementTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "BankRuleApplication_bankAccountProfileId_fkey" FOREIGN KEY ("bankAccountProfileId") REFERENCES "BankAccountProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "BankRuleApplication_appliedById_fkey" FOREIGN KEY ("appliedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
