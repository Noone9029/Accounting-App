import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = readFileSync(resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
const migrationPath = resolve(
  __dirname,
  "../../prisma/migrations/20260711160000_add_fx_revaluation_runs/migration.sql",
);

function modelBlock(name: string): string {
  return schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? "";
}

describe("period-end FX revaluation persistence", () => {
  it("stores tenant-scoped run lifecycle and idempotency evidence", () => {
    const block = modelBlock("FxRevaluationRun");
    expect(block).toMatch(/organizationId\s+String\s+@db\.Uuid/);
    expect(block).toMatch(/status\s+FxRevaluationStatus\s+@default\(DRAFT\)/);
    expect(block).toMatch(/revaluationDate\s+DateTime\s+@db\.Date/);
    expect(block).toMatch(/requestedByUserId\s+String\s+@db\.Uuid/);
    expect(block).toMatch(/reviewedByUserId\s+String\?\s+@db\.Uuid/);
    expect(block).toMatch(/postedJournalEntryId\s+String\?\s+@db\.Uuid/);
    expect(block).toMatch(/reversalJournalEntryId\s+String\?\s+@db\.Uuid/);
    expect(block).toMatch(/idempotencyKey\s+String/);
    expect(block).toMatch(/requestHash\s+String/);
    expect(block).toMatch(/activeScopeKey\s+String\?/);
    expect(block).toContain("@@unique([organizationId, idempotencyKey])");
    expect(block).toContain("@@unique([organizationId, activeScopeKey])");
    expect(block).toContain('map: "FxRevaluationRun_org_posted_journal_fkey"');
    expect(block).toContain('map: "FxRevaluationRun_org_reversal_journal_fkey"');
  });

  it("freezes source, carrying, rate, and gain/loss evidence per line", () => {
    const block = modelBlock("FxRevaluationLine");
    for (const field of [
      "openTransactionAmount",
      "sourceBaseOpenAmount",
      "carryingBaseAmount",
      "revaluedBaseAmount",
      "unrealizedGainAmount",
      "unrealizedLossAmount",
    ]) {
      expect(block).toMatch(new RegExp(`${field}\\s+Decimal\\s+@db\\.Decimal\\(20, 4\\)`));
    }
    expect(block).toMatch(/closingRate\s+Decimal\s+@db\.Decimal\(18, 8\)/);
    expect(block).toMatch(/rateSnapshotId\s+String\s+@db\.Uuid/);
    expect(block).toMatch(/salesInvoiceId\s+String\?\s+@db\.Uuid/);
    expect(block).toMatch(/purchaseBillId\s+String\?\s+@db\.Uuid/);
    expect(block).toContain('map: "FxRevaluationLine_org_run_fkey"');
    expect(block).toContain('map: "FxRevaluationLine_org_rate_snapshot_fkey"');
  });

  it("keeps adjusted carrying state separate from immutable source documents", () => {
    const block = modelBlock("FxMonetaryBalance");
    expect(block).toMatch(/openTransactionAmount\s+Decimal\s+@db\.Decimal\(20, 4\)/);
    expect(block).toMatch(/sourceBaseOpenAmount\s+Decimal\s+@db\.Decimal\(20, 4\)/);
    expect(block).toMatch(/carryingBaseAmount\s+Decimal\s+@db\.Decimal\(20, 4\)/);
    expect(block).toMatch(/lastRevaluationLineId\s+String\s+@db\.Uuid/);
    expect(block).toContain("@@unique([organizationId, salesInvoiceId])");
    expect(block).toContain("@@unique([organizationId, purchaseBillId])");
    expect(block).toContain('map: "FxMonetaryBalance_org_last_line_fkey"');
  });

  it.each([
    "CustomerPaymentAllocation",
    "CustomerPaymentUnappliedAllocation",
    "SupplierPaymentAllocation",
    "SupplierPaymentUnappliedAllocation",
  ])("stores source and adjusted carrying settlement evidence on %s", (model) => {
    const block = modelBlock(model);
    expect(block).toMatch(/sourceBaseAmountApplied\s+Decimal\s+@default\(0\) @db\.Decimal\(20, 4\)/);
    expect(block).toMatch(/carryingRate\s+Decimal\s+@default\(1\) @db\.Decimal\(18, 8\)/);
    expect(block).toMatch(/carryingRateSnapshotId\s+String\?\s+@db\.Uuid/);
    expect(block).toMatch(/carryingRevaluationLineId\s+String\?\s+@db\.Uuid/);
    expect(block).toMatch(/@@index\(\[organizationId, carryingRateSnapshotId\], map: "[^"]+"\)/);
    expect(block).toMatch(/@@index\(\[organizationId, carryingRevaluationLineId\], map: "[^"]+"\)/);
  });

  it("uses an additive transactional migration with tenant and monetary-state checks", () => {
    const migration = readFileSync(migrationPath, "utf8");
    expect(migration.trimStart().startsWith("BEGIN;")).toBe(true);
    expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(migration).toContain('CREATE TABLE "FxRevaluationRun"');
    expect(migration).toContain('CREATE TABLE "FxRevaluationLine"');
    expect(migration).toContain('CREATE TABLE "FxMonetaryBalance"');
    expect(migration).toContain('"FxRevaluationLine_source_exactly_one"');
    expect(migration).toContain('"FxMonetaryBalance_source_exactly_one"');
    expect(migration).toContain('"FxRevaluationLine_org_invoice_fkey"');
    expect(migration).toContain('"FxRevaluationLine_org_bill_fkey"');
    expect(migration).toContain('"cpa_org_carrying_revaluation_line_fkey"');
    expect(migration).toContain('"cpua_org_carrying_revaluation_line_fkey"');
    expect(migration).toContain('"spa_org_carrying_revaluation_line_fkey"');
    expect(migration).toContain('"spua_org_carrying_revaluation_line_fkey"');
    expect(migration).not.toMatch(/UPDATE\s+"(?:SalesInvoice|PurchaseBill)"\s+SET\s+"(?:balanceDue|transactionBalanceDue)"/i);
  });
});
