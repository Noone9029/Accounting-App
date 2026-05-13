import { calculateSalesInvoiceTotals } from "@ledgerbyte/accounting-core";
import { ContactType, PurchaseBillStatus, PurchaseOrderStatus } from "@prisma/client";
import { PurchaseOrderService } from "./purchase-order.service";

describe("purchase order rules", () => {
  it("calculates purchase order totals using bill semantics", () => {
    const result = calculateSalesInvoiceTotals([
      { quantity: "2.0000", unitPrice: "100.0000", discountRate: "10.0000", taxRate: "15.0000" },
    ]);

    expect(result).toMatchObject({
      subtotal: "200.0000",
      discountTotal: "20.0000",
      taxableTotal: "180.0000",
      taxTotal: "27.0000",
      total: "207.0000",
    });
  });

  it("loads purchase orders by tenant-scoped id", async () => {
    const prisma = { purchaseOrder: { findFirst: jest.fn().mockResolvedValue({ id: "po-1" }) } };
    const service = new PurchaseOrderService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.get("org-1", "po-1")).resolves.toEqual({ id: "po-1" });
    expect(prisma.purchaseOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "po-1", organizationId: "org-1" } }));
  });

  it("prevents updates to approved purchase orders", async () => {
    const service = new PurchaseOrderService({} as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "po-1", status: PurchaseOrderStatus.APPROVED } as never);

    await expect(service.update("org-1", "user-1", "po-1", {})).rejects.toThrow("Only draft purchase orders can be edited.");
  });

  it("requires a positive total before approval", async () => {
    const service = new PurchaseOrderService({} as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({
      id: "po-1",
      status: PurchaseOrderStatus.DRAFT,
      subtotal: "0.0000",
      discountTotal: "0.0000",
      taxableTotal: "0.0000",
      taxTotal: "0.0000",
      total: "0.0000",
      lines: [
        {
          quantity: "1.0000",
          unitPrice: "0.0000",
          discountRate: "0.0000",
          lineGrossAmount: "0.0000",
          discountAmount: "0.0000",
          taxableAmount: "0.0000",
          taxAmount: "0.0000",
          lineTotal: "0.0000",
        },
      ],
    } as never);

    await expect(service.approve("org-1", "user-1", "po-1")).rejects.toThrow();
  });

  it("approves draft purchase orders", async () => {
    const prisma = { purchaseOrder: { update: jest.fn().mockResolvedValue({ id: "po-1", status: PurchaseOrderStatus.APPROVED }) } };
    const service = new PurchaseOrderService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue(makeOrder(PurchaseOrderStatus.DRAFT) as never);

    await expect(service.approve("org-1", "user-1", "po-1")).resolves.toMatchObject({ status: PurchaseOrderStatus.APPROVED });
  });

  it("marks approved purchase orders as sent", async () => {
    const prisma = { purchaseOrder: { update: jest.fn().mockResolvedValue({ id: "po-1", status: PurchaseOrderStatus.SENT }) } };
    const service = new PurchaseOrderService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue(makeOrder(PurchaseOrderStatus.APPROVED) as never);

    await expect(service.markSent("org-1", "user-1", "po-1")).resolves.toMatchObject({ status: PurchaseOrderStatus.SENT });
  });

  it("closes sent purchase orders", async () => {
    const prisma = { purchaseOrder: { update: jest.fn().mockResolvedValue({ id: "po-1", status: PurchaseOrderStatus.CLOSED }) } };
    const service = new PurchaseOrderService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue(makeOrder(PurchaseOrderStatus.SENT) as never);

    await expect(service.close("org-1", "user-1", "po-1")).resolves.toMatchObject({ status: PurchaseOrderStatus.CLOSED });
  });

  it("voids draft purchase orders", async () => {
    const prisma = { purchaseOrder: { update: jest.fn().mockResolvedValue({ id: "po-1", status: PurchaseOrderStatus.VOIDED }) } };
    const service = new PurchaseOrderService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue(makeOrder(PurchaseOrderStatus.DRAFT) as never);

    await expect(service.void("org-1", "user-1", "po-1")).resolves.toMatchObject({ status: PurchaseOrderStatus.VOIDED });
  });

  it("converts approved purchase orders into draft bills without journal entries", async () => {
    const tx = makeConvertTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseOrderService(prisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValue("BILL-000001") } as never);
    jest.spyOn(service, "get").mockResolvedValue(makeOrder(PurchaseOrderStatus.APPROVED) as never);

    await expect(service.convertToBill("org-1", "user-1", "po-1")).resolves.toMatchObject({
      status: PurchaseBillStatus.DRAFT,
      journalEntryId: null,
      total: "115.0000",
    });
    expect(tx.purchaseBill.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          purchaseOrderId: "po-1",
          status: PurchaseBillStatus.DRAFT,
          total: "115.0000",
        }),
      }),
    );
    expect(tx.purchaseOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: PurchaseOrderStatus.BILLED, convertedBillId: "bill-1" }) }),
    );
    expect("journalEntry" in tx).toBe(false);
  });

  it("rejects conversion for closed or voided purchase orders", async () => {
    const prisma = { $transaction: jest.fn() };
    const service = new PurchaseOrderService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue(makeOrder(PurchaseOrderStatus.CLOSED) as never);

    await expect(service.convertToBill("org-1", "user-1", "po-1")).rejects.toThrow(
      "Only approved or sent purchase orders can be converted to purchase bills.",
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

function makeOrder(status: PurchaseOrderStatus) {
  return {
    id: "po-1",
    status,
    convertedBillId: null,
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    lines: [
      {
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        lineGrossAmount: "100.0000",
        discountAmount: "0.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineTotal: "115.0000",
      },
    ],
  };
}

function makeConvertTransactionMock() {
  const order = {
    id: "po-1",
    purchaseOrderNumber: "PO-000001",
    supplierId: "supplier-1",
    branchId: null,
    status: PurchaseOrderStatus.APPROVED,
    convertedBillId: null,
    currency: "SAR",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    notes: "PO notes",
    terms: "Net 30",
    supplier: { id: "supplier-1", name: "Supplier", displayName: "Supplier", type: ContactType.SUPPLIER, isActive: true },
    lines: [
      {
        id: "line-1",
        itemId: null,
        item: null,
        accountId: "expense",
        taxRateId: null,
        description: "Services",
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        lineGrossAmount: "100.0000",
        discountAmount: "0.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineTotal: "115.0000",
        sortOrder: 0,
      },
    ],
  };

  return {
    purchaseOrder: {
      findFirst: jest.fn().mockResolvedValue(order),
      update: jest.fn().mockResolvedValue({ ...order, status: PurchaseOrderStatus.BILLED, convertedBillId: "bill-1" }),
    },
    account: {
      findMany: jest.fn().mockResolvedValue([{ id: "expense" }]),
    },
    purchaseBill: {
      create: jest.fn().mockResolvedValue({
        id: "bill-1",
        status: PurchaseBillStatus.DRAFT,
        journalEntryId: null,
        total: "115.0000",
      }),
    },
  };
}
