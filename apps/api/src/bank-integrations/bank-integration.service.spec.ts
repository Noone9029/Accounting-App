import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import {
  BankBeneficiaryMappingStatus,
  BankIntegrationProvider,
  BankIntegrationStatus,
  BankPaymentRequestStatus,
  BankStatementTransactionType,
  ContactType,
} from "@prisma/client";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { BankIntegrationController } from "./bank-integration.controller";
import { BankIntegrationService } from "./bank-integration.service";

describe("BankIntegrationService", () => {
  function makeService(env: Record<string, string | undefined> = {}) {
    const connection = {
      id: "conn-1",
      organizationId: "org-1",
      provider: BankIntegrationProvider.MOCK_WIO,
      status: BankIntegrationStatus.READY_FOR_MOCK,
      displayName: "Wio local mock",
      externalConnectionRefMasked: null,
      externalInstitutionName: "Wio local mock",
      metadataJson: null,
      disabledAt: null,
      requestId: "req-bank-1",
      createdAt: new Date("2026-07-08T12:00:00.000Z"),
      updatedAt: new Date("2026-07-08T12:00:00.000Z"),
    };
    const paymentRequest = {
      id: "payreq-1",
      organizationId: "org-1",
      supplierId: "supplier-1",
      purchaseBillId: null,
      bankConnectionId: "conn-1",
      beneficiaryMappingId: "mapping-1",
      bankFeedTransactionId: null,
      bankStatementTransactionId: null,
      status: BankPaymentRequestStatus.DRAFT,
      amount: "50.0000",
      currency: "AED",
      memo: null,
      externalReleaseReferenceMasked: null,
      releaseBlockedReason: null,
      approvedAt: null,
      cancelledAt: null,
      manuallyReleasedAt: null,
      reconciledAt: null,
      requestId: "req-bank-1",
      createdAt: new Date("2026-07-08T12:00:00.000Z"),
      updatedAt: new Date("2026-07-08T12:00:00.000Z"),
    };
    const paymentRequestDetail = {
      ...paymentRequest,
      status: BankPaymentRequestStatus.RELEASED_EXTERNALLY,
      purchaseBillId: "bill-1",
      bankFeedTransactionId: "feed-txn-1",
      externalReleaseReferenceMasked: "masked_7890",
      approvedAt: new Date("2026-07-08T12:05:00.000Z"),
      manuallyReleasedAt: new Date("2026-07-08T12:10:00.000Z"),
      reconciledAt: null,
      supplier: { id: "supplier-1", name: "Supplier One LLC", displayName: "Supplier One" },
      purchaseBill: {
        id: "bill-1",
        billNumber: "BILL-1",
        billDate: new Date("2026-07-01T00:00:00.000Z"),
        dueDate: new Date("2026-07-31T00:00:00.000Z"),
        status: "FINALIZED",
        total: "50.0000",
        balanceDue: "50.0000",
        currency: "AED",
      },
      bankConnection: {
        id: "conn-1",
        provider: BankIntegrationProvider.MOCK_WIO,
        status: BankIntegrationStatus.SYNCED,
        displayName: "Wio fixture",
        externalConnectionRefMasked: "masked_7890",
        externalInstitutionName: "Wio local mock",
      },
      beneficiaryMapping: {
        id: "mapping-1",
        provider: BankIntegrationProvider.MOCK_WIO,
        status: BankBeneficiaryMappingStatus.MAPPED,
        beneficiaryDisplayName: "Supplier One",
        beneficiaryRefMasked: "masked_4321",
        externalBeneficiaryRefMasked: "masked_7777",
      },
      bankFeedTransaction: {
        id: "feed-txn-1",
        transactionDate: new Date("2026-07-08T00:00:00.000Z"),
        description: "Supplier payout fixture",
        reference: "masked-statement-ref",
        type: BankStatementTransactionType.DEBIT,
        amount: "50.0000",
        currency: "AED",
        externalTransactionRefMasked: "masked_3456",
      },
      bankStatementTransaction: null,
    };
    const prisma = {
      bankConnection: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([connection]),
        findFirst: jest.fn().mockResolvedValue(connection),
        create: jest.fn((args: { data: Record<string, unknown> }) => Promise.resolve({ ...connection, ...args.data })),
        update: jest.fn((args: { data: Record<string, unknown> }) => Promise.resolve({ ...connection, ...args.data })),
      },
      bankFeedAccount: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn((args: { data: Record<string, unknown> }) => Promise.resolve({ id: "feed-account-1", ...args.data })),
      },
      bankFeedSyncRun: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn((args: { data: Record<string, unknown> }) => Promise.resolve({ id: "sync-1", ...args.data })),
      },
      bankFeedTransaction: {
        findFirst: jest.fn().mockResolvedValue({ id: "feed-txn-1" }),
        create: jest.fn((args: { data: Record<string, unknown> }) => Promise.resolve({ id: "feed-txn-1", ...args.data })),
      },
      bankProviderEvent: { count: jest.fn().mockResolvedValue(0) },
      bankBeneficiaryMapping: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue({ id: "mapping-1" }),
        create: jest.fn((args: { data: Record<string, unknown> }) => Promise.resolve({ id: "mapping-1", ...args.data })),
      },
      bankPaymentRequest: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([paymentRequestDetail]),
        findFirst: jest.fn().mockResolvedValue(paymentRequest),
        create: jest.fn((args: { data: Record<string, unknown> }) => Promise.resolve({ ...paymentRequest, ...args.data })),
        update: jest.fn((args: { data: Record<string, unknown> }) => Promise.resolve({ ...paymentRequest, ...args.data })),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "audit-1",
            action: "BANK_PAYMENT_REQUEST_APPROVED",
            actorUserId: "approver-1",
            requestId: "req-bank-1",
            createdAt: new Date("2026-07-08T12:05:00.000Z"),
          },
        ]),
      },
      contact: {
        findFirst: jest.fn().mockResolvedValue({ id: "supplier-1", type: ContactType.SUPPLIER }),
      },
      purchaseBill: {
        findFirst: jest.fn().mockResolvedValue({ id: "bill-1" }),
      },
      bankAccountProfile: {
        findFirst: jest.fn().mockResolvedValue({ id: "bank-profile-1" }),
      },
      bankStatementTransaction: {
        findFirst: jest.fn().mockResolvedValue({ id: "statement-txn-1" }),
      },
    };
    const config = { get: jest.fn((key: string) => env[key]) };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const observability = { getRequestId: jest.fn(() => "req-bank-1") };
    return { service: new BankIntegrationService(prisma as never, config as never, audit as never, observability as never), prisma, audit, paymentRequestDetail };
  }

  it("reports disabled readiness by default without exposing secrets or claiming Wio", async () => {
    const { service } = makeService({ APP_ENV: "local" });

    await expect(service.readiness("org-1")).resolves.toMatchObject({
      provider: BankIntegrationProvider.NONE,
      providerStateLabel: "Disabled",
      noSecretsReturned: true,
      noBankCredentialsStored: true,
      noRealWioApiCalls: true,
      noMoneyMovement: true,
      surfaces: {
        bankConnection: expect.objectContaining({ status: BankIntegrationStatus.DISABLED }),
        vendorPayment: expect.objectContaining({ releaseBlocked: true }),
      },
    });
  });

  it("allows MOCK_WIO connection and local sync only in local/test mode while masking references", async () => {
    const { service, prisma } = makeService({ APP_ENV: "local", LEDGERBYTE_BANK_INTEGRATION_PROVIDER: "MOCK_WIO" });

    const connection = await service.createConnection("org-1", "user-1", {
      provider: BankIntegrationProvider.MOCK_WIO,
      displayName: " Wio fixture ",
      externalConnectionRef: "wio-connection-1234567890",
    });

    expect(connection).toMatchObject({
      provider: BankIntegrationProvider.MOCK_WIO,
      status: BankIntegrationStatus.READY_FOR_MOCK,
      externalConnectionRefMasked: "masked_7890",
      noBankCredentialsStored: true,
      noRealWioApiCalls: true,
    });

    const sync = await service.recordMockFeedSync("org-1", "user-1", "conn-1", {
      account: {
        displayName: "Wio AED",
        currency: "AED",
        accountRef: "AE070331234567890123456",
        externalAccountRef: "wio-account-999999",
      },
      transactions: [
        {
          transactionDate: "2026-07-08",
          description: "Supplier payout fixture",
          type: BankStatementTransactionType.DEBIT,
          amount: "50.00",
          externalTransactionRef: "txn-secret-123456",
        },
      ],
    });

    expect(sync).toMatchObject({ noRealWioApiCalls: true, noSecretsReturned: true });
    expect(prisma.bankFeedAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accountRefMasked: "masked_3456",
          externalAccountRefMasked: "masked_9999",
        }),
      }),
    );
    expect(prisma.bankFeedTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          externalTransactionRefMasked: "masked_3456",
          accountRefMasked: "masked_3456",
        }),
      }),
    );
  });

  it("rejects MOCK_WIO in production-like mode", async () => {
    const { service } = makeService({ APP_ENV: "production", LEDGERBYTE_BANK_INTEGRATION_PROVIDER: "MOCK_WIO" });

    await expect(service.readiness("org-1")).rejects.toThrow("MOCK_WIO bank provider is not allowed");
  });

  it("stores beneficiary mapping references masked and lifecycle status explicit", async () => {
    const { service, prisma } = makeService({ APP_ENV: "local" });

    const mapping = await service.upsertBeneficiaryMapping("org-1", "user-1", {
      supplierId: "supplier-1",
      status: BankBeneficiaryMappingStatus.MAPPED,
      beneficiaryDisplayName: "Supplier One",
      beneficiaryRef: "beneficiary-account-1234567890",
      externalBeneficiaryRef: "wio-beneficiary-777777",
    });

    expect(mapping).toMatchObject({
      status: BankBeneficiaryMappingStatus.MAPPED,
      beneficiaryRefMasked: "masked_7890",
      externalBeneficiaryRefMasked: "masked_7777",
      noBankCredentialsStored: true,
    });
    expect(prisma.contact.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }));
  });

  it("keeps payment request release blocked, records manual external release, and links reconciliation safely", async () => {
    const { service, prisma, audit } = makeService({ APP_ENV: "local", LEDGERBYTE_BANK_INTEGRATION_PROVIDER: "MOCK_WIO" });

    const created = await service.createPaymentRequest("org-1", "user-1", {
      supplierId: "supplier-1",
      bankConnectionId: "conn-1",
      beneficiaryMappingId: "mapping-1",
      amount: "50.00",
      currency: "AED",
    });
    const approved = await service.approvePaymentRequest("org-1", "approver-1", created.id);
    const blocked = await service.blockRelease("org-1", "approver-1", created.id);
    const released = await service.markExternallyReleased("org-1", "admin-1", created.id, {
      externalReleaseReference: "manual-bank-confirmation-1234567890",
      note: "Released in bank portal outside LedgerByte.",
    });
    const reconciled = await service.reconcilePaymentRequest("org-1", "accountant-1", created.id, {
      bankFeedTransactionId: "feed-txn-1",
      bankStatementTransactionId: "statement-txn-1",
    });

    expect(approved.status).toBe(BankPaymentRequestStatus.APPROVED);
    expect(blocked).toMatchObject({ status: BankPaymentRequestStatus.RELEASE_BLOCKED, noMoneyMovement: true, releaseAttempted: false });
    expect(released).toMatchObject({
      status: BankPaymentRequestStatus.RELEASED_EXTERNALLY,
      externalReleaseReferenceMasked: "masked_7890",
      externalReleaseRecordedOnly: true,
    });
    expect(reconciled.status).toBe(BankPaymentRequestStatus.RECONCILED);
    expect(prisma.bankPaymentRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bankFeedTransactionId: "feed-txn-1", bankStatementTransactionId: "statement-txn-1" }) }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "BANK_PAYMENT_REQUEST_RECONCILED", entityId: created.id }));
  });

  it("filters supplier payout requests by safe workflow fields and reconciliation state", async () => {
    const { service, prisma } = makeService({ APP_ENV: "local" });

    const result = await service.listPaymentRequests("org-1", {
      status: BankPaymentRequestStatus.RELEASED_EXTERNALLY,
      supplierId: "supplier-1",
      purchaseBillId: "bill-1",
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-31T23:59:59.000Z",
      reconciliationState: "FEED",
    });

    expect(prisma.bankPaymentRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          status: BankPaymentRequestStatus.RELEASED_EXTERNALLY,
          supplierId: "supplier-1",
          purchaseBillId: "bill-1",
          bankFeedTransactionId: { not: null },
          createdAt: expect.objectContaining({
            gte: new Date("2026-07-01T00:00:00.000Z"),
            lte: new Date("2026-07-31T23:59:59.000Z"),
          }),
        }),
      }),
    );
    expect(result[0]).toMatchObject({
      supplier: { displayName: "Supplier One" },
      purchaseBill: { billNumber: "BILL-1" },
      externalReleaseReferenceMasked: "masked_7890",
      noMoneyMovement: true,
      noSecretsReturned: true,
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("AE070331234567890123456");
    expect(serialized).not.toMatch(/password-value|raw-api-key|authorization:|cookie:/i);
  });

  it("returns safe supplier payout detail with masked references and audit timeline", async () => {
    const { service, prisma, paymentRequestDetail } = makeService({ APP_ENV: "local" });
    prisma.bankPaymentRequest.findFirst.mockResolvedValueOnce(paymentRequestDetail);

    const detail = await service.getPaymentRequest("org-1", "payreq-1");

    expect(prisma.bankPaymentRequest.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "payreq-1", organizationId: "org-1" } }));
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          entityType: "BankPaymentRequest",
          entityId: "payreq-1",
        },
      }),
    );
    expect(detail).toMatchObject({
      id: "payreq-1",
      supplier: { id: "supplier-1", displayName: "Supplier One" },
      purchaseBill: { id: "bill-1", billNumber: "BILL-1" },
      beneficiaryMapping: { beneficiaryRefMasked: "masked_4321" },
      reconciliation: { state: "RECONCILED", bankFeedTransaction: { externalTransactionRefMasked: "masked_3456" } },
      auditTimeline: [{ action: "BANK_PAYMENT_REQUEST_APPROVED", requestId: "req-bank-1" }],
      noBankCredentialsStored: true,
      noMoneyMovement: true,
    });
    const serialized = JSON.stringify(detail);
    expect(serialized).not.toContain("manual-bank-confirmation-1234567890");
    expect(serialized).not.toContain("beneficiary-account");
    expect(serialized).not.toMatch(/password-value|raw-api-key|authorization:|cookie:/i);
  });
});

describe("BankIntegrationController permissions", () => {
  it("guards readiness and mutation routes with dedicated bank integration permissions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankIntegrationController.prototype.connectionReadiness)).toEqual([
      PERMISSIONS.bankIntegrations.connectionManage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankIntegrationController.prototype.feedReadiness)).toEqual([
      PERMISSIONS.bankIntegrations.feedRead,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankIntegrationController.prototype.upsertBeneficiaryMapping)).toEqual([
      PERMISSIONS.bankIntegrations.beneficiaryManage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankIntegrationController.prototype.createPaymentRequest)).toEqual([
      PERMISSIONS.bankIntegrations.vendorPaymentCreate,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankIntegrationController.prototype.listPaymentRequests)).toEqual([
      PERMISSIONS.bankIntegrations.vendorPaymentCreate,
      PERMISSIONS.bankIntegrations.vendorPaymentApprove,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankIntegrationController.prototype.getPaymentRequest)).toEqual([
      PERMISSIONS.bankIntegrations.vendorPaymentCreate,
      PERMISSIONS.bankIntegrations.vendorPaymentApprove,
      PERMISSIONS.bankIntegrations.vendorPaymentReconcile,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankIntegrationController.prototype.approvePaymentRequest)).toEqual([
      PERMISSIONS.bankIntegrations.vendorPaymentApprove,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankIntegrationController.prototype.reconcilePaymentRequest)).toEqual([
      PERMISSIONS.bankIntegrations.vendorPaymentReconcile,
    ]);
  });
});
