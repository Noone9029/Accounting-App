import {
  PurchaseBillInventoryPostingMode,
  PurchaseBillStatus,
  PurchaseMatchingReviewReason,
  PurchaseMatchingReviewStatus,
  PurchaseOrderStatus,
  PurchaseReceiptStatus,
  Prisma,
} from "@prisma/client";
import { PurchaseMatchingService } from "./purchase-matching.service";

describe("PurchaseMatchingService", () => {
  const supplier = { id: "supplier-1", name: "Example Supplier", displayName: "Example Supplier" };
  const item = { id: "item-1", name: "Tracked Item", sku: "TRK", inventoryTracking: true };
  const orderLine = {
    id: "po-line-1",
    itemId: item.id,
    description: "Tracked item",
    quantity: new Prisma.Decimal("10.0000"),
    unitPrice: new Prisma.Decimal("25.0000"),
    sortOrder: 0,
    item,
  };
  const billLine = {
    id: "bill-line-1",
    itemId: item.id,
    description: "Tracked item",
    quantity: new Prisma.Decimal("12.0000"),
    unitPrice: new Prisma.Decimal("25.0000"),
    sortOrder: 0,
    item,
    account: { id: "account-1", code: "511", name: "Purchases", type: "EXPENSE" },
  };

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      purchaseOrder: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      purchaseBill: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      purchaseReceipt: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      purchaseMatchingReview: {
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
      },
      contact: { findFirst: jest.fn() },
      organizationMember: { findFirst: jest.fn() },
      journalEntry: { create: jest.fn(), update: jest.fn() },
      stockMovement: { create: jest.fn(), update: jest.fn() },
      ...overrides,
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    return { service: new PurchaseMatchingService(prisma as never, audit as never), prisma, audit };
  }

  it("summarizes over-billed purchase order lines without mutating source records", async () => {
    const { service, prisma } = makeService();
    prisma.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1",
      purchaseOrderNumber: "PO-000001",
      supplierId: supplier.id,
      status: PurchaseOrderStatus.APPROVED,
      orderDate: new Date("2026-06-05T00:00:00.000Z"),
      total: new Prisma.Decimal("250.0000"),
      supplier,
      lines: [orderLine],
    });
    prisma.purchaseBill.findMany.mockResolvedValue([
      {
        id: "bill-1",
        billNumber: "BILL-000001",
        supplierId: supplier.id,
        purchaseOrderId: "po-1",
        status: PurchaseBillStatus.FINALIZED,
        inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
        billDate: new Date("2026-06-05T00:00:00.000Z"),
        total: new Prisma.Decimal("300.0000"),
        supplier,
        lines: [billLine],
      },
    ]);
    prisma.purchaseReceipt.findMany.mockResolvedValue([
      {
        id: "receipt-1",
        receiptNumber: "PRC-000001",
        purchaseOrderId: null,
        purchaseBillId: "bill-1",
        supplierId: supplier.id,
        status: PurchaseReceiptStatus.POSTED,
        receiptDate: new Date("2026-06-05T00:00:00.000Z"),
        inventoryAssetJournalEntryId: null,
        inventoryAssetReversalJournalEntryId: null,
        supplier,
        purchaseOrder: null,
        purchaseBill: { id: "bill-1", billNumber: "BILL-000001", status: PurchaseBillStatus.FINALIZED, billDate: new Date(), total: new Prisma.Decimal("300.0000"), inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET },
        lines: [
          {
            id: "receipt-line-1",
            itemId: item.id,
            purchaseOrderLineId: null,
            purchaseBillLineId: billLine.id,
            quantity: new Prisma.Decimal("7.0000"),
            unitCost: new Prisma.Decimal("25.0000"),
            item,
          },
        ],
      },
    ]);

    const summary = await service.forPurchaseOrder("org-1", "po-1");

    expect(prisma.purchaseOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "po-1", organizationId: "org-1" } }));
    expect(summary.status).toBe("Over billed");
    expect(summary.noMutation).toBe(true);
    expect(summary.totals).toMatchObject({
      orderedQuantity: "10.0000",
      billedQuantity: "12.0000",
      receivedQuantity: "7.0000",
      overBilledQuantity: "2.0000",
      remainingToReceive: "3.0000",
    });
    expect(summary.lines[0]).toMatchObject({
      status: "Over billed",
      remainingToBill: "0.0000",
      overBilledQuantity: "2.0000",
    });
  });

  it("shows bill pending receipt when a purchase bill has no purchase order source", async () => {
    const { service, prisma } = makeService();
    prisma.purchaseBill.findFirst.mockResolvedValue({
      id: "bill-1",
      billNumber: "BILL-000001",
      supplierId: supplier.id,
      purchaseOrderId: null,
      status: PurchaseBillStatus.FINALIZED,
      inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
      billDate: new Date("2026-06-05T00:00:00.000Z"),
      total: new Prisma.Decimal("300.0000"),
      supplier,
      purchaseOrder: null,
      lines: [billLine],
    });
    prisma.purchaseReceipt.findMany.mockResolvedValue([
      {
        id: "receipt-1",
        receiptNumber: "PRC-000001",
        purchaseOrderId: null,
        purchaseBillId: "bill-1",
        supplierId: supplier.id,
        status: PurchaseReceiptStatus.POSTED,
        receiptDate: new Date("2026-06-05T00:00:00.000Z"),
        inventoryAssetJournalEntryId: null,
        inventoryAssetReversalJournalEntryId: null,
        supplier,
        purchaseOrder: null,
        purchaseBill: null,
        lines: [
          {
            id: "receipt-line-1",
            itemId: item.id,
            purchaseOrderLineId: null,
            purchaseBillLineId: billLine.id,
            quantity: new Prisma.Decimal("3.0000"),
            unitCost: new Prisma.Decimal("25.0000"),
            item,
          },
        ],
      },
    ]);

    const summary = await service.forPurchaseBill("org-1", "bill-1");

    expect(summary.status).toBe("Bill pending receipt");
    expect(summary.purchaseOrder).toBeNull();
    expect(summary.lines[0]).toMatchObject({
      orderedQuantity: null,
      billedQuantity: "12.0000",
      receivedQuantity: "3.0000",
      remainingToReceive: "9.0000",
      status: "Bill pending receipt",
    });
    expect(summary.warnings).toContain("This bill is not linked to a purchase order, so ordered quantity comparison is unavailable.");
  });

  it("marks standalone receipts as receipt pending bill", async () => {
    const { service, prisma } = makeService();
    prisma.purchaseReceipt.findFirst.mockResolvedValue({
      id: "receipt-1",
      receiptNumber: "PRC-000001",
      purchaseOrderId: null,
      purchaseBillId: null,
      supplierId: supplier.id,
      status: PurchaseReceiptStatus.POSTED,
      receiptDate: new Date("2026-06-05T00:00:00.000Z"),
      inventoryAssetJournalEntryId: null,
      inventoryAssetReversalJournalEntryId: null,
      supplier,
      purchaseOrder: null,
      purchaseBill: null,
      lines: [
        {
          id: "receipt-line-1",
          itemId: item.id,
          purchaseOrderLineId: null,
          purchaseBillLineId: null,
          quantity: new Prisma.Decimal("2.0000"),
          unitCost: new Prisma.Decimal("25.0000"),
          item,
        },
      ],
    });

    const summary = await service.forPurchaseReceipt("org-1", "receipt-1");

    expect(summary.sourceType).toBe("purchaseReceipt");
    expect(summary.status).toBe("Receipt pending bill");
    expect(summary.purchaseOrder).toBeNull();
    expect(summary.purchaseBill).toBeNull();
    expect(summary.lines[0]?.warnings).toContain("Standalone receipt is not linked to a purchase order or purchase bill.");
  });

  it("aggregates purchase matching exceptions by supplier and severity without mutation side effects", async () => {
    const { service, prisma } = makeService();
    const secondSupplier = { id: "supplier-2", name: "Second Supplier", displayName: "Second Supplier" };
    const standaloneReceiptLine = {
      id: "receipt-line-2",
      itemId: item.id,
      purchaseOrderLineId: null,
      purchaseBillLineId: null,
      quantity: new Prisma.Decimal("4.0000"),
      unitCost: new Prisma.Decimal("25.0000"),
      item,
    };

    prisma.purchaseOrder.findMany.mockResolvedValue([
      {
        id: "po-1",
        purchaseOrderNumber: "PO-000001",
        supplierId: supplier.id,
        status: PurchaseOrderStatus.APPROVED,
        orderDate: new Date("2026-06-01T00:00:00.000Z"),
        total: new Prisma.Decimal("250.0000"),
        supplier,
        lines: [orderLine],
      },
    ]);
    prisma.purchaseBill.findMany.mockResolvedValue([
      {
        id: "bill-1",
        billNumber: "BILL-000001",
        supplierId: supplier.id,
        purchaseOrderId: "po-1",
        status: PurchaseBillStatus.FINALIZED,
        inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
        billDate: new Date("2026-06-02T00:00:00.000Z"),
        total: new Prisma.Decimal("300.0000"),
        supplier,
        purchaseOrder: null,
        lines: [billLine],
      },
    ]);
    prisma.purchaseReceipt.findMany.mockResolvedValue([
      {
        id: "receipt-1",
        receiptNumber: "PRC-000001",
        purchaseOrderId: null,
        purchaseBillId: "bill-1",
        supplierId: supplier.id,
        status: PurchaseReceiptStatus.POSTED,
        receiptDate: new Date("2026-06-03T00:00:00.000Z"),
        inventoryAssetJournalEntryId: null,
        inventoryAssetReversalJournalEntryId: null,
        supplier,
        purchaseOrder: null,
        purchaseBill: {
          id: "bill-1",
          billNumber: "BILL-000001",
          status: PurchaseBillStatus.FINALIZED,
          billDate: new Date("2026-06-02T00:00:00.000Z"),
          total: new Prisma.Decimal("300.0000"),
          inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
          purchaseOrderId: "po-1",
        },
        lines: [
          {
            id: "receipt-line-1",
            itemId: item.id,
            purchaseOrderLineId: null,
            purchaseBillLineId: billLine.id,
            quantity: new Prisma.Decimal("7.0000"),
            unitCost: new Prisma.Decimal("25.0000"),
            item,
          },
        ],
      },
      {
        id: "receipt-2",
        receiptNumber: "PRC-000002",
        purchaseOrderId: null,
        purchaseBillId: null,
        supplierId: secondSupplier.id,
        status: PurchaseReceiptStatus.POSTED,
        receiptDate: new Date("2026-06-04T00:00:00.000Z"),
        inventoryAssetJournalEntryId: null,
        inventoryAssetReversalJournalEntryId: null,
        supplier: secondSupplier,
        purchaseOrder: null,
        purchaseBill: null,
        lines: [standaloneReceiptLine],
      },
    ]);

    const result = await service.listExceptions("org-1");

    expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", status: { not: PurchaseOrderStatus.VOIDED } } }));
    expect(result.noMutation).toBe(true);
    expect(result.summary).toMatchObject({
      totalExceptionCount: 2,
      criticalCount: 1,
      highCount: 1,
      overBilledCount: 1,
      receiptPendingBillCount: 1,
      suppliersWithExceptions: 2,
    });
    expect(result.groups.map((group) => group.supplierName)).toEqual(["Example Supplier", "Second Supplier"]);
    expect(result.items[0]).toMatchObject({
      exceptionType: "OVER_BILLED",
      severity: "CRITICAL",
      sourceType: "purchaseOrder",
      purchaseOrderNumber: "PO-000001",
      purchaseBillNumber: "BILL-000001",
      purchaseReceiptNumber: "PRC-000001",
    });
    expect(result.items[1]).toMatchObject({
      exceptionType: "RECEIPT_PENDING_BILL",
      severity: "HIGH",
      sourceType: "purchaseReceipt",
      purchaseReceiptNumber: "PRC-000002",
    });
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.purchaseReceipt.findMany).toHaveBeenCalledTimes(1);
  });

  it("filters purchase matching exceptions by supplier, severity, type, source, search, and limit", async () => {
    const { service, prisma } = makeService();
    const standaloneBillLine = {
      ...billLine,
      id: "bill-line-standalone",
      quantity: new Prisma.Decimal("6.0000"),
    };

    prisma.purchaseOrder.findMany.mockResolvedValue([
      {
        id: "po-1",
        purchaseOrderNumber: "PO-000001",
        supplierId: supplier.id,
        status: PurchaseOrderStatus.APPROVED,
        orderDate: new Date("2026-06-01T00:00:00.000Z"),
        total: new Prisma.Decimal("250.0000"),
        supplier,
        lines: [orderLine],
      },
    ]);
    prisma.purchaseBill.findMany.mockResolvedValue([
      {
        id: "bill-standalone",
        billNumber: "BILL-000002",
        supplierId: supplier.id,
        purchaseOrderId: null,
        status: PurchaseBillStatus.FINALIZED,
        inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
        billDate: new Date("2026-06-03T00:00:00.000Z"),
        total: new Prisma.Decimal("150.0000"),
        supplier,
        purchaseOrder: null,
        lines: [standaloneBillLine],
      },
    ]);
    prisma.purchaseReceipt.findMany.mockResolvedValue([
      {
        id: "receipt-standalone",
        receiptNumber: "PRC-000003",
        purchaseOrderId: null,
        purchaseBillId: "bill-standalone",
        supplierId: supplier.id,
        status: PurchaseReceiptStatus.POSTED,
        receiptDate: new Date("2026-06-04T00:00:00.000Z"),
        inventoryAssetJournalEntryId: null,
        inventoryAssetReversalJournalEntryId: null,
        supplier,
        purchaseOrder: null,
        purchaseBill: {
          id: "bill-standalone",
          billNumber: "BILL-000002",
          status: PurchaseBillStatus.FINALIZED,
          billDate: new Date("2026-06-03T00:00:00.000Z"),
          total: new Prisma.Decimal("150.0000"),
          inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
          purchaseOrderId: null,
        },
        lines: [
          {
            id: "receipt-line-standalone",
            itemId: item.id,
            purchaseOrderLineId: null,
            purchaseBillLineId: "bill-line-standalone",
            quantity: new Prisma.Decimal("2.0000"),
            unitCost: new Prisma.Decimal("25.0000"),
            item,
          },
        ],
      },
    ]);

    const result = await service.listExceptions("org-1", {
      supplierId: supplier.id,
      severity: "HIGH",
      exceptionType: "BILL_PENDING_RECEIPT",
      sourceType: "purchaseBill",
      search: "BILL-000002",
      limit: "1",
    });

    expect(result.summary.totalExceptionCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      supplierId: supplier.id,
      exceptionType: "BILL_PENDING_RECEIPT",
      severity: "HIGH",
      sourceType: "purchaseBill",
      sourceNumber: "BILL-000002",
    });
    expect(result.filters).toMatchObject({
      supplierId: supplier.id,
      severity: "HIGH",
      exceptionType: "BILL_PENDING_RECEIPT",
      sourceType: "purchaseBill",
      search: "BILL-000002",
      limit: 1,
    });
  });

  it("creates a tenant-scoped review without mutating PO, AP, journal, or inventory records", async () => {
    const { service, prisma, audit } = makeService({
      purchaseOrder: {
        findFirst: jest.fn().mockResolvedValue({
          id: "po-1",
          purchaseOrderNumber: "PO-000001",
          supplierId: supplier.id,
        }),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      purchaseBill: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      purchaseReceipt: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    });
    prisma.contact.findFirst.mockResolvedValue({ id: supplier.id });
    prisma.purchaseMatchingReview.create.mockResolvedValue(reviewRecord({ reasonCode: PurchaseMatchingReviewReason.OVER_BILLED }));

    const review = await service.createReview("org-1", "user-1", {
      sourceType: "purchaseOrder",
      sourceId: "po-1",
      supplierId: supplier.id,
      exceptionType: "OVER_BILLED",
      severity: "CRITICAL",
      reasonCode: PurchaseMatchingReviewReason.OVER_BILLED,
      note: "Review quantity mismatch with supplier.",
    });

    expect(review).toMatchObject({
      id: "review-1",
      sourceType: "purchaseOrder",
      sourceId: "po-1",
      status: PurchaseMatchingReviewStatus.OPEN,
      reasonCode: PurchaseMatchingReviewReason.OVER_BILLED,
      reviewOnly: true,
      noPostingEffect: true,
    });
    expect(prisma.purchaseMatchingReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          sourceType: "purchaseOrder",
          sourceId: "po-1",
          supplierId: supplier.id,
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CREATE",
        entityType: "PurchaseMatchingReview",
        entityId: "review-1",
      }),
    );
    expect(JSON.stringify(audit.log.mock.calls)).not.toContain("Review quantity mismatch with supplier.");
    expect(prisma.purchaseOrder.update).not.toHaveBeenCalled();
    expect(prisma.purchaseBill.update).not.toHaveBeenCalled();
    expect(prisma.purchaseReceipt.update).not.toHaveBeenCalled();
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
  });

  it("blocks cross-tenant or invalid source reviews before creating review rows", async () => {
    const { service, prisma } = makeService();
    prisma.purchaseOrder.findFirst.mockResolvedValue(null);

    await expect(
      service.createReview("org-1", "user-1", {
        sourceType: "purchaseOrder",
        sourceId: "po-cross-tenant",
        exceptionType: "OVER_BILLED",
        severity: "CRITICAL",
      }),
    ).rejects.toThrow("Purchase order source not found.");
    expect(prisma.purchaseMatchingReview.create).not.toHaveBeenCalled();
  });

  it("runs review lifecycle transitions and blocks resolved review mutation", async () => {
    const { service, prisma, audit } = makeService();
    prisma.purchaseMatchingReview.findFirst.mockResolvedValueOnce(reviewRecord());
    prisma.purchaseMatchingReview.update.mockResolvedValueOnce(
      reviewRecord({ status: PurchaseMatchingReviewStatus.IN_REVIEW, reviewedByUserId: "user-1", reviewedAt: new Date("2026-06-05T10:00:00.000Z") }),
    );

    const started = await service.startReview("org-1", "user-1", "review-1");

    expect(started.status).toBe(PurchaseMatchingReviewStatus.IN_REVIEW);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "START", entityType: "PurchaseMatchingReview" }));

    prisma.purchaseMatchingReview.findFirst.mockResolvedValueOnce(reviewRecord({ status: PurchaseMatchingReviewStatus.RESOLVED }));
    await expect(service.cancelReview("org-1", "user-1", "review-1")).rejects.toThrow("Resolved or cancelled purchase matching reviews cannot be changed.");
  });

  it("includes matching review metadata in exception center results and filters by review status", async () => {
    const { service, prisma } = makeService();
    prisma.purchaseOrder.findMany.mockResolvedValue([
      {
        id: "po-1",
        purchaseOrderNumber: "PO-000001",
        supplierId: supplier.id,
        status: PurchaseOrderStatus.APPROVED,
        orderDate: new Date("2026-06-01T00:00:00.000Z"),
        total: new Prisma.Decimal("250.0000"),
        supplier,
        lines: [orderLine],
      },
    ]);
    prisma.purchaseBill.findMany.mockResolvedValue([
      {
        id: "bill-1",
        billNumber: "BILL-000001",
        supplierId: supplier.id,
        purchaseOrderId: "po-1",
        status: PurchaseBillStatus.FINALIZED,
        inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
        billDate: new Date("2026-06-02T00:00:00.000Z"),
        total: new Prisma.Decimal("300.0000"),
        supplier,
        purchaseOrder: null,
        lines: [billLine],
      },
    ]);
    prisma.purchaseReceipt.findMany.mockResolvedValue([]);
    prisma.purchaseMatchingReview.findMany.mockResolvedValue([
      reviewRecord({
        status: PurchaseMatchingReviewStatus.WAITING_FOR_SUPPLIER,
        reasonCode: PurchaseMatchingReviewReason.OVER_BILLED,
        assignedToUser: { id: "user-2", name: "Reviewer", email: "reviewer@example.com" },
      }),
    ]);

    const result = await service.listExceptions("org-1", { reviewStatus: PurchaseMatchingReviewStatus.WAITING_FOR_SUPPLIER });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      reviewId: "review-1",
      reviewStatus: PurchaseMatchingReviewStatus.WAITING_FOR_SUPPLIER,
      reasonCode: PurchaseMatchingReviewReason.OVER_BILLED,
      assignedTo: { id: "user-2", name: "Reviewer", email: "reviewer@example.com" },
    });
    expect(result.groups[0]?.outstandingReviewCount).toBe(1);
  });
});

function reviewRecord(overrides: Record<string, unknown> = {}) {
  const reviewSupplier = { id: "supplier-1", name: "Example Supplier", displayName: "Example Supplier" };
  return {
    id: "review-1",
    organizationId: "org-1",
    supplierId: reviewSupplier.id,
    sourceType: "purchaseOrder",
    sourceId: "po-1",
    exceptionType: "OVER_BILLED",
    severity: "CRITICAL",
    status: PurchaseMatchingReviewStatus.OPEN,
    reasonCode: null,
    assignedToUserId: null,
    reviewedByUserId: null,
    reviewedAt: null,
    nextReviewDate: null,
    note: "Review quantity mismatch with supplier.",
    createdAt: new Date("2026-06-05T00:00:00.000Z"),
    updatedAt: new Date("2026-06-05T00:00:00.000Z"),
    supplier: reviewSupplier,
    assignedToUser: null,
    reviewedByUser: null,
    ...overrides,
  };
}
