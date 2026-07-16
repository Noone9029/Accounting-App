import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PurchaseDebitNoteStatus } from "@prisma/client";
import { PurchaseDebitNoteEmailDeliveryService } from "./purchase-debit-note-email-delivery.service";

describe("PurchaseDebitNoteEmailDeliveryService", () => {
  function makeService(status: PurchaseDebitNoteStatus = PurchaseDebitNoteStatus.FINALIZED) {
    const prisma = {
      purchaseDebitNote: {
        findFirst: jest.fn().mockResolvedValue({ id: "debit-1", organizationId: "org-1", debitNoteNumber: "DN-00042", status }),
      },
    };
    const purchaseDebitNoteService = {
      pdfData: jest.fn().mockResolvedValue({
        organization: { name: "Example Trading" },
        supplier: { name: "Supplier", displayName: "Supplier & Sons", email: "supplier@example.test" },
        originalBill: { billNumber: "BILL-00009" },
        debitNote: {
          id: "debit-1",
          debitNoteNumber: "DN-00042",
          status,
          issueDate: new Date("2026-07-16T00:00:00.000Z"),
          currency: "SAR",
          total: "125.00",
        },
      }),
      pdf: jest.fn().mockResolvedValue({
        document: { id: "document-1", filename: "purchase-debit-note-DN-00042.pdf", mimeType: "application/pdf", sizeBytes: 123, contentHash: "hash-1" },
      }),
      finalize: jest.fn(),
      apply: jest.fn(),
      void: jest.fn(),
    };
    const documentDeliveryService = {
      replayIfExisting: jest.fn().mockResolvedValue(null),
      queue: jest.fn().mockResolvedValue({ id: "delivery-1", status: "QUEUED", idempotentReplay: false }),
      listHistory: jest.fn().mockResolvedValue([]),
    };
    const config = { get: jest.fn().mockReturnValue("no-reply@example.test") };
    const service = new PurchaseDebitNoteEmailDeliveryService(
      prisma as never,
      purchaseDebitNoteService as never,
      documentDeliveryService as never,
      config as never,
    );
    return { service, prisma, purchaseDebitNoteService, documentDeliveryService };
  }

  it("queues a finalized debit note through the archived PDF owner", async () => {
    const { service, purchaseDebitNoteService, documentDeliveryService } = makeService();

    const result = await service.queue("org-1", "user-1", "debit-1", { idempotencyKey: "client-key-123456" });

    expect(result).toMatchObject({ id: "delivery-1", debitNoteId: "debit-1", debitNoteNumber: "DN-00042", status: "QUEUED" });
    expect(purchaseDebitNoteService.pdf).toHaveBeenCalledWith("org-1", "user-1", "debit-1");
    expect(documentDeliveryService.queue).toHaveBeenCalledWith(expect.objectContaining({
      sourceType: "PurchaseDebitNote",
      sourceNumber: "DN-00042",
      documentType: "PURCHASE_DEBIT_NOTE",
      recipientEmail: "supplier@example.test",
      generatedDocument: expect.objectContaining({ id: "document-1" }),
    }));
    expect(purchaseDebitNoteService.finalize).not.toHaveBeenCalled();
    expect(purchaseDebitNoteService.apply).not.toHaveBeenCalled();
  });

  it.each([PurchaseDebitNoteStatus.DRAFT, PurchaseDebitNoteStatus.VOIDED])("rejects %s before PDF generation", async (status) => {
    const { service, purchaseDebitNoteService, documentDeliveryService } = makeService(status);

    await expect(service.queue("org-1", "user-1", "debit-1", { idempotencyKey: "client-key-123456" })).rejects.toBeInstanceOf(BadRequestException);
    expect(purchaseDebitNoteService.pdf).not.toHaveBeenCalled();
    expect(documentDeliveryService.queue).not.toHaveBeenCalled();
  });

  it("replays before regenerating the archived PDF", async () => {
    const { service, purchaseDebitNoteService, documentDeliveryService } = makeService();
    await service.queue("org-1", "user-1", "debit-1", { idempotencyKey: "client-key-123456" });
    documentDeliveryService.replayIfExisting.mockResolvedValue({ id: "delivery-1", status: "QUEUED", idempotentReplay: true });

    await expect(service.queue("org-1", "user-1", "debit-1", { idempotencyKey: "client-key-123456" })).resolves.toMatchObject({ idempotentReplay: true });
    expect(purchaseDebitNoteService.pdf).toHaveBeenCalledTimes(1);
    expect(documentDeliveryService.queue).toHaveBeenCalledTimes(1);
  });

  it("does not cross tenant boundaries", async () => {
    const { service, prisma } = makeService();
    prisma.purchaseDebitNote.findFirst.mockResolvedValue(null);

    await expect(service.queue("org-other", "user-1", "debit-1", { idempotencyKey: "client-key-123456" })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.purchaseDebitNote.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "debit-1", organizationId: "org-other" } }));
  });
});
