import { DocumentType, EmailDeliveryStatus, EmailTemplateType } from "@prisma/client";
import { createHash } from "node:crypto";
import { DocumentDeliveryService } from "./document-delivery.service";
import { EmailRetryWorkerService } from "./email-retry-worker.service";

describe("customer document email delivery lifecycle", () => {
  it("queues without provider execution, then sends one verified statement PDF through the worker", async () => {
    const content = Buffer.from("%PDF customer statement");
    const contentHash = createHash("sha256").update(content).digest("hex");
    let row: any = null;
    const prisma = {
      emailOutbox: {
        findFirst: jest.fn().mockImplementation(() => Promise.resolve(row)),
        create: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
          row = {
            ...data,
            id: "delivery-1",
            createdAt: new Date("2026-07-16T00:00:00.000Z"),
            requestedBy: null,
            bouncedAt: null,
            complainedAt: null,
            lastAttemptAt: null,
          };
          return row;
        }),
        findMany: jest.fn().mockImplementation(() => Promise.resolve(row ? [row] : [])),
        updateMany: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
          row = { ...row, ...data };
          return { count: 1 };
        }),
      },
      emailSuppression: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const provider = {
      provider: "mock",
      isMock: true,
      readiness: jest.fn().mockReturnValue({ provider: "mock", ready: true, mockMode: true, realSendingEnabled: false, blockingReasons: [], warnings: [] }),
      send: jest.fn().mockResolvedValue({ provider: "mock", status: EmailDeliveryStatus.SENT_MOCK, providerMessageId: "mock-1", sentAt: new Date("2026-07-16T00:01:00.000Z") }),
    };
    const generatedDocuments = {
      readContentForWorker: jest.fn().mockResolvedValue({
        id: "document-1",
        organizationId: "org-1",
        sourceType: "CustomerStatement",
        sourceId: "customer-statement:contact-1?from=2026-07-01&to=2026-07-31",
        filename: "statement.pdf",
        mimeType: "application/pdf",
        contentHash,
        sizeBytes: content.byteLength,
        buffer: content,
      }),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const config = { get: jest.fn().mockReturnValue(undefined) };
    const delivery = new DocumentDeliveryService(prisma as never, provider as never, audit as never, generatedDocuments as never, config as never);
    const worker = new EmailRetryWorkerService(prisma as never, provider as never, delivery, config as never, audit as never);
    const input = {
      organizationId: "org-1",
      actorUserId: "user-1",
      sourceType: "CustomerStatement",
      sourceId: "customer-statement:contact-1?from=2026-07-01&to=2026-07-31",
      sourceNumber: "Statement Example Customer (2026-07-01 to 2026-07-31)",
      documentType: DocumentType.CUSTOMER_STATEMENT,
      recipientEmail: "customer@example.test",
      fromEmail: "no-reply@ledgerbyte.local",
      subject: "Customer statement from Example Trading",
      bodyText: "Statement attached.",
      bodyHtml: "<p>Statement attached.</p>",
      templateType: EmailTemplateType.CUSTOMER_STATEMENT,
      idempotencyKey: "customer-document-lifecycle-1234",
      requestContext: { from: "2026-07-01", to: "2026-07-31", asOf: "2026-07-31" },
      generatedDocument: { id: "document-1", filename: "statement.pdf", mimeType: "application/pdf", sizeBytes: content.byteLength, contentHash },
    };

    await expect(delivery.queue(input as never)).resolves.toMatchObject({ status: EmailDeliveryStatus.QUEUED, sourceType: "CustomerStatement" });
    expect(provider.send).not.toHaveBeenCalled();
    await expect(worker.process("org-1", "worker-1", 1)).resolves.toMatchObject({ claimCount: 1, sentCount: 1, attachmentBlockedCount: 0 });
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({ attachments: [{ filename: "statement.pdf", mimeType: "application/pdf", content, contentHash }] }));
    expect(row.status).toBe(EmailDeliveryStatus.SENT_MOCK);
    expect(row.retryLockedBy).toBeNull();
  });

  it("replays the same generic source request without creating another outbox row", async () => {
    const options = makeSimpleDeliveryState();
    const delivery = new DocumentDeliveryService(options.prisma as never, options.provider as never, options.audit as never);
    const input = options.input;
    await delivery.queue(input as never);
    options.prisma.emailOutbox.findFirst.mockResolvedValue(options.row);

    await expect(delivery.queue(input as never)).resolves.toMatchObject({ id: "delivery-1", idempotentReplay: true, sourceType: "CreditNote" });
    expect(options.prisma.emailOutbox.create).toHaveBeenCalledTimes(1);
    expect(options.provider.send).not.toHaveBeenCalled();
  });
});

function makeSimpleDeliveryState() {
  const row: any = {
    id: "delivery-1", organizationId: "org-1", toEmail: "customer@example.test", status: EmailDeliveryStatus.QUEUED, provider: "mock",
    sourceType: "CreditNote", sourceId: "credit-note-1", sourceNumber: "CN-000001", documentType: DocumentType.CREDIT_NOTE,
    sourceContextJson: null, generatedDocumentId: "document-1", salesInvoiceId: null, attachmentFilename: "credit-note.pdf",
    attachmentMimeType: "application/pdf", attachmentSizeBytes: 4, attachmentContentHash: "hash-1", attemptCount: 0, maxAttempts: 3,
    nextAttemptAt: null, lastAttemptAt: null, bouncedAt: null, complainedAt: null, providerEventStatus: null, lastErrorRedacted: null,
    errorMessage: null, requestedBy: null, createdAt: new Date("2026-07-16T00:00:00.000Z"), requestHash: "request-hash",
  };
  const prisma = {
    emailOutbox: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(row, data, { id: "delivery-1", createdAt: row.createdAt, requestedBy: null });
        return row;
      }),
    },
    emailSuppression: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const provider = { provider: "mock", isMock: true, readiness: jest.fn().mockReturnValue({ provider: "mock", ready: true, mockMode: true, realSendingEnabled: false, blockingReasons: [], warnings: [] }), send: jest.fn() };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const input = {
    organizationId: "org-1", actorUserId: "user-1", sourceType: "CreditNote", sourceId: "credit-note-1", sourceNumber: "CN-000001",
    documentType: DocumentType.CREDIT_NOTE, recipientEmail: "customer@example.test", fromEmail: "no-reply@ledgerbyte.local",
    subject: "Credit note CN-000001", bodyText: "Credit note attached.", bodyHtml: "<p>Credit note attached.</p>",
    templateType: EmailTemplateType.CREDIT_NOTE, idempotencyKey: "customer-document-replay-1234",
    generatedDocument: { id: "document-1", filename: "credit-note.pdf", mimeType: "application/pdf", sizeBytes: 4, contentHash: "hash-1" },
  };
  return { prisma, provider, audit, input, row };
}
