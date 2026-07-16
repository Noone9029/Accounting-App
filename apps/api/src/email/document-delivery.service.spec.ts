import { BadRequestException, ConflictException } from "@nestjs/common";
import { EmailDeliveryStatus, EmailTemplateType } from "@prisma/client";
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

  it("blocks active suppression and unusable providers before creating an outbox row", async () => {
    const suppressed = makeService({ suppression: { id: "suppression-1" } });
    await expect(suppressed.service.queue(input)).rejects.toBeInstanceOf(BadRequestException);
    expect(suppressed.prisma.emailOutbox.create).not.toHaveBeenCalled();

    const disabled = makeService({ provider: { provider: "smtp-disabled", readiness: jest.fn().mockReturnValue({ provider: "smtp-disabled", ready: true, mockMode: false, realSendingEnabled: false, blockingReasons: [], warnings: [] }) } });
    await expect(disabled.service.queue(input)).rejects.toBeInstanceOf(BadRequestException);
    expect(disabled.prisma.emailOutbox.create).not.toHaveBeenCalled();
  });
});
