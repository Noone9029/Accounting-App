import { BadRequestException, NotFoundException } from "@nestjs/common";
import { SupplierPaymentStatus } from "@prisma/client";
import { SupplierPaymentEmailDeliveryService } from "./supplier-payment-email-delivery.service";

describe("SupplierPaymentEmailDeliveryService", () => {
  function makeService(status: SupplierPaymentStatus = SupplierPaymentStatus.POSTED) {
    const prisma = {
      supplierPayment: {
        findFirst: jest.fn().mockResolvedValue({ id: "payment-1", organizationId: "org-1", paymentNumber: "PAY-00042", status }),
      },
    };
    const supplierPaymentService = {
      receiptPdfData: jest.fn().mockResolvedValue({
        organization: { name: "Example Trading" },
        supplier: { name: "Supplier", displayName: "Supplier & Sons", email: "supplier@example.test" },
        payment: {
          id: "payment-1",
          paymentNumber: "PAY-00042",
          paymentDate: new Date("2026-07-16T00:00:00.000Z"),
          status,
          currency: "SAR",
          amountPaid: "500.00",
          description: "Settlement BILL-00009",
        },
      }),
      receiptPdf: jest.fn().mockResolvedValue({
        document: { id: "document-1", filename: "supplier-payment-PAY-00042.pdf", mimeType: "application/pdf", sizeBytes: 123, contentHash: "hash-1" },
      }),
      post: jest.fn(),
      applyUnapplied: jest.fn(),
      reverseUnappliedAllocation: jest.fn(),
      void: jest.fn(),
    };
    const documentDeliveryService = {
      replayIfExisting: jest.fn().mockResolvedValue(null),
      queue: jest.fn().mockResolvedValue({ id: "delivery-1", status: "QUEUED", idempotentReplay: false }),
      listHistory: jest.fn().mockResolvedValue([]),
    };
    const config = { get: jest.fn().mockReturnValue("no-reply@example.test") };
    const service = new SupplierPaymentEmailDeliveryService(
      prisma as never,
      supplierPaymentService as never,
      documentDeliveryService as never,
      config as never,
    );
    return { service, prisma, supplierPaymentService, documentDeliveryService };
  }

  it("queues a posted remittance through the archived receipt owner", async () => {
    const { service, supplierPaymentService, documentDeliveryService } = makeService();

    const result = await service.queue("org-1", "user-1", "payment-1", { idempotencyKey: "client-key-123456" });

    expect(result).toMatchObject({ id: "delivery-1", paymentId: "payment-1", paymentNumber: "PAY-00042", status: "QUEUED" });
    expect(supplierPaymentService.receiptPdf).toHaveBeenCalledWith("org-1", "user-1", "payment-1");
    expect(documentDeliveryService.queue).toHaveBeenCalledWith(expect.objectContaining({
      sourceType: "SupplierPayment",
      sourceNumber: "PAY-00042",
      documentType: "SUPPLIER_PAYMENT_RECEIPT",
      recipientEmail: "supplier@example.test",
      generatedDocument: expect.objectContaining({ id: "document-1" }),
    }));
    expect(supplierPaymentService.post).not.toHaveBeenCalled();
    expect(supplierPaymentService.applyUnapplied).not.toHaveBeenCalled();
    expect(supplierPaymentService.void).not.toHaveBeenCalled();
  });

  it.each([SupplierPaymentStatus.DRAFT, SupplierPaymentStatus.VOIDED])("rejects %s before PDF generation", async (status) => {
    const { service, supplierPaymentService, documentDeliveryService } = makeService(status);

    await expect(service.queue("org-1", "user-1", "payment-1", { idempotencyKey: "client-key-123456" })).rejects.toBeInstanceOf(BadRequestException);
    expect(supplierPaymentService.receiptPdf).not.toHaveBeenCalled();
    expect(documentDeliveryService.queue).not.toHaveBeenCalled();
  });

  it("replays before regenerating the receipt PDF", async () => {
    const { service, supplierPaymentService, documentDeliveryService } = makeService();
    await service.queue("org-1", "user-1", "payment-1", { idempotencyKey: "client-key-123456" });
    documentDeliveryService.replayIfExisting.mockResolvedValue({ id: "delivery-1", status: "QUEUED", idempotentReplay: true });

    await expect(service.queue("org-1", "user-1", "payment-1", { idempotencyKey: "client-key-123456" })).resolves.toMatchObject({ idempotentReplay: true });
    expect(supplierPaymentService.receiptPdf).toHaveBeenCalledTimes(1);
    expect(documentDeliveryService.queue).toHaveBeenCalledTimes(1);
  });

  it("does not cross tenant boundaries", async () => {
    const { service, prisma } = makeService();
    prisma.supplierPayment.findFirst.mockResolvedValue(null);

    await expect(service.queue("org-other", "user-1", "payment-1", { idempotencyKey: "client-key-123456" })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.supplierPayment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "payment-1", organizationId: "org-other" } }));
  });
});
