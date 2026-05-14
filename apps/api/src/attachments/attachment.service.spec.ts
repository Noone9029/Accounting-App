import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AttachmentLinkedEntityType, AttachmentStatus, AttachmentStorageProvider } from "@prisma/client";
import { AttachmentStorageService } from "./attachment-storage.service";
import { AttachmentService } from "./attachment.service";

describe("AttachmentService", () => {
  const baseAttachment = {
    id: "attachment-1",
    organizationId: "org-1",
    linkedEntityType: AttachmentLinkedEntityType.SALES_INVOICE,
    linkedEntityId: "11111111-1111-1111-1111-111111111111",
    filename: "invoice.pdf",
    originalFilename: "invoice.pdf",
    mimeType: "application/pdf",
    sizeBytes: 12,
    storageProvider: AttachmentStorageProvider.DATABASE,
    storageKey: null,
    contentHash: "hash",
    status: AttachmentStatus.ACTIVE,
    uploadedById: "user-1",
    uploadedAt: new Date("2026-05-15T00:00:00.000Z"),
    deletedById: null,
    deletedAt: null,
    notes: "source file",
    createdAt: new Date("2026-05-15T00:00:00.000Z"),
    updatedAt: new Date("2026-05-15T00:00:00.000Z"),
    uploadedBy: { id: "user-1", name: "Admin", email: "admin@example.com" },
    deletedBy: null,
  };

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      attachment: {
        findMany: jest.fn().mockResolvedValue([baseAttachment]),
        findFirst: jest.fn().mockResolvedValue({ ...baseAttachment, contentBase64: Buffer.from("hello").toString("base64") }),
        create: jest.fn((args: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...baseAttachment, ...args.data, uploadedBy: baseAttachment.uploadedBy, deletedBy: null }),
        ),
        update: jest.fn().mockResolvedValue({ ...baseAttachment, notes: "updated" }),
      },
      salesInvoice: { findFirst: jest.fn().mockResolvedValue({ id: baseAttachment.linkedEntityId }) },
      purchaseBill: { findFirst: jest.fn().mockResolvedValue({ id: "bill-1" }) },
      customerPayment: { findFirst: jest.fn() },
      creditNote: { findFirst: jest.fn() },
      customerRefund: { findFirst: jest.fn() },
      supplierPayment: { findFirst: jest.fn() },
      purchaseDebitNote: { findFirst: jest.fn() },
      supplierRefund: { findFirst: jest.fn() },
      purchaseOrder: { findFirst: jest.fn() },
      cashExpense: { findFirst: jest.fn() },
      bankStatementImport: { findFirst: jest.fn() },
      bankStatementTransaction: { findFirst: jest.fn() },
      bankReconciliation: { findFirst: jest.fn() },
      purchaseReceipt: { findFirst: jest.fn() },
      salesStockIssue: { findFirst: jest.fn() },
      inventoryAdjustment: { findFirst: jest.fn() },
      warehouseTransfer: { findFirst: jest.fn() },
      inventoryVarianceProposal: { findFirst: jest.fn() },
      contact: { findFirst: jest.fn() },
      item: { findFirst: jest.fn() },
      journalEntry: { findFirst: jest.fn() },
      ...overrides,
    };
    const storage: AttachmentStorageService = {
      save: jest.fn().mockResolvedValue({
        storageProvider: AttachmentStorageProvider.DATABASE,
        storageKey: null,
        contentBase64: Buffer.from("hello").toString("base64"),
      }),
      read: jest.fn().mockResolvedValue(Buffer.from("hello")),
    };
    const audit = { log: jest.fn() };
    const config = { get: jest.fn().mockReturnValue("10") };
    return { service: new AttachmentService(prisma as never, storage, audit as never, config as never), prisma, storage, audit, config };
  }

  it("uploads an attachment to a sales invoice using database storage", async () => {
    const { service, prisma, storage, audit } = makeService();

    await expect(
      service.upload("org-1", "user-1", {
        linkedEntityType: AttachmentLinkedEntityType.SALES_INVOICE,
        linkedEntityId: baseAttachment.linkedEntityId,
        filename: "Invoice Copy.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("hello").toString("base64"),
        notes: " source file ",
      }),
    ).resolves.toMatchObject({ id: "attachment-1", filename: "Invoice-Copy.pdf" });

    expect(prisma.salesInvoice.findFirst).toHaveBeenCalledWith({
      where: { id: baseAttachment.linkedEntityId, organizationId: "org-1" },
      select: { id: true },
    });
    expect(storage.save).toHaveBeenCalledWith(expect.objectContaining({ filename: "Invoice-Copy.pdf" }));
    expect(prisma.attachment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          filename: "Invoice-Copy.pdf",
          originalFilename: "Invoice Copy.pdf",
          mimeType: "application/pdf",
          storageProvider: AttachmentStorageProvider.DATABASE,
          uploadedById: "user-1",
          notes: "source file",
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "UPLOAD", entityType: "Attachment" }));
  });

  it("uploads an attachment to a purchase bill", async () => {
    const { service, prisma } = makeService();

    await expect(
      service.upload("org-1", "user-1", {
        linkedEntityType: AttachmentLinkedEntityType.PURCHASE_BILL,
        linkedEntityId: "22222222-2222-2222-2222-222222222222",
        filename: "bill.csv",
        mimeType: "text/csv",
        contentBase64: Buffer.from("a,b\n1,2").toString("base64"),
      }),
    ).resolves.toMatchObject({ id: "attachment-1" });
    expect(prisma.purchaseBill.findFirst).toHaveBeenCalledWith({
      where: { id: "22222222-2222-2222-2222-222222222222", organizationId: "org-1" },
      select: { id: true },
    });
  });

  it("rejects unsupported MIME types", async () => {
    const { service, prisma } = makeService();

    await expect(
      service.upload("org-1", "user-1", {
        linkedEntityType: AttachmentLinkedEntityType.SALES_INVOICE,
        linkedEntityId: baseAttachment.linkedEntityId,
        filename: "script.js",
        mimeType: "application/javascript",
        contentBase64: Buffer.from("alert(1)").toString("base64"),
      }),
    ).rejects.toThrow("Unsupported attachment file type.");
    expect(prisma.attachment.create).not.toHaveBeenCalled();
  });

  it("rejects oversized files", async () => {
    const { service, config } = makeService();
    config.get.mockReturnValue("0.000001");

    await expect(
      service.upload("org-1", "user-1", {
        linkedEntityType: AttachmentLinkedEntityType.SALES_INVOICE,
        linkedEntityId: baseAttachment.linkedEntityId,
        filename: "large.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("this is too large").toString("base64"),
      }),
    ).rejects.toThrow("Attachment file exceeds the 0.000001 MB limit.");
  });

  it("rejects invalid base64", async () => {
    const { service } = makeService();

    await expect(
      service.upload("org-1", "user-1", {
        linkedEntityType: AttachmentLinkedEntityType.SALES_INVOICE,
        linkedEntityId: baseAttachment.linkedEntityId,
        filename: "bad.pdf",
        mimeType: "application/pdf",
        contentBase64: "not base64!",
      }),
    ).rejects.toThrow("Attachment contentBase64 must be valid base64.");
  });

  it("rejects cross-tenant linked entities", async () => {
    const { service, prisma } = makeService();
    prisma.salesInvoice.findFirst.mockResolvedValue(null);

    await expect(
      service.upload("org-2", "user-1", {
        linkedEntityType: AttachmentLinkedEntityType.SALES_INVOICE,
        linkedEntityId: baseAttachment.linkedEntityId,
        filename: "invoice.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("hello").toString("base64"),
      }),
    ).rejects.toThrow("Linked entity was not found in this organization");
  });

  it("lists active attachments by linked entity by default", async () => {
    const { service, prisma } = makeService();

    await service.list("org-1", {
      linkedEntityType: AttachmentLinkedEntityType.SALES_INVOICE,
      linkedEntityId: baseAttachment.linkedEntityId,
    });
    expect(prisma.attachment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          linkedEntityType: AttachmentLinkedEntityType.SALES_INVOICE,
          linkedEntityId: baseAttachment.linkedEntityId,
          status: AttachmentStatus.ACTIVE,
        }),
      }),
    );
  });

  it("downloads active attachment content", async () => {
    const { service, storage } = makeService();

    await expect(service.download("org-1", "attachment-1")).resolves.toMatchObject({
      filename: "invoice.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("hello"),
    });
    expect(storage.read).toHaveBeenCalled();
  });

  it("blocks download for deleted attachments", async () => {
    const { service, prisma } = makeService();
    prisma.attachment.findFirst.mockResolvedValue({ ...baseAttachment, status: AttachmentStatus.DELETED, contentBase64: "aGVsbG8=" });

    await expect(service.download("org-1", "attachment-1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("soft deletes attachments", async () => {
    const { service, prisma, audit } = makeService();

    await expect(service.softDelete("org-1", "user-1", "attachment-1")).resolves.toMatchObject({ id: "attachment-1" });
    expect(prisma.attachment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: AttachmentStatus.DELETED,
          deletedById: "user-1",
          deletedAt: expect.any(Date),
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "DELETE" }));
  });

  it("rejects unsupported OTHER links", async () => {
    const { service } = makeService();

    await expect(
      service.assertLinkedEntityBelongsToOrganization("org-1", AttachmentLinkedEntityType.OTHER, baseAttachment.linkedEntityId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
