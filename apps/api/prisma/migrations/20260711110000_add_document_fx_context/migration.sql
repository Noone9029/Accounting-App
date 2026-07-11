-- Additive document-level FX context. Existing accounting columns remain base-currency values.
-- Explicit transaction columns preserve document-currency amounts. Existing same-currency rows
-- are backfilled at rate 1; any pre-existing foreign draft remains visibly incomplete (null rate)
-- until it is reviewed and saved with a valid rate context.

-- Historical non-draft foreign rows cannot be assigned an evidence-free rate. Stop before
-- any schema mutation so an accountant can review and migrate them explicitly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "SalesInvoice" d JOIN "Organization" o ON o."id" = d."organizationId" WHERE UPPER(d."currency") <> UPPER(o."baseCurrency") AND d."status"::text <> 'DRAFT'
    UNION ALL SELECT 1 FROM "CreditNote" d JOIN "Organization" o ON o."id" = d."organizationId" WHERE UPPER(d."currency") <> UPPER(o."baseCurrency") AND d."status"::text <> 'DRAFT'
    UNION ALL SELECT 1 FROM "PurchaseBill" d JOIN "Organization" o ON o."id" = d."organizationId" WHERE UPPER(d."currency") <> UPPER(o."baseCurrency") AND d."status"::text <> 'DRAFT'
    UNION ALL SELECT 1 FROM "PurchaseDebitNote" d JOIN "Organization" o ON o."id" = d."organizationId" WHERE UPPER(d."currency") <> UPPER(o."baseCurrency") AND d."status"::text <> 'DRAFT'
    UNION ALL SELECT 1 FROM "CashExpense" d JOIN "Organization" o ON o."id" = d."organizationId" WHERE UPPER(d."currency") <> UPPER(o."baseCurrency") AND d."status"::text <> 'DRAFT'
    UNION ALL SELECT 1 FROM "CustomerPayment" d JOIN "Organization" o ON o."id" = d."organizationId" WHERE UPPER(d."currency") <> UPPER(o."baseCurrency") AND d."status"::text <> 'DRAFT'
    UNION ALL SELECT 1 FROM "SupplierPayment" d JOIN "Organization" o ON o."id" = d."organizationId" WHERE UPPER(d."currency") <> UPPER(o."baseCurrency") AND d."status"::text <> 'DRAFT'
    UNION ALL SELECT 1 FROM "CustomerRefund" d JOIN "Organization" o ON o."id" = d."organizationId" WHERE UPPER(d."currency") <> UPPER(o."baseCurrency") AND d."status"::text <> 'DRAFT'
    UNION ALL SELECT 1 FROM "SupplierRefund" d JOIN "Organization" o ON o."id" = d."organizationId" WHERE UPPER(d."currency") <> UPPER(o."baseCurrency") AND d."status"::text <> 'DRAFT'
  ) THEN
    RAISE EXCEPTION 'Document FX migration blocked: historical non-draft foreign records require reviewed treatment.';
  END IF;
END $$;

CREATE UNIQUE INDEX "CurrencyRateSnapshot_organizationId_id_key"
ON "CurrencyRateSnapshot"("organizationId", "id");

ALTER TABLE "GeneratedDocument" ADD COLUMN "accountingContextJson" JSONB;

ALTER TABLE "SalesInvoice"
  ADD COLUMN "baseCurrency" TEXT DEFAULT 'SAR',
  ADD COLUMN "exchangeRate" DECIMAL(18,8),
  ADD COLUMN "rateDate" DATE,
  ADD COLUMN "rateSource" "CurrencyRateSource",
  ADD COLUMN "rateSnapshotId" UUID,
  ADD COLUMN "transactionSubtotal" DECIMAL(20,4),
  ADD COLUMN "transactionDiscountTotal" DECIMAL(20,4),
  ADD COLUMN "transactionTaxableTotal" DECIMAL(20,4),
  ADD COLUMN "transactionTaxTotal" DECIMAL(20,4),
  ADD COLUMN "transactionTotal" DECIMAL(20,4);

UPDATE "SalesInvoice" d SET
  "baseCurrency" = o."baseCurrency",
  "exchangeRate" = CASE WHEN UPPER(d."currency") = UPPER(o."baseCurrency") THEN 1 ELSE NULL END,
  "rateDate" = CASE WHEN UPPER(d."currency") = UPPER(o."baseCurrency") THEN d."issueDate"::date ELSE NULL END,
  "rateSource" = CASE WHEN UPPER(d."currency") = UPPER(o."baseCurrency") THEN 'SYSTEM_RATE_1'::"CurrencyRateSource" ELSE NULL END,
  "transactionSubtotal" = d."subtotal",
  "transactionDiscountTotal" = d."discountTotal",
  "transactionTaxableTotal" = d."taxableTotal",
  "transactionTaxTotal" = d."taxTotal",
  "transactionTotal" = d."total"
FROM "Organization" o WHERE o."id" = d."organizationId";

ALTER TABLE "SalesInvoice"
  ALTER COLUMN "baseCurrency" SET NOT NULL,
  ALTER COLUMN "transactionSubtotal" SET NOT NULL,
  ALTER COLUMN "transactionDiscountTotal" SET NOT NULL,
  ALTER COLUMN "transactionTaxableTotal" SET NOT NULL,
  ALTER COLUMN "transactionTaxTotal" SET NOT NULL,
  ALTER COLUMN "transactionTotal" SET NOT NULL;

ALTER TABLE "SalesInvoiceLine"
  ADD COLUMN "transactionLineGrossAmount" DECIMAL(20,4),
  ADD COLUMN "transactionDiscountAmount" DECIMAL(20,4),
  ADD COLUMN "transactionTaxableAmount" DECIMAL(20,4),
  ADD COLUMN "transactionTaxAmount" DECIMAL(20,4),
  ADD COLUMN "transactionLineTotal" DECIMAL(20,4);
UPDATE "SalesInvoiceLine" SET
  "transactionLineGrossAmount" = "lineGrossAmount",
  "transactionDiscountAmount" = "discountAmount",
  "transactionTaxableAmount" = "taxableAmount",
  "transactionTaxAmount" = "taxAmount",
  "transactionLineTotal" = "lineTotal";
ALTER TABLE "SalesInvoiceLine"
  ALTER COLUMN "transactionLineGrossAmount" SET NOT NULL,
  ALTER COLUMN "transactionDiscountAmount" SET NOT NULL,
  ALTER COLUMN "transactionTaxableAmount" SET NOT NULL,
  ALTER COLUMN "transactionTaxAmount" SET NOT NULL,
  ALTER COLUMN "transactionLineTotal" SET NOT NULL;

ALTER TABLE "CreditNote"
  ADD COLUMN "baseCurrency" TEXT DEFAULT 'SAR',
  ADD COLUMN "exchangeRate" DECIMAL(18,8),
  ADD COLUMN "rateDate" DATE,
  ADD COLUMN "rateSource" "CurrencyRateSource",
  ADD COLUMN "rateSnapshotId" UUID,
  ADD COLUMN "transactionSubtotal" DECIMAL(20,4),
  ADD COLUMN "transactionDiscountTotal" DECIMAL(20,4),
  ADD COLUMN "transactionTaxableTotal" DECIMAL(20,4),
  ADD COLUMN "transactionTaxTotal" DECIMAL(20,4),
  ADD COLUMN "transactionTotal" DECIMAL(20,4);
UPDATE "CreditNote" d SET
  "baseCurrency" = o."baseCurrency",
  "exchangeRate" = CASE WHEN UPPER(d."currency") = UPPER(o."baseCurrency") THEN 1 ELSE NULL END,
  "rateDate" = CASE WHEN UPPER(d."currency") = UPPER(o."baseCurrency") THEN d."issueDate"::date ELSE NULL END,
  "rateSource" = CASE WHEN UPPER(d."currency") = UPPER(o."baseCurrency") THEN 'SYSTEM_RATE_1'::"CurrencyRateSource" ELSE NULL END,
  "transactionSubtotal" = d."subtotal", "transactionDiscountTotal" = d."discountTotal",
  "transactionTaxableTotal" = d."taxableTotal", "transactionTaxTotal" = d."taxTotal",
  "transactionTotal" = d."total"
FROM "Organization" o WHERE o."id" = d."organizationId";
ALTER TABLE "CreditNote"
  ALTER COLUMN "baseCurrency" SET NOT NULL, ALTER COLUMN "transactionSubtotal" SET NOT NULL,
  ALTER COLUMN "transactionDiscountTotal" SET NOT NULL, ALTER COLUMN "transactionTaxableTotal" SET NOT NULL,
  ALTER COLUMN "transactionTaxTotal" SET NOT NULL, ALTER COLUMN "transactionTotal" SET NOT NULL;

ALTER TABLE "CreditNoteLine"
  ADD COLUMN "transactionLineGrossAmount" DECIMAL(20,4), ADD COLUMN "transactionDiscountAmount" DECIMAL(20,4),
  ADD COLUMN "transactionTaxableAmount" DECIMAL(20,4), ADD COLUMN "transactionTaxAmount" DECIMAL(20,4),
  ADD COLUMN "transactionLineTotal" DECIMAL(20,4);
UPDATE "CreditNoteLine" SET "transactionLineGrossAmount"="lineGrossAmount", "transactionDiscountAmount"="discountAmount",
  "transactionTaxableAmount"="taxableAmount", "transactionTaxAmount"="taxAmount", "transactionLineTotal"="lineTotal";
ALTER TABLE "CreditNoteLine"
  ALTER COLUMN "transactionLineGrossAmount" SET NOT NULL, ALTER COLUMN "transactionDiscountAmount" SET NOT NULL,
  ALTER COLUMN "transactionTaxableAmount" SET NOT NULL, ALTER COLUMN "transactionTaxAmount" SET NOT NULL,
  ALTER COLUMN "transactionLineTotal" SET NOT NULL;

ALTER TABLE "PurchaseBill"
  ADD COLUMN "baseCurrency" TEXT DEFAULT 'SAR', ADD COLUMN "exchangeRate" DECIMAL(18,8), ADD COLUMN "rateDate" DATE,
  ADD COLUMN "rateSource" "CurrencyRateSource", ADD COLUMN "rateSnapshotId" UUID,
  ADD COLUMN "transactionSubtotal" DECIMAL(20,4), ADD COLUMN "transactionDiscountTotal" DECIMAL(20,4),
  ADD COLUMN "transactionTaxableTotal" DECIMAL(20,4), ADD COLUMN "transactionTaxTotal" DECIMAL(20,4),
  ADD COLUMN "transactionTotal" DECIMAL(20,4);
UPDATE "PurchaseBill" d SET
  "baseCurrency"=o."baseCurrency", "exchangeRate"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN 1 ELSE NULL END,
  "rateDate"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN d."billDate"::date ELSE NULL END,
  "rateSource"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN 'SYSTEM_RATE_1'::"CurrencyRateSource" ELSE NULL END,
  "transactionSubtotal"=d."subtotal", "transactionDiscountTotal"=d."discountTotal",
  "transactionTaxableTotal"=d."taxableTotal", "transactionTaxTotal"=d."taxTotal",
  "transactionTotal"=d."total"
FROM "Organization" o WHERE o."id"=d."organizationId";
ALTER TABLE "PurchaseBill"
  ALTER COLUMN "baseCurrency" SET NOT NULL, ALTER COLUMN "transactionSubtotal" SET NOT NULL,
  ALTER COLUMN "transactionDiscountTotal" SET NOT NULL, ALTER COLUMN "transactionTaxableTotal" SET NOT NULL,
  ALTER COLUMN "transactionTaxTotal" SET NOT NULL, ALTER COLUMN "transactionTotal" SET NOT NULL;

ALTER TABLE "PurchaseBillLine"
  ADD COLUMN "transactionLineGrossAmount" DECIMAL(20,4), ADD COLUMN "transactionDiscountAmount" DECIMAL(20,4),
  ADD COLUMN "transactionTaxableAmount" DECIMAL(20,4), ADD COLUMN "transactionTaxAmount" DECIMAL(20,4),
  ADD COLUMN "transactionLineTotal" DECIMAL(20,4);
UPDATE "PurchaseBillLine" SET "transactionLineGrossAmount"="lineGrossAmount", "transactionDiscountAmount"="discountAmount",
  "transactionTaxableAmount"="taxableAmount", "transactionTaxAmount"="taxAmount", "transactionLineTotal"="lineTotal";
ALTER TABLE "PurchaseBillLine"
  ALTER COLUMN "transactionLineGrossAmount" SET NOT NULL, ALTER COLUMN "transactionDiscountAmount" SET NOT NULL,
  ALTER COLUMN "transactionTaxableAmount" SET NOT NULL, ALTER COLUMN "transactionTaxAmount" SET NOT NULL,
  ALTER COLUMN "transactionLineTotal" SET NOT NULL;

ALTER TABLE "PurchaseDebitNote"
  ADD COLUMN "baseCurrency" TEXT DEFAULT 'SAR', ADD COLUMN "exchangeRate" DECIMAL(18,8), ADD COLUMN "rateDate" DATE,
  ADD COLUMN "rateSource" "CurrencyRateSource", ADD COLUMN "rateSnapshotId" UUID,
  ADD COLUMN "transactionSubtotal" DECIMAL(20,4), ADD COLUMN "transactionDiscountTotal" DECIMAL(20,4),
  ADD COLUMN "transactionTaxableTotal" DECIMAL(20,4), ADD COLUMN "transactionTaxTotal" DECIMAL(20,4),
  ADD COLUMN "transactionTotal" DECIMAL(20,4);
UPDATE "PurchaseDebitNote" d SET
  "baseCurrency"=o."baseCurrency", "exchangeRate"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN 1 ELSE NULL END,
  "rateDate"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN d."issueDate"::date ELSE NULL END,
  "rateSource"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN 'SYSTEM_RATE_1'::"CurrencyRateSource" ELSE NULL END,
  "transactionSubtotal"=d."subtotal", "transactionDiscountTotal"=d."discountTotal",
  "transactionTaxableTotal"=d."taxableTotal", "transactionTaxTotal"=d."taxTotal",
  "transactionTotal"=d."total"
FROM "Organization" o WHERE o."id"=d."organizationId";
ALTER TABLE "PurchaseDebitNote"
  ALTER COLUMN "baseCurrency" SET NOT NULL, ALTER COLUMN "transactionSubtotal" SET NOT NULL,
  ALTER COLUMN "transactionDiscountTotal" SET NOT NULL, ALTER COLUMN "transactionTaxableTotal" SET NOT NULL,
  ALTER COLUMN "transactionTaxTotal" SET NOT NULL, ALTER COLUMN "transactionTotal" SET NOT NULL;

ALTER TABLE "PurchaseDebitNoteLine"
  ADD COLUMN "transactionLineGrossAmount" DECIMAL(20,4), ADD COLUMN "transactionDiscountAmount" DECIMAL(20,4),
  ADD COLUMN "transactionTaxableAmount" DECIMAL(20,4), ADD COLUMN "transactionTaxAmount" DECIMAL(20,4),
  ADD COLUMN "transactionLineTotal" DECIMAL(20,4);
UPDATE "PurchaseDebitNoteLine" SET "transactionLineGrossAmount"="lineGrossAmount", "transactionDiscountAmount"="discountAmount",
  "transactionTaxableAmount"="taxableAmount", "transactionTaxAmount"="taxAmount", "transactionLineTotal"="lineTotal";
ALTER TABLE "PurchaseDebitNoteLine"
  ALTER COLUMN "transactionLineGrossAmount" SET NOT NULL, ALTER COLUMN "transactionDiscountAmount" SET NOT NULL,
  ALTER COLUMN "transactionTaxableAmount" SET NOT NULL, ALTER COLUMN "transactionTaxAmount" SET NOT NULL,
  ALTER COLUMN "transactionLineTotal" SET NOT NULL;

ALTER TABLE "CashExpense"
  ADD COLUMN "baseCurrency" TEXT DEFAULT 'SAR', ADD COLUMN "exchangeRate" DECIMAL(18,8), ADD COLUMN "rateDate" DATE,
  ADD COLUMN "rateSource" "CurrencyRateSource", ADD COLUMN "rateSnapshotId" UUID,
  ADD COLUMN "transactionSubtotal" DECIMAL(20,4), ADD COLUMN "transactionDiscountTotal" DECIMAL(20,4),
  ADD COLUMN "transactionTaxableTotal" DECIMAL(20,4), ADD COLUMN "transactionTaxTotal" DECIMAL(20,4),
  ADD COLUMN "transactionTotal" DECIMAL(20,4);
UPDATE "CashExpense" d SET
  "baseCurrency"=o."baseCurrency", "exchangeRate"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN 1 ELSE NULL END,
  "rateDate"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN d."expenseDate"::date ELSE NULL END,
  "rateSource"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN 'SYSTEM_RATE_1'::"CurrencyRateSource" ELSE NULL END,
  "transactionSubtotal"=d."subtotal", "transactionDiscountTotal"=d."discountTotal",
  "transactionTaxableTotal"=d."taxableTotal", "transactionTaxTotal"=d."taxTotal", "transactionTotal"=d."total"
FROM "Organization" o WHERE o."id"=d."organizationId";
ALTER TABLE "CashExpense"
  ALTER COLUMN "baseCurrency" SET NOT NULL, ALTER COLUMN "transactionSubtotal" SET NOT NULL,
  ALTER COLUMN "transactionDiscountTotal" SET NOT NULL, ALTER COLUMN "transactionTaxableTotal" SET NOT NULL,
  ALTER COLUMN "transactionTaxTotal" SET NOT NULL, ALTER COLUMN "transactionTotal" SET NOT NULL;

ALTER TABLE "CashExpenseLine"
  ADD COLUMN "transactionLineGrossAmount" DECIMAL(20,4), ADD COLUMN "transactionDiscountAmount" DECIMAL(20,4),
  ADD COLUMN "transactionTaxableAmount" DECIMAL(20,4), ADD COLUMN "transactionTaxAmount" DECIMAL(20,4),
  ADD COLUMN "transactionLineTotal" DECIMAL(20,4);
UPDATE "CashExpenseLine" SET "transactionLineGrossAmount"="lineGrossAmount", "transactionDiscountAmount"="discountAmount",
  "transactionTaxableAmount"="taxableAmount", "transactionTaxAmount"="taxAmount", "transactionLineTotal"="lineTotal";
ALTER TABLE "CashExpenseLine"
  ALTER COLUMN "transactionLineGrossAmount" SET NOT NULL, ALTER COLUMN "transactionDiscountAmount" SET NOT NULL,
  ALTER COLUMN "transactionTaxableAmount" SET NOT NULL, ALTER COLUMN "transactionTaxAmount" SET NOT NULL,
  ALTER COLUMN "transactionLineTotal" SET NOT NULL;

ALTER TABLE "CustomerPayment"
  ADD COLUMN "baseCurrency" TEXT, ADD COLUMN "exchangeRate" DECIMAL(18,8), ADD COLUMN "rateDate" DATE,
  ADD COLUMN "rateSource" "CurrencyRateSource", ADD COLUMN "rateSnapshotId" UUID,
  ADD COLUMN "transactionAmountReceived" DECIMAL(20,4);
UPDATE "CustomerPayment" d SET "baseCurrency"=o."baseCurrency",
  "exchangeRate"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN 1 ELSE NULL END,
  "rateDate"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN d."paymentDate"::date ELSE NULL END,
  "rateSource"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN 'SYSTEM_RATE_1'::"CurrencyRateSource" ELSE NULL END,
  "transactionAmountReceived"=d."amountReceived"
FROM "Organization" o WHERE o."id"=d."organizationId";
ALTER TABLE "CustomerPayment" ALTER COLUMN "baseCurrency" SET NOT NULL,
  ALTER COLUMN "baseCurrency" SET DEFAULT 'SAR',
  ALTER COLUMN "transactionAmountReceived" SET NOT NULL;

ALTER TABLE "SupplierPayment"
  ADD COLUMN "baseCurrency" TEXT, ADD COLUMN "exchangeRate" DECIMAL(18,8), ADD COLUMN "rateDate" DATE,
  ADD COLUMN "rateSource" "CurrencyRateSource", ADD COLUMN "rateSnapshotId" UUID,
  ADD COLUMN "transactionAmountPaid" DECIMAL(20,4);
UPDATE "SupplierPayment" d SET "baseCurrency"=o."baseCurrency",
  "exchangeRate"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN 1 ELSE NULL END,
  "rateDate"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN d."paymentDate"::date ELSE NULL END,
  "rateSource"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN 'SYSTEM_RATE_1'::"CurrencyRateSource" ELSE NULL END,
  "transactionAmountPaid"=d."amountPaid"
FROM "Organization" o WHERE o."id"=d."organizationId";
ALTER TABLE "SupplierPayment" ALTER COLUMN "baseCurrency" SET NOT NULL,
  ALTER COLUMN "baseCurrency" SET DEFAULT 'SAR',
  ALTER COLUMN "transactionAmountPaid" SET NOT NULL;

ALTER TABLE "CustomerRefund"
  ADD COLUMN "baseCurrency" TEXT, ADD COLUMN "exchangeRate" DECIMAL(18,8), ADD COLUMN "rateDate" DATE,
  ADD COLUMN "rateSource" "CurrencyRateSource", ADD COLUMN "rateSnapshotId" UUID,
  ADD COLUMN "transactionAmountRefunded" DECIMAL(20,4);
UPDATE "CustomerRefund" d SET "baseCurrency"=o."baseCurrency",
  "exchangeRate"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN 1 ELSE NULL END,
  "rateDate"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN d."refundDate"::date ELSE NULL END,
  "rateSource"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN 'SYSTEM_RATE_1'::"CurrencyRateSource" ELSE NULL END,
  "transactionAmountRefunded"=d."amountRefunded"
FROM "Organization" o WHERE o."id"=d."organizationId";
ALTER TABLE "CustomerRefund" ALTER COLUMN "baseCurrency" SET NOT NULL, ALTER COLUMN "baseCurrency" SET DEFAULT 'SAR', ALTER COLUMN "transactionAmountRefunded" SET NOT NULL;

ALTER TABLE "SupplierRefund"
  ADD COLUMN "baseCurrency" TEXT, ADD COLUMN "exchangeRate" DECIMAL(18,8), ADD COLUMN "rateDate" DATE,
  ADD COLUMN "rateSource" "CurrencyRateSource", ADD COLUMN "rateSnapshotId" UUID,
  ADD COLUMN "transactionAmountRefunded" DECIMAL(20,4);
UPDATE "SupplierRefund" d SET "baseCurrency"=o."baseCurrency",
  "exchangeRate"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN 1 ELSE NULL END,
  "rateDate"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN d."refundDate"::date ELSE NULL END,
  "rateSource"=CASE WHEN UPPER(d."currency")=UPPER(o."baseCurrency") THEN 'SYSTEM_RATE_1'::"CurrencyRateSource" ELSE NULL END,
  "transactionAmountRefunded"=d."amountRefunded"
FROM "Organization" o WHERE o."id"=d."organizationId";
ALTER TABLE "SupplierRefund" ALTER COLUMN "baseCurrency" SET NOT NULL, ALTER COLUMN "baseCurrency" SET DEFAULT 'SAR', ALTER COLUMN "transactionAmountRefunded" SET NOT NULL;

-- Match Prisma's additive compatibility defaults so every direct create path has the same
-- behavior at the client and PostgreSQL boundaries. Application services still write the
-- correct transaction values explicitly for supported documents.
ALTER TABLE "SalesInvoice" ALTER COLUMN "transactionSubtotal" SET DEFAULT 0;
ALTER TABLE "SalesInvoice" ALTER COLUMN "transactionDiscountTotal" SET DEFAULT 0;
ALTER TABLE "SalesInvoice" ALTER COLUMN "transactionTaxableTotal" SET DEFAULT 0;
ALTER TABLE "SalesInvoice" ALTER COLUMN "transactionTaxTotal" SET DEFAULT 0;
ALTER TABLE "SalesInvoice" ALTER COLUMN "transactionTotal" SET DEFAULT 0;
ALTER TABLE "SalesInvoiceLine" ALTER COLUMN "transactionLineGrossAmount" SET DEFAULT 0;
ALTER TABLE "SalesInvoiceLine" ALTER COLUMN "transactionDiscountAmount" SET DEFAULT 0;
ALTER TABLE "SalesInvoiceLine" ALTER COLUMN "transactionTaxableAmount" SET DEFAULT 0;
ALTER TABLE "SalesInvoiceLine" ALTER COLUMN "transactionTaxAmount" SET DEFAULT 0;
ALTER TABLE "SalesInvoiceLine" ALTER COLUMN "transactionLineTotal" SET DEFAULT 0;

ALTER TABLE "CreditNote" ALTER COLUMN "transactionSubtotal" SET DEFAULT 0;
ALTER TABLE "CreditNote" ALTER COLUMN "transactionDiscountTotal" SET DEFAULT 0;
ALTER TABLE "CreditNote" ALTER COLUMN "transactionTaxableTotal" SET DEFAULT 0;
ALTER TABLE "CreditNote" ALTER COLUMN "transactionTaxTotal" SET DEFAULT 0;
ALTER TABLE "CreditNote" ALTER COLUMN "transactionTotal" SET DEFAULT 0;
ALTER TABLE "CreditNoteLine" ALTER COLUMN "transactionLineGrossAmount" SET DEFAULT 0;
ALTER TABLE "CreditNoteLine" ALTER COLUMN "transactionDiscountAmount" SET DEFAULT 0;
ALTER TABLE "CreditNoteLine" ALTER COLUMN "transactionTaxableAmount" SET DEFAULT 0;
ALTER TABLE "CreditNoteLine" ALTER COLUMN "transactionTaxAmount" SET DEFAULT 0;
ALTER TABLE "CreditNoteLine" ALTER COLUMN "transactionLineTotal" SET DEFAULT 0;

ALTER TABLE "PurchaseBill" ALTER COLUMN "transactionSubtotal" SET DEFAULT 0;
ALTER TABLE "PurchaseBill" ALTER COLUMN "transactionDiscountTotal" SET DEFAULT 0;
ALTER TABLE "PurchaseBill" ALTER COLUMN "transactionTaxableTotal" SET DEFAULT 0;
ALTER TABLE "PurchaseBill" ALTER COLUMN "transactionTaxTotal" SET DEFAULT 0;
ALTER TABLE "PurchaseBill" ALTER COLUMN "transactionTotal" SET DEFAULT 0;
ALTER TABLE "PurchaseBillLine" ALTER COLUMN "transactionLineGrossAmount" SET DEFAULT 0;
ALTER TABLE "PurchaseBillLine" ALTER COLUMN "transactionDiscountAmount" SET DEFAULT 0;
ALTER TABLE "PurchaseBillLine" ALTER COLUMN "transactionTaxableAmount" SET DEFAULT 0;
ALTER TABLE "PurchaseBillLine" ALTER COLUMN "transactionTaxAmount" SET DEFAULT 0;
ALTER TABLE "PurchaseBillLine" ALTER COLUMN "transactionLineTotal" SET DEFAULT 0;

ALTER TABLE "PurchaseDebitNote" ALTER COLUMN "transactionSubtotal" SET DEFAULT 0;
ALTER TABLE "PurchaseDebitNote" ALTER COLUMN "transactionDiscountTotal" SET DEFAULT 0;
ALTER TABLE "PurchaseDebitNote" ALTER COLUMN "transactionTaxableTotal" SET DEFAULT 0;
ALTER TABLE "PurchaseDebitNote" ALTER COLUMN "transactionTaxTotal" SET DEFAULT 0;
ALTER TABLE "PurchaseDebitNote" ALTER COLUMN "transactionTotal" SET DEFAULT 0;
ALTER TABLE "PurchaseDebitNoteLine" ALTER COLUMN "transactionLineGrossAmount" SET DEFAULT 0;
ALTER TABLE "PurchaseDebitNoteLine" ALTER COLUMN "transactionDiscountAmount" SET DEFAULT 0;
ALTER TABLE "PurchaseDebitNoteLine" ALTER COLUMN "transactionTaxableAmount" SET DEFAULT 0;
ALTER TABLE "PurchaseDebitNoteLine" ALTER COLUMN "transactionTaxAmount" SET DEFAULT 0;
ALTER TABLE "PurchaseDebitNoteLine" ALTER COLUMN "transactionLineTotal" SET DEFAULT 0;

ALTER TABLE "CashExpense" ALTER COLUMN "transactionSubtotal" SET DEFAULT 0;
ALTER TABLE "CashExpense" ALTER COLUMN "transactionDiscountTotal" SET DEFAULT 0;
ALTER TABLE "CashExpense" ALTER COLUMN "transactionTaxableTotal" SET DEFAULT 0;
ALTER TABLE "CashExpense" ALTER COLUMN "transactionTaxTotal" SET DEFAULT 0;
ALTER TABLE "CashExpense" ALTER COLUMN "transactionTotal" SET DEFAULT 0;
ALTER TABLE "CashExpenseLine" ALTER COLUMN "transactionLineGrossAmount" SET DEFAULT 0;
ALTER TABLE "CashExpenseLine" ALTER COLUMN "transactionDiscountAmount" SET DEFAULT 0;
ALTER TABLE "CashExpenseLine" ALTER COLUMN "transactionTaxableAmount" SET DEFAULT 0;
ALTER TABLE "CashExpenseLine" ALTER COLUMN "transactionTaxAmount" SET DEFAULT 0;
ALTER TABLE "CashExpenseLine" ALTER COLUMN "transactionLineTotal" SET DEFAULT 0;

ALTER TABLE "CustomerPayment" ALTER COLUMN "transactionAmountReceived" SET DEFAULT 0;
ALTER TABLE "SupplierPayment" ALTER COLUMN "transactionAmountPaid" SET DEFAULT 0;
ALTER TABLE "CustomerRefund" ALTER COLUMN "transactionAmountRefunded" SET DEFAULT 0;
ALTER TABLE "SupplierRefund" ALTER COLUMN "transactionAmountRefunded" SET DEFAULT 0;

CREATE INDEX "SalesInvoice_organizationId_rateSnapshotId_idx" ON "SalesInvoice"("organizationId", "rateSnapshotId");
CREATE INDEX "CreditNote_organizationId_rateSnapshotId_idx" ON "CreditNote"("organizationId", "rateSnapshotId");
CREATE INDEX "PurchaseBill_organizationId_rateSnapshotId_idx" ON "PurchaseBill"("organizationId", "rateSnapshotId");
CREATE INDEX "PurchaseDebitNote_organizationId_rateSnapshotId_idx" ON "PurchaseDebitNote"("organizationId", "rateSnapshotId");
CREATE INDEX "CashExpense_organizationId_rateSnapshotId_idx" ON "CashExpense"("organizationId", "rateSnapshotId");
CREATE INDEX "CustomerPayment_organizationId_rateSnapshotId_idx" ON "CustomerPayment"("organizationId", "rateSnapshotId");
CREATE INDEX "SupplierPayment_organizationId_rateSnapshotId_idx" ON "SupplierPayment"("organizationId", "rateSnapshotId");
CREATE INDEX "CustomerRefund_organizationId_rateSnapshotId_idx" ON "CustomerRefund"("organizationId", "rateSnapshotId");
CREATE INDEX "SupplierRefund_organizationId_rateSnapshotId_idx" ON "SupplierRefund"("organizationId", "rateSnapshotId");

ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_organizationId_rateSnapshotId_fkey" FOREIGN KEY ("organizationId", "rateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_organizationId_rateSnapshotId_fkey" FOREIGN KEY ("organizationId", "rateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_organizationId_rateSnapshotId_fkey" FOREIGN KEY ("organizationId", "rateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "PurchaseDebitNote" ADD CONSTRAINT "PurchaseDebitNote_organizationId_rateSnapshotId_fkey" FOREIGN KEY ("organizationId", "rateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_organizationId_rateSnapshotId_fkey" FOREIGN KEY ("organizationId", "rateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_organizationId_rateSnapshotId_fkey" FOREIGN KEY ("organizationId", "rateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_organizationId_rateSnapshotId_fkey" FOREIGN KEY ("organizationId", "rateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "CustomerRefund" ADD CONSTRAINT "CustomerRefund_organizationId_rateSnapshotId_fkey" FOREIGN KEY ("organizationId", "rateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "SupplierRefund" ADD CONSTRAINT "SupplierRefund_organizationId_rateSnapshotId_fkey" FOREIGN KEY ("organizationId", "rateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- The Prisma compatibility default keeps direct test fixtures source-compatible. The database
-- remains authoritative and always derives the actual base currency from the owning organization.
CREATE FUNCTION "derive_document_base_currency"() RETURNS trigger AS $$
DECLARE organization_base_currency TEXT;
BEGIN
  SELECT "baseCurrency" INTO organization_base_currency FROM "Organization" WHERE "id" = NEW."organizationId";
  IF organization_base_currency IS NULL THEN
    RAISE EXCEPTION 'Document organization has no valid base currency.' USING ERRCODE = 'check_violation';
  END IF;
  NEW."baseCurrency" := UPPER(BTRIM(organization_base_currency));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SalesInvoice_derive_base_currency" BEFORE INSERT OR UPDATE OF "organizationId", "baseCurrency" ON "SalesInvoice" FOR EACH ROW EXECUTE FUNCTION "derive_document_base_currency"();
CREATE TRIGGER "CreditNote_derive_base_currency" BEFORE INSERT OR UPDATE OF "organizationId", "baseCurrency" ON "CreditNote" FOR EACH ROW EXECUTE FUNCTION "derive_document_base_currency"();
CREATE TRIGGER "PurchaseBill_derive_base_currency" BEFORE INSERT OR UPDATE OF "organizationId", "baseCurrency" ON "PurchaseBill" FOR EACH ROW EXECUTE FUNCTION "derive_document_base_currency"();
CREATE TRIGGER "PurchaseDebitNote_derive_base_currency" BEFORE INSERT OR UPDATE OF "organizationId", "baseCurrency" ON "PurchaseDebitNote" FOR EACH ROW EXECUTE FUNCTION "derive_document_base_currency"();
CREATE TRIGGER "CashExpense_derive_base_currency" BEFORE INSERT OR UPDATE OF "organizationId", "baseCurrency" ON "CashExpense" FOR EACH ROW EXECUTE FUNCTION "derive_document_base_currency"();
CREATE TRIGGER "CustomerPayment_derive_base_currency" BEFORE INSERT OR UPDATE OF "organizationId", "baseCurrency" ON "CustomerPayment" FOR EACH ROW EXECUTE FUNCTION "derive_document_base_currency"();
CREATE TRIGGER "SupplierPayment_derive_base_currency" BEFORE INSERT OR UPDATE OF "organizationId", "baseCurrency" ON "SupplierPayment" FOR EACH ROW EXECUTE FUNCTION "derive_document_base_currency"();
CREATE TRIGGER "CustomerRefund_derive_base_currency" BEFORE INSERT OR UPDATE OF "organizationId", "baseCurrency" ON "CustomerRefund" FOR EACH ROW EXECUTE FUNCTION "derive_document_base_currency"();
CREATE TRIGGER "SupplierRefund_derive_base_currency" BEFORE INSERT OR UPDATE OF "organizationId", "baseCurrency" ON "SupplierRefund" FOR EACH ROW EXECUTE FUNCTION "derive_document_base_currency"();

CREATE FUNCTION "validate_document_rate_snapshot_context"() RETURNS trigger AS $$
DECLARE
  snapshot_transaction_currency TEXT;
  snapshot_base_currency TEXT;
  snapshot_rate DECIMAL(18,8);
  snapshot_rate_date DATE;
  snapshot_source "CurrencyRateSource";
BEGIN
  IF NEW."rateSnapshotId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "transactionCurrency", "baseCurrency", "rate", "rateDate", "source"
    INTO snapshot_transaction_currency, snapshot_base_currency, snapshot_rate, snapshot_rate_date, snapshot_source
    FROM "CurrencyRateSnapshot"
    WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."rateSnapshotId";

  IF NOT FOUND OR
    UPPER(NEW."currency") IS DISTINCT FROM UPPER(snapshot_transaction_currency) OR
    UPPER(NEW."baseCurrency") IS DISTINCT FROM UPPER(snapshot_base_currency) OR
    NEW."exchangeRate" IS DISTINCT FROM snapshot_rate OR
    NEW."rateDate" IS DISTINCT FROM snapshot_rate_date OR
    NEW."rateSource" IS DISTINCT FROM snapshot_source OR
    snapshot_source = 'FUTURE_PROVIDER_DISABLED' THEN
    RAISE EXCEPTION 'FX rate snapshot values do not match the document context.' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SalesInvoice_validate_rate_snapshot" BEFORE INSERT OR UPDATE ON "SalesInvoice" FOR EACH ROW EXECUTE FUNCTION "validate_document_rate_snapshot_context"();
CREATE TRIGGER "CreditNote_validate_rate_snapshot" BEFORE INSERT OR UPDATE ON "CreditNote" FOR EACH ROW EXECUTE FUNCTION "validate_document_rate_snapshot_context"();
CREATE TRIGGER "PurchaseBill_validate_rate_snapshot" BEFORE INSERT OR UPDATE ON "PurchaseBill" FOR EACH ROW EXECUTE FUNCTION "validate_document_rate_snapshot_context"();
CREATE TRIGGER "PurchaseDebitNote_validate_rate_snapshot" BEFORE INSERT OR UPDATE ON "PurchaseDebitNote" FOR EACH ROW EXECUTE FUNCTION "validate_document_rate_snapshot_context"();
CREATE TRIGGER "CashExpense_validate_rate_snapshot" BEFORE INSERT OR UPDATE ON "CashExpense" FOR EACH ROW EXECUTE FUNCTION "validate_document_rate_snapshot_context"();
CREATE TRIGGER "CustomerPayment_validate_rate_snapshot" BEFORE INSERT OR UPDATE ON "CustomerPayment" FOR EACH ROW EXECUTE FUNCTION "validate_document_rate_snapshot_context"();
CREATE TRIGGER "SupplierPayment_validate_rate_snapshot" BEFORE INSERT OR UPDATE ON "SupplierPayment" FOR EACH ROW EXECUTE FUNCTION "validate_document_rate_snapshot_context"();
CREATE TRIGGER "CustomerRefund_validate_rate_snapshot" BEFORE INSERT OR UPDATE ON "CustomerRefund" FOR EACH ROW EXECUTE FUNCTION "validate_document_rate_snapshot_context"();
CREATE TRIGGER "SupplierRefund_validate_rate_snapshot" BEFORE INSERT OR UPDATE ON "SupplierRefund" FOR EACH ROW EXECUTE FUNCTION "validate_document_rate_snapshot_context"();

CREATE FUNCTION "freeze_posted_document_fx_context"() RETURNS trigger AS $$
BEGIN
  IF OLD."status"::text <> 'DRAFT' AND (
    NEW."currency" IS DISTINCT FROM OLD."currency" OR
    NEW."baseCurrency" IS DISTINCT FROM OLD."baseCurrency" OR
    NEW."exchangeRate" IS DISTINCT FROM OLD."exchangeRate" OR
    NEW."rateDate" IS DISTINCT FROM OLD."rateDate" OR
    NEW."rateSource" IS DISTINCT FROM OLD."rateSource" OR
    NEW."rateSnapshotId" IS DISTINCT FROM OLD."rateSnapshotId"
  ) THEN
    RAISE EXCEPTION 'Posted document FX context is immutable.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SalesInvoice_freeze_fx_context" BEFORE UPDATE ON "SalesInvoice" FOR EACH ROW EXECUTE FUNCTION "freeze_posted_document_fx_context"();
CREATE TRIGGER "CreditNote_freeze_fx_context" BEFORE UPDATE ON "CreditNote" FOR EACH ROW EXECUTE FUNCTION "freeze_posted_document_fx_context"();
CREATE TRIGGER "PurchaseBill_freeze_fx_context" BEFORE UPDATE ON "PurchaseBill" FOR EACH ROW EXECUTE FUNCTION "freeze_posted_document_fx_context"();
CREATE TRIGGER "PurchaseDebitNote_freeze_fx_context" BEFORE UPDATE ON "PurchaseDebitNote" FOR EACH ROW EXECUTE FUNCTION "freeze_posted_document_fx_context"();
CREATE TRIGGER "CashExpense_freeze_fx_context" BEFORE UPDATE ON "CashExpense" FOR EACH ROW EXECUTE FUNCTION "freeze_posted_document_fx_context"();
CREATE TRIGGER "CustomerPayment_freeze_fx_context" BEFORE UPDATE ON "CustomerPayment" FOR EACH ROW EXECUTE FUNCTION "freeze_posted_document_fx_context"();
CREATE TRIGGER "SupplierPayment_freeze_fx_context" BEFORE UPDATE ON "SupplierPayment" FOR EACH ROW EXECUTE FUNCTION "freeze_posted_document_fx_context"();
CREATE TRIGGER "CustomerRefund_freeze_fx_context" BEFORE UPDATE ON "CustomerRefund" FOR EACH ROW EXECUTE FUNCTION "freeze_posted_document_fx_context"();
CREATE TRIGGER "SupplierRefund_freeze_fx_context" BEFORE UPDATE ON "SupplierRefund" FOR EACH ROW EXECUTE FUNCTION "freeze_posted_document_fx_context"();

ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_fx_context_valid" CHECK ((UPPER("currency") = UPPER("baseCurrency") AND "exchangeRate" IS NOT NULL AND "exchangeRate" = 1 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" = 'SYSTEM_RATE_1' AND "rateSnapshotId" IS NULL) OR (UPPER("currency") <> UPPER("baseCurrency") AND (("status"::text = 'DRAFT' AND "exchangeRate" IS NULL AND "rateDate" IS NULL AND "rateSource" IS NULL AND "rateSnapshotId" IS NULL) OR ("exchangeRate" IS NOT NULL AND "exchangeRate" > 0 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" IN ('MANUAL', 'IMPORT')))));
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_fx_context_valid" CHECK ((UPPER("currency") = UPPER("baseCurrency") AND "exchangeRate" IS NOT NULL AND "exchangeRate" = 1 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" = 'SYSTEM_RATE_1' AND "rateSnapshotId" IS NULL) OR (UPPER("currency") <> UPPER("baseCurrency") AND (("status"::text = 'DRAFT' AND "exchangeRate" IS NULL AND "rateDate" IS NULL AND "rateSource" IS NULL AND "rateSnapshotId" IS NULL) OR ("exchangeRate" IS NOT NULL AND "exchangeRate" > 0 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" IN ('MANUAL', 'IMPORT')))));
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_fx_context_valid" CHECK ((UPPER("currency") = UPPER("baseCurrency") AND "exchangeRate" IS NOT NULL AND "exchangeRate" = 1 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" = 'SYSTEM_RATE_1' AND "rateSnapshotId" IS NULL) OR (UPPER("currency") <> UPPER("baseCurrency") AND (("status"::text = 'DRAFT' AND "exchangeRate" IS NULL AND "rateDate" IS NULL AND "rateSource" IS NULL AND "rateSnapshotId" IS NULL) OR ("exchangeRate" IS NOT NULL AND "exchangeRate" > 0 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" IN ('MANUAL', 'IMPORT')))));
ALTER TABLE "PurchaseDebitNote" ADD CONSTRAINT "PurchaseDebitNote_fx_context_valid" CHECK ((UPPER("currency") = UPPER("baseCurrency") AND "exchangeRate" IS NOT NULL AND "exchangeRate" = 1 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" = 'SYSTEM_RATE_1' AND "rateSnapshotId" IS NULL) OR (UPPER("currency") <> UPPER("baseCurrency") AND (("status"::text = 'DRAFT' AND "exchangeRate" IS NULL AND "rateDate" IS NULL AND "rateSource" IS NULL AND "rateSnapshotId" IS NULL) OR ("exchangeRate" IS NOT NULL AND "exchangeRate" > 0 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" IN ('MANUAL', 'IMPORT')))));
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_fx_context_valid" CHECK ((UPPER("currency") = UPPER("baseCurrency") AND "exchangeRate" IS NOT NULL AND "exchangeRate" = 1 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" = 'SYSTEM_RATE_1' AND "rateSnapshotId" IS NULL) OR (UPPER("currency") <> UPPER("baseCurrency") AND (("status"::text = 'DRAFT' AND "exchangeRate" IS NULL AND "rateDate" IS NULL AND "rateSource" IS NULL AND "rateSnapshotId" IS NULL) OR ("exchangeRate" IS NOT NULL AND "exchangeRate" > 0 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" IN ('MANUAL', 'IMPORT')))));
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_fx_context_valid" CHECK ((UPPER("currency") = UPPER("baseCurrency") AND "exchangeRate" IS NOT NULL AND "exchangeRate" = 1 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" = 'SYSTEM_RATE_1' AND "rateSnapshotId" IS NULL) OR (UPPER("currency") <> UPPER("baseCurrency") AND (("status"::text = 'DRAFT' AND "exchangeRate" IS NULL AND "rateDate" IS NULL AND "rateSource" IS NULL AND "rateSnapshotId" IS NULL) OR ("exchangeRate" IS NOT NULL AND "exchangeRate" > 0 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" IN ('MANUAL', 'IMPORT')))));
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_fx_context_valid" CHECK ((UPPER("currency") = UPPER("baseCurrency") AND "exchangeRate" IS NOT NULL AND "exchangeRate" = 1 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" = 'SYSTEM_RATE_1' AND "rateSnapshotId" IS NULL) OR (UPPER("currency") <> UPPER("baseCurrency") AND (("status"::text = 'DRAFT' AND "exchangeRate" IS NULL AND "rateDate" IS NULL AND "rateSource" IS NULL AND "rateSnapshotId" IS NULL) OR ("exchangeRate" IS NOT NULL AND "exchangeRate" > 0 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" IN ('MANUAL', 'IMPORT')))));
ALTER TABLE "CustomerRefund" ADD CONSTRAINT "CustomerRefund_fx_context_valid" CHECK ((UPPER("currency") = UPPER("baseCurrency") AND "exchangeRate" IS NOT NULL AND "exchangeRate" = 1 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" = 'SYSTEM_RATE_1' AND "rateSnapshotId" IS NULL) OR (UPPER("currency") <> UPPER("baseCurrency") AND (("status"::text = 'DRAFT' AND "exchangeRate" IS NULL AND "rateDate" IS NULL AND "rateSource" IS NULL AND "rateSnapshotId" IS NULL) OR ("exchangeRate" IS NOT NULL AND "exchangeRate" > 0 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" IN ('MANUAL', 'IMPORT')))));
ALTER TABLE "SupplierRefund" ADD CONSTRAINT "SupplierRefund_fx_context_valid" CHECK ((UPPER("currency") = UPPER("baseCurrency") AND "exchangeRate" IS NOT NULL AND "exchangeRate" = 1 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" = 'SYSTEM_RATE_1' AND "rateSnapshotId" IS NULL) OR (UPPER("currency") <> UPPER("baseCurrency") AND (("status"::text = 'DRAFT' AND "exchangeRate" IS NULL AND "rateDate" IS NULL AND "rateSource" IS NULL AND "rateSnapshotId" IS NULL) OR ("exchangeRate" IS NOT NULL AND "exchangeRate" > 0 AND "rateDate" IS NOT NULL AND "rateSource" IS NOT NULL AND "rateSource" IN ('MANUAL', 'IMPORT')))));

CREATE FUNCTION "prevent_used_rate_snapshot_update"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "SalesInvoice" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "CreditNote" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "PurchaseBill" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "PurchaseDebitNote" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "CashExpense" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "CustomerPayment" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "SupplierPayment" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "CustomerRefund" WHERE "rateSnapshotId" = OLD."id")
    OR EXISTS (SELECT 1 FROM "SupplierRefund" WHERE "rateSnapshotId" = OLD."id") THEN
    RAISE EXCEPTION 'Referenced FX rate snapshots are immutable.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CurrencyRateSnapshot_prevent_used_update" BEFORE UPDATE OF "transactionCurrency", "baseCurrency", "rate", "rateDate", "source", "sourceReference" ON "CurrencyRateSnapshot" FOR EACH ROW EXECUTE FUNCTION "prevent_used_rate_snapshot_update"();
