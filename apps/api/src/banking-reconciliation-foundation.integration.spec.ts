import { NotFoundException } from "@nestjs/common";
import {
  AccountType,
  BankAccountStatus,
  BankAccountType,
  BankReconciliationStatus,
  BankRuleActionType,
  BankRuleDirection,
  BankStatementImportStatus,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
  JournalEntryStatus,
  MembershipStatus,
  NumberSequenceScope,
  PrismaClient,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AuditLogService } from "./audit-log/audit-log.service";
import { BankAccountService } from "./bank-accounts/bank-account.service";
import { BankReconciliationService } from "./bank-reconciliations/bank-reconciliation.service";
import { BankRulesService } from "./bank-rules/bank-rules.service";
import { BankStatementService } from "./bank-statements/bank-statement.service";
import { FiscalPeriodGuardService } from "./fiscal-periods/fiscal-period-guard.service";
import { NumberSequenceService } from "./number-sequences/number-sequence.service";
import { PrismaService } from "./prisma/prisma.service";
import { ReportsService } from "./reports/reports.service";

type BankingProofDbSettings =
  | { enabled: false; databaseUrl?: undefined }
  | { enabled: true; databaseUrl: string };

interface BankingProofFixtureSet {
  marker: string;
  tenantA: BankingTenantFixture;
  tenantB: BankingTenantFixture;
}

interface BankingTenantFixture {
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
  bankProfileId: string;
  bankDisplayName: string;
  revenueAccountName: string;
  expenseAccountName: string;
  seedJournalEntryId: string;
  seedJournalEntryNumber: string;
  seedJournalLineId: string;
  statementImportId: string;
  statementCreditTransactionId: string;
  statementDebitTransactionId: string;
  bankRuleId: string;
  reconciliationId: string;
}

const DB_INTEGRATION_SETTINGS = resolveBankingProofDbSettings(process.env);
const DATABASE_URL = DB_INTEGRATION_SETTINGS.enabled ? DB_INTEGRATION_SETTINGS.databaseUrl : undefined;
const describeBankingProofDb = DB_INTEGRATION_SETTINGS.enabled ? describe : describe.skip;
const PROOF_FROM = "2026-04-01";
const PROOF_TO = "2026-04-30";

describe("banking reconciliation foundation DB URL gate", () => {
  it("skips safely when the opt-in environment variable is not set", () => {
    expect(resolveBankingProofDbSettings({} as NodeJS.ProcessEnv)).toEqual({ enabled: false });
  });

  it("requires LEDGERBYTE_TEST_DATABASE_URL when the banking foundation proof is enabled", () => {
    expect(() =>
      resolveBankingProofDbSettings({
        LEDGERBYTE_BANKING_RECONCILIATION_DB_INTEGRATION: "1",
        DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_BANKING_RECONCILIATION_DB_INTEGRATION=1");
  });

  it("rejects hosted or non-local database URLs", () => {
    expect(() =>
      resolveBankingProofDbSettings({
        LEDGERBYTE_BANKING_RECONCILIATION_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@db.example.com/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("local-only");
  });

  it("rejects production-looking database names", () => {
    expect(() =>
      resolveBankingProofDbSettings({
        LEDGERBYTE_BANKING_RECONCILIATION_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting_prod?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("disposable local database name");
  });

  it("accepts an explicit disposable local test database URL", () => {
    const localUrl = "postgresql://accounting:accounting@localhost:5432/accounting?schema=public";

    expect(
      resolveBankingProofDbSettings({
        LEDGERBYTE_BANKING_RECONCILIATION_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: localUrl,
      } as NodeJS.ProcessEnv),
    ).toEqual({ enabled: true, databaseUrl: localUrl });
  });
});

describeBankingProofDb("banking reconciliation foundation proof: Prisma-backed local DB", () => {
  jest.setTimeout(120_000);

  let prisma: PrismaClient;
  let fixture: BankingProofFixtureSet;
  let bankAccountService: BankAccountService;
  let bankStatementService: BankStatementService;
  let bankRulesService: BankRulesService;
  let bankReconciliationService: BankReconciliationService;
  let reportsService: ReportsService;

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

    bankAccountService = new BankAccountService(
      prisma as unknown as PrismaService,
      auditLogService,
      numberSequenceService,
      fiscalPeriodGuardService,
    );
    bankStatementService = new BankStatementService(
      prisma as unknown as PrismaService,
      auditLogService,
      numberSequenceService,
      fiscalPeriodGuardService,
    );
    bankRulesService = new BankRulesService(prisma as unknown as PrismaService, bankStatementService);
    bankReconciliationService = new BankReconciliationService(
      prisma as unknown as PrismaService,
      auditLogService,
      numberSequenceService,
    );
    reportsService = new ReportsService(prisma as unknown as PrismaService);

    fixture = await seedBankingProofFixture(prisma);
  });

  afterAll(async () => {
    if (fixture) {
      await cleanupBankingProofFixture(prisma, fixture);
    }
    await prisma.$disconnect();
  });

  it("proves statement import, explicit match, bank-rule apply, reconciliation close, and report evidence", async () => {
    const tenant = fixture.tenantA;
    const preview = await bankStatementService.previewImport(tenant.organizationId, tenant.bankProfileId, {
      filename: `${fixture.marker}-april.csv`,
      csvText: statementCsv(fixture.marker),
    });

    expect(preview.summary).toMatchObject({ sourceRowCount: 2, importableRowCount: 2, blockedRowCount: 0 });
    expect(await prisma.bankStatementImport.count({ where: { organizationId: tenant.organizationId } })).toBe(0);

    const createdImport = await bankStatementService.importStatement(tenant.organizationId, tenant.userId, tenant.bankProfileId, {
      filename: `${fixture.marker}-april.csv`,
      csvText: statementCsv(fixture.marker),
      openingStatementBalance: "0.0000",
      closingStatementBalance: "75.0000",
    });
    tenant.statementImportId = createdImport.id;
    expect(createdImport.status).toBe(BankStatementImportStatus.IMPORTED);

    const rows = await bankStatementService.listTransactions(tenant.organizationId, tenant.bankProfileId, {
      from: PROOF_FROM,
      to: PROOF_TO,
    });
    const creditRow = requireStatementRow(rows, "Customer receipt");
    const feeRow = requireStatementRow(rows, "Monthly bank fee");
    tenant.statementCreditTransactionId = creditRow.id;
    tenant.statementDebitTransactionId = feeRow.id;

    const candidates = await bankStatementService.matchCandidates(tenant.organizationId, creditRow.id);
    expect(candidates.map((candidate) => candidate.journalLineId)).toContain(tenant.seedJournalLineId);

    const matched = await bankStatementService.matchTransaction(tenant.organizationId, tenant.userId, creditRow.id, {
      journalLineId: tenant.seedJournalLineId,
    });
    expect(matched.status).toBe(BankStatementTransactionStatus.MATCHED);
    expect(matched.matchedJournalEntryId).toBe(tenant.seedJournalEntryId);

    const rule = await bankRulesService.createRule(tenant.organizationId, tenant.userId, {
      name: `${fixture.marker} Bank fees`,
      bankAccountProfileId: tenant.bankProfileId,
      priority: 1,
      direction: BankRuleDirection.DEBIT,
      descriptionContains: "bank fee",
      amountEquals: "25.0000",
      currencyEquals: "SAR",
      actionType: BankRuleActionType.SUGGEST_CATEGORIZE,
      categorizeAccountId: tenant.expenseAccountId,
    });
    tenant.bankRuleId = rule.id;

    const dryRun = await bankRulesService.dryRunRule(tenant.organizationId, rule.id, {
      bankAccountProfileId: tenant.bankProfileId,
      limit: 10,
    });
    expect(dryRun.suggestions).toHaveLength(1);
    expect(dryRun.suggestions[0]?.transaction.id).toBe(feeRow.id);

    const suggestion = await bankRulesService.suggestionsForTransaction(tenant.organizationId, feeRow.id);
    expect(suggestion.suggestions).toEqual([
      expect.objectContaining({ ruleId: rule.id, actionType: BankRuleActionType.SUGGEST_CATEGORIZE }),
    ]);

    const applied = await bankRulesService.applySuggestion(tenant.organizationId, tenant.userId, feeRow.id, { ruleId: rule.id });
    expect(applied.transaction.status).toBe(BankStatementTransactionStatus.CATEGORIZED);
    expect(applied.transaction.createdJournalEntryId).toBeTruthy();

    const summary = await bankStatementService.reconciliationSummary(tenant.organizationId, tenant.bankProfileId, {
      from: PROOF_FROM,
      to: PROOF_TO,
    });
    expect(summary).toMatchObject({
      ledgerBalance: "75.0000",
      statementClosingBalance: "75.0000",
      difference: "0.0000",
      statusSuggestion: "RECONCILED",
      totals: {
        matched: { count: 1, total: "100.0000" },
        categorized: { count: 1, total: "25.0000" },
        unmatched: { count: 0, total: "0.0000" },
      },
    });

    const draft = await bankReconciliationService.create(tenant.organizationId, tenant.userId, tenant.bankProfileId, {
      periodStart: PROOF_FROM,
      periodEnd: PROOF_TO,
      statementOpeningBalance: "0.0000",
      statementClosingBalance: "75.0000",
      notes: `${fixture.marker} local banking proof reconciliation`,
    });
    tenant.reconciliationId = draft.id;
    expect(draft.status).toBe(BankReconciliationStatus.DRAFT);
    expect(draft.difference.toString()).toBe("0");

    const submitted = await bankReconciliationService.submit(tenant.organizationId, tenant.userId, draft.id);
    expect(submitted.status).toBe(BankReconciliationStatus.PENDING_APPROVAL);

    const approved = await bankReconciliationService.approve(tenant.organizationId, tenant.approverUserId, draft.id, {
      approvalNotes: "Local synthetic proof approved.",
    });
    expect(approved.status).toBe(BankReconciliationStatus.APPROVED);

    const closed = await bankReconciliationService.close(tenant.organizationId, tenant.approverUserId, draft.id);
    expect(closed.status).toBe(BankReconciliationStatus.CLOSED);
    expect(closed.unmatchedTransactionCount).toBe(0);

    const reportData = await bankReconciliationService.reportData(tenant.organizationId, draft.id);
    expect(reportData.summary).toMatchObject({
      itemCount: 2,
      matchedCount: 1,
      categorizedCount: 1,
      unmatchedRowsCount: 0,
      unreconciledRowsCount: 0,
    });
    expect(reportData.auditTimeline.map((event) => event.type)).toEqual(
      expect.arrayContaining(["STATEMENT_IMPORT", "STATEMENT_ROW_REVIEW", "BANK_RULE_APPLIED", "RECONCILIATION_REVIEW", "AUDIT_LOG"]),
    );
    assertTenantBAbsent(reportData, fixture);

    const csv = await bankReconciliationService.reportCsvFile(tenant.organizationId, draft.id);
    expect(csv.content.toLowerCase()).toContain("manual statement import only");
    expect(csv.content).toContain("Bank Reconciliation");
    expect(csv.content).toContain(tenant.bankDisplayName);
    expect(csv.content).not.toContain(fixture.tenantB.bankDisplayName);

    const dashboard = await reportsService.dashboardSummary(tenant.organizationId, {
      from: PROOF_FROM,
      to: PROOF_TO,
      asOf: PROOF_TO,
    });
    expect(dashboard.cashAndBank).toMatchObject({ balance: "75.0000", accountCount: 1 });
    assertTenantBAbsent(dashboard, fixture);
  });

  it("proves closed-period guards and cross-tenant banking reads remain enforced", async () => {
    const tenant = fixture.tenantA;

    await expect(
      bankStatementService.importStatement(tenant.organizationId, tenant.userId, tenant.bankProfileId, {
        filename: `${fixture.marker}-closed-overlap.csv`,
        csvText: "date,description,reference,debit,credit,currency\n2026-04-20,Closed period row,CLOSED-1,1.0000,0.0000,SAR",
      }),
    ).rejects.toThrow("Cannot import statement transactions into a closed reconciliation period.");

    await expect(
      bankStatementService.getImport(tenant.organizationId, fixture.tenantB.statementImportId),
    ).rejects.toThrow(NotFoundException);
    await expect(
      bankStatementService.getTransaction(tenant.organizationId, fixture.tenantB.statementCreditTransactionId),
    ).rejects.toThrow(NotFoundException);
    await expect(
      bankReconciliationService.get(tenant.organizationId, fixture.tenantB.reconciliationId),
    ).rejects.toThrow(NotFoundException);
    await expect(
      bankRulesService.updateRule(tenant.organizationId, tenant.userId, fixture.tenantB.bankRuleId, {
        name: `${fixture.marker} blocked foreign rule update`,
      }),
    ).rejects.toThrow(NotFoundException);

    const tenantBRule = await prisma.bankRule.findUniqueOrThrow({ where: { id: fixture.tenantB.bankRuleId } });
    expect(tenantBRule.name).toContain("Tenant B");

    const tenantAAccounts = await bankAccountService.list(tenant.organizationId);
    expect(tenantAAccounts.map((profile) => profile.id)).toContain(tenant.bankProfileId);
    expect(tenantAAccounts.map((profile) => profile.id)).not.toContain(fixture.tenantB.bankProfileId);
  });
});

function requireLocalPostgresUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    throw new Error(
      "LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_BANKING_RECONCILIATION_DB_INTEGRATION=1. Point it at disposable local Postgres.",
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must be a valid Postgres URL.");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Banking reconciliation DB proof requires a Postgres URL.");
  }

  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("Banking reconciliation DB proof is local-only and refuses non-local database hosts.");
  }

  const databaseName = url.pathname.replace(/^\//, "");
  if (!databaseName || databaseName.toLowerCase().includes("prod")) {
    throw new Error("Banking reconciliation DB proof requires a disposable local database name.");
  }

  return rawUrl;
}

function resolveBankingProofDbSettings(env: NodeJS.ProcessEnv): BankingProofDbSettings {
  if (env.LEDGERBYTE_BANKING_RECONCILIATION_DB_INTEGRATION !== "1") {
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
    next: jest.fn(async (_organizationId: string, scope: NumberSequenceScope) => `BRF-${scope}-${++sequence}`),
    preview: jest.fn(async (_organizationId: string, scope: NumberSequenceScope) => ({
      scope,
      nextNumber: `BRF-${scope}-${sequence + 1}`,
      exampleNextNumber: `BRF-${scope}-${sequence + 1}`,
    })),
  } as unknown as NumberSequenceService;
}

async function seedBankingProofFixture(prisma: PrismaClient): Promise<BankingProofFixtureSet> {
  const marker = `BRF-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const uniqueSuffix = marker.replace(/[^A-Za-z0-9]/g, "").slice(-12).toLowerCase();
  const tenantA = fixtureIds(marker, uniqueSuffix, "A");
  const tenantB = fixtureIds(marker, uniqueSuffix, "B");

  await prisma.user.createMany({
    data: [
      {
        id: tenantA.userId,
        email: tenantA.email,
        name: `${marker} Operator A`,
        passwordHash: "banking-reconciliation-local-hash",
      },
      {
        id: tenantA.approverUserId,
        email: tenantA.approverEmail,
        name: `${marker} Approver A`,
        passwordHash: "banking-reconciliation-local-hash",
      },
      {
        id: tenantB.userId,
        email: tenantB.email,
        name: `${marker} Operator B`,
        passwordHash: "banking-reconciliation-local-hash",
      },
      {
        id: tenantB.approverUserId,
        email: tenantB.approverEmail,
        name: `${marker} Approver B`,
        passwordHash: "banking-reconciliation-local-hash",
      },
    ],
  });

  await prisma.organization.createMany({
    data: [
      { id: tenantA.organizationId, name: `${marker} Organization A`, countryCode: "SA", baseCurrency: "SAR", timezone: "Asia/Riyadh" },
      { id: tenantB.organizationId, name: `${marker} Organization B`, countryCode: "SA", baseCurrency: "SAR", timezone: "Asia/Riyadh" },
    ],
  });

  await prisma.role.createMany({
    data: [
      {
        id: tenantA.roleId,
        organizationId: tenantA.organizationId,
        name: `${marker} Banking Owner A`,
        permissions: ["admin.fullAccess"],
        isSystem: true,
      },
      {
        id: tenantB.roleId,
        organizationId: tenantB.organizationId,
        name: `${marker} Banking Owner B`,
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

  await Promise.all([seedTenantBankingRecords(prisma, tenantA, "100.0000", true), seedTenantBankingRecords(prisma, tenantB, "999.0000", false)]);

  return { marker, tenantA, tenantB };
}

function fixtureIds(marker: string, uniqueSuffix: string, tenantLabel: "A" | "B"): BankingTenantFixture {
  const tenantSuffix = `${uniqueSuffix}-${tenantLabel.toLowerCase()}`;
  return {
    organizationId: randomUUID(),
    userId: randomUUID(),
    approverUserId: randomUUID(),
    email: `banking-reconciliation-${tenantSuffix}@example.test`,
    approverEmail: `banking-reconciliation-approver-${tenantSuffix}@example.test`,
    roleId: randomUUID(),
    memberId: randomUUID(),
    approverMemberId: randomUUID(),
    bankAccountId: randomUUID(),
    revenueAccountId: randomUUID(),
    expenseAccountId: randomUUID(),
    bankProfileId: randomUUID(),
    bankDisplayName: `${marker} Tenant ${tenantLabel} Operating Bank`,
    revenueAccountName: `${marker} Tenant ${tenantLabel} Revenue`,
    expenseAccountName: `${marker} Tenant ${tenantLabel} Bank Fees`,
    seedJournalEntryId: randomUUID(),
    seedJournalEntryNumber: `${marker}-JE-${tenantLabel}`,
    seedJournalLineId: randomUUID(),
    statementImportId: "",
    statementCreditTransactionId: "",
    statementDebitTransactionId: "",
    bankRuleId: "",
    reconciliationId: "",
  };
}

async function seedTenantBankingRecords(
  prisma: PrismaClient,
  tenant: BankingTenantFixture,
  bankAmount: string,
  usesFullProofFlow: boolean,
): Promise<void> {
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
        name: tenant.revenueAccountName,
        type: AccountType.REVENUE,
      },
      {
        id: tenant.expenseAccountId,
        organizationId: tenant.organizationId,
        code: "510",
        name: tenant.expenseAccountName,
        type: AccountType.EXPENSE,
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

  await prisma.journalEntry.create({
    data: {
      id: tenant.seedJournalEntryId,
      organizationId: tenant.organizationId,
      entryNumber: tenant.seedJournalEntryNumber,
      status: JournalEntryStatus.POSTED,
      entryDate: new Date("2026-04-10T00:00:00.000Z"),
      description: `${tenant.bankDisplayName} customer receipt posting`,
      reference: `${tenant.seedJournalEntryNumber}-REF`,
      currency: "SAR",
      totalDebit: bankAmount,
      totalCredit: bankAmount,
      postedAt: new Date("2026-04-10T00:00:00.000Z"),
      postedById: tenant.userId,
      createdById: tenant.userId,
      lines: {
        create: [
          {
            id: tenant.seedJournalLineId,
            organizationId: tenant.organizationId,
            accountId: tenant.bankAccountId,
            lineNumber: 1,
            description: `${tenant.bankDisplayName} customer receipt`,
            debit: bankAmount,
            credit: "0.0000",
            currency: "SAR",
          },
          {
            organizationId: tenant.organizationId,
            accountId: tenant.revenueAccountId,
            lineNumber: 2,
            description: `${tenant.revenueAccountName} customer receipt`,
            debit: "0.0000",
            credit: bankAmount,
            currency: "SAR",
          },
        ],
      },
    },
  });

  if (usesFullProofFlow) {
    return;
  }

  const statementImport = await prisma.bankStatementImport.create({
    data: {
      organizationId: tenant.organizationId,
      bankAccountProfileId: tenant.bankProfileId,
      importedById: tenant.userId,
      filename: `${tenant.bankDisplayName}-statement.csv`,
      sourceType: "CSV",
      rowCount: 1,
      statementStartDate: new Date("2026-04-01T00:00:00.000Z"),
      statementEndDate: new Date("2026-04-30T00:00:00.000Z"),
      closingStatementBalance: bankAmount,
      transactions: {
        create: [
          {
            organizationId: tenant.organizationId,
            bankAccountProfileId: tenant.bankProfileId,
            transactionDate: new Date("2026-04-10T00:00:00.000Z"),
            description: `${tenant.bankDisplayName} foreign tenant receipt`,
            reference: `${tenant.seedJournalEntryNumber}-STMT`,
            type: BankStatementTransactionType.CREDIT,
            amount: bankAmount,
            status: BankStatementTransactionStatus.UNMATCHED,
            rawData: { normalized: { currency: "SAR", counterparty: tenant.bankDisplayName } },
          },
        ],
      },
    },
    include: { transactions: true },
  });
  tenant.statementImportId = statementImport.id;
  tenant.statementCreditTransactionId = statementImport.transactions[0]!.id;

  const bankRule = await prisma.bankRule.create({
    data: {
      organizationId: tenant.organizationId,
      bankAccountProfileId: tenant.bankProfileId,
      name: `${tenant.bankDisplayName} Tenant B rule`,
      priority: 1,
      direction: BankRuleDirection.CREDIT,
      descriptionContains: "foreign tenant",
      actionType: BankRuleActionType.SUGGEST_MATCH_CANDIDATES,
      createdById: tenant.userId,
      updatedById: tenant.userId,
    },
  });
  tenant.bankRuleId = bankRule.id;

  const reconciliation = await prisma.bankReconciliation.create({
    data: {
      organizationId: tenant.organizationId,
      bankAccountProfileId: tenant.bankProfileId,
      reconciliationNumber: `${tenant.seedJournalEntryNumber}-REC`,
      periodStart: new Date("2026-04-01T00:00:00.000Z"),
      periodEnd: new Date("2026-04-30T23:59:59.999Z"),
      statementOpeningBalance: "0.0000",
      statementClosingBalance: bankAmount,
      ledgerClosingBalance: bankAmount,
      difference: "0.0000",
      status: BankReconciliationStatus.DRAFT,
      createdById: tenant.userId,
    },
  });
  tenant.reconciliationId = reconciliation.id;
}

function statementCsv(marker: string): string {
  return [
    "date,description,reference,bankReference,debit,credit,counterparty,currency",
    `2026-04-10,${marker} Customer receipt,BRF-RECEIPT-1,BANK-REF-RECEIPT-1,0.0000,100.0000,Customer LLC,SAR`,
    `2026-04-11,${marker} Monthly bank fee,BRF-FEE-1,BANK-REF-FEE-1,25.0000,0.0000,Sample Bank,SAR`,
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

function assertTenantBAbsent(value: unknown, fixture: BankingProofFixtureSet): void {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  expect(serialized).not.toContain(fixture.tenantB.email);
  expect(serialized).not.toContain(fixture.tenantB.approverEmail);
  expect(serialized).not.toContain(fixture.tenantB.bankDisplayName);
  expect(serialized).not.toContain(fixture.tenantB.revenueAccountName);
  expect(serialized).not.toContain(fixture.tenantB.expenseAccountName);
  expect(serialized).not.toContain(fixture.tenantB.seedJournalEntryNumber);
  expect(serialized).not.toContain("999.0000");
}

async function cleanupBankingProofFixture(prisma: PrismaClient, fixture: BankingProofFixtureSet): Promise<void> {
  await prisma.organization.deleteMany({
    where: { id: { in: [fixture.tenantA.organizationId, fixture.tenantB.organizationId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [fixture.tenantA.userId, fixture.tenantA.approverUserId, fixture.tenantB.userId, fixture.tenantB.approverUserId] } },
  });
}
