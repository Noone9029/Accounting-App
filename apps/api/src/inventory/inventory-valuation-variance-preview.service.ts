import { Injectable } from "@nestjs/common";
import {
  Prisma,
  PurchaseBillInventoryPostingMode,
  PurchaseBillStatus,
  PurchaseMatchingReviewReason,
  PurchaseMatchingReviewStatus,
  PurchaseOrderStatus,
  PurchaseReceiptStatus,
  PurchaseReturnStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type InventoryValuationVarianceType =
  | "PRICE_VARIANCE"
  | "QUANTITY_VARIANCE"
  | "RECEIPT_WITHOUT_BILL"
  | "BILL_WITHOUT_RECEIPT"
  | "OVER_RECEIVED_VALUE"
  | "OVER_BILLED_VALUE"
  | "RETURN_PENDING_CREDIT"
  | "REVIEW_REQUIRED";

export type InventoryValuationVarianceSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type InventoryValuationVarianceStatus =
  | "PREVIEW_ONLY"
  | "NEEDS_ACCOUNTANT_REVIEW"
  | "NEEDS_MATCHING_REVIEW"
  | "NEEDS_RETURN_REVIEW"
  | "READY_FOR_POLICY_DECISION";
export type InventoryValuationVarianceSourceType = "purchaseOrder" | "purchaseBill" | "purchaseReceipt" | "purchaseReturn" | "matchingReview";

export interface InventoryValuationVariancePreviewFilters {
  supplierId?: string;
  itemId?: string;
  varianceType?: InventoryValuationVarianceType;
  severity?: InventoryValuationVarianceSeverity;
  sourceType?: InventoryValuationVarianceSourceType;
  from?: string;
  to?: string;
  search?: string;
  purchaseReceiptId?: string;
  purchaseBillId?: string;
  matchingReviewId?: string;
  limit: number;
}

interface SourceDocumentLink {
  type: InventoryValuationVarianceSourceType;
  id: string;
  number: string;
  href: string;
}

interface PreviewDocument {
  id: string;
  number: string;
  status: string;
  date: string | null;
  href: string;
}

interface PreviewSupplier {
  id: string;
  name: string;
  displayName: string | null;
}

interface PreviewItem {
  id: string;
  name: string;
  sku: string | null;
  inventoryTracking: boolean;
}

interface PreviewMatchingReview {
  id: string;
  sourceType: string;
  sourceId: string;
  exceptionType: string;
  severity: string;
  status: PurchaseMatchingReviewStatus;
  reasonCode: PurchaseMatchingReviewReason | null;
  href: string;
}

interface PreviewPurchaseReturn {
  id: string;
  purchaseReturnNumber: string;
  status: PurchaseReturnStatus;
  returnDate: string;
  inventoryReturnPostedAt: string | null;
  href: string;
}

export interface InventoryValuationVariancePreviewItem {
  id: string;
  supplier: PreviewSupplier;
  item: PreviewItem | null;
  lineDescription: string;
  purchaseOrder: PreviewDocument | null;
  purchaseBill: (PreviewDocument & { inventoryPostingMode?: PurchaseBillInventoryPostingMode }) | null;
  purchaseReceipt: PreviewDocument | null;
  purchaseReturn: PreviewPurchaseReturn | null;
  matchingReview: PreviewMatchingReview | null;
  sourceType: InventoryValuationVarianceSourceType;
  sourceId: string;
  sourceNumber: string;
  sourceHref: string;
  sourceDocumentLinks: SourceDocumentLink[];
  orderedQuantity: string | null;
  receivedQuantity: string;
  billedQuantity: string;
  returnedQuantity: string;
  receiptUnitCost: string | null;
  billUnitCost: string | null;
  expectedValue: string;
  receivedValue: string;
  billedValue: string;
  returnedValue: string;
  varianceQuantity: string;
  varianceAmount: string;
  varianceType: InventoryValuationVarianceType;
  severity: InventoryValuationVarianceSeverity;
  status: InventoryValuationVarianceStatus;
  suggestedReviewAction: string;
  warnings: string[];
  returnRelated: boolean;
  matchingReviewRelated: boolean;
  latestRelevantDate: string | null;
}

export interface InventoryValuationVariancePreviewSummary {
  totalVarianceCount: number;
  totalAbsoluteVarianceAmount: string;
  positiveVarianceAmount: string;
  negativeVarianceAmount: string;
  criticalCount: number;
  highCount: number;
  suppliersAffected: number;
  itemsAffected: number;
  returnRelatedVarianceCount: number;
  matchingReviewRelatedVarianceCount: number;
}

export interface InventoryValuationVarianceSupplierGroup {
  supplierId: string;
  supplierName: string;
  totalVarianceAmount: string;
  varianceCount: number;
  highestSeverity: InventoryValuationVarianceSeverity;
  itemsAffected: number;
  sourceDocumentLinks: SourceDocumentLink[];
  items: InventoryValuationVariancePreviewItem[];
}

export interface InventoryValuationVariancePreviewResponse {
  readOnly: true;
  previewOnly: true;
  noMutation: true;
  noPostingEffect: true;
  noInventoryEffect: true;
  generatedAt: string;
  filters: InventoryValuationVariancePreviewFilters;
  summary: InventoryValuationVariancePreviewSummary;
  supplierGroups: InventoryValuationVarianceSupplierGroup[];
  items: InventoryValuationVariancePreviewItem[];
  warnings: string[];
}

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;
const ZERO = new Prisma.Decimal(0);
const SEVERITY_ORDER: Record<InventoryValuationVarianceSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const contactSelect = { id: true, name: true, displayName: true } as const;
const itemSelect = { id: true, name: true, sku: true, inventoryTracking: true } as const;
const orderLineSelect = {
  id: true,
  itemId: true,
  description: true,
  quantity: true,
  unitPrice: true,
  sortOrder: true,
  item: { select: itemSelect },
} as const;
const billLineSelect = {
  id: true,
  itemId: true,
  description: true,
  quantity: true,
  unitPrice: true,
  sortOrder: true,
  item: { select: itemSelect },
} as const;
const receiptLineSelect = {
  id: true,
  itemId: true,
  purchaseOrderLineId: true,
  purchaseBillLineId: true,
  quantity: true,
  unitCost: true,
  item: { select: itemSelect },
  purchaseOrderLine: { select: { id: true, description: true, quantity: true, unitPrice: true } },
  purchaseBillLine: { select: { id: true, description: true, quantity: true, unitPrice: true } },
} as const;

const purchaseOrderInclude = {
  supplier: { select: contactSelect },
  lines: { orderBy: { sortOrder: "asc" as const }, select: orderLineSelect },
} satisfies Prisma.PurchaseOrderInclude;

const purchaseBillInclude = {
  supplier: { select: contactSelect },
  purchaseOrder: {
    include: {
      supplier: { select: contactSelect },
      lines: { orderBy: { sortOrder: "asc" as const }, select: orderLineSelect },
    },
  },
  lines: { orderBy: { sortOrder: "asc" as const }, select: billLineSelect },
} satisfies Prisma.PurchaseBillInclude;

const purchaseReceiptInclude = {
  supplier: { select: contactSelect },
  purchaseOrder: { select: { id: true, purchaseOrderNumber: true, status: true, orderDate: true, total: true } },
  purchaseBill: {
    select: {
      id: true,
      billNumber: true,
      status: true,
      billDate: true,
      total: true,
      inventoryPostingMode: true,
      purchaseOrderId: true,
    },
  },
  lines: { orderBy: { createdAt: "asc" as const }, select: receiptLineSelect },
} satisfies Prisma.PurchaseReceiptInclude;

const purchaseReturnInclude = {
  supplier: { select: contactSelect },
  sourcePurchaseBill: { select: { id: true, billNumber: true, status: true, billDate: true, total: true, supplierId: true } },
  sourcePurchaseOrder: { select: { id: true, purchaseOrderNumber: true, status: true, orderDate: true, total: true, supplierId: true } },
  sourcePurchaseReceipt: {
    select: {
      id: true,
      receiptNumber: true,
      status: true,
      receiptDate: true,
      supplierId: true,
      purchaseOrderId: true,
      purchaseBillId: true,
    },
  },
  sourceMatchingReview: {
    select: { id: true, sourceType: true, sourceId: true, exceptionType: true, severity: true, status: true, reasonCode: true },
  },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      item: { select: itemSelect },
      sourcePurchaseBillLine: { select: { id: true, billId: true, description: true, quantity: true, unitPrice: true } },
      sourcePurchaseReceiptLine: { select: { id: true, receiptId: true, quantity: true, unitCost: true } },
      sourcePurchaseOrderLine: { select: { id: true, purchaseOrderId: true, description: true, quantity: true, unitPrice: true } },
    },
  },
} satisfies Prisma.PurchaseReturnInclude;

const matchingReviewInclude = {
  supplier: { select: contactSelect },
  purchaseReturns: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { id: true, purchaseReturnNumber: true, status: true },
  },
} satisfies Prisma.PurchaseMatchingReviewInclude;

type PurchaseOrderRecord = Prisma.PurchaseOrderGetPayload<{ include: typeof purchaseOrderInclude }>;
type PurchaseBillRecord = Prisma.PurchaseBillGetPayload<{ include: typeof purchaseBillInclude }>;
type PurchaseReceiptRecord = Prisma.PurchaseReceiptGetPayload<{ include: typeof purchaseReceiptInclude }>;
type PurchaseReturnRecord = Prisma.PurchaseReturnGetPayload<{ include: typeof purchaseReturnInclude }>;
type MatchingReviewRecord = Prisma.PurchaseMatchingReviewGetPayload<{ include: typeof matchingReviewInclude }>;
type OrderLineRecord = PurchaseOrderRecord["lines"][number];
type BillLineRecord = PurchaseBillRecord["lines"][number];

interface LineAccumulator {
  key: string;
  supplier: PreviewSupplier;
  item: PreviewItem | null;
  lineDescription: string;
  purchaseOrder: PreviewDocument | null;
  purchaseBill: (PreviewDocument & { inventoryPostingMode?: PurchaseBillInventoryPostingMode }) | null;
  purchaseReceipt: PreviewDocument | null;
  purchaseReturn: PreviewPurchaseReturn | null;
  matchingReview: PreviewMatchingReview | null;
  sourceDocumentLinks: Map<string, SourceDocumentLink>;
  purchaseOrderIds: Set<string>;
  purchaseBillIds: Set<string>;
  purchaseReceiptIds: Set<string>;
  purchaseReturnIds: Set<string>;
  matchingReviewIds: Set<string>;
  orderedQuantity: Prisma.Decimal;
  receivedQuantity: Prisma.Decimal;
  billedQuantity: Prisma.Decimal;
  returnedQuantity: Prisma.Decimal;
  expectedValue: Prisma.Decimal;
  receivedValue: Prisma.Decimal;
  billedValue: Prisma.Decimal;
  returnedValue: Prisma.Decimal;
  receiptUnitCostNumerator: Prisma.Decimal;
  receiptUnitCostQuantity: Prisma.Decimal;
  billUnitCostNumerator: Prisma.Decimal;
  billUnitCostQuantity: Prisma.Decimal;
  warnings: Set<string>;
  latestRelevantDate: string | null;
}

@Injectable()
export class InventoryValuationVariancePreviewService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    organizationId: string,
    rawFilters: Record<string, string | string[] | number | undefined> = {},
  ): Promise<InventoryValuationVariancePreviewResponse> {
    const filters = this.normalizeFilters(rawFilters);
    const [purchaseOrders, purchaseBills, purchaseReceipts, purchaseReturns, matchingReviews] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: { organizationId, status: { not: PurchaseOrderStatus.VOIDED } },
        orderBy: [{ orderDate: "asc" }, { createdAt: "asc" }],
        include: purchaseOrderInclude,
      }),
      this.prisma.purchaseBill.findMany({
        where: { organizationId, status: { not: PurchaseBillStatus.VOIDED } },
        orderBy: [{ billDate: "asc" }, { createdAt: "asc" }],
        include: purchaseBillInclude,
      }),
      this.prisma.purchaseReceipt.findMany({
        where: { organizationId, status: { not: PurchaseReceiptStatus.VOIDED } },
        orderBy: [{ receiptDate: "asc" }, { createdAt: "asc" }],
        include: purchaseReceiptInclude,
      }),
      this.prisma.purchaseReturn.findMany({
        where: { organizationId, status: { notIn: [PurchaseReturnStatus.CANCELLED, PurchaseReturnStatus.VOIDED] } },
        orderBy: [{ returnDate: "asc" }, { createdAt: "asc" }],
        include: purchaseReturnInclude,
      }),
      this.prisma.purchaseMatchingReview.findMany({
        where: { organizationId, status: PurchaseMatchingReviewStatus.NEEDS_VARIANCE_REVIEW },
        orderBy: { updatedAt: "desc" },
        include: matchingReviewInclude,
      }),
    ]);

    const items = this.buildPreviewItems({
      purchaseOrders: purchaseOrders as PurchaseOrderRecord[],
      purchaseBills: purchaseBills as PurchaseBillRecord[],
      purchaseReceipts: purchaseReceipts as PurchaseReceiptRecord[],
      purchaseReturns: purchaseReturns as PurchaseReturnRecord[],
      matchingReviews: matchingReviews as MatchingReviewRecord[],
    });
    const filteredItems = this.applyFilters(items, filters).slice(0, filters.limit);
    const supplierGroups = this.groupBySupplier(filteredItems);
    return {
      readOnly: true,
      previewOnly: true,
      noMutation: true,
      noPostingEffect: true,
      noInventoryEffect: true,
      generatedAt: new Date().toISOString(),
      filters,
      summary: this.summaryFromItems(filteredItems),
      supplierGroups,
      items: filteredItems,
      warnings: [
        "Valuation variance preview is read-only and preview-only.",
        "No journals, AP balances, purchase bill balances, inventory quantities, moving average, FIFO layers, purchase returns, debit notes, refunds, landed cost, VAT, ZATCA, or email actions are created or changed.",
      ],
    };
  }

  async summary(organizationId: string, rawFilters: Record<string, string | string[] | number | undefined> = {}) {
    const response = await this.list(organizationId, rawFilters);
    return response.summary;
  }

  forPurchaseReceipt(organizationId: string, id: string) {
    return this.list(organizationId, { purchaseReceiptId: id, sourceType: "purchaseReceipt" });
  }

  forPurchaseBill(organizationId: string, id: string) {
    return this.list(organizationId, { purchaseBillId: id, sourceType: "purchaseBill" });
  }

  forMatchingReview(organizationId: string, id: string) {
    return this.list(organizationId, { matchingReviewId: id, sourceType: "matchingReview" });
  }

  private buildPreviewItems(input: {
    purchaseOrders: PurchaseOrderRecord[];
    purchaseBills: PurchaseBillRecord[];
    purchaseReceipts: PurchaseReceiptRecord[];
    purchaseReturns: PurchaseReturnRecord[];
    matchingReviews: MatchingReviewRecord[];
  }): InventoryValuationVariancePreviewItem[] {
    const accumulators = new Map<string, LineAccumulator>();
    const billLineToAccumulatorKey = new Map<string, string>();
    const receiptLineToAccumulatorKey = new Map<string, string>();

    for (const order of input.purchaseOrders) {
      for (const line of order.lines) {
        const accumulator = this.getAccumulator(accumulators, `orderLine:${line.id}`, order.supplier, line.item, line.description);
        this.attachOrder(accumulator, order);
        const quantity = this.decimal(line.quantity);
        const unitPrice = this.decimal(line.unitPrice);
        accumulator.orderedQuantity = accumulator.orderedQuantity.plus(quantity);
        accumulator.expectedValue = accumulator.expectedValue.plus(quantity.mul(unitPrice));
      }
    }

    for (const bill of input.purchaseBills) {
      const billLineToOrderLine = bill.purchaseOrder ? this.matchBillLinesToOrderLines(bill.purchaseOrder.lines, bill.lines) : new Map<string, string>();
      for (const line of bill.lines) {
        const orderLineId = billLineToOrderLine.get(line.id);
        const key = orderLineId ? `orderLine:${orderLineId}` : `billLine:${line.id}`;
        billLineToAccumulatorKey.set(line.id, key);
        const accumulator = this.getAccumulator(accumulators, key, bill.supplier, line.item, line.description);
        if (bill.purchaseOrder) this.attachOrder(accumulator, bill.purchaseOrder);
        this.attachBill(accumulator, bill);
        const quantity = this.decimal(line.quantity);
        const unitPrice = this.decimal(line.unitPrice);
        accumulator.billedQuantity = accumulator.billedQuantity.plus(quantity);
        accumulator.billedValue = accumulator.billedValue.plus(quantity.mul(unitPrice));
        accumulator.billUnitCostNumerator = accumulator.billUnitCostNumerator.plus(quantity.mul(unitPrice));
        accumulator.billUnitCostQuantity = accumulator.billUnitCostQuantity.plus(quantity);
      }
    }

    for (const receipt of input.purchaseReceipts) {
      for (const line of receipt.lines) {
        const key =
          (line.purchaseBillLineId ? billLineToAccumulatorKey.get(line.purchaseBillLineId) : undefined) ??
          (line.purchaseOrderLineId ? `orderLine:${line.purchaseOrderLineId}` : undefined) ??
          `receiptLine:${line.id}`;
        receiptLineToAccumulatorKey.set(line.id, key);
        const accumulator = this.getAccumulator(accumulators, key, receipt.supplier, line.item, line.item?.name ?? line.id);
        if (receipt.purchaseOrder) this.attachOrderSummary(accumulator, receipt.purchaseOrder);
        if (receipt.purchaseBill) this.attachBillSummary(accumulator, receipt.purchaseBill);
        this.attachReceipt(accumulator, receipt);
        const quantity = this.decimal(line.quantity);
        accumulator.receivedQuantity = accumulator.receivedQuantity.plus(quantity);
        if (line.unitCost === null) {
          accumulator.warnings.add(`Receipt ${receipt.receiptNumber} has a line without unit cost.`);
          continue;
        }
        const unitCost = this.decimal(line.unitCost);
        accumulator.receivedValue = accumulator.receivedValue.plus(quantity.mul(unitCost));
        accumulator.receiptUnitCostNumerator = accumulator.receiptUnitCostNumerator.plus(quantity.mul(unitCost));
        accumulator.receiptUnitCostQuantity = accumulator.receiptUnitCostQuantity.plus(quantity);
      }
    }

    for (const purchaseReturn of input.purchaseReturns) {
      for (const line of purchaseReturn.lines) {
        const key =
          (line.sourcePurchaseBillLineId ? billLineToAccumulatorKey.get(line.sourcePurchaseBillLineId) : undefined) ??
          (line.sourcePurchaseReceiptLineId ? receiptLineToAccumulatorKey.get(line.sourcePurchaseReceiptLineId) : undefined) ??
          (line.sourcePurchaseOrderLineId ? `orderLine:${line.sourcePurchaseOrderLineId}` : undefined) ??
          `returnLine:${line.id}`;
        const accumulator = this.getAccumulator(accumulators, key, purchaseReturn.supplier, line.item, line.description);
        if (purchaseReturn.sourcePurchaseOrder) this.attachOrderSummary(accumulator, purchaseReturn.sourcePurchaseOrder);
        if (purchaseReturn.sourcePurchaseBill) this.attachBillSummary(accumulator, purchaseReturn.sourcePurchaseBill);
        if (purchaseReturn.sourcePurchaseReceipt) this.attachReceiptSummary(accumulator, purchaseReturn.sourcePurchaseReceipt);
        this.attachReturn(accumulator, purchaseReturn);
        if (purchaseReturn.sourceMatchingReview) this.attachMatchingReview(accumulator, purchaseReturn.sourceMatchingReview);
        const quantity = this.decimal(line.quantity);
        const unitCost = this.returnLineUnitCost(line);
        accumulator.returnedQuantity = accumulator.returnedQuantity.plus(quantity);
        if (unitCost === null) {
          accumulator.warnings.add(`Return ${purchaseReturn.purchaseReturnNumber} has a line without valuation cost.`);
          continue;
        }
        accumulator.returnedValue = accumulator.returnedValue.plus(quantity.mul(unitCost));
      }
    }

    for (const review of input.matchingReviews) {
      let attached = false;
      for (const accumulator of accumulators.values()) {
        if (this.accumulatorMatchesReview(accumulator, review)) {
          this.attachMatchingReview(accumulator, review);
          attached = true;
        }
      }
      if (!attached) {
        const accumulator = this.getAccumulator(
          accumulators,
          `matchingReview:${review.id}`,
          review.supplier ?? { id: review.supplierId ?? "unknown", name: "Unknown supplier", displayName: null },
          null,
          "Matching review",
        );
        this.attachMatchingReview(accumulator, review);
      }
    }

    return [...accumulators.values()].flatMap((accumulator) => this.itemsFromAccumulator(accumulator)).sort((a, b) => this.compareItems(a, b));
  }

  private itemsFromAccumulator(accumulator: LineAccumulator): InventoryValuationVariancePreviewItem[] {
    const items: InventoryValuationVariancePreviewItem[] = [];
    const receiptUnitCost = this.weightedUnitCost(accumulator.receiptUnitCostNumerator, accumulator.receiptUnitCostQuantity);
    const billUnitCost = this.weightedUnitCost(accumulator.billUnitCostNumerator, accumulator.billUnitCostQuantity);
    const matchedQuantity = this.decimalMin(accumulator.billedQuantity, accumulator.receivedQuantity);

    if (matchedQuantity.gt(0) && receiptUnitCost && billUnitCost && !receiptUnitCost.eq(billUnitCost)) {
      const amount = receiptUnitCost.minus(billUnitCost).mul(matchedQuantity);
      items.push(this.previewItem(accumulator, "PRICE_VARIANCE", amount, ZERO, "NEEDS_ACCOUNTANT_REVIEW"));
    }

    if (accumulator.billedQuantity.gt(0) && accumulator.receivedQuantity.gt(0) && !accumulator.receivedQuantity.eq(accumulator.billedQuantity)) {
      const quantityDelta = accumulator.receivedQuantity.minus(accumulator.billedQuantity);
      const unitCost = quantityDelta.gt(0) ? receiptUnitCost ?? billUnitCost ?? ZERO : billUnitCost ?? receiptUnitCost ?? ZERO;
      items.push(this.previewItem(accumulator, "QUANTITY_VARIANCE", quantityDelta.mul(unitCost), quantityDelta, "NEEDS_ACCOUNTANT_REVIEW"));
    }

    if (accumulator.receivedQuantity.gt(0) && accumulator.billedQuantity.eq(0)) {
      items.push(this.previewItem(accumulator, "RECEIPT_WITHOUT_BILL", accumulator.receivedValue, accumulator.receivedQuantity, "NEEDS_MATCHING_REVIEW"));
    }

    if (accumulator.billedQuantity.gt(0) && accumulator.receivedQuantity.eq(0)) {
      items.push(this.previewItem(accumulator, "BILL_WITHOUT_RECEIPT", accumulator.billedValue.neg(), accumulator.billedQuantity.neg(), "NEEDS_MATCHING_REVIEW"));
    }

    if (accumulator.orderedQuantity.gt(0) && accumulator.receivedQuantity.gt(accumulator.orderedQuantity)) {
      const overQuantity = accumulator.receivedQuantity.minus(accumulator.orderedQuantity);
      items.push(
        this.previewItem(
          accumulator,
          "OVER_RECEIVED_VALUE",
          overQuantity.mul(receiptUnitCost ?? billUnitCost ?? ZERO),
          overQuantity,
          "READY_FOR_POLICY_DECISION",
        ),
      );
    }

    if (accumulator.orderedQuantity.gt(0) && accumulator.billedQuantity.gt(accumulator.orderedQuantity)) {
      const overQuantity = accumulator.billedQuantity.minus(accumulator.orderedQuantity);
      items.push(
        this.previewItem(
          accumulator,
          "OVER_BILLED_VALUE",
          overQuantity.mul(billUnitCost ?? receiptUnitCost ?? ZERO).neg(),
          overQuantity.neg(),
          "READY_FOR_POLICY_DECISION",
        ),
      );
    }

    if (accumulator.returnedQuantity.gt(0) && accumulator.returnedValue.gt(0)) {
      items.push(this.previewItem(accumulator, "RETURN_PENDING_CREDIT", accumulator.returnedValue.neg(), accumulator.returnedQuantity.neg(), "NEEDS_RETURN_REVIEW"));
    }

    if (accumulator.matchingReview && items.length === 0) {
      items.push(this.previewItem(accumulator, "REVIEW_REQUIRED", ZERO, ZERO, "NEEDS_ACCOUNTANT_REVIEW"));
    }

    return items.map((item) =>
      accumulator.matchingReview && !item.matchingReview
        ? {
            ...item,
            matchingReview: accumulator.matchingReview,
            matchingReviewRelated: true,
          }
        : item,
    );
  }

  private previewItem(
    accumulator: LineAccumulator,
    varianceType: InventoryValuationVarianceType,
    varianceAmount: Prisma.Decimal,
    varianceQuantity: Prisma.Decimal,
    status: InventoryValuationVarianceStatus,
  ): InventoryValuationVariancePreviewItem {
    const source = this.primarySource(accumulator, varianceType);
    const severity = this.severityFor(varianceType, varianceAmount, accumulator.matchingReview?.severity);
    return {
      id: `${accumulator.key}:${varianceType}:${source.id}`,
      supplier: accumulator.supplier,
      item: accumulator.item,
      lineDescription: accumulator.lineDescription,
      purchaseOrder: accumulator.purchaseOrder,
      purchaseBill: accumulator.purchaseBill,
      purchaseReceipt: accumulator.purchaseReceipt,
      purchaseReturn: varianceType === "RETURN_PENDING_CREDIT" ? accumulator.purchaseReturn : null,
      matchingReview: accumulator.matchingReview,
      sourceType: source.type,
      sourceId: source.id,
      sourceNumber: source.number,
      sourceHref: source.href,
      sourceDocumentLinks: [...accumulator.sourceDocumentLinks.values()],
      orderedQuantity: accumulator.orderedQuantity.gt(0) ? this.decimalString(accumulator.orderedQuantity) : null,
      receivedQuantity: this.decimalString(accumulator.receivedQuantity),
      billedQuantity: this.decimalString(accumulator.billedQuantity),
      returnedQuantity: this.decimalString(accumulator.returnedQuantity),
      receiptUnitCost: this.unitCostString(accumulator.receiptUnitCostNumerator, accumulator.receiptUnitCostQuantity),
      billUnitCost: this.unitCostString(accumulator.billUnitCostNumerator, accumulator.billUnitCostQuantity),
      expectedValue: this.decimalString(accumulator.expectedValue),
      receivedValue: this.decimalString(accumulator.receivedValue),
      billedValue: this.decimalString(accumulator.billedValue),
      returnedValue: this.decimalString(accumulator.returnedValue),
      varianceQuantity: this.decimalString(varianceQuantity),
      varianceAmount: this.decimalString(varianceAmount),
      varianceType,
      severity,
      status,
      suggestedReviewAction: this.suggestedReviewAction(varianceType),
      warnings: [...accumulator.warnings],
      returnRelated: varianceType === "RETURN_PENDING_CREDIT",
      matchingReviewRelated: Boolean(accumulator.matchingReview),
      latestRelevantDate: accumulator.latestRelevantDate,
    };
  }

  private primarySource(accumulator: LineAccumulator, varianceType: InventoryValuationVarianceType): SourceDocumentLink {
    if (varianceType === "RETURN_PENDING_CREDIT" && accumulator.purchaseReturn) {
      return { type: "purchaseReturn", id: accumulator.purchaseReturn.id, number: accumulator.purchaseReturn.purchaseReturnNumber, href: accumulator.purchaseReturn.href };
    }
    if (accumulator.matchingReview) {
      return { type: "matchingReview", id: accumulator.matchingReview.id, number: `Review ${accumulator.matchingReview.id}`, href: accumulator.matchingReview.href };
    }
    if (accumulator.purchaseReceipt) {
      return { type: "purchaseReceipt", id: accumulator.purchaseReceipt.id, number: accumulator.purchaseReceipt.number, href: accumulator.purchaseReceipt.href };
    }
    if (accumulator.purchaseBill) {
      return { type: "purchaseBill", id: accumulator.purchaseBill.id, number: accumulator.purchaseBill.number, href: accumulator.purchaseBill.href };
    }
    if (accumulator.purchaseOrder) {
      return { type: "purchaseOrder", id: accumulator.purchaseOrder.id, number: accumulator.purchaseOrder.number, href: accumulator.purchaseOrder.href };
    }
    return { type: "purchaseReceipt", id: accumulator.key, number: accumulator.key, href: "/inventory/valuation-variances" };
  }

  private getAccumulator(
    accumulators: Map<string, LineAccumulator>,
    key: string,
    supplier: PreviewSupplier,
    item: PreviewItem | null,
    lineDescription: string,
  ): LineAccumulator {
    const existing = accumulators.get(key);
    if (existing) {
      if (!existing.item && item) existing.item = item;
      return existing;
    }
    const created: LineAccumulator = {
      key,
      supplier,
      item,
      lineDescription,
      purchaseOrder: null,
      purchaseBill: null,
      purchaseReceipt: null,
      purchaseReturn: null,
      matchingReview: null,
      sourceDocumentLinks: new Map(),
      purchaseOrderIds: new Set(),
      purchaseBillIds: new Set(),
      purchaseReceiptIds: new Set(),
      purchaseReturnIds: new Set(),
      matchingReviewIds: new Set(),
      orderedQuantity: ZERO,
      receivedQuantity: ZERO,
      billedQuantity: ZERO,
      returnedQuantity: ZERO,
      expectedValue: ZERO,
      receivedValue: ZERO,
      billedValue: ZERO,
      returnedValue: ZERO,
      receiptUnitCostNumerator: ZERO,
      receiptUnitCostQuantity: ZERO,
      billUnitCostNumerator: ZERO,
      billUnitCostQuantity: ZERO,
      warnings: new Set(),
      latestRelevantDate: null,
    };
    accumulators.set(key, created);
    return created;
  }

  private attachOrder(accumulator: LineAccumulator, order: PurchaseOrderRecord) {
    this.attachOrderSummary(accumulator, {
      id: order.id,
      purchaseOrderNumber: order.purchaseOrderNumber,
      status: order.status,
      orderDate: order.orderDate,
      total: order.total,
    });
  }

  private attachOrderSummary(accumulator: LineAccumulator, order: { id: string; purchaseOrderNumber: string; status: string; orderDate: Date; total: Prisma.Decimal }) {
    const document = {
      id: order.id,
      number: order.purchaseOrderNumber,
      status: order.status,
      date: order.orderDate.toISOString(),
      href: `/purchases/purchase-orders/${order.id}`,
    };
    accumulator.purchaseOrder ??= document;
    accumulator.purchaseOrderIds.add(order.id);
    this.addSourceLink(accumulator, "purchaseOrder", order.id, order.purchaseOrderNumber, document.href);
    this.updateLatestDate(accumulator, order.orderDate);
  }

  private attachBill(accumulator: LineAccumulator, bill: PurchaseBillRecord) {
    this.attachBillSummary(accumulator, {
      id: bill.id,
      billNumber: bill.billNumber,
      status: bill.status,
      billDate: bill.billDate,
      total: bill.total,
      inventoryPostingMode: bill.inventoryPostingMode,
    });
  }

  private attachBillSummary(
    accumulator: LineAccumulator,
    bill: { id: string; billNumber: string; status: string; billDate: Date; total: Prisma.Decimal; inventoryPostingMode?: PurchaseBillInventoryPostingMode },
  ) {
    const document = {
      id: bill.id,
      number: bill.billNumber,
      status: bill.status,
      date: bill.billDate.toISOString(),
      href: `/purchases/bills/${bill.id}`,
      inventoryPostingMode: bill.inventoryPostingMode,
    };
    accumulator.purchaseBill ??= document;
    accumulator.purchaseBillIds.add(bill.id);
    this.addSourceLink(accumulator, "purchaseBill", bill.id, bill.billNumber, document.href);
    this.updateLatestDate(accumulator, bill.billDate);
  }

  private attachReceipt(accumulator: LineAccumulator, receipt: PurchaseReceiptRecord) {
    this.attachReceiptSummary(accumulator, {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      status: receipt.status,
      receiptDate: receipt.receiptDate,
    });
  }

  private attachReceiptSummary(accumulator: LineAccumulator, receipt: { id: string; receiptNumber: string; status: string; receiptDate: Date }) {
    const document = {
      id: receipt.id,
      number: receipt.receiptNumber,
      status: receipt.status,
      date: receipt.receiptDate.toISOString(),
      href: `/inventory/purchase-receipts/${receipt.id}`,
    };
    accumulator.purchaseReceipt ??= document;
    accumulator.purchaseReceiptIds.add(receipt.id);
    this.addSourceLink(accumulator, "purchaseReceipt", receipt.id, receipt.receiptNumber, document.href);
    this.updateLatestDate(accumulator, receipt.receiptDate);
  }

  private attachReturn(accumulator: LineAccumulator, purchaseReturn: PurchaseReturnRecord) {
    const document = {
      id: purchaseReturn.id,
      purchaseReturnNumber: purchaseReturn.purchaseReturnNumber,
      status: purchaseReturn.status,
      returnDate: purchaseReturn.returnDate.toISOString(),
      inventoryReturnPostedAt: purchaseReturn.inventoryReturnPostedAt ? purchaseReturn.inventoryReturnPostedAt.toISOString() : null,
      href: `/purchases/returns/${purchaseReturn.id}`,
    };
    accumulator.purchaseReturn ??= document;
    accumulator.purchaseReturnIds.add(purchaseReturn.id);
    this.addSourceLink(accumulator, "purchaseReturn", purchaseReturn.id, purchaseReturn.purchaseReturnNumber, document.href);
    this.updateLatestDate(accumulator, purchaseReturn.returnDate);
    if (!purchaseReturn.relatedPurchaseDebitNoteId && !purchaseReturn.relatedSupplierRefundId) {
      accumulator.warnings.add("Linked purchase return has no related debit note or supplier refund recorded.");
    }
    if (purchaseReturn.inventoryReturnPostedAt) {
      accumulator.warnings.add("Linked purchase return has an operational stock-out movement posted; supplier credit/refund and variance posting remain separate.");
    }
  }

  private attachMatchingReview(
    accumulator: LineAccumulator,
    review: Pick<MatchingReviewRecord, "id" | "sourceType" | "sourceId" | "exceptionType" | "severity" | "status" | "reasonCode">,
  ) {
    const document = {
      id: review.id,
      sourceType: review.sourceType,
      sourceId: review.sourceId,
      exceptionType: review.exceptionType,
      severity: review.severity,
      status: review.status,
      reasonCode: review.reasonCode,
      href: `/purchases/matching?reviewStatus=${review.status}`,
    };
    accumulator.matchingReview ??= document;
    accumulator.matchingReviewIds.add(review.id);
    this.addSourceLink(accumulator, "matchingReview", review.id, `Review ${review.id}`, document.href);
  }

  private addSourceLink(accumulator: LineAccumulator, type: InventoryValuationVarianceSourceType, id: string, number: string, href: string) {
    accumulator.sourceDocumentLinks.set(`${type}:${id}`, { type, id, number, href });
  }

  private updateLatestDate(accumulator: LineAccumulator, value: Date | string | null | undefined) {
    if (!value) return;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;
    if (!accumulator.latestRelevantDate || date.getTime() > new Date(accumulator.latestRelevantDate).getTime()) {
      accumulator.latestRelevantDate = date.toISOString();
    }
  }

  private accumulatorMatchesReview(accumulator: LineAccumulator, review: MatchingReviewRecord): boolean {
    if (review.sourceType === "purchaseOrder") return accumulator.purchaseOrderIds.has(review.sourceId);
    if (review.sourceType === "purchaseBill") return accumulator.purchaseBillIds.has(review.sourceId);
    if (review.sourceType === "purchaseReceipt") return accumulator.purchaseReceiptIds.has(review.sourceId);
    return false;
  }

  private matchBillLinesToOrderLines(orderLines: OrderLineRecord[], billLines: BillLineRecord[]): Map<string, string> {
    const result = new Map<string, string>();
    for (const billLine of billLines) {
      const bySortOrder = orderLines.find((line) => line.sortOrder === billLine.sortOrder);
      if (bySortOrder) {
        result.set(billLine.id, bySortOrder.id);
        continue;
      }
      const byItem = orderLines.filter((line) => line.itemId && line.itemId === billLine.itemId);
      if (byItem.length === 1 && byItem[0]) {
        result.set(billLine.id, byItem[0].id);
        continue;
      }
      const byDescription = orderLines.filter((line) => line.description.trim().toLowerCase() === billLine.description.trim().toLowerCase());
      if (byDescription.length === 1 && byDescription[0]) {
        result.set(billLine.id, byDescription[0].id);
      }
    }
    return result;
  }

  private returnLineUnitCost(line: PurchaseReturnRecord["lines"][number]): Prisma.Decimal | null {
    if (line.unitCost !== null) return this.decimal(line.unitCost);
    if (line.sourcePurchaseReceiptLine?.unitCost !== null && line.sourcePurchaseReceiptLine?.unitCost !== undefined) return this.decimal(line.sourcePurchaseReceiptLine.unitCost);
    if (line.sourcePurchaseBillLine?.unitPrice !== undefined) return this.decimal(line.sourcePurchaseBillLine.unitPrice);
    if (line.sourcePurchaseOrderLine?.unitPrice !== undefined) return this.decimal(line.sourcePurchaseOrderLine.unitPrice);
    return null;
  }

  private normalizeFilters(rawFilters: Record<string, string | string[] | number | undefined>): InventoryValuationVariancePreviewFilters {
    const first = (value: string | string[] | number | undefined) => {
      if (Array.isArray(value)) return value[0];
      if (typeof value === "number") return String(value);
      return value;
    };
    const varianceType = first(rawFilters.varianceType)?.toUpperCase();
    const severity = first(rawFilters.severity)?.toUpperCase();
    const sourceType = first(rawFilters.sourceType);
    const parsedLimit = Number(first(rawFilters.limit));
    return {
      supplierId: first(rawFilters.supplierId) || undefined,
      itemId: first(rawFilters.itemId) || undefined,
      varianceType: this.isVarianceType(varianceType) ? varianceType : undefined,
      severity: this.isSeverity(severity) ? severity : undefined,
      sourceType: this.isSourceType(sourceType) ? sourceType : undefined,
      from: first(rawFilters.from) || undefined,
      to: first(rawFilters.to) || undefined,
      search: first(rawFilters.search)?.trim() || undefined,
      purchaseReceiptId: first(rawFilters.purchaseReceiptId) || undefined,
      purchaseBillId: first(rawFilters.purchaseBillId) || undefined,
      matchingReviewId: first(rawFilters.matchingReviewId) || undefined,
      limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(Math.trunc(parsedLimit), MAX_LIMIT) : DEFAULT_LIMIT,
    };
  }

  private applyFilters(
    items: InventoryValuationVariancePreviewItem[],
    filters: InventoryValuationVariancePreviewFilters,
  ): InventoryValuationVariancePreviewItem[] {
    const search = filters.search?.toLowerCase();
    const from = filters.from ? new Date(filters.from) : null;
    const to = filters.to ? new Date(filters.to) : null;
    if (to && !Number.isNaN(to.getTime())) to.setHours(23, 59, 59, 999);
    return items
      .filter((item) => !filters.supplierId || item.supplier.id === filters.supplierId)
      .filter((item) => !filters.itemId || item.item?.id === filters.itemId)
      .filter((item) => !filters.varianceType || item.varianceType === filters.varianceType)
      .filter((item) => !filters.severity || item.severity === filters.severity)
      .filter((item) => !filters.sourceType || item.sourceType === filters.sourceType || item.sourceDocumentLinks.some((link) => link.type === filters.sourceType))
      .filter((item) => !filters.purchaseReceiptId || item.sourceDocumentLinks.some((link) => link.type === "purchaseReceipt" && link.id === filters.purchaseReceiptId))
      .filter((item) => !filters.purchaseBillId || item.sourceDocumentLinks.some((link) => link.type === "purchaseBill" && link.id === filters.purchaseBillId))
      .filter((item) => !filters.matchingReviewId || item.matchingReview?.id === filters.matchingReviewId)
      .filter((item) => {
        if (!item.latestRelevantDate) return true;
        const date = new Date(item.latestRelevantDate);
        if (from && !Number.isNaN(from.getTime()) && date < from) return false;
        if (to && !Number.isNaN(to.getTime()) && date > to) return false;
        return true;
      })
      .filter((item) => {
        if (!search) return true;
        return [
          item.supplier.displayName,
          item.supplier.name,
          item.item?.name,
          item.item?.sku,
          item.lineDescription,
          item.sourceNumber,
          item.varianceType,
          item.severity,
          item.suggestedReviewAction,
          ...item.sourceDocumentLinks.map((link) => link.number),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      });
  }

  private summaryFromItems(items: InventoryValuationVariancePreviewItem[]): InventoryValuationVariancePreviewSummary {
    const amounts = items.map((item) => this.decimal(item.varianceAmount));
    const totalAbsolute = amounts.reduce((sum, amount) => sum.plus(amount.abs()), ZERO);
    const positive = amounts.filter((amount) => amount.gt(0)).reduce((sum, amount) => sum.plus(amount), ZERO);
    const negative = amounts.filter((amount) => amount.lt(0)).reduce((sum, amount) => sum.plus(amount), ZERO);
    const suppliers = new Set(items.map((item) => item.supplier.id));
    const itemIds = new Set(items.map((item) => item.item?.id).filter(Boolean));
    return {
      totalVarianceCount: items.length,
      totalAbsoluteVarianceAmount: this.decimalString(totalAbsolute),
      positiveVarianceAmount: this.decimalString(positive),
      negativeVarianceAmount: this.decimalString(negative),
      criticalCount: items.filter((item) => item.severity === "CRITICAL").length,
      highCount: items.filter((item) => item.severity === "HIGH").length,
      suppliersAffected: suppliers.size,
      itemsAffected: itemIds.size,
      returnRelatedVarianceCount: items.filter((item) => item.returnRelated).length,
      matchingReviewRelatedVarianceCount: items.filter((item) => item.matchingReviewRelated).length,
    };
  }

  private groupBySupplier(items: InventoryValuationVariancePreviewItem[]): InventoryValuationVarianceSupplierGroup[] {
    const groups = new Map<string, InventoryValuationVarianceSupplierGroup & { amount: Prisma.Decimal; itemIds: Set<string>; links: Map<string, SourceDocumentLink> }>();
    for (const item of items) {
      const existing = groups.get(item.supplier.id);
      if (existing) {
        existing.items.push(item);
        existing.varianceCount += 1;
        existing.amount = existing.amount.plus(item.varianceAmount);
        if (item.item?.id) existing.itemIds.add(item.item.id);
        for (const link of item.sourceDocumentLinks) existing.links.set(`${link.type}:${link.id}`, link);
        if (SEVERITY_ORDER[item.severity] < SEVERITY_ORDER[existing.highestSeverity]) existing.highestSeverity = item.severity;
        continue;
      }
      const itemIds = new Set<string>();
      if (item.item?.id) itemIds.add(item.item.id);
      const links = new Map<string, SourceDocumentLink>();
      for (const link of item.sourceDocumentLinks) links.set(`${link.type}:${link.id}`, link);
      groups.set(item.supplier.id, {
        supplierId: item.supplier.id,
        supplierName: item.supplier.displayName ?? item.supplier.name,
        totalVarianceAmount: "0.0000",
        varianceCount: 1,
        highestSeverity: item.severity,
        itemsAffected: 0,
        sourceDocumentLinks: [],
        items: [item],
        amount: this.decimal(item.varianceAmount),
        itemIds,
        links,
      });
    }

    return [...groups.values()]
      .map((group) => ({
        supplierId: group.supplierId,
        supplierName: group.supplierName,
        totalVarianceAmount: this.decimalString(group.amount),
        varianceCount: group.varianceCount,
        highestSeverity: group.highestSeverity,
        itemsAffected: group.itemIds.size,
        sourceDocumentLinks: [...group.links.values()],
        items: group.items,
      }))
      .sort((a, b) => {
        const severityDelta = SEVERITY_ORDER[a.highestSeverity] - SEVERITY_ORDER[b.highestSeverity];
        if (severityDelta !== 0) return severityDelta;
        return a.supplierName.localeCompare(b.supplierName);
      });
  }

  private compareItems(a: InventoryValuationVariancePreviewItem, b: InventoryValuationVariancePreviewItem): number {
    const severityDelta = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDelta !== 0) return severityDelta;
    const supplierDelta = (a.supplier.displayName ?? a.supplier.name).localeCompare(b.supplier.displayName ?? b.supplier.name);
    if (supplierDelta !== 0) return supplierDelta;
    const dateDelta = this.dateSort(a.latestRelevantDate) - this.dateSort(b.latestRelevantDate);
    if (dateDelta !== 0) return dateDelta;
    return a.sourceNumber.localeCompare(b.sourceNumber);
  }

  private severityFor(
    varianceType: InventoryValuationVarianceType,
    amount: Prisma.Decimal,
    reviewSeverity?: string,
  ): InventoryValuationVarianceSeverity {
    if (this.isSeverity(reviewSeverity)) return reviewSeverity;
    const absoluteAmount = amount.abs();
    if (varianceType === "OVER_RECEIVED_VALUE" || varianceType === "OVER_BILLED_VALUE") return "CRITICAL";
    if (
      varianceType === "RECEIPT_WITHOUT_BILL" ||
      varianceType === "BILL_WITHOUT_RECEIPT" ||
      varianceType === "RETURN_PENDING_CREDIT" ||
      varianceType === "REVIEW_REQUIRED"
    ) {
      return "HIGH";
    }
    if (absoluteAmount.gte(5000)) return "CRITICAL";
    if (absoluteAmount.gte(1000)) return "HIGH";
    if (absoluteAmount.gt(0)) return "MEDIUM";
    return "LOW";
  }

  private suggestedReviewAction(type: InventoryValuationVarianceType): string {
    switch (type) {
      case "PRICE_VARIANCE":
        return "Review receipt and bill unit cost before any accountant variance policy decision.";
      case "QUANTITY_VARIANCE":
        return "Review received and billed quantities before deciding whether matching, return, or variance policy applies.";
      case "RECEIPT_WITHOUT_BILL":
        return "Link or create the purchase bill before any AP or inventory valuation decision.";
      case "BILL_WITHOUT_RECEIPT":
        return "Review receiving status before any inventory valuation or AP follow-up decision.";
      case "OVER_RECEIVED_VALUE":
        return "Review whether over-received value needs matching review, return review, or future accountant policy.";
      case "OVER_BILLED_VALUE":
        return "Review whether over-billed value needs supplier follow-up, matching review, or future accountant policy.";
      case "RETURN_PENDING_CREDIT":
        return "Review whether the linked purchase return needs a future debit note, supplier credit, refund, or accountant policy decision.";
      case "REVIEW_REQUIRED":
        return "Open the matching review and record the accountant decision before any posting workflow is considered.";
    }
  }

  private unitCostString(numerator: Prisma.Decimal, quantity: Prisma.Decimal): string | null {
    const unitCost = this.weightedUnitCost(numerator, quantity);
    return unitCost ? this.decimalString(unitCost) : null;
  }

  private weightedUnitCost(numerator: Prisma.Decimal, quantity: Prisma.Decimal): Prisma.Decimal | null {
    if (quantity.eq(0)) return null;
    return numerator.div(quantity);
  }

  private decimal(value: Prisma.Decimal | string | number): Prisma.Decimal {
    return new Prisma.Decimal(value);
  }

  private decimalString(value: Prisma.Decimal | string | number): string {
    return this.decimal(value).toFixed(4);
  }

  private decimalMin(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
    return a.lte(b) ? a : b;
  }

  private dateSort(value: string | null): number {
    if (!value) return Number.MAX_SAFE_INTEGER;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
  }

  private isVarianceType(value?: string): value is InventoryValuationVarianceType {
    return (
      value === "PRICE_VARIANCE" ||
      value === "QUANTITY_VARIANCE" ||
      value === "RECEIPT_WITHOUT_BILL" ||
      value === "BILL_WITHOUT_RECEIPT" ||
      value === "OVER_RECEIVED_VALUE" ||
      value === "OVER_BILLED_VALUE" ||
      value === "RETURN_PENDING_CREDIT" ||
      value === "REVIEW_REQUIRED"
    );
  }

  private isSeverity(value?: string): value is InventoryValuationVarianceSeverity {
    return value === "CRITICAL" || value === "HIGH" || value === "MEDIUM" || value === "LOW";
  }

  private isSourceType(value?: string): value is InventoryValuationVarianceSourceType {
    return value === "purchaseOrder" || value === "purchaseBill" || value === "purchaseReceipt" || value === "purchaseReturn" || value === "matchingReview";
  }
}
