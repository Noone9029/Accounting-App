import { EmailDeliveryStatus, SalesInvoiceStatus } from "@prisma/client";
import { createHash } from "node:crypto";
import { DocumentDeliveryService } from "../email/document-delivery.service";
import { EmailRetryWorkerService } from "../email/email-retry-worker.service";
import { SalesInvoiceEmailDeliveryService } from "./sales-invoice-email-delivery.service";

describe("sales invoice email delivery mock-only lifecycle", () => {
  it("queues without provider work, sends one verified mock attachment, and replays safely", async () => {
    const content = Buffer.from("%PDF lifecycle");
    const contentHash = createHash("sha256").update(content).digest("hex");
    const rows: Array<Record<string, any>> = [];
    const invoice = {
      id: "invoice-1",
      organizationId: "org-1",
      invoiceNumber: "INV-00042",
      status: SalesInvoiceStatus.FINALIZED,
      currency: "SAR",
      transactionTotal: "100.00",
      transactionBalanceDue: "100.00",
      total: "100.00",
      balanceDue: "100.00",
      dueDate: new Date("2026-07-31T00:00:00.000Z"),
      customer: { name: "Example Customer", displayName: "Example Customer", email: "customer@example.test" },
      organization: { name: "Example Trading" },
    };
    const prisma = {
      salesInvoice: { findFirst: jest.fn().mockResolvedValue(invoice) },
      emailSuppression: { findFirst: jest.fn().mockResolvedValue(null) },
      emailOutbox: {
        findFirst: jest.fn(({ where }: { where: Record<string, any> }) => Promise.resolve(rows.find((row) =>
          where.idempotencyKeyHash ? row.organizationId === where.organizationId && row.idempotencyKeyHash === where.idempotencyKeyHash : row.organizationId === where.organizationId && row.id === where.id) ?? null)),
        findMany: jest.fn(({ where }: { where: Record<string, any> }) => Promise.resolve(rows.filter((row) => row.organizationId === where.organizationId && (!where.sourceType || row.sourceType === where.sourceType) && (!where.sourceId || row.sourceId === where.sourceId)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))),
        create: jest.fn(({ data }: { data: Record<string, any> }) => {
          const row = { ...data, id: "delivery-1", createdAt: new Date("2026-07-16T00:00:00.000Z"), updatedAt: new Date("2026-07-16T00:00:00.000Z") };
          rows.push(row);
          return Promise.resolve(row);
        }),
        updateMany: jest.fn(({ where, data }: { where: Record<string, any>; data: Record<string, any> }) => {
          const row = rows.find((candidate) => candidate.id === where.id && candidate.organizationId === where.organizationId);
          if (!row) return Promise.resolve({ count: 0 });
          if (data.retryLockedBy && row.retryLockedBy) return Promise.resolve({ count: 0 });
          if (where.retryLockedBy && row.retryLockedBy !== where.retryLockedBy) return Promise.resolve({ count: 0 });
          Object.assign(row, data);
          return Promise.resolve({ count: 1 });
        }),
      },
    };
    const provider = {
      provider: "mock",
      isMock: true,
      readiness: jest.fn().mockReturnValue({ provider: "mock", ready: true, mockMode: true, realSendingEnabled: false, blockingReasons: [], warnings: [] }),
      send: jest.fn().mockResolvedValue({ provider: "mock", status: EmailDeliveryStatus.SENT_MOCK, providerMessageId: "mock-1", sentAt: new Date("2026-07-16T00:01:00.000Z") }),
    };
    const generatedDocument = {
      readContentForWorker: jest.fn().mockResolvedValue({
        id: "document-1",
        organizationId: "org-1",
        sourceType: "SalesInvoice",
        sourceId: "invoice-1",
        filename: "invoice-INV-00042.pdf",
        mimeType: "application/pdf",
        contentHash,
        sizeBytes: content.byteLength,
        buffer: content,
      }),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const config = { get: jest.fn().mockReturnValue(undefined) };
    const documentDelivery = new DocumentDeliveryService(prisma as never, provider as never, audit as never, generatedDocument as never, config as never);
    const worker = new EmailRetryWorkerService(prisma as never, provider as never, documentDelivery as never, config as never, audit as never);
    const pdf = jest.fn().mockResolvedValue({ document: { id: "document-1", filename: "invoice-INV-00042.pdf", mimeType: "application/pdf", sizeBytes: content.byteLength, contentHash } });
    const service = new SalesInvoiceEmailDeliveryService(prisma as never, { pdf } as never, documentDelivery, config as never);
    const dto = { idempotencyKey: "local-lifecycle-123456", message: "Please review this invoice." };

    const queued = await service.queue("org-1", "user-1", "invoice-1", dto, "request-1");
    expect(queued).toMatchObject({ id: "delivery-1", status: EmailDeliveryStatus.QUEUED, idempotentReplay: false });
    expect(rows).toHaveLength(1);
    expect(provider.send).not.toHaveBeenCalled();

    const workerResult = await worker.process("org-1", "worker-1", 5);
    expect(workerResult).toMatchObject({ claimCount: 1, sentCount: 1, attemptedCount: 1 });
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(provider.send.mock.calls[0][0].attachments).toEqual([expect.objectContaining({ filename: "invoice-INV-00042.pdf", content, contentHash })]);

    const replay = await service.queue("org-1", "user-1", "invoice-1", dto, "request-2");
    expect(replay).toMatchObject({ id: "delivery-1", idempotentReplay: true });
    expect(rows).toHaveLength(1);
    expect(pdf).toHaveBeenCalledTimes(1);
    expect(provider.send).toHaveBeenCalledTimes(1);
    await expect(service.history("org-1", "invoice-1")).resolves.toHaveLength(1);
    expect(JSON.stringify(replay)).not.toContain("Please review this invoice.");
  });
});
