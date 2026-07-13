import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const schemaPath = resolve(__dirname, "../../prisma/schema.prisma");
const migrationPath = resolve(__dirname, "../../prisma/migrations/20260713073000_add_accounting_close_workspace_foundation/migration.sql");
const taskPolicyMigrationPath = resolve(__dirname, "../../prisma/migrations/20260713080000_add_accounting_close_task_policy_fields/migration.sql");

function modelBlock(name: string) {
  const schema = readFileSync(schemaPath, "utf8");
  const match = schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`, "m"));
  return match?.[0] ?? "";
}

describe("accounting close persistence schema", () => {
  it("defines an additive, tenant-scoped close contract", () => {
    const schema = readFileSync(schemaPath, "utf8");

    for (const name of [
      "AccountingCloseCycleStatus",
      "AccountingCloseTaskSource",
      "AccountingCloseTaskStatus",
      "AccountingCloseSeverity",
      "AccountingCloseSnapshotStatus",
    ]) {
      expect(schema).toContain(`enum ${name} {`);
    }

    for (const name of [
      "AccountingCloseCycle",
      "AccountingCloseTask",
      "AccountingCloseEvidence",
      "AccountingCloseReadinessSnapshot",
      "AccountingCloseReadinessSnapshotItem",
    ]) {
      expect(modelBlock(name)).not.toBe("");
      expect(modelBlock(name)).toContain("organizationId");
      expect(modelBlock(name)).toContain("organization");
    }

    const cycle = modelBlock("AccountingCloseCycle");
    expect(cycle).toContain("fiscalPeriod FiscalPeriod @relation(\"FiscalPeriodAccountingCloseCycles\", fields: [organizationId, fiscalPeriodId], references: [organizationId, id], onDelete: NoAction)");
    expect(cycle).toContain("@@unique([organizationId, fiscalPeriodId])");
    expect(cycle).toContain("@@unique([organizationId, fiscalPeriodId, id])");
    expect(cycle).toContain("@@index([organizationId, status, updatedAt])");
    expect(cycle).toContain("version");

    const fiscalPeriod = modelBlock("FiscalPeriod");
    expect(fiscalPeriod).toContain("closeCycles AccountingCloseCycle[] @relation(\"FiscalPeriodAccountingCloseCycles\")");
    expect(fiscalPeriod).toContain("@@unique([organizationId, id])");

    const evidence = modelBlock("AccountingCloseEvidence");
    expect(evidence).toContain("closeCycle AccountingCloseCycle @relation(fields: [organizationId, closeCycleId], references: [organizationId, id], onDelete: NoAction)");
    expect(evidence).toContain("closeTask AccountingCloseTask? @relation(fields: [organizationId, closeCycleId, closeTaskId], references: [organizationId, closeCycleId, id], onDelete: NoAction)");
    expect(evidence).toContain("safeMetadata Json?");
    expect(evidence).not.toContain("onDelete: Cascade");

    const task = modelBlock("AccountingCloseTask");
    expect(task).toContain("isRequired Boolean @default(true)");
    expect(task).toContain("completionNote String?");

    const snapshot = modelBlock("AccountingCloseReadinessSnapshot");
    expect(snapshot).toContain("closeCycle AccountingCloseCycle @relation(fields: [organizationId, fiscalPeriodId, closeCycleId], references: [organizationId, fiscalPeriodId, id], onDelete: NoAction, map: \"AccountingCloseReadinessSnapshot_org_period_cycle_fkey\")");
    expect(snapshot).toContain("fiscalPeriod FiscalPeriod @relation(\"FiscalPeriodAccountingCloseSnapshots\", fields: [organizationId, fiscalPeriodId], references: [organizationId, id], onDelete: NoAction, map: \"AccountingCloseReadinessSnapshot_org_period_fkey\")");
    expect(snapshot).toContain("@@index([organizationId, fiscalPeriodId, capturedAt])");
  });

  it("uses an additive migration that fails closed against snapshot and evidence mutation", () => {
    expect(existsSync(migrationPath)).toBe(true);
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration.trimStart().startsWith("BEGIN;")).toBe(true);
    expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
    for (const table of [
      "AccountingCloseCycle",
      "AccountingCloseTask",
      "AccountingCloseEvidence",
      "AccountingCloseReadinessSnapshot",
      "AccountingCloseReadinessSnapshotItem",
    ]) {
      expect(migration).toContain(`CREATE TABLE \"${table}\"`);
    }
    expect(migration).toContain('CREATE FUNCTION "prevent_accounting_close_evidence_mutation"()');
    expect(migration).toContain('CREATE FUNCTION "prevent_accounting_close_snapshot_mutation"()');
    expect(migration).toContain('CREATE TRIGGER "AccountingCloseEvidence_immutable"');
    expect(migration).toContain('CREATE TRIGGER "AccountingCloseReadinessSnapshot_immutable"');
    expect(migration).toContain('CREATE TRIGGER "AccountingCloseReadinessSnapshotItem_immutable"');
    expect(migration).toContain('CONSTRAINT "AccountingCloseCycle_org_period_id_key" UNIQUE ("organizationId", "fiscalPeriodId", "id")');
    expect(migration).toContain('CONSTRAINT "AccountingCloseTask_org_cycle_id_key" UNIQUE ("organizationId", "closeCycleId", "id")');
    expect(migration).toContain('CONSTRAINT "AccountingCloseEvidence_org_cycle_task_fkey" FOREIGN KEY ("organizationId", "closeCycleId", "closeTaskId") REFERENCES "AccountingCloseTask"("organizationId", "closeCycleId", "id")');
    expect(migration).toContain('CONSTRAINT "AccountingCloseReadinessSnapshot_org_period_cycle_fkey" FOREIGN KEY ("organizationId", "fiscalPeriodId", "closeCycleId") REFERENCES "AccountingCloseCycle"("organizationId", "fiscalPeriodId", "id")');
    expect(migration).not.toMatch(/UPDATE\s+"FiscalPeriod"/i);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+"(?:FiscalPeriod|JournalEntry|SalesInvoice|PurchaseBill)"/i);
  });

  it("adds required-task policy fields without rewriting existing close data", () => {
    expect(existsSync(taskPolicyMigrationPath)).toBe(true);
    const migration = readFileSync(taskPolicyMigrationPath, "utf8");

    expect(migration.trimStart().startsWith("BEGIN;")).toBe(true);
    expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(migration).toContain('ADD COLUMN "isRequired" BOOLEAN NOT NULL DEFAULT true');
    expect(migration).toContain('ADD COLUMN "completionNote" TEXT');
    expect(migration).not.toMatch(/UPDATE\s+"AccountingCloseTask"/i);
  });
});
