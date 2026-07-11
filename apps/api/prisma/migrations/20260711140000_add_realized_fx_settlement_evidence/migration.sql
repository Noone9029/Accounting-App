BEGIN;

-- Additive realized-FX settlement evidence. Existing base-currency balances and
-- posted journals remain accounting truth and are never rewritten here.
ALTER TABLE "SalesInvoice"
  ADD COLUMN "transactionBalanceDue" DECIMAL(20,4) NOT NULL DEFAULT 0;

ALTER TABLE "PurchaseBill"
  ADD COLUMN "transactionBalanceDue" DECIMAL(20,4) NOT NULL DEFAULT 0;

ALTER TABLE "JournalLine"
  ADD COLUMN "functionalCurrencyOnly" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "CustomerPayment"
  ADD COLUMN "transactionUnappliedAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "requestHash" TEXT;

ALTER TABLE "SupplierPayment"
  ADD COLUMN "transactionUnappliedAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "requestHash" TEXT;

ALTER TABLE "CustomerPaymentAllocation"
  ADD COLUMN "transactionAmountApplied" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "documentBaseAmountApplied" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "settlementBaseAmountApplied" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "recognitionRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
  ADD COLUMN "settlementRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
  ADD COLUMN "realizedGainAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "realizedLossAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "realizedFxJournalEntryId" UUID;

ALTER TABLE "CustomerPaymentUnappliedAllocation"
  ADD COLUMN "transactionAmountApplied" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "documentBaseAmountApplied" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "settlementBaseAmountApplied" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "recognitionRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
  ADD COLUMN "settlementRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
  ADD COLUMN "realizedGainAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "realizedLossAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "realizedFxJournalEntryId" UUID,
  ADD COLUMN "realizedFxReversalJournalEntryId" UUID,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "reversalIdempotencyKey" TEXT;

ALTER TABLE "SupplierPaymentAllocation"
  ADD COLUMN "transactionAmountApplied" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "documentBaseAmountApplied" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "settlementBaseAmountApplied" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "recognitionRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
  ADD COLUMN "settlementRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
  ADD COLUMN "realizedGainAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "realizedLossAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "realizedFxJournalEntryId" UUID;

ALTER TABLE "SupplierPaymentUnappliedAllocation"
  ADD COLUMN "transactionAmountApplied" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "documentBaseAmountApplied" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "settlementBaseAmountApplied" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "recognitionRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
  ADD COLUMN "settlementRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
  ADD COLUMN "realizedGainAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "realizedLossAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN "realizedFxJournalEntryId" UUID,
  ADD COLUMN "realizedFxReversalJournalEntryId" UUID,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "reversalIdempotencyKey" TEXT;

-- Historical foreign settlements cannot be inferred from the surviving base
-- balances. Fail closed instead of manufacturing recognition/settlement rates.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "SalesInvoice" document
    WHERE UPPER(BTRIM(document."currency")) <> UPPER(BTRIM(document."baseCurrency"))
      AND (
        (document."status" = 'FINALIZED' AND document."balanceDue" <> document."total")
        OR EXISTS (SELECT 1 FROM "CustomerPaymentAllocation" allocation WHERE allocation."invoiceId" = document."id")
        OR EXISTS (SELECT 1 FROM "CustomerPaymentUnappliedAllocation" allocation WHERE allocation."invoiceId" = document."id")
      )
  ) OR EXISTS (
    SELECT 1 FROM "PurchaseBill" document
    WHERE UPPER(BTRIM(document."currency")) <> UPPER(BTRIM(document."baseCurrency"))
      AND (
        (document."status" = 'FINALIZED' AND document."balanceDue" <> document."total")
        OR EXISTS (SELECT 1 FROM "SupplierPaymentAllocation" allocation WHERE allocation."billId" = document."id")
        OR EXISTS (SELECT 1 FROM "SupplierPaymentUnappliedAllocation" allocation WHERE allocation."billId" = document."id")
      )
  ) OR EXISTS (
    SELECT 1 FROM "CustomerPayment" payment
    WHERE UPPER(BTRIM(payment."currency")) <> UPPER(BTRIM(payment."baseCurrency"))
  ) OR EXISTS (
    SELECT 1 FROM "SupplierPayment" payment
    WHERE UPPER(BTRIM(payment."currency")) <> UPPER(BTRIM(payment."baseCurrency"))
  ) THEN
    RAISE EXCEPTION 'Realized FX migration blocked: historical foreign settlements require reviewed treatment.'
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

-- Rate-one compatibility states are exact. Untouched finalized foreign documents
-- retain their captured transaction total as the transaction open balance.
UPDATE "SalesInvoice" document
SET "transactionBalanceDue" = document."balanceDue"
WHERE UPPER(BTRIM(document."currency")) = UPPER(BTRIM(document."baseCurrency"));

UPDATE "SalesInvoice" document
SET "transactionBalanceDue" = document."transactionTotal"
WHERE UPPER(BTRIM(document."currency")) <> UPPER(BTRIM(document."baseCurrency"))
  AND document."status" = 'FINALIZED'
  AND document."balanceDue" = document."total";

UPDATE "PurchaseBill" document
SET "transactionBalanceDue" = document."balanceDue"
WHERE UPPER(BTRIM(document."currency")) = UPPER(BTRIM(document."baseCurrency"));

UPDATE "PurchaseBill" document
SET "transactionBalanceDue" = document."transactionTotal"
WHERE UPPER(BTRIM(document."currency")) <> UPPER(BTRIM(document."baseCurrency"))
  AND document."status" = 'FINALIZED'
  AND document."balanceDue" = document."total";

UPDATE "CustomerPayment" payment
SET "transactionUnappliedAmount" = payment."unappliedAmount"
WHERE UPPER(BTRIM(payment."currency")) = UPPER(BTRIM(payment."baseCurrency"));

UPDATE "SupplierPayment" payment
SET "transactionUnappliedAmount" = payment."unappliedAmount"
WHERE UPPER(BTRIM(payment."currency")) = UPPER(BTRIM(payment."baseCurrency"));

UPDATE "CustomerPaymentAllocation"
SET "transactionAmountApplied" = "amountApplied",
    "documentBaseAmountApplied" = "amountApplied",
    "settlementBaseAmountApplied" = "amountApplied";

UPDATE "CustomerPaymentUnappliedAllocation"
SET "transactionAmountApplied" = "amountApplied",
    "documentBaseAmountApplied" = "amountApplied",
    "settlementBaseAmountApplied" = "amountApplied";

UPDATE "SupplierPaymentAllocation"
SET "transactionAmountApplied" = "amountApplied",
    "documentBaseAmountApplied" = "amountApplied",
    "settlementBaseAmountApplied" = "amountApplied";

UPDATE "SupplierPaymentUnappliedAllocation"
SET "transactionAmountApplied" = "amountApplied",
    "documentBaseAmountApplied" = "amountApplied",
    "settlementBaseAmountApplied" = "amountApplied";

ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_transactionBalanceDue_nonnegative" CHECK ("transactionBalanceDue" >= 0);
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_transactionBalanceDue_nonnegative" CHECK ("transactionBalanceDue" >= 0);
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_transactionUnappliedAmount_valid" CHECK ("transactionUnappliedAmount" >= 0 AND "transactionUnappliedAmount" <= "transactionAmountReceived");
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_transactionUnappliedAmount_valid" CHECK ("transactionUnappliedAmount" >= 0 AND "transactionUnappliedAmount" <= "transactionAmountPaid");

ALTER TABLE "CustomerPaymentAllocation" ADD CONSTRAINT "CustomerPaymentAllocation_realized_fx_valid" CHECK (
  "transactionAmountApplied" >= 0 AND "documentBaseAmountApplied" >= 0 AND "settlementBaseAmountApplied" >= 0
  AND "recognitionRate" > 0 AND "settlementRate" > 0
  AND "realizedGainAmount" >= 0 AND "realizedLossAmount" >= 0
  AND NOT ("realizedGainAmount" > 0 AND "realizedLossAmount" > 0)
);
ALTER TABLE "CustomerPaymentUnappliedAllocation" ADD CONSTRAINT "CustomerPaymentUnappliedAllocation_realized_fx_valid" CHECK (
  "transactionAmountApplied" >= 0 AND "documentBaseAmountApplied" >= 0 AND "settlementBaseAmountApplied" >= 0
  AND "recognitionRate" > 0 AND "settlementRate" > 0
  AND "realizedGainAmount" >= 0 AND "realizedLossAmount" >= 0
  AND NOT ("realizedGainAmount" > 0 AND "realizedLossAmount" > 0)
);
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_realized_fx_valid" CHECK (
  "transactionAmountApplied" >= 0 AND "documentBaseAmountApplied" >= 0 AND "settlementBaseAmountApplied" >= 0
  AND "recognitionRate" > 0 AND "settlementRate" > 0
  AND "realizedGainAmount" >= 0 AND "realizedLossAmount" >= 0
  AND NOT ("realizedGainAmount" > 0 AND "realizedLossAmount" > 0)
);
ALTER TABLE "SupplierPaymentUnappliedAllocation" ADD CONSTRAINT "SupplierPaymentUnappliedAllocation_realized_fx_valid" CHECK (
  "transactionAmountApplied" >= 0 AND "documentBaseAmountApplied" >= 0 AND "settlementBaseAmountApplied" >= 0
  AND "recognitionRate" > 0 AND "settlementRate" > 0
  AND "realizedGainAmount" >= 0 AND "realizedLossAmount" >= 0
  AND NOT ("realizedGainAmount" > 0 AND "realizedLossAmount" > 0)
);

CREATE UNIQUE INDEX "SalesInvoice_organizationId_id_key" ON "SalesInvoice"("organizationId", "id");
CREATE UNIQUE INDEX "PurchaseBill_organizationId_id_key" ON "PurchaseBill"("organizationId", "id");
CREATE UNIQUE INDEX "CustomerPayment_organizationId_id_key" ON "CustomerPayment"("organizationId", "id");
CREATE UNIQUE INDEX "SupplierPayment_organizationId_id_key" ON "SupplierPayment"("organizationId", "id");
CREATE UNIQUE INDEX "JournalEntry_organizationId_id_key" ON "JournalEntry"("organizationId", "id");
CREATE UNIQUE INDEX "CustomerPayment_organizationId_idempotencyKey_key" ON "CustomerPayment"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "SupplierPayment_organizationId_idempotencyKey_key" ON "SupplierPayment"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "CustomerPaymentUnappliedAllocation_org_idempotency_key" ON "CustomerPaymentUnappliedAllocation"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "CustomerPaymentUnappliedAllocation_org_reversal_key" ON "CustomerPaymentUnappliedAllocation"("organizationId", "reversalIdempotencyKey");
CREATE UNIQUE INDEX "SupplierPaymentUnappliedAllocation_org_idempotency_key" ON "SupplierPaymentUnappliedAllocation"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "SupplierPaymentUnappliedAllocation_org_reversal_key" ON "SupplierPaymentUnappliedAllocation"("organizationId", "reversalIdempotencyKey");

ALTER TABLE "CustomerPaymentAllocation" DROP CONSTRAINT "CustomerPaymentAllocation_paymentId_fkey";
ALTER TABLE "CustomerPaymentAllocation" DROP CONSTRAINT "CustomerPaymentAllocation_invoiceId_fkey";
ALTER TABLE "CustomerPaymentUnappliedAllocation" DROP CONSTRAINT "CustomerPaymentUnappliedAllocation_paymentId_fkey";
ALTER TABLE "CustomerPaymentUnappliedAllocation" DROP CONSTRAINT "CustomerPaymentUnappliedAllocation_invoiceId_fkey";
ALTER TABLE "SupplierPaymentAllocation" DROP CONSTRAINT "SupplierPaymentAllocation_paymentId_fkey";
ALTER TABLE "SupplierPaymentAllocation" DROP CONSTRAINT "SupplierPaymentAllocation_billId_fkey";
ALTER TABLE "SupplierPaymentUnappliedAllocation" DROP CONSTRAINT "SupplierPaymentUnappliedAllocation_paymentId_fkey";
ALTER TABLE "SupplierPaymentUnappliedAllocation" DROP CONSTRAINT "SupplierPaymentUnappliedAllocation_billId_fkey";

ALTER TABLE "CustomerPaymentAllocation" ADD CONSTRAINT "cpa_org_payment_fkey" FOREIGN KEY ("organizationId", "paymentId") REFERENCES "CustomerPayment"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentAllocation" ADD CONSTRAINT "cpa_org_invoice_fkey" FOREIGN KEY ("organizationId", "invoiceId") REFERENCES "SalesInvoice"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentAllocation" ADD CONSTRAINT "cpa_org_realized_fx_journal_fkey" FOREIGN KEY ("organizationId", "realizedFxJournalEntryId") REFERENCES "JournalEntry"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "CustomerPaymentUnappliedAllocation" ADD CONSTRAINT "cpua_org_payment_fkey" FOREIGN KEY ("organizationId", "paymentId") REFERENCES "CustomerPayment"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentUnappliedAllocation" ADD CONSTRAINT "cpua_org_invoice_fkey" FOREIGN KEY ("organizationId", "invoiceId") REFERENCES "SalesInvoice"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentUnappliedAllocation" ADD CONSTRAINT "cpua_org_realized_fx_journal_fkey" FOREIGN KEY ("organizationId", "realizedFxJournalEntryId") REFERENCES "JournalEntry"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentUnappliedAllocation" ADD CONSTRAINT "cpua_org_realized_fx_reversal_fkey" FOREIGN KEY ("organizationId", "realizedFxReversalJournalEntryId") REFERENCES "JournalEntry"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "spa_org_payment_fkey" FOREIGN KEY ("organizationId", "paymentId") REFERENCES "SupplierPayment"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "spa_org_bill_fkey" FOREIGN KEY ("organizationId", "billId") REFERENCES "PurchaseBill"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "spa_org_realized_fx_journal_fkey" FOREIGN KEY ("organizationId", "realizedFxJournalEntryId") REFERENCES "JournalEntry"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "SupplierPaymentUnappliedAllocation" ADD CONSTRAINT "spua_org_payment_fkey" FOREIGN KEY ("organizationId", "paymentId") REFERENCES "SupplierPayment"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "SupplierPaymentUnappliedAllocation" ADD CONSTRAINT "spua_org_bill_fkey" FOREIGN KEY ("organizationId", "billId") REFERENCES "PurchaseBill"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "SupplierPaymentUnappliedAllocation" ADD CONSTRAINT "spua_org_realized_fx_journal_fkey" FOREIGN KEY ("organizationId", "realizedFxJournalEntryId") REFERENCES "JournalEntry"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "SupplierPaymentUnappliedAllocation" ADD CONSTRAINT "spua_org_realized_fx_reversal_fkey" FOREIGN KEY ("organizationId", "realizedFxReversalJournalEntryId") REFERENCES "JournalEntry"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Realized gain/loss lines have no source-currency amount. Mark them explicitly
-- and keep their transaction columns null rather than fabricating an amount.
CREATE OR REPLACE FUNCTION "validate_journal_line_fx_context"()
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

  IF NEW."functionalCurrencyOnly" THEN
    IF UPPER(BTRIM(NEW."currency")) <> UPPER(BTRIM(organization_base_currency))
       OR NEW."exchangeRate" <> 1
       OR NEW."rateSnapshotId" IS NOT NULL
       OR NEW."transactionDebit" IS NOT NULL
       OR NEW."transactionCredit" IS NOT NULL
       OR NEW."fxRoundingComponentCount" < 1 OR NEW."fxRoundingComponentCount" > 10000
       OR NEW."debit" < 0 OR NEW."credit" < 0
       OR (NEW."debit" > 0 AND NEW."credit" > 0)
       OR (NEW."debit" = 0 AND NEW."credit" = 0) THEN
      RAISE EXCEPTION 'Functional-currency-only journal line context is invalid.' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
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
     OR (NEW."transactionDebit" = 0 AND NEW."transactionCredit" = 0)
     OR (NEW."debit" > 0 AND NEW."transactionDebit" = 0)
     OR (NEW."credit" > 0 AND NEW."transactionCredit" = 0)
     OR (NEW."transactionDebit" > 0 AND NEW."credit" > 0)
     OR (NEW."transactionCredit" > 0 AND NEW."debit" > 0) THEN
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

CREATE OR REPLACE FUNCTION "assert_posted_journal_fx_totals"(target_journal_id UUID)
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
      AND NOT "functionalCurrencyOnly"
      AND ("transactionDebit" IS NULL OR "transactionCredit" IS NULL)
  ) THEN
    RAISE EXCEPTION 'Journal line FX context is incomplete or inconsistent.' USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "JournalLine" journal_line
    WHERE journal_line."journalEntryId" = target_journal_id
      AND NOT journal_line."functionalCurrencyOnly"
    GROUP BY UPPER(BTRIM(journal_line."currency"))
    HAVING SUM(journal_line."transactionDebit") <> SUM(journal_line."transactionCredit")
  ) THEN
    RAISE EXCEPTION 'Journal transaction amounts are not balanced by currency.' USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "JournalLine" journal_line
    JOIN "JournalEntry" journal_entry ON journal_entry."id" = journal_line."journalEntryId"
    JOIN "Organization" organization ON organization."id" = journal_entry."organizationId"
    WHERE journal_line."journalEntryId" = target_journal_id
      AND NOT journal_line."functionalCurrencyOnly"
      AND UPPER(BTRIM(journal_line."currency")) <> UPPER(BTRIM(organization."baseCurrency"))
    GROUP BY UPPER(BTRIM(journal_line."currency")), journal_line."exchangeRate"
    HAVING ABS(SUM(journal_line."debit") - ROUND(SUM(journal_line."transactionDebit") * journal_line."exchangeRate", 4))
             > SUM(CASE WHEN journal_line."transactionDebit" > 0 THEN journal_line."fxRoundingComponentCount" ELSE 0 END) * 0.0001
       OR ABS(SUM(journal_line."credit") - ROUND(SUM(journal_line."transactionCredit") * journal_line."exchangeRate", 4))
             > SUM(CASE WHEN journal_line."transactionCredit" > 0 THEN journal_line."fxRoundingComponentCount" ELSE 0 END) * 0.0001
  ) THEN
    RAISE EXCEPTION 'Journal FX base amounts do not match transaction amounts at the captured rate.' USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

COMMIT;
