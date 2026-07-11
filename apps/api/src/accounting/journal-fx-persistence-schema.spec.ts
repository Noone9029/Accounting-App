import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = readFileSync(resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  resolve(__dirname, "../../prisma/migrations/20260711130000_add_journal_line_fx_amounts/migration.sql"),
  "utf8",
);

function modelBlock(name: string): string {
  return schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? "";
}

describe("journal line FX persistence", () => {
  it("adds transaction amounts and tenant-owned rate evidence without changing base columns", () => {
    const line = modelBlock("JournalLine");
    expect(line).toMatch(/transactionDebit\s+Decimal\?\s+@db\.Decimal\(20, 4\)/);
    expect(line).toMatch(/transactionCredit\s+Decimal\?\s+@db\.Decimal\(20, 4\)/);
    expect(line).toMatch(/rateSnapshotId\s+String\?\s+@db\.Uuid/);
    expect(line).toMatch(/fxRoundingComponentCount\s+Int\s+@default\(1\)/);
    expect(modelBlock("JournalEntry")).toMatch(/creationTransactionId\s+String\s+@default\(dbgenerated\("pg_current_xact_id\(\)::text"\)\)/);
    expect(line).toMatch(
      /rateSnapshot\s+CurrencyRateSnapshot\?\s+@relation\("JournalLineRateSnapshot", fields: \[organizationId, rateSnapshotId\], references: \[organizationId, id\], onDelete: NoAction\)/,
    );
    expect(line).toContain("@@index([organizationId, rateSnapshotId])");
    expect(modelBlock("CurrencyRateSnapshot")).toMatch(
      /journalLines\s+JournalLine\[\]\s+@relation\("JournalLineRateSnapshot"\)/,
    );
  });

  it("backfills only proven same-currency rate-one lines without rewriting historical journal amounts", () => {
    expect(migration).toContain('UPDATE "JournalLine" journal_line');
    expect(migration).toContain('UPPER(BTRIM(journal_line."currency")) = UPPER(BTRIM(organization."baseCurrency"))');
    expect(migration).toContain('journal_line."exchangeRate" = 1');
    expect(migration).toContain('Journal FX migration blocked: historical posted foreign journal lines require reviewed treatment.');
    const backfill = migration.match(/UPDATE\s+"JournalLine"\s+\w+\s+SET[^;]+;/i)?.[0] ?? "";
    expect(backfill).not.toMatch(/SET\s+"(?:debit|credit)"\s*=/i);
    expect(migration).not.toMatch(/UPDATE\s+"JournalEntry"/i);
  });

  it("enforces tenant snapshot ownership and complete journal currency context", () => {
    expect(migration).toMatch(
      /FOREIGN KEY \("organizationId", "rateSnapshotId"\)\s+REFERENCES "CurrencyRateSnapshot"\("organizationId", "id"\)\s+ON DELETE NO ACTION ON UPDATE CASCADE/,
    );
    expect(migration).toContain('CREATE FUNCTION "validate_journal_line_fx_context"()');
    expect(migration).toContain("Journal line FX context is incomplete or inconsistent.");
    expect(migration).toContain("FX rate snapshot values do not match the journal line context.");
    expect(migration).toContain('NEW."transactionDebit" := NEW."debit"');
    expect(migration).toContain('NEW."transactionCredit" := NEW."credit"');
    expect(migration).toContain('CREATE TRIGGER "JournalLine_validate_fx_context"');
    expect(migration).toContain('CREATE CONSTRAINT TRIGGER "JournalLine_validate_fx_totals"');
    expect(migration).toContain('Journal FX base amounts do not match transaction amounts at the captured rate.');
    expect(migration).toContain('SUM(CASE WHEN journal_line."debit" > 0 THEN journal_line."fxRoundingComponentCount" ELSE 0 END) * 0.0001');
  });

  it("keeps posted lines immutable and extends snapshot immutability to journal use", () => {
    expect(migration).toContain('CREATE FUNCTION "freeze_posted_journal_line"()');
    expect(migration).toContain("Posted journal lines are immutable; use a reversal.");
    expect(migration).toContain('CREATE TRIGGER "JournalLine_freeze_posted"');
    expect(migration).toContain('BEFORE INSERT OR UPDATE OR DELETE ON "JournalLine"');
    expect(migration).toContain('parent_creation_transaction_id <> pg_current_xact_id()::text');
    expect(migration).toContain('Journal entry creation provenance is immutable.');
    expect(migration).toContain('EXISTS (SELECT 1 FROM "JournalLine" WHERE "rateSnapshotId" = OLD."id")');
  });

  it.each([
    "sales-invoices/sales-invoice.service.ts",
    "purchase-bills/purchase-bill.service.ts",
    "credit-notes/credit-note.service.ts",
    "purchase-debit-notes/purchase-debit-note.service.ts",
    "cash-expenses/cash-expense.service.ts",
  ])("preserves tax-rate evidence when %s persists reversal lines", (relativePath) => {
    const source = readFileSync(resolve(__dirname, "..", relativePath), "utf8");
    expect(source).toContain('taxRate: line.taxRateId ? { connect: { id: line.taxRateId } } : undefined');
  });
});
