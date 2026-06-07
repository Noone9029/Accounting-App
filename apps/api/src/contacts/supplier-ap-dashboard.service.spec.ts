import {
  Prisma,
  PurchaseBillStatus,
  PurchaseMatchingReviewStatus,
  PurchaseOrderStatus,
  PurchaseReturnStatus,
  SupplierPaymentStatus,
} from "@prisma/client";
import { SupplierApDashboardService, type SupplierApDashboardPermissionContext } from "./supplier-ap-dashboard.service";

describe("SupplierApDashboardService", () => {
  const asOf = new Date("2026-06-05T12:00:00.000Z");

  function makeService(options: {
    permissions?: Partial<SupplierApDashboardPermissionContext>;
    matchingResponse?: ReturnType<typeof matchingResponse>;
    varianceResponse?: ReturnType<typeof varianceResponse>;
  } = {}) {
    const prisma = {
      purchaseBill: {
        findMany: jest.fn().mockResolvedValue(openBills()),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      purchaseOrder: {
        findMany: jest.fn().mockResolvedValue(openPurchaseOrders()),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      purchaseReceipt: {
        findMany: jest.fn().mockResolvedValue(recentPurchaseReceipts()),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      purchaseReturn: {
        findMany: jest.fn().mockResolvedValue(purchaseReturns()),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      purchaseMatchingReview: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue(recentMatchingReviews()),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      supplierPayment: {
        findMany: jest.fn().mockResolvedValue(recentSupplierPayments()),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      purchaseDebitNote: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      supplierRefund: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    const purchaseMatchingService = {
      listExceptions: jest.fn().mockResolvedValue(options.matchingResponse ?? matchingResponse()),
    };
    const valuationVariancePreviewService = {
      list: jest.fn().mockResolvedValue(options.varianceResponse ?? varianceResponse()),
    };
    const service = new SupplierApDashboardService(
      prisma as never,
      purchaseMatchingService as never,
      valuationVariancePreviewService as never,
    );

    return {
      service,
      prisma,
      purchaseMatchingService,
      valuationVariancePreviewService,
      permissions: { ...fullPermissions(), ...options.permissions },
    };
  }

  it("summarizes AP dashboard totals, overdue bills, due-soon bills, top suppliers, matching, returns, and variances", async () => {
    const { service, prisma, purchaseMatchingService, valuationVariancePreviewService } = makeService();

    const result = await service.dashboard("org-1", fullPermissions(), asOf);

    expect(result.readOnly).toBe(true);
    expect(result.noMutation).toBe(true);
    expect(result.noPostingEffect).toBe(true);
    expect(result.apSummary).toMatchObject({
      openPayablesTotal: "150.0000",
      overdueBillsTotal: "100.0000",
      openBillCount: 2,
      overdueBillCount: 1,
      purchaseOrdersOpenCount: 2,
      purchaseReceiptsPendingBillCount: 1,
      purchaseBillsPendingReceiptCount: 1,
      matchingExceptionCount: 3,
      matchingCriticalCount: 1,
      matchingReviewOpenCount: 2,
      returnsOpenCount: 2,
      returnsCompletedCount: 1,
      returnsAwaitingInventoryMovementCount: 2,
      returnsInventoryMovementPostedCount: 0,
      variancePreviewCount: 2,
      variancePreviewTotal: "25.0000",
      suppliersWithOpenPayables: 2,
      suppliersWithExceptions: 2,
    });
    expect(result.apSummary.topSuppliersByPayable[0]).toMatchObject({
      supplierId: "supplier-1",
      supplierName: "Alpha Supplier",
      amount: "100.0000",
      href: "/suppliers/supplier-1",
    });
    expect(result.apSummary.upcomingDueBills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "bill-overdue", attentionCategory: "Bills overdue", dueStatus: "OVERDUE" }),
        expect.objectContaining({ id: "bill-due-soon", attentionCategory: "Bills due soon", dueStatus: "DUE_SOON" }),
      ]),
    );
    expect(result.apSummary.topSuppliersByExceptionSeverity[0]).toMatchObject({
      supplierId: "supplier-1",
      highestSeverity: "CRITICAL",
      exceptionCount: 2,
    });
    expect(result.apSummary.purchaseReturnsAwaitingAction).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "return-submitted", attentionCategory: "Purchase returns awaiting approval/completion" }),
        expect.objectContaining({
          id: "return-approved",
          attentionCategory: "Purchase returns awaiting inventory movement",
          inventoryMovementStatus: "NOT_POSTED",
        }),
      ]),
    );
    expect(result.apSummary.variancePreviewsNeedingReview[0]).toMatchObject({
      id: "variance-1",
      attentionCategory: "Valuation variance previews needing review",
    });
    expect(result.apSummary.recentSupplierActivity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceType: "SupplierPayment", category: "financialPosting" }),
        expect.objectContaining({ sourceType: "PurchaseReturn", category: "operationalNonPosting", nonPosting: true }),
      ]),
    );
    expect(purchaseMatchingService.listExceptions).toHaveBeenCalledWith("org-1", { limit: 1000 });
    expect(valuationVariancePreviewService.list).toHaveBeenCalledWith("org-1", { limit: 1000 });
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          status: PurchaseBillStatus.FINALIZED,
          balanceDue: { gt: 0 },
        }),
      }),
    );
    expectMutationMethodsNotCalled(prisma);
  });

  it("returns supplier detail AP summary with the same read-only rules and supplier scoping", async () => {
    const { service, prisma, purchaseMatchingService, valuationVariancePreviewService } = makeService();

    const result = await service.supplierSummary("org-1", "supplier-1", fullPermissions(), asOf);

    expect(result).toMatchObject({
      readOnly: true,
      noMutation: true,
      supplierId: "supplier-1",
      outstandingPayableBalance: "150.0000",
      overdueBillsTotal: "100.0000",
      overdueBillCount: 1,
      openPurchaseOrders: 2,
      purchaseReceiptsPendingBill: 1,
      purchaseBillsPendingReceipt: 1,
      openPurchaseReturns: 2,
      openMatchingReviews: 2,
      valuationVariancePreviews: 2,
    });
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ supplierId: "supplier-1" }) }));
    expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ supplierId: "supplier-1" }) }));
    expect(purchaseMatchingService.listExceptions).toHaveBeenCalledWith("org-1", { limit: 1000, supplierId: "supplier-1" });
    expect(valuationVariancePreviewService.list).toHaveBeenCalledWith("org-1", { limit: 1000, supplierId: "supplier-1" });
    expectMutationMethodsNotCalled(prisma);
  });

  it("uses source permissions to avoid querying or exposing restricted dashboard sources", async () => {
    const { service, prisma, purchaseMatchingService, valuationVariancePreviewService, permissions } = makeService({
      permissions: {
        canViewPurchaseOrders: false,
        canViewPurchaseReceiving: false,
        canViewPurchaseMatching: false,
        canViewInventoryValuation: false,
        canViewSupplierPayments: false,
        canViewPurchaseDebitNotes: false,
        canViewSupplierRefunds: false,
      },
    });

    const result = await service.dashboard("org-2", permissions, asOf);

    expect(result.apSummary.openPayablesTotal).toBe("150.0000");
    expect(result.apSummary.purchaseOrdersOpenCount).toBe(0);
    expect(result.apSummary.matchingExceptionCount).toBe(0);
    expect(result.apSummary.variancePreviewCount).toBe(0);
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-2" }) }));
    expect(prisma.purchaseOrder.findMany).not.toHaveBeenCalled();
    expect(prisma.purchaseReceipt.findMany).not.toHaveBeenCalled();
    expect(prisma.supplierPayment.findMany).not.toHaveBeenCalled();
    expect(purchaseMatchingService.listExceptions).not.toHaveBeenCalled();
    expect(valuationVariancePreviewService.list).not.toHaveBeenCalled();
  });
});

function fullPermissions(): SupplierApDashboardPermissionContext {
  return {
    canViewSuppliers: true,
    canViewPurchaseBills: true,
    canViewPurchaseOrders: true,
    canViewPurchaseReceiving: true,
    canViewPurchaseMatching: true,
    canViewInventoryValuation: true,
    canViewSupplierPayments: true,
    canViewPurchaseDebitNotes: true,
    canViewSupplierRefunds: true,
  };
}

function openBills() {
  return [
    {
      id: "bill-overdue",
      billNumber: "BILL-000001",
      supplierId: "supplier-1",
      supplier: { id: "supplier-1", name: "Alpha Supplier", displayName: null },
      billDate: new Date("2026-05-01T00:00:00.000Z"),
      dueDate: new Date("2026-05-30T00:00:00.000Z"),
      currency: "SAR",
      status: PurchaseBillStatus.FINALIZED,
      total: new Prisma.Decimal("120.0000"),
      balanceDue: new Prisma.Decimal("100.0000"),
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
    },
    {
      id: "bill-due-soon",
      billNumber: "BILL-000002",
      supplierId: "supplier-2",
      supplier: { id: "supplier-2", name: "Beta Supplier", displayName: "Beta" },
      billDate: new Date("2026-06-01T00:00:00.000Z"),
      dueDate: new Date("2026-06-08T00:00:00.000Z"),
      currency: "SAR",
      status: PurchaseBillStatus.FINALIZED,
      total: new Prisma.Decimal("50.0000"),
      balanceDue: new Prisma.Decimal("50.0000"),
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
    },
  ];
}

function openPurchaseOrders() {
  return [
    {
      id: "po-1",
      purchaseOrderNumber: "PO-000001",
      supplierId: "supplier-1",
      supplier: { id: "supplier-1", name: "Alpha Supplier", displayName: null },
      orderDate: new Date("2026-06-01T00:00:00.000Z"),
      expectedDeliveryDate: new Date("2026-06-10T00:00:00.000Z"),
      currency: "SAR",
      status: PurchaseOrderStatus.APPROVED,
      total: new Prisma.Decimal("200.0000"),
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
    },
    {
      id: "po-2",
      purchaseOrderNumber: "PO-000002",
      supplierId: "supplier-2",
      supplier: { id: "supplier-2", name: "Beta Supplier", displayName: "Beta" },
      orderDate: new Date("2026-06-02T00:00:00.000Z"),
      expectedDeliveryDate: null,
      currency: "SAR",
      status: PurchaseOrderStatus.PARTIALLY_BILLED,
      total: new Prisma.Decimal("150.0000"),
      createdAt: new Date("2026-06-02T00:00:00.000Z"),
    },
  ];
}

function recentPurchaseReceipts() {
  return [
    {
      id: "receipt-1",
      receiptNumber: "PRC-000001",
      supplierId: "supplier-1",
      supplier: { id: "supplier-1", name: "Alpha Supplier", displayName: null },
      receiptDate: new Date("2026-06-04T00:00:00.000Z"),
      status: "POSTED",
      createdAt: new Date("2026-06-04T00:00:00.000Z"),
    },
  ];
}

function purchaseReturns() {
  return [
    {
      id: "return-submitted",
      purchaseReturnNumber: "PRN-000001",
      supplierId: "supplier-1",
      supplier: { id: "supplier-1", name: "Alpha Supplier", displayName: null },
      returnDate: new Date("2026-06-03T00:00:00.000Z"),
      status: PurchaseReturnStatus.SUBMITTED,
      reason: "Over received",
      inventoryReturnPostedAt: null,
      createdAt: new Date("2026-06-03T00:00:00.000Z"),
    },
    {
      id: "return-approved",
      purchaseReturnNumber: "PRN-000002",
      supplierId: "supplier-2",
      supplier: { id: "supplier-2", name: "Beta Supplier", displayName: "Beta" },
      returnDate: new Date("2026-06-04T00:00:00.000Z"),
      status: PurchaseReturnStatus.APPROVED,
      reason: "Damaged goods",
      inventoryReturnPostedAt: null,
      createdAt: new Date("2026-06-04T00:00:00.000Z"),
    },
    {
      id: "return-completed",
      purchaseReturnNumber: "PRN-000003",
      supplierId: "supplier-1",
      supplier: { id: "supplier-1", name: "Alpha Supplier", displayName: null },
      returnDate: new Date("2026-06-01T00:00:00.000Z"),
      status: PurchaseReturnStatus.COMPLETED,
      reason: null,
      inventoryReturnPostedAt: null,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
    },
  ];
}

function recentSupplierPayments() {
  return [
    {
      id: "payment-1",
      paymentNumber: "SP-000001",
      supplierId: "supplier-1",
      supplier: { id: "supplier-1", name: "Alpha Supplier", displayName: null },
      paymentDate: new Date("2026-06-05T00:00:00.000Z"),
      currency: "SAR",
      status: SupplierPaymentStatus.POSTED,
      amountPaid: new Prisma.Decimal("20.0000"),
      createdAt: new Date("2026-06-05T00:00:00.000Z"),
    },
  ];
}

function recentMatchingReviews() {
  return [
    {
      id: "review-1",
      supplierId: "supplier-1",
      supplier: { id: "supplier-1", name: "Alpha Supplier", displayName: null },
      sourceType: "purchaseBill",
      sourceId: "bill-overdue",
      exceptionType: "BILL_PENDING_RECEIPT",
      severity: "HIGH",
      status: PurchaseMatchingReviewStatus.WAITING_FOR_RECEIPT,
      updatedAt: new Date("2026-06-05T00:00:00.000Z"),
      createdAt: new Date("2026-06-04T00:00:00.000Z"),
    },
  ];
}

function matchingResponse() {
  const items = [
    matchingItem("exception-1", "supplier-1", "Alpha Supplier", "CRITICAL", "OVER_BILLED"),
    matchingItem("exception-2", "supplier-1", "Alpha Supplier", "HIGH", "RECEIPT_PENDING_BILL"),
    matchingItem("exception-3", "supplier-2", "Beta Supplier", "HIGH", "BILL_PENDING_RECEIPT"),
  ];
  return {
    readOnly: true,
    noMutation: true,
    filters: { limit: 1000 },
    summary: {
      totalExceptionCount: 3,
      criticalCount: 1,
      highCount: 2,
      mediumCount: 0,
      lowCount: 0,
      suppliersWithExceptions: 2,
      overBilledCount: 1,
      overReceivedCount: 0,
      billPendingReceiptCount: 1,
      receiptPendingBillCount: 1,
      partiallyMatchedCount: 0,
      notReceivedCount: 0,
      notBilledCount: 0,
      reviewRequiredCount: 0,
    },
    groups: [
      {
        supplierId: "supplier-1",
        supplierName: "Alpha Supplier",
        totalExceptionCount: 2,
        highestSeverity: "CRITICAL",
        outstandingReviewCount: 1,
        items: items.slice(0, 2),
      },
      {
        supplierId: "supplier-2",
        supplierName: "Beta Supplier",
        totalExceptionCount: 1,
        highestSeverity: "HIGH",
        outstandingReviewCount: 1,
        items: items.slice(2),
      },
    ],
    items,
  };
}

function matchingItem(id: string, supplierId: string, supplierName: string, severity: "CRITICAL" | "HIGH", exceptionType: string) {
  return {
    id,
    supplierId,
    supplierName,
    sourceType: "purchaseOrder",
    sourceId: "po-1",
    sourceNumber: "PO-000001",
    sourceHref: "/purchases/purchase-orders/po-1",
    purchaseOrderId: "po-1",
    purchaseOrderNumber: "PO-000001",
    purchaseOrderHref: "/purchases/purchase-orders/po-1",
    purchaseBillId: null,
    purchaseBillNumber: null,
    purchaseBillHref: null,
    purchaseReceiptId: null,
    purchaseReceiptNumber: null,
    purchaseReceiptHref: null,
    relatedBills: [],
    relatedReceipts: [],
    item: null,
    lineDescription: "Tracked item",
    orderedQuantity: "10.0000",
    billedQuantity: "12.0000",
    receivedQuantity: "10.0000",
    remainingToBill: "0.0000",
    remainingToReceive: "0.0000",
    overBilledQuantity: "2.0000",
    overReceivedQuantity: "0.0000",
    exceptionType,
    exceptionLabel: "Over billed",
    severity,
    latestRelevantDate: "2026-06-05T00:00:00.000Z",
    reviewStatus: null,
    reasonCode: null,
    reviewId: null,
    nextReviewDate: null,
    reviewedAt: null,
    assignedTo: null,
    reviewNoteSummary: null,
  };
}

function varianceResponse() {
  return {
    readOnly: true,
    previewOnly: true,
    noMutation: true,
    noPostingEffect: true,
    noInventoryEffect: true,
    generatedAt: "2026-06-05T00:00:00.000Z",
    filters: { limit: 1000 },
    summary: {
      totalVarianceCount: 2,
      totalAbsoluteVarianceAmount: "25.0000",
      positiveVarianceAmount: "25.0000",
      negativeVarianceAmount: "0.0000",
      criticalCount: 1,
      highCount: 1,
      suppliersAffected: 1,
      itemsAffected: 1,
      returnRelatedVarianceCount: 1,
      matchingReviewRelatedVarianceCount: 1,
    },
    supplierGroups: [
      {
        supplierId: "supplier-1",
        supplierName: "Alpha Supplier",
        totalVarianceAmount: "25.0000",
        varianceCount: 2,
        highestSeverity: "CRITICAL",
        itemsAffected: 1,
        sourceDocumentLinks: [],
        items: [],
      },
    ],
    items: [
      {
        id: "variance-1",
        supplier: { id: "supplier-1", name: "Alpha Supplier", displayName: null },
        item: null,
        lineDescription: "Tracked item",
        purchaseOrder: null,
        purchaseBill: null,
        purchaseReceipt: null,
        purchaseReturn: null,
        matchingReview: null,
        sourceType: "purchaseReceipt",
        sourceId: "receipt-1",
        sourceNumber: "PRC-000001",
        sourceHref: "/inventory/purchase-receipts/receipt-1",
        sourceDocumentLinks: [],
        orderedQuantity: "10.0000",
        receivedQuantity: "10.0000",
        billedQuantity: "8.0000",
        returnedQuantity: "0.0000",
        receiptUnitCost: "12.0000",
        billUnitCost: "10.0000",
        expectedValue: "100.0000",
        receivedValue: "120.0000",
        billedValue: "80.0000",
        returnedValue: "0.0000",
        varianceQuantity: "2.0000",
        varianceAmount: "25.0000",
        varianceType: "PRICE_VARIANCE",
        severity: "CRITICAL",
        status: "NEEDS_ACCOUNTANT_REVIEW",
        suggestedReviewAction: "Review receipt and bill unit cost before any accountant variance policy decision.",
        warnings: [],
        returnRelated: false,
        matchingReviewRelated: true,
        latestRelevantDate: "2026-06-05T00:00:00.000Z",
      },
    ],
    warnings: [],
  };
}

function expectMutationMethodsNotCalled(prisma: any) {
  for (const model of [
    prisma.purchaseBill,
    prisma.purchaseOrder,
    prisma.purchaseReceipt,
    prisma.purchaseReturn,
    prisma.purchaseMatchingReview,
    prisma.supplierPayment,
    prisma.purchaseDebitNote,
    prisma.supplierRefund,
  ]) {
    expect(model.create).not.toHaveBeenCalled();
    expect(model.update).not.toHaveBeenCalled();
    expect(model.delete).not.toHaveBeenCalled();
  }
}
