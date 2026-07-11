import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = readFileSync(resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  resolve(__dirname, "../../prisma/migrations/20260711110000_add_document_fx_context/migration.sql"),
  "utf8",
);

function modelBlock(name: string): string {
  return schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? "";
}

describe("document FX persistence schema", () => {
  const lineDocuments = [
    ["SalesInvoice", "SalesInvoiceLine"],
    ["CreditNote", "CreditNoteLine"],
    ["PurchaseBill", "PurchaseBillLine"],
    ["PurchaseDebitNote", "PurchaseDebitNoteLine"],
    ["CashExpense", "CashExpenseLine"],
  ] as const;

  it.each(lineDocuments)("stores base, transaction, and frozen rate context on %s", (document, line) => {
    const documentModel = modelBlock(document);
    expect(documentModel).toMatch(/baseCurrency\s+String/);
    expect(documentModel).toMatch(/exchangeRate\s+Decimal\?\s+@db\.Decimal\(18, 8\)/);
    expect(documentModel).toMatch(/rateDate\s+DateTime\?\s+@db\.Date/);
    expect(documentModel).toMatch(/rateSource\s+CurrencyRateSource\?/);
    expect(documentModel).toMatch(/rateSnapshotId\s+String\?\s+@db\.Uuid/);
    for (const field of ["Subtotal", "DiscountTotal", "TaxableTotal", "TaxTotal", "Total"]) {
      expect(documentModel).toMatch(new RegExp(`transaction${field}\\s+Decimal\\s+@default\\(0\\) @db\\.Decimal\\(20, 4\\)`));
    }
    expect(documentModel).toMatch(
      new RegExp(
        `rateSnapshot\\s+CurrencyRateSnapshot\\?\\s+@relation\\("${document}RateSnapshot", fields: \\[organizationId, rateSnapshotId\\], references: \\[organizationId, id\\], onDelete: NoAction\\)`,
      ),
    );
    expect(documentModel).toContain("@@index([organizationId, rateSnapshotId])");

    const lineModel = modelBlock(line);
    for (const field of ["LineGrossAmount", "DiscountAmount", "TaxableAmount", "TaxAmount", "LineTotal"]) {
      expect(lineModel).toMatch(new RegExp(`transaction${field}\\s+Decimal\\s+@default\\(0\\) @db\\.Decimal\\(20, 4\\)`));
    }
  });

  it.each([
    ["CustomerPayment", "transactionAmountReceived"],
    ["SupplierPayment", "transactionAmountPaid"],
    ["CustomerRefund", "transactionAmountRefunded"],
    ["SupplierRefund", "transactionAmountRefunded"],
  ] as const)("prepares %s for later settlement accounting without enabling it", (document, transactionAmount) => {
    const block = modelBlock(document);
    expect(block).toMatch(/baseCurrency\s+String/);
    expect(block).toMatch(/exchangeRate\s+Decimal\?/);
    expect(block).toMatch(new RegExp(`${transactionAmount}\\s+Decimal`));
    expect(block).toContain("@@index([organizationId, rateSnapshotId])");
  });

  it("backfills existing same-currency records at rate one without inventing rates for old foreign drafts", () => {
    expect(migration).toContain('CASE WHEN UPPER(d."currency") = UPPER(o."baseCurrency") THEN 1 ELSE NULL END');
    expect(migration).toContain("'SYSTEM_RATE_1'::\"CurrencyRateSource\"");
    expect(migration).toContain('"transactionTotal" = d."total"');
    expect(migration).not.toMatch(/UPDATE\s+"(?:SalesInvoice|CreditNote|PurchaseBill|PurchaseDebitNote|CashExpense)"\s+SET\s+"currency"/i);
  });

  it("stops with a descriptive preflight error before touching historical foreign records", () => {
    expect(migration).toContain('DO $$');
    expect(migration).toContain('Document FX migration blocked: historical non-draft foreign records require reviewed treatment.');
    for (const document of [
      "SalesInvoice", "CreditNote", "PurchaseBill", "PurchaseDebitNote", "CashExpense",
      "CustomerPayment", "SupplierPayment", "CustomerRefund", "SupplierRefund",
    ]) {
      expect(migration).toContain(`FROM "${document}" d JOIN "Organization" o ON o."id" = d."organizationId"`);
    }
  });

  it.each(lineDocuments)("adds %s baseCurrency before relying on its compatibility default", (document) => {
    expect(migration).toContain(`ALTER TABLE "${document}"\n  ADD COLUMN "baseCurrency" TEXT DEFAULT 'SAR'`);
    expect(migration).not.toContain(`ALTER TABLE "${document}"\n  ALTER COLUMN "baseCurrency" SET DEFAULT 'SAR'`);
  });

  it("keeps PostgreSQL defaults aligned with Prisma for every additive transaction amount", () => {
    const defaults = [
      ...lineDocuments.flatMap(([document, line]) => [
        ...["transactionSubtotal", "transactionDiscountTotal", "transactionTaxableTotal", "transactionTaxTotal", "transactionTotal"].map((field) => [document, field]),
        ...["transactionLineGrossAmount", "transactionDiscountAmount", "transactionTaxableAmount", "transactionTaxAmount", "transactionLineTotal"].map((field) => [line, field]),
      ]),
      ["CustomerPayment", "transactionAmountReceived"],
      ["SupplierPayment", "transactionAmountPaid"],
      ["CustomerRefund", "transactionAmountRefunded"],
      ["SupplierRefund", "transactionAmountRefunded"],
    ];
    for (const [model, field] of defaults) {
      expect(migration).toContain(`ALTER TABLE "${model}" ALTER COLUMN "${field}" SET DEFAULT 0;`);
    }
  });

  it("enforces tenant ownership for every referenced rate snapshot", () => {
    expect(modelBlock("CurrencyRateSnapshot")).toContain("@@unique([organizationId, id])");
    for (const [document] of lineDocuments) {
      expect(migration).toContain(
        `ALTER TABLE "${document}" ADD CONSTRAINT "${document}_organizationId_rateSnapshotId_fkey" FOREIGN KEY ("organizationId", "rateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE`,
      );
    }
    for (const document of ["CustomerPayment", "SupplierPayment", "CustomerRefund", "SupplierRefund"]) {
      expect(migration).toContain(
        `ALTER TABLE "${document}" ADD CONSTRAINT "${document}_organizationId_rateSnapshotId_fkey" FOREIGN KEY ("organizationId", "rateSnapshotId") REFERENCES "CurrencyRateSnapshot"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE`,
      );
    }
  });

  it("derives the real tenant base currency in PostgreSQL and freezes posted FX context", () => {
    expect(migration).toContain('CREATE FUNCTION "derive_document_base_currency"()');
    expect(migration).toContain('FROM "Organization" WHERE "id" = NEW."organizationId"');
    expect(migration).toContain('NEW."baseCurrency" := UPPER(BTRIM(organization_base_currency))');
    expect(migration).toContain('CREATE FUNCTION "freeze_posted_document_fx_context"()');
    expect(migration).toContain("IF OLD.\"status\"::text <> 'DRAFT'");
    for (const document of [
      "SalesInvoice", "CreditNote", "PurchaseBill", "PurchaseDebitNote", "CashExpense",
      "CustomerPayment", "SupplierPayment", "CustomerRefund", "SupplierRefund",
    ]) {
      expect(migration).toContain(`CREATE TRIGGER "${document}_derive_base_currency"`);
      expect(migration).toContain(`CREATE TRIGGER "${document}_freeze_fx_context"`);
    }
  });

  it("enforces complete rate shapes and immutable referenced snapshots at the database boundary", () => {
    for (const document of [
      "SalesInvoice", "CreditNote", "PurchaseBill", "PurchaseDebitNote", "CashExpense",
      "CustomerPayment", "SupplierPayment", "CustomerRefund", "SupplierRefund",
    ]) {
      expect(migration).toContain(`ALTER TABLE "${document}" ADD CONSTRAINT "${document}_fx_context_valid" CHECK`);
    }
    expect(migration).toContain('"exchangeRate" > 0 AND "rateDate" IS NOT NULL');
    expect(migration).toContain('"exchangeRate" IS NOT NULL AND "exchangeRate" = 1 AND "rateDate" IS NOT NULL');
    expect(migration).toContain('"status"::text = \'DRAFT\' AND "exchangeRate" IS NULL');
    expect(migration).toContain('"rateSource" IN (\'MANUAL\', \'IMPORT\')');
    expect(migration).toContain('CREATE FUNCTION "prevent_used_rate_snapshot_update"()');
    expect(migration).toContain('CREATE TRIGGER "CurrencyRateSnapshot_prevent_used_update"');
    expect(migration).toContain("Referenced FX rate snapshots are immutable.");
    expect(migration).toContain('CREATE FUNCTION "validate_document_rate_snapshot_context"()');
    expect(migration).toContain('FX rate snapshot values do not match the document context.');
    for (const document of [
      "SalesInvoice", "CreditNote", "PurchaseBill", "PurchaseDebitNote", "CashExpense",
      "CustomerPayment", "SupplierPayment", "CustomerRefund", "SupplierRefund",
    ]) {
      expect(migration).toContain(`CREATE TRIGGER "${document}_validate_rate_snapshot"`);
    }
  });
});
