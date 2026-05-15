-- Compatibility migration kept safe for fresh deployments.
-- The AuthTokenRateLimitEvent table depends on AuthTokenPurpose, which is
-- created by a later email-auth migration in existing history. The actual
-- rate-limit table is created by 20260515190000_add_auth_token_rate_limits.

-- AlterTable
ALTER TABLE IF EXISTS "Attachment" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "CashExpense" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "CashExpenseLine" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "InventoryVarianceProposal" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "InventoryVarianceProposalEvent" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "StockMovement" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "SupplierPaymentUnappliedAllocation" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "SupplierRefund" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "Warehouse" ALTER COLUMN "id" DROP DEFAULT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i'
      AND relname = 'BankReconciliation_organizationId_bankAccountProfileId_periodSt'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i'
      AND relname = 'BankReconciliation_organizationId_bankAccountProfileId_peri_idx'
  ) THEN
    ALTER INDEX "BankReconciliation_organizationId_bankAccountProfileId_periodSt"
      RENAME TO "BankReconciliation_organizationId_bankAccountProfileId_peri_idx";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i'
      AND relname = 'BankReconciliation_organizationId_bankAccountProfileId_status_i'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i'
      AND relname = 'BankReconciliation_organizationId_bankAccountProfileId_stat_idx'
  ) THEN
    ALTER INDEX "BankReconciliation_organizationId_bankAccountProfileId_status_i"
      RENAME TO "BankReconciliation_organizationId_bankAccountProfileId_stat_idx";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i'
      AND relname = 'BankReconciliationItem_reconciliationId_statementTransactionId_'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i'
      AND relname = 'BankReconciliationItem_reconciliationId_statementTransactio_key'
  ) THEN
    ALTER INDEX "BankReconciliationItem_reconciliationId_statementTransactionId_"
      RENAME TO "BankReconciliationItem_reconciliationId_statementTransactio_key";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i'
      AND relname = 'BankReconciliationReviewEvent_organizationId_reconciliationId_c'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i'
      AND relname = 'BankReconciliationReviewEvent_organizationId_reconciliation_idx'
  ) THEN
    ALTER INDEX "BankReconciliationReviewEvent_organizationId_reconciliationId_c"
      RENAME TO "BankReconciliationReviewEvent_organizationId_reconciliation_idx";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i'
      AND relname = 'InventoryVarianceProposalEvent_organizationId_proposalId_create'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i'
      AND relname = 'InventoryVarianceProposalEvent_organizationId_proposalId_cr_idx'
  ) THEN
    ALTER INDEX "InventoryVarianceProposalEvent_organizationId_proposalId_create"
      RENAME TO "InventoryVarianceProposalEvent_organizationId_proposalId_cr_idx";
  END IF;
END $$;
