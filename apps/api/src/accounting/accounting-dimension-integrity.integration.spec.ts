import { randomUUID } from "node:crypto";
import { AccountType, DimensionStatus, PrismaClient } from "@prisma/client";

const DIMENSION_INTEGRITY_FIXTURE_PREFIX = "DIMENSION-INTEGRITY-DISPOSABLE-TEST:";
const DISPOSABLE_TARGET_CLASSIFICATION = "LOCAL_DISPOSABLE_TEST_DATABASE" as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRODUCTION_LIKE_TARGET_PATTERN = /(prod|production|stage|staging|beta|hosted|preview|live)/i;

interface DimensionIntegrityDbSettings {
  enabled: boolean;
  databaseUrl?: string;
  databaseName?: string;
  safetyClassification?: typeof DISPOSABLE_TARGET_CLASSIFICATION;
}

interface DimensionIntegrityFixtureIds {
  runId: string;
  organizationId: string;
  accountId: string;
  journalEntryId: string;
  costCenterId: string;
  projectId: string;
  marker: string;
}

interface DimensionIntegrityCleanupScope {
  journalLine: {
    organizationId: string;
    journalEntryId: string;
    accountId: string;
    costCenterId: string;
    projectId: string;
  };
  organization: { id: string; name: string };
}

const DB_SETTINGS = resolveDimensionIntegrityDbSettings(process.env);
const describeDimensionIntegrityDb = DB_SETTINGS.enabled ? describe : describe.skip;
const requiredFixtureUuidFields = ["runId", "organizationId", "accountId", "journalEntryId", "costCenterId", "projectId"] as const;

describe("accounting dimension integration safety guard", () => {
  it("preallocates an immutable complete fixture with an exact disposable test marker", () => {
    const fixture = createDimensionIntegrityFixtureIds();

    expect(Object.isFrozen(fixture)).toBe(true);
    expect(fixture.marker).toBe(`${DIMENSION_INTEGRITY_FIXTURE_PREFIX}${fixture.runId}`);
    for (const field of requiredFixtureUuidFields) {
      expect(fixture[field]).toMatch(UUID_PATTERN);
    }
    expect(new Set(requiredFixtureUuidFields.map((field) => fixture[field])).size).toBe(requiredFixtureUuidFields.length);
  });

  it.each(["postgres", "defaultdb", "accounting", "ledgerbyte"])("rejects the ordinary local database name %s", (databaseName) => {
    expect(() => resolveDimensionIntegrityDbSettings(enabledDbEnv(databaseName))).toThrow("clearly disposable test database name");
  });

  it.each([
    "ledgerbyte_prod_test",
    "ledgerbyte-production-test",
    "ledgerbyte_beta_test",
    "ledgerbyte-staging-test",
    "ledgerbyte_hosted_test",
    "ledgerbyte_preview_test",
    "ledgerbyte_live_test",
  ])("rejects the production-like local database name %s even when it contains a test token", (databaseName) => {
    expect(() => resolveDimensionIntegrityDbSettings(enabledDbEnv(databaseName))).toThrow("production-like database names");
  });

  it.each(["production", "beta", "staging", "hosted"])("rejects a disposable database URL that selects the %s schema", (schema) => {
    const databaseUrl = `postgresql://fixture:fixture@localhost:5432/ledgerbyte_dimension_test?schema=${schema}`;

    expect(() => resolveDimensionIntegrityDbSettings(enabledDbEnvFromUrl(databaseUrl))).toThrow("production-like database names");
  });

  it.each([
    "postgresql://fixture:fixture@localhost:5432/ledgerbyte_dimension_test?schema=public",
    "postgresql://fixture:fixture@127.0.0.1:5432/accounting-testing?schema=public",
    "postgresql://fixture:fixture@[::1]:5432/dimension-disposable?schema=public",
  ])("accepts an explicitly enabled loopback disposable database URL", (databaseUrl) => {
    expect(resolveDimensionIntegrityDbSettings(enabledDbEnvFromUrl(databaseUrl))).toEqual({
      enabled: true,
      databaseUrl,
      databaseName: new URL(databaseUrl).pathname.slice(1),
      safetyClassification: DISPOSABLE_TARGET_CLASSIFICATION,
    });
  });

  it("keeps the database suite disabled without the explicit opt-in flag", () => {
    expect(
      resolveDimensionIntegrityDbSettings({
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://fixture:fixture@localhost:5432/ledgerbyte_dimension_test?schema=public",
      } as NodeJS.ProcessEnv),
    ).toEqual({ enabled: false });
  });

  it("requires a database URL only after the explicit opt-in flag", () => {
    expect(() =>
      resolveDimensionIntegrityDbSettings({ LEDGERBYTE_ACCOUNTING_DIMENSION_DB_INTEGRATION: "1" } as NodeJS.ProcessEnv),
    ).toThrow("LEDGERBYTE_TEST_DATABASE_URL is required");
  });

  it.each([
    "not-a-url",
    "mysql://fixture:fixture@localhost:3306/ledgerbyte_dimension_test",
    "postgresql://fixture:fixture@example.com:5432/ledgerbyte_dimension_test",
    "postgresql://fixture:fixture@localhost:5432/ledgerbyte_%ZZ_test",
  ])("rejects malformed, non-Postgres, or hosted target %s without returning the configured value", (databaseUrl) => {
    let message = "";
    try {
      resolveDimensionIntegrityDbSettings(enabledDbEnvFromUrl(databaseUrl));
    } catch (error) {
      message = String(error);
    }

    expect(message).toContain("disposable local Postgres");
    expect(message).not.toContain(databaseUrl);
  });

  it("does not expose configured credentials in target-validation errors", () => {
    const credentialMarker = "do-not-print";
    const databaseUrl = `postgresql://fixture:${credentialMarker}@example.com:5432/ledgerbyte_dimension_test`;

    expect(() => resolveDimensionIntegrityDbSettings(enabledDbEnvFromUrl(databaseUrl))).toThrow("disposable local Postgres");
    try {
      resolveDimensionIntegrityDbSettings(enabledDbEnvFromUrl(databaseUrl));
    } catch (error) {
      expect(String(error)).not.toContain(databaseUrl);
      expect(String(error)).not.toContain(credentialMarker);
    }
  });

  it.each(requiredFixtureUuidFields)("refuses cleanup when fixture %s is undefined, null, empty, or not a UUID", async (field) => {
    for (const unsafeValue of [undefined, null, "", "not-a-uuid"]) {
      const fixture = Object.freeze({ ...createDimensionIntegrityFixtureIds(), [field]: unsafeValue }) as never;
      const cleanupClient = fakeCleanupClient();

      await expect(cleanupDimensionIntegrityFixture(cleanupClient as never, fixture, disposableDbSettings())).rejects.toThrow(
        `valid fixture ${field}`,
      );
      expect(cleanupClient.journalLine.deleteMany).not.toHaveBeenCalled();
      expect(cleanupClient.organization.deleteMany).not.toHaveBeenCalled();
    }
  });

  it.each([undefined, null, "", "DIMENSION-INTEGRITY-DISPOSABLE-TEST:wrong"])(
    "refuses cleanup when the fixture marker is missing or invalid",
    async (marker) => {
      const fixture = Object.freeze({ ...createDimensionIntegrityFixtureIds(), marker }) as never;
      const cleanupClient = fakeCleanupClient();

      await expect(cleanupDimensionIntegrityFixture(cleanupClient as never, fixture, disposableDbSettings())).rejects.toThrow(
        "valid disposable test marker",
      );
      expect(cleanupClient.journalLine.deleteMany).not.toHaveBeenCalled();
      expect(cleanupClient.organization.deleteMany).not.toHaveBeenCalled();
    },
  );

  it.each([
    { enabled: false },
    { enabled: true },
    {
      enabled: true,
      databaseUrl: "postgresql://fixture:fixture@localhost:5432/accounting",
      databaseName: "accounting",
      safetyClassification: DISPOSABLE_TARGET_CLASSIFICATION,
    },
    {
      enabled: true,
      databaseUrl: "postgresql://fixture:fixture@example.com:5432/ledgerbyte_dimension_test",
      databaseName: "ledgerbyte_dimension_test",
      safetyClassification: DISPOSABLE_TARGET_CLASSIFICATION,
    },
  ])("refuses cleanup unless the target independently validates as disposable local Postgres", async (settings) => {
    const cleanupClient = fakeCleanupClient();

    await expect(
      cleanupDimensionIntegrityFixture(cleanupClient as never, createDimensionIntegrityFixtureIds(), settings as never),
    ).rejects.toThrow("validated disposable local Postgres target");
    expect(cleanupClient.journalLine.deleteMany).not.toHaveBeenCalled();
    expect(cleanupClient.organization.deleteMany).not.toHaveBeenCalled();
  });

  it("uses only exact validated fixture predicates during partial-setup cleanup", async () => {
    const fixture = createDimensionIntegrityFixtureIds();
    const cleanupClient = fakeCleanupClient();

    await cleanupDimensionIntegrityFixture(cleanupClient as never, fixture, disposableDbSettings());

    expect(cleanupClient.journalLine.deleteMany).toHaveBeenCalledWith({
      where: {
        organizationId: fixture.organizationId,
        journalEntryId: fixture.journalEntryId,
        accountId: fixture.accountId,
        costCenterId: fixture.costCenterId,
        projectId: fixture.projectId,
      },
    });
    expect(cleanupClient.organization.deleteMany).toHaveBeenCalledWith({
      where: { id: fixture.organizationId, name: fixture.marker },
    });
  });
});

describeDimensionIntegrityDb("accounting dimension integrity: Prisma-backed local DB", () => {
  jest.setTimeout(30_000);

  const fixture = createDimensionIntegrityFixtureIds();
  let writer: PrismaClient | undefined;
  let catalogWriter: PrismaClient | undefined;

  beforeAll(async () => {
    const databaseUrl = requiredDisposableDatabaseUrl(DB_SETTINGS);
    writer = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    catalogWriter = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await Promise.all([writer.$connect(), catalogWriter.$connect()]);

    await writer.organization.create({ data: { id: fixture.organizationId, name: fixture.marker } });
    await writer.account.create({
      data: {
        id: fixture.accountId,
        organizationId: fixture.organizationId,
        code: `DIM-${fixture.runId.slice(0, 8)}`,
        name: "Dimension integrity",
        type: AccountType.ASSET,
      },
    });
    await writer.journalEntry.create({
      data: {
        id: fixture.journalEntryId,
        organizationId: fixture.organizationId,
        entryNumber: `JE-${fixture.runId.slice(0, 8)}`,
        entryDate: new Date(),
        description: fixture.marker,
      },
    });
    await writer.costCenter.create({
      data: { id: fixture.costCenterId, organizationId: fixture.organizationId, code: "CC-LOCK", name: "Locked cost center" },
    });
    await writer.project.create({
      data: { id: fixture.projectId, organizationId: fixture.organizationId, code: "PRJ-LOCK", name: "Locked project" },
    });
  });

  afterAll(async () => {
    try {
      await cleanupDimensionIntegrityFixture(writer, fixture, DB_SETTINGS);
    } finally {
      await Promise.allSettled([writer?.$disconnect(), catalogWriter?.$disconnect()]);
    }
  });

  it("prevents an archive update from committing between active validation and the journal-line write", async () => {
    const activeWriter = requiredPrismaClient(writer);
    const activeCatalogWriter = requiredPrismaClient(catalogWriter);
    let releaseLock!: () => void;
    const holdLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    let lockAcquired!: () => void;
    const acquired = new Promise<void>((resolve) => {
      lockAcquired = resolve;
    });

    const journalWrite = activeWriter.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "CostCenter"
        WHERE "organizationId" = ${fixture.organizationId}::uuid
          AND "id" = ${fixture.costCenterId}::uuid
          AND "status" = 'ACTIVE'::"DimensionStatus"
        FOR UPDATE
      `;
      expect(rows).toEqual([{ id: fixture.costCenterId }]);
      lockAcquired();
      await holdLock;
      await tx.journalLine.create({
        data: {
          organizationId: fixture.organizationId,
          journalEntryId: fixture.journalEntryId,
          accountId: fixture.accountId,
          costCenterId: fixture.costCenterId,
          projectId: fixture.projectId,
          lineNumber: 1,
          debit: "1.0000",
          credit: "0.0000",
        },
      });
    });

    await acquired;
    await expect(
      activeCatalogWriter.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '250ms'");
        await tx.costCenter.update({ where: { id: fixture.costCenterId }, data: { status: DimensionStatus.ARCHIVED } });
      }),
    ).rejects.toThrow();

    releaseLock();
    await journalWrite;
    await activeCatalogWriter.costCenter.update({
      where: { id: fixture.costCenterId },
      data: { status: DimensionStatus.ARCHIVED },
    });

    await expect(activeWriter.journalLine.findFirst({ where: { journalEntryId: fixture.journalEntryId } })).resolves.toMatchObject({
      costCenterId: fixture.costCenterId,
      projectId: fixture.projectId,
    });
  });

  it("rejects deletion of either catalog record instead of clearing historical assignments", async () => {
    const activeWriter = requiredPrismaClient(writer);
    const activeCatalogWriter = requiredPrismaClient(catalogWriter);

    await expect(activeCatalogWriter.costCenter.delete({ where: { id: fixture.costCenterId } })).rejects.toMatchObject({ code: "P2003" });
    await expect(activeCatalogWriter.project.delete({ where: { id: fixture.projectId } })).rejects.toMatchObject({ code: "P2003" });
    await expect(activeWriter.journalLine.findFirst({ where: { journalEntryId: fixture.journalEntryId } })).resolves.toMatchObject({
      costCenterId: fixture.costCenterId,
      projectId: fixture.projectId,
    });
  });
});

function createDimensionIntegrityFixtureIds(): Readonly<DimensionIntegrityFixtureIds> {
  const runId = randomUUID();
  return Object.freeze({
    runId,
    organizationId: randomUUID(),
    accountId: randomUUID(),
    journalEntryId: randomUUID(),
    costCenterId: randomUUID(),
    projectId: randomUUID(),
    marker: `${DIMENSION_INTEGRITY_FIXTURE_PREFIX}${runId}`,
  });
}

function dimensionIntegrityCleanupScope(fixture: Readonly<DimensionIntegrityFixtureIds>): DimensionIntegrityCleanupScope {
  if (!Object.isFrozen(fixture)) {
    throw new Error("Accounting dimension cleanup requires an immutable fixture.");
  }

  const values = requiredFixtureUuidFields.map((field) => {
    const value = fixture[field];
    if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
      throw new Error(`Accounting dimension cleanup requires a valid fixture ${field}.`);
    }
    return value;
  });
  if (new Set(values).size !== values.length) {
    throw new Error("Accounting dimension cleanup requires unique fixture UUIDs.");
  }
  if (fixture.marker !== `${DIMENSION_INTEGRITY_FIXTURE_PREFIX}${fixture.runId}`) {
    throw new Error("Accounting dimension cleanup requires a valid disposable test marker.");
  }

  return {
    journalLine: {
      organizationId: fixture.organizationId,
      journalEntryId: fixture.journalEntryId,
      accountId: fixture.accountId,
      costCenterId: fixture.costCenterId,
      projectId: fixture.projectId,
    },
    organization: { id: fixture.organizationId, name: fixture.marker },
  };
}

async function cleanupDimensionIntegrityFixture(
  writer: PrismaClient | undefined,
  fixture: Readonly<DimensionIntegrityFixtureIds>,
  settings: DimensionIntegrityDbSettings,
): Promise<void> {
  if (!writer) {
    return;
  }
  assertValidatedDisposableTarget(settings);
  const scope = dimensionIntegrityCleanupScope(fixture);
  await writer.journalLine.deleteMany({ where: scope.journalLine });
  await writer.organization.deleteMany({ where: scope.organization });
}

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

  const databaseName = disposableDatabaseName(databaseUrl);
  return { enabled: true, databaseUrl, databaseName, safetyClassification: DISPOSABLE_TARGET_CLASSIFICATION };
}

function disposableDatabaseName(databaseUrl: string): string {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("Accounting dimension integrity proof requires disposable local Postgres.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error("Accounting dimension integrity proof requires disposable local Postgres.");
  }

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    throw new Error("Accounting dimension integrity proof requires disposable local Postgres.");
  }
  if (!databaseName || databaseName.includes("/") || !/(?:^|[-_])(test|testing|disposable)(?:$|[-_])/i.test(databaseName)) {
    throw new Error("Accounting dimension integrity proof requires a clearly disposable test database name.");
  }
  const schemaName = url.searchParams.get("schema") ?? "";
  if (PRODUCTION_LIKE_TARGET_PATTERN.test(databaseName) || PRODUCTION_LIKE_TARGET_PATTERN.test(schemaName)) {
    throw new Error("Accounting dimension integrity proof refuses production-like database names.");
  }
  return databaseName;
}

function assertValidatedDisposableTarget(settings: DimensionIntegrityDbSettings): void {
  if (
    !settings.enabled ||
    !settings.databaseUrl ||
    !settings.databaseName ||
    settings.safetyClassification !== DISPOSABLE_TARGET_CLASSIFICATION
  ) {
    throw new Error("Accounting dimension cleanup requires a validated disposable local Postgres target.");
  }

  let validatedName: string;
  try {
    validatedName = disposableDatabaseName(settings.databaseUrl);
  } catch {
    throw new Error("Accounting dimension cleanup requires a validated disposable local Postgres target.");
  }
  if (validatedName !== settings.databaseName) {
    throw new Error("Accounting dimension cleanup requires a validated disposable local Postgres target.");
  }
}

function requiredDisposableDatabaseUrl(settings: DimensionIntegrityDbSettings): string {
  assertValidatedDisposableTarget(settings);
  return settings.databaseUrl!;
}

function requiredPrismaClient(client: PrismaClient | undefined): PrismaClient {
  if (!client) {
    throw new Error("Accounting dimension integration database client is not connected.");
  }
  return client;
}

function enabledDbEnv(databaseName: string): NodeJS.ProcessEnv {
  return enabledDbEnvFromUrl(`postgresql://fixture:fixture@localhost:5432/${databaseName}?schema=public`);
}

function enabledDbEnvFromUrl(databaseUrl: string): NodeJS.ProcessEnv {
  return {
    LEDGERBYTE_ACCOUNTING_DIMENSION_DB_INTEGRATION: "1",
    LEDGERBYTE_TEST_DATABASE_URL: databaseUrl,
  } as NodeJS.ProcessEnv;
}

function disposableDbSettings(): DimensionIntegrityDbSettings {
  return resolveDimensionIntegrityDbSettings(enabledDbEnv("ledgerbyte_dimension_test"));
}

function fakeCleanupClient() {
  return {
    journalLine: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    organization: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
}
