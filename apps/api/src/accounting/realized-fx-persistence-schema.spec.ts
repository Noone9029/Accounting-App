import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = readFileSync(resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  resolve(__dirname, "../../prisma/migrations/20260711140000_add_realized_fx_settlement_evidence/migration.sql"),
  "utf8",
);

function modelBlock(name: string): string {
  return schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? "";
}

describe("realized FX settlement persistence", () => {
  it("marks functional-currency-only FX adjustment journal lines explicitly", () => {
    expect(modelBlock("JournalLine")).toMatch(/functionalCurrencyOnly\s+Boolean\s+@default\(false\)/);
    expect(migration).toContain('ADD COLUMN "functionalCurrencyOnly" BOOLEAN NOT NULL DEFAULT false');
    expect(migration).toContain('IF NEW."functionalCurrencyOnly" THEN');
    expect(migration).toContain('AND NOT journal_line."functionalCurrencyOnly"');
  });

  it.each(["SalesInvoice", "PurchaseBill"])("stores transaction open balance on %s", (model) => {
    expect(modelBlock(model)).toMatch(/transactionBalanceDue\s+Decimal\s+@default\(0\) @db\.Decimal\(20, 4\)/);
  });

  it.each(["CustomerPayment", "SupplierPayment"])("stores transaction unapplied balance and idempotency on %s", (model) => {
    const block = modelBlock(model);
    expect(block).toMatch(/transactionUnappliedAmount\s+Decimal\s+@default\(0\) @db\.Decimal\(20, 4\)/);
    expect(block).toMatch(/idempotencyKey\s+String\?/);
    expect(block).toContain("@@unique([organizationId, idempotencyKey])");
  });

  it.each([
    "CustomerPaymentAllocation",
    "CustomerPaymentUnappliedAllocation",
    "SupplierPaymentAllocation",
    "SupplierPaymentUnappliedAllocation",
  ])("freezes reproducible settlement evidence on %s", (model) => {
    const block = modelBlock(model);
    for (const field of [
      "transactionAmountApplied",
      "documentBaseAmountApplied",
      "settlementBaseAmountApplied",
      "realizedGainAmount",
      "realizedLossAmount",
    ]) {
      expect(block).toMatch(new RegExp(`${field}\\s+Decimal\\s+@default\\(0\\) @db\\.Decimal\\(20, 4\\)`));
    }
    expect(block).toMatch(/recognitionRate\s+Decimal\s+@default\(1\) @db\.Decimal\(18, 8\)/);
    expect(block).toMatch(/settlementRate\s+Decimal\s+@default\(1\) @db\.Decimal\(18, 8\)/);
    expect(block).toMatch(/realizedFxJournalEntryId\s+String\?\s+@db\.Uuid/);
  });

  it.each(["CustomerPaymentUnappliedAllocation", "SupplierPaymentUnappliedAllocation"])(
    "stores reversible and idempotent adjustment evidence on %s",
    (model) => {
      const block = modelBlock(model);
      expect(block).toMatch(/realizedFxReversalJournalEntryId\s+String\?\s+@db\.Uuid/);
      expect(block).toMatch(/idempotencyKey\s+String\?/);
      expect(block).toMatch(/reversalIdempotencyKey\s+String\?/);
    },
  );

  it("backfills only provable compatibility states and stops on historical foreign settlements", () => {
    expect(migration.trimStart().startsWith("BEGIN;")).toBe(true);
    expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(migration).toContain("Realized FX migration blocked: historical foreign settlements require reviewed treatment.");
    expect(migration).toContain('UPPER(BTRIM(document."currency")) = UPPER(BTRIM(document."baseCurrency"))');
    expect(migration).toContain('"transactionBalanceDue" = document."balanceDue"');
    expect(migration).not.toMatch(/UPDATE\s+"(?:SalesInvoice|PurchaseBill)"\s+SET\s+"balanceDue"/i);
    expect(migration).not.toMatch(/UPDATE\s+"(?:CustomerPayment|SupplierPayment)"\s+SET\s+"(?:amountReceived|amountPaid|unappliedAmount)"/i);
  });

  it("enforces tenant ownership for allocation sources and FX journals", () => {
    expect(modelBlock("JournalEntry")).toContain("@@unique([organizationId, id])");
    for (const [table, constraint] of [
      ["CustomerPaymentAllocation", "cpa_org_realized_fx_journal_fkey"],
      ["CustomerPaymentUnappliedAllocation", "cpua_org_realized_fx_journal_fkey"],
      ["SupplierPaymentAllocation", "spa_org_realized_fx_journal_fkey"],
      ["SupplierPaymentUnappliedAllocation", "spua_org_realized_fx_journal_fkey"],
    ] as const) {
      expect(migration).toContain(`ALTER TABLE "${table}"`);
      expect(migration).toContain(`"${constraint}"`);
    }
  });
});
