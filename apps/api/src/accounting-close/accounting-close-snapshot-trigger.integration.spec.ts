import { AccountingCloseCycleStatus, AccountingCloseSnapshotStatus, FiscalPeriodStatus, Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type SnapshotTriggerDbSettings =
  | { enabled: false; databaseUrl?: undefined }
  | { enabled: true; databaseUrl: string };
type SnapshotTriggerClient = PrismaClient | Prisma.TransactionClient;

const DB_INTEGRATION_SETTINGS = resolveSnapshotTriggerDbSettings(process.env);
const DATABASE_URL = DB_INTEGRATION_SETTINGS.enabled ? DB_INTEGRATION_SETTINGS.databaseUrl : undefined;
const describeSnapshotTriggerDb = DB_INTEGRATION_SETTINGS.enabled ? describe : describe.skip;
const MIGRATION_PATH = resolve(__dirname, "../../prisma/migrations/20260713100000_allow_reviewed_close_snapshot_status/migration.sql");

describe("accounting close snapshot trigger DB URL gate", () => {
  it("skips safely unless the explicit local-only integration flag is set", () => {
    expect(resolveSnapshotTriggerDbSettings({} as NodeJS.ProcessEnv)).toEqual({ enabled: false });
  });

  it("requires an explicitly disposable local Postgres URL when enabled", () => {
    expect(() => resolveSnapshotTriggerDbSettings({
      LEDGERBYTE_ACCOUNTING_CLOSE_SNAPSHOT_TRIGGER_DB_INTEGRATION: "1",
      LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@db.example.com/ledgerbyte_snapshot_trigger_test?schema=public",
    } as NodeJS.ProcessEnv)).toThrow("local-only");

    expect(() => resolveSnapshotTriggerDbSettings({
      LEDGERBYTE_ACCOUNTING_CLOSE_SNAPSHOT_TRIGGER_DB_INTEGRATION: "1",
      LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/ledgerbyte_dev?schema=public",
    } as NodeJS.ProcessEnv)).toThrow("disposable local database name");

    expect(resolveSnapshotTriggerDbSettings({
      LEDGERBYTE_ACCOUNTING_CLOSE_SNAPSHOT_TRIGGER_DB_INTEGRATION: "1",
      LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/ledgerbyte_snapshot_trigger_test?schema=public",
    } as NodeJS.ProcessEnv)).toEqual({
      enabled: true,
      databaseUrl: "postgresql://accounting:accounting@localhost:5432/ledgerbyte_snapshot_trigger_test?schema=public",
    });
  });
});

describeSnapshotTriggerDb("accounting close snapshot trigger migration: Prisma-backed local DB", () => {
  jest.setTimeout(60_000);

  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.$connect();
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  it("upgrades the strict trigger so only DRAFT to REVIEWED status changes are permitted", async () => {
    const rollback = new Error("ROLLBACK_ACCOUNTING_CLOSE_SNAPSHOT_TRIGGER_PROOF");

    try {
      await prisma.$transaction(async (tx) => {
        const marker = `close-snapshot-trigger-${randomUUID()}`;
        const organizationId = randomUUID();
        const fiscalPeriodId = randomUUID();
        const cycleId = randomUUID();
        await tx.organization.create({ data: { id: organizationId, name: marker } });
        await tx.fiscalPeriod.create({
          data: {
            id: fiscalPeriodId,
            organizationId,
            name: marker,
            startsOn: new Date("2026-06-01T00:00:00.000Z"),
            endsOn: new Date("2026-06-30T23:59:59.999Z"),
            status: FiscalPeriodStatus.OPEN,
          },
        });
        await tx.accountingCloseCycle.create({
          data: { id: cycleId, organizationId, fiscalPeriodId, status: AccountingCloseCycleStatus.IN_PROGRESS },
        });

        await installPreUpgradeStrictSnapshotTrigger(tx);
        const strictSnapshotId = await createDraftSnapshot(tx, organizationId, fiscalPeriodId, cycleId, "strict-before-upgrade");
        await tx.$executeRawUnsafe("SAVEPOINT close_snapshot_strict_before_upgrade");
        let strictError: unknown;
        try {
          await tx.accountingCloseReadinessSnapshot.updateMany({
            where: { id: strictSnapshotId, organizationId, status: AccountingCloseSnapshotStatus.DRAFT },
            data: { status: AccountingCloseSnapshotStatus.REVIEWED },
          });
        } catch (error) {
          strictError = error;
        }
        expect(String(strictError)).toContain("Accounting close readiness snapshots are immutable.");
        await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT close_snapshot_strict_before_upgrade");

        await applySnapshotTriggerMigration(tx);
        await expect(tx.accountingCloseReadinessSnapshot.updateMany({
          where: { id: strictSnapshotId, organizationId, status: AccountingCloseSnapshotStatus.DRAFT },
          data: { status: AccountingCloseSnapshotStatus.REVIEWED },
        })).resolves.toMatchObject({ count: 1 });
        await expect(tx.accountingCloseReadinessSnapshot.findUniqueOrThrow({ where: { id: strictSnapshotId } })).resolves.toMatchObject({
          status: AccountingCloseSnapshotStatus.REVIEWED,
          canonicalHash: "strict-before-upgrade",
          warningCount: 0,
        });

        const mutationSnapshotId = await createDraftSnapshot(tx, organizationId, fiscalPeriodId, cycleId, "reject-other-column-change");
        await tx.$executeRawUnsafe("SAVEPOINT close_snapshot_reject_other_column");
        let mutationError: unknown;
        try {
          await tx.accountingCloseReadinessSnapshot.update({
            where: { id: mutationSnapshotId },
            data: { status: AccountingCloseSnapshotStatus.REVIEWED, warningCount: 1 },
          });
        } catch (error) {
          mutationError = error;
        }
        expect(String(mutationError)).toContain("Accounting close readiness snapshots are immutable.");
        await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT close_snapshot_reject_other_column");

        throw rollback;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      expect(error).toBe(rollback);
    }
  });
});

async function createDraftSnapshot(client: SnapshotTriggerClient, organizationId: string, fiscalPeriodId: string, cycleId: string, canonicalHash: string): Promise<string> {
  const snapshot = await client.accountingCloseReadinessSnapshot.create({
    data: {
      id: randomUUID(),
      organizationId,
      fiscalPeriodId,
      closeCycleId: cycleId,
      status: AccountingCloseSnapshotStatus.DRAFT,
      canonicalHash,
      blockerCount: 0,
      warningCount: 0,
      informationCount: 0,
      checkCount: 0,
      sourceVersion: 1,
    },
  });
  return snapshot.id;
}

async function installPreUpgradeStrictSnapshotTrigger(client: SnapshotTriggerClient): Promise<void> {
  await client.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION "prevent_accounting_close_snapshot_mutation"() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'Accounting close readiness snapshots are immutable.';
    END;
    $$ LANGUAGE plpgsql;
  `);
}

async function applySnapshotTriggerMigration(client: SnapshotTriggerClient): Promise<void> {
  const migrationSql = readFileSync(MIGRATION_PATH, "utf8")
    .replace(/^\s*BEGIN;\s*/, "")
    .replace(/\s*COMMIT;\s*$/, "");
  await client.$executeRawUnsafe(migrationSql);
}

function resolveSnapshotTriggerDbSettings(env: NodeJS.ProcessEnv): SnapshotTriggerDbSettings {
  if (env.LEDGERBYTE_ACCOUNTING_CLOSE_SNAPSHOT_TRIGGER_DB_INTEGRATION !== "1") return { enabled: false };
  const databaseUrl = env.LEDGERBYTE_TEST_DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_ACCOUNTING_CLOSE_SNAPSHOT_TRIGGER_DB_INTEGRATION=1.");
  }
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must be a valid local-only PostgreSQL URL.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must be local-only.");
  }
  const databaseName = url.pathname.replace(/^\//, "");
  if (!/(^|[_-])(test|fixture|tmp|scratch)([_-]|$)/i.test(databaseName) || /prod/i.test(databaseName)) {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must use a disposable local database name.");
  }
  return { enabled: true, databaseUrl };
}
