import { ConflictException, BadRequestException } from "@nestjs/common";
import { DocumentType, EmailDeliveryStatus, EmailTemplateType } from "@prisma/client";
import { createHash } from "node:crypto";
import { DocumentDeliveryService } from "./document-delivery.service";
import { EmailRetryWorkerService } from "./email-retry-worker.service";

describe("supplier document email delivery lifecycle", () => {
  it("queues a supplier statement without provider execution, then sends one verified PDF through the worker", async () => {
    const content = Buffer.from("%PDF supplier statement");
    const contentHash = createHash("sha256").update(content).digest("hex");
    let row: any = null;
    const prisma = {
      emailOutbox: {
        findFirst: jest.fn().mockImplementation(() => Promise.resolve(row)),
        create: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
          row = { ...data, id: "delivery-1", createdAt: new Date("2026-07-16T00:00:00.000Z"), requestedBy: null, bouncedAt: null, complainedAt: null, lastAttemptAt: null };
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
        id: "document-1", organizationId: "org-1", sourceType: "SupplierStatement", sourceId: "supplier-statement:supplier-1?baseCurrency=SAR&from=2026-07-01&to=2026-07-31", filename: "supplier-statement.pdf", mimeType: "application/pdf", contentHash, sizeBytes: content.byteLength, buffer: content,
      }),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const config = { get: jest.fn().mockReturnValue(undefined) };
    const delivery = new DocumentDeliveryService(prisma as never, provider as never, audit as never, generatedDocuments as never, config as never);
    const worker = new EmailRetryWorkerService(prisma as never, provider as never, delivery, config as never, audit as never);
    const input = supplierStatementInput();
    input.generatedDocument.contentHash = contentHash;
    input.generatedDocument.sizeBytes = content.byteLength;

    await expect(delivery.queue(input as never)).resolves.toMatchObject({ status: EmailDeliveryStatus.QUEUED, sourceType: "SupplierStatement", documentType: DocumentType.SUPPLIER_STATEMENT });
    expect(provider.send).not.toHaveBeenCalled();
    await expect(worker.process("org-1", "worker-1", 1)).resolves.toMatchObject({ claimCount: 1, sentCount: 1, attachmentBlockedCount: 0 });
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({ attachments: [{ filename: "supplier-statement.pdf", mimeType: "application/pdf", content, contentHash }] }));
    expect(row.status).toBe(EmailDeliveryStatus.SENT_MOCK);
    expect(row.retryLockedBy).toBeNull();
  });

  it("replays the same statement period, conflicts on a changed period, and never creates a second outbox row", async () => {
    const options = makeDeliveryState();
    const delivery = new DocumentDeliveryService(options.prisma as never, options.provider as never, options.audit as never);

    await delivery.queue(options.input as never);
    options.prisma.emailOutbox.findFirst.mockResolvedValue(options.row);
    await expect(delivery.queue(options.input as never)).resolves.toMatchObject({ id: "delivery-1", idempotentReplay: true, sourceType: "SupplierStatement" });
    await expect(delivery.queue({ ...options.input, requestContext: { from: "2026-08-01", to: "2026-08-31", asOf: "2026-08-31" } } as never)).rejects.toBeInstanceOf(ConflictException);
    expect(options.prisma.emailOutbox.create).toHaveBeenCalledTimes(1);
    expect(options.provider.send).not.toHaveBeenCalled();
  });

  it("blocks supplier delivery before queue creation when suppressed or the provider is disabled", async () => {
    const suppressed = makeDeliveryState({ suppression: { id: "suppression-1" } });
    await expect(new DocumentDeliveryService(suppressed.prisma as never, suppressed.provider as never, suppressed.audit as never).queue(suppressed.input as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(suppressed.prisma.emailOutbox.create).not.toHaveBeenCalled();

    const disabled = makeDeliveryState({ provider: { provider: "smtp-disabled", readiness: jest.fn().mockReturnValue({ provider: "smtp-disabled", ready: true, mockMode: false, realSendingEnabled: false, blockingReasons: [], warnings: [] }) } });
    await expect(new DocumentDeliveryService(disabled.prisma as never, disabled.provider as never, disabled.audit as never).queue(disabled.input as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(disabled.prisma.emailOutbox.create).not.toHaveBeenCalled();
  });
});

function supplierStatementInput() {
  return {
    organizationId: "org-1", actorUserId: "user-1", sourceType: "SupplierStatement", sourceId: "supplier-statement:supplier-1?baseCurrency=SAR&from=2026-07-01&to=2026-07-31", sourceNumber: "Supplier Statement Example Supplier (2026-07-01 to 2026-07-31)", documentType: DocumentType.SUPPLIER_STATEMENT, recipientEmail: "supplier@example.test", fromEmail: "no-reply@ledgerbyte.local", subject: "Supplier statement from Example Trading", bodyText: "Supplier statement attached.", bodyHtml: "<p>Supplier statement attached.</p>", templateType: EmailTemplateType.SUPPLIER_STATEMENT, idempotencyKey: "supplier-document-lifecycle-1234", requestContext: { from: "2026-07-01", to: "2026-07-31", asOf: "2026-07-31" }, generatedDocument: { id: "document-1", filename: "supplier-statement.pdf", mimeType: "application/pdf", sizeBytes: 23, contentHash: "hash-1" },
  };
}

function makeDeliveryState(options: { suppression?: Record<string, unknown> | null; provider?: Partial<Record<string, unknown>> } = {}) {
  const row: any = { id: "delivery-1", organizationId: "org-1", toEmail: "supplier@example.test", status: EmailDeliveryStatus.QUEUED, provider: "mock", sourceType: "SupplierStatement", sourceId: "supplier-statement:supplier-1?baseCurrency=SAR&from=2026-07-01&to=2026-07-31", sourceNumber: "Supplier Statement Example Supplier (2026-07-01 to 2026-07-31)", documentType: DocumentType.SUPPLIER_STATEMENT, sourceContextJson: { from: "2026-07-01", to: "2026-07-31", asOf: "2026-07-31" }, generatedDocumentId: "document-1", attachmentFilename: "supplier-statement.pdf", attachmentMimeType: "application/pdf", attachmentSizeBytes: 23, attachmentContentHash: "hash-1", attemptCount: 0, maxAttempts: 3, nextAttemptAt: null, lastAttemptAt: null, bouncedAt: null, complainedAt: null, providerEventStatus: null, lastErrorRedacted: null, errorMessage: null, requestedBy: null, createdAt: new Date("2026-07-16T00:00:00.000Z"), requestHash: "request-hash" };
  const prisma = { emailOutbox: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => { Object.assign(row, data, { id: "delivery-1", createdAt: row.createdAt, requestedBy: null }); return row; }) }, emailSuppression: { findFirst: jest.fn().mockResolvedValue(options.suppression ?? null) } };
  const provider = { provider: "mock", isMock: true, readiness: jest.fn().mockReturnValue({ provider: "mock", ready: true, mockMode: true, realSendingEnabled: false, blockingReasons: [], warnings: [] }), send: jest.fn(), ...options.provider };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  return { prisma, provider, audit, input: supplierStatementInput(), row };
}
