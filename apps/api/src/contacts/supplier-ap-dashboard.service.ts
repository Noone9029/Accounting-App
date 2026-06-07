import { Injectable } from "@nestjs/common";
import { toMoney } from "@ledgerbyte/accounting-core";
import {
  Prisma,
  PurchaseBillStatus,
  PurchaseDebitNoteStatus,
  PurchaseMatchingReviewStatus,
  PurchaseOrderStatus,
  PurchaseReceiptStatus,
  PurchaseReturnStatus,
  SupplierPaymentStatus,
  SupplierRefundStatus,
} from "@prisma/client";
import {
  PurchaseMatchingService,
  type PurchaseMatchingExceptionItem,
  type PurchaseMatchingExceptionResponse,
  type PurchaseMatchingExceptionSeverity,
} from "../purchase-matching/purchase-matching.service";
import {
  InventoryValuationVariancePreviewService,
  type InventoryValuationVariancePreviewItem,
  type InventoryValuationVariancePreviewResponse,
  type InventoryValuationVarianceSeverity,
} from "../inventory/inventory-valuation-variance-preview.service";
import { PrismaService } from "../prisma/prisma.service";

export const SUPPLIER_AP_DASHBOARD_DUE_SOON_DAYS = 7;
export const SUPPLIER_AP_DASHBOARD_TOP_LIMIT = 5;

const OPEN_PURCHASE_ORDER_STATUSES: readonly PurchaseOrderStatus[] = [
  PurchaseOrderStatus.APPROVED,
  PurchaseOrderStatus.SENT,
  PurchaseOrderStatus.PARTIALLY_BILLED,
] as const;
const OPEN_PURCHASE_RETURN_STATUSES: readonly PurchaseReturnStatus[] = [
  PurchaseReturnStatus.DRAFT,
  PurchaseReturnStatus.SUBMITTED,
  PurchaseReturnStatus.APPROVED,
] as const;
const INVENTORY_RETURN_POSTABLE_STATUSES: readonly PurchaseReturnStatus[] = [
  PurchaseReturnStatus.APPROVED,
  PurchaseReturnStatus.COMPLETED,
] as const;
const OPEN_PURCHASE_MATCHING_REVIEW_STATUSES: readonly PurchaseMatchingReviewStatus[] = [
  PurchaseMatchingReviewStatus.OPEN,
  PurchaseMatchingReviewStatus.IN_REVIEW,
  PurchaseMatchingReviewStatus.WAITING_FOR_SUPPLIER,
  PurchaseMatchingReviewStatus.WAITING_FOR_RECEIPT,
  PurchaseMatchingReviewStatus.WAITING_FOR_BILL,
  PurchaseMatchingReviewStatus.NEEDS_VARIANCE_REVIEW,
  PurchaseMatchingReviewStatus.NEEDS_RETURN_REVIEW,
] as const;
const MATCHING_SEVERITY_ORDER: Record<PurchaseMatchingExceptionSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};
const VARIANCE_SEVERITY_ORDER: Record<InventoryValuationVarianceSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export interface SupplierApDashboardPermissionContext {
  canViewSuppliers: boolean;
  canViewPurchaseBills: boolean;
  canViewPurchaseOrders: boolean;
  canViewPurchaseReceiving: boolean;
  canViewPurchaseMatching: boolean;
  canViewInventoryValuation: boolean;
  canViewSupplierPayments: boolean;
  canViewPurchaseDebitNotes: boolean;
  canViewSupplierRefunds: boolean;
}

export interface SupplierApDashboardSupplierRow {
  supplierId: string;
  supplierName: string;
  href: string | null;
  amount?: string;
  overdueAmount?: string;
  openBillCount?: number;
  exceptionCount?: number;
  highestSeverity?: PurchaseMatchingExceptionSeverity | InventoryValuationVarianceSeverity;
  openReturnCount?: number;
  variancePreviewCount?: number;
  variancePreviewTotal?: string;
}

export interface SupplierApDashboardBillItem {
  id: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  supplierHref: string | null;
  href: string | null;
  dueDate: string | null;
  balanceDue: string;
  currency: string;
  dueStatus: "OVERDUE" | "DUE_SOON";
  attentionCategory: "Bills overdue" | "Bills due soon";
}

export interface SupplierApDashboardMatchingItem {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierHref: string | null;
  sourceType: string;
  sourceId: string;
  sourceNumber: string;
  sourceHref: string | null;
  exceptionType: string;
  severity: PurchaseMatchingExceptionSeverity;
  reviewStatus: string | null;
  attentionCategory: "Matching exceptions critical/high" | "Matching reviews open or waiting";
}

export interface SupplierApDashboardReturnItem {
  id: string;
  purchaseReturnNumber: string;
  supplierId: string;
  supplierName: string;
  supplierHref: string | null;
  href: string | null;
  status: PurchaseReturnStatus;
  returnDate: string;
  reason: string | null;
  inventoryMovementStatus: "NOT_POSTED" | "POSTED";
  inventoryReturnPostedAt: string | null;
  attentionCategory: "Purchase returns awaiting approval/completion" | "Purchase returns awaiting inventory movement";
  nonPosting: true;
}

export interface SupplierApDashboardVarianceItem {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierHref: string | null;
  sourceType: string;
  sourceId: string;
  sourceNumber: string;
  sourceHref: string | null;
  varianceType: string;
  severity: InventoryValuationVarianceSeverity;
  varianceAmount: string;
  attentionCategory: "Valuation variance previews needing review";
  nonPosting: true;
}

export interface SupplierApRecentActivityItem {
  id: string;
  sourceType: string;
  sourceId: string;
  sourceNumber: string;
  supplierId: string;
  supplierName: string;
  supplierHref: string | null;
  href: string | null;
  date: string;
  status: string;
  amount: string | null;
  label: string;
  category: "financialPosting" | "operationalNonPosting";
  nonPosting: boolean;
}

export interface SupplierApDashboardSummary {
  openPayablesTotal: string;
  overdueBillsTotal: string;
  openBillCount: number;
  overdueBillCount: number;
  purchaseOrdersOpenCount: number;
  purchaseReceiptsPendingBillCount: number;
  purchaseBillsPendingReceiptCount: number;
  matchingExceptionCount: number;
  matchingCriticalCount: number;
  matchingReviewOpenCount: number;
  returnsOpenCount: number;
  returnsCompletedCount: number;
  returnsAwaitingInventoryMovementCount: number;
  returnsInventoryMovementPostedCount: number;
  variancePreviewCount: number;
  variancePreviewTotal: string;
  suppliersWithOpenPayables: number;
  suppliersWithExceptions: number;
  topSuppliersByPayable: SupplierApDashboardSupplierRow[];
  topSuppliersByExceptionSeverity: SupplierApDashboardSupplierRow[];
  suppliersWithOpenReturns: SupplierApDashboardSupplierRow[];
  suppliersWithVariancePreviews: SupplierApDashboardSupplierRow[];
  upcomingDueBills: SupplierApDashboardBillItem[];
  matchingExceptionsNeedingReview: SupplierApDashboardMatchingItem[];
  purchaseReturnsAwaitingAction: SupplierApDashboardReturnItem[];
  variancePreviewsNeedingReview: SupplierApDashboardVarianceItem[];
  recentSupplierActivity: SupplierApRecentActivityItem[];
}

export interface SupplierApDashboardResponse {
  readOnly: true;
  noMutation: true;
  noPostingEffect: true;
  noInventoryEffect: true;
  generatedAt: string;
  permissions: SupplierApDashboardPermissionContext;
  attentionPolicy: {
    dueSoonDays: number;
    topRowLimit: number;
    ordering: string;
    categories: string[];
  };
  apSummary: SupplierApDashboardSummary;
  warnings: string[];
}

export interface SupplierApDetailSummary {
  readOnly: true;
  noMutation: true;
  noPostingEffect: true;
  noInventoryEffect: true;
  supplierId: string;
  outstandingPayableBalance: string;
  overdueBillsTotal: string;
  overdueBillCount: number;
  openPurchaseOrders: number;
  purchaseReceiptsPendingBill: number;
  purchaseBillsPendingReceipt: number;
  openPurchaseReturns: number;
  openMatchingReviews: number;
  valuationVariancePreviews: number;
  recentApActivity: SupplierApRecentActivityItem[];
  helperText: string;
}

@Injectable()
export class SupplierApDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly purchaseMatchingService: PurchaseMatchingService,
    private readonly valuationVariancePreviewService: InventoryValuationVariancePreviewService,
  ) {}

  async dashboard(
    organizationId: string,
    permissions: SupplierApDashboardPermissionContext,
    asOf = new Date(),
  ): Promise<SupplierApDashboardResponse> {
    return this.buildDashboard(organizationId, permissions, asOf);
  }

  async supplierSummary(
    organizationId: string,
    supplierId: string,
    permissions: SupplierApDashboardPermissionContext,
    asOf = new Date(),
  ): Promise<SupplierApDetailSummary> {
    const dashboard = await this.buildDashboard(organizationId, permissions, asOf, supplierId);
    return {
      readOnly: true,
      noMutation: true,
      noPostingEffect: true,
      noInventoryEffect: true,
      supplierId,
      outstandingPayableBalance: dashboard.apSummary.openPayablesTotal,
      overdueBillsTotal: dashboard.apSummary.overdueBillsTotal,
      overdueBillCount: dashboard.apSummary.overdueBillCount,
      openPurchaseOrders: dashboard.apSummary.purchaseOrdersOpenCount,
      purchaseReceiptsPendingBill: dashboard.apSummary.purchaseReceiptsPendingBillCount,
      purchaseBillsPendingReceipt: dashboard.apSummary.purchaseBillsPendingReceiptCount,
      openPurchaseReturns: dashboard.apSummary.returnsOpenCount,
      openMatchingReviews: dashboard.apSummary.matchingReviewOpenCount,
      valuationVariancePreviews: dashboard.apSummary.variancePreviewCount,
      recentApActivity: dashboard.apSummary.recentSupplierActivity,
      helperText:
        "Operational rows help track purchasing work. They do not change the supplier payable balance unless a posting document, payment, debit note, or refund is recorded separately.",
    };
  }

  private async buildDashboard(
    organizationId: string,
    permissions: SupplierApDashboardPermissionContext,
    asOf: Date,
    supplierId?: string,
  ): Promise<SupplierApDashboardResponse> {
    const todayStart = startOfUtcDay(asOf);
    const dueSoonEnd = endOfUtcDay(addUtcDays(asOf, SUPPLIER_AP_DASHBOARD_DUE_SOON_DAYS));
    const supplierFilter = supplierId ? { supplierId } : {};
    const matchingFilters = supplierId ? { limit: 1000, supplierId } : { limit: 1000 };

    const [
      openBills,
      openPurchaseOrders,
      purchaseReceipts,
      purchaseReturns,
      matchingExceptions,
      openMatchingReviewCount,
      recentMatchingReviews,
      valuationPreview,
      supplierPayments,
      purchaseDebitNotes,
      supplierRefunds,
    ] = await Promise.all([
      permissions.canViewPurchaseBills ? this.loadOpenPurchaseBills(organizationId, supplierFilter) : Promise.resolve([]),
      permissions.canViewPurchaseOrders ? this.loadOpenPurchaseOrders(organizationId, supplierFilter) : Promise.resolve([]),
      permissions.canViewPurchaseReceiving ? this.loadRecentPurchaseReceipts(organizationId, supplierFilter) : Promise.resolve([]),
      this.canViewPurchaseReturns(permissions) ? this.loadPurchaseReturns(organizationId, supplierFilter) : Promise.resolve([]),
      permissions.canViewPurchaseMatching ? this.purchaseMatchingService.listExceptions(organizationId, matchingFilters) : Promise.resolve(null),
      permissions.canViewPurchaseMatching
        ? this.prisma.purchaseMatchingReview.count({
            where: {
              organizationId,
              ...supplierFilter,
              status: { in: [...OPEN_PURCHASE_MATCHING_REVIEW_STATUSES] },
            },
          })
        : Promise.resolve(0),
      permissions.canViewPurchaseMatching ? this.loadRecentMatchingReviews(organizationId, supplierFilter) : Promise.resolve([]),
      permissions.canViewInventoryValuation ? this.valuationVariancePreviewService.list(organizationId, matchingFilters) : Promise.resolve(null),
      permissions.canViewSupplierPayments ? this.loadRecentSupplierPayments(organizationId, supplierFilter) : Promise.resolve([]),
      permissions.canViewPurchaseDebitNotes ? this.loadRecentPurchaseDebitNotes(organizationId, supplierFilter) : Promise.resolve([]),
      permissions.canViewSupplierRefunds ? this.loadRecentSupplierRefunds(organizationId, supplierFilter) : Promise.resolve([]),
    ]);

    const overdueBills = openBills.filter((bill) => bill.dueDate && bill.dueDate.getTime() < todayStart.getTime());
    const upcomingDueBills = this.upcomingDueBills(openBills, todayStart, dueSoonEnd, permissions);
    const openReturns = purchaseReturns.filter((purchaseReturn) => OPEN_PURCHASE_RETURN_STATUSES.includes(purchaseReturn.status));
    const completedReturns = purchaseReturns.filter((purchaseReturn) => purchaseReturn.status === PurchaseReturnStatus.COMPLETED);
    const returnsAwaitingInventoryMovement = purchaseReturns.filter(
      (purchaseReturn) => INVENTORY_RETURN_POSTABLE_STATUSES.includes(purchaseReturn.status) && !purchaseReturn.inventoryReturnPostedAt,
    );
    const returnsWithInventoryMovementPosted = purchaseReturns.filter((purchaseReturn) => Boolean(purchaseReturn.inventoryReturnPostedAt));

    const apSummary: SupplierApDashboardSummary = {
      openPayablesTotal: sumMoney(openBills.map((bill) => bill.balanceDue)),
      overdueBillsTotal: sumMoney(overdueBills.map((bill) => bill.balanceDue)),
      openBillCount: openBills.length,
      overdueBillCount: overdueBills.length,
      purchaseOrdersOpenCount: openPurchaseOrders.length,
      purchaseReceiptsPendingBillCount: matchingExceptions?.summary.receiptPendingBillCount ?? 0,
      purchaseBillsPendingReceiptCount: matchingExceptions?.summary.billPendingReceiptCount ?? 0,
      matchingExceptionCount: matchingExceptions?.summary.totalExceptionCount ?? 0,
      matchingCriticalCount: matchingExceptions?.summary.criticalCount ?? 0,
      matchingReviewOpenCount: openMatchingReviewCount,
      returnsOpenCount: openReturns.length,
      returnsCompletedCount: completedReturns.length,
      returnsAwaitingInventoryMovementCount: returnsAwaitingInventoryMovement.length,
      returnsInventoryMovementPostedCount: returnsWithInventoryMovementPosted.length,
      variancePreviewCount: valuationPreview?.summary.totalVarianceCount ?? 0,
      variancePreviewTotal: valuationPreview?.summary.totalAbsoluteVarianceAmount ?? "0.0000",
      suppliersWithOpenPayables: this.topSuppliersByPayable(openBills, overdueBills, permissions).length,
      suppliersWithExceptions: matchingExceptions?.summary.suppliersWithExceptions ?? 0,
      topSuppliersByPayable: this.topSuppliersByPayable(openBills, overdueBills, permissions).slice(0, SUPPLIER_AP_DASHBOARD_TOP_LIMIT),
      topSuppliersByExceptionSeverity: this.topSuppliersByExceptionSeverity(matchingExceptions, permissions).slice(0, SUPPLIER_AP_DASHBOARD_TOP_LIMIT),
      suppliersWithOpenReturns: this.suppliersWithOpenReturns(openReturns, permissions).slice(0, SUPPLIER_AP_DASHBOARD_TOP_LIMIT),
      suppliersWithVariancePreviews: this.suppliersWithVariancePreviews(valuationPreview, permissions).slice(0, SUPPLIER_AP_DASHBOARD_TOP_LIMIT),
      upcomingDueBills,
      matchingExceptionsNeedingReview: this.matchingExceptionsNeedingReview(matchingExceptions, permissions),
      purchaseReturnsAwaitingAction: this.purchaseReturnsAwaitingAction(
        [...openReturns, ...returnsAwaitingInventoryMovement].filter(
          (purchaseReturn, index, all) => all.findIndex((candidate) => candidate.id === purchaseReturn.id) === index,
        ),
        permissions,
      ),
      variancePreviewsNeedingReview: this.variancePreviewsNeedingReview(valuationPreview, permissions),
      recentSupplierActivity: this.recentSupplierActivity({
        openBills,
        openPurchaseOrders,
        purchaseReceipts,
        purchaseReturns,
        supplierPayments,
        purchaseDebitNotes,
        supplierRefunds,
        recentMatchingReviews,
        valuationPreview,
        permissions,
      }),
    };

    return {
      readOnly: true,
      noMutation: true,
      noPostingEffect: true,
      noInventoryEffect: true,
      generatedAt: new Date().toISOString(),
      permissions,
      attentionPolicy: {
        dueSoonDays: SUPPLIER_AP_DASHBOARD_DUE_SOON_DAYS,
        topRowLimit: SUPPLIER_AP_DASHBOARD_TOP_LIMIT,
        ordering: "Critical/high first, then overdue or oldest due/relevant date, capped at five rows per attention list.",
        categories: [
          "Bills overdue",
          "Bills due soon",
          "Purchase orders awaiting receipt",
          "Purchase receipts awaiting bill",
          "Bills awaiting receipt",
          "Matching exceptions critical/high",
          "Matching reviews open or waiting",
          "Purchase returns awaiting approval/completion",
          "Purchase returns awaiting inventory movement",
          "Valuation variance previews needing review",
        ],
      },
      apSummary,
      warnings: [
        "Supplier/AP Dashboard is read-only.",
        "It does not post journals, adjust AP balances, move inventory by itself, send email, book variances, affect VAT, call ZATCA, change landed cost, or change FIFO layers.",
      ],
    };
  }

  private loadOpenPurchaseBills(organizationId: string, supplierFilter: { supplierId?: string }) {
    return this.prisma.purchaseBill.findMany({
      where: {
        organizationId,
        ...supplierFilter,
        status: PurchaseBillStatus.FINALIZED,
        balanceDue: { gt: 0 },
      },
      orderBy: [{ dueDate: "asc" }, { billDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        billNumber: true,
        supplierId: true,
        supplier: { select: { id: true, name: true, displayName: true } },
        billDate: true,
        dueDate: true,
        currency: true,
        status: true,
        total: true,
        balanceDue: true,
        createdAt: true,
      },
    });
  }

  private loadOpenPurchaseOrders(organizationId: string, supplierFilter: { supplierId?: string }) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        organizationId,
        ...supplierFilter,
        status: { in: [...OPEN_PURCHASE_ORDER_STATUSES] },
      },
      orderBy: [{ expectedDeliveryDate: "asc" }, { orderDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        purchaseOrderNumber: true,
        supplierId: true,
        supplier: { select: { id: true, name: true, displayName: true } },
        orderDate: true,
        expectedDeliveryDate: true,
        currency: true,
        status: true,
        total: true,
        createdAt: true,
      },
    });
  }

  private loadRecentPurchaseReceipts(organizationId: string, supplierFilter: { supplierId?: string }) {
    return this.prisma.purchaseReceipt.findMany({
      where: {
        organizationId,
        ...supplierFilter,
        status: PurchaseReceiptStatus.POSTED,
      },
      orderBy: [{ receiptDate: "desc" }, { createdAt: "desc" }],
      take: SUPPLIER_AP_DASHBOARD_TOP_LIMIT,
      select: {
        id: true,
        receiptNumber: true,
        supplierId: true,
        supplier: { select: { id: true, name: true, displayName: true } },
        receiptDate: true,
        status: true,
        createdAt: true,
      },
    });
  }

  private loadPurchaseReturns(organizationId: string, supplierFilter: { supplierId?: string }) {
    return this.prisma.purchaseReturn.findMany({
      where: {
        organizationId,
        ...supplierFilter,
        status: { in: [...OPEN_PURCHASE_RETURN_STATUSES, PurchaseReturnStatus.COMPLETED] },
      },
      orderBy: [{ returnDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        purchaseReturnNumber: true,
        supplierId: true,
        supplier: { select: { id: true, name: true, displayName: true } },
        returnDate: true,
        status: true,
        reason: true,
        inventoryReturnPostedAt: true,
        createdAt: true,
      },
    });
  }

  private loadRecentMatchingReviews(organizationId: string, supplierFilter: { supplierId?: string }) {
    return this.prisma.purchaseMatchingReview.findMany({
      where: {
        organizationId,
        ...supplierFilter,
        status: { in: [...OPEN_PURCHASE_MATCHING_REVIEW_STATUSES] },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: SUPPLIER_AP_DASHBOARD_TOP_LIMIT,
      select: {
        id: true,
        supplierId: true,
        supplier: { select: { id: true, name: true, displayName: true } },
        sourceType: true,
        sourceId: true,
        exceptionType: true,
        severity: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private loadRecentSupplierPayments(organizationId: string, supplierFilter: { supplierId?: string }) {
    return this.prisma.supplierPayment.findMany({
      where: {
        organizationId,
        ...supplierFilter,
        status: SupplierPaymentStatus.POSTED,
      },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      take: SUPPLIER_AP_DASHBOARD_TOP_LIMIT,
      select: {
        id: true,
        paymentNumber: true,
        supplierId: true,
        supplier: { select: { id: true, name: true, displayName: true } },
        paymentDate: true,
        currency: true,
        status: true,
        amountPaid: true,
        createdAt: true,
      },
    });
  }

  private loadRecentPurchaseDebitNotes(organizationId: string, supplierFilter: { supplierId?: string }) {
    return this.prisma.purchaseDebitNote.findMany({
      where: {
        organizationId,
        ...supplierFilter,
        status: PurchaseDebitNoteStatus.FINALIZED,
      },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      take: SUPPLIER_AP_DASHBOARD_TOP_LIMIT,
      select: {
        id: true,
        debitNoteNumber: true,
        supplierId: true,
        supplier: { select: { id: true, name: true, displayName: true } },
        issueDate: true,
        currency: true,
        status: true,
        total: true,
        createdAt: true,
      },
    });
  }

  private loadRecentSupplierRefunds(organizationId: string, supplierFilter: { supplierId?: string }) {
    return this.prisma.supplierRefund.findMany({
      where: {
        organizationId,
        ...supplierFilter,
        status: SupplierRefundStatus.POSTED,
      },
      orderBy: [{ refundDate: "desc" }, { createdAt: "desc" }],
      take: SUPPLIER_AP_DASHBOARD_TOP_LIMIT,
      select: {
        id: true,
        refundNumber: true,
        supplierId: true,
        supplier: { select: { id: true, name: true, displayName: true } },
        refundDate: true,
        currency: true,
        status: true,
        amountRefunded: true,
        createdAt: true,
      },
    });
  }

  private upcomingDueBills(
    openBills: Awaited<ReturnType<SupplierApDashboardService["loadOpenPurchaseBills"]>>,
    todayStart: Date,
    dueSoonEnd: Date,
    permissions: SupplierApDashboardPermissionContext,
  ): SupplierApDashboardBillItem[] {
    return openBills
      .filter((bill) => bill.dueDate && bill.dueDate.getTime() <= dueSoonEnd.getTime())
      .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0))
      .slice(0, SUPPLIER_AP_DASHBOARD_TOP_LIMIT)
      .map((bill) => {
        const overdue = Boolean(bill.dueDate && bill.dueDate.getTime() < todayStart.getTime());
        return {
          id: bill.id,
          billNumber: bill.billNumber,
          supplierId: bill.supplierId,
          supplierName: supplierName(bill.supplier),
          supplierHref: supplierHref(bill.supplierId, permissions),
          href: permissions.canViewPurchaseBills ? `/purchases/bills/${bill.id}` : null,
          dueDate: bill.dueDate ? bill.dueDate.toISOString() : null,
          balanceDue: moneyString(bill.balanceDue),
          currency: bill.currency,
          dueStatus: overdue ? "OVERDUE" : "DUE_SOON",
          attentionCategory: overdue ? "Bills overdue" : "Bills due soon",
        };
      });
  }

  private topSuppliersByPayable(
    openBills: Awaited<ReturnType<SupplierApDashboardService["loadOpenPurchaseBills"]>>,
    overdueBills: Awaited<ReturnType<SupplierApDashboardService["loadOpenPurchaseBills"]>>,
    permissions: SupplierApDashboardPermissionContext,
  ): SupplierApDashboardSupplierRow[] {
    const groups = new Map<string, { supplierName: string; amount: Prisma.Decimal; overdueAmount: Prisma.Decimal; openBillCount: number }>();
    for (const bill of openBills) {
      const current = groups.get(bill.supplierId) ?? {
        supplierName: supplierName(bill.supplier),
        amount: toMoney(0),
        overdueAmount: toMoney(0),
        openBillCount: 0,
      };
      current.amount = current.amount.plus(bill.balanceDue);
      current.openBillCount += 1;
      groups.set(bill.supplierId, current);
    }
    for (const bill of overdueBills) {
      const current = groups.get(bill.supplierId);
      if (current) {
        current.overdueAmount = current.overdueAmount.plus(bill.balanceDue);
      }
    }

    return [...groups.entries()]
      .map(([supplierId, group]) => ({
        supplierId,
        supplierName: group.supplierName,
        href: supplierHref(supplierId, permissions),
        amount: group.amount.toFixed(4),
        overdueAmount: group.overdueAmount.toFixed(4),
        openBillCount: group.openBillCount,
      }))
      .sort((a, b) => compareMoneyDesc(a.amount, b.amount) || a.supplierName.localeCompare(b.supplierName));
  }

  private topSuppliersByExceptionSeverity(
    matchingExceptions: PurchaseMatchingExceptionResponse | null,
    permissions: SupplierApDashboardPermissionContext,
  ): SupplierApDashboardSupplierRow[] {
    return (
      matchingExceptions?.groups.map((group) => ({
        supplierId: group.supplierId,
        supplierName: group.supplierName,
        href: supplierHref(group.supplierId, permissions),
        exceptionCount: group.totalExceptionCount,
        highestSeverity: group.highestSeverity,
      })) ?? []
    ).sort((a, b) => {
      const severityDelta =
        MATCHING_SEVERITY_ORDER[a.highestSeverity as PurchaseMatchingExceptionSeverity] -
        MATCHING_SEVERITY_ORDER[b.highestSeverity as PurchaseMatchingExceptionSeverity];
      return severityDelta || (b.exceptionCount ?? 0) - (a.exceptionCount ?? 0) || a.supplierName.localeCompare(b.supplierName);
    });
  }

  private suppliersWithOpenReturns(
    openReturns: Awaited<ReturnType<SupplierApDashboardService["loadPurchaseReturns"]>>,
    permissions: SupplierApDashboardPermissionContext,
  ): SupplierApDashboardSupplierRow[] {
    const groups = new Map<string, { supplierName: string; count: number }>();
    for (const purchaseReturn of openReturns) {
      const current = groups.get(purchaseReturn.supplierId) ?? { supplierName: supplierName(purchaseReturn.supplier), count: 0 };
      current.count += 1;
      groups.set(purchaseReturn.supplierId, current);
    }
    return [...groups.entries()]
      .map(([supplierId, group]) => ({
        supplierId,
        supplierName: group.supplierName,
        href: supplierHref(supplierId, permissions),
        openReturnCount: group.count,
      }))
      .sort((a, b) => (b.openReturnCount ?? 0) - (a.openReturnCount ?? 0) || a.supplierName.localeCompare(b.supplierName));
  }

  private suppliersWithVariancePreviews(
    valuationPreview: InventoryValuationVariancePreviewResponse | null,
    permissions: SupplierApDashboardPermissionContext,
  ): SupplierApDashboardSupplierRow[] {
    return (
      valuationPreview?.supplierGroups.map((group) => ({
        supplierId: group.supplierId,
        supplierName: group.supplierName,
        href: supplierHref(group.supplierId, permissions),
        variancePreviewCount: group.varianceCount,
        variancePreviewTotal: group.totalVarianceAmount,
        highestSeverity: group.highestSeverity,
      })) ?? []
    ).sort((a, b) => {
      const severityDelta =
        VARIANCE_SEVERITY_ORDER[a.highestSeverity as InventoryValuationVarianceSeverity] -
        VARIANCE_SEVERITY_ORDER[b.highestSeverity as InventoryValuationVarianceSeverity];
      return severityDelta || compareMoneyDesc(a.variancePreviewTotal ?? "0.0000", b.variancePreviewTotal ?? "0.0000");
    });
  }

  private matchingExceptionsNeedingReview(
    matchingExceptions: PurchaseMatchingExceptionResponse | null,
    permissions: SupplierApDashboardPermissionContext,
  ): SupplierApDashboardMatchingItem[] {
    return (matchingExceptions?.items ?? [])
      .filter((item) => item.severity === "CRITICAL" || item.severity === "HIGH" || isOpenReviewStatus(item.reviewStatus))
      .sort((a, b) => {
        const severityDelta = MATCHING_SEVERITY_ORDER[a.severity] - MATCHING_SEVERITY_ORDER[b.severity];
        if (severityDelta !== 0) return severityDelta;
        return dateTime(a.latestRelevantDate) - dateTime(b.latestRelevantDate);
      })
      .slice(0, SUPPLIER_AP_DASHBOARD_TOP_LIMIT)
      .map((item) => ({
        id: item.id,
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        supplierHref: supplierHref(item.supplierId, permissions),
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        sourceNumber: item.sourceNumber,
        sourceHref: this.matchingSourceHref(item, permissions),
        exceptionType: item.exceptionType,
        severity: item.severity,
        reviewStatus: item.reviewStatus,
        attentionCategory: item.reviewStatus ? "Matching reviews open or waiting" : "Matching exceptions critical/high",
      }));
  }

  private purchaseReturnsAwaitingAction(
    openReturns: Awaited<ReturnType<SupplierApDashboardService["loadPurchaseReturns"]>>,
    permissions: SupplierApDashboardPermissionContext,
  ): SupplierApDashboardReturnItem[] {
    return [...openReturns]
      .sort((a, b) => returnStatusRank(a.status) - returnStatusRank(b.status) || dateTime(a.returnDate) - dateTime(b.returnDate))
      .slice(0, SUPPLIER_AP_DASHBOARD_TOP_LIMIT)
      .map((purchaseReturn) => ({
        id: purchaseReturn.id,
        purchaseReturnNumber: purchaseReturn.purchaseReturnNumber,
        supplierId: purchaseReturn.supplierId,
        supplierName: supplierName(purchaseReturn.supplier),
        supplierHref: supplierHref(purchaseReturn.supplierId, permissions),
        href: this.canViewPurchaseReturns(permissions) ? `/purchases/returns/${purchaseReturn.id}` : null,
        status: purchaseReturn.status,
        returnDate: purchaseReturn.returnDate.toISOString(),
        reason: purchaseReturn.reason,
        inventoryMovementStatus: purchaseReturn.inventoryReturnPostedAt ? "POSTED" : "NOT_POSTED",
        inventoryReturnPostedAt: purchaseReturn.inventoryReturnPostedAt ? purchaseReturn.inventoryReturnPostedAt.toISOString() : null,
        attentionCategory:
          INVENTORY_RETURN_POSTABLE_STATUSES.includes(purchaseReturn.status) && !purchaseReturn.inventoryReturnPostedAt
            ? "Purchase returns awaiting inventory movement"
            : "Purchase returns awaiting approval/completion",
        nonPosting: true,
      }));
  }

  private variancePreviewsNeedingReview(
    valuationPreview: InventoryValuationVariancePreviewResponse | null,
    permissions: SupplierApDashboardPermissionContext,
  ): SupplierApDashboardVarianceItem[] {
    return (valuationPreview?.items ?? [])
      .sort((a, b) => {
        const severityDelta = VARIANCE_SEVERITY_ORDER[a.severity] - VARIANCE_SEVERITY_ORDER[b.severity];
        return severityDelta || dateTime(b.latestRelevantDate) - dateTime(a.latestRelevantDate);
      })
      .slice(0, SUPPLIER_AP_DASHBOARD_TOP_LIMIT)
      .map((item) => ({
        id: item.id,
        supplierId: item.supplier.id,
        supplierName: supplierName(item.supplier),
        supplierHref: supplierHref(item.supplier.id, permissions),
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        sourceNumber: item.sourceNumber,
        sourceHref: this.varianceSourceHref(item, permissions),
        varianceType: item.varianceType,
        severity: item.severity,
        varianceAmount: item.varianceAmount,
        attentionCategory: "Valuation variance previews needing review",
        nonPosting: true,
      }));
  }

  private recentSupplierActivity(input: {
    openBills: Awaited<ReturnType<SupplierApDashboardService["loadOpenPurchaseBills"]>>;
    openPurchaseOrders: Awaited<ReturnType<SupplierApDashboardService["loadOpenPurchaseOrders"]>>;
    purchaseReceipts: Awaited<ReturnType<SupplierApDashboardService["loadRecentPurchaseReceipts"]>>;
    purchaseReturns: Awaited<ReturnType<SupplierApDashboardService["loadPurchaseReturns"]>>;
    supplierPayments: Awaited<ReturnType<SupplierApDashboardService["loadRecentSupplierPayments"]>>;
    purchaseDebitNotes: Awaited<ReturnType<SupplierApDashboardService["loadRecentPurchaseDebitNotes"]>>;
    supplierRefunds: Awaited<ReturnType<SupplierApDashboardService["loadRecentSupplierRefunds"]>>;
    recentMatchingReviews: Awaited<ReturnType<SupplierApDashboardService["loadRecentMatchingReviews"]>>;
    valuationPreview: InventoryValuationVariancePreviewResponse | null;
    permissions: SupplierApDashboardPermissionContext;
  }): SupplierApRecentActivityItem[] {
    const rows: SupplierApRecentActivityItem[] = [];
    const add = (row: SupplierApRecentActivityItem) => rows.push(row);

    for (const bill of input.openBills) {
      add({
        id: `PurchaseBill:${bill.id}`,
        sourceType: "PurchaseBill",
        sourceId: bill.id,
        sourceNumber: bill.billNumber,
        supplierId: bill.supplierId,
        supplierName: supplierName(bill.supplier),
        supplierHref: supplierHref(bill.supplierId, input.permissions),
        href: input.permissions.canViewPurchaseBills ? `/purchases/bills/${bill.id}` : null,
        date: bill.billDate.toISOString(),
        status: bill.status,
        amount: moneyString(bill.balanceDue),
        label: "Purchase bill",
        category: "financialPosting",
        nonPosting: false,
      });
    }

    for (const debitNote of input.purchaseDebitNotes) {
      add({
        id: `PurchaseDebitNote:${debitNote.id}`,
        sourceType: "PurchaseDebitNote",
        sourceId: debitNote.id,
        sourceNumber: debitNote.debitNoteNumber,
        supplierId: debitNote.supplierId,
        supplierName: supplierName(debitNote.supplier),
        supplierHref: supplierHref(debitNote.supplierId, input.permissions),
        href: input.permissions.canViewPurchaseDebitNotes ? `/purchases/debit-notes/${debitNote.id}` : null,
        date: debitNote.issueDate.toISOString(),
        status: debitNote.status,
        amount: moneyString(debitNote.total),
        label: "Purchase debit note",
        category: "financialPosting",
        nonPosting: false,
      });
    }

    for (const payment of input.supplierPayments) {
      add({
        id: `SupplierPayment:${payment.id}`,
        sourceType: "SupplierPayment",
        sourceId: payment.id,
        sourceNumber: payment.paymentNumber,
        supplierId: payment.supplierId,
        supplierName: supplierName(payment.supplier),
        supplierHref: supplierHref(payment.supplierId, input.permissions),
        href: input.permissions.canViewSupplierPayments ? `/purchases/supplier-payments/${payment.id}` : null,
        date: payment.paymentDate.toISOString(),
        status: payment.status,
        amount: moneyString(payment.amountPaid),
        label: "Supplier payment",
        category: "financialPosting",
        nonPosting: false,
      });
    }

    for (const refund of input.supplierRefunds) {
      add({
        id: `SupplierRefund:${refund.id}`,
        sourceType: "SupplierRefund",
        sourceId: refund.id,
        sourceNumber: refund.refundNumber,
        supplierId: refund.supplierId,
        supplierName: supplierName(refund.supplier),
        supplierHref: supplierHref(refund.supplierId, input.permissions),
        href: input.permissions.canViewSupplierRefunds ? `/purchases/supplier-refunds/${refund.id}` : null,
        date: refund.refundDate.toISOString(),
        status: refund.status,
        amount: moneyString(refund.amountRefunded),
        label: "Supplier refund",
        category: "financialPosting",
        nonPosting: false,
      });
    }

    for (const purchaseOrder of input.openPurchaseOrders) {
      add({
        id: `PurchaseOrder:${purchaseOrder.id}`,
        sourceType: "PurchaseOrder",
        sourceId: purchaseOrder.id,
        sourceNumber: purchaseOrder.purchaseOrderNumber,
        supplierId: purchaseOrder.supplierId,
        supplierName: supplierName(purchaseOrder.supplier),
        supplierHref: supplierHref(purchaseOrder.supplierId, input.permissions),
        href: input.permissions.canViewPurchaseOrders ? `/purchases/purchase-orders/${purchaseOrder.id}` : null,
        date: purchaseOrder.orderDate.toISOString(),
        status: purchaseOrder.status,
        amount: moneyString(purchaseOrder.total),
        label: "Purchase order",
        category: "operationalNonPosting",
        nonPosting: true,
      });
    }

    for (const receipt of input.purchaseReceipts) {
      add({
        id: `PurchaseReceipt:${receipt.id}`,
        sourceType: "PurchaseReceipt",
        sourceId: receipt.id,
        sourceNumber: receipt.receiptNumber,
        supplierId: receipt.supplierId,
        supplierName: supplierName(receipt.supplier),
        supplierHref: supplierHref(receipt.supplierId, input.permissions),
        href: input.permissions.canViewPurchaseReceiving ? `/inventory/purchase-receipts/${receipt.id}` : null,
        date: receipt.receiptDate.toISOString(),
        status: receipt.status,
        amount: null,
        label: "Purchase receipt",
        category: "operationalNonPosting",
        nonPosting: true,
      });
    }

    for (const purchaseReturn of input.purchaseReturns) {
      add({
        id: `PurchaseReturn:${purchaseReturn.id}`,
        sourceType: "PurchaseReturn",
        sourceId: purchaseReturn.id,
        sourceNumber: purchaseReturn.purchaseReturnNumber,
        supplierId: purchaseReturn.supplierId,
        supplierName: supplierName(purchaseReturn.supplier),
        supplierHref: supplierHref(purchaseReturn.supplierId, input.permissions),
        href: this.canViewPurchaseReturns(input.permissions) ? `/purchases/returns/${purchaseReturn.id}` : null,
        date: purchaseReturn.returnDate.toISOString(),
        status: purchaseReturn.inventoryReturnPostedAt ? `${purchaseReturn.status} - inventory movement posted` : purchaseReturn.status,
        amount: null,
        label: purchaseReturn.inventoryReturnPostedAt ? "Purchase return stock movement posted" : "Purchase return",
        category: "operationalNonPosting",
        nonPosting: true,
      });
    }

    for (const review of input.recentMatchingReviews) {
      add({
        id: `PurchaseMatchingReview:${review.id}`,
        sourceType: "PurchaseMatchingReview",
        sourceId: review.id,
        sourceNumber: `Review ${review.id}`,
        supplierId: review.supplierId ?? "unassigned",
        supplierName: review.supplier ? supplierName(review.supplier) : "Unassigned supplier",
        supplierHref: review.supplierId ? supplierHref(review.supplierId, input.permissions) : null,
        href: input.permissions.canViewPurchaseMatching ? `/purchases/matching?reviewStatus=${review.status}` : null,
        date: review.updatedAt.toISOString(),
        status: review.status,
        amount: null,
        label: "Matching review",
        category: "operationalNonPosting",
        nonPosting: true,
      });
    }

    for (const item of input.valuationPreview?.items.slice(0, SUPPLIER_AP_DASHBOARD_TOP_LIMIT) ?? []) {
      add({
        id: `ValuationVariancePreview:${item.id}`,
        sourceType: "ValuationVariancePreview",
        sourceId: item.id,
        sourceNumber: item.sourceNumber,
        supplierId: item.supplier.id,
        supplierName: supplierName(item.supplier),
        supplierHref: supplierHref(item.supplier.id, input.permissions),
        href: input.permissions.canViewInventoryValuation ? `/inventory/valuation-variances?supplierId=${encodeURIComponent(item.supplier.id)}` : null,
        date: item.latestRelevantDate ?? new Date(0).toISOString(),
        status: item.status,
        amount: item.varianceAmount,
        label: "Valuation variance preview",
        category: "operationalNonPosting",
        nonPosting: true,
      });
    }

    return rows.sort((a, b) => dateTime(b.date) - dateTime(a.date)).slice(0, SUPPLIER_AP_DASHBOARD_TOP_LIMIT);
  }

  private matchingSourceHref(item: PurchaseMatchingExceptionItem, permissions: SupplierApDashboardPermissionContext): string | null {
    if (item.sourceType === "purchaseOrder") return permissions.canViewPurchaseOrders ? item.sourceHref : null;
    if (item.sourceType === "purchaseBill") return permissions.canViewPurchaseBills ? item.sourceHref : null;
    if (item.sourceType === "purchaseReceipt") return permissions.canViewPurchaseReceiving ? item.sourceHref : null;
    return null;
  }

  private varianceSourceHref(item: InventoryValuationVariancePreviewItem, permissions: SupplierApDashboardPermissionContext): string | null {
    if (item.sourceType === "purchaseOrder") return permissions.canViewPurchaseOrders ? item.sourceHref : null;
    if (item.sourceType === "purchaseBill") return permissions.canViewPurchaseBills ? item.sourceHref : null;
    if (item.sourceType === "purchaseReceipt") return permissions.canViewPurchaseReceiving ? item.sourceHref : null;
    if (item.sourceType === "purchaseReturn") return this.canViewPurchaseReturns(permissions) ? item.sourceHref : null;
    if (item.sourceType === "matchingReview") return permissions.canViewPurchaseMatching ? item.sourceHref : null;
    return null;
  }

  private canViewPurchaseReturns(permissions: SupplierApDashboardPermissionContext): boolean {
    return permissions.canViewPurchaseOrders || permissions.canViewPurchaseBills || permissions.canViewPurchaseReceiving;
  }
}

function supplierName(supplier: { name: string; displayName: string | null }): string {
  return supplier.displayName ?? supplier.name;
}

function supplierHref(supplierId: string, permissions: SupplierApDashboardPermissionContext): string | null {
  return permissions.canViewSuppliers ? `/suppliers/${supplierId}` : null;
}

function moneyString(value: Prisma.Decimal.Value | null | undefined): string {
  return toMoney(value === null || value === undefined ? 0 : String(value)).toFixed(4);
}

function sumMoney(values: Array<Prisma.Decimal.Value | null | undefined>): string {
  return values
    .reduce<ReturnType<typeof toMoney>>((sum, value) => sum.plus(value === null || value === undefined ? 0 : String(value)), toMoney(0))
    .toFixed(4);
}

function compareMoneyDesc(a: string, b: string): number {
  return toMoney(b).cmp(toMoney(a));
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999));
}

function addUtcDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateTime(value: Date | string | null | undefined): number {
  if (!value) return 0;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function isOpenReviewStatus(status: string | null): boolean {
  return Boolean(status && OPEN_PURCHASE_MATCHING_REVIEW_STATUSES.includes(status as PurchaseMatchingReviewStatus));
}

function returnStatusRank(status: PurchaseReturnStatus): number {
  switch (status) {
    case PurchaseReturnStatus.SUBMITTED:
      return 0;
    case PurchaseReturnStatus.APPROVED:
      return 1;
    case PurchaseReturnStatus.DRAFT:
      return 2;
    default:
      return 3;
  }
}
