import { NotFoundException } from "@nestjs/common";
import { AUDIT_EVENTS } from "./audit-events";
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

describe("AuditLogService", () => {
  function makeService() {
    const prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
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
});
