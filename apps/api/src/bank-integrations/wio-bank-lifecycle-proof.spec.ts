import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BankBeneficiaryMappingStatus,
  BankIntegrationProvider,
  BankIntegrationStatus,
  BankPaymentRequestStatus,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
  ContactType,
  PurchaseBillStatus,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AUDIT_EVENTS } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { BankIntegrationService } from "./bank-integration.service";
import {
  assertWioBankLifecycleEvidenceIsSafe,
  buildWioBankLifecycleProofEvidence,
  renderWioBankLifecycleEvidenceMarkdown,
  type WioBankLifecycleProofEvidence,
} from "./wio-bank-lifecycle-proof";

describe("Wio bank lifecycle local proof", () => {
  it("exercises mock connection, sync, beneficiary mapping, payment request, blocked release, external release, reconciliation, audit, requestId, and tenant scope", async () => {
    const harness = makeHarness();
    const fixture = seedWioLifecycleFixture(harness.store);

    const connection = await harness.withRequest("req-wio-connection", () =>
      harness.service.createConnection(fixture.tenantA.organizationId, fixture.tenantA.userId, {
        provider: BankIntegrationProvider.MOCK_WIO,
        displayName: "Wio local lifecycle mock",
        externalConnectionRef: RAW_CONNECTION_REF,
      }),
    );

    const sync = await harness.withRequest("req-wio-sync", () =>
      harness.service.recordMockFeedSync(fixture.tenantA.organizationId, fixture.tenantA.userId, connection.id, {
        account: {
          displayName: "Wio AED operating account",
          currency: "AED",
          accountRef: RAW_IBAN,
          externalAccountRef: RAW_ACCOUNT_REF,
        },
        transactions: [
          {
            transactionDate: "2026-07-08",
            description: "Supplier payout fixture",
            reference: "supplier-payout-fixture",
            type: BankStatementTransactionType.DEBIT,
            amount: "125.00",
            currency: "AED",
            externalTransactionRef: RAW_TRANSACTION_REF,
          },
        ],
      }),
    );

    const mapping = await harness.withRequest("req-wio-beneficiary", () =>
      harness.service.upsertBeneficiaryMapping(fixture.tenantA.organizationId, fixture.tenantA.userId, {
        supplierId: fixture.tenantA.supplierId,
        bankConnectionId: connection.id,
        status: BankBeneficiaryMappingStatus.MAPPED,
        beneficiaryDisplayName: "Lifecycle Supplier",
        beneficiaryRef: RAW_BENEFICIARY_REF,
        externalBeneficiaryRef: RAW_EXTERNAL_BENEFICIARY_REF,
      }),
    );

    const created = await harness.withRequest("req-wio-payment-create", () =>
      harness.service.createPaymentRequest(fixture.tenantA.organizationId, fixture.tenantA.userId, {
        supplierId: fixture.tenantA.supplierId,
        purchaseBillId: fixture.tenantA.purchaseBillId,
        bankConnectionId: connection.id,
        beneficiaryMappingId: mapping.id,
        amount: "125.00",
        currency: "AED",
        memo: "Local lifecycle proof only",
      }),
    );
    const approved = await harness.withRequest("req-wio-payment-approve", () =>
      harness.service.approvePaymentRequest(fixture.tenantA.organizationId, fixture.tenantA.approverId, created.id),
    );
    const blocked = await harness.withRequest("req-wio-payment-block", () =>
      harness.service.blockRelease(fixture.tenantA.organizationId, fixture.tenantA.approverId, created.id),
    );
    const released = await harness.withRequest("req-wio-manual-release", () =>
      harness.service.markExternallyReleased(fixture.tenantA.organizationId, fixture.tenantA.adminId, created.id, {
        externalReleaseReference: RAW_MANUAL_RELEASE_REF,
        note: "Operator confirmed a manual bank-portal release outside LedgerByte.",
      }),
    );
    const reconciled = await harness.withRequest("req-wio-reconcile", () =>
      harness.service.reconcilePaymentRequest(fixture.tenantA.organizationId, fixture.tenantA.accountantId, created.id, {
        bankFeedTransactionId: sync.transactions[0]!.id,
        bankStatementTransactionId: fixture.tenantA.statementTransactionId,
      }),
    );

    await expect(
      harness.service.createPaymentRequest(fixture.tenantA.organizationId, fixture.tenantA.userId, {
        supplierId: fixture.tenantB.supplierId,
        amount: "125.00",
        currency: "AED",
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      harness.service.reconcilePaymentRequest(fixture.tenantA.organizationId, fixture.tenantA.accountantId, created.id, {
        bankFeedTransactionId: fixture.tenantB.feedTransactionId,
      }),
    ).rejects.toThrow(BadRequestException);

    const tenantARequests = (await harness.service.listPaymentRequests(fixture.tenantA.organizationId)) as StoreRow[];
    expect(tenantARequests.map((request) => request.id)).toContain(created.id);
    expect(tenantARequests.map((request) => request.id)).not.toContain(fixture.tenantB.paymentRequestId);

    expect(connection).toMatchObject({
      status: BankIntegrationStatus.READY_FOR_MOCK,
      externalConnectionRefMasked: "masked_7890",
      requestId: "req-wio-connection",
      noRealWioApiCalls: true,
    });
    expect(sync.feedAccount).toMatchObject({
      status: BankIntegrationStatus.SYNCED,
      accountRefMasked: "masked_3456",
      externalAccountRefMasked: "masked_1111",
      requestId: "req-wio-sync",
    });
    expect(sync.transactions[0]).toMatchObject({
      externalTransactionRefMasked: "masked_2222",
      requestId: "req-wio-sync",
    });
    expect(mapping).toMatchObject({
      status: BankBeneficiaryMappingStatus.MAPPED,
      beneficiaryRefMasked: "masked_3333",
      externalBeneficiaryRefMasked: "masked_4444",
      requestId: "req-wio-beneficiary",
    });
    expect(created).toMatchObject({ status: BankPaymentRequestStatus.DRAFT, requestId: "req-wio-payment-create" });
    expect(approved).toMatchObject({ status: BankPaymentRequestStatus.APPROVED, requestId: "req-wio-payment-approve" });
    expect(blocked).toMatchObject({
      status: BankPaymentRequestStatus.RELEASE_BLOCKED,
      releaseAttempted: false,
      noMoneyMovement: true,
      requestId: "req-wio-payment-block",
    });
    expect(released).toMatchObject({
      status: BankPaymentRequestStatus.RELEASED_EXTERNALLY,
      externalReleaseReferenceMasked: "masked_5555",
      externalReleaseRecordedOnly: true,
      requestId: "req-wio-manual-release",
    });
    expect(reconciled).toMatchObject({
      status: BankPaymentRequestStatus.RECONCILED,
      bankFeedTransactionId: sync.transactions[0]!.id,
      bankStatementTransactionId: fixture.tenantA.statementTransactionId,
      requestId: "req-wio-reconcile",
    });

    const auditActions = harness.store.auditLogs.map((log) => log.action);
    expect(auditActions).toEqual(
      expect.arrayContaining([
        AUDIT_EVENTS.BANK_CONNECTION_CREATED,
        AUDIT_EVENTS.BANK_MOCK_SYNC_RECORDED,
        AUDIT_EVENTS.BANK_BENEFICIARY_MAPPING_CREATED,
        AUDIT_EVENTS.BANK_PAYMENT_REQUEST_CREATED,
        AUDIT_EVENTS.BANK_PAYMENT_REQUEST_APPROVED,
        AUDIT_EVENTS.BANK_PAYMENT_RELEASE_BLOCKED,
        AUDIT_EVENTS.BANK_PAYMENT_REQUEST_EXTERNALLY_RELEASED,
        AUDIT_EVENTS.BANK_PAYMENT_REQUEST_RECONCILED,
      ]),
    );
    expect(harness.store.auditLogs.every((log) => log.requestId?.startsWith("req-wio-"))).toBe(true);

    const evidence = buildWioBankLifecycleProofEvidence({
      generatedAt: "2026-07-08T00:00:00.000Z",
      gitCommit: "local-test",
      sourceBase: "codex/wio-bank-integration-readiness",
      proofScope: "local-test-only",
      provider: "MOCK_WIO",
      result: "PASS",
      lifecycle: {
        connectionStatus: connection.status,
        feedAccountStatus: sync.feedAccount.status,
        syncRunStatus: sync.syncRun.status,
        feedTransactionCount: sync.transactions.length,
        beneficiaryMappingStatus: mapping.status,
        paymentRequestStatuses: [created.status, approved.status, blocked.status, released.status, reconciled.status],
        releaseAttempted: false,
        externalReleaseRecordedOnly: true,
        reconciliationLinked: Boolean(reconciled.bankFeedTransactionId && reconciled.bankStatementTransactionId),
      },
      counts: {
        organizationsSeeded: harness.store.organizations.length,
        suppliersSeeded: harness.store.contacts.filter((contact) => contact.type === ContactType.SUPPLIER).length,
        purchaseBillsSeeded: harness.store.purchaseBills.length,
        bankConnections: harness.store.bankConnections.filter((row) => row.organizationId === fixture.tenantA.organizationId).length,
        bankFeedAccounts: harness.store.bankFeedAccounts.filter((row) => row.organizationId === fixture.tenantA.organizationId).length,
        bankFeedSyncRuns: harness.store.bankFeedSyncRuns.filter((row) => row.organizationId === fixture.tenantA.organizationId).length,
        bankFeedTransactions: harness.store.bankFeedTransactions.filter((row) => row.organizationId === fixture.tenantA.organizationId).length,
        beneficiaryMappings: harness.store.bankBeneficiaryMappings.filter((row) => row.organizationId === fixture.tenantA.organizationId).length,
        paymentRequests: harness.store.bankPaymentRequests.filter((row) => row.organizationId === fixture.tenantA.organizationId).length,
        auditEvents: harness.store.auditLogs.filter((row) => row.organizationId === fixture.tenantA.organizationId).length,
        requestIdsCaptured: new Set(
          [
            ...harness.store.bankConnections,
            ...harness.store.bankFeedAccounts,
            ...harness.store.bankFeedSyncRuns,
            ...harness.store.bankFeedTransactions,
            ...harness.store.bankBeneficiaryMappings,
            ...harness.store.bankPaymentRequests,
            ...harness.store.auditLogs,
          ]
            .map((row) => row.requestId)
            .filter(Boolean),
        ).size,
      },
      tenantIsolation: {
        crossTenantSupplierBlocked: true,
        crossTenantFeedTransactionBlocked: true,
        tenantBRecordsHiddenFromTenantAList: true,
      },
      auditTrail: harness.store.auditLogs
        .filter((row) => row.organizationId === fixture.tenantA.organizationId)
        .map((row) => ({ action: row.action, entityType: row.entityType, hasRequestId: Boolean(row.requestId) })),
      safety: {
        noRealWioApiCalls: true,
        noRealMoneyMovement: true,
        noBankCredentialsStored: true,
        noHostedMutation: true,
        rawProviderPayloadsStored: false,
        rawBankDetailsIncluded: false,
        zatcaOrUaeComplianceTouched: false,
      },
    });

    const serializedEvidence = JSON.stringify(evidence);
    expect(serializedEvidence).not.toContain(RAW_IBAN);
    expect(serializedEvidence).not.toContain(RAW_ACCOUNT_REF);
    expect(serializedEvidence).not.toContain(RAW_CONNECTION_REF);
    expect(serializedEvidence).not.toContain(RAW_TRANSACTION_REF);
    expect(serializedEvidence).not.toContain(RAW_BENEFICIARY_REF);
    expect(serializedEvidence).not.toContain(RAW_EXTERNAL_BENEFICIARY_REF);
    expect(serializedEvidence).not.toContain(RAW_MANUAL_RELEASE_REF);
    expect(renderWioBankLifecycleEvidenceMarkdown(evidence)).toContain("No real money movement was attempted.");
  });

  it("keeps committed JSON and Markdown evidence free of raw bank details or secret-shaped values", () => {
    const jsonEvidencePath = join(process.cwd(), "..", "..", "docs", "banking", "evidence", "WIO_BANK_LIFECYCLE_PROOF.json");
    const markdownEvidencePath = join(process.cwd(), "..", "..", "docs", "banking", "evidence", "WIO_BANK_LIFECYCLE_PROOF.md");
    const jsonEvidence = JSON.parse(readFileSync(jsonEvidencePath, "utf8")) as WioBankLifecycleProofEvidence;
    const markdownEvidence = readFileSync(markdownEvidencePath, "utf8");

    assertWioBankLifecycleEvidenceIsSafe(jsonEvidence);
    assertWioBankLifecycleEvidenceIsSafe(markdownEvidence);
    expect(jsonEvidence).toMatchObject({
      proofScope: "local-test-only",
      result: "PASS",
      safety: {
        noRealWioApiCalls: true,
        noRealMoneyMovement: true,
        noBankCredentialsStored: true,
        noHostedMutation: true,
        zatcaOrUaeComplianceTouched: false,
      },
    });
    expect(markdownEvidence).toContain("No real Wio API calls were made.");
    expect(markdownEvidence).toContain("No real money movement was attempted.");
  });

  it("rejects unsafe evidence values before they can be persisted as diagnostics", () => {
    expect(() => assertWioBankLifecycleEvidenceIsSafe({ databaseUrl: "postgresql://localhost:5432/local" })).toThrow(
      "unsafe diagnostic content",
    );
    expect(() => assertWioBankLifecycleEvidenceIsSafe({ iban: RAW_IBAN })).toThrow("unsafe diagnostic content");
    expect(() => assertWioBankLifecycleEvidenceIsSafe({ providerPayload: { id: RAW_TRANSACTION_REF } })).toThrow("unsafe diagnostic content");
  });
});

const RAW_IBAN = "AE070331234567890123456";
const RAW_CONNECTION_REF = "wio-connection-1234567890";
const RAW_ACCOUNT_REF = "wio-account-111111";
const RAW_TRANSACTION_REF = "wio-transaction-222222";
const RAW_BENEFICIARY_REF = "beneficiary-account-333333";
const RAW_EXTERNAL_BENEFICIARY_REF = "wio-beneficiary-444444";
const RAW_MANUAL_RELEASE_REF = "manual-bank-confirmation-555555";

interface WioProofTenantFixture {
  organizationId: string;
  userId: string;
  approverId: string;
  adminId: string;
  accountantId: string;
  supplierId: string;
  purchaseBillId: string;
  statementTransactionId: string;
  feedTransactionId: string;
  paymentRequestId: string;
}

interface WioProofFixture {
  tenantA: WioProofTenantFixture;
  tenantB: WioProofTenantFixture;
}

interface StoreRow {
  id: string;
  [key: string]: any;
}

interface WioProofStore {
  organizations: StoreRow[];
  users: StoreRow[];
  contacts: StoreRow[];
  purchaseBills: StoreRow[];
  bankConnections: StoreRow[];
  bankFeedAccounts: StoreRow[];
  bankFeedSyncRuns: StoreRow[];
  bankFeedTransactions: StoreRow[];
  bankBeneficiaryMappings: StoreRow[];
  bankPaymentRequests: StoreRow[];
  bankStatementTransactions: StoreRow[];
  auditLogs: StoreRow[];
}

function makeHarness() {
  const store: WioProofStore = {
    organizations: [],
    users: [],
    contacts: [],
    purchaseBills: [],
    bankConnections: [],
    bankFeedAccounts: [],
    bankFeedSyncRuns: [],
    bankFeedTransactions: [],
    bankBeneficiaryMappings: [],
    bankPaymentRequests: [],
    bankStatementTransactions: [],
    auditLogs: [],
  };
  let requestId = "req-wio-initial";
  const observability = { getRequestId: jest.fn(() => requestId) };
  const prisma = {
    bankConnection: model(store.bankConnections),
    bankFeedAccount: model(store.bankFeedAccounts),
    bankFeedSyncRun: model(store.bankFeedSyncRuns),
    bankFeedTransaction: model(store.bankFeedTransactions),
    bankBeneficiaryMapping: model(store.bankBeneficiaryMappings),
    bankPaymentRequest: model(store.bankPaymentRequests),
    contact: model(store.contacts),
    purchaseBill: model(store.purchaseBills),
    bankAccountProfile: model([]),
    bankStatementTransaction: model(store.bankStatementTransactions),
    auditLog: model(store.auditLogs),
  };
  const config = {
    get: jest.fn((key: string) =>
      ({
        APP_ENV: "test",
        LEDGERBYTE_BANK_INTEGRATION_PROVIDER: "MOCK_WIO",
      })[key],
    ),
  } as unknown as ConfigService;
  const auditLog = new AuditLogService(prisma as unknown as PrismaService, observability as never);
  const service = new BankIntegrationService(prisma as unknown as PrismaService, config, auditLog, observability as never);

  return {
    store,
    service,
    async withRequest<T>(nextRequestId: string, action: () => Promise<T>): Promise<T> {
      requestId = nextRequestId;
      return action();
    },
  };
}

function seedWioLifecycleFixture(store: WioProofStore): WioProofFixture {
  const tenantA = tenantFixture();
  const tenantB = tenantFixture();
  seedTenant(store, tenantA, "A");
  seedTenant(store, tenantB, "B");
  store.bankFeedTransactions.push({
    id: tenantB.feedTransactionId,
    organizationId: tenantB.organizationId,
    bankConnectionId: randomUUID(),
    bankFeedAccountId: randomUUID(),
    provider: BankIntegrationProvider.MOCK_WIO,
    transactionDate: new Date("2026-07-08T00:00:00.000Z"),
    description: "Tenant B hidden transaction",
    type: BankStatementTransactionType.DEBIT,
    amount: "999.0000",
    currency: "AED",
    externalTransactionRefMasked: "masked_9999",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  store.bankPaymentRequests.push({
    id: tenantB.paymentRequestId,
    organizationId: tenantB.organizationId,
    supplierId: tenantB.supplierId,
    purchaseBillId: tenantB.purchaseBillId,
    status: BankPaymentRequestStatus.DRAFT,
    amount: "999.0000",
    currency: "AED",
    requestId: "req-tenant-b-hidden",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { tenantA, tenantB };
}

function tenantFixture(): WioProofTenantFixture {
  return {
    organizationId: randomUUID(),
    userId: randomUUID(),
    approverId: randomUUID(),
    adminId: randomUUID(),
    accountantId: randomUUID(),
    supplierId: randomUUID(),
    purchaseBillId: randomUUID(),
    statementTransactionId: randomUUID(),
    feedTransactionId: randomUUID(),
    paymentRequestId: randomUUID(),
  };
}

function seedTenant(store: WioProofStore, tenant: WioProofTenantFixture, label: "A" | "B"): void {
  store.organizations.push({ id: tenant.organizationId, name: `Wio Lifecycle Tenant ${label}`, baseCurrency: "AED" });
  const users: Array<[string, string]> = [
    [tenant.userId, "operator"],
    [tenant.approverId, "approver"],
    [tenant.adminId, "admin"],
    [tenant.accountantId, "accountant"],
  ];
  for (const [id, role] of users) {
    store.users.push({ id, email: `wio-lifecycle-${label.toLowerCase()}-${role}@example.test` });
  }
  store.contacts.push({
    id: tenant.supplierId,
    organizationId: tenant.organizationId,
    type: ContactType.SUPPLIER,
    name: `Lifecycle Supplier ${label}`,
    displayName: `Lifecycle Supplier ${label}`,
  });
  store.purchaseBills.push({
    id: tenant.purchaseBillId,
    organizationId: tenant.organizationId,
    supplierId: tenant.supplierId,
    billNumber: `WIO-BILL-${label}`,
    status: PurchaseBillStatus.FINALIZED,
    total: "125.0000",
    balanceDue: "125.0000",
  });
  store.bankStatementTransactions.push({
    id: tenant.statementTransactionId,
    organizationId: tenant.organizationId,
    transactionDate: new Date("2026-07-08T00:00:00.000Z"),
    description: `Lifecycle statement debit ${label}`,
    type: BankStatementTransactionType.DEBIT,
    status: BankStatementTransactionStatus.UNMATCHED,
    amount: "125.0000",
    currency: "AED",
  });
}

function model(rows: StoreRow[]) {
  return {
    count: jest.fn(async (args?: { where?: Record<string, unknown> }) => rows.filter((row) => matchesWhere(row, args?.where)).length),
    findMany: jest.fn(async (args?: { where?: Record<string, unknown> }) => rows.filter((row) => matchesWhere(row, args?.where))),
    findFirst: jest.fn(async (args?: { where?: Record<string, unknown> }) => rows.find((row) => matchesWhere(row, args?.where)) ?? null),
    create: jest.fn(async (args: { data: Record<string, unknown> }) => {
      const now = new Date();
      const data = materialize(args.data);
      const row = { createdAt: now, updatedAt: now, ...data, id: typeof data.id === "string" ? data.id : randomUUID() };
      rows.push(row);
      return row;
    }),
    update: jest.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      const row = rows.find((candidate) => candidate.id === args.where.id);
      if (!row) {
        throw new Error(`Missing row ${args.where.id}`);
      }
      Object.assign(row, materialize(args.data), { updatedAt: new Date() });
      return row;
    }),
  };
}

function materialize(data: Record<string, unknown>): StoreRow {
  return JSON.parse(JSON.stringify(data)) as StoreRow;
}

function matchesWhere(row: StoreRow, where?: Record<string, unknown>): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, expected]) => matchesValue(row[key], expected));
}

function matchesValue(actual: unknown, expected: unknown): boolean {
  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    const condition = expected as { in?: unknown[] };
    if (condition.in) {
      return condition.in.includes(actual);
    }
  }
  return actual === expected;
}
