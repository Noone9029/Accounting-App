import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PurchaseOrderStatus } from "@prisma/client";
import { PurchaseOrderEmailDeliveryService } from "./purchase-order-email-delivery.service";

describe("PurchaseOrderEmailDeliveryService", () => {
  function makeService(status: PurchaseOrderStatus = PurchaseOrderStatus.APPROVED) {
    const prisma = {
      purchaseOrder: {
        findFirst: jest.fn().mockResolvedValue({
          id: "po-1",
          organizationId: "org-1",
          purchaseOrderNumber: "PO-00042",
          status,
        }),
      },
    };
    const purchaseOrderService = {
      pdfData: jest.fn().mockResolvedValue({
        organization: { name: "Example Trading" },
        supplier: { name: "Supplier", displayName: "Supplier & Sons", email: "supplier@example.test" },
        purchaseOrder: {
          id: "po-1",
          purchaseOrderNumber: "PO-00042",
          status,
          orderDate: new Date("2026-07-16T00:00:00.000Z"),
          expectedDeliveryDate: new Date("2026-07-31T00:00:00.000Z"),
          currency: "SAR",
          total: "1250.00",
        },
      }),
      pdf: jest.fn().mockResolvedValue({
        document: {
          id: "document-1",
          filename: "purchase-order-PO-00042.pdf",
          mimeType: "application/pdf",
          sizeBytes: 123,
          contentHash: "hash-1",
        },
      }),
      markSent: jest.fn(),
    };
    const documentDeliveryService = {
      replayIfExisting: jest.fn().mockResolvedValue(null),
      queue: jest.fn().mockResolvedValue({ id: "delivery-1", status: "QUEUED", idempotentReplay: false }),
      listHistory: jest.fn().mockResolvedValue([]),
    };
    const config = { get: jest.fn().mockReturnValue("no-reply@example.test") };
    const service = new PurchaseOrderEmailDeliveryService(
      prisma as never,
      purchaseOrderService as never,
      documentDeliveryService as never,
      config as never,
    );
    return { service, prisma, purchaseOrderService, documentDeliveryService };
  }

  it.each([PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.SENT])(
    "queues an archived PDF for %s without marking the order sent",
    async (status) => {
      const { service, purchaseOrderService, documentDeliveryService } = makeService(status);

      const result = await service.queue("org-1", "user-1", "po-1", { idempotencyKey: "client-key-123456" }, "request-1");

      expect(result).toMatchObject({ id: "delivery-1", purchaseOrderId: "po-1", purchaseOrderNumber: "PO-00042", status: "QUEUED" });
      expect(purchaseOrderService.pdf).toHaveBeenCalledWith("org-1", "user-1", "po-1");
      expect(purchaseOrderService.markSent).not.toHaveBeenCalled();
      expect(documentDeliveryService.queue).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: "org-1",
        actorUserId: "user-1",
        sourceType: "PurchaseOrder",
        sourceNumber: "PO-00042",
        recipientEmail: "supplier@example.test",
        generatedDocument: expect.objectContaining({ id: "document-1", filename: "purchase-order-PO-00042.pdf" }),
      }));
    },
  );

  it.each([
    PurchaseOrderStatus.DRAFT,
    PurchaseOrderStatus.PARTIALLY_BILLED,
    PurchaseOrderStatus.BILLED,
    PurchaseOrderStatus.CLOSED,
    PurchaseOrderStatus.VOIDED,
  ])("rejects %s before PDF generation", async (status) => {
    const { service, purchaseOrderService, documentDeliveryService } = makeService(status);

    await expect(service.queue("org-1", "user-1", "po-1", { idempotencyKey: "client-key-123456" })).rejects.toBeInstanceOf(BadRequestException);
    expect(purchaseOrderService.pdf).not.toHaveBeenCalled();
    expect(documentDeliveryService.queue).not.toHaveBeenCalled();
  });

  it("uses an explicit recipient and rejects missing recipient", async () => {
    const explicit = makeService();
    await explicit.service.queue("org-1", "user-1", "po-1", { recipientEmail: "override@example.test", idempotencyKey: "client-key-123456" });
    expect(explicit.documentDeliveryService.queue).toHaveBeenCalledWith(expect.objectContaining({ recipientEmail: "override@example.test" }));

    const missing = makeService();
    missing.purchaseOrderService.pdfData.mockResolvedValueOnce({
      organization: { name: "Example Trading" },
      supplier: { name: "Supplier", displayName: "Supplier & Sons", email: null },
      purchaseOrder: { id: "po-1", purchaseOrderNumber: "PO-00042", status: PurchaseOrderStatus.APPROVED, currency: "SAR", total: "1250.00" },
    });
    await expect(missing.service.queue("org-1", "user-1", "po-1", { idempotencyKey: "client-key-123456" })).rejects.toBeInstanceOf(BadRequestException);
    expect(missing.purchaseOrderService.pdf).not.toHaveBeenCalled();
  });

  it("returns the existing delivery before regenerating a PDF and detects conflicts through the shared service", async () => {
    const { service, purchaseOrderService, documentDeliveryService } = makeService();
    await service.queue("org-1", "user-1", "po-1", { idempotencyKey: "client-key-123456" });
    documentDeliveryService.replayIfExisting.mockResolvedValue({ id: "delivery-1", status: "QUEUED", idempotentReplay: true });

    const replay = await service.queue("org-1", "user-1", "po-1", { idempotencyKey: "client-key-123456" });

    expect(replay).toMatchObject({ id: "delivery-1", idempotentReplay: true });
    expect(purchaseOrderService.pdf).toHaveBeenCalledTimes(1);
    expect(documentDeliveryService.queue).toHaveBeenCalledTimes(1);
  });

  it("scopes missing purchase orders to the organization", async () => {
    const { service, prisma } = makeService();
    prisma.purchaseOrder.findFirst.mockResolvedValue(null);

    await expect(service.queue("org-other", "user-1", "po-1", { idempotencyKey: "client-key-123456" })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.purchaseOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "po-1", organizationId: "org-other" } }));
  });
});
