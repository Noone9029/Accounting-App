import { EmailDeliveryStatus, EmailTemplateType } from "@prisma/client";
import { EmailRetryWorkerService } from "./email-retry-worker.service";

describe("EmailRetryWorkerService", () => {
  const row = {
    id: "delivery-1",
    organizationId: "org-1",
    toEmail: "customer@example.test",
    fromEmail: "no-reply@example.test",
    subject: "Invoice INV-00042",
    templateType: EmailTemplateType.SALES_INVOICE,
    bodyText: "Invoice body",
    bodyHtml: "<p>Invoice body</p>",
    status: EmailDeliveryStatus.QUEUED,
    provider: "mock",
    providerMessageId: null,
    errorMessage: null,
    sentAt: null,
    attemptCount: 0,
    maxAttempts: 3,
    nextAttemptAt: null,
    lastAttemptAt: null,
    lastErrorRedacted: null,
    providerEventStatus: null,
    generatedDocumentId: "document-1",
    salesInvoiceId: "invoice-1",
    sourceType: "SalesInvoice",
    sourceId: "invoice-1",
    attachmentFilename: "invoice-INV-00042.pdf",
    attachmentMimeType: "application/pdf",
    attachmentSizeBytes: 12,
    attachmentContentHash: "hash-1",
    bouncedAt: null,
    complainedAt: null,
    retryLockedAt: null,
    retryLockedBy: null,
  };

  function makeService(options: {
    claimCount?: number;
    suppression?: Record<string, unknown> | null;
    attachmentError?: Error;
    rowOverrides?: Partial<Record<keyof typeof row, unknown>>;
    providerResult?: Record<string, unknown>;
    staleLockMs?: string;
    providerReady?: boolean;
  } = {}) {
    const prisma = {
      emailOutbox: {
        findMany: jest.fn().mockResolvedValue([{ ...row, ...options.rowOverrides }]),
        updateMany: jest.fn().mockResolvedValueOnce({ count: options.claimCount ?? 1 }).mockResolvedValue({ count: 1 }),
      },
      emailSuppression: {
        findFirst: jest.fn().mockResolvedValue(options.suppression ?? null),
      },
    };
    const provider = {
      provider: "mock",
      isMock: true,
      readiness: jest.fn().mockReturnValue({ provider: "mock", ready: options.providerReady ?? true, mockMode: true, realSendingEnabled: false, blockingReasons: [], warnings: [] }),
      send: jest.fn().mockResolvedValue(options.providerResult ?? { provider: "mock", status: EmailDeliveryStatus.SENT_MOCK, providerMessageId: "mock-1", sentAt: new Date("2026-07-16T00:00:00.000Z") }),
    };
    const documentDelivery = {
      readAttachmentForWorker: options.attachmentError
        ? jest.fn().mockRejectedValue(options.attachmentError)
        : jest.fn().mockResolvedValue({ filename: row.attachmentFilename, mimeType: row.attachmentMimeType, content: Buffer.from("%PDF test"), contentHash: row.attachmentContentHash }),
    };
    const config = { get: jest.fn().mockReturnValue(options.staleLockMs) };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new EmailRetryWorkerService(prisma as never, provider as never, documentDelivery as never, config as never, audit as never);
    return { service, prisma, provider, documentDelivery, audit };
  }

  it("claims atomically and sends one verified invoice attachment", async () => {
    const { service, prisma, provider, documentDelivery } = makeService();

    const result = await service.process("org-1", "worker-1", 5);

    expect(result).toMatchObject({ attemptedCount: 1, sentCount: 1, failedCount: 0, claimCount: 1 });
    expect(prisma.emailOutbox.updateMany).toHaveBeenCalledTimes(2);
    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({
      toEmail: row.toEmail,
      attachments: [{ filename: row.attachmentFilename, mimeType: row.attachmentMimeType, content: Buffer.from("%PDF test"), contentHash: row.attachmentContentHash }],
    }));
    expect(documentDelivery.readAttachmentForWorker).toHaveBeenCalledWith("org-1", "delivery-1");
  });

  it("claims and sends a verified customer-statement attachment through the same worker path", async () => {
    const { service, provider, documentDelivery } = makeService({
      rowOverrides: {
        templateType: EmailTemplateType.CUSTOMER_STATEMENT,
        salesInvoiceId: null,
        sourceType: "CustomerStatement",
        sourceId: "customer-statement:contact-1?from=2026-07-01&to=2026-07-31",
      },
    });

    await expect(service.process("org-1", "worker-1", 5)).resolves.toMatchObject({ attemptedCount: 1, sentCount: 1 });
    expect(documentDelivery.readAttachmentForWorker).toHaveBeenCalledWith("org-1", "delivery-1");
    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({ attachments: [expect.objectContaining({ mimeType: "application/pdf" })] }));
  });

  it.each([
    [EmailTemplateType.PURCHASE_ORDER, "PurchaseOrder", "po-1"],
    [EmailTemplateType.PURCHASE_DEBIT_NOTE, "PurchaseDebitNote", "debit-1"],
    [EmailTemplateType.SUPPLIER_PAYMENT_REMITTANCE, "SupplierPayment", "payment-1"],
    [EmailTemplateType.SUPPLIER_STATEMENT, "SupplierStatement", "supplier-statement:supplier-1?baseCurrency=SAR&from=2026-07-01&to=2026-07-31"],
  ])("claims and sends a verified attachment for %s", async (templateType, sourceType, sourceId) => {
    const { service, provider, documentDelivery } = makeService({ rowOverrides: { templateType, salesInvoiceId: null, sourceType, sourceId } });

    await expect(service.process("org-1", "worker-1", 5)).resolves.toMatchObject({ attemptedCount: 1, sentCount: 1 });
    expect(documentDelivery.readAttachmentForWorker).toHaveBeenCalledWith("org-1", "delivery-1");
    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({ attachments: [expect.objectContaining({ mimeType: "application/pdf" })] }));
  });

  it("does not send when another worker wins the conditional claim", async () => {
    const { service, prisma, provider } = makeService({ claimCount: 0 });

    const result = await service.process("org-1", "worker-2", 5);

    expect(result).toMatchObject({ attemptedCount: 0, claimCount: 0 });
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.updateMany).toHaveBeenCalledTimes(1);
  });

  it("rechecks suppression after claiming and never contacts the provider", async () => {
    const { service, prisma, provider } = makeService({ suppression: { id: "suppression-1" } });

    const result = await service.process("org-1", "worker-1", 5);

    expect(result).toMatchObject({ attemptedCount: 0, suppressedCount: 1 });
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.updateMany).toHaveBeenCalledTimes(2);
  });

  it("turns attachment verification failure into a safe terminal result without sending", async () => {
    const { service, provider, prisma } = makeService({ attachmentError: new Error("hash mismatch") });

    const result = await service.process("org-1", "worker-1", 5);

    expect(result).toMatchObject({ attemptedCount: 0, attachmentBlockedCount: 1 });
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.updateMany).toHaveBeenCalledTimes(2);
  });

  it("does not send an invoice without a generated document or matching invoice source", async () => {
    const missingDocument = makeService({ rowOverrides: { generatedDocumentId: null } });
    const missingDocumentResult = await missingDocument.service.process("org-1", "worker-1", 5);
    expect(missingDocumentResult).toMatchObject({ attemptedCount: 0, attachmentBlockedCount: 1 });
    expect(missingDocument.provider.send).not.toHaveBeenCalled();
    expect(missingDocument.documentDelivery.readAttachmentForWorker).not.toHaveBeenCalled();

    const mismatchedSource = makeService({ rowOverrides: { salesInvoiceId: "invoice-2" } });
    const mismatchedSourceResult = await mismatchedSource.service.process("org-1", "worker-1", 5);
    expect(mismatchedSourceResult).toMatchObject({ attemptedCount: 0, attachmentBlockedCount: 1 });
    expect(mismatchedSource.provider.send).not.toHaveBeenCalled();
    expect(mismatchedSource.documentDelivery.readAttachmentForWorker).not.toHaveBeenCalled();
  });

  it("continues delivery and releases the lock when audit logging fails", async () => {
    const { service, prisma, provider, audit } = makeService();
    audit.log.mockRejectedValue(new Error("audit database unavailable"));

    await expect(service.process("org-1", "worker-1", 5)).resolves.toMatchObject({ attemptedCount: 1, sentCount: 1 });
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(prisma.emailOutbox.updateMany.mock.calls[1]![0]).toEqual(expect.objectContaining({
      where: expect.objectContaining({ retryLockedBy: expect.any(String) }),
      data: expect.objectContaining({ retryLockedAt: null, retryLockedBy: null }),
    }));
  });

  it("records a retryable provider failure and always releases the claim lock", async () => {
    const { service, prisma } = makeService({ providerResult: { provider: "mock", status: EmailDeliveryStatus.FAILED, errorMessage: "temporary provider failure" } });

    const result = await service.process("org-1", "worker-1", 5);

    expect(result).toMatchObject({ attemptedCount: 1, sentCount: 0, failedCount: 1 });
    expect(prisma.emailOutbox.updateMany.mock.calls[1]![0]).toEqual(expect.objectContaining({
      where: expect.objectContaining({ retryLockedBy: expect.any(String) }),
      data: expect.objectContaining({ attemptCount: 1, retryLockedAt: null, retryLockedBy: null, nextAttemptAt: expect.any(Date) }),
    }));
  });

  it("stores only a generic safe error for untrusted provider failure text", async () => {
    const { service, prisma } = makeService({ providerResult: {
      provider: "mock",
      status: EmailDeliveryStatus.FAILED,
      errorMessage: "customer@example.test body=<p>Invoice</p> pdf=JVBERi0x secret=token-value",
    } });

    await service.process("org-1", "worker-1", 5);

    expect(prisma.emailOutbox.updateMany.mock.calls[1]![0]).toEqual(expect.objectContaining({
      data: expect.objectContaining({
        errorMessage: "Email provider delivery failed.",
        lastErrorRedacted: "Email provider delivery failed.",
      }),
    }));
  });

  it("skips exhausted attempts and does not reclaim a recent lock", async () => {
    const exhausted = makeService({ rowOverrides: { attemptCount: 3, maxAttempts: 3 } });
    await exhausted.service.process("org-1", "worker-1", 5);
    expect(exhausted.provider.send).not.toHaveBeenCalled();
    expect(exhausted.prisma.emailOutbox.updateMany).not.toHaveBeenCalled();

    const recentLock = makeService({ claimCount: 0, rowOverrides: { retryLockedAt: new Date() } });
    await recentLock.service.process("org-1", "worker-1", 5);
    expect(recentLock.provider.send).not.toHaveBeenCalled();
    expect(recentLock.prisma.emailOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ AND: [{ OR: [{ retryLockedAt: null }, { retryLockedAt: { lt: expect.any(Date) } }] }] }),
    }));
  });

  it("fails closed when provider readiness is unavailable", async () => {
    const { service, prisma, provider } = makeService({ providerReady: false });

    const result = await service.process("org-1", "worker-1", 5);

    expect(result).toMatchObject({ candidateCount: 0, claimCount: 0 });
    expect(prisma.emailOutbox.findMany).not.toHaveBeenCalled();
    expect(provider.send).not.toHaveBeenCalled();
  });
});
