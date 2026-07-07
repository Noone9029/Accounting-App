import { NotFoundException } from "@nestjs/common";
import {
  AccountType,
  BankAccountStatus,
  BankAccountType,
  BankReconciliationStatus,
  BankStatementImportStatus,
  BankStatementMatchType,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
  JournalEntryStatus,
  MembershipStatus,
  NumberSequenceScope,
  PrismaClient,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AuditLogService } from "./audit-log/audit-log.service";
import { BankReconciliationService } from "./bank-reconciliations/bank-reconciliation.service";
import { BankStatementService } from "./bank-statements/bank-statement.service";
import { FiscalPeriodGuardService } from "./fiscal-periods/fiscal-period-guard.service";
import { NumberSequenceService } from "./number-sequences/number-sequence.service";
import { PrismaService } from "./prisma/prisma.service";

type ReconciliationMatchingProofDbSettings =
  | { enabled: false; databaseUrl?: undefined }
  | { enabled: true; databaseUrl: string };

interface ReconciliationMatchingFixtureSet {
  marker: string;
  tenantA: ReconciliationMatchingTenantFixture;
  tenantB: ReconciliationMatchingTenantFixture;
}

interface ReconciliationMatchingTenantFixture {
  organizationId: string;
  userId: string;
  approverUserId: string;
  email: string;
  approverEmail: string;
  roleId: string;
  memberId: string;
  approverMemberId: string;
  bankAccountId: string;
  revenueAccountId: string;
  expenseAccountId: string;
  otherAssetAccountId: string;
  bankProfileId: string;
  bankDisplayName: string;
  receiptJournalEntryId: string;
  receiptJournalLineId: string;
  draftJournalLineId: string;
  wrongAccountJournalLineId: string;
  interestJournalLineId: string;
  statementImportId: string;
  receiptTransactionId: string;
  feeTransactionId: string;
  interestTransactionId: string;
  reconciliationId: string;
}

const DB_INTEGRATION_SETTINGS = resolveReconciliationMatchingProofDbSettings(process.env);
const DATABASE_URL = DB_INTEGRATION_SETTINGS.enabled ? DB_INTEGRATION_SETTINGS.databaseUrl : undefined;
const describeReconciliationMatchingProofDb = DB_INTEGRATION_SETTINGS.enabled ? describe : describe.skip;
const PROOF_FROM = "2026-05-01";
const PROOF_TO = "2026-05-31";

describe("reconciliation matching proof DB URL gate", () => {
  it("skips safely when the opt-in environment variable is not set", () => {
    expect(resolveReconciliationMatchingProofDbSettings({} as NodeJS.ProcessEnv)).toEqual({ enabled: false });
  });

  it("requires LEDGERBYTE_TEST_DATABASE_URL when the reconciliation matching proof is enabled", () => {
    expect(() =>
      resolveReconciliationMatchingProofDbSettings({
        LEDGERBYTE_RECONCILIATION_MATCHING_DB_INTEGRATION: "1",
        DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_RECONCILIATION_MATCHING_DB_INTEGRATION=1");
  });

  it("rejects hosted or non-local database URLs", () => {
    expect(() =>
      resolveReconciliationMatchingProofDbSettings({
        LEDGERBYTE_RECONCILIATION_MATCHING_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@db.example.com/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("local-only");
  });

  it("rejects production-looking database names", () => {
    expect(() =>
      resolveReconciliationMatchingProofDbSettings({
        LEDGERBYTE_RECONCILIATION_MATCHING_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting_prod?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("disposable local database name");
  });

  it("accepts an explicit disposable local test database URL", () => {
    const localUrl = "postgresql://accounting:accounting@localhost:5432/accounting?schema=public";

    expect(
      resolveReconciliationMatchingProofDbSettings({
        LEDGERBYTE_RECONCILIATION_MATCHING_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: localUrl,
      } as NodeJS.ProcessEnv),
    ).toEqual({ enabled: true, databaseUrl: localUrl });
  });
});

describeReconciliationMatchingProofDb("reconciliation matching proof: Prisma-backed local DB", () => {
  jest.setTimeout(120_000);

  let prisma: PrismaClient;
  let fixture: ReconciliationMatchingFixtureSet;
  let bankStatementService: BankStatementService;
  let bankReconciliationService: BankReconciliationService;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: DATABASE_URL } },
      transactionOptions: { maxWait: 10_000, timeout: 25_000 },
    });
    await prisma.$connect();

    const auditLogService = new AuditLogService(prisma as unknown as PrismaService);
    const numberSequenceService = makeNumberSequenceService();
    const fiscalPeriodGuardService = {
      assertPostingDateAllowed: jest.fn(async () => undefined),
    } as unknown as FiscalPeriodGuardService;

    bankStatementService = new BankStatementService(
      prisma as unknown as PrismaService,
      auditLogService,
      numberSequenceService,
      fiscalPeriodGuardService,
    );
    bankReconciliationService = new BankReconciliationService(
      prisma as unknown as PrismaService,
      auditLogService,
      numberSequenceService,
    );

    fixture = await seedReconciliationMatchingFixture(prisma);
  });

  afterAll(async () => {
    if (fixture) {
      await cleanupReconciliationMatchingFixture(prisma, fixture);
    }
    await prisma.$disconnect();
  });

  it("proves candidate filtering, explicit match safety, categorization, ignore, close snapshot, and tenant isolation", async () => {
    const tenant = fixture.tenantA;

    const preview = await bankStatementService.previewImport(tenant.organizationId, tenant.bankProfileId, {
      filename: `${fixture.marker}-matching.csv`,
      csvText: statementCsv(fixture.marker),
    });
    expect(preview.summary).toMatchObject({ sourceRowCount: 3, importableRowCount: 3, blockedRowCount: 0 });
    expect(await prisma.bankStatementImport.count({ where: { organizationId: tenant.organizationId } })).toBe(0);

    const statementImport = await bankStatementService.importStatement(tenant.organizationId, tenant.userId, tenant.bankProfileId, {
      filename: `${fixture.marker}-matching.csv`,
      csvText: statementCsv(fixture.marker),
      openingStatementBalance: "0.0000",
      closingStatementBalance: "111.0000",
    });
    tenant.statementImportId = statementImport.id;
    expect(statementImport).toMatchObject({ rowCount: 3, status: BankStatementImportStatus.IMPORTED });

    const rows = await bankStatementService.listTransactions(tenant.organizationId, tenant.bankProfileId, {
      from: PROOF_FROM,
      to: PROOF_TO,
    });
    const receiptRow = requireStatementRow(rows, "Customer receipt");
    const feeRow = requireStatementRow(rows, "Bank service fee");
    const interestRow = requireStatementRow(rows, "Bank interest");
    tenant.receiptTransactionId = receiptRow.id;
    tenant.feeTransactionId = feeRow.id;
    tenant.interestTransactionId = interestRow.id;

    const candidates = await bankStatementService.matchCandidates(tenant.organizationId, receiptRow.id);
    expect(candidates.map((candidate) => candidate.journalLineId)).toEqual([tenant.receiptJournalLineId]);
    expect(JSON.stringify(candidates)).not.toContain(tenant.draftJournalLineId);
    expect(JSON.stringify(candidates)).not.toContain(tenant.wrongAccountJournalLineId);
    expect(JSON.stringify(candidates)).not.toContain(fixture.tenantB.receiptJournalLineId);

    await expect(
      bankStatementService.matchTransaction(tenant.organizationId, tenant.userId, receiptRow.id, {
        journalLineId: fixture.tenantB.receiptJournalLineId,
      }),
    ).rejects.toThrow("Journal line must belong to this organization.");
    await expect(
      bankStatementService.matchTransaction(tenant.organizationId, tenant.userId, receiptRow.id, {
        journalLineId: tenant.wrongAccountJournalLineId,
      }),
    ).rejects.toThrow("Journal line must use the linked bank account.");

    const matched = await bankStatementService.matchTransaction(tenant.organizationId, tenant.userId, receiptRow.id, {
      journalLineId: tenant.receiptJournalLineId,
    });
    expect(matched).toMatchObject({
      status: BankStatementTransactionStatus.MATCHED,
      matchedJournalLineId: tenant.receiptJournalLineId,
      matchedJournalEntryId: tenant.receiptJournalEntryId,
      matchType: BankStatementMatchType.JOURNAL_LINE,
    });

    const categorized = await bankStatementService.categorizeTransaction(tenant.organizationId, tenant.userId, feeRow.id, {
      accountId: tenant.expenseAccountId,
      description: `${fixture.marker} categorized bank fee`,
    });
    expect(categorized).toMatchObject({
      status: BankStatementTransactionStatus.CATEGORIZED,
      categorizedAccountId: tenant.expenseAccountId,
      matchType: BankStatementMatchType.MANUAL_JOURNAL,
    });
    expect(categorized.createdJournalEntryId).toBeTruthy();

    const ignored = await bankStatementService.ignoreTransaction(tenant.organizationId, tenant.userId, interestRow.id, {
      reason: "Already posted from bank interest advice.",
    });
    expect(ignored).toMatchObject({
      status: BankStatementTransactionStatus.IGNORED,
      ignoredReason: "Already posted from bank interest advice.",
    });

    const refreshedImport = await prisma.bankStatementImport.findUniqueOrThrow({ where: { id: statementImport.id } });
    expect(refreshedImport.status).toBe(BankStatementImportStatus.RECONCILED);

    await expect(bankStatementService.matchCandidates(tenant.organizationId, receiptRow.id)).resolves.toEqual([]);
    const summary = await bankStatementService.reconciliationSummary(tenant.organizationId, tenant.bankProfileId, {
      from: PROOF_FROM,
      to: PROOF_TO,
    });
    expect(summary).toMatchObject({
      ledgerBalance: "111.0000",
      statementClosingBalance: "111.0000",
      difference: "0.0000",
      statusSuggestion: "RECONCILED",
      totals: {
        matched: { count: 1, total: "120.0000" },
        categorized: { count: 1, total: "12.0000" },
        ignored: { count: 1, total: "3.0000" },
        unmatched: { count: 0, total: "0.0000" },
      },
    });

    const draft = await bankReconciliationService.create(tenant.organizationId, tenant.userId, tenant.bankProfileId, {
      periodStart: PROOF_FROM,
      periodEnd: PROOF_TO,
      statementOpeningBalance: "0.0000",
      statementClosingBalance: "111.0000",
      notes: `${fixture.marker} reconciliation matching proof`,
    });
    tenant.reconciliationId = draft.id;
    const submitted = await bankReconciliationService.submit(tenant.organizationId, tenant.userId, draft.id);
    expect(submitted.status).toBe(BankReconciliationStatus.PENDING_APPROVAL);
    const approved = await bankReconciliationService.approve(tenant.organizationId, tenant.approverUserId, draft.id, {
      approvalNotes: "Synthetic local matching proof approved.",
    });
    expect(approved.status).toBe(BankReconciliationStatus.APPROVED);
    const closed = await bankReconciliationService.close(tenant.organizationId, tenant.approverUserId, draft.id);
    expect(closed.status).toBe(BankReconciliationStatus.CLOSED);
    expect(closed.unmatchedTransactionCount).toBe(0);

    const reportData = await bankReconciliationService.reportData(tenant.organizationId, draft.id);
    expect(reportData.summary).toMatchObject({
      itemCount: 3,
      matchedCount: 1,
      categorizedCount: 1,
      ignoredCount: 1,
      matchedRowsCount: 1,
      categorizedRowsCount: 1,
      ignoredRowsCount: 1,
      unmatchedRowsCount: 0,
      unreconciledRowsCount: 0,
    });
    expect(reportData.items.map((item) => item.statusAtClose).sort()).toEqual([
      BankStatementTransactionStatus.CATEGORIZED,
      BankStatementTransactionStatus.IGNORED,
      BankStatementTransactionStatus.MATCHED,
    ]);
    assertTenantBAbsent(reportData, fixture);

    await expect(
      bankStatementService.importStatement(tenant.organizationId, tenant.userId, tenant.bankProfileId, {
        filename: `${fixture.marker}-closed-period.csv`,
        csvText: "date,description,reference,debit,credit,currency\n2026-05-20,Closed row,CLOSED-1,1.0000,0.0000,SAR",
      }),
    ).rejects.toThrow("Cannot import statement transactions into a closed reconciliation period.");
    await expect(
      bankStatementService.ignoreTransaction(tenant.organizationId, tenant.userId, feeRow.id, { reason: "Too late" }),
    ).rejects.toThrow("Statement transaction belongs to a closed reconciliation period.");

    await expect(bankStatementService.getTransaction(tenant.organizationId, fixture.tenantB.receiptTransactionId)).rejects.toThrow(NotFoundException);
    await expect(bankReconciliationService.get(tenant.organizationId, fixture.tenantB.reconciliationId)).rejects.toThrow(NotFoundException);
    const tenantBRow = await prisma.bankStatementTransaction.findUniqueOrThrow({ where: { id: fixture.tenantB.receiptTransactionId } });
    expect(tenantBRow.organizationId).toBe(fixture.tenantB.organizationId);

    await expect(
      bankReconciliationService.reportData(tenant.organizationId, fixture.tenantB.reconciliationId),
    ).rejects.toThrow(NotFoundException);
    const csv = await bankReconciliationService.reportCsvFile(tenant.organizationId, draft.id);
    expect(csv.content).toContain("Bank Reconciliation");
    expect(csv.content).toContain(tenant.bankDisplayName);
    expect(csv.content).not.toContain(fixture.tenantB.bankDisplayName);

    expect(
      await prisma.auditLog.count({
        where: {
          organizationId: tenant.organizationId,
          action: {
            in: [
              "BANK_STATEMENT_TRANSACTION_MATCHED",
              "BANK_STATEMENT_TRANSACTION_CATEGORIZED",
              "BANK_STATEMENT_TRANSACTION_IGNORED",
              "BANK_RECONCILIATION_CLOSED",
            ],
          },
        },
      }),
    ).toBeGreaterThanOrEqual(4);
    expect(await prisma.bankReconciliationReviewEvent.count({ where: { organizationId: tenant.organizationId, reconciliationId: draft.id } })).toBe(3);
  });
});

function requireLocalPostgresUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    throw new Error(
      "LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_RECONCILIATION_MATCHING_DB_INTEGRATION=1. Point it at disposable local Postgres.",
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must be a valid Postgres URL.");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Reconciliation matching proof requires a Postgres URL.");
  }

  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("Reconciliation matching proof is local-only and refuses non-local database hosts.");
  }

  const databaseName = url.pathname.replace(/^\//, "");
  if (!databaseName || databaseName.toLowerCase().includes("prod")) {
    throw new Error("Reconciliation matching proof requires a disposable local database name.");
  }

  return rawUrl;
}

function resolveReconciliationMatchingProofDbSettings(env: NodeJS.ProcessEnv): ReconciliationMatchingProofDbSettings {
  if (env.LEDGERBYTE_RECONCILIATION_MATCHING_DB_INTEGRATION !== "1") {
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
    next: jest.fn(async (_organizationId: string, scope: NumberSequenceScope) => `RMP-${scope}-${++sequence}`),
    preview: jest.fn(async (_organizationId: string, scope: NumberSequenceScope) => ({
      scope,
      nextNumber: `RMP-${scope}-${sequence + 1}`,
      exampleNextNumber: `RMP-${scope}-${sequence + 1}`,
    })),
  } as unknown as NumberSequenceService;
}

async function seedReconciliationMatchingFixture(prisma: PrismaClient): Promise<ReconciliationMatchingFixtureSet> {
  const marker = `RMP-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const uniqueSuffix = marker.replace(/[^A-Za-z0-9]/g, "").slice(-12).toLowerCase();
  const tenantA = fixtureIds(marker, uniqueSuffix, "A");
  const tenantB = fixtureIds(marker, uniqueSuffix, "B");

  await prisma.user.createMany({
    data: [
      {
        id: tenantA.userId,
        email: tenantA.email,
        name: `${marker} Matching Operator A`,
        passwordHash: "reconciliation-matching-local-hash",
      },
      {
        id: tenantA.approverUserId,
        email: tenantA.approverEmail,
        name: `${marker} Matching Approver A`,
        passwordHash: "reconciliation-matching-local-hash",
      },
      {
        id: tenantB.userId,
        email: tenantB.email,
        name: `${marker} Matching Operator B`,
        passwordHash: "reconciliation-matching-local-hash",
      },
      {
        id: tenantB.approverUserId,
        email: tenantB.approverEmail,
        name: `${marker} Matching Approver B`,
        passwordHash: "reconciliation-matching-local-hash",
      },
    ],
  });

  await prisma.organization.createMany({
    data: [
      { id: tenantA.organizationId, name: `${marker} Matching Organization A`, countryCode: "SA", baseCurrency: "SAR", timezone: "Asia/Riyadh" },
      { id: tenantB.organizationId, name: `${marker} Matching Organization B`, countryCode: "SA", baseCurrency: "SAR", timezone: "Asia/Riyadh" },
    ],
  });

  await prisma.role.createMany({
    data: [
      {
        id: tenantA.roleId,
        organizationId: tenantA.organizationId,
        name: `${marker} Matching Owner A`,
        permissions: ["admin.fullAccess"],
        isSystem: true,
      },
      {
        id: tenantB.roleId,
        organizationId: tenantB.organizationId,
        name: `${marker} Matching Owner B`,
        permissions: ["admin.fullAccess"],
        isSystem: true,
      },
    ],
  });

  await prisma.organizationMember.createMany({
    data: [
      { id: tenantA.memberId, organizationId: tenantA.organizationId, userId: tenantA.userId, roleId: tenantA.roleId, status: MembershipStatus.ACTIVE },
      {
        id: tenantA.approverMemberId,
        organizationId: tenantA.organizationId,
        userId: tenantA.approverUserId,
        roleId: tenantA.roleId,
        status: MembershipStatus.ACTIVE,
      },
      { id: tenantB.memberId, organizationId: tenantB.organizationId, userId: tenantB.userId, roleId: tenantB.roleId, status: MembershipStatus.ACTIVE },
      {
        id: tenantB.approverMemberId,
        organizationId: tenantB.organizationId,
        userId: tenantB.approverUserId,
        roleId: tenantB.roleId,
        status: MembershipStatus.ACTIVE,
      },
    ],
  });

  await seedTenantAccountsAndProfile(prisma, tenantA);
  await seedTenantAccountsAndProfile(prisma, tenantB);
  await seedTenantAJournals(prisma, tenantA, marker);
  await seedTenantBJournalsAndStatement(prisma, tenantB, marker);

  return { marker, tenantA, tenantB };
}

function fixtureIds(marker: string, uniqueSuffix: string, tenantLabel: "A" | "B"): ReconciliationMatchingTenantFixture {
  const tenantSuffix = `${uniqueSuffix}-${tenantLabel.toLowerCase()}`;
  return {
    organizationId: randomUUID(),
    userId: randomUUID(),
    approverUserId: randomUUID(),
    email: `reconciliation-matching-${tenantSuffix}@example.test`,
    approverEmail: `reconciliation-matching-approver-${tenantSuffix}@example.test`,
    roleId: randomUUID(),
    memberId: randomUUID(),
    approverMemberId: randomUUID(),
    bankAccountId: randomUUID(),
    revenueAccountId: randomUUID(),
    expenseAccountId: randomUUID(),
    otherAssetAccountId: randomUUID(),
    bankProfileId: randomUUID(),
    bankDisplayName: `${marker} Tenant ${tenantLabel} Operating Bank`,
    receiptJournalEntryId: randomUUID(),
    receiptJournalLineId: randomUUID(),
    draftJournalLineId: randomUUID(),
    wrongAccountJournalLineId: randomUUID(),
    interestJournalLineId: randomUUID(),
    statementImportId: "",
    receiptTransactionId: "",
    feeTransactionId: "",
    interestTransactionId: "",
    reconciliationId: "",
  };
}

async function seedTenantAccountsAndProfile(prisma: PrismaClient, tenant: ReconciliationMatchingTenantFixture): Promise<void> {
  await prisma.account.createMany({
    data: [
      {
        id: tenant.bankAccountId,
        organizationId: tenant.organizationId,
        code: "112",
        name: tenant.bankDisplayName,
        type: AccountType.ASSET,
      },
      {
        id: tenant.revenueAccountId,
        organizationId: tenant.organizationId,
        code: "400",
        name: `${tenant.bankDisplayName} Revenue`,
        type: AccountType.REVENUE,
      },
      {
        id: tenant.expenseAccountId,
        organizationId: tenant.organizationId,
        code: "510",
        name: `${tenant.bankDisplayName} Bank Fees`,
        type: AccountType.EXPENSE,
      },
      {
        id: tenant.otherAssetAccountId,
        organizationId: tenant.organizationId,
        code: "199",
        name: `${tenant.bankDisplayName} Other Asset`,
        type: AccountType.ASSET,
      },
    ],
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

async function seedTenantAJournals(prisma: PrismaClient, tenant: ReconciliationMatchingTenantFixture, marker: string): Promise<void> {
  await createReceiptJournal(prisma, tenant, {
    journalEntryId: tenant.receiptJournalEntryId,
    bankLineId: tenant.receiptJournalLineId,
    entryNumber: `${marker}-A-POSTED-RECEIPT`,
    status: JournalEntryStatus.POSTED,
    amount: "120.0000",
    entryDate: "2026-05-10T00:00:00.000Z",
    bankAccountId: tenant.bankAccountId,
    description: `${marker} Customer receipt PAY-1001`,
    reference: "PAY-1001",
  });
  await createReceiptJournal(prisma, tenant, {
    journalEntryId: randomUUID(),
    bankLineId: tenant.draftJournalLineId,
    entryNumber: `${marker}-A-DRAFT-RECEIPT`,
    status: JournalEntryStatus.DRAFT,
    amount: "120.0000",
    entryDate: "2026-05-10T00:00:00.000Z",
    bankAccountId: tenant.bankAccountId,
    description: `${marker} Draft receipt PAY-1001`,
    reference: "PAY-1001",
  });
  await createReceiptJournal(prisma, tenant, {
    journalEntryId: randomUUID(),
    bankLineId: tenant.wrongAccountJournalLineId,
    entryNumber: `${marker}-A-WRONG-ACCOUNT`,
    status: JournalEntryStatus.POSTED,
    amount: "120.0000",
    entryDate: "2026-05-10T00:00:00.000Z",
    bankAccountId: tenant.otherAssetAccountId,
    description: `${marker} Wrong account receipt PAY-1001`,
    reference: "PAY-1001",
  });
  await createReceiptJournal(prisma, tenant, {
    journalEntryId: randomUUID(),
    bankLineId: tenant.interestJournalLineId,
    entryNumber: `${marker}-A-INTEREST`,
    status: JournalEntryStatus.POSTED,
    amount: "3.0000",
    entryDate: "2026-05-12T00:00:00.000Z",
    bankAccountId: tenant.bankAccountId,
    description: `${marker} Bank interest INT-1`,
    reference: "INT-1",
  });
}

async function seedTenantBJournalsAndStatement(prisma: PrismaClient, tenant: ReconciliationMatchingTenantFixture, marker: string): Promise<void> {
  await createReceiptJournal(prisma, tenant, {
    journalEntryId: tenant.receiptJournalEntryId,
    bankLineId: tenant.receiptJournalLineId,
    entryNumber: `${marker}-B-POSTED-RECEIPT`,
    status: JournalEntryStatus.POSTED,
    amount: "999.0000",
    entryDate: "2026-05-10T00:00:00.000Z",
    bankAccountId: tenant.bankAccountId,
    description: `${marker} Tenant B private receipt`,
    reference: "TENANT-B-PRIVATE",
  });

  const statementImport = await prisma.bankStatementImport.create({
    data: {
      organizationId: tenant.organizationId,
      bankAccountProfileId: tenant.bankProfileId,
      importedById: tenant.userId,
      filename: `${marker}-tenant-b-private.csv`,
      sourceType: "CSV",
      rowCount: 1,
      statementStartDate: new Date("2026-05-01T00:00:00.000Z"),
      statementEndDate: new Date("2026-05-31T00:00:00.000Z"),
      closingStatementBalance: "999.0000",
      transactions: {
        create: [
          {
            organizationId: tenant.organizationId,
            bankAccountProfileId: tenant.bankProfileId,
            transactionDate: new Date("2026-05-10T00:00:00.000Z"),
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
  tenant.statementImportId = statementImport.id;
  tenant.receiptTransactionId = statementImport.transactions[0]!.id;

  const reconciliation = await prisma.bankReconciliation.create({
    data: {
      organizationId: tenant.organizationId,
      bankAccountProfileId: tenant.bankProfileId,
      reconciliationNumber: `${marker}-B-REC`,
      periodStart: new Date("2026-05-01T00:00:00.000Z"),
      periodEnd: new Date("2026-05-31T23:59:59.999Z"),
      statementOpeningBalance: "0.0000",
      statementClosingBalance: "999.0000",
      ledgerClosingBalance: "999.0000",
      difference: "0.0000",
      status: BankReconciliationStatus.DRAFT,
      createdById: tenant.userId,
    },
  });
  tenant.reconciliationId = reconciliation.id;
}

async function createReceiptJournal(
  prisma: PrismaClient,
  tenant: ReconciliationMatchingTenantFixture,
  input: {
    journalEntryId: string;
    bankLineId: string;
    entryNumber: string;
    status: JournalEntryStatus;
    amount: string;
    entryDate: string;
    bankAccountId: string;
    description: string;
    reference: string;
  },
): Promise<void> {
  await createJournalWithBankLine(prisma, tenant, {
    ...input,
    bankLineDebit: input.amount,
    bankLineCredit: "0.0000",
    offsetDebit: "0.0000",
    offsetCredit: input.amount,
  });
}

async function createJournalWithBankLine(
  prisma: PrismaClient,
  tenant: ReconciliationMatchingTenantFixture,
  input: {
    journalEntryId: string;
    bankLineId: string;
    entryNumber: string;
    status: JournalEntryStatus;
    amount: string;
    entryDate: string;
    bankAccountId?: string;
    description: string;
    reference: string;
    bankLineDebit: string;
    bankLineCredit: string;
    offsetDebit: string;
    offsetCredit: string;
  },
): Promise<void> {
  await prisma.journalEntry.create({
    data: {
      id: input.journalEntryId,
      organizationId: tenant.organizationId,
      entryNumber: input.entryNumber,
      status: input.status,
      entryDate: new Date(input.entryDate),
      description: input.description,
      reference: input.reference,
      currency: "SAR",
      totalDebit: input.amount,
      totalCredit: input.amount,
      postedAt: input.status === JournalEntryStatus.POSTED ? new Date(input.entryDate) : null,
      postedById: input.status === JournalEntryStatus.POSTED ? tenant.userId : null,
      createdById: tenant.userId,
      lines: {
        create: [
          {
            id: input.bankLineId,
            organizationId: tenant.organizationId,
            accountId: input.bankAccountId ?? tenant.bankAccountId,
            lineNumber: 1,
            description: input.description,
            debit: input.bankLineDebit,
            credit: input.bankLineCredit,
            currency: "SAR",
          },
          {
            organizationId: tenant.organizationId,
            accountId: tenant.revenueAccountId,
            lineNumber: 2,
            description: `${input.description} offset`,
            debit: input.offsetDebit,
            credit: input.offsetCredit,
            currency: "SAR",
          },
        ],
      },
    },
  });
}

function statementCsv(marker: string): string {
  return [
    "date,description,reference,bankReference,debit,credit,counterparty,currency",
    `2026-05-10,${marker} Customer receipt,PAY-1001,BANK-RECEIPT-1001,0.0000,120.0000,Customer LLC,SAR`,
    `2026-05-11,${marker} Bank service fee,FEE-1001,BANK-FEE-1001,12.0000,0.0000,Sample Bank,SAR`,
    `2026-05-12,${marker} Bank interest,INT-1,BANK-INTEREST-1,0.0000,3.0000,Sample Bank,SAR`,
  ].join("\n");
}

function requireStatementRow(
  rows: Array<{ id: string; description: string }>,
  description: string,
): { id: string; description: string } {
  const row = rows.find((candidate) => candidate.description.includes(description));
  if (!row) {
    throw new Error(`Expected statement row containing ${description}.`);
  }
  return row;
}

function assertTenantBAbsent(value: unknown, fixture: ReconciliationMatchingFixtureSet): void {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  expect(serialized).not.toContain(fixture.tenantB.email);
  expect(serialized).not.toContain(fixture.tenantB.approverEmail);
  expect(serialized).not.toContain(fixture.tenantB.bankDisplayName);
  expect(serialized).not.toContain("Tenant B private receipt");
  expect(serialized).not.toContain("TENANT-B-PRIVATE");
  expect(serialized).not.toContain("999.0000");
}

async function cleanupReconciliationMatchingFixture(prisma: PrismaClient, fixture: ReconciliationMatchingFixtureSet): Promise<void> {
  await prisma.organization.deleteMany({
    where: { id: { in: [fixture.tenantA.organizationId, fixture.tenantB.organizationId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [fixture.tenantA.userId, fixture.tenantA.approverUserId, fixture.tenantB.userId, fixture.tenantB.approverUserId] } },
  });
}
