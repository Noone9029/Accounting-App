import {
  AccountType,
  ContactType,
  InventoryValuationMethod,
  ItemStatus,
  Prisma,
  PurchaseBillStatus,
  PurchaseOrderStatus,
  PurchaseReceiptStatus,
  StockMovementType,
  WarehouseStatus,
} from "@prisma/client";
import { PurchaseReceiptService } from "./purchase-receipt.service";

describe("PurchaseReceiptService", () => {
  const item = { id: "item-1", inventoryTracking: true, status: ItemStatus.ACTIVE };
  const previewItem = { id: item.id, name: "Tracked Item", sku: "TRK", type: "PRODUCT", status: ItemStatus.ACTIVE, inventoryTracking: true };
  const supplier = { id: "supplier-1", type: ContactType.SUPPLIER, isActive: true };
  const warehouse = { id: "warehouse-1", status: WarehouseStatus.ACTIVE };
  const assetAccount = { id: "asset-1", code: "130", name: "Inventory", type: AccountType.ASSET, allowPosting: true, isActive: true };
  const clearingAccount = { id: "clearing-1", code: "240", name: "Inventory Clearing", type: AccountType.LIABILITY, allowPosting: true, isActive: true };
  const poLine = { id: "po-line-1", itemId: item.id, quantity: new Prisma.Decimal("5.0000"), unitPrice: new Prisma.Decimal("7.0000"), item };
  const billLine = { id: "bill-line-1", itemId: item.id, quantity: new Prisma.Decimal("4.0000"), unitPrice: new Prisma.Decimal("8.0000"), item };
  const previewBillLine = {
    id: billLine.id,
    description: "Tracked bill line",
    quantity: billLine.quantity,
    unitPrice: billLine.unitPrice,
    account: { id: "expense-1", code: "511", name: "General Expenses", type: AccountType.EXPENSE },
  };
  const receipt = {
    id: "receipt-1",
    organizationId: "org-1",
    receiptNumber: "PRC-000001",
    purchaseOrderId: null,
    purchaseBillId: null,
    supplierId: supplier.id,
    warehouseId: warehouse.id,
    status: PurchaseReceiptStatus.POSTED,
    receiptDate: new Date("2026-05-14T00:00:00.000Z"),
    lines: [{ id: "receipt-line-1", itemId: item.id, item: previewItem, quantity: new Prisma.Decimal("2.0000"), unitCost: new Prisma.Decimal("7.0000") }],
  };

  function makeService(tx: Record<string, unknown>, directOverrides: Record<string, unknown> = {}) {
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      purchaseReceipt: { findMany: jest.fn(), findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
      purchaseOrder: { findFirst: jest.fn() },
      purchaseBill: { findFirst: jest.fn() },
      purchaseReceiptLine: { findMany: jest.fn() },
      journalEntry: { create: jest.fn() },
      ...directOverrides,
    };
    const audit = { log: jest.fn() };
    const numbers = { next: jest.fn().mockResolvedValue("PRC-000001") };
    const inventoryAccounting = {
      previewReadiness: jest.fn().mockResolvedValue({
        settings: {
          valuationMethod: InventoryValuationMethod.MOVING_AVERAGE,
          inventoryAssetAccount: assetAccount,
          inventoryClearingAccount: clearingAccount,
          purchaseReceiptPostingMode: "PREVIEW_ONLY",
        },
        blockingReasons: [],
        warnings: ["Not posting to GL yet."],
      }),
    };
    return { service: new PurchaseReceiptService(prisma as never, audit as never, numbers as never, inventoryAccounting as never), prisma, audit, numbers, inventoryAccounting };
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

  it("returns a design-only purchase receipt accounting preview without creating a journal entry", async () => {
    const { service, prisma } = makeService(makeTx(), {
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(receipt) },
    });

    const preview = await service.accountingPreview("org-1", receipt.id);

    expect(preview).toEqual(
      expect.objectContaining({
        previewOnly: true,
        postingStatus: "DESIGN_ONLY",
        canPost: false,
        warnings: expect.arrayContaining([expect.stringContaining("inventory clearing")]),
      }),
    );
    expect(preview.lines[0]).toEqual(expect.objectContaining({ lineValue: "14.0000" }));
    expect(preview).toEqual(
      expect.objectContaining({
        postingMode: "PREVIEW_ONLY",
        receiptValue: "14.0000",
        matchedBillValue: "0.0000",
        unmatchedReceiptValue: "14.0000",
      }),
    );
    expect(preview.journal.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ side: "DEBIT", accountCode: "130", amount: "14.0000" }),
        expect.objectContaining({ side: "CREDIT", accountCode: "240", accountName: "Inventory Clearing", amount: "14.0000" }),
      ]),
    );
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });

  it("shows linked bill quantities and value differences in purchase receipt preview", async () => {
    const linkedReceipt = {
      ...receipt,
      purchaseBillId: "bill-1",
      purchaseBill: { id: "bill-1", billNumber: "BILL-000001", status: PurchaseBillStatus.FINALIZED, billDate: new Date(), total: new Prisma.Decimal("32.0000") },
      lines: [{ ...receipt.lines[0], purchaseBillLine: previewBillLine }],
    };
    const { service } = makeService(makeTx(), {
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(linkedReceipt) },
    });

    const preview = await service.accountingPreview("org-1", receipt.id);

    expect(preview.matchingSummary).toEqual(
      expect.objectContaining({
        sourceType: "purchaseBill",
        matchedQuantity: "2.0000",
        unmatchedQuantity: "0.0000",
        valueDifference: "-2.0000",
      }),
    );
    expect(preview.matchedBillValue).toBe("16.0000");
    expect(preview.warnings).toEqual(expect.arrayContaining([expect.stringContaining("not inventory-related")]));
  });

  it("warns when receipt preview is standalone or linked only to a purchase order", async () => {
    const { service } = makeService(makeTx(), {
      purchaseReceipt: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ ...receipt, purchaseOrderId: null, purchaseBillId: null })
          .mockResolvedValueOnce({ ...receipt, purchaseOrderId: "po-1", purchaseBillId: null }),
      },
    });

    await expect(service.accountingPreview("org-1", receipt.id)).resolves.toEqual(
      expect.objectContaining({ warnings: expect.arrayContaining([expect.stringContaining("Standalone receipt")]) }),
    );
    await expect(service.accountingPreview("org-1", receipt.id)).resolves.toEqual(
      expect.objectContaining({ warnings: expect.arrayContaining([expect.stringContaining("Bill matching is not available")]) }),
    );
  });

  it("returns purchase bill receipt matching status with matched quantities", async () => {
    const { service, prisma } = makeService(makeTx(), {
      purchaseBill: {
        findFirst: jest.fn().mockResolvedValue({
          id: "bill-1",
          billNumber: "BILL-000001",
          status: PurchaseBillStatus.FINALIZED,
          total: new Prisma.Decimal("32.0000"),
          supplier: { id: supplier.id, name: "Supplier", displayName: null },
          lines: [{ ...previewBillLine, item: previewItem }],
        }),
      },
      purchaseReceiptLine: {
        findMany: jest.fn().mockResolvedValue([
          {
            purchaseBillLineId: billLine.id,
            quantity: new Prisma.Decimal("4.0000"),
            unitCost: new Prisma.Decimal("8.0000"),
            receipt: { id: receipt.id, receiptNumber: receipt.receiptNumber, receiptDate: receipt.receiptDate, status: PurchaseReceiptStatus.POSTED },
          },
        ]),
      },
    });

    await expect(service.purchaseBillReceiptMatchingStatus("org-1", "bill-1")).resolves.toEqual(
      expect.objectContaining({
        status: "FULLY_RECEIVED",
        receiptCount: 1,
        receiptValue: "32.0000",
        lines: [expect.objectContaining({ receivedQuantity: "4.0000", remainingQuantity: "0.0000" })],
      }),
    );
    expect(prisma.purchaseBill.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "bill-1", organizationId: "org-1" } }));
  });

  it("returns purchase order receipt matching status with bill matching warning", async () => {
    const { service } = makeService(makeTx(), {
      purchaseOrder: {
        findFirst: jest.fn().mockResolvedValue({
          id: "po-1",
          purchaseOrderNumber: "PO-000001",
          status: PurchaseOrderStatus.APPROVED,
          total: new Prisma.Decimal("35.0000"),
          supplier: { id: supplier.id, name: "Supplier", displayName: null },
          convertedBill: null,
          lines: [{ id: poLine.id, description: "Tracked PO line", item: previewItem, quantity: poLine.quantity, unitPrice: poLine.unitPrice }],
        }),
      },
      purchaseReceiptLine: {
        findMany: jest.fn().mockResolvedValue([
          {
            purchaseOrderLineId: poLine.id,
            quantity: new Prisma.Decimal("2.0000"),
            unitCost: new Prisma.Decimal("7.0000"),
            receipt: { id: receipt.id, receiptNumber: receipt.receiptNumber, receiptDate: receipt.receiptDate, status: PurchaseReceiptStatus.POSTED },
          },
        ]),
      },
    });

    await expect(service.purchaseOrderReceiptMatchingStatus("org-1", "po-1")).resolves.toEqual(
      expect.objectContaining({
        status: "PARTIALLY_RECEIVED",
        receiptValueEstimate: "14.0000",
        warnings: expect.arrayContaining([expect.stringContaining("Bill matching is not available")]),
      }),
    );
  });

  it("keeps receipt matching status tenant-scoped", async () => {
    const { service, prisma } = makeService(makeTx(), {
      purchaseBill: { findFirst: jest.fn().mockResolvedValue(null) },
      purchaseOrder: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.purchaseBillReceiptMatchingStatus("other-org", "bill-1")).rejects.toThrow("Purchase bill not found.");
    await expect(service.purchaseOrderReceiptMatchingStatus("other-org", "po-1")).rejects.toThrow("Purchase order not found.");
    expect(prisma.purchaseBill.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "bill-1", organizationId: "other-org" } }));
    expect(prisma.purchaseOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "po-1", organizationId: "other-org" } }));
  });

  it("blocks purchase receipt preview lines that are missing unit cost", async () => {
    const missingCostReceipt = { ...receipt, lines: [{ ...receipt.lines[0], unitCost: null }] };
    const { service } = makeService(makeTx(), {
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(missingCostReceipt) },
    });

    const preview = await service.accountingPreview("org-1", receipt.id);

    expect(preview.blockingReasons).toContain("Purchase receipt line 1 is missing unit cost.");
    expect(preview.lines[0]).toEqual(expect.objectContaining({ unitCost: null, lineValue: null }));
  });

  it("keeps purchase receipt accounting preview tenant-scoped", async () => {
    const { service, prisma } = makeService(makeTx(), {
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.accountingPreview("other-org", receipt.id)).rejects.toThrow("Purchase receipt not found.");
    expect(prisma.purchaseReceipt.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: receipt.id, organizationId: "other-org" } }));
  });
});
