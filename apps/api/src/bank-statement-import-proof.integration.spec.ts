import { NotFoundException } from "@nestjs/common";
import {
  AccountType,
  BankAccountStatus,
  BankAccountType,
  BankReconciliationStatus,
  BankStatementImportStatus,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
  MembershipStatus,
  NumberSequenceScope,
  PrismaClient,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AuditLogService } from "./audit-log/audit-log.service";
import { BankStatementService } from "./bank-statements/bank-statement.service";
import { FiscalPeriodGuardService } from "./fiscal-periods/fiscal-period-guard.service";
import { NumberSequenceService } from "./number-sequences/number-sequence.service";
import { PrismaService } from "./prisma/prisma.service";

type BankImportProofDbSettings =
  | { enabled: false; databaseUrl?: undefined }
  | { enabled: true; databaseUrl: string };

interface BankImportProofFixtureSet {
  marker: string;
  tenantA: BankImportTenantFixture;
  tenantB: BankImportTenantFixture;
}

interface BankImportTenantFixture {
  organizationId: string;
  userId: string;
  email: string;
  roleId: string;
  memberId: string;
  bankAccountId: string;
  bankProfileId: string;
  bankDisplayName: string;
  csvImportId: string;
  partialImportId: string;
  csvCreditTransactionId: string;
  seededImportId: string;
  seededTransactionId: string;
}

const DB_INTEGRATION_SETTINGS = resolveBankImportProofDbSettings(process.env);
const DATABASE_URL = DB_INTEGRATION_SETTINGS.enabled ? DB_INTEGRATION_SETTINGS.databaseUrl : undefined;
const describeBankImportProofDb = DB_INTEGRATION_SETTINGS.enabled ? describe : describe.skip;

describe("bank statement import proof DB URL gate", () => {
  it("skips safely when the opt-in environment variable is not set", () => {
    expect(resolveBankImportProofDbSettings({} as NodeJS.ProcessEnv)).toEqual({ enabled: false });
  });

  it("requires LEDGERBYTE_TEST_DATABASE_URL when the import proof is enabled", () => {
    expect(() =>
      resolveBankImportProofDbSettings({
        LEDGERBYTE_BANK_STATEMENT_IMPORT_DB_INTEGRATION: "1",
        DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_BANK_STATEMENT_IMPORT_DB_INTEGRATION=1");
  });

  it("rejects hosted or non-local database URLs", () => {
    expect(() =>
      resolveBankImportProofDbSettings({
        LEDGERBYTE_BANK_STATEMENT_IMPORT_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@db.example.com/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("local-only");
  });

  it("rejects production-looking database names", () => {
    expect(() =>
      resolveBankImportProofDbSettings({
        LEDGERBYTE_BANK_STATEMENT_IMPORT_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting_prod?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("disposable local database name");
  });

  it("accepts an explicit disposable local test database URL", () => {
    const localUrl = "postgresql://accounting:accounting@localhost:5432/accounting?schema=public";

    expect(
      resolveBankImportProofDbSettings({
        LEDGERBYTE_BANK_STATEMENT_IMPORT_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: localUrl,
      } as NodeJS.ProcessEnv),
    ).toEqual({ enabled: true, databaseUrl: localUrl });
  });
});

describeBankImportProofDb("bank statement import proof: Prisma-backed local DB", () => {
  jest.setTimeout(120_000);

  let prisma: PrismaClient;
  let fixture: BankImportProofFixtureSet;
  let bankStatementService: BankStatementService;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: DATABASE_URL } },
      transactionOptions: { maxWait: 10_000, timeout: 25_000 },
    });
    await prisma.$connect();

    bankStatementService = new BankStatementService(
      prisma as unknown as PrismaService,
      new AuditLogService(prisma as unknown as PrismaService),
      makeNumberSequenceService(),
      { assertPostingDateAllowed: jest.fn(async () => undefined) } as unknown as FiscalPeriodGuardService,
    );

    fixture = await seedBankImportProofFixture(prisma);
  });

  afterAll(async () => {
    if (fixture) {
      await cleanupBankImportProofFixture(prisma, fixture);
    }
    await prisma.$disconnect();
  });

  it("proves CSV preview, import, duplicate blocking, partial import, audit evidence, and no journal posting", async () => {
    const tenant = fixture.tenantA;
    const previewCountBefore = await prisma.bankStatementImport.count({ where: { organizationId: tenant.organizationId } });
    const journalCountBefore = await prisma.journalEntry.count({ where: { organizationId: tenant.organizationId } });

    const preview = await bankStatementService.previewImport(tenant.organizationId, tenant.bankProfileId, {
      filename: `${fixture.marker}-june.csv`,
      csvText: statementCsv(fixture.marker),
    });
    expect(preview.summary).toMatchObject({
      sourceRowCount: 2,
      validRowCount: 2,
      importableRowCount: 2,
      blockedRowCount: 0,
    });
    expect(preview.totalCredits).toBe("300.0000");
    expect(preview.totalDebits).toBe("25.0000");
    expect(await prisma.bankStatementImport.count({ where: { organizationId: tenant.organizationId } })).toBe(previewCountBefore);

    const created = await bankStatementService.importStatement(tenant.organizationId, tenant.userId, tenant.bankProfileId, {
      filename: `${fixture.marker}-june.csv`,
      csvText: statementCsv(fixture.marker),
      openingStatementBalance: "0.0000",
      closingStatementBalance: "275.0000",
    });
    tenant.csvImportId = created.id;
    expect(created).toMatchObject({
      sourceType: "CSV",
      rowCount: 2,
      status: BankStatementImportStatus.IMPORTED,
      importSummary: expect.objectContaining({
        sourceRowCount: 2,
        importedRowCount: 2,
        skippedRowCount: 0,
        totalCredits: "300.0000",
        totalDebits: "25.0000",
      }),
    });
    expect(await prisma.journalEntry.count({ where: { organizationId: tenant.organizationId } })).toBe(journalCountBefore);

    const rows = await bankStatementService.listTransactions(tenant.organizationId, tenant.bankProfileId, {
      from: "2026-06-01",
      to: "2026-06-30",
    });
    const receipt = requireStatementRow(rows, "Customer receipt");
    tenant.csvCreditTransactionId = receipt.id;
    expect(receipt).toMatchObject({
      type: BankStatementTransactionType.CREDIT,
      amount: expect.objectContaining({ toString: expect.any(Function) }),
      status: BankStatementTransactionStatus.UNMATCHED,
    });
    expect(JSON.stringify(receipt.rawData)).toContain("statementFingerprint");
    expect(JSON.stringify(receipt.rawData)).toContain("BANK-REF-RECEIPT-1");

    const importAudit = await prisma.auditLog.count({
      where: { organizationId: tenant.organizationId, entityType: "BankStatementImport", entityId: created.id, action: "BANK_STATEMENT_IMPORTED" },
    });
    expect(importAudit).toBe(1);

    const duplicatePreview = await bankStatementService.previewImport(tenant.organizationId, tenant.bankProfileId, {
      filename: `${fixture.marker}-duplicate-and-new.csv`,
      csvText: duplicateAndNewCsv(fixture.marker),
    });
    expect(duplicatePreview.summary).toMatchObject({
      sourceRowCount: 2,
      validRowCount: 2,
      importableRowCount: 1,
      duplicateExistingHighConfidenceCount: 1,
      duplicateExistingCount: 1,
      blockedRowCount: 1,
    });
    expect(duplicatePreview.rowWarnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_EXISTING_HIGH_CONFIDENCE", rowNumber: 2, severity: "blocking" }),
        expect.objectContaining({ code: "PARTIAL_IMPORT_REQUIRED", rowNumber: 0, severity: "warning" }),
      ]),
    );

    await expect(
      bankStatementService.importStatement(tenant.organizationId, tenant.userId, tenant.bankProfileId, {
        filename: `${fixture.marker}-duplicate-and-new.csv`,
        csvText: duplicateAndNewCsv(fixture.marker),
      }),
    ).rejects.toThrow("Bank statement import contains duplicate statement rows.");

    const partial = await bankStatementService.importStatement(tenant.organizationId, tenant.userId, tenant.bankProfileId, {
      filename: `${fixture.marker}-duplicate-and-new.csv`,
      allowPartial: true,
      csvText: duplicateAndNewCsv(fixture.marker),
    });
    tenant.partialImportId = partial.id;
    expect(partial.importSummary).toMatchObject({
      sourceRowCount: 2,
      importedRowCount: 1,
      skippedRowCount: 1,
      duplicateExistingCount: 1,
    });
    const partialRows = await prisma.bankStatementTransaction.findMany({
      where: { organizationId: tenant.organizationId, importId: partial.id },
      orderBy: { transactionDate: "asc" },
    });
    expect(partialRows).toHaveLength(1);
    expect(partialRows[0]).toMatchObject({ description: `${fixture.marker} Card settlement`, reference: "BRF-CARD-1" });
  });

  it("proves sanitized OFX, CAMT, and MT940 previews/imports preserve source metadata without raw-body echoing", async () => {
    const tenant = fixture.tenantA;
    const importCountBefore = await prisma.bankStatementImport.count({ where: { organizationId: tenant.organizationId } });

    for (const source of [
      { filename: "sample.ofx", expectedFormat: "OFX" },
      { filename: "sample-camt053.xml", expectedFormat: "CAMT" },
      { filename: "sample.mt940", expectedFormat: "MT940" },
    ]) {
      const body = readStatementFixture(source.filename);
      const preview = await bankStatementService.previewImport(tenant.organizationId, tenant.bankProfileId, {
        filename: source.filename,
        csvText: body,
      });
      expect(preview).toMatchObject({
        sourceFormat: source.expectedFormat,
        summary: expect.objectContaining({ sourceRowCount: 2, importableRowCount: 2, blockedRowCount: 0 }),
      });
      expect(JSON.stringify(preview.warnings)).not.toContain("<BANKTRANLIST>");
      expect(JSON.stringify(preview.warnings)).not.toContain("<Document>");

      const imported = await bankStatementService.importStatement(tenant.organizationId, tenant.userId, tenant.bankProfileId, {
        filename: `${fixture.marker}-${source.filename}`,
        csvText: body,
      });
      expect(imported).toMatchObject({ sourceType: source.expectedFormat, rowCount: 2, status: BankStatementImportStatus.IMPORTED });
    }

    expect(await prisma.bankStatementImport.count({ where: { organizationId: tenant.organizationId } })).toBe(importCountBefore + 3);

    const unsupported = await bankStatementService.previewImport(tenant.organizationId, tenant.bankProfileId, {
      filename: `${fixture.marker}-unsupported.txt`,
      csvText: "private-looking raw bank body that must not be echoed",
    });
    expect(unsupported.warnings).toContain(
      "Statement format could not be detected. Use CSV, JSON, OFX, CAMT XML, or MT940 manual exports.",
    );
    expect(unsupported.warnings.join(" ")).not.toContain("private-looking raw bank body");
  });

  it("proves closed-period import guards and cross-tenant reads remain enforced", async () => {
    const tenant = fixture.tenantA;
    await prisma.bankReconciliation.create({
      data: {
        organizationId: tenant.organizationId,
        bankAccountProfileId: tenant.bankProfileId,
        reconciliationNumber: `${fixture.marker}-CLOSED-REC`,
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-31T23:59:59.999Z"),
        statementOpeningBalance: "0.0000",
        statementClosingBalance: "0.0000",
        ledgerClosingBalance: "0.0000",
        difference: "0.0000",
        status: BankReconciliationStatus.CLOSED,
        createdById: tenant.userId,
        closedById: tenant.userId,
        closedAt: new Date("2026-07-31T23:59:59.999Z"),
      },
    });

    const closedPreview = await bankStatementService.previewImport(tenant.organizationId, tenant.bankProfileId, {
      filename: `${fixture.marker}-closed-period.csv`,
      csvText: "date,description,reference,bankReference,debit,credit,currency\n2026-07-10,Closed row,CLOSED-1,CLOSED-BANK-1,0.0000,10.0000,SAR",
    });
    expect(closedPreview.summary).toMatchObject({
      closedReconciliationOverlapCount: 1,
      blockedRowCount: 1,
      importableRowCount: 0,
    });
    expect(closedPreview.rowWarnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "CLOSED_RECONCILIATION_OVERLAP", severity: "blocking" })]),
    );
    await expect(
      bankStatementService.importStatement(tenant.organizationId, tenant.userId, tenant.bankProfileId, {
        filename: `${fixture.marker}-closed-period.csv`,
        csvText: "date,description,reference,bankReference,debit,credit,currency\n2026-07-10,Closed row,CLOSED-1,CLOSED-BANK-1,0.0000,10.0000,SAR",
      }),
    ).rejects.toThrow("Cannot import statement transactions into a closed reconciliation period.");

    await expect(bankStatementService.getImport(tenant.organizationId, fixture.tenantB.seededImportId)).rejects.toThrow(NotFoundException);
    await expect(bankStatementService.getTransaction(tenant.organizationId, fixture.tenantB.seededTransactionId)).rejects.toThrow(NotFoundException);
    await expect(bankStatementService.voidImport(tenant.organizationId, tenant.userId, fixture.tenantB.seededImportId)).rejects.toThrow(NotFoundException);
    await expect(
      bankStatementService.previewImport(tenant.organizationId, fixture.tenantB.bankProfileId, {
        filename: `${fixture.marker}-foreign-profile.csv`,
        csvText: statementCsv(fixture.marker),
      }),
    ).rejects.toThrow("Bank account profile not found.");

    const visibleRows = await bankStatementService.listTransactions(tenant.organizationId, tenant.bankProfileId, {});
    assertTenantBAbsent(visibleRows, fixture);
    expect(await prisma.bankStatementTransaction.findUniqueOrThrow({ where: { id: fixture.tenantB.seededTransactionId } })).toMatchObject({
      organizationId: fixture.tenantB.organizationId,
      status: BankStatementTransactionStatus.UNMATCHED,
    });
  });

  it("proves voiding an unmatched import voids rows, writes audit evidence, and removes duplicate pressure", async () => {
    const tenant = fixture.tenantA;
    const voided = await bankStatementService.voidImport(tenant.organizationId, tenant.userId, tenant.csvImportId);
    expect(voided.status).toBe(BankStatementImportStatus.VOIDED);

    const rows = await prisma.bankStatementTransaction.findMany({
      where: { organizationId: tenant.organizationId, importId: tenant.csvImportId },
      select: { status: true },
    });
    expect(rows).toEqual([
      { status: BankStatementTransactionStatus.VOIDED },
      { status: BankStatementTransactionStatus.VOIDED },
    ]);
    expect(
      await prisma.auditLog.count({
        where: { organizationId: tenant.organizationId, entityType: "BankStatementImport", entityId: tenant.csvImportId, action: "BANK_STATEMENT_IMPORT_VOIDED" },
      }),
    ).toBe(1);

    const previewAfterVoid = await bankStatementService.previewImport(tenant.organizationId, tenant.bankProfileId, {
      filename: `${fixture.marker}-receipt-after-void.csv`,
      csvText:
        "date,description,reference,bankReference,debit,credit,counterparty,currency\n2026-06-10,Customer receipt,BRF-RECEIPT-1,BANK-REF-RECEIPT-1,0.0000,300.0000,Customer LLC,SAR",
    });
    expect(previewAfterVoid.summary).toMatchObject({ duplicateExistingCount: 0, blockedRowCount: 0, importableRowCount: 1 });
  });
});

function requireLocalPostgresUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    throw new Error(
      "LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_BANK_STATEMENT_IMPORT_DB_INTEGRATION=1. Point it at disposable local Postgres.",
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must be a valid Postgres URL.");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Bank statement import proof requires a Postgres URL.");
  }

  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("Bank statement import proof is local-only and refuses non-local database hosts.");
  }

  const databaseName = url.pathname.replace(/^\//, "");
  if (!databaseName || databaseName.toLowerCase().includes("prod")) {
    throw new Error("Bank statement import proof requires a disposable local database name.");
  }

  return rawUrl;
}

function resolveBankImportProofDbSettings(env: NodeJS.ProcessEnv): BankImportProofDbSettings {
  if (env.LEDGERBYTE_BANK_STATEMENT_IMPORT_DB_INTEGRATION !== "1") {
    return { enabled: false };
  }

  return {
    enabled: true,
    databaseUrl: requireLocalPostgresUrl(env.LEDGERBYTE_TEST_DATABASE_URL),
  };
}

function makeNumberSequenceService(): NumberSequenceService {
  let sequence = 0;
  return {
    next: jest.fn(async (_organizationId: string, scope: NumberSequenceScope) => `BSI-${scope}-${++sequence}`),
    preview: jest.fn(async (_organizationId: string, scope: NumberSequenceScope) => ({
      scope,
      nextNumber: `BSI-${scope}-${sequence + 1}`,
      exampleNextNumber: `BSI-${scope}-${sequence + 1}`,
    })),
  } as unknown as NumberSequenceService;
}

async function seedBankImportProofFixture(prisma: PrismaClient): Promise<BankImportProofFixtureSet> {
  const marker = `BSI-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const suffix = marker.replace(/[^A-Za-z0-9]/g, "").slice(-12).toLowerCase();
  const tenantA = fixtureIds(marker, suffix, "A");
  const tenantB = fixtureIds(marker, suffix, "B");

  await prisma.user.createMany({
    data: [
      {
        id: tenantA.userId,
        email: tenantA.email,
        name: `${marker} Import Operator A`,
        passwordHash: "bank-statement-import-local-hash",
      },
      {
        id: tenantB.userId,
        email: tenantB.email,
        name: `${marker} Import Operator B`,
        passwordHash: "bank-statement-import-local-hash",
      },
    ],
  });

  await prisma.organization.createMany({
    data: [
      { id: tenantA.organizationId, name: `${marker} Import Organization A`, countryCode: "SA", baseCurrency: "SAR", timezone: "Asia/Riyadh" },
      { id: tenantB.organizationId, name: `${marker} Import Organization B`, countryCode: "SA", baseCurrency: "SAR", timezone: "Asia/Riyadh" },
    ],
  });

  await prisma.role.createMany({
    data: [
      {
        id: tenantA.roleId,
        organizationId: tenantA.organizationId,
        name: `${marker} Import Owner A`,
        permissions: ["admin.fullAccess"],
        isSystem: true,
      },
      {
        id: tenantB.roleId,
        organizationId: tenantB.organizationId,
        name: `${marker} Import Owner B`,
        permissions: ["admin.fullAccess"],
        isSystem: true,
      },
    ],
  });

  await prisma.organizationMember.createMany({
    data: [
      { id: tenantA.memberId, organizationId: tenantA.organizationId, userId: tenantA.userId, roleId: tenantA.roleId, status: MembershipStatus.ACTIVE },
      { id: tenantB.memberId, organizationId: tenantB.organizationId, userId: tenantB.userId, roleId: tenantB.roleId, status: MembershipStatus.ACTIVE },
    ],
  });

  await seedTenantProfile(prisma, tenantA);
  await seedTenantProfile(prisma, tenantB);
  await seedTenantBImport(prisma, tenantB, marker);

  return { marker, tenantA, tenantB };
}

function fixtureIds(marker: string, suffix: string, label: "A" | "B"): BankImportTenantFixture {
  const tenantSuffix = `${suffix}-${label.toLowerCase()}`;
  return {
    organizationId: randomUUID(),
    userId: randomUUID(),
    email: `bank-statement-import-${tenantSuffix}@example.test`,
    roleId: randomUUID(),
    memberId: randomUUID(),
    bankAccountId: randomUUID(),
    bankProfileId: randomUUID(),
    bankDisplayName: `${marker} Tenant ${label} Manual Import Bank`,
    csvImportId: "",
    partialImportId: "",
    csvCreditTransactionId: "",
    seededImportId: "",
    seededTransactionId: "",
  };
}

async function seedTenantProfile(prisma: PrismaClient, tenant: BankImportTenantFixture): Promise<void> {
  await prisma.account.create({
    data: {
      id: tenant.bankAccountId,
      organizationId: tenant.organizationId,
      code: "112",
      name: tenant.bankDisplayName,
      type: AccountType.ASSET,
    },
  });
  await prisma.bankAccountProfile.create({
    data: {
      id: tenant.bankProfileId,
      organizationId: tenant.organizationId,
      accountId: tenant.bankAccountId,
      type: BankAccountType.BANK,
      status: BankAccountStatus.ACTIVE,
      displayName: tenant.bankDisplayName,
      currency: "SAR",
    },
  });
}

async function seedTenantBImport(prisma: PrismaClient, tenant: BankImportTenantFixture, marker: string): Promise<void> {
  const statementImport = await prisma.bankStatementImport.create({
    data: {
      organizationId: tenant.organizationId,
      bankAccountProfileId: tenant.bankProfileId,
      importedById: tenant.userId,
      filename: `${marker}-tenant-b-private.csv`,
      sourceType: "CSV",
      rowCount: 1,
      statementStartDate: new Date("2026-06-10T00:00:00.000Z"),
      statementEndDate: new Date("2026-06-10T00:00:00.000Z"),
      closingStatementBalance: "999.0000",
      transactions: {
        create: [
          {
            organizationId: tenant.organizationId,
            bankAccountProfileId: tenant.bankProfileId,
            transactionDate: new Date("2026-06-10T00:00:00.000Z"),
            description: `${marker} Tenant B private receipt`,
            reference: "TENANT-B-PRIVATE",
            type: BankStatementTransactionType.CREDIT,
            amount: "999.0000",
            status: BankStatementTransactionStatus.UNMATCHED,
            rawData: { normalized: { currency: "SAR", counterparty: tenant.bankDisplayName } },
          },
        ],
      },
    },
    include: { transactions: true },
  });
  tenant.seededImportId = statementImport.id;
  tenant.seededTransactionId = statementImport.transactions[0]!.id;
}

function statementCsv(marker: string): string {
  return [
    "date,description,reference,bankReference,debit,credit,counterparty,currency",
    `2026-06-10,${marker} Customer receipt,BRF-RECEIPT-1,BANK-REF-RECEIPT-1,0.0000,300.0000,Customer LLC,SAR`,
    `2026-06-11,${marker} Bank fee,BRF-FEE-1,BANK-REF-FEE-1,25.0000,0.0000,Sample Bank,SAR`,
  ].join("\n");
}

function duplicateAndNewCsv(marker: string): string {
  return [
    "date,description,reference,bankReference,debit,credit,counterparty,currency",
    `2026-06-10,${marker} Customer receipt,BRF-RECEIPT-1,BANK-REF-RECEIPT-1,0.0000,300.0000,Customer LLC,SAR`,
    `2026-06-12,${marker} Card settlement,BRF-CARD-1,BANK-REF-CARD-1,45.0000,0.0000,Corporate Card,SAR`,
  ].join("\n");
}

function readStatementFixture(filename: string): string {
  return readFileSync(join(__dirname, "bank-statements", "fixtures", filename), "utf8");
}

function requireStatementRow(
  rows: Array<{ id: string; description: string; rawData: unknown }>,
  description: string,
): { id: string; description: string; rawData: unknown } {
  const row = rows.find((candidate) => candidate.description.includes(description));
  if (!row) {
    throw new Error(`Expected statement row containing ${description}.`);
  }
  return row;
}

function assertTenantBAbsent(value: unknown, fixture: BankImportProofFixtureSet): void {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  expect(serialized).not.toContain(fixture.tenantB.email);
  expect(serialized).not.toContain(fixture.tenantB.bankDisplayName);
  expect(serialized).not.toContain("Tenant B private receipt");
  expect(serialized).not.toContain("TENANT-B-PRIVATE");
  expect(serialized).not.toContain("999.0000");
}

async function cleanupBankImportProofFixture(prisma: PrismaClient, fixture: BankImportProofFixtureSet): Promise<void> {
  await prisma.organization.deleteMany({
    where: { id: { in: [fixture.tenantA.organizationId, fixture.tenantB.organizationId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [fixture.tenantA.userId, fixture.tenantB.userId] } },
  });
}
