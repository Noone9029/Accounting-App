import { BadRequestException, ConflictException } from "@nestjs/common";
import { EmailDeliveryStatus, EmailTemplateType } from "@prisma/client";
import { createHash } from "node:crypto";
import { DocumentDeliveryService } from "./document-delivery.service";

describe("DocumentDeliveryService", () => {
  function makeService(options: { existing?: Record<string, unknown> | null; suppression?: Record<string, unknown> | null; provider?: Partial<Record<string, unknown>> } = {}) {
    const prisma = {
      emailOutbox: {
        findFirst: jest.fn().mockResolvedValue(options.existing ?? null),
        create: jest.fn((args: { data: Record<string, unknown> }) => Promise.resolve({ id: "delivery-1", createdAt: new Date("2026-07-16T00:00:00.000Z"), ...args.data })),
        findMany: jest.fn().mockResolvedValue([]),
      },
      emailSuppression: {
        findFirst: jest.fn().mockResolvedValue(options.suppression ?? null),
      },
    };
    const provider = {
      provider: "mock",
      isMock: true,
      send: jest.fn(),
      readiness: jest.fn().mockReturnValue({ provider: "mock", ready: true, mockMode: true, realSendingEnabled: false, blockingReasons: [], warnings: [] }),
      ...options.provider,
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    return { service: new DocumentDeliveryService(prisma as never, provider as never, audit as never), prisma, provider, audit };
  }

  const input = {
    organizationId: "org-1",
    actorUserId: "user-1",
    salesInvoiceId: "invoice-1",
    sourceType: "SalesInvoice",
    sourceId: "invoice-1",
    recipientEmail: "Customer@Example.Test",
    fromEmail: "no-reply@example.test",
    subject: "Invoice INV-00042 from Example Trading",
    bodyText: "Please find the invoice attached.",
    bodyHtml: "<p>Please find the invoice attached.</p>",
    templateType: EmailTemplateType.SALES_INVOICE,
    idempotencyKey: "client-key-123456",
    generatedDocument: {
      id: "document-1",
      filename: "invoice-INV-00042.pdf",
      mimeType: "application/pdf",
      sizeBytes: 123,
      contentHash: "hash-1",
    },
  };

  it("creates a queued row with hashed idempotency metadata without calling the provider", async () => {
    const { service, prisma, provider, audit } = makeService();

    const result = await service.queue(input);

    expect(result).toMatchObject({ id: "delivery-1", idempotentReplay: false, status: EmailDeliveryStatus.QUEUED });
    expect(prisma.emailOutbox.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: "org-1",
        salesInvoiceId: "invoice-1",
        generatedDocumentId: "document-1",
        status: EmailDeliveryStatus.QUEUED,
        attemptCount: 0,
        nextAttemptAt: null,
        idempotencyKeyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        requestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    }));
    const createdData = prisma.emailOutbox.create.mock.calls[0]![0].data;
    expect(createdData.idempotencyKeyHash).not.toBe(input.idempotencyKey);
    expect(provider.send).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ after: expect.not.objectContaining({ bodyText: input.bodyText, idempotencyKey: input.idempotencyKey }) }));
  });

  it("replays the same request and conflicts on a changed request", async () => {
    const first = makeService();
    const queued = await first.service.queue(input);
    const stored = first.prisma.emailOutbox.create.mock.calls[0]![0].data;
    first.prisma.emailOutbox.findFirst.mockResolvedValue({ ...queued, toEmail: input.recipientEmail.toLowerCase(), requestHash: stored.requestHash });

    await expect(first.service.queue(input)).resolves.toMatchObject({ id: "delivery-1", idempotentReplay: true });
    await expect(first.service.queue({ ...input, bodyText: "changed" })).rejects.toBeInstanceOf(ConflictException);
    expect(first.prisma.emailOutbox.create).toHaveBeenCalledTimes(1);
    expect(first.provider.send).not.toHaveBeenCalled();
  });

  it("hashes generic source identity, document kind, and bounded request context", async () => {
    const genericInput = {
      ...input,
      salesInvoiceId: null,
      sourceType: "CustomerStatement",
      sourceId: "customer-statement:contact-1",
      sourceNumber: "Statement Acme (2026-01-01 to 2026-06-30)",
      documentType: "CUSTOMER_STATEMENT",
      templateType: "CUSTOMER_STATEMENT",
      requestContext: { from: "2026-01-01", to: "2026-06-30", asOf: "2026-06-30" },
    };
    const first = makeService();
    const created = await first.service.queue(genericInput as never);
    const stored = first.prisma.emailOutbox.create.mock.calls[0]![0].data;
    first.prisma.emailOutbox.findFirst.mockResolvedValue({
      ...stored,
      ...created,
      toEmail: "customer@example.test",
      requestedBy: null,
      requestHash: stored.requestHash,
    });

    await expect(first.service.queue(genericInput as never)).resolves.toMatchObject({
      id: "delivery-1",
      idempotentReplay: true,
      sourceType: "CustomerStatement",
      sourceId: "customer-statement:contact-1",
      sourceNumber: "Statement Acme (2026-01-01 to 2026-06-30)",
    });
    await expect(first.service.queue({
      ...genericInput,
      requestContext: { from: "2026-01-01", to: "2026-07-31", asOf: "2026-07-31" },
    } as never)).rejects.toBeInstanceOf(ConflictException);
    expect(first.prisma.emailOutbox.create).toHaveBeenCalledTimes(1);
  });

  it("blocks active suppression and unusable providers before creating an outbox row", async () => {
    const suppressed = makeService({ suppression: { id: "suppression-1" } });
    await expect(suppressed.service.queue(input)).rejects.toBeInstanceOf(BadRequestException);
    expect(suppressed.prisma.emailOutbox.create).not.toHaveBeenCalled();

    const disabled = makeService({ provider: { provider: "smtp-disabled", readiness: jest.fn().mockReturnValue({ provider: "smtp-disabled", ready: true, mockMode: false, realSendingEnabled: false, blockingReasons: [], warnings: [] }) } });
    await expect(disabled.service.queue(input)).rejects.toBeInstanceOf(BadRequestException);
    expect(disabled.prisma.emailOutbox.create).not.toHaveBeenCalled();
  });

  it("reads only a tenant-scoped generated PDF and verifies source, size, MIME, and hash", async () => {
    const content = Buffer.from("%PDF verified");
    const contentHash = createHash("sha256").update(content).digest("hex");
    const options = makeService();
    options.prisma.emailOutbox.findFirst.mockResolvedValue({
      id: "delivery-1",
      generatedDocumentId: "document-1",
      sourceType: "SalesInvoice",
      sourceId: "invoice-1",
      attachmentFilename: "invoice.pdf",
      attachmentMimeType: "application/pdf",
      attachmentSizeBytes: content.byteLength,
      attachmentContentHash: contentHash,
    });
    const generatedDocument = {
      readContentForWorker: jest.fn().mockResolvedValue({
        id: "document-1",
        organizationId: "org-1",
        sourceType: "SalesInvoice",
        sourceId: "invoice-1",
        filename: "invoice.pdf",
        mimeType: "application/pdf",
        contentHash,
        sizeBytes: content.byteLength,
        buffer: content,
      }),
    };
    const service = new DocumentDeliveryService(options.prisma as never, options.provider as never, options.audit as never, generatedDocument as never, { get: jest.fn().mockReturnValue(undefined) } as never);

    await expect(service.readAttachmentForWorker("org-1", "delivery-1")).resolves.toMatchObject({
      filename: "invoice.pdf",
      mimeType: "application/pdf",
      content,
      contentHash,
    });
    expect(generatedDocument.readContentForWorker).toHaveBeenCalledWith("org-1", "document-1");

    generatedDocument.readContentForWorker.mockResolvedValueOnce({
      id: "document-1",
      organizationId: "org-1",
      sourceType: "SalesInvoice",
      sourceId: "invoice-1",
      filename: "invoice.pdf",
      mimeType: "application/pdf",
      contentHash,
      sizeBytes: content.byteLength,
      buffer: Buffer.from("!PDF verified"),
    });
    await expect(service.readAttachmentForWorker("org-1", "delivery-1")).rejects.toThrow("hash verification failed");
  });

  it("maps safe history metadata for timing, bounce, complaint, and suppression", async () => {
    const options = makeService();
    const createdAt = new Date("2026-07-16T01:00:00.000Z");
    const lastAttemptAt = new Date("2026-07-16T01:05:00.000Z");
    const nextAttemptAt = new Date("2026-07-16T02:05:00.000Z");
    const bouncedAt = new Date("2026-07-16T01:06:00.000Z");
    const complainedAt = new Date("2026-07-16T01:07:00.000Z");
    options.prisma.emailOutbox.findMany.mockResolvedValue([{
      id: "delivery-1",
      organizationId: "org-1",
      toEmail: "customer@example.test",
      status: EmailDeliveryStatus.FAILED,
      provider: "mock",
      errorMessage: "Email provider delivery failed.",
      attemptCount: 2,
      nextAttemptAt,
      lastAttemptAt,
      lastErrorRedacted: "Email provider delivery failed.",
      providerEventStatus: "SUPPRESSED",
      generatedDocumentId: "document-1",
      salesInvoiceId: "invoice-1",
      attachmentFilename: "invoice.pdf",
      attachmentMimeType: "application/pdf",
      attachmentSizeBytes: 12,
      attachmentContentHash: "hash-1",
      bouncedAt,
      complainedAt,
      requestedBy: { id: "user-1", name: "Accountant" },
      requestHash: "request-hash",
      createdAt,
    }]);

    await expect(options.service.listHistory("org-1", "SalesInvoice", "invoice-1")).resolves.toEqual([
      expect.objectContaining({
        createdAt,
        latestAttemptAt: lastAttemptAt,
        nextAttemptAt,
        bouncedAt,
        complainedAt,
        suppressionStatus: "Blocked by suppression",
      }),
    ]);
  });
});
