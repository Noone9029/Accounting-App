import { BadRequestException } from "@nestjs/common";
import { SalesInvoiceStatus } from "@prisma/client";
import { SalesInvoiceEmailDeliveryService } from "./sales-invoice-email-delivery.service";

describe("SalesInvoiceEmailDeliveryService", () => {
  function makeService(status: SalesInvoiceStatus = SalesInvoiceStatus.FINALIZED) {
    const prisma = {
      salesInvoice: {
        findFirst: jest.fn().mockResolvedValue({
          id: "invoice-1",
          organizationId: "org-1",
          invoiceNumber: "INV-00042",
          status,
          currency: "SAR",
          transactionTotal: "1250.00",
          transactionBalanceDue: "900.00",
          total: "1250.00",
          balanceDue: "900.00",
          dueDate: new Date("2026-07-31T00:00:00.000Z"),
          customer: { name: "Acme", displayName: "Acme & Sons", email: "customer@example.test" },
          organization: { name: "Example Trading" },
        }),
      },
    };
    const salesInvoiceService = {
      pdf: jest.fn().mockResolvedValue({
        document: {
          id: "document-1",
          filename: "invoice-INV-00042.pdf",
          mimeType: "application/pdf",
          sizeBytes: 123,
          contentHash: "hash-1",
        },
      }),
    };
    const documentDeliveryService = {
      replayIfExisting: jest.fn().mockResolvedValue(null),
      queue: jest.fn().mockResolvedValue({ id: "delivery-1", status: "QUEUED", idempotentReplay: false }),
      listHistory: jest.fn().mockResolvedValue([]),
    };
    const config = { get: jest.fn().mockReturnValue("no-reply@example.test") };
    const service = new SalesInvoiceEmailDeliveryService(prisma as never, salesInvoiceService as never, documentDeliveryService as never, config as never);
    return { service, prisma, salesInvoiceService, documentDeliveryService };
  }

  it("resolves the customer recipient, archives the PDF, and queues without provider work", async () => {
    const { service, salesInvoiceService, documentDeliveryService } = makeService();

    const result = await service.queue("org-1", "user-1", "invoice-1", { idempotencyKey: "client-key-123456" }, "request-1");

    expect(result).toMatchObject({ id: "delivery-1", invoiceId: "invoice-1", invoiceNumber: "INV-00042", status: "QUEUED" });
    expect(salesInvoiceService.pdf).toHaveBeenCalledWith("org-1", "user-1", "invoice-1");
    expect(documentDeliveryService.queue).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorUserId: "user-1",
      salesInvoiceId: "invoice-1",
      recipientEmail: "customer@example.test",
      generatedDocument: expect.objectContaining({ id: "document-1", filename: "invoice-INV-00042.pdf" }),
    }));
  });

  it("uses an explicit valid recipient and rejects draft invoices before PDF generation", async () => {
    const explicit = makeService();
    await explicit.service.queue("org-1", "user-1", "invoice-1", { recipientEmail: "override@example.test", idempotencyKey: "client-key-123456" });
    expect(explicit.documentDeliveryService.queue).toHaveBeenCalledWith(expect.objectContaining({ recipientEmail: "override@example.test" }));

    const draft = makeService(SalesInvoiceStatus.DRAFT);
    await expect(draft.service.queue("org-1", "user-1", "invoice-1", { idempotencyKey: "client-key-123456" })).rejects.toBeInstanceOf(BadRequestException);
    expect(draft.salesInvoiceService.pdf).not.toHaveBeenCalled();
  });

  it("does not regenerate the archived PDF when the idempotent request is replayed", async () => {
    const { service, salesInvoiceService, documentDeliveryService } = makeService();
    await service.queue("org-1", "user-1", "invoice-1", { idempotencyKey: "client-key-123456" });
    documentDeliveryService.replayIfExisting.mockResolvedValue({ id: "delivery-1", status: "QUEUED", idempotentReplay: true });

    await service.queue("org-1", "user-1", "invoice-1", { idempotencyKey: "client-key-123456" });

    expect(salesInvoiceService.pdf).toHaveBeenCalledTimes(1);
    expect(documentDeliveryService.queue).toHaveBeenCalledTimes(1);
  });
});
