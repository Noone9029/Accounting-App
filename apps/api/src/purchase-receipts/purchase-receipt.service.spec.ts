import { ContactType, ItemStatus, Prisma, PurchaseBillStatus, PurchaseOrderStatus, PurchaseReceiptStatus, StockMovementType, WarehouseStatus } from "@prisma/client";
import { PurchaseReceiptService } from "./purchase-receipt.service";

describe("PurchaseReceiptService", () => {
  const item = { id: "item-1", inventoryTracking: true, status: ItemStatus.ACTIVE };
  const supplier = { id: "supplier-1", type: ContactType.SUPPLIER, isActive: true };
  const warehouse = { id: "warehouse-1", status: WarehouseStatus.ACTIVE };
  const poLine = { id: "po-line-1", itemId: item.id, quantity: new Prisma.Decimal("5.0000"), unitPrice: new Prisma.Decimal("7.0000"), item };
  const billLine = { id: "bill-line-1", itemId: item.id, quantity: new Prisma.Decimal("4.0000"), unitPrice: new Prisma.Decimal("8.0000"), item };
  const receipt = {
    id: "receipt-1",
    organizationId: "org-1",
    receiptNumber: "PRC-000001",
    supplierId: supplier.id,
    warehouseId: warehouse.id,
    status: PurchaseReceiptStatus.POSTED,
    receiptDate: new Date("2026-05-14T00:00:00.000Z"),
    lines: [{ id: "receipt-line-1", itemId: item.id, quantity: new Prisma.Decimal("2.0000"), unitCost: new Prisma.Decimal("7.0000") }],
  };

  function makeService(tx: Record<string, unknown>, directOverrides: Record<string, unknown> = {}) {
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      purchaseReceipt: { findMany: jest.fn(), findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
      purchaseOrder: { findFirst: jest.fn() },
      purchaseBill: { findFirst: jest.fn() },
      purchaseReceiptLine: { findMany: jest.fn() },
      ...directOverrides,
    };
    const audit = { log: jest.fn() };
    const numbers = { next: jest.fn().mockResolvedValue("PRC-000001") };
    return { service: new PurchaseReceiptService(prisma as never, audit as never, numbers as never), prisma, audit, numbers };
  }

  function makeTx(overrides: Record<string, unknown> = {}) {
    return {
      warehouse: { findFirst: jest.fn().mockResolvedValue(warehouse) },
      contact: { findFirst: jest.fn().mockResolvedValue(supplier) },
      item: { findFirst: jest.fn().mockResolvedValue(item) },
      purchaseOrder: {
        findFirst: jest.fn().mockResolvedValue({
          id: "po-1",
          supplierId: supplier.id,
          status: PurchaseOrderStatus.APPROVED,
          lines: [poLine],
        }),
      },
      purchaseBill: {
        findFirst: jest.fn().mockResolvedValue({
          id: "bill-1",
          supplierId: supplier.id,
          status: PurchaseBillStatus.FINALIZED,
          lines: [billLine],
        }),
      },
      purchaseOrderLine: { findMany: jest.fn().mockResolvedValue([{ id: poLine.id, quantity: poLine.quantity }]) },
      purchaseBillLine: { findMany: jest.fn().mockResolvedValue([{ id: billLine.id, quantity: billLine.quantity }]) },
      purchaseReceipt: {
        create: jest.fn().mockResolvedValue({ id: receipt.id }),
        findFirst: jest.fn().mockResolvedValue(receipt),
        findUniqueOrThrow: jest.fn().mockResolvedValue(receipt),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      purchaseReceiptLine: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "receipt-line-1" }),
        update: jest.fn().mockResolvedValue({ id: "receipt-line-1" }),
      },
      stockMovement: {
        findMany: jest.fn().mockResolvedValue([{ type: StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER, quantity: new Prisma.Decimal("2.0000") }]),
        create: jest.fn().mockResolvedValue({ id: "movement-1" }),
      },
      journalEntry: { create: jest.fn() },
      ...overrides,
    };
  }

  it("creates a purchase receipt from a purchase order with a stock movement and no journal entry", async () => {
    const tx = makeTx();
    const { service, numbers, audit } = makeService(tx);

    await expect(
      service.create("org-1", "user-1", {
        purchaseOrderId: "po-1",
        warehouseId: warehouse.id,
        receiptDate: "2026-05-14",
        lines: [{ purchaseOrderLineId: poLine.id, quantity: "2.0000" }],
      }),
    ).resolves.toMatchObject({ id: receipt.id });

    expect(numbers.next).toHaveBeenCalledWith("org-1", "PURCHASE_RECEIPT", tx);
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER,
          referenceType: "PurchaseReceipt",
        }),
      }),
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "PurchaseReceipt" }));
  });

  it("rejects purchase order receipts above remaining quantity", async () => {
    const tx = makeTx({
      purchaseReceiptLine: {
        findMany: jest.fn().mockResolvedValue([{ purchaseOrderLineId: poLine.id, purchaseBillLineId: null, quantity: new Prisma.Decimal("4.0000") }]),
        create: jest.fn(),
        update: jest.fn(),
      },
    });
    const { service } = makeService(tx);

    await expect(
      service.create("org-1", "user-1", {
        purchaseOrderId: "po-1",
        warehouseId: warehouse.id,
        receiptDate: "2026-05-14",
        lines: [{ purchaseOrderLineId: poLine.id, quantity: "2.0000" }],
      }),
    ).rejects.toThrow("Receipt quantity cannot exceed the remaining source quantity.");
  });

  it("creates purchase bill and standalone receipts", async () => {
    await expect(
      makeService(makeTx()).service.create("org-1", "user-1", {
        purchaseBillId: "bill-1",
        warehouseId: warehouse.id,
        receiptDate: "2026-05-14",
        lines: [{ purchaseBillLineId: billLine.id, quantity: "1.0000" }],
      }),
    ).resolves.toMatchObject({ id: receipt.id });

    await expect(
      makeService(makeTx()).service.create("org-1", "user-1", {
        supplierId: supplier.id,
        warehouseId: warehouse.id,
        receiptDate: "2026-05-14",
        lines: [{ itemId: item.id, quantity: "1.0000", unitCost: "6.0000" }],
      }),
    ).resolves.toMatchObject({ id: receipt.id });
  });

  it("voids a receipt with reversing stock movement and rejects double void", async () => {
    const tx = makeTx();
    const { service } = makeService(tx);
    jest.spyOn(service, "get").mockResolvedValueOnce(receipt as never);

    await expect(service.void("org-1", "user-1", receipt.id)).resolves.toMatchObject({ id: receipt.id });
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: StockMovementType.ADJUSTMENT_OUT, referenceType: "PurchaseReceiptVoid" }) }),
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();

    jest.spyOn(service, "get").mockResolvedValueOnce({ ...receipt, status: PurchaseReceiptStatus.VOIDED } as never);
    await expect(service.void("org-1", "user-1", receipt.id)).rejects.toThrow("Purchase receipt is already voided.");
  });

  it("rejects receipt void when stock would go negative", async () => {
    const tx = makeTx({ stockMovement: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() } });
    const { service } = makeService(tx);
    jest.spyOn(service, "get").mockResolvedValueOnce(receipt as never);

    await expect(service.void("org-1", "user-1", receipt.id)).rejects.toThrow("Voiding this purchase receipt cannot make stock negative.");
  });

  it("returns purchase source receiving status and tenant-scoped get", async () => {
    const { service, prisma } = makeService(makeTx(), {
      purchaseOrder: { findFirst: jest.fn().mockResolvedValue({ id: "po-1", lines: [{ id: poLine.id, item, quantity: poLine.quantity }] }) },
      purchaseReceiptLine: { findMany: jest.fn().mockResolvedValue([{ purchaseOrderLineId: poLine.id, quantity: new Prisma.Decimal("2.0000") }]) },
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.purchaseOrderReceivingStatus("org-1", "po-1")).resolves.toMatchObject({
      status: "PARTIAL",
      lines: [expect.objectContaining({ receivedQuantity: "2.0000", remainingQuantity: "3.0000" })],
    });
    await expect(service.get("other-org", receipt.id)).rejects.toThrow("Purchase receipt not found.");
    expect(prisma.purchaseReceipt.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: receipt.id, organizationId: "other-org" } }));
  });
});
