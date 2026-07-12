import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS, standardizeAuditAction } from "./audit-events";
import { sanitizeAuditMetadata } from "./audit-sanitize";
import { AuditLogService } from "./audit-log.service";

describe("audit log redaction", () => {
  it("redacts sensitive metadata recursively", () => {
    expect(
      sanitizeAuditMetadata({
        email: "user@example.com",
        password: "Password123!",
        nested: {
          tokenHash: "hashed-token",
          authorization: "Bearer secret",
          contentBase64: "ZmFrZQ==",
        },
        rows: [{ privateKeyPem: "-----BEGIN PRIVATE KEY-----" }],
      }),
    ).toEqual({
      email: "user@example.com",
      password: "[REDACTED]",
      nested: {
        tokenHash: "[REDACTED]",
        authorization: "[REDACTED]",
        contentBase64: "[REDACTED]",
      },
      rows: [{ privateKeyPem: "[REDACTED]" }],
    });
  });
});

describe("FX audit event catalogue", () => {
  it.each([
    ["SalesInvoice", "CHANGE_FX_CONTEXT", "DOCUMENT_FX_CONTEXT_CHANGED"],
    ["SalesInvoice", "FREEZE_FX_RATE", "DOCUMENT_FX_RATE_FROZEN"],
    ["CreditNote", "CHANGE_FX_CONTEXT", "DOCUMENT_FX_CONTEXT_CHANGED"],
    ["CreditNote", "FREEZE_FX_RATE", "DOCUMENT_FX_RATE_FROZEN"],
    ["PurchaseBill", "CHANGE_FX_CONTEXT", "DOCUMENT_FX_CONTEXT_CHANGED"],
    ["PurchaseBill", "FREEZE_FX_RATE", "DOCUMENT_FX_RATE_FROZEN"],
    ["PurchaseDebitNote", "CHANGE_FX_CONTEXT", "DOCUMENT_FX_CONTEXT_CHANGED"],
    ["PurchaseDebitNote", "FREEZE_FX_RATE", "DOCUMENT_FX_RATE_FROZEN"],
    ["CashExpense", "FREEZE_FX_RATE", "DOCUMENT_FX_RATE_FROZEN"],
    ["CustomerPayment", "FREEZE_FX_RATE", "DOCUMENT_FX_RATE_FROZEN"],
    ["SupplierPayment", "FREEZE_FX_RATE", "DOCUMENT_FX_RATE_FROZEN"],
    ["RealizedFxSettlement", "POST", "REALIZED_FX_POSTED"],
    ["RealizedFxSettlement", "REVERSE", "REALIZED_FX_REVERSED"],
    ["FxRevaluationRun", "CREATE", "FX_REVALUATION_PREVIEWED"],
    ["FxRevaluationRun", "REVIEW", "FX_REVALUATION_REVIEWED"],
    ["FxRevaluationRun", "POST", "FX_REVALUATION_POSTED"],
    ["FxRevaluationRun", "REVERSE", "FX_REVALUATION_REVERSED"],
    ["FxRevaluationRun", "SUPERSEDE", "FX_REVALUATION_SUPERSEDED"],
  ])("maps %s:%s to %s", (entityType, action, expected) => {
    expect(standardizeAuditAction(action, entityType)).toBe(expected);
  });

  it("publishes the focused FX entity types without changing existing entity constants", () => {
    expect(AUDIT_ENTITY_TYPES).toMatchObject({
      SALES_INVOICE: "SalesInvoice",
      CUSTOMER_PAYMENT: "CustomerPayment",
      FX_REVALUATION_RUN: "FxRevaluationRun",
      REALIZED_FX_SETTLEMENT: "RealizedFxSettlement",
    });
  });

  it("keeps existing action mappings stable", () => {
    expect(standardizeAuditAction("FINALIZE", "SalesInvoice")).toBe(AUDIT_EVENTS.SALES_INVOICE_FINALIZED);
    expect(standardizeAuditAction("CREATE", "CurrencyRateSnapshot")).toBe(AUDIT_EVENTS.CURRENCY_RATE_SNAPSHOT_CREATED);
    expect(standardizeAuditAction(AUDIT_EVENTS.CUSTOMER_PAYMENT_UNAPPLIED_APPLIED, "CustomerPayment")).toBe(
      AUDIT_EVENTS.CUSTOMER_PAYMENT_UNAPPLIED_APPLIED,
    );
  });
});

describe("AuditLogService", () => {
  function makeService() {
    const prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        aggregate: jest.fn(),
      },
      auditLogRetentionSettings: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn().mockResolvedValue(makeRetentionSettings()),
        update: jest.fn(),
      },
    };
    return { prisma, service: new AuditLogService(prisma as never) };
  }

  it("standardizes event names and strips sensitive values before writing", async () => {
    const { prisma, service } = makeService();

    await service.log({
      organizationId: "org-1",
      actorUserId: "user-1",
      action: "FINALIZE",
      entityType: "SalesInvoice",
      entityId: "invoice-1",
      after: {
        invoiceNumber: "INV-000001",
        password: "Password123!",
        tokenHash: "hash",
        contentBase64: "base64",
      },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: AUDIT_EVENTS.SALES_INVOICE_FINALIZED,
          after: expect.objectContaining({
            invoiceNumber: "INV-000001",
            password: "[REDACTED]",
            tokenHash: "[REDACTED]",
            contentBase64: "[REDACTED]",
          }),
        }),
      }),
    );
  });

  it("can write through a transaction-scoped audit delegate", async () => {
    const { prisma, service } = makeService();
    const transaction = { auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-tx" }) } };

    await service.log(
      {
        organizationId: "org-1",
        actorUserId: "user-1",
        action: "CREATE",
        entityType: "CurrencyRateSnapshot",
        entityId: "rate-1",
        after: { rate: "3.67250000" },
      },
      transaction as never,
    );

    expect(transaction.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "CURRENCY_RATE_SNAPSHOT_CREATED" }) }),
    );
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("standardizes customer payment unapplied allocation event names", async () => {
    const { prisma, service } = makeService();

    await service.log({
      organizationId: "org-1",
      actorUserId: "user-1",
      action: "APPLY_UNAPPLIED",
      entityType: "CustomerPayment",
      entityId: "payment-1",
    });
    await service.log({
      organizationId: "org-1",
      actorUserId: "user-1",
      action: "REVERSE_UNAPPLIED_ALLOCATION",
      entityType: "CustomerPaymentUnappliedAllocation",
      entityId: "allocation-1",
    });

    expect(prisma.auditLog.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          action: AUDIT_EVENTS.CUSTOMER_PAYMENT_UNAPPLIED_APPLIED,
          entityType: "CustomerPayment",
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          action: AUDIT_EVENTS.CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED,
          entityType: "CustomerPaymentUnappliedAllocation",
        }),
      }),
    );
  });

  it("standardizes attachment and generated-document download event names", async () => {
    const { prisma, service } = makeService();

    await service.log({
      organizationId: "org-1",
      actorUserId: "user-1",
      action: "DOWNLOAD",
      entityType: "Attachment",
      entityId: "attachment-1",
    });
    await service.log({
      organizationId: "org-1",
      actorUserId: "user-1",
      action: "DOWNLOAD",
      entityType: "GeneratedDocument",
      entityId: "document-1",
    });

    expect(prisma.auditLog.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          action: AUDIT_EVENTS.ATTACHMENT_DOWNLOADED,
          entityType: "Attachment",
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          action: AUDIT_EVENTS.GENERATED_DOCUMENT_DOWNLOADED,
          entityType: "GeneratedDocument",
        }),
      }),
    );
  });

  it("keeps standardized customer payment unapplied allocation events stable", async () => {
    const { prisma, service } = makeService();

    await service.log({
      organizationId: "org-1",
      actorUserId: "user-1",
      action: AUDIT_EVENTS.CUSTOMER_PAYMENT_UNAPPLIED_APPLIED,
      entityType: "CustomerPayment",
      entityId: "payment-1",
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: AUDIT_EVENTS.CUSTOMER_PAYMENT_UNAPPLIED_APPLIED,
          entityType: "CustomerPayment",
        }),
      }),
    );
  });

  it("filters list results by action, entity, actor, date, and search", async () => {
    const { prisma, service } = makeService();
    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: "audit-1",
        organizationId: "org-1",
        actorUserId: "user-1",
        actorUser: { id: "user-1", name: "Admin", email: "admin@example.com" },
        action: AUDIT_EVENTS.ATTACHMENT_UPLOADED,
        entityType: "Attachment",
        entityId: "attachment-1",
        before: null,
        after: { filename: "support.csv" },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date("2026-05-15T00:00:00.000Z"),
      },
    ]);
    prisma.auditLog.count.mockResolvedValue(1);

    const result = await service.list("org-1", {
      action: AUDIT_EVENTS.ATTACHMENT_UPLOADED,
      entityType: "Attachment",
      actorUserId: "user-1",
      from: "2026-05-01",
      to: "2026-05-31",
      search: "support",
      limit: "25",
      page: "2",
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          action: AUDIT_EVENTS.ATTACHMENT_UPLOADED,
          entityType: "Attachment",
          actorUserId: "user-1",
          createdAt: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
          OR: expect.any(Array),
        }),
        skip: 25,
        take: 25,
      }),
    );
    expect(result.pagination).toMatchObject({ page: 2, limit: 25, total: 1, hasMore: false });
    expect(result.data[0]).toMatchObject({ action: AUDIT_EVENTS.ATTACHMENT_UPLOADED, entityType: "Attachment" });
  });

  it("returns tenant-scoped detail or not found", async () => {
    const { prisma, service } = makeService();
    prisma.auditLog.findFirst.mockResolvedValueOnce(null);

    await expect(service.get("org-1", "audit-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.auditLog.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "audit-1", organizationId: "org-1" } }));
  });

  it("creates default retention settings when missing", async () => {
    const { prisma, service } = makeService();
    prisma.auditLogRetentionSettings.upsert.mockResolvedValue(makeRetentionSettings());

    const result = await service.getRetentionSettings("org-1");

    expect(prisma.auditLogRetentionSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1" },
        update: {},
        create: {
          organizationId: "org-1",
          retentionDays: 2555,
          autoPurgeEnabled: false,
          exportBeforePurgeRequired: true,
        },
      }),
    );
    expect(result).toMatchObject({ retentionDays: 2555, autoPurgeEnabled: false, exportBeforePurgeRequired: true });
  });

  it("re-reads retention settings when concurrent default creation hits a unique constraint", async () => {
    const { prisma, service } = makeService();
    prisma.auditLogRetentionSettings.upsert.mockRejectedValueOnce({ code: "P2002" });
    prisma.auditLogRetentionSettings.findUnique.mockResolvedValue(makeRetentionSettings({ id: "retention-race" }));

    const result = await service.getRetentionSettings("org-1");

    expect(prisma.auditLogRetentionSettings.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-1" } }),
    );
    expect(result).toMatchObject({ id: "retention-race", retentionDays: 2555 });
  });

  it("validates retention settings min and max", async () => {
    const { prisma, service } = makeService();
    prisma.auditLogRetentionSettings.upsert.mockResolvedValue(makeRetentionSettings());

    await expect(service.updateRetentionSettings("org-1", "user-1", { retentionDays: 364 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateRetentionSettings("org-1", "user-1", { retentionDays: 3651 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("updates retention settings and writes an audit log", async () => {
    const { prisma, service } = makeService();
    prisma.auditLogRetentionSettings.upsert.mockResolvedValue(makeRetentionSettings());
    prisma.auditLogRetentionSettings.update.mockResolvedValue(makeRetentionSettings({ retentionDays: 365, autoPurgeEnabled: true }));

    const result = await service.updateRetentionSettings("org-1", "user-1", {
      retentionDays: 365,
      autoPurgeEnabled: true,
      exportBeforePurgeRequired: false,
    });

    expect(prisma.auditLogRetentionSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1" },
        data: expect.objectContaining({
          retentionDays: 365,
          autoPurgeEnabled: true,
          exportBeforePurgeRequired: false,
          updatedBy: { connect: { id: "user-1" } },
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: AUDIT_EVENTS.AUDIT_LOG_RETENTION_SETTINGS_UPDATED,
          entityType: "AuditLogRetentionSettings",
        }),
      }),
    );
    expect(result.warnings).toContain("Automatic purge execution is not implemented yet.");
  });

  it("returns dry-run retention preview counts", async () => {
    const { prisma, service } = makeService();
    prisma.auditLogRetentionSettings.upsert.mockResolvedValue(makeRetentionSettings({ retentionDays: 365 }));
    prisma.auditLog.count.mockResolvedValueOnce(10).mockResolvedValueOnce(3);
    prisma.auditLog.aggregate.mockResolvedValue({
      _min: { createdAt: new Date("2025-01-01T00:00:00.000Z") },
      _max: { createdAt: new Date("2026-01-01T00:00:00.000Z") },
    });

    const result = await service.retentionPreview("org-1");

    expect(result).toMatchObject({
      retentionDays: 365,
      totalAuditLogs: 10,
      logsOlderThanCutoff: 3,
      dryRunOnly: true,
      oldestLogDate: "2025-01-01T00:00:00.000Z",
      newestLogDate: "2026-01-01T00:00:00.000Z",
    });
    expect(result.warnings).toContain("No audit logs are deleted by retention preview or dry-run endpoints.");
  });

  it("exports filtered sanitized audit logs as CSV", async () => {
    const { prisma, service } = makeService();
    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: "audit-1",
        organizationId: "org-1",
        actorUserId: "user-1",
        actorUser: { id: "user-1", name: "Admin", email: "admin@example.com" },
        action: AUDIT_EVENTS.AUTH_PASSWORD_RESET_COMPLETED,
        entityType: "User",
        entityId: "user-1",
        before: null,
        after: {
          email: "user@example.com",
          password: "Password123!",
          token: "raw-token",
          tokenHash: "hash",
          privateKeyPem: "private-key",
          contentBase64: "base64",
          authorization: "Bearer secret",
        },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date("2026-05-15T00:00:00.000Z"),
      },
    ]);

    const result = await service.exportCsv("org-1", { action: AUDIT_EVENTS.AUTH_PASSWORD_RESET_COMPLETED });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1", action: AUDIT_EVENTS.AUTH_PASSWORD_RESET_COMPLETED }),
      }),
    );
    expect(result.csv).toContain("AUTH_PASSWORD_RESET_COMPLETED");
    expect(result.csv).toContain("[REDACTED]");
    expect(result.csv).not.toContain("password");
    expect(result.csv).not.toContain("tokenHash");
    expect(result.csv).not.toContain("privateKeyPem");
    expect(result.csv).not.toContain("contentBase64");
    expect(result.csv).not.toContain("authorization");
    expect(result.csv).not.toContain("Password123!");
    expect(result.csv).not.toContain("raw-token");
    expect(result.csv).not.toContain("private-key");
    expect(result.csv).not.toContain("base64");
    expect(result.csv).not.toContain("Bearer secret");
  });
});

function makeRetentionSettings(overrides: Record<string, unknown> = {}) {
  return {
    id: "retention-1",
    organizationId: "org-1",
    retentionDays: 2555,
    autoPurgeEnabled: false,
    exportBeforePurgeRequired: true,
    updatedById: null,
    updatedBy: null,
    createdAt: new Date("2026-05-15T00:00:00.000Z"),
    updatedAt: new Date("2026-05-15T00:00:00.000Z"),
    ...overrides,
  };
}
