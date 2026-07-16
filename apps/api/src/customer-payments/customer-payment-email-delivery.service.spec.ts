import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CustomerPaymentStatus, DocumentType, EmailTemplateType } from "@prisma/client";
import { CustomerPaymentEmailDeliveryService } from "./customer-payment-email-delivery.service";

describe("CustomerPaymentEmailDeliveryService", () => {
  const dto = { idempotencyKey: "customer-payment-delivery-1234", recipientEmail: "customer@example.test" };

  function makeService(payment: Record<string, unknown> | null = makePayment()) {
    const prisma = { customerPayment: { findFirst: jest.fn().mockResolvedValue(payment) } };
    const customerPayment = { receiptPdf: jest.fn().mockResolvedValue({ document: makeDocument() }) };
    const delivery = {
      replayIfExisting: jest.fn().mockResolvedValue(null),
      queue: jest.fn().mockResolvedValue({ id: "delivery-1", status: "QUEUED", idempotentReplay: false }),
      listHistory: jest.fn().mockResolvedValue([{ id: "delivery-1" }]),
    };
    const config = { get: jest.fn().mockReturnValue("no-reply@example.test") };
    return {
      service: new CustomerPaymentEmailDeliveryService(prisma as never, customerPayment as never, delivery as never, config as never),
      prisma,
      customerPayment,
      delivery,
    };
  }

  it("queues a posted payment using the existing payment-receipt template", async () => {
    const { service, customerPayment, delivery } = makeService();

    await expect(service.queue("org-1", "user-1", "payment-1", dto as never)).resolves.toMatchObject({ id: "delivery-1" });
    expect(customerPayment.receiptPdf).toHaveBeenCalledWith("org-1", "user-1", "payment-1");
    expect(delivery.queue).toHaveBeenCalledWith(expect.objectContaining({
      sourceType: "CustomerPayment",
      sourceId: "payment-1",
      sourceNumber: "PAY-000001",
      documentType: DocumentType.CUSTOMER_PAYMENT_RECEIPT,
      templateType: EmailTemplateType.PAYMENT_RECEIPT,
      subject: "Payment receipt PAY-000001 from Example Trading",
    }));
  });

  it("rejects draft and voided payments before receipt PDF generation", async () => {
    for (const status of [CustomerPaymentStatus.DRAFT, CustomerPaymentStatus.VOIDED]) {
      const { service, customerPayment } = makeService(makePayment({ status }));
      await expect(service.queue("org-1", "user-1", "payment-1", dto as never)).rejects.toBeInstanceOf(BadRequestException);
      expect(customerPayment.receiptPdf).not.toHaveBeenCalled();
    }
  });

  it("rejects cross-tenant payments and lists source-scoped history", async () => {
    const missing = makeService(null);
    await expect(missing.service.queue("org-2", "user-1", "payment-1", dto as never)).rejects.toBeInstanceOf(NotFoundException);
    expect(missing.prisma.customerPayment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "payment-1", organizationId: "org-2" } }));

    const active = makeService();
    await expect(active.service.history("org-1", "payment-1")).resolves.toEqual([{ id: "delivery-1" }]);
    expect(active.delivery.listHistory).toHaveBeenCalledWith("org-1", "CustomerPayment", "payment-1");
  });
});

function makeDocument() {
  return { id: "document-1", filename: "receipt-PAY-000001.pdf", mimeType: "application/pdf", sizeBytes: 123, contentHash: "hash-1" };
}

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-1",
    organizationId: "org-1",
    paymentNumber: "PAY-000001",
    status: CustomerPaymentStatus.POSTED,
    paymentDate: new Date("2026-07-16T00:00:00.000Z"),
    currency: "SAR",
    amountReceived: "100.00",
    description: "REF-42",
    customer: { name: "Example Customer", displayName: "Example Customer", email: "customer@example.test" },
    organization: { name: "Example Trading" },
    ...overrides,
  };
}
