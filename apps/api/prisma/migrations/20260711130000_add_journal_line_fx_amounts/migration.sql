-- Additive journal transaction-currency evidence. Existing debit/credit and journal totals
-- remain base-currency accounting truth and are never recalculated by this migration.
ALTER TABLE "JournalLine"
  ADD COLUMN "transactionDebit" DECIMAL(20,4),
  ADD COLUMN "transactionCredit" DECIMAL(20,4),
  ADD COLUMN "rateSnapshotId" UUID,
  ADD COLUMN "fxRoundingComponentCount" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "JournalLine"
  ADD CONSTRAINT "JournalLine_fxRoundingComponentCount_valid"
  CHECK ("fxRoundingComponentCount" BETWEEN 1 AND 10000);

ALTER TABLE "JournalEntry"
  ADD COLUMN "creationTransactionId" TEXT NOT NULL DEFAULT (pg_current_xact_id()::text);

-- Do not invent transaction evidence for any legacy line whose stored context is
-- not provably the organization's base currency at rate one. Posted exceptions
-- require an explicit accounting review before this additive migration can run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "JournalLine" journal_line
    JOIN "JournalEntry" journal_entry ON journal_entry."id" = journal_line."journalEntryId"
    JOIN "Organization" organization ON organization."id" = journal_entry."organizationId"
    WHERE journal_entry."status" IN ('POSTED', 'REVERSED')
      AND (
        journal_line."organizationId" <> journal_entry."organizationId"
        OR UPPER(BTRIM(journal_line."currency")) <> UPPER(BTRIM(organization."baseCurrency"))
        OR journal_line."exchangeRate" <> 1
      )
  ) THEN
    RAISE EXCEPTION 'Journal FX migration blocked: historical posted foreign journal lines require reviewed treatment.'
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

UPDATE "JournalLine" journal_line
SET "transactionDebit" = journal_line."debit",
    "transactionCredit" = journal_line."credit"
FROM "JournalEntry" journal_entry
JOIN "Organization" organization ON organization."id" = journal_entry."organizationId"
WHERE journal_line."journalEntryId" = journal_entry."id"
  AND journal_line."organizationId" = journal_entry."organizationId"
  AND UPPER(BTRIM(journal_line."currency")) = UPPER(BTRIM(organization."baseCurrency"))
  AND journal_line."exchangeRate" = 1;

CREATE INDEX "JournalLine_organizationId_rateSnapshotId_idx"
  ON "JournalLine"("organizationId", "rateSnapshotId");

ALTER TABLE "JournalLine"
  ADD CONSTRAINT "JournalLine_organizationId_rateSnapshotId_fkey"
  FOREIGN KEY ("organizationId", "rateSnapshotId")
  REFERENCES "CurrencyRateSnapshot"("organizationId", "id")
  ON DELETE NO ACTION ON UPDATE CASCADE;

DROP TRIGGER "JournalEntry_base_currency_posting_guard" ON "JournalEntry";
DROP TRIGGER "JournalLine_base_currency_posting_guard" ON "JournalLine";
DROP FUNCTION "enforce_base_currency_posting"();
DROP FUNCTION "enforce_journal_line_base_currency_posting"();

-- Journal headers and their existing debit/credit totals are always denominated in the
-- organization's base currency. Transaction context belongs to individual journal lines.
CREATE FUNCTION "enforce_base_currency_posting"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE organization_base_currency TEXT;
BEGIN
  IF NEW."status" = 'POSTED' THEN
    SELECT "baseCurrency" INTO organization_base_currency
    FROM "Organization" WHERE "id" = NEW."organizationId";

    IF organization_base_currency IS NULL
       OR UPPER(BTRIM(NEW."currency")) <> UPPER(BTRIM(organization_base_currency)) THEN
      RAISE EXCEPTION 'Posted journal headers must use the organization base currency.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "JournalEntry_base_currency_posting_guard"
BEFORE INSERT OR UPDATE OF "status", "currency", "organizationId", "reversalOfId" ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION "enforce_base_currency_posting"();

CREATE FUNCTION "validate_journal_line_fx_context"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  organization_base_currency TEXT;
  snapshot_transaction_currency TEXT;
  snapshot_base_currency TEXT;
  snapshot_rate DECIMAL(18,8);
  snapshot_source "CurrencyRateSource";
BEGIN
  SELECT organization."baseCurrency"
    INTO organization_base_currency
    FROM "JournalEntry" journal_entry
    JOIN "Organization" organization ON organization."id" = journal_entry."organizationId"
    WHERE journal_entry."id" = NEW."journalEntryId"
      AND journal_entry."organizationId" = NEW."organizationId";

  IF organization_base_currency IS NULL THEN
    RAISE EXCEPTION 'Journal line organization does not match its journal entry.' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW."transactionDebit" IS NULL OR NEW."transactionCredit" IS NULL THEN
    IF UPPER(BTRIM(NEW."currency")) = UPPER(BTRIM(organization_base_currency)) AND NEW."exchangeRate" = 1 THEN
      NEW."transactionDebit" := NEW."debit";
      NEW."transactionCredit" := NEW."credit";
    ELSE
      RAISE EXCEPTION 'Journal line FX context is incomplete or inconsistent.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW."exchangeRate" <= 0
     OR NEW."fxRoundingComponentCount" < 1 OR NEW."fxRoundingComponentCount" > 10000
     OR NEW."debit" < 0 OR NEW."credit" < 0
     OR NEW."transactionDebit" < 0 OR NEW."transactionCredit" < 0
     OR (NEW."debit" > 0 AND NEW."credit" > 0)
     OR (NEW."transactionDebit" > 0 AND NEW."transactionCredit" > 0)
     OR (NEW."debit" = 0 AND NEW."credit" = 0)
     OR (NEW."transactionDebit" = 0 AND NEW."transactionCredit" = 0)
     OR ((NEW."debit" > 0) <> (NEW."transactionDebit" > 0))
     OR ((NEW."credit" > 0) <> (NEW."transactionCredit" > 0)) THEN
    RAISE EXCEPTION 'Journal line FX context is incomplete or inconsistent.' USING ERRCODE = 'check_violation';
  END IF;

  IF UPPER(BTRIM(NEW."currency")) = UPPER(BTRIM(organization_base_currency))
     AND (NEW."exchangeRate" <> 1
       OR NEW."transactionDebit" <> NEW."debit"
       OR NEW."transactionCredit" <> NEW."credit"
       OR NEW."rateSnapshotId" IS NOT NULL) THEN
    RAISE EXCEPTION 'Journal line FX context is incomplete or inconsistent.' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW."rateSnapshotId" IS NOT NULL THEN
    SELECT "transactionCurrency", "baseCurrency", "rate", "source"
      INTO snapshot_transaction_currency, snapshot_base_currency, snapshot_rate, snapshot_source
      FROM "CurrencyRateSnapshot"
      WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."rateSnapshotId";

    IF NOT FOUND
       OR UPPER(BTRIM(NEW."currency")) IS DISTINCT FROM UPPER(BTRIM(snapshot_transaction_currency))
       OR UPPER(BTRIM(organization_base_currency)) IS DISTINCT FROM UPPER(BTRIM(snapshot_base_currency))
       OR NEW."exchangeRate" IS DISTINCT FROM snapshot_rate
       OR snapshot_source NOT IN ('MANUAL', 'IMPORT') THEN
      RAISE EXCEPTION 'FX rate snapshot values do not match the journal line context.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "JournalLine_validate_fx_context"
BEFORE INSERT OR UPDATE ON "JournalLine"
FOR EACH ROW EXECUTE FUNCTION "validate_journal_line_fx_context"();

-- Validate whole-journal arithmetic only after all nested line writes are visible.
-- One unit at four decimal places is the bounded residual allowed for deterministic
-- component allocation; larger differences are not rounding and are rejected.
CREATE FUNCTION "assert_posted_journal_fx_totals"(target_journal_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE target_status TEXT;
BEGIN
  SELECT "status"::text INTO target_status
  FROM "JournalEntry" WHERE "id" = target_journal_id;

  IF target_status IS NULL OR target_status NOT IN ('POSTED', 'REVERSED') THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM "JournalLine"
    WHERE "journalEntryId" = target_journal_id
      AND ("transactionDebit" IS NULL OR "transactionCredit" IS NULL)
  ) THEN
    RAISE EXCEPTION 'Journal line FX context is incomplete or inconsistent.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "JournalLine" journal_line
    WHERE journal_line."journalEntryId" = target_journal_id
    GROUP BY UPPER(BTRIM(journal_line."currency"))
    HAVING SUM(journal_line."transactionDebit") <> SUM(journal_line."transactionCredit")
  ) THEN
    RAISE EXCEPTION 'Journal transaction amounts are not balanced by currency.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "JournalLine" journal_line
    JOIN "JournalEntry" journal_entry ON journal_entry."id" = journal_line."journalEntryId"
    JOIN "Organization" organization ON organization."id" = journal_entry."organizationId"
    WHERE journal_line."journalEntryId" = target_journal_id
      AND UPPER(BTRIM(journal_line."currency")) <> UPPER(BTRIM(organization."baseCurrency"))
    GROUP BY UPPER(BTRIM(journal_line."currency")), journal_line."exchangeRate"
    HAVING ABS(SUM(journal_line."debit") - ROUND(SUM(journal_line."transactionDebit") * journal_line."exchangeRate", 4))
             > SUM(CASE WHEN journal_line."debit" > 0 THEN journal_line."fxRoundingComponentCount" ELSE 0 END) * 0.0001
       OR ABS(SUM(journal_line."credit") - ROUND(SUM(journal_line."transactionCredit") * journal_line."exchangeRate", 4))
             > SUM(CASE WHEN journal_line."credit" > 0 THEN journal_line."fxRoundingComponentCount" ELSE 0 END) * 0.0001
  ) THEN
    RAISE EXCEPTION 'Journal FX base amounts do not match transaction amounts at the captured rate.'
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE FUNCTION "validate_journal_fx_totals_from_line"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM "assert_posted_journal_fx_totals"(OLD."journalEntryId");
    RETURN OLD;
  END IF;
  PERFORM "assert_posted_journal_fx_totals"(NEW."journalEntryId");
  IF TG_OP = 'UPDATE' AND OLD."journalEntryId" IS DISTINCT FROM NEW."journalEntryId" THEN
    PERFORM "assert_posted_journal_fx_totals"(OLD."journalEntryId");
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION "validate_journal_fx_totals_from_entry"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM "assert_posted_journal_fx_totals"(NEW."id");
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "JournalLine_validate_fx_totals"
AFTER INSERT OR UPDATE OR DELETE ON "JournalLine"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "validate_journal_fx_totals_from_line"();

CREATE CONSTRAINT TRIGGER "JournalEntry_validate_fx_totals"
AFTER INSERT OR UPDATE ON "JournalEntry"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "validate_journal_fx_totals_from_entry"();

CREATE FUNCTION "freeze_journal_creation_provenance"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."creationTransactionId" IS DISTINCT FROM OLD."creationTransactionId" THEN
    RAISE EXCEPTION 'Journal entry creation provenance is immutable.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "JournalEntry_freeze_creation_provenance"
BEFORE UPDATE OF "creationTransactionId" ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION "freeze_journal_creation_provenance"();

CREATE FUNCTION "freeze_posted_journal_line"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  parent_status TEXT;
  parent_creation_transaction_id TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT "status"::text, "creationTransactionId"
      INTO parent_status, parent_creation_transaction_id
      FROM "JournalEntry" WHERE "id" = NEW."journalEntryId";
    IF parent_status IN ('POSTED', 'REVERSED')
       AND parent_creation_transaction_id <> pg_current_xact_id()::text THEN
      RAISE EXCEPTION 'Posted journal lines are immutable; use a reversal.' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  SELECT "status"::text INTO parent_status
  FROM "JournalEntry" WHERE "id" = OLD."journalEntryId";
  IF parent_status IN ('POSTED', 'REVERSED') THEN
    RAISE EXCEPTION 'Posted journal lines are immutable; use a reversal.' USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF NEW."journalEntryId" IS DISTINCT FROM OLD."journalEntryId" THEN
    SELECT "status"::text
      INTO parent_status
      FROM "JournalEntry" WHERE "id" = NEW."journalEntryId";
    IF parent_status IN ('POSTED', 'REVERSED') THEN
      RAISE EXCEPTION 'Posted journal lines are immutable; use a reversal.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "JournalLine_freeze_posted"
BEFORE INSERT OR UPDATE OR DELETE ON "JournalLine"
FOR EACH ROW EXECUTE FUNCTION "freeze_posted_journal_line"();

CREATE OR REPLACE FUNCTION "prevent_used_rate_snapshot_update"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "SalesInvoice" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "CreditNote" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "PurchaseBill" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "PurchaseDebitNote" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "CashExpense" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "CustomerPayment" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "SupplierPayment" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "CustomerRefund" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "SupplierRefund" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "JournalLine" WHERE "rateSnapshotId" = OLD."id") THEN
    RAISE EXCEPTION 'Referenced FX rate snapshots are immutable.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
