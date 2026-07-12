import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = readFileSync(resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
const migrationPath = resolve(
  __dirname,
  "../../prisma/migrations/20260712110000_generalize_recurring_transactions/migration.sql",
);
const migration = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";

function modelBlock(source: string, name: string): string {
  return source.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? "";
}

function enumBlock(source: string, name: string): string {
  return source.match(new RegExp(`enum ${name} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? "";
}

describe("generalized recurring transaction schema", () => {
  it.each([
    ["RecurringTransactionType", ["SALES_INVOICE", "PURCHASE_BILL", "EXPENSE", "MANUAL_JOURNAL"]],
    ["RecurringTransactionStatus", ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]],
    ["RecurringFrequency", ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]],
    ["RecurringCatchUpPolicy", ["SKIP_MISSED", "GENERATE_LATEST_ONLY", "GENERATE_ALL"]],
    ["RecurringExchangeRatePolicy", ["BASE_CURRENCY_ONLY", "FIXED_TEMPLATE_RATE", "REQUIRE_RATE_AT_RUN", "RATE_SNAPSHOT"]],
    ["RecurringRunStatus", ["PENDING", "CLAIMED", "GENERATED", "BLOCKED", "SKIPPED", "FAILED", "CANCELLED"]],
  ] as const)("defines %s as a closed accounting contract", (name, values) => {
    const block = enumBlock(schema, name);
    for (const value of values) {
      expect(block).toMatch(new RegExp(`\\b${value}\\b`));
    }
  });

  it("stores normalized tenant-scoped template schedule, version, FX, and lifecycle state", () => {
    const block = modelBlock(schema, "RecurringTransactionTemplate");
    for (const field of [
      "organizationId", "transactionType", "templateCode", "name", "status", "timezone", "frequency", "interval",
      "dayOfWeek", "dayOfMonth", "monthOfYear", "startDate", "endDate", "nextRunAt", "lastRunAt", "catchUpPolicy",
      "generationMode", "templateVersion", "currencyCode", "exchangeRatePolicy", "fixedExchangeRate", "rateSnapshotId",
      "createdByUserId", "updatedByUserId", "archivedAt",
    ]) {
      expect(block).toMatch(new RegExp(`\\b${field}\\b`));
    }
    expect(block).toContain("@@unique([organizationId, id])");
    expect(block).toContain("@@unique([organizationId, templateCode])");
    expect(block).toContain("@@index([organizationId, status, nextRunAt])");
    expect(block).toMatch(/rateSnapshot\s+CurrencyRateSnapshot\?\s+@relation\([^\n]*fields: \[organizationId, rateSnapshotId\][^\n]*onDelete: NoAction\)/);
  });

  it("uses normalized ordered accounting lines with dimensions and no opaque primary payload", () => {
    const block = modelBlock(schema, "RecurringTransactionTemplateLine");
    for (const field of ["organizationId", "templateId", "itemId", "accountId", "description", "quantity", "unitPrice", "taxRateId", "discountRate", "debit", "credit", "costCenterId", "projectId", "sortOrder"]) {
      expect(block).toMatch(new RegExp(`\\b${field}\\b`));
    }
    expect(block).not.toMatch(/(?:payload|accountingContract|lineData)\s+Json/);
    expect(block).toContain("@@unique([organizationId, templateId, sortOrder])");
  });

  it("enforces tenant ownership for every reusable accounting reference", () => {
    const template = modelBlock(schema, "RecurringTransactionTemplate");
    expect(template).toMatch(/party\s+Contact\?\s+@relation\([^\n]*fields: \[organizationId, partyId\], references: \[organizationId, id\]/);
    expect(template).toMatch(/branch\s+Branch\?\s+@relation\([^\n]*fields: \[organizationId, branchId\], references: \[organizationId, id\]/);
    expect(template).toMatch(/paidThroughAccount\s+Account\?\s+@relation\([^\n]*fields: \[organizationId, paidThroughAccountId\], references: \[organizationId, id\]/);

    const line = modelBlock(schema, "RecurringTransactionTemplateLine");
    for (const field of ["itemId", "accountId", "taxRateId", "costCenterId", "projectId"]) {
      expect(line).toMatch(new RegExp(`fields: \\[organizationId, ${field}\\], references: \\[organizationId, id\\]`));
    }

    const proposal = modelBlock(schema, "RecurringExpenseProposal");
    for (const field of ["contactId", "branchId", "paidThroughAccountId", "rateSnapshotId", "reviewedCashExpenseId"]) {
      expect(proposal).toMatch(new RegExp(`fields: \\[organizationId, ${field}\\], references: \\[organizationId, id\\]`));
    }
  });

  it("preserves durable run history with occurrence and manual-idempotency barriers", () => {
    const block = modelBlock(schema, "RecurringTransactionRun");
    for (const field of ["templateVersion", "scheduledFor", "scheduledLocalDate", "startedAt", "completedAt", "status", "attemptCount", "idempotencyKey", "workerClaimId", "failureCode", "failureMessageSafe", "requestId", "sourceSnapshot"]) {
      expect(block).toMatch(new RegExp(`\\b${field}\\b`));
    }
    expect(block).toContain("@@unique([organizationId, templateId, scheduledFor])");
    expect(block).toContain("@@unique([organizationId, idempotencyKey])");
    expect(block).toMatch(/template\s+RecurringTransactionTemplate\s+@relation\([^\n]*onDelete: NoAction\)/);
    expect(block).toMatch(/generatedSalesInvoiceId\s+String\?\s+@unique/);
    expect(block).toMatch(/generatedPurchaseBillId\s+String\?\s+@unique/);
    expect(block).toMatch(/generatedJournalEntryId\s+String\?\s+@unique/);
    expect(block).toMatch(/generatedExpenseProposalId\s+String\?\s+@unique/);
  });

  it("models recurring expenses as review proposals with normalized lines", () => {
    const proposal = modelBlock(schema, "RecurringExpenseProposal");
    const line = modelBlock(schema, "RecurringExpenseProposalLine");
    expect(proposal).toMatch(/status\s+RecurringExpenseProposalStatus\s+@default\(DRAFT\)/);
    expect(proposal).toMatch(/sourceRun\s+RecurringTransactionRun\?/);
    expect(proposal).toMatch(/paidThroughAccountId\s+String/);
    expect(proposal).toMatch(/reviewedCashExpenseId\s+String\?\s+@unique/);
    expect(line).toMatch(/costCenterId\s+String\?/);
    expect(line).toMatch(/projectId\s+String\?/);
    expect(line).toMatch(/accountId\s+String/);
  });
});

describe("legacy recurring invoice additive migration", () => {
  it("exists and creates generalized tables before attempting backfill", () => {
    expect(migration).not.toBe("");
    expect(migration.indexOf('CREATE TABLE "RecurringTransactionTemplate"')).toBeGreaterThanOrEqual(0);
    expect(migration.indexOf('INSERT INTO "RecurringTransactionTemplate"')).toBeGreaterThan(
      migration.indexOf('CREATE TABLE "RecurringTransactionTemplate"'),
    );
  });

  it("fails before mapping ambiguous legacy schedules instead of fabricating fields", () => {
    expect(migration).toContain("Recurring transaction migration blocked: legacy recurring invoice schedule cannot be mapped deterministically.");
    expect(migration).toContain('FROM "RecurringInvoiceTemplate"');
    expect(migration).toContain('"interval" < 1');
    expect(migration).toContain('legacy."nextRunDate" < legacy."startDate"');
  });

  it("backfills legacy templates, lines, and run history with stable IDs", () => {
    expect(migration).toMatch(/INSERT INTO "RecurringTransactionTemplate"[\s\S]*SELECT\s+legacy\."id"/);
    expect(migration).toMatch(/INSERT INTO "RecurringTransactionTemplateLine"[\s\S]*SELECT\s+line\."id"/);
    expect(migration).toMatch(/INSERT INTO "RecurringTransactionRun"[\s\S]*SELECT\s+run\."id"/);
    expect(migration).toContain("'SALES_INVOICE'::\"RecurringTransactionType\"");
    expect(migration).toContain("'BASE_CURRENCY_ONLY'::\"RecurringExchangeRatePolicy\"");
  });

  it("retains legacy tables and does not rewrite generated accounting records", () => {
    expect(migration).not.toMatch(/DROP TABLE\s+"RecurringInvoice(?:Template|TemplateLine|Run)"/i);
    expect(migration).not.toMatch(/UPDATE\s+"(?:SalesInvoice|JournalEntry|PurchaseBill|CashExpense)"/i);
    expect(migration).not.toMatch(/DELETE FROM\s+"RecurringInvoice/i);
  });

  it("uses restrictive evidence foreign keys and tenant occurrence indexes", () => {
    expect(migration).toContain('REFERENCES "RecurringTransactionTemplate"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE');
    expect(migration).toContain('CREATE UNIQUE INDEX "RecurringTransactionRun_organizationId_templateId_scheduledFor_key"');
    expect(migration).toContain('CREATE UNIQUE INDEX "RecurringTransactionRun_organizationId_idempotencyKey_key"');
    expect(migration).toContain('CREATE INDEX "RecurringTransactionTemplate_organizationId_status_nextRunAt_idx"');
    for (const target of ["Contact", "Branch", "Account", "Item", "TaxRate", "CostCenter", "Project"]) {
      expect(migration).toContain(`REFERENCES "${target}"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE`);
    }
  });
});
