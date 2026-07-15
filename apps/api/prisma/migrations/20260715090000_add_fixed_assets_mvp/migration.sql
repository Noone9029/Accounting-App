BEGIN;

ALTER TYPE "ImportEntityType" ADD VALUE 'FIXED_ASSET_OPENING_BALANCES';
ALTER TYPE "NumberSequenceScope" ADD VALUE 'FIXED_ASSET';

CREATE TYPE "FixedAssetCategoryStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "FixedAssetStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'ACTIVE', 'FULLY_DEPRECIATED', 'DISPOSED', 'WRITTEN_OFF');
CREATE TYPE "FixedAssetAcquisitionSource" AS ENUM ('MANUAL', 'PURCHASE_BILL', 'OPENING_BALANCE');
CREATE TYPE "FixedAssetDepreciationMethod" AS ENUM ('STRAIGHT_LINE');
CREATE TYPE "FixedAssetScheduleLineStatus" AS ENUM ('UNPOSTED', 'POSTED', 'REVERSED');
CREATE TYPE "FixedAssetDepreciationRunStatus" AS ENUM ('DRAFT', 'REVIEWED', 'POSTED', 'REVERSED', 'FAILED');
CREATE TYPE "FixedAssetMovementType" AS ENUM ('ACQUISITION', 'OPENING_BALANCE', 'DEPRECIATION', 'DEPRECIATION_REVERSAL', 'DISPOSAL', 'WRITE_OFF', 'DISPOSAL_REVERSAL');

CREATE TABLE "FixedAssetCategory" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "FixedAssetCategoryStatus" NOT NULL DEFAULT 'ACTIVE',
  "assetCostAccountId" UUID NOT NULL,
  "accumulatedDepreciationAccountId" UUID NOT NULL,
  "depreciationExpenseAccountId" UUID NOT NULL,
  "disposalGainAccountId" UUID NOT NULL,
  "disposalLossAccountId" UUID NOT NULL,
  "defaultUsefulLifeMonths" INTEGER NOT NULL,
  "defaultSalvageValue" DECIMAL(20,4) NOT NULL,
  "createdByUserId" UUID,
  "updatedByUserId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "archivedAt" TIMESTAMPTZ(3),
  CONSTRAINT "FixedAssetCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FixedAssetCategory_defaultUsefulLifeMonths_positive" CHECK ("defaultUsefulLifeMonths" > 0),
  CONSTRAINT "FixedAssetCategory_defaultSalvageValue_nonnegative" CHECK ("defaultSalvageValue" >= 0)
);

CREATE TABLE "FixedAsset" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "assetNumber" TEXT NOT NULL,
  "categoryId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "serialNumber" TEXT,
  "tagNumber" TEXT,
  "location" TEXT,
  "custodianName" TEXT,
  "status" "FixedAssetStatus" NOT NULL DEFAULT 'DRAFT',
  "acquisitionSource" "FixedAssetAcquisitionSource" NOT NULL,
  "acquisitionDate" TIMESTAMPTZ(3) NOT NULL,
  "inServiceDate" TIMESTAMPTZ(3) NOT NULL,
  "baseCurrencyCode" TEXT NOT NULL,
  "transactionCurrencyCode" TEXT,
  "exchangeRate" DECIMAL(18,8),
  "rateDate" DATE,
  "rateSource" TEXT,
  "rateSnapshotId" UUID,
  "transactionAcquisitionCost" DECIMAL(20,4),
  "baseAcquisitionCost" DECIMAL(20,4) NOT NULL,
  "baseSalvageValue" DECIMAL(20,4) NOT NULL,
  "usefulLifeMonths" INTEGER NOT NULL,
  "depreciationMethod" "FixedAssetDepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
  "accumulatedDepreciation" DECIMAL(20,4) NOT NULL,
  "carryingAmount" DECIMAL(20,4) NOT NULL,
  "costCenterId" UUID,
  "projectId" UUID,
  "capitalizationJournalEntryId" UUID,
  "disposalJournalEntryId" UUID,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" UUID,
  "updatedByUserId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "activatedAt" TIMESTAMPTZ(3),
  "fullyDepreciatedAt" TIMESTAMPTZ(3),
  "disposedAt" TIMESTAMPTZ(3),
  "writtenOffAt" TIMESTAMPTZ(3),
  CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FixedAsset_baseAcquisitionCost_positive" CHECK ("baseAcquisitionCost" > 0),
  CONSTRAINT "FixedAsset_baseSalvageValue_nonnegative" CHECK ("baseSalvageValue" >= 0),
  CONSTRAINT "FixedAsset_baseSalvageValue_lte_cost" CHECK ("baseSalvageValue" <= "baseAcquisitionCost"),
  CONSTRAINT "FixedAsset_usefulLifeMonths_positive" CHECK ("usefulLifeMonths" > 0),
  CONSTRAINT "FixedAsset_accumulatedDepreciation_nonnegative" CHECK ("accumulatedDepreciation" >= 0),
  CONSTRAINT "FixedAsset_accumulatedDepreciation_lte_cost_minus_salvage" CHECK ("accumulatedDepreciation" <= "baseAcquisitionCost" - "baseSalvageValue"),
  CONSTRAINT "FixedAsset_carryingAmount_gte_salvage" CHECK ("carryingAmount" >= "baseSalvageValue"),
  CONSTRAINT "FixedAsset_carryingAmount_lte_cost" CHECK ("carryingAmount" <= "baseAcquisitionCost")
);

CREATE TABLE "FixedAssetSourceLink" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "fixedAssetId" UUID NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceEntityId" UUID NOT NULL,
  "sourceLineId" UUID,
  "sourceJournalEntryId" UUID,
  "capitalizedBaseAmount" DECIMAL(20,4) NOT NULL,
  "transactionAmount" DECIMAL(20,4),
  "currencyCode" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FixedAssetSourceLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FixedAssetDepreciationScheduleLine" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "fixedAssetId" UUID NOT NULL,
  "periodStart" TIMESTAMPTZ(3) NOT NULL,
  "periodEnd" TIMESTAMPTZ(3) NOT NULL,
  "depreciationDate" TIMESTAMPTZ(3) NOT NULL,
  "openingCarryingAmount" DECIMAL(20,4) NOT NULL,
  "depreciationAmount" DECIMAL(20,4) NOT NULL,
  "accumulatedDepreciationAfter" DECIMAL(20,4) NOT NULL,
  "closingCarryingAmount" DECIMAL(20,4) NOT NULL,
  "status" "FixedAssetScheduleLineStatus" NOT NULL DEFAULT 'UNPOSTED',
  "depreciationRunLineId" UUID,
  "journalEntryId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "postedAt" TIMESTAMPTZ(3),
  CONSTRAINT "FixedAssetDepreciationScheduleLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FixedAssetDepreciationScheduleLine_depreciation_nonnegative" CHECK ("depreciationAmount" >= 0)
);

CREATE TABLE "FixedAssetDepreciationRun" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "fiscalPeriodId" UUID NOT NULL,
  "depreciationDate" TIMESTAMPTZ(3) NOT NULL,
  "status" "FixedAssetDepreciationRunStatus" NOT NULL DEFAULT 'DRAFT',
  "assetCount" INTEGER NOT NULL DEFAULT 0,
  "totalDepreciation" DECIMAL(20,4) NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "reviewedByUserId" UUID,
  "postedByUserId" UUID,
  "journalEntryId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMPTZ(3),
  "postedAt" TIMESTAMPTZ(3),
  "reversedAt" TIMESTAMPTZ(3),
  CONSTRAINT "FixedAssetDepreciationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FixedAssetDepreciationRunLine" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "runId" UUID NOT NULL,
  "fixedAssetId" UUID NOT NULL,
  "scheduleLineId" UUID NOT NULL,
  "depreciationAmount" DECIMAL(20,4) NOT NULL,
  "expenseAccountId" UUID NOT NULL,
  "accumulatedDepreciationAccountId" UUID NOT NULL,
  "costCenterId" UUID,
  "projectId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FixedAssetDepreciationRunLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FixedAssetMovement" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "fixedAssetId" UUID NOT NULL,
  "movementType" "FixedAssetMovementType" NOT NULL,
  "effectiveDate" TIMESTAMPTZ(3) NOT NULL,
  "baseAmount" DECIMAL(20,4) NOT NULL,
  "journalEntryId" UUID,
  "reversedMovementId" UUID,
  "reason" TEXT,
  "createdByUserId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "postedAt" TIMESTAMPTZ(3),
  CONSTRAINT "FixedAssetMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FixedAssetCategory_organizationId_code_key" ON "FixedAssetCategory"("organizationId", "code");
CREATE UNIQUE INDEX "FixedAssetCategory_organizationId_id_key" ON "FixedAssetCategory"("organizationId", "id");
CREATE UNIQUE INDEX "FixedAsset_organizationId_assetNumber_key" ON "FixedAsset"("organizationId", "assetNumber");
CREATE UNIQUE INDEX "FixedAsset_organizationId_id_key" ON "FixedAsset"("organizationId", "id");
CREATE UNIQUE INDEX "FixedAssetSourceLink_organizationId_sourceType_sourceEntityId_sourceLineId_key" ON "FixedAssetSourceLink"("organizationId", "sourceType", "sourceEntityId", "sourceLineId");
CREATE UNIQUE INDEX "fixed_asset_schedule_org_asset_period_key" ON "FixedAssetDepreciationScheduleLine"("organizationId", "fixedAssetId", "periodStart");
CREATE UNIQUE INDEX "FixedAssetDepreciationScheduleLine_organizationId_id_key" ON "FixedAssetDepreciationScheduleLine"("organizationId", "id");
CREATE UNIQUE INDEX "FixedAssetDepreciationRun_organizationId_id_key" ON "FixedAssetDepreciationRun"("organizationId", "id");
CREATE UNIQUE INDEX "FixedAssetDepreciationRun_organizationId_idempotencyKey_key" ON "FixedAssetDepreciationRun"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "FixedAssetDepreciationRunLine_organizationId_runId_fixedAssetId_scheduleLineId_key" ON "FixedAssetDepreciationRunLine"("organizationId", "runId", "fixedAssetId", "scheduleLineId");
CREATE UNIQUE INDEX "FixedAssetDepreciationRunLine_organizationId_id_key" ON "FixedAssetDepreciationRunLine"("organizationId", "id");
CREATE UNIQUE INDEX "FixedAssetMovement_organizationId_id_key" ON "FixedAssetMovement"("organizationId", "id");

CREATE INDEX "FixedAssetCategory_organizationId_status_idx" ON "FixedAssetCategory"("organizationId", "status");
CREATE INDEX "FixedAsset_organizationId_status_acquisitionDate_idx" ON "FixedAsset"("organizationId", "status", "acquisitionDate");
CREATE INDEX "FixedAsset_organizationId_categoryId_idx" ON "FixedAsset"("organizationId", "categoryId");
CREATE INDEX "FixedAsset_organizationId_inServiceDate_idx" ON "FixedAsset"("organizationId", "inServiceDate");
CREATE INDEX "FixedAssetSourceLink_organizationId_fixedAssetId_idx" ON "FixedAssetSourceLink"("organizationId", "fixedAssetId");
CREATE INDEX "FixedAssetSourceLink_organizationId_sourceEntityId_sourceLineId_idx" ON "FixedAssetSourceLink"("organizationId", "sourceEntityId", "sourceLineId");
CREATE INDEX "FixedAssetDepreciationScheduleLine_organizationId_status_depreciationDate_idx" ON "FixedAssetDepreciationScheduleLine"("organizationId", "status", "depreciationDate");
CREATE INDEX "fixed_asset_schedule_org_asset_date_idx" ON "FixedAssetDepreciationScheduleLine"("organizationId", "fixedAssetId", "depreciationDate");
CREATE INDEX "FixedAssetDepreciationRun_organizationId_fiscalPeriodId_status_idx" ON "FixedAssetDepreciationRun"("organizationId", "fiscalPeriodId", "status");
CREATE INDEX "FixedAssetDepreciationRun_organizationId_depreciationDate_idx" ON "FixedAssetDepreciationRun"("organizationId", "depreciationDate");
CREATE INDEX "FixedAssetDepreciationRunLine_organizationId_runId_idx" ON "FixedAssetDepreciationRunLine"("organizationId", "runId");
CREATE INDEX "FixedAssetDepreciationRunLine_organizationId_fixedAssetId_idx" ON "FixedAssetDepreciationRunLine"("organizationId", "fixedAssetId");
CREATE INDEX "FixedAssetMovement_organizationId_fixedAssetId_effectiveDate_idx" ON "FixedAssetMovement"("organizationId", "fixedAssetId", "effectiveDate");
CREATE INDEX "FixedAssetMovement_organizationId_movementType_effectiveDate_idx" ON "FixedAssetMovement"("organizationId", "movementType", "effectiveDate");

ALTER TABLE "FixedAssetCategory" ADD CONSTRAINT "FixedAssetCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FixedAssetCategory" ADD CONSTRAINT "FixedAssetCategory_org_assetCostAccount_fkey" FOREIGN KEY ("organizationId", "assetCostAccountId") REFERENCES "Account"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FixedAssetCategory" ADD CONSTRAINT "FixedAssetCategory_org_accumulatedAccount_fkey" FOREIGN KEY ("organizationId", "accumulatedDepreciationAccountId") REFERENCES "Account"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FixedAssetCategory" ADD CONSTRAINT "FixedAssetCategory_org_expenseAccount_fkey" FOREIGN KEY ("organizationId", "depreciationExpenseAccountId") REFERENCES "Account"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FixedAssetCategory" ADD CONSTRAINT "FixedAssetCategory_org_disposalGainAccount_fkey" FOREIGN KEY ("organizationId", "disposalGainAccountId") REFERENCES "Account"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FixedAssetCategory" ADD CONSTRAINT "FixedAssetCategory_org_disposalLossAccount_fkey" FOREIGN KEY ("organizationId", "disposalLossAccountId") REFERENCES "Account"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_org_category_fkey" FOREIGN KEY ("organizationId", "categoryId") REFERENCES "FixedAssetCategory"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_org_costCenter_fkey" FOREIGN KEY ("organizationId", "costCenterId") REFERENCES "CostCenter"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_org_project_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FixedAssetSourceLink" ADD CONSTRAINT "FixedAssetSourceLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FixedAssetSourceLink" ADD CONSTRAINT "FixedAssetSourceLink_org_asset_fkey" FOREIGN KEY ("organizationId", "fixedAssetId") REFERENCES "FixedAsset"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FixedAssetDepreciationScheduleLine" ADD CONSTRAINT "FixedAssetSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FixedAssetDepreciationScheduleLine" ADD CONSTRAINT "FixedAssetSchedule_org_asset_fkey" FOREIGN KEY ("organizationId", "fixedAssetId") REFERENCES "FixedAsset"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FixedAssetDepreciationRun" ADD CONSTRAINT "FixedAssetRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FixedAssetDepreciationRun" ADD CONSTRAINT "FixedAssetRun_org_period_fkey" FOREIGN KEY ("organizationId", "fiscalPeriodId") REFERENCES "FiscalPeriod"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FixedAssetDepreciationRunLine" ADD CONSTRAINT "FixedAssetRunLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FixedAssetDepreciationRunLine" ADD CONSTRAINT "FixedAssetRunLine_org_run_fkey" FOREIGN KEY ("organizationId", "runId") REFERENCES "FixedAssetDepreciationRun"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FixedAssetDepreciationRunLine" ADD CONSTRAINT "FixedAssetRunLine_org_asset_fkey" FOREIGN KEY ("organizationId", "fixedAssetId") REFERENCES "FixedAsset"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FixedAssetDepreciationRunLine" ADD CONSTRAINT "FixedAssetRunLine_org_schedule_fkey" FOREIGN KEY ("organizationId", "scheduleLineId") REFERENCES "FixedAssetDepreciationScheduleLine"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FixedAssetMovement" ADD CONSTRAINT "FixedAssetMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FixedAssetMovement" ADD CONSTRAINT "FixedAssetMovement_org_asset_fkey" FOREIGN KEY ("organizationId", "fixedAssetId") REFERENCES "FixedAsset"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

REVOKE ALL PRIVILEGES ON TABLE "FixedAssetCategory" FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE "FixedAsset" FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE "FixedAssetSourceLink" FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE "FixedAssetDepreciationScheduleLine" FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE "FixedAssetDepreciationRun" FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE "FixedAssetDepreciationRunLine" FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE "FixedAssetMovement" FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE "FixedAssetCategory", "FixedAsset", "FixedAssetSourceLink", "FixedAssetDepreciationScheduleLine", "FixedAssetDepreciationRun", "FixedAssetDepreciationRunLine", "FixedAssetMovement" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE "FixedAssetCategory", "FixedAsset", "FixedAssetSourceLink", "FixedAssetDepreciationScheduleLine", "FixedAssetDepreciationRun", "FixedAssetDepreciationRunLine", "FixedAssetMovement" FROM authenticated';
  END IF;
END $$;

COMMIT;
