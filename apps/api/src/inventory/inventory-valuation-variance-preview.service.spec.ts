import {
  ItemStatus,
  ItemType,
  Prisma,
  PurchaseBillInventoryPostingMode,
  PurchaseBillStatus,
  PurchaseMatchingReviewReason,
  PurchaseMatchingReviewStatus,
  PurchaseOrderStatus,
  PurchaseReceiptStatus,
  PurchaseReturnStatus,
} from "@prisma/client";
import { InventoryValuationVariancePreviewService } from "./inventory-valuation-variance-preview.service";

describe("InventoryValuationVariancePreviewService", () => {
  const supplier = { id: "supplier-1", name: "Example Supplier", displayName: "Example Supplier" };
  const secondSupplier = { id: "supplier-2", name: "Second Supplier", displayName: null };
  const trackedItem = {
    id: "item-1",
    name: "Tracked Item",
    sku: "TRK",
    type: ItemType.PRODUCT,
    status: ItemStatus.ACTIVE,
    inventoryTracking: true,
  };
  const secondItem = {
    id: "item-2",
    name: "Second Item",
    sku: "SND",
    type: ItemType.PRODUCT,
    status: ItemStatus.ACTIVE,
    inventoryTracking: true,
  };

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      purchaseOrder: { findMany: jest.fn().mockResolvedValue([purchaseOrder()]) },
      purchaseBill: { findMany: jest.fn().mockResolvedValue([purchaseBill()]) },
      purchaseReceipt: { findMany: jest.fn().mockResolvedValue([purchaseReceipt()]) },
      purchaseReturn: { findMany: jest.fn().mockResolvedValue([]) },
      purchaseMatchingReview: { findMany: jest.fn().mockResolvedValue([]) },
      journalEntry: { create: jest.fn(), update: jest.fn() },
      journalLine: { create: jest.fn(), update: jest.fn() },
      stockMovement: { create: jest.fn(), update: jest.fn() },
      inventoryVarianceProposal: { create: jest.fn(), update: jest.fn() },
      ...overrides,
    };
    return { service: new InventoryValuationVariancePreviewService(prisma as never), prisma };
  }

  it("previews price variance without mutating accounting or inventory state", async () => {
    const { service, prisma } = makeService();

    const preview = await service.list("org-1");

    expect(preview.readOnly).toBe(true);
    expect(preview.previewOnly).toBe(true);
    expect(preview.noMutation).toBe(true);
    expect(preview.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          varianceType: "PRICE_VARIANCE",
          varianceAmount: "20.0000",
          receiptUnitCost: "12.0000",
          billUnitCost: "10.0000",
          status: "NEEDS_ACCOUNTANT_REVIEW",
          suggestedReviewAction: expect.stringContaining("Review receipt and bill unit cost"),
        }),
      ]),
    );
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }),
    );
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    expect(prisma.inventoryVarianceProposal.create).not.toHaveBeenCalled();
  });

  it("previews quantity variance, summary totals, and supplier grouping", async () => {
    const twelveUnitOrder = purchaseOrder({ total: new Prisma.Decimal("120.0000"), lines: [orderLine({ quantity: "12.0000" })] });
    const { service } = makeService({
      purchaseOrder: { findMany: jest.fn().mockResolvedValue([twelveUnitOrder]) },
      purchaseBill: { findMany: jest.fn().mockResolvedValue([purchaseBill({ purchaseOrder: twelveUnitOrder })]) },
      purchaseReceipt: {
        findMany: jest.fn().mockResolvedValue([
          purchaseReceipt({
            purchaseOrder: {
              id: "po-1",
              purchaseOrderNumber: "PO-000001",
              status: PurchaseOrderStatus.APPROVED,
              orderDate: new Date("2026-06-01T00:00:00.000Z"),
              total: new Prisma.Decimal("120.0000"),
            },
            lines: [receiptLine({ quantity: "12.0000", unitCost: "10.0000" })],
          }),
        ]),
      },
    });

    const preview = await service.list("org-1");

    expect(preview.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          varianceType: "QUANTITY_VARIANCE",
          varianceQuantity: "2.0000",
          varianceAmount: "20.0000",
        }),
      ]),
    );
    expect(preview.summary.totalVarianceCount).toBe(1);
    expect(preview.summary.totalAbsoluteVarianceAmount).toBe("20.0000");
    expect(preview.summary.positiveVarianceAmount).toBe("20.0000");
    expect(preview.supplierGroups[0]).toEqual(
      expect.objectContaining({
        supplierId: supplier.id,
        supplierName: "Example Supplier",
        varianceCount: 1,
        totalVarianceAmount: "20.0000",
        itemsAffected: 1,
      }),
    );
  });

  it("previews receipt-without-bill situations", async () => {
    const { service } = makeService({
      purchaseOrder: { findMany: jest.fn().mockResolvedValue([]) },
      purchaseBill: { findMany: jest.fn().mockResolvedValue([]) },
      purchaseReceipt: { findMany: jest.fn().mockResolvedValue([standaloneReceipt()]) },
    });

    const preview = await service.list("org-1");

    expect(preview.items[0]).toEqual(
      expect.objectContaining({
        varianceType: "RECEIPT_WITHOUT_BILL",
        severity: "HIGH",
        receivedQuantity: "3.0000",
        billedQuantity: "0.0000",
        varianceAmount: "21.0000",
      }),
    );
  });

  it("previews bill-without-receipt situations", async () => {
    const { service } = makeService({
      purchaseReceipt: { findMany: jest.fn().mockResolvedValue([]) },
    });

    const preview = await service.list("org-1");

    expect(preview.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          varianceType: "BILL_WITHOUT_RECEIPT",
          severity: "HIGH",
          billedQuantity: "10.0000",
          receivedQuantity: "0.0000",
          varianceAmount: "-100.0000",
        }),
      ]),
    );
  });

  it("previews return-related pending credit value", async () => {
    const { service } = makeService({
      purchaseReturn: { findMany: jest.fn().mockResolvedValue([purchaseReturn()]) },
    });

    const preview = await service.list("org-1");

    expect(preview.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          varianceType: "RETURN_PENDING_CREDIT",
          status: "NEEDS_RETURN_REVIEW",
          purchaseReturn: expect.objectContaining({ id: "return-1", purchaseReturnNumber: "PRN-000001" }),
          returnedQuantity: "2.0000",
          returnedValue: "20.0000",
          varianceAmount: "-20.0000",
        }),
      ]),
    );
    expect(preview.summary.returnRelatedVarianceCount).toBe(1);
  });

  it("attaches matching-review variance context and supports matching review source filter", async () => {
    const { service } = makeService({
      purchaseMatchingReview: {
        findMany: jest.fn().mockResolvedValue([
          matchingReview({ sourceType: "purchaseBill", sourceId: "bill-1", exceptionType: "BILL_PENDING_RECEIPT" }),
        ]),
      },
    });

    const preview = await service.forMatchingReview("org-1", "review-1");

    expect(preview.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          matchingReview: expect.objectContaining({ id: "review-1", status: "NEEDS_VARIANCE_REVIEW" }),
          matchingReviewRelated: true,
          sourceDocumentLinks: expect.arrayContaining([expect.objectContaining({ type: "purchaseBill", number: "BILL-000001" })]),
        }),
      ]),
    );
    expect(preview.summary.matchingReviewRelatedVarianceCount).toBeGreaterThan(0);
  });

  it("applies supplier, item, type, severity, source, date, and search filters", async () => {
    const { service } = makeService({
      purchaseOrder: { findMany: jest.fn().mockResolvedValue([purchaseOrder(), purchaseOrder({ id: "po-2", purchaseOrderNumber: "PO-000002", supplier: secondSupplier, supplierId: secondSupplier.id, lines: [orderLine({ id: "po-line-2", item: secondItem, itemId: secondItem.id, description: "Second item" })] })]) },
      purchaseBill: { findMany: jest.fn().mockResolvedValue([purchaseBill(), purchaseBill({ id: "bill-2", billNumber: "BILL-000002", supplier: secondSupplier, supplierId: secondSupplier.id, purchaseOrderId: "po-2", purchaseOrder: purchaseOrder({ id: "po-2", purchaseOrderNumber: "PO-000002", supplier: secondSupplier, supplierId: secondSupplier.id, lines: [orderLine({ id: "po-line-2", item: secondItem, itemId: secondItem.id, description: "Second item" })] }), lines: [billLine({ id: "bill-line-2", item: secondItem, itemId: secondItem.id, description: "Second item", unitPrice: "15.0000" })] })]) },
      purchaseReceipt: { findMany: jest.fn().mockResolvedValue([purchaseReceipt(), purchaseReceipt({ id: "receipt-2", receiptNumber: "PRC-000002", supplier: secondSupplier, supplierId: secondSupplier.id, purchaseOrderId: "po-2", purchaseBillId: "bill-2", purchaseOrder: { id: "po-2", purchaseOrderNumber: "PO-000002", status: PurchaseOrderStatus.APPROVED, orderDate: new Date("2026-06-10T00:00:00.000Z"), total: new Prisma.Decimal("150.0000") }, purchaseBill: { id: "bill-2", billNumber: "BILL-000002", status: PurchaseBillStatus.FINALIZED, billDate: new Date("2026-06-10T00:00:00.000Z"), total: new Prisma.Decimal("150.0000"), inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET, purchaseOrderId: "po-2" }, lines: [receiptLine({ id: "receipt-line-2", purchaseBillLineId: "bill-line-2", purchaseOrderLineId: "po-line-2", item: secondItem, itemId: secondItem.id, quantity: "10.0000", unitCost: "20.0000" })] })]) },
    });

    const preview = await service.list("org-1", {
      supplierId: secondSupplier.id,
      itemId: secondItem.id,
      varianceType: "PRICE_VARIANCE",
      severity: "MEDIUM",
      sourceType: "purchaseReceipt",
      from: "2026-06-09",
      to: "2026-06-11",
      search: "PRC-000002",
    });

    expect(preview.items).toHaveLength(1);
    expect(preview.items[0]).toEqual(
      expect.objectContaining({
        supplier: expect.objectContaining({ id: secondSupplier.id }),
        item: expect.objectContaining({ id: secondItem.id }),
        purchaseReceipt: expect.objectContaining({ id: "receipt-2" }),
      }),
    );
  });

  it("uses tenant-scoped reads and returns summary-only data", async () => {
    const { service, prisma } = makeService();

    const summary = await service.summary("org-2");

    expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-2" }) }));
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-2" }) }));
    expect(prisma.purchaseReceipt.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-2" }) }));
    expect(summary).toEqual(expect.objectContaining({ totalVarianceCount: expect.any(Number), suppliersAffected: expect.any(Number) }));
  });

  function purchaseOrder(overrides: Record<string, unknown> = {}) {
    return {
      id: "po-1",
      purchaseOrderNumber: "PO-000001",
      supplierId: supplier.id,
      status: PurchaseOrderStatus.APPROVED,
      orderDate: new Date("2026-06-01T00:00:00.000Z"),
      total: new Prisma.Decimal("100.0000"),
      supplier,
      lines: [orderLine()],
      ...overrides,
    };
  }

  function orderLine(overrides: Record<string, unknown> = {}) {
    return {
      id: "po-line-1",
      itemId: trackedItem.id,
      description: "Tracked item",
      quantity: new Prisma.Decimal("10.0000"),
      unitPrice: new Prisma.Decimal("10.0000"),
      sortOrder: 0,
      item: trackedItem,
      ...overrides,
    };
  }

  function purchaseBill(overrides: Record<string, unknown> = {}) {
    return {
      id: "bill-1",
      billNumber: "BILL-000001",
      supplierId: supplier.id,
      purchaseOrderId: "po-1",
      status: PurchaseBillStatus.FINALIZED,
      inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
      billDate: new Date("2026-06-02T00:00:00.000Z"),
      total: new Prisma.Decimal("100.0000"),
      currency: "SAR",
      supplier,
      purchaseOrder: purchaseOrder(),
      lines: [billLine()],
      ...overrides,
    };
  }

  function billLine(overrides: Record<string, unknown> = {}) {
    return {
      id: "bill-line-1",
      itemId: trackedItem.id,
      description: "Tracked item",
      quantity: new Prisma.Decimal("10.0000"),
      unitPrice: new Prisma.Decimal("10.0000"),
      sortOrder: 0,
      item: trackedItem,
      ...overrides,
    };
  }

  function purchaseReceipt(overrides: Record<string, unknown> = {}) {
    return {
      id: "receipt-1",
      receiptNumber: "PRC-000001",
      supplierId: supplier.id,
      purchaseOrderId: "po-1",
      purchaseBillId: "bill-1",
      status: PurchaseReceiptStatus.POSTED,
      receiptDate: new Date("2026-06-03T00:00:00.000Z"),
      supplier,
      purchaseOrder: { id: "po-1", purchaseOrderNumber: "PO-000001", status: PurchaseOrderStatus.APPROVED, orderDate: new Date("2026-06-01T00:00:00.000Z"), total: new Prisma.Decimal("100.0000") },
      purchaseBill: { id: "bill-1", billNumber: "BILL-000001", status: PurchaseBillStatus.FINALIZED, billDate: new Date("2026-06-02T00:00:00.000Z"), total: new Prisma.Decimal("100.0000"), inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET, purchaseOrderId: "po-1" },
      lines: [receiptLine()],
      ...overrides,
    };
  }

  function receiptLine(overrides: Record<string, unknown> = {}) {
    return {
      id: "receipt-line-1",
      itemId: trackedItem.id,
      purchaseOrderLineId: "po-line-1",
      purchaseBillLineId: "bill-line-1",
      quantity: new Prisma.Decimal("10.0000"),
      unitCost: new Prisma.Decimal("12.0000"),
      item: trackedItem,
      purchaseOrderLine: { id: "po-line-1", description: "Tracked item", quantity: new Prisma.Decimal("10.0000"), unitPrice: new Prisma.Decimal("10.0000") },
      purchaseBillLine: { id: "bill-line-1", description: "Tracked item", quantity: new Prisma.Decimal("10.0000"), unitPrice: new Prisma.Decimal("10.0000") },
      ...overrides,
    };
  }

  function standaloneReceipt(overrides: Record<string, unknown> = {}) {
    return purchaseReceipt({
      id: "receipt-standalone-1",
      receiptNumber: "PRC-STANDALONE",
      purchaseOrderId: null,
      purchaseBillId: null,
      purchaseOrder: null,
      purchaseBill: null,
      lines: [receiptLine({ id: "receipt-line-standalone-1", purchaseOrderLineId: null, purchaseBillLineId: null, quantity: "3.0000", unitCost: "7.0000" })],
      ...overrides,
    });
  }

  function purchaseReturn(overrides: Record<string, unknown> = {}) {
    return {
      id: "return-1",
      purchaseReturnNumber: "PRN-000001",
      supplierId: supplier.id,
      status: PurchaseReturnStatus.APPROVED,
      returnDate: new Date("2026-06-04T00:00:00.000Z"),
      sourcePurchaseBillId: "bill-1",
      sourcePurchaseOrderId: "po-1",
      sourcePurchaseReceiptId: "receipt-1",
      sourceMatchingReviewId: null,
      relatedPurchaseDebitNoteId: null,
      relatedSupplierRefundId: null,
      supplier,
      sourcePurchaseBill: { id: "bill-1", billNumber: "BILL-000001", status: PurchaseBillStatus.FINALIZED, billDate: new Date("2026-06-02T00:00:00.000Z"), total: new Prisma.Decimal("100.0000"), supplierId: supplier.id },
      sourcePurchaseOrder: { id: "po-1", purchaseOrderNumber: "PO-000001", status: PurchaseOrderStatus.APPROVED, orderDate: new Date("2026-06-01T00:00:00.000Z"), total: new Prisma.Decimal("100.0000"), supplierId: supplier.id },
      sourcePurchaseReceipt: { id: "receipt-1", receiptNumber: "PRC-000001", status: PurchaseReceiptStatus.POSTED, receiptDate: new Date("2026-06-03T00:00:00.000Z"), supplierId: supplier.id, purchaseOrderId: "po-1", purchaseBillId: "bill-1" },
      sourceMatchingReview: null,
      lines: [
        {
          id: "return-line-1",
          itemId: trackedItem.id,
          description: "Tracked item",
          quantity: new Prisma.Decimal("2.0000"),
          unitCost: new Prisma.Decimal("10.0000"),
          sourcePurchaseBillLineId: "bill-line-1",
          sourcePurchaseReceiptLineId: "receipt-line-1",
          sourcePurchaseOrderLineId: "po-line-1",
          item: trackedItem,
          sourcePurchaseBillLine: { id: "bill-line-1", billId: "bill-1", description: "Tracked item", quantity: new Prisma.Decimal("10.0000"), unitPrice: new Prisma.Decimal("10.0000") },
          sourcePurchaseReceiptLine: { id: "receipt-line-1", receiptId: "receipt-1", quantity: new Prisma.Decimal("10.0000"), unitCost: new Prisma.Decimal("12.0000") },
          sourcePurchaseOrderLine: { id: "po-line-1", purchaseOrderId: "po-1", description: "Tracked item", quantity: new Prisma.Decimal("10.0000"), unitPrice: new Prisma.Decimal("10.0000") },
        },
      ],
      ...overrides,
    };
  }

  function matchingReview(overrides: Record<string, unknown> = {}) {
    return {
      id: "review-1",
      supplierId: supplier.id,
      supplier,
      sourceType: "purchaseBill",
      sourceId: "bill-1",
      exceptionType: "BILL_PENDING_RECEIPT",
      severity: "HIGH",
      status: PurchaseMatchingReviewStatus.NEEDS_VARIANCE_REVIEW,
      reasonCode: PurchaseMatchingReviewReason.PRICE_MISMATCH,
      note: "Needs variance review",
      purchaseReturns: [],
      ...overrides,
    };
  }
});
