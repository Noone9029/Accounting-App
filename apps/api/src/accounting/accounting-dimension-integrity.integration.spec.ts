import { randomUUID } from "node:crypto";
import { AccountType, DimensionStatus, PrismaClient } from "@prisma/client";

interface DimensionIntegrityDbSettings {
  enabled: boolean;
  databaseUrl?: string;
}

const DB_SETTINGS = resolveDimensionIntegrityDbSettings(process.env);
const describeDimensionIntegrityDb = DB_SETTINGS.enabled ? describe : describe.skip;

describeDimensionIntegrityDb("accounting dimension integrity: Prisma-backed local DB", () => {
  jest.setTimeout(30_000);

  let writer: PrismaClient;
  let catalogWriter: PrismaClient;
  let organizationId: string;
  let accountId: string;
  let journalEntryId: string;
  let costCenterId: string;
  let projectId: string;

  beforeAll(async () => {
    const databaseUrl = DB_SETTINGS.databaseUrl!;
    writer = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    catalogWriter = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await Promise.all([writer.$connect(), catalogWriter.$connect()]);

    organizationId = randomUUID();
    accountId = randomUUID();
    journalEntryId = randomUUID();
    costCenterId = randomUUID();
    projectId = randomUUID();

    await writer.organization.create({ data: { id: organizationId, name: `Dimension integrity ${organizationId}` } });
    await writer.account.create({
      data: { id: accountId, organizationId, code: `DIM-${organizationId.slice(0, 8)}`, name: "Dimension integrity", type: AccountType.ASSET },
    });
    await writer.journalEntry.create({
      data: { id: journalEntryId, organizationId, entryNumber: `JE-${organizationId.slice(0, 8)}`, entryDate: new Date(), description: "Dimension integrity" },
    });
    await writer.costCenter.create({ data: { id: costCenterId, organizationId, code: "CC-LOCK", name: "Locked cost center" } });
    await writer.project.create({ data: { id: projectId, organizationId, code: "PRJ-LOCK", name: "Locked project" } });
  });

  afterAll(async () => {
    if (writer) {
      await writer.journalLine.deleteMany({ where: { organizationId } });
      await writer.organization.deleteMany({ where: { id: organizationId } });
    }
    await Promise.all([writer?.$disconnect(), catalogWriter?.$disconnect()]);
  });

  it("prevents an archive update from committing between active validation and the journal-line write", async () => {
    let releaseLock!: () => void;
    const holdLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    let lockAcquired!: () => void;
    const acquired = new Promise<void>((resolve) => {
      lockAcquired = resolve;
    });

    const journalWrite = writer.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "CostCenter"
        WHERE "organizationId" = ${organizationId}::uuid
          AND "id" = ${costCenterId}::uuid
          AND "status" = 'ACTIVE'::"DimensionStatus"
        FOR UPDATE
      `;
      expect(rows).toEqual([{ id: costCenterId }]);
      lockAcquired();
      await holdLock;
      await tx.journalLine.create({
        data: {
          organizationId,
          journalEntryId,
          accountId,
          costCenterId,
          projectId,
          lineNumber: 1,
          debit: "1.0000",
          credit: "0.0000",
        },
      });
    });

    await acquired;
    await expect(
      catalogWriter.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '250ms'");
        await tx.costCenter.update({ where: { id: costCenterId }, data: { status: DimensionStatus.ARCHIVED } });
      }),
    ).rejects.toThrow();

    releaseLock();
    await journalWrite;
    await catalogWriter.costCenter.update({ where: { id: costCenterId }, data: { status: DimensionStatus.ARCHIVED } });

    await expect(writer.journalLine.findFirst({ where: { journalEntryId } })).resolves.toMatchObject({ costCenterId, projectId });
  });

  it("rejects deletion of either catalog record instead of clearing historical assignments", async () => {
    await expect(catalogWriter.costCenter.delete({ where: { id: costCenterId } })).rejects.toMatchObject({ code: "P2003" });
    await expect(catalogWriter.project.delete({ where: { id: projectId } })).rejects.toMatchObject({ code: "P2003" });
    await expect(writer.journalLine.findFirst({ where: { journalEntryId } })).resolves.toMatchObject({ costCenterId, projectId });
  });
});

function resolveDimensionIntegrityDbSettings(env: NodeJS.ProcessEnv): DimensionIntegrityDbSettings {
  if (env.LEDGERBYTE_ACCOUNTING_DIMENSION_DB_INTEGRATION !== "1") {
    return { enabled: false };
  }

  const databaseUrl = env.LEDGERBYTE_TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_ACCOUNTING_DIMENSION_DB_INTEGRATION=1. Point it at disposable local Postgres.",
    );
  }

  const url = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("Accounting dimension integrity proof requires disposable local Postgres.");
  }
  if (/prod(?:uction)?/i.test(url.pathname)) {
    throw new Error("Accounting dimension integrity proof refuses production-looking database names.");
  }

  return { enabled: true, databaseUrl };
}
