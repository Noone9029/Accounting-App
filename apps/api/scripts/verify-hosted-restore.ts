/** Read-only comparison AFTER a separately performed provider restore.
 * No backup, restoration, migration, fixture, or cleanup is executed here.
 * Source must be quiesced; use an isolated synthetic hosted proof first.
 * This compares selected legacy core tables only. It cannot establish the
 * complete launch databaseRestore gate: inventory, billing, session and other
 * application state require separate restored-fixture verification.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { getRestoreVerificationChecks } from "../src/disaster-recovery/local-postgres-drill";
const { readRecoveryTargets } = require("../../../infra/deployment/recovery-guards.cjs") as {
  readRecoveryTargets: (env: NodeJS.ProcessEnv) => { source: string; target: string };
};

const tables = ["Organization", "OrganizationMember", "Account", "JournalEntry", "JournalLine", "SalesInvoice", "SalesInvoiceLine", "PurchaseBill", "GeneratedDocument", "EmailOutbox", "FixedAsset", "RecurringTransactionTemplate", "RecurringTransactionRun", "AuditLog"] as const;
type Snapshot = { rows: Record<string, { count: string; fingerprint: string }>; migrations: string[]; invariantsPassed: boolean };

async function snapshot(client: PrismaClient): Promise<Snapshot> {
  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '15000'");
    await tx.$executeRawUnsafe("SET LOCAL timezone = 'UTC'");
    const rows: Snapshot["rows"] = {};
    for (const table of tables) {
      // Bounded synthetic proof: refuse large datasets rather than scan a
      // production-sized ledger. Raw columns stay inside PostgreSQL; only a
      // fingerprint/count crosses the connection and neither is logged.
      const result = await tx.$queryRawUnsafe<Array<{ count: bigint; fingerprint: string }>>(
        `SELECT COUNT(*) AS count, md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY id), '')) AS fingerprint FROM (SELECT * FROM "${table}" ORDER BY id LIMIT 10001) t`,
      );
      const item = result[0];
      if (!item || item.count > 10_000n) throw new Error("Recovery proof exceeds its bounded synthetic scope.");
      rows[table] = { count: String(item.count), fingerprint: item.fingerprint };
    }
    if (rows.Organization?.count === "0" || rows.JournalLine?.count === "0") throw new Error("Empty or inaccessible fixture cannot establish recovery.");
    const migrations = await tx.$queryRaw<Array<{ migration_name: string }>>`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`;
    // Reuse the established drill's generic relational invariant. Its other
    // checks assume exact LOCAL fixture amounts/counts and must not be reused.
    const invariant = getRestoreVerificationChecks().find((item) => item.id === "tenant-scope-no-cross-org-journal-lines");
    if (!invariant) throw new Error("Recovery invariant definition is missing.");
    const check = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(invariant.sql);
    return { rows, migrations: migrations.map((item) => item.migration_name), invariantsPassed: Object.values(check[0] ?? {})[0] === true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, maxWait: 10_000, timeout: 90_000 });
}

async function main(): Promise<void> {
  if (!process.argv.includes("--execute-read-only")) {
    console.log(JSON.stringify({ status: "PLAN_ONLY", comparisonScope: "SELECTED_CORE_TABLES_ONLY", completeDatabaseRecoveryProven: false, hostedConnections: false, mutationEnabled: false,
      instructions: "Restore a synthetic hosted database into a separate target, quiesce the source, then supply process-scoped source/restore URLs and exact reviewed hosts. Use --execute-read-only to compare." }));
    return;
  }
  const { source, target } = readRecoveryTargets(process.env);
  const sourceClient = new PrismaClient({ datasources: { db: { url: source } } });
  const targetClient = new PrismaClient({ datasources: { db: { url: target } } });
  try {
    const original = await snapshot(sourceClient);
    const restored = await snapshot(targetClient);
    const checks = tables.map((table) => ({ table, passed: JSON.stringify(original.rows[table]) === JSON.stringify(restored.rows[table]) }));
    const migrationsMatch = original.migrations.length > 0 && JSON.stringify(original.migrations) === JSON.stringify(restored.migrations);
    const passed = checks.every((check) => check.passed) && migrationsMatch && original.invariantsPassed && restored.invariantsPassed;
    console.log(JSON.stringify({ status: passed ? "SELECTED_TABLES_MATCHED" : "RESTORE_MISMATCH", checks,
      comparisonScope: "SELECTED_CORE_TABLES_ONLY", completeDatabaseRecoveryProven: false,
      migrationsMatch, relationalInvariantsPassed: original.invariantsPassed && restored.invariantsPassed,
      mutationExecuted: false, objectBodiesVerified: false, productionRecoveryProven: false }));
    process.exitCode = passed ? 0 : 1;
  } finally { await sourceClient.$disconnect(); await targetClient.$disconnect(); }
}
void main().catch(() => { console.error("Restore verification failed; inspect target configuration and redacted database diagnostics. No restore or cleanup was executed."); process.exitCode = 1; });
