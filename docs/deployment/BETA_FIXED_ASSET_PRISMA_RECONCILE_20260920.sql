-- MUTATING METADATA ONLY: approved beta Prisma-history reconciliation, not a schema migration.
-- Target project: xynelbjqcmbgtscfmmzv. Verify the Supabase tool project_id before execution.
-- Run only after the standalone catalog preflight PASS and independent Supabase history read-back.
-- Original canonical Git/LF SHA-256 values; never hash this wrapper or overwrite an existing row.
-- The embedded identical preflight is rechecked atomically before inserting any missing history.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
DO $reconcile$
DECLARE v_result jsonb; v_migration record;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(72707369);
  LOCK TABLE public._prisma_migrations IN SHARE ROW EXCLUSIVE MODE;
  v_result := (
WITH
expected_tables(table_name) AS (VALUES
  ('FixedAssetCategory'),
  ('FixedAsset'),
  ('FixedAssetSourceLink'),
  ('FixedAssetDepreciationScheduleLine'),
  ('FixedAssetDepreciationRun'),
  ('FixedAssetDepreciationRunLine'),
  ('FixedAssetMovement')
),
expected_columns(table_name,column_name,type_name,type_schema,type_mod,not_null,default_expr) AS (VALUES
  ('FixedAssetCategory', 'id', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetCategory', 'organizationId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetCategory', 'code', 'text', 'pg_catalog', -1, true, NULL),
  ('FixedAssetCategory', 'name', 'text', 'pg_catalog', -1, true, NULL),
  ('FixedAssetCategory', 'description', 'text', 'pg_catalog', -1, false, NULL),
  ('FixedAssetCategory', 'status', 'FixedAssetCategoryStatus', 'public', -1, true, '''ACTIVE''::"FixedAssetCategoryStatus"'),
  ('FixedAssetCategory', 'assetCostAccountId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetCategory', 'accumulatedDepreciationAccountId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetCategory', 'depreciationExpenseAccountId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetCategory', 'disposalGainAccountId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetCategory', 'disposalLossAccountId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetCategory', 'defaultUsefulLifeMonths', 'int4', 'pg_catalog', -1, true, NULL),
  ('FixedAssetCategory', 'defaultSalvageValue', 'numeric', 'pg_catalog', 1310728, true, NULL),
  ('FixedAssetCategory', 'createdByUserId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAssetCategory', 'updatedByUserId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAssetCategory', 'createdAt', 'timestamptz', 'pg_catalog', 3, true, 'CURRENT_TIMESTAMP'),
  ('FixedAssetCategory', 'updatedAt', 'timestamptz', 'pg_catalog', 3, true, NULL),
  ('FixedAssetCategory', 'archivedAt', 'timestamptz', 'pg_catalog', 3, false, NULL),
  ('FixedAsset', 'id', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAsset', 'organizationId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAsset', 'assetNumber', 'text', 'pg_catalog', -1, true, NULL),
  ('FixedAsset', 'categoryId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAsset', 'name', 'text', 'pg_catalog', -1, true, NULL),
  ('FixedAsset', 'description', 'text', 'pg_catalog', -1, false, NULL),
  ('FixedAsset', 'serialNumber', 'text', 'pg_catalog', -1, false, NULL),
  ('FixedAsset', 'tagNumber', 'text', 'pg_catalog', -1, false, NULL),
  ('FixedAsset', 'location', 'text', 'pg_catalog', -1, false, NULL),
  ('FixedAsset', 'custodianName', 'text', 'pg_catalog', -1, false, NULL),
  ('FixedAsset', 'status', 'FixedAssetStatus', 'public', -1, true, '''DRAFT''::"FixedAssetStatus"'),
  ('FixedAsset', 'acquisitionSource', 'FixedAssetAcquisitionSource', 'public', -1, true, NULL),
  ('FixedAsset', 'acquisitionDate', 'timestamptz', 'pg_catalog', 3, true, NULL),
  ('FixedAsset', 'inServiceDate', 'timestamptz', 'pg_catalog', 3, true, NULL),
  ('FixedAsset', 'baseCurrencyCode', 'text', 'pg_catalog', -1, true, NULL),
  ('FixedAsset', 'transactionCurrencyCode', 'text', 'pg_catalog', -1, false, NULL),
  ('FixedAsset', 'exchangeRate', 'numeric', 'pg_catalog', 1179660, false, NULL),
  ('FixedAsset', 'rateDate', 'date', 'pg_catalog', -1, false, NULL),
  ('FixedAsset', 'rateSource', 'text', 'pg_catalog', -1, false, NULL),
  ('FixedAsset', 'rateSnapshotId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAsset', 'transactionAcquisitionCost', 'numeric', 'pg_catalog', 1310728, false, NULL),
  ('FixedAsset', 'baseAcquisitionCost', 'numeric', 'pg_catalog', 1310728, true, NULL),
  ('FixedAsset', 'baseSalvageValue', 'numeric', 'pg_catalog', 1310728, true, NULL),
  ('FixedAsset', 'usefulLifeMonths', 'int4', 'pg_catalog', -1, true, NULL),
  ('FixedAsset', 'depreciationMethod', 'FixedAssetDepreciationMethod', 'public', -1, true, '''STRAIGHT_LINE''::"FixedAssetDepreciationMethod"'),
  ('FixedAsset', 'accumulatedDepreciation', 'numeric', 'pg_catalog', 1310728, true, NULL),
  ('FixedAsset', 'carryingAmount', 'numeric', 'pg_catalog', 1310728, true, NULL),
  ('FixedAsset', 'costCenterId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAsset', 'projectId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAsset', 'capitalizationJournalEntryId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAsset', 'disposalJournalEntryId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAsset', 'version', 'int4', 'pg_catalog', -1, true, '1'),
  ('FixedAsset', 'createdByUserId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAsset', 'updatedByUserId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAsset', 'createdAt', 'timestamptz', 'pg_catalog', 3, true, 'CURRENT_TIMESTAMP'),
  ('FixedAsset', 'updatedAt', 'timestamptz', 'pg_catalog', 3, true, NULL),
  ('FixedAsset', 'activatedAt', 'timestamptz', 'pg_catalog', 3, false, NULL),
  ('FixedAsset', 'fullyDepreciatedAt', 'timestamptz', 'pg_catalog', 3, false, NULL),
  ('FixedAsset', 'disposedAt', 'timestamptz', 'pg_catalog', 3, false, NULL),
  ('FixedAsset', 'writtenOffAt', 'timestamptz', 'pg_catalog', 3, false, NULL),
  ('FixedAssetSourceLink', 'id', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetSourceLink', 'organizationId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetSourceLink', 'fixedAssetId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetSourceLink', 'sourceType', 'text', 'pg_catalog', -1, true, NULL),
  ('FixedAssetSourceLink', 'sourceEntityId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetSourceLink', 'sourceLineId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAssetSourceLink', 'sourceJournalEntryId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAssetSourceLink', 'capitalizedBaseAmount', 'numeric', 'pg_catalog', 1310728, true, NULL),
  ('FixedAssetSourceLink', 'transactionAmount', 'numeric', 'pg_catalog', 1310728, false, NULL),
  ('FixedAssetSourceLink', 'currencyCode', 'text', 'pg_catalog', -1, false, NULL),
  ('FixedAssetSourceLink', 'createdAt', 'timestamptz', 'pg_catalog', 3, true, 'CURRENT_TIMESTAMP'),
  ('FixedAssetDepreciationScheduleLine', 'id', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetDepreciationScheduleLine', 'organizationId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetDepreciationScheduleLine', 'fixedAssetId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetDepreciationScheduleLine', 'periodStart', 'timestamptz', 'pg_catalog', 3, true, NULL),
  ('FixedAssetDepreciationScheduleLine', 'periodEnd', 'timestamptz', 'pg_catalog', 3, true, NULL),
  ('FixedAssetDepreciationScheduleLine', 'depreciationDate', 'timestamptz', 'pg_catalog', 3, true, NULL),
  ('FixedAssetDepreciationScheduleLine', 'openingCarryingAmount', 'numeric', 'pg_catalog', 1310728, true, NULL),
  ('FixedAssetDepreciationScheduleLine', 'depreciationAmount', 'numeric', 'pg_catalog', 1310728, true, NULL),
  ('FixedAssetDepreciationScheduleLine', 'accumulatedDepreciationAfter', 'numeric', 'pg_catalog', 1310728, true, NULL),
  ('FixedAssetDepreciationScheduleLine', 'closingCarryingAmount', 'numeric', 'pg_catalog', 1310728, true, NULL),
  ('FixedAssetDepreciationScheduleLine', 'status', 'FixedAssetScheduleLineStatus', 'public', -1, true, '''UNPOSTED''::"FixedAssetScheduleLineStatus"'),
  ('FixedAssetDepreciationScheduleLine', 'depreciationRunLineId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAssetDepreciationScheduleLine', 'journalEntryId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAssetDepreciationScheduleLine', 'createdAt', 'timestamptz', 'pg_catalog', 3, true, 'CURRENT_TIMESTAMP'),
  ('FixedAssetDepreciationScheduleLine', 'postedAt', 'timestamptz', 'pg_catalog', 3, false, NULL),
  ('FixedAssetDepreciationRun', 'id', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetDepreciationRun', 'organizationId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetDepreciationRun', 'fiscalPeriodId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetDepreciationRun', 'depreciationDate', 'timestamptz', 'pg_catalog', 3, true, NULL),
  ('FixedAssetDepreciationRun', 'status', 'FixedAssetDepreciationRunStatus', 'public', -1, true, '''DRAFT''::"FixedAssetDepreciationRunStatus"'),
  ('FixedAssetDepreciationRun', 'assetCount', 'int4', 'pg_catalog', -1, true, '0'),
  ('FixedAssetDepreciationRun', 'totalDepreciation', 'numeric', 'pg_catalog', 1310728, true, NULL),
  ('FixedAssetDepreciationRun', 'idempotencyKey', 'text', 'pg_catalog', -1, true, NULL),
  ('FixedAssetDepreciationRun', 'version', 'int4', 'pg_catalog', -1, true, '1'),
  ('FixedAssetDepreciationRun', 'reviewedByUserId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAssetDepreciationRun', 'postedByUserId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAssetDepreciationRun', 'journalEntryId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAssetDepreciationRun', 'createdAt', 'timestamptz', 'pg_catalog', 3, true, 'CURRENT_TIMESTAMP'),
  ('FixedAssetDepreciationRun', 'reviewedAt', 'timestamptz', 'pg_catalog', 3, false, NULL),
  ('FixedAssetDepreciationRun', 'postedAt', 'timestamptz', 'pg_catalog', 3, false, NULL),
  ('FixedAssetDepreciationRun', 'reversedAt', 'timestamptz', 'pg_catalog', 3, false, NULL),
  ('FixedAssetDepreciationRunLine', 'id', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetDepreciationRunLine', 'organizationId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetDepreciationRunLine', 'runId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetDepreciationRunLine', 'fixedAssetId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetDepreciationRunLine', 'scheduleLineId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetDepreciationRunLine', 'depreciationAmount', 'numeric', 'pg_catalog', 1310728, true, NULL),
  ('FixedAssetDepreciationRunLine', 'expenseAccountId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetDepreciationRunLine', 'accumulatedDepreciationAccountId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetDepreciationRunLine', 'costCenterId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAssetDepreciationRunLine', 'projectId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAssetDepreciationRunLine', 'createdAt', 'timestamptz', 'pg_catalog', 3, true, 'CURRENT_TIMESTAMP'),
  ('FixedAssetMovement', 'id', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetMovement', 'organizationId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetMovement', 'fixedAssetId', 'uuid', 'pg_catalog', -1, true, NULL),
  ('FixedAssetMovement', 'movementType', 'FixedAssetMovementType', 'public', -1, true, NULL),
  ('FixedAssetMovement', 'effectiveDate', 'timestamptz', 'pg_catalog', 3, true, NULL),
  ('FixedAssetMovement', 'baseAmount', 'numeric', 'pg_catalog', 1310728, true, NULL),
  ('FixedAssetMovement', 'journalEntryId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAssetMovement', 'reversedMovementId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAssetMovement', 'reason', 'text', 'pg_catalog', -1, false, NULL),
  ('FixedAssetMovement', 'createdByUserId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAssetMovement', 'createdAt', 'timestamptz', 'pg_catalog', 3, true, 'CURRENT_TIMESTAMP'),
  ('FixedAssetMovement', 'postedAt', 'timestamptz', 'pg_catalog', 3, false, NULL),
  ('FixedAssetMovement', 'proceedsAmount', 'numeric', 'pg_catalog', 1310728, false, NULL),
  ('FixedAssetMovement', 'gainAmount', 'numeric', 'pg_catalog', 1310728, false, NULL),
  ('FixedAssetMovement', 'lossAmount', 'numeric', 'pg_catalog', 1310728, false, NULL),
  ('FixedAsset', 'disposalReviewedByUserId', 'uuid', 'pg_catalog', -1, false, NULL),
  ('FixedAsset', 'disposalReviewedAt', 'timestamp', 'pg_catalog', 3, false, NULL),
  ('FixedAsset', 'disposalReviewReason', 'text', 'pg_catalog', -1, false, NULL)
),
expected_enums(type_name,labels) AS (VALUES
  ('FixedAssetCategoryStatus', ARRAY['ACTIVE','ARCHIVED']::text[]),
  ('FixedAssetStatus', ARRAY['DRAFT','READY_FOR_REVIEW','ACTIVE','FULLY_DEPRECIATED','DISPOSED','WRITTEN_OFF']::text[]),
  ('FixedAssetAcquisitionSource', ARRAY['MANUAL','PURCHASE_BILL','OPENING_BALANCE']::text[]),
  ('FixedAssetDepreciationMethod', ARRAY['STRAIGHT_LINE']::text[]),
  ('FixedAssetScheduleLineStatus', ARRAY['UNPOSTED','POSTED','REVERSED']::text[]),
  ('FixedAssetDepreciationRunStatus', ARRAY['DRAFT','REVIEWED','POSTED','REVERSED','FAILED']::text[]),
  ('FixedAssetMovementType', ARRAY['ACQUISITION','OPENING_BALANCE','DEPRECIATION','DEPRECIATION_REVERSAL','DISPOSAL','WRITE_OFF','DISPOSAL_REVERSAL']::text[])
),
expected_enum_additions(type_name,label) AS (VALUES
  ('ImportEntityType', 'FIXED_ASSET_OPENING_BALANCES'),
  ('NumberSequenceScope', 'FIXED_ASSET')
),
expected_indexes(table_name,index_name,is_unique,column_names) AS (VALUES
  ('FixedAssetCategory', 'FixedAssetCategory_organizationId_code_key', true, ARRAY['organizationId','code']::text[]),
  ('FixedAssetCategory', 'FixedAssetCategory_organizationId_id_key', true, ARRAY['organizationId','id']::text[]),
  ('FixedAsset', 'FixedAsset_organizationId_assetNumber_key', true, ARRAY['organizationId','assetNumber']::text[]),
  ('FixedAsset', 'FixedAsset_organizationId_id_key', true, ARRAY['organizationId','id']::text[]),
  ('FixedAssetSourceLink', 'FixedAssetSourceLink_organizationId_sourceType_sourceEntityId_s', true, ARRAY['organizationId','sourceType','sourceEntityId','sourceLineId']::text[]),
  ('FixedAssetDepreciationScheduleLine', 'fixed_asset_schedule_org_asset_period_key', true, ARRAY['organizationId','fixedAssetId','periodStart']::text[]),
  ('FixedAssetDepreciationScheduleLine', 'FixedAssetDepreciationScheduleLine_organizationId_id_key', true, ARRAY['organizationId','id']::text[]),
  ('FixedAssetDepreciationRun', 'FixedAssetDepreciationRun_organizationId_id_key', true, ARRAY['organizationId','id']::text[]),
  ('FixedAssetDepreciationRun', 'FixedAssetDepreciationRun_organizationId_idempotencyKey_key', true, ARRAY['organizationId','idempotencyKey']::text[]),
  ('FixedAssetDepreciationRunLine', 'FixedAssetDepreciationRunLine_organizationId_runId_fixedAssetId', true, ARRAY['organizationId','runId','fixedAssetId','scheduleLineId']::text[]),
  ('FixedAssetDepreciationRunLine', 'FixedAssetDepreciationRunLine_organizationId_id_key', true, ARRAY['organizationId','id']::text[]),
  ('FixedAssetMovement', 'FixedAssetMovement_organizationId_id_key', true, ARRAY['organizationId','id']::text[]),
  ('FixedAssetCategory', 'FixedAssetCategory_organizationId_status_idx', false, ARRAY['organizationId','status']::text[]),
  ('FixedAsset', 'FixedAsset_organizationId_status_acquisitionDate_idx', false, ARRAY['organizationId','status','acquisitionDate']::text[]),
  ('FixedAsset', 'FixedAsset_organizationId_categoryId_idx', false, ARRAY['organizationId','categoryId']::text[]),
  ('FixedAsset', 'FixedAsset_organizationId_inServiceDate_idx', false, ARRAY['organizationId','inServiceDate']::text[]),
  ('FixedAssetSourceLink', 'FixedAssetSourceLink_organizationId_fixedAssetId_idx', false, ARRAY['organizationId','fixedAssetId']::text[]),
  ('FixedAssetSourceLink', 'FixedAssetSourceLink_organizationId_sourceEntityId_sourceLineId', false, ARRAY['organizationId','sourceEntityId','sourceLineId']::text[]),
  ('FixedAssetDepreciationScheduleLine', 'FixedAssetDepreciationScheduleLine_organizationId_status_deprec', false, ARRAY['organizationId','status','depreciationDate']::text[]),
  ('FixedAssetDepreciationScheduleLine', 'fixed_asset_schedule_org_asset_date_idx', false, ARRAY['organizationId','fixedAssetId','depreciationDate']::text[]),
  ('FixedAssetDepreciationRun', 'FixedAssetDepreciationRun_organizationId_fiscalPeriodId_status_', false, ARRAY['organizationId','fiscalPeriodId','status']::text[]),
  ('FixedAssetDepreciationRun', 'FixedAssetDepreciationRun_organizationId_depreciationDate_idx', false, ARRAY['organizationId','depreciationDate']::text[]),
  ('FixedAssetDepreciationRunLine', 'FixedAssetDepreciationRunLine_organizationId_runId_idx', false, ARRAY['organizationId','runId']::text[]),
  ('FixedAssetDepreciationRunLine', 'FixedAssetDepreciationRunLine_organizationId_fixedAssetId_idx', false, ARRAY['organizationId','fixedAssetId']::text[]),
  ('FixedAssetMovement', 'FixedAssetMovement_organizationId_fixedAssetId_effectiveDate_id', false, ARRAY['organizationId','fixedAssetId','effectiveDate']::text[]),
  ('FixedAssetMovement', 'FixedAssetMovement_organizationId_movementType_effectiveDate_id', false, ARRAY['organizationId','movementType','effectiveDate']::text[])
),
expected_primary(table_name,constraint_name,column_names) AS (VALUES
  ('FixedAssetCategory', 'FixedAssetCategory_pkey', ARRAY['id']::text[]),
  ('FixedAsset', 'FixedAsset_pkey', ARRAY['id']::text[]),
  ('FixedAssetSourceLink', 'FixedAssetSourceLink_pkey', ARRAY['id']::text[]),
  ('FixedAssetDepreciationScheduleLine', 'FixedAssetDepreciationScheduleLine_pkey', ARRAY['id']::text[]),
  ('FixedAssetDepreciationRun', 'FixedAssetDepreciationRun_pkey', ARRAY['id']::text[]),
  ('FixedAssetDepreciationRunLine', 'FixedAssetDepreciationRunLine_pkey', ARRAY['id']::text[]),
  ('FixedAssetMovement', 'FixedAssetMovement_pkey', ARRAY['id']::text[])
),
expected_checks(table_name,constraint_name,definition) AS (VALUES
  ('FixedAssetCategory', 'FixedAssetCategory_defaultUsefulLifeMonths_positive', 'CHECKdefaultUsefulLifeMonths>0'),
  ('FixedAssetCategory', 'FixedAssetCategory_defaultSalvageValue_nonnegative', 'CHECKdefaultSalvageValue>=0'),
  ('FixedAsset', 'FixedAsset_baseAcquisitionCost_positive', 'CHECKbaseAcquisitionCost>0'),
  ('FixedAsset', 'FixedAsset_baseSalvageValue_nonnegative', 'CHECKbaseSalvageValue>=0'),
  ('FixedAsset', 'FixedAsset_baseSalvageValue_lte_cost', 'CHECKbaseSalvageValue<=baseAcquisitionCost'),
  ('FixedAsset', 'FixedAsset_usefulLifeMonths_positive', 'CHECKusefulLifeMonths>0'),
  ('FixedAsset', 'FixedAsset_accumulatedDepreciation_nonnegative', 'CHECKaccumulatedDepreciation>=0'),
  ('FixedAsset', 'FixedAsset_accumulatedDepreciation_lte_cost_minus_salvage', 'CHECKaccumulatedDepreciation<=baseAcquisitionCost-baseSalvageValue'),
  ('FixedAsset', 'FixedAsset_carryingAmount_gte_salvage', 'CHECKcarryingAmount>=baseSalvageValue'),
  ('FixedAsset', 'FixedAsset_carryingAmount_lte_cost', 'CHECKcarryingAmount<=baseAcquisitionCost'),
  ('FixedAssetDepreciationScheduleLine', 'FixedAssetDepreciationScheduleLine_depreciation_nonnegative', 'CHECKdepreciationAmount>=0')
),
expected_fks(table_name,constraint_name,column_names,referenced_table,referenced_columns,delete_action,update_action) AS (VALUES
  ('FixedAssetCategory', 'FixedAssetCategory_organizationId_fkey', ARRAY['organizationId']::text[], 'Organization', ARRAY['id']::text[], 'c', 'c'),
  ('FixedAssetCategory', 'FixedAssetCategory_org_assetCostAccount_fkey', ARRAY['organizationId','assetCostAccountId']::text[], 'Account', ARRAY['organizationId','id']::text[], 'a', 'c'),
  ('FixedAssetCategory', 'FixedAssetCategory_org_accumulatedAccount_fkey', ARRAY['organizationId','accumulatedDepreciationAccountId']::text[], 'Account', ARRAY['organizationId','id']::text[], 'a', 'c'),
  ('FixedAssetCategory', 'FixedAssetCategory_org_expenseAccount_fkey', ARRAY['organizationId','depreciationExpenseAccountId']::text[], 'Account', ARRAY['organizationId','id']::text[], 'a', 'c'),
  ('FixedAssetCategory', 'FixedAssetCategory_org_disposalGainAccount_fkey', ARRAY['organizationId','disposalGainAccountId']::text[], 'Account', ARRAY['organizationId','id']::text[], 'a', 'c'),
  ('FixedAssetCategory', 'FixedAssetCategory_org_disposalLossAccount_fkey', ARRAY['organizationId','disposalLossAccountId']::text[], 'Account', ARRAY['organizationId','id']::text[], 'a', 'c'),
  ('FixedAsset', 'FixedAsset_organizationId_fkey', ARRAY['organizationId']::text[], 'Organization', ARRAY['id']::text[], 'c', 'c'),
  ('FixedAsset', 'FixedAsset_org_category_fkey', ARRAY['organizationId','categoryId']::text[], 'FixedAssetCategory', ARRAY['organizationId','id']::text[], 'a', 'c'),
  ('FixedAsset', 'FixedAsset_org_costCenter_fkey', ARRAY['organizationId','costCenterId']::text[], 'CostCenter', ARRAY['organizationId','id']::text[], 'a', 'c'),
  ('FixedAsset', 'FixedAsset_org_project_fkey', ARRAY['organizationId','projectId']::text[], 'Project', ARRAY['organizationId','id']::text[], 'a', 'c'),
  ('FixedAssetSourceLink', 'FixedAssetSourceLink_organizationId_fkey', ARRAY['organizationId']::text[], 'Organization', ARRAY['id']::text[], 'c', 'c'),
  ('FixedAssetSourceLink', 'FixedAssetSourceLink_org_asset_fkey', ARRAY['organizationId','fixedAssetId']::text[], 'FixedAsset', ARRAY['organizationId','id']::text[], 'a', 'c'),
  ('FixedAssetDepreciationScheduleLine', 'FixedAssetSchedule_organizationId_fkey', ARRAY['organizationId']::text[], 'Organization', ARRAY['id']::text[], 'c', 'c'),
  ('FixedAssetDepreciationScheduleLine', 'FixedAssetSchedule_org_asset_fkey', ARRAY['organizationId','fixedAssetId']::text[], 'FixedAsset', ARRAY['organizationId','id']::text[], 'a', 'c'),
  ('FixedAssetDepreciationRun', 'FixedAssetRun_organizationId_fkey', ARRAY['organizationId']::text[], 'Organization', ARRAY['id']::text[], 'c', 'c'),
  ('FixedAssetDepreciationRun', 'FixedAssetRun_org_period_fkey', ARRAY['organizationId','fiscalPeriodId']::text[], 'FiscalPeriod', ARRAY['organizationId','id']::text[], 'a', 'c'),
  ('FixedAssetDepreciationRunLine', 'FixedAssetRunLine_organizationId_fkey', ARRAY['organizationId']::text[], 'Organization', ARRAY['id']::text[], 'c', 'c'),
  ('FixedAssetDepreciationRunLine', 'FixedAssetRunLine_org_run_fkey', ARRAY['organizationId','runId']::text[], 'FixedAssetDepreciationRun', ARRAY['organizationId','id']::text[], 'a', 'c'),
  ('FixedAssetDepreciationRunLine', 'FixedAssetRunLine_org_asset_fkey', ARRAY['organizationId','fixedAssetId']::text[], 'FixedAsset', ARRAY['organizationId','id']::text[], 'a', 'c'),
  ('FixedAssetDepreciationRunLine', 'FixedAssetRunLine_org_schedule_fkey', ARRAY['organizationId','scheduleLineId']::text[], 'FixedAssetDepreciationScheduleLine', ARRAY['organizationId','id']::text[], 'a', 'c'),
  ('FixedAssetMovement', 'FixedAssetMovement_organizationId_fkey', ARRAY['organizationId']::text[], 'Organization', ARRAY['id']::text[], 'c', 'c'),
  ('FixedAssetMovement', 'FixedAssetMovement_org_asset_fkey', ARRAY['organizationId','fixedAssetId']::text[], 'FixedAsset', ARRAY['organizationId','id']::text[], 'a', 'c')
),
actual_tables AS (
 SELECT c.oid, c.relname::text AS table_name, c.relkind, c.relowner, c.relacl, c.relrowsecurity
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 JOIN expected_tables e ON e.table_name=c.relname WHERE n.nspname='public'
),
actual_columns AS (
 SELECT t.table_name, a.attname::text AS column_name, ty.typname::text AS type_name,
        ns.nspname::text AS type_schema, a.atttypmod AS type_mod, a.attnotnull AS not_null,
        pg_catalog.pg_get_expr(d.adbin,d.adrelid) AS default_expr
 FROM actual_tables t JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped
 JOIN pg_catalog.pg_type ty ON ty.oid=a.atttypid JOIN pg_catalog.pg_namespace ns ON ns.oid=ty.typnamespace
 LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=t.oid AND d.adnum=a.attnum
),
actual_enums AS (
 SELECT t.typname::text AS type_name, array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels
 FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
 JOIN pg_catalog.pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' GROUP BY t.typname
),
actual_indexes AS (
 SELECT t.table_name, c.relname::text AS index_name, i.indisunique, i.indisvalid, i.indisready,
        i.indpred IS NULL AND i.indexprs IS NULL AS plain_columns, am.amname,
        ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(num,ord)
              JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.num ORDER BY k.ord) AS column_names
 FROM actual_tables t JOIN pg_catalog.pg_index i ON i.indrelid=t.oid
 JOIN pg_catalog.pg_class c ON c.oid=i.indexrelid JOIN pg_catalog.pg_am am ON am.oid=c.relam
),
actual_constraints AS (
 SELECT t.table_name, c.conname::text AS constraint_name, c.contype, c.convalidated, c.condeferrable,
        c.confmatchtype, c.confdeltype::text AS delete_action, c.confupdtype::text AS update_action,
        rt.relname::text AS referenced_table, rn.nspname::text AS referenced_schema,
        regexp_replace(regexp_replace(pg_catalog.pg_get_constraintdef(c.oid),'[[:space:]"()]','','g'),'::numeric','','g') AS definition,
        ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(num,ord)
              JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.num ORDER BY k.ord) AS column_names,
        ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(num,ord)
              JOIN pg_catalog.pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.num ORDER BY k.ord) AS referenced_columns
 FROM actual_tables t JOIN pg_catalog.pg_constraint c ON c.conrelid=t.oid
 LEFT JOIN pg_catalog.pg_class rt ON rt.oid=c.confrelid LEFT JOIN pg_catalog.pg_namespace rn ON rn.oid=rt.relnamespace
),
issues AS (
 SELECT 'table' AS kind,e.table_name AS object_name FROM expected_tables e
 LEFT JOIN actual_tables a USING(table_name) WHERE a.oid IS NULL OR a.relkind<>'r'
 UNION ALL
 SELECT 'column',e.table_name||'.'||e.column_name FROM expected_columns e
 LEFT JOIN actual_columns a USING(table_name,column_name)
 WHERE a.column_name IS NULL OR a.type_name<>e.type_name OR a.type_schema<>e.type_schema
 OR a.type_mod<>e.type_mod OR a.not_null<>e.not_null OR a.default_expr IS DISTINCT FROM e.default_expr
 UNION ALL
 SELECT 'enum',e.type_name FROM expected_enums e LEFT JOIN actual_enums a USING(type_name)
 WHERE a.labels IS DISTINCT FROM e.labels
 UNION ALL
 SELECT 'enum_addition',e.type_name||'.'||e.label FROM expected_enum_additions e
 LEFT JOIN actual_enums a USING(type_name) WHERE NOT COALESCE(e.label=ANY(a.labels),false)
 UNION ALL
 SELECT 'index',e.index_name FROM expected_indexes e LEFT JOIN actual_indexes a USING(table_name,index_name)
 WHERE a.index_name IS NULL OR a.indisunique<>e.is_unique OR NOT a.indisvalid OR NOT a.indisready
 OR NOT a.plain_columns OR a.amname<>'btree' OR a.column_names<>e.column_names
 UNION ALL
 SELECT 'primary_key',e.constraint_name FROM expected_primary e LEFT JOIN actual_constraints a USING(table_name,constraint_name)
 WHERE a.constraint_name IS NULL OR a.contype<>'p' OR NOT a.convalidated OR a.condeferrable OR a.column_names<>e.column_names
 UNION ALL
 SELECT 'check',e.constraint_name FROM expected_checks e LEFT JOIN actual_constraints a USING(table_name,constraint_name)
 WHERE a.constraint_name IS NULL OR a.contype<>'c' OR NOT a.convalidated OR a.definition<>e.definition
 UNION ALL
 SELECT 'foreign_key',e.constraint_name FROM expected_fks e LEFT JOIN actual_constraints a USING(table_name,constraint_name)
 WHERE a.constraint_name IS NULL OR a.contype<>'f' OR NOT a.convalidated OR a.condeferrable
 OR a.confmatchtype<>'s' OR a.column_names<>e.column_names OR a.referenced_schema<>'public'
 OR a.referenced_table<>e.referenced_table OR a.referenced_columns<>e.referenced_columns
 OR a.delete_action<>e.delete_action OR a.update_action<>e.update_action
 UNION ALL
 SELECT 'browser_role_table_access',t.table_name||':'||r.rolname FROM actual_tables t
 CROSS JOIN pg_catalog.pg_roles r WHERE r.rolname IN ('anon','authenticated') AND (
 pg_catalog.has_table_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
 OR pg_catalog.has_any_column_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,REFERENCES'))
 UNION ALL
 SELECT 'public_table_access',t.table_name FROM actual_tables t
 WHERE EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(t.relacl,pg_catalog.acldefault('r',t.relowner))) p WHERE p.grantee=0)
 UNION ALL
 SELECT 'public_column_access',t.table_name FROM actual_tables t
 WHERE EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) p
               WHERE a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped AND p.grantee=0)
)
SELECT jsonb_build_object(
 'status',CASE WHEN EXISTS(SELECT 1 FROM issues) THEN 'BLOCKED' ELSE 'PASS' END,
 'scope','fixed-assets first three migrations; catalog only; no application rows inspected',
 'expected',jsonb_build_object('tables',(SELECT count(*) FROM expected_tables),'columns',(SELECT count(*) FROM expected_columns),
 'enums',(SELECT count(*) FROM expected_enums),'enumAdditions',(SELECT count(*) FROM expected_enum_additions),
 'indexes',(SELECT count(*) FROM expected_indexes),'primaryKeys',(SELECT count(*) FROM expected_primary),
 'checks',(SELECT count(*) FROM expected_checks),'foreignKeys',(SELECT count(*) FROM expected_fks)),
 'issueCount',(SELECT count(*) FROM issues),
 'issues',COALESCE((SELECT jsonb_agg(jsonb_build_object('kind',kind,'object',object_name) ORDER BY kind,object_name) FROM issues),'[]'::jsonb),
 'rlsEnabledTableCount',(SELECT count(*) FROM actual_tables WHERE relrowsecurity),
 'migrationCreator',current_user
) AS result
  );
  IF v_result->>'status'<>'PASS' THEN
    RAISE EXCEPTION 'FIXED_ASSET_CATALOG_PREFLIGHT_FAILED';
  END IF;
  IF EXISTS (SELECT 1 FROM public._prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL) THEN
    RAISE EXCEPTION 'UNRESOLVED_PRISMA_MIGRATION';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public._prisma_migrations
    WHERE migration_name='20260714090000_add_accounting_close_signoff_policy'
      AND finished_at IS NOT NULL AND rolled_back_at IS NULL) THEN
    RAISE EXCEPTION 'EXPECTED_BASELINE_MIGRATION_MISSING';
  END IF;
  FOR v_migration IN SELECT * FROM (VALUES
      ('20260715090000_add_fixed_assets_mvp', 'cb7c0f26641efca5dd5cb48be743660f03a6036fb2fffdc579395493b34fba94'),
      ('20260715150000_add_fixed_asset_disposal_evidence', '045647d60f1f0cfc483b8f4570f68ecbb3b4c5fcc69630f834970dd415871644'),
      ('20260715153000_add_fixed_asset_disposal_review', '1ba710ae7ecfe1b29f3eed0faa2055a4e2c2fe85a25d20b0a072da10a29886cf')
  ) AS expected(migration_name,checksum) LOOP
    IF EXISTS (SELECT 1 FROM public._prisma_migrations m
      WHERE m.migration_name=v_migration.migration_name
        AND (m.checksum<>v_migration.checksum OR m.finished_at IS NULL OR m.rolled_back_at IS NOT NULL))
      OR (SELECT count(*) FROM public._prisma_migrations m WHERE m.migration_name=v_migration.migration_name)>1 THEN
      RAISE EXCEPTION 'PRISMA_HISTORY_CONFLICT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public._prisma_migrations m WHERE m.migration_name=v_migration.migration_name) THEN
      INSERT INTO public._prisma_migrations
        (id,checksum,finished_at,migration_name,logs,rolled_back_at,started_at,applied_steps_count)
      VALUES (gen_random_uuid()::text,v_migration.checksum,CURRENT_TIMESTAMP,v_migration.migration_name,
        'Metadata reconciliation: independently confirmed historical Supabase migration and exact catalog parity; original SQL not re-executed.',
        NULL,CURRENT_TIMESTAMP,0);
    END IF;
  END LOOP;
END $reconcile$;
COMMIT;
SELECT jsonb_build_object('status','RECONCILED','scope','Prisma history only',
  'successfulRows',count(*),'expectedRows',3) AS result
FROM public._prisma_migrations WHERE migration_name IN (
  '20260715090000_add_fixed_assets_mvp',
  '20260715150000_add_fixed_asset_disposal_evidence',
  '20260715153000_add_fixed_asset_disposal_review') AND finished_at IS NOT NULL AND rolled_back_at IS NULL;
