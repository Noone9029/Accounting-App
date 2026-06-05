import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AccountType,
  MembershipStatus,
  Prisma,
  PurchaseBillInventoryPostingMode,
  PurchaseBillStatus,
  PurchaseMatchingReviewReason,
  PurchaseMatchingReviewStatus,
  PurchaseOrderStatus,
  PurchaseReceiptStatus,
} from "@prisma/client";
import { AUDIT_ENTITY_TYPES } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreatePurchaseMatchingReviewDto,
  PurchaseMatchingReviewTransitionDto,
  UpdatePurchaseMatchingReviewDto,
} from "./dto/purchase-matching-review.dto";

export type PurchaseMatchingContext = "purchaseOrder" | "purchaseBill" | "purchaseReceipt";
export type PurchaseMatchingStatusLabel =
  | "Matched"
  | "Partially matched"
  | "Not received"
  | "Not billed"
  | "Over received"
  | "Over billed"
  | "Receipt pending bill"
  | "Bill pending receipt"
  | "Review required";

export type PurchaseMatchingExceptionType =
  | "OVER_BILLED"
  | "OVER_RECEIVED"
  | "NOT_RECEIVED"
  | "NOT_BILLED"
  | "PARTIALLY_MATCHED"
  | "RECEIPT_PENDING_BILL"
  | "BILL_PENDING_RECEIPT"
  | "REVIEW_REQUIRED";

export type PurchaseMatchingExceptionSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface PurchaseMatchingExceptionFilters {
  supplierId?: string;
  severity?: PurchaseMatchingExceptionSeverity;
  exceptionType?: PurchaseMatchingExceptionType;
  sourceType?: PurchaseMatchingContext;
  reviewStatus?: PurchaseMatchingReviewStatus | "NONE";
  reasonCode?: PurchaseMatchingReviewReason;
  search?: string;
  limit?: number;
}

export interface PurchaseMatchingReviewSummary {
  reviewId: string;
  reviewStatus: PurchaseMatchingReviewStatus;
  reasonCode: PurchaseMatchingReviewReason | null;
  assignedTo: { id: string; name: string; email: string } | null;
  nextReviewDate: string | null;
  reviewedAt: string | null;
  reviewNoteSummary: string | null;
}

export interface PurchaseMatchingExceptionLink {
  id: string;
  number: string;
  href: string;
}

export interface PurchaseMatchingExceptionItem {
  id: string;
  supplierId: string;
  supplierName: string;
  sourceType: PurchaseMatchingContext;
  sourceId: string;
  sourceNumber: string;
  sourceHref: string;
  purchaseOrderId: string | null;
  purchaseOrderNumber: string | null;
  purchaseOrderHref: string | null;
  purchaseBillId: string | null;
  purchaseBillNumber: string | null;
  purchaseBillHref: string | null;
  purchaseReceiptId: string | null;
  purchaseReceiptNumber: string | null;
  purchaseReceiptHref: string | null;
  relatedBills: PurchaseMatchingExceptionLink[];
  relatedReceipts: PurchaseMatchingExceptionLink[];
  itemName: string | null;
  lineDescription: string;
  orderedQuantity: string | null;
  billedQuantity: string;
  receivedQuantity: string;
  remainingToBill: string | null;
  remainingToReceive: string;
  overBilledQuantity: string;
  overReceivedQuantity: string;
  exceptionType: PurchaseMatchingExceptionType;
  exceptionLabel: PurchaseMatchingStatusLabel;
  severity: PurchaseMatchingExceptionSeverity;
  reviewId: string | null;
  reviewStatus: PurchaseMatchingReviewStatus | null;
  reasonCode: PurchaseMatchingReviewReason | null;
  assignedTo: { id: string; name: string; email: string } | null;
  nextReviewDate: string | null;
  reviewedAt: string | null;
  reviewNoteSummary: string | null;
  latestRelevantDate: string | null;
  warnings: string[];
}

export interface PurchaseMatchingExceptionSupplierGroup {
  supplierId: string;
  supplierName: string;
  totalExceptionCount: number;
  highestSeverity: PurchaseMatchingExceptionSeverity;
  outstandingReviewCount: number;
  items: PurchaseMatchingExceptionItem[];
}

export interface PurchaseMatchingExceptionSummaryCounts {
  totalExceptionCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  suppliersWithExceptions: number;
  overBilledCount: number;
  overReceivedCount: number;
  billPendingReceiptCount: number;
  receiptPendingBillCount: number;
  partiallyMatchedCount: number;
  notReceivedCount: number;
  notBilledCount: number;
  reviewRequiredCount: number;
}

export interface PurchaseMatchingExceptionResponse {
  readOnly: true;
  noMutation: true;
  filters: PurchaseMatchingExceptionFilters;
  summary: PurchaseMatchingExceptionSummaryCounts;
  groups: PurchaseMatchingExceptionSupplierGroup[];
  items: PurchaseMatchingExceptionItem[];
}

interface MatchingDocumentRef {
  id: string;
  purchaseOrderNumber?: string;
  billNumber?: string;
  receiptNumber?: string;
  status?: string;
  orderDate?: Date | string | null;
  billDate?: Date | string | null;
  receiptDate?: Date | string | null;
  total?: string;
}

interface MatchingLineRef {
  id: string;
  billNumber?: string;
  billLineId?: string;
  receiptNumber?: string;
  receiptLineId?: string;
  href: string;
  quantity: string;
  status?: string;
}

interface MatchingSummaryLineForExceptions {
  lineId: string;
  item: MatchingItem | null;
  description: string;
  orderedQuantity: string | null;
  billedQuantity: string;
  receivedQuantity: string;
  remainingToBill: string | null;
  remainingToReceive: string;
  overBilledQuantity: string;
  overReceivedQuantity: string;
  status: PurchaseMatchingStatusLabel;
  warnings: string[];
  bills: MatchingLineRef[];
  receipts: MatchingLineRef[];
}

interface MatchingSummaryForExceptions {
  sourceType: PurchaseMatchingContext;
  sourceId: string;
  sourceNumber: string;
  status: PurchaseMatchingStatusLabel;
  supplier: MatchingSupplier;
  purchaseOrder: MatchingDocumentRef | null;
  purchaseBill: MatchingDocumentRef | null;
  purchaseReceipt: MatchingDocumentRef | null;
  relatedBills: MatchingDocumentRef[];
  relatedReceipts: MatchingDocumentRef[];
  lines: MatchingSummaryLineForExceptions[];
}

const PURCHASE_MATCHING_EXCEPTION_SEVERITY_ORDER: Record<PurchaseMatchingExceptionSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const PURCHASE_MATCHING_EXCEPTION_DEFAULT_LIMIT = 100;
const PURCHASE_MATCHING_EXCEPTION_MAX_LIMIT = 200;
const PURCHASE_MATCHING_REVIEW_DEFAULT_LIMIT = 100;
const PURCHASE_MATCHING_REVIEW_MAX_LIMIT = 200;
const FINAL_PURCHASE_MATCHING_REVIEW_STATUSES = new Set<PurchaseMatchingReviewStatus>([
  PurchaseMatchingReviewStatus.RESOLVED,
  PurchaseMatchingReviewStatus.CANCELLED,
]);

const purchaseMatchingReviewInclude = {
  supplier: { select: { id: true, name: true, displayName: true } },
  assignedToUser: { select: { id: true, name: true, email: true } },
  reviewedByUser: { select: { id: true, name: true, email: true } },
} satisfies Prisma.PurchaseMatchingReviewInclude;

type PurchaseMatchingReviewWithRelations = Prisma.PurchaseMatchingReviewGetPayload<{
  include: typeof purchaseMatchingReviewInclude;
}>;

interface MatchingItem {
  id: string;
  name: string;
  sku: string | null;
  inventoryTracking: boolean;
}

interface MatchingSupplier {
  id: string;
  name: string;
  displayName: string | null;
}

interface MatchingOrderLine {
  id: string;
  itemId: string | null;
  description: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  sortOrder: number;
  item: MatchingItem | null;
}

interface MatchingBillLine {
  id: string;
  itemId: string | null;
  description: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  sortOrder: number;
  item: MatchingItem | null;
  account?: { id: string; code: string; name: string; type: AccountType } | null;
}

interface MatchingPurchaseOrder {
  id: string;
  purchaseOrderNumber: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  orderDate: Date;
  total: Prisma.Decimal;
  supplier: MatchingSupplier;
  lines: MatchingOrderLine[];
}

interface MatchingPurchaseBill {
  id: string;
  billNumber: string;
  supplierId: string;
  purchaseOrderId: string | null;
  status: PurchaseBillStatus;
  inventoryPostingMode: PurchaseBillInventoryPostingMode;
  billDate: Date;
  total: Prisma.Decimal;
  supplier: MatchingSupplier;
  purchaseOrder?: MatchingPurchaseOrder | null;
  lines: MatchingBillLine[];
}

interface MatchingReceiptLine {
  id: string;
  itemId: string;
  purchaseOrderLineId: string | null;
  purchaseBillLineId: string | null;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal | null;
  item: MatchingItem | null;
}

interface MatchingPurchaseReceipt {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string | null;
  purchaseBillId: string | null;
  supplierId: string;
  status: PurchaseReceiptStatus;
  receiptDate: Date;
  inventoryAssetJournalEntryId: string | null;
  inventoryAssetReversalJournalEntryId: string | null;
  supplier: MatchingSupplier;
  purchaseOrder?: Pick<MatchingPurchaseOrder, "id" | "purchaseOrderNumber" | "status" | "orderDate" | "total"> | null;
  purchaseBill?: Pick<
    MatchingPurchaseBill,
    "id" | "billNumber" | "status" | "billDate" | "total" | "inventoryPostingMode" | "purchaseOrderId"
  > | null;
  lines: MatchingReceiptLine[];
}

interface LineCalculation {
  status: PurchaseMatchingStatusLabel;
  warnings: string[];
  remainingToBill: Prisma.Decimal | null;
  remainingToReceive: Prisma.Decimal;
  overBilledQuantity: Prisma.Decimal;
  overReceivedQuantity: Prisma.Decimal;
}

@Injectable()
export class PurchaseMatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async forPurchaseOrder(organizationId: string, purchaseOrderId: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, organizationId },
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
        lines: {
          orderBy: { sortOrder: "asc" },
          include: { item: { select: { id: true, name: true, sku: true, inventoryTracking: true } } },
        },
      },
    });
    if (!purchaseOrder) {
      throw new NotFoundException("Purchase order not found.");
    }

    const linkedBills = await this.prisma.purchaseBill.findMany({
      where: { organizationId, purchaseOrderId, status: { not: PurchaseBillStatus.VOIDED } },
      orderBy: [{ billDate: "asc" }, { createdAt: "asc" }],
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
        lines: {
          orderBy: { sortOrder: "asc" },
          include: {
            item: { select: { id: true, name: true, sku: true, inventoryTracking: true } },
            account: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
    });

    const linkedReceipts = await this.prisma.purchaseReceipt.findMany({
      where: {
        organizationId,
        status: { not: PurchaseReceiptStatus.VOIDED },
        OR: [{ purchaseOrderId }, { purchaseBill: { purchaseOrderId } }],
      },
      orderBy: [{ receiptDate: "asc" }, { createdAt: "asc" }],
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
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
        lines: {
          include: { item: { select: { id: true, name: true, sku: true, inventoryTracking: true } } },
        },
      },
    });

    const summary = this.buildPurchaseOrderSummary(
      organizationId,
      purchaseOrder as MatchingPurchaseOrder,
      linkedBills as MatchingPurchaseBill[],
      linkedReceipts as MatchingPurchaseReceipt[],
      "purchaseOrder",
    );
    return this.attachSummaryReviewMetadata(organizationId, summary);
  }

  async forPurchaseBill(organizationId: string, purchaseBillId: string) {
    const purchaseBill = await this.prisma.purchaseBill.findFirst({
      where: { id: purchaseBillId, organizationId },
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
        purchaseOrder: {
          include: {
            supplier: { select: { id: true, name: true, displayName: true } },
            lines: {
              orderBy: { sortOrder: "asc" },
              include: { item: { select: { id: true, name: true, sku: true, inventoryTracking: true } } },
            },
          },
        },
        lines: {
          orderBy: { sortOrder: "asc" },
          include: {
            item: { select: { id: true, name: true, sku: true, inventoryTracking: true } },
            account: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
    });
    if (!purchaseBill) {
      throw new NotFoundException("Purchase bill not found.");
    }

    const linkedReceipts = await this.prisma.purchaseReceipt.findMany({
      where: { organizationId, purchaseBillId, status: { not: PurchaseReceiptStatus.VOIDED } },
      orderBy: [{ receiptDate: "asc" }, { createdAt: "asc" }],
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
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
        lines: {
          include: { item: { select: { id: true, name: true, sku: true, inventoryTracking: true } } },
        },
      },
    });

    const summary = this.buildPurchaseBillSummary(
      purchaseBill as MatchingPurchaseBill,
      linkedReceipts as MatchingPurchaseReceipt[],
      "purchaseBill",
    );
    return this.attachSummaryReviewMetadata(organizationId, summary);
  }

  async forPurchaseReceipt(organizationId: string, purchaseReceiptId: string) {
    const receipt = await this.prisma.purchaseReceipt.findFirst({
      where: { id: purchaseReceiptId, organizationId },
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
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
        lines: {
          include: { item: { select: { id: true, name: true, sku: true, inventoryTracking: true } } },
        },
      },
    });
    if (!receipt) {
      throw new NotFoundException("Purchase receipt not found.");
    }

    if (receipt.purchaseBillId) {
      const summary = await this.forPurchaseBill(organizationId, receipt.purchaseBillId);
      return this.attachSummaryReviewMetadata(organizationId, {
        ...summary,
        sourceType: "purchaseReceipt" as const,
        sourceId: receipt.id,
        sourceNumber: receipt.receiptNumber,
        purchaseReceipt: this.receiptDocument(receipt as MatchingPurchaseReceipt),
        focusReceiptId: receipt.id,
      });
    }

    if (receipt.purchaseOrderId) {
      const summary = await this.forPurchaseOrder(organizationId, receipt.purchaseOrderId);
      return this.attachSummaryReviewMetadata(organizationId, {
        ...summary,
        sourceType: "purchaseReceipt" as const,
        sourceId: receipt.id,
        sourceNumber: receipt.receiptNumber,
        purchaseReceipt: this.receiptDocument(receipt as MatchingPurchaseReceipt),
        focusReceiptId: receipt.id,
      });
    }

    const summary = this.buildStandaloneReceiptSummary(receipt as MatchingPurchaseReceipt);
    return this.attachSummaryReviewMetadata(organizationId, summary);
  }

  async listReviews(
    organizationId: string,
    rawFilters: Record<string, string | string[] | number | undefined> = {},
  ) {
    const filters = this.normalizeReviewFilters(rawFilters);
    const reviews = await this.prisma.purchaseMatchingReview.findMany({
      where: {
        organizationId,
        ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
        ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
        ...(filters.sourceId ? { sourceId: filters.sourceId } : {}),
        ...(filters.exceptionType ? { exceptionType: filters.exceptionType } : {}),
        ...(filters.severity ? { severity: filters.severity } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.reasonCode ? { reasonCode: filters.reasonCode } : {}),
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: filters.limit,
      include: purchaseMatchingReviewInclude,
    });

    return {
      readOnly: false,
      noAccountingMutation: true,
      filters,
      data: reviews.map((review) => this.reviewResponse(review)),
    };
  }

  async getReview(organizationId: string, id: string) {
    return this.reviewResponse(await this.findReview(organizationId, id));
  }

  async createReview(organizationId: string, actorUserId: string, dto: CreatePurchaseMatchingReviewDto) {
    const source = await this.resolveReviewSource(organizationId, dto.sourceType, dto.sourceId);
    const supplierId = dto.supplierId ?? source.supplierId;
    if (dto.supplierId && source.supplierId && dto.supplierId !== source.supplierId) {
      throw new BadRequestException("Review supplier must match the matching exception source supplier.");
    }
    if (supplierId) {
      await this.assertSupplier(organizationId, supplierId);
    }
    await this.assertAssignableUser(organizationId, dto.assignedToUserId);

    try {
      const created = await this.prisma.purchaseMatchingReview.create({
        data: {
          organizationId,
          supplierId: supplierId ?? null,
          sourceType: dto.sourceType,
          sourceId: dto.sourceId,
          exceptionType: dto.exceptionType,
          severity: dto.severity,
          status: PurchaseMatchingReviewStatus.OPEN,
          reasonCode: dto.reasonCode ?? null,
          assignedToUserId: this.cleanNullable(dto.assignedToUserId) ?? null,
          nextReviewDate: this.parseOptionalDate(dto.nextReviewDate, "Next review date"),
          note: this.cleanNullable(dto.note) ?? null,
        },
        include: purchaseMatchingReviewInclude,
      });

      await this.logReviewAudit(organizationId, actorUserId, "CREATE", created);
      return this.reviewResponse(created);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("A review already exists for this matching exception.");
      }
      throw error;
    }
  }

  async updateReview(organizationId: string, actorUserId: string, id: string, dto: UpdatePurchaseMatchingReviewDto) {
    const before = await this.findReview(organizationId, id);
    this.assertReviewMutable(before);
    await this.assertAssignableUser(organizationId, dto.assignedToUserId);

    const data: Prisma.PurchaseMatchingReviewUpdateInput = {
      ...(Object.prototype.hasOwnProperty.call(dto, "status") && dto.status ? { status: dto.status } : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, "reasonCode") ? { reasonCode: dto.reasonCode ?? null } : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, "assignedToUserId")
        ? this.cleanNullable(dto.assignedToUserId)
          ? { assignedToUser: { connect: { id: this.cleanNullable(dto.assignedToUserId)! } } }
          : { assignedToUser: { disconnect: true } }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, "nextReviewDate")
        ? { nextReviewDate: this.parseOptionalDate(dto.nextReviewDate, "Next review date") }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, "note") ? { note: this.cleanNullable(dto.note) ?? null } : {}),
    };

    if (dto.status && FINAL_PURCHASE_MATCHING_REVIEW_STATUSES.has(dto.status)) {
      data.reviewedByUser = { connect: { id: actorUserId } };
      data.reviewedAt = new Date();
    }

    const updated = await this.prisma.purchaseMatchingReview.update({
      where: { id: before.id },
      data,
      include: purchaseMatchingReviewInclude,
    });
    await this.logReviewAudit(organizationId, actorUserId, "UPDATE", updated, before);
    return this.reviewResponse(updated);
  }

  startReview(organizationId: string, actorUserId: string, id: string) {
    return this.transitionReview(organizationId, actorUserId, id, PurchaseMatchingReviewStatus.IN_REVIEW, "START");
  }

  markWaitingForSupplier(
    organizationId: string,
    actorUserId: string,
    id: string,
    dto: PurchaseMatchingReviewTransitionDto = {},
  ) {
    return this.transitionReview(
      organizationId,
      actorUserId,
      id,
      PurchaseMatchingReviewStatus.WAITING_FOR_SUPPLIER,
      "WAITING_FOR_SUPPLIER",
      dto,
    );
  }

  markTimingDifference(
    organizationId: string,
    actorUserId: string,
    id: string,
    dto: PurchaseMatchingReviewTransitionDto = {},
  ) {
    return this.transitionReview(
      organizationId,
      actorUserId,
      id,
      PurchaseMatchingReviewStatus.ACCEPTED_AS_TIMING_DIFFERENCE,
      "MARK_TIMING_DIFFERENCE",
      { ...dto, reasonCode: dto.reasonCode ?? PurchaseMatchingReviewReason.TIMING_DIFFERENCE },
    );
  }

  markNeedsVarianceReview(
    organizationId: string,
    actorUserId: string,
    id: string,
    dto: PurchaseMatchingReviewTransitionDto = {},
  ) {
    return this.transitionReview(
      organizationId,
      actorUserId,
      id,
      PurchaseMatchingReviewStatus.NEEDS_VARIANCE_REVIEW,
      "MARK_NEEDS_VARIANCE_REVIEW",
      dto,
    );
  }

  markNeedsReturnReview(
    organizationId: string,
    actorUserId: string,
    id: string,
    dto: PurchaseMatchingReviewTransitionDto = {},
  ) {
    return this.transitionReview(
      organizationId,
      actorUserId,
      id,
      PurchaseMatchingReviewStatus.NEEDS_RETURN_REVIEW,
      "MARK_NEEDS_RETURN_REVIEW",
      dto,
    );
  }

  resolveReview(
    organizationId: string,
    actorUserId: string,
    id: string,
    dto: PurchaseMatchingReviewTransitionDto = {},
  ) {
    return this.transitionReview(organizationId, actorUserId, id, PurchaseMatchingReviewStatus.RESOLVED, "RESOLVE", dto);
  }

  cancelReview(
    organizationId: string,
    actorUserId: string,
    id: string,
    dto: PurchaseMatchingReviewTransitionDto = {},
  ) {
    return this.transitionReview(organizationId, actorUserId, id, PurchaseMatchingReviewStatus.CANCELLED, "CANCEL", dto);
  }

  async listExceptions(
    organizationId: string,
    rawFilters: Record<string, string | string[] | number | undefined> = {},
  ): Promise<PurchaseMatchingExceptionResponse> {
    const filters = this.normalizeExceptionFilters(rawFilters);

    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: { organizationId, status: { not: PurchaseOrderStatus.VOIDED } },
      orderBy: [{ orderDate: "asc" }, { createdAt: "asc" }],
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
        lines: {
          orderBy: { sortOrder: "asc" },
          include: { item: { select: { id: true, name: true, sku: true, inventoryTracking: true } } },
        },
      },
    });

    const purchaseBills = await this.prisma.purchaseBill.findMany({
      where: { organizationId, status: { not: PurchaseBillStatus.VOIDED } },
      orderBy: [{ billDate: "asc" }, { createdAt: "asc" }],
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
        purchaseOrder: {
          include: {
            supplier: { select: { id: true, name: true, displayName: true } },
            lines: {
              orderBy: { sortOrder: "asc" },
              include: { item: { select: { id: true, name: true, sku: true, inventoryTracking: true } } },
            },
          },
        },
        lines: {
          orderBy: { sortOrder: "asc" },
          include: {
            item: { select: { id: true, name: true, sku: true, inventoryTracking: true } },
            account: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
    });

    const purchaseReceipts = await this.prisma.purchaseReceipt.findMany({
      where: { organizationId, status: { not: PurchaseReceiptStatus.VOIDED } },
      orderBy: [{ receiptDate: "asc" }, { createdAt: "asc" }],
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
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
        lines: {
          include: { item: { select: { id: true, name: true, sku: true, inventoryTracking: true } } },
        },
      },
    });

    const allItems: PurchaseMatchingExceptionItem[] = [];
    const typedBills = purchaseBills as MatchingPurchaseBill[];
    const typedReceipts = purchaseReceipts as MatchingPurchaseReceipt[];

    for (const purchaseOrder of purchaseOrders as MatchingPurchaseOrder[]) {
      const linkedBills = typedBills.filter((bill) => bill.purchaseOrderId === purchaseOrder.id);
      const linkedReceipts = typedReceipts.filter(
        (receipt) => receipt.purchaseOrderId === purchaseOrder.id || receipt.purchaseBill?.purchaseOrderId === purchaseOrder.id,
      );
      const summary = this.buildPurchaseOrderSummary(
        organizationId,
        purchaseOrder,
        linkedBills,
        linkedReceipts,
        "purchaseOrder",
      ) as MatchingSummaryForExceptions;
      allItems.push(...this.exceptionItemsFromSummary(summary));
    }

    for (const purchaseBill of typedBills.filter((bill) => !bill.purchaseOrderId)) {
      const linkedReceipts = typedReceipts.filter((receipt) => receipt.purchaseBillId === purchaseBill.id);
      const summary = this.buildPurchaseBillSummary(purchaseBill, linkedReceipts, "purchaseBill") as MatchingSummaryForExceptions;
      allItems.push(...this.exceptionItemsFromSummary(summary));
    }

    for (const purchaseReceipt of typedReceipts.filter((receipt) => !receipt.purchaseOrderId && !receipt.purchaseBillId)) {
      const summary = this.buildStandaloneReceiptSummary(purchaseReceipt) as MatchingSummaryForExceptions;
      allItems.push(...this.exceptionItemsFromSummary(summary));
    }

    const itemsWithReviewMetadata = await this.attachExceptionReviewMetadata(organizationId, allItems);
    const filteredItems = this.applyExceptionFilters(itemsWithReviewMetadata, filters).slice(0, filters.limit);
    const groups = this.groupExceptionItemsBySupplier(filteredItems);

    return {
      readOnly: true,
      noMutation: true,
      filters,
      summary: this.exceptionSummaryCounts(filteredItems, groups.length),
      groups,
      items: filteredItems,
    };
  }

  private normalizeReviewFilters(rawFilters: Record<string, string | string[] | number | undefined>) {
    const first = (value: string | string[] | number | undefined) => {
      if (Array.isArray(value)) return value[0];
      if (typeof value === "number") return String(value);
      return value;
    };
    const severity = first(rawFilters.severity)?.toUpperCase();
    const exceptionType = first(rawFilters.exceptionType)?.toUpperCase();
    const status = first(rawFilters.status ?? rawFilters.reviewStatus)?.toUpperCase();
    const reasonCode = first(rawFilters.reasonCode)?.toUpperCase();
    const sourceType = first(rawFilters.sourceType);
    const parsedLimit = Number(first(rawFilters.limit));
    return {
      supplierId: first(rawFilters.supplierId) || undefined,
      sourceId: first(rawFilters.sourceId) || undefined,
      sourceType: this.isMatchingContext(sourceType) ? sourceType : undefined,
      severity: this.isExceptionSeverity(severity) ? severity : undefined,
      exceptionType: this.isExceptionType(exceptionType) ? exceptionType : undefined,
      status: this.isReviewStatus(status) ? status : undefined,
      reasonCode: this.isReviewReason(reasonCode) ? reasonCode : undefined,
      limit:
        Number.isFinite(parsedLimit) && parsedLimit > 0
          ? Math.min(Math.trunc(parsedLimit), PURCHASE_MATCHING_REVIEW_MAX_LIMIT)
          : PURCHASE_MATCHING_REVIEW_DEFAULT_LIMIT,
    };
  }

  private async attachExceptionReviewMetadata(
    organizationId: string,
    items: PurchaseMatchingExceptionItem[],
  ): Promise<PurchaseMatchingExceptionItem[]> {
    if (items.length === 0) return items;
    const reviews = await this.prisma.purchaseMatchingReview.findMany({
      where: {
        organizationId,
        OR: items.map((item) => ({
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          exceptionType: item.exceptionType,
        })),
      },
      include: purchaseMatchingReviewInclude,
    });
    const reviewsByKey = new Map(reviews.map((review) => [this.reviewKey(review.sourceType, review.sourceId, review.exceptionType), review]));

    return items.map((item) => {
      const review = reviewsByKey.get(this.reviewKey(item.sourceType, item.sourceId, item.exceptionType));
      if (!review) return item;
      return {
        ...item,
        ...this.reviewSummaryFields(review),
      };
    });
  }

  private async attachSummaryReviewMetadata<T extends { sourceType: PurchaseMatchingContext; sourceId: string; status: PurchaseMatchingStatusLabel }>(
    organizationId: string,
    summary: T,
  ): Promise<T & { reviewSummary: PurchaseMatchingReviewSummary | null }> {
    const exceptionType = this.exceptionTypeForStatus(summary.status);
    if (!exceptionType) {
      return { ...summary, reviewSummary: null };
    }
    const review = await this.prisma.purchaseMatchingReview.findUnique({
      where: {
        organizationId_sourceType_sourceId_exceptionType: {
          organizationId,
          sourceType: summary.sourceType,
          sourceId: summary.sourceId,
          exceptionType,
        },
      },
      include: purchaseMatchingReviewInclude,
    });
    return { ...summary, reviewSummary: review ? this.reviewSummary(review) : null };
  }

  private async transitionReview(
    organizationId: string,
    actorUserId: string,
    id: string,
    status: PurchaseMatchingReviewStatus,
    action: string,
    dto: PurchaseMatchingReviewTransitionDto = {},
  ) {
    const before = await this.findReview(organizationId, id);
    this.assertReviewMutable(before);
    await this.assertAssignableUser(organizationId, dto.assignedToUserId);
    const updated = await this.prisma.purchaseMatchingReview.update({
      where: { id: before.id },
      data: {
        status,
        reviewedByUser: { connect: { id: actorUserId } },
        reviewedAt: new Date(),
        ...(Object.prototype.hasOwnProperty.call(dto, "reasonCode") ? { reasonCode: dto.reasonCode ?? null } : {}),
        ...(Object.prototype.hasOwnProperty.call(dto, "assignedToUserId")
          ? this.cleanNullable(dto.assignedToUserId)
            ? { assignedToUser: { connect: { id: this.cleanNullable(dto.assignedToUserId)! } } }
            : { assignedToUser: { disconnect: true } }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(dto, "nextReviewDate")
          ? { nextReviewDate: this.parseOptionalDate(dto.nextReviewDate, "Next review date") }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(dto, "note") ? { note: this.cleanNullable(dto.note) ?? null } : {}),
      },
      include: purchaseMatchingReviewInclude,
    });
    await this.logReviewAudit(organizationId, actorUserId, action, updated, before);
    return this.reviewResponse(updated);
  }

  private async findReview(organizationId: string, id: string) {
    const review = await this.prisma.purchaseMatchingReview.findFirst({
      where: { id, organizationId },
      include: purchaseMatchingReviewInclude,
    });
    if (!review) {
      throw new NotFoundException("Purchase matching review not found.");
    }
    return review;
  }

  private async resolveReviewSource(organizationId: string, sourceType: PurchaseMatchingContext, sourceId: string) {
    if (sourceType === "purchaseOrder") {
      const source = await this.prisma.purchaseOrder.findFirst({
        where: { id: sourceId, organizationId },
        select: { id: true, purchaseOrderNumber: true, supplierId: true },
      });
      if (!source) throw new NotFoundException("Purchase order source not found.");
      return { sourceId: source.id, sourceNumber: source.purchaseOrderNumber, supplierId: source.supplierId };
    }
    if (sourceType === "purchaseBill") {
      const source = await this.prisma.purchaseBill.findFirst({
        where: { id: sourceId, organizationId },
        select: { id: true, billNumber: true, supplierId: true },
      });
      if (!source) throw new NotFoundException("Purchase bill source not found.");
      return { sourceId: source.id, sourceNumber: source.billNumber, supplierId: source.supplierId };
    }
    const source = await this.prisma.purchaseReceipt.findFirst({
      where: { id: sourceId, organizationId },
      select: { id: true, receiptNumber: true, supplierId: true },
    });
    if (!source) throw new NotFoundException("Purchase receipt source not found.");
    return { sourceId: source.id, sourceNumber: source.receiptNumber, supplierId: source.supplierId };
  }

  private async assertSupplier(organizationId: string, supplierId: string) {
    const supplier = await this.prisma.contact.findFirst({
      where: { id: supplierId, organizationId },
      select: { id: true },
    });
    if (!supplier) {
      throw new NotFoundException("Supplier not found for this organization.");
    }
  }

  private async assertAssignableUser(organizationId: string, userId?: string | null) {
    const cleaned = this.cleanNullable(userId);
    if (!cleaned) return;
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId, userId: cleaned, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });
    if (!member) {
      throw new BadRequestException("Assigned reviewer must be an active user in this organization.");
    }
  }

  private assertReviewMutable(review: { status: PurchaseMatchingReviewStatus }) {
    if (FINAL_PURCHASE_MATCHING_REVIEW_STATUSES.has(review.status)) {
      throw new BadRequestException("Resolved or cancelled purchase matching reviews cannot be changed.");
    }
  }

  private async logReviewAudit(
    organizationId: string,
    actorUserId: string,
    action: string,
    after: PurchaseMatchingReviewWithRelations,
    before?: PurchaseMatchingReviewWithRelations,
  ) {
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action,
      entityType: AUDIT_ENTITY_TYPES.PURCHASE_MATCHING_REVIEW,
      entityId: after.id,
      before: before ? this.reviewAuditSnapshot(before) : undefined,
      after: this.reviewAuditSnapshot(after),
    });
  }

  private reviewResponse(review: PurchaseMatchingReviewWithRelations) {
    return {
      id: review.id,
      organizationId: review.organizationId,
      supplierId: review.supplierId,
      supplier: review.supplier,
      sourceType: review.sourceType as PurchaseMatchingContext,
      sourceId: review.sourceId,
      sourceHref: this.sourceHref(review.sourceType as PurchaseMatchingContext, review.sourceId),
      exceptionType: review.exceptionType as PurchaseMatchingExceptionType,
      severity: review.severity as PurchaseMatchingExceptionSeverity,
      status: review.status,
      reasonCode: review.reasonCode,
      assignedTo: review.assignedToUser,
      reviewedBy: review.reviewedByUser,
      reviewedAt: review.reviewedAt?.toISOString() ?? null,
      nextReviewDate: review.nextReviewDate?.toISOString() ?? null,
      note: review.note,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      reviewOnly: true,
      noPostingEffect: true,
    };
  }

  private reviewSummary(review: PurchaseMatchingReviewWithRelations): PurchaseMatchingReviewSummary {
    return {
      reviewId: review.id,
      reviewStatus: review.status,
      reasonCode: review.reasonCode,
      assignedTo: review.assignedToUser,
      nextReviewDate: review.nextReviewDate?.toISOString() ?? null,
      reviewedAt: review.reviewedAt?.toISOString() ?? null,
      reviewNoteSummary: this.safeNoteSummary(review.note),
    };
  }

  private reviewSummaryFields(review: PurchaseMatchingReviewWithRelations) {
    const summary = this.reviewSummary(review);
    return {
      reviewId: summary.reviewId,
      reviewStatus: summary.reviewStatus,
      reasonCode: summary.reasonCode,
      assignedTo: summary.assignedTo,
      nextReviewDate: summary.nextReviewDate,
      reviewedAt: summary.reviewedAt,
      reviewNoteSummary: summary.reviewNoteSummary,
    };
  }

  private reviewAuditSnapshot(review: PurchaseMatchingReviewWithRelations) {
    return {
      reviewId: review.id,
      supplierId: review.supplierId,
      sourceType: review.sourceType,
      sourceId: review.sourceId,
      exceptionType: review.exceptionType,
      severity: review.severity,
      status: review.status,
      reasonCode: review.reasonCode,
      assignedToUserId: review.assignedToUserId,
      reviewedByUserId: review.reviewedByUserId,
      reviewedAt: review.reviewedAt,
      nextReviewDate: review.nextReviewDate,
      notePresent: Boolean(review.note),
      noteLength: review.note?.length ?? 0,
    };
  }

  private reviewKey(sourceType: string, sourceId: string, exceptionType: string): string {
    return `${sourceType}:${sourceId}:${exceptionType}`;
  }

  private safeNoteSummary(note: string | null): string | null {
    const cleaned = this.cleanNullable(note);
    if (!cleaned) return null;
    return cleaned.length > 120 ? `${cleaned.slice(0, 117)}...` : cleaned;
  }

  private isOutstandingReviewItem(item: PurchaseMatchingExceptionItem): boolean {
    return !item.reviewStatus || !FINAL_PURCHASE_MATCHING_REVIEW_STATUSES.has(item.reviewStatus);
  }

  private normalizeExceptionFilters(
    rawFilters: Record<string, string | string[] | number | undefined>,
  ): Required<Pick<PurchaseMatchingExceptionFilters, "limit">> & Omit<PurchaseMatchingExceptionFilters, "limit"> {
    const first = (value: string | string[] | number | undefined) => {
      if (Array.isArray(value)) return value[0];
      if (typeof value === "number") return String(value);
      return value;
    };
    const severity = first(rawFilters.severity)?.toUpperCase();
    const exceptionType = first(rawFilters.exceptionType)?.toUpperCase();
    const sourceType = first(rawFilters.sourceType);
    const reviewStatus = first(rawFilters.reviewStatus)?.toUpperCase();
    const reasonCode = first(rawFilters.reasonCode)?.toUpperCase();
    const parsedLimit = Number(first(rawFilters.limit));

    return {
      supplierId: first(rawFilters.supplierId) || undefined,
      severity: this.isExceptionSeverity(severity) ? severity : undefined,
      exceptionType: this.isExceptionType(exceptionType) ? exceptionType : undefined,
      sourceType: this.isMatchingContext(sourceType) ? sourceType : undefined,
      reviewStatus: reviewStatus === "NONE" || this.isReviewStatus(reviewStatus) ? reviewStatus : undefined,
      reasonCode: this.isReviewReason(reasonCode) ? reasonCode : undefined,
      search: first(rawFilters.search)?.trim() || undefined,
      limit:
        Number.isFinite(parsedLimit) && parsedLimit > 0
          ? Math.min(Math.trunc(parsedLimit), PURCHASE_MATCHING_EXCEPTION_MAX_LIMIT)
          : PURCHASE_MATCHING_EXCEPTION_DEFAULT_LIMIT,
    };
  }

  private applyExceptionFilters(
    items: PurchaseMatchingExceptionItem[],
    filters: PurchaseMatchingExceptionFilters,
  ): PurchaseMatchingExceptionItem[] {
    const search = filters.search?.toLowerCase();
    return items
      .filter((item) => !filters.supplierId || item.supplierId === filters.supplierId)
      .filter((item) => !filters.severity || item.severity === filters.severity)
      .filter((item) => !filters.exceptionType || item.exceptionType === filters.exceptionType)
      .filter((item) => !filters.sourceType || item.sourceType === filters.sourceType)
      .filter((item) => {
        if (!filters.reviewStatus) return true;
        if (filters.reviewStatus === "NONE") return !item.reviewId;
        return item.reviewStatus === filters.reviewStatus;
      })
      .filter((item) => !filters.reasonCode || item.reasonCode === filters.reasonCode)
      .filter((item) => {
        if (!search) return true;
        return [
          item.supplierName,
          item.sourceNumber,
          item.purchaseOrderNumber,
          item.purchaseBillNumber,
          item.purchaseReceiptNumber,
          item.itemName,
          item.lineDescription,
          item.exceptionLabel,
          item.exceptionType,
          item.reviewStatus,
          item.reasonCode,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      })
      .sort((a, b) => this.compareExceptionItems(a, b));
  }

  private groupExceptionItemsBySupplier(items: PurchaseMatchingExceptionItem[]): PurchaseMatchingExceptionSupplierGroup[] {
    const groups = new Map<string, PurchaseMatchingExceptionSupplierGroup>();
    for (const item of items) {
      const existing = groups.get(item.supplierId);
      if (existing) {
        existing.items.push(item);
        existing.totalExceptionCount += 1;
        existing.outstandingReviewCount += this.isOutstandingReviewItem(item) ? 1 : 0;
        if (
          PURCHASE_MATCHING_EXCEPTION_SEVERITY_ORDER[item.severity] <
          PURCHASE_MATCHING_EXCEPTION_SEVERITY_ORDER[existing.highestSeverity]
        ) {
          existing.highestSeverity = item.severity;
        }
        continue;
      }
      groups.set(item.supplierId, {
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        totalExceptionCount: 1,
        highestSeverity: item.severity,
        outstandingReviewCount: this.isOutstandingReviewItem(item) ? 1 : 0,
        items: [item],
      });
    }

    return [...groups.values()].sort((a, b) => {
      const severityDelta =
        PURCHASE_MATCHING_EXCEPTION_SEVERITY_ORDER[a.highestSeverity] -
        PURCHASE_MATCHING_EXCEPTION_SEVERITY_ORDER[b.highestSeverity];
      if (severityDelta !== 0) return severityDelta;
      return a.supplierName.localeCompare(b.supplierName);
    });
  }

  private exceptionSummaryCounts(
    items: PurchaseMatchingExceptionItem[],
    suppliersWithExceptions: number,
  ): PurchaseMatchingExceptionSummaryCounts {
    const countSeverity = (severity: PurchaseMatchingExceptionSeverity) => items.filter((item) => item.severity === severity).length;
    const countType = (type: PurchaseMatchingExceptionType) => items.filter((item) => item.exceptionType === type).length;

    return {
      totalExceptionCount: items.length,
      criticalCount: countSeverity("CRITICAL"),
      highCount: countSeverity("HIGH"),
      mediumCount: countSeverity("MEDIUM"),
      lowCount: countSeverity("LOW"),
      suppliersWithExceptions,
      overBilledCount: countType("OVER_BILLED"),
      overReceivedCount: countType("OVER_RECEIVED"),
      billPendingReceiptCount: countType("BILL_PENDING_RECEIPT"),
      receiptPendingBillCount: countType("RECEIPT_PENDING_BILL"),
      partiallyMatchedCount: countType("PARTIALLY_MATCHED"),
      notReceivedCount: countType("NOT_RECEIVED"),
      notBilledCount: countType("NOT_BILLED"),
      reviewRequiredCount: countType("REVIEW_REQUIRED"),
    };
  }

  private exceptionItemsFromSummary(summary: MatchingSummaryForExceptions): PurchaseMatchingExceptionItem[] {
    return summary.lines.flatMap((line) => {
      const exceptionType = this.exceptionTypeForStatus(line.status);
      if (!exceptionType) {
        return [];
      }

      const relatedBills = this.uniqueLinks(line.bills.map((bill) => ({ id: bill.id, number: bill.billNumber ?? bill.id, href: bill.href })));
      const relatedReceipts = this.uniqueLinks(
        line.receipts.map((receipt) => ({ id: receipt.id, number: receipt.receiptNumber ?? receipt.id, href: receipt.href })),
      );
      const billDocument = relatedBills[0] ? this.documentById(summary.relatedBills, relatedBills[0].id) : summary.purchaseBill;
      const receiptDocument = relatedReceipts[0] ? this.documentById(summary.relatedReceipts, relatedReceipts[0].id) : summary.purchaseReceipt;
      const sourceHref = this.sourceHref(summary.sourceType, summary.sourceId);
      const severity = this.severityForExceptionType(exceptionType);

      return [
        {
          id: [summary.sourceType, summary.sourceId, line.lineId, exceptionType].join(":"),
          supplierId: summary.supplier.id,
          supplierName: this.supplierName(summary.supplier),
          sourceType: summary.sourceType,
          sourceId: summary.sourceId,
          sourceNumber: summary.sourceNumber,
          sourceHref,
          purchaseOrderId: summary.purchaseOrder?.id ?? null,
          purchaseOrderNumber: this.documentNumber(summary.purchaseOrder),
          purchaseOrderHref: this.documentHref(summary.purchaseOrder),
          purchaseBillId: billDocument?.id ?? null,
          purchaseBillNumber: this.documentNumber(billDocument),
          purchaseBillHref: this.documentHref(billDocument),
          purchaseReceiptId: receiptDocument?.id ?? null,
          purchaseReceiptNumber: this.documentNumber(receiptDocument),
          purchaseReceiptHref: this.documentHref(receiptDocument),
          relatedBills,
          relatedReceipts,
          itemName: line.item?.name ?? null,
          lineDescription: line.description,
          orderedQuantity: line.orderedQuantity,
          billedQuantity: line.billedQuantity,
          receivedQuantity: line.receivedQuantity,
          remainingToBill: line.remainingToBill,
          remainingToReceive: line.remainingToReceive,
          overBilledQuantity: line.overBilledQuantity,
          overReceivedQuantity: line.overReceivedQuantity,
          exceptionType,
          exceptionLabel: line.status,
          severity,
          reviewId: null,
          reviewStatus: null,
          reasonCode: null,
          assignedTo: null,
          nextReviewDate: null,
          reviewedAt: null,
          reviewNoteSummary: null,
          latestRelevantDate: this.latestRelevantDate([
            this.documentDate(summary.purchaseOrder),
            this.documentDate(summary.purchaseBill),
            this.documentDate(summary.purchaseReceipt),
            this.documentDate(billDocument),
            this.documentDate(receiptDocument),
          ]),
          warnings: line.warnings,
        },
      ];
    });
  }

  private exceptionTypeForStatus(status: PurchaseMatchingStatusLabel): PurchaseMatchingExceptionType | null {
    switch (status) {
      case "Over billed":
        return "OVER_BILLED";
      case "Over received":
        return "OVER_RECEIVED";
      case "Not received":
        return "NOT_RECEIVED";
      case "Not billed":
        return "NOT_BILLED";
      case "Partially matched":
        return "PARTIALLY_MATCHED";
      case "Receipt pending bill":
        return "RECEIPT_PENDING_BILL";
      case "Bill pending receipt":
        return "BILL_PENDING_RECEIPT";
      case "Review required":
        return "REVIEW_REQUIRED";
      case "Matched":
        return null;
    }
  }

  private severityForExceptionType(type: PurchaseMatchingExceptionType): PurchaseMatchingExceptionSeverity {
    switch (type) {
      case "OVER_BILLED":
      case "OVER_RECEIVED":
        return "CRITICAL";
      case "BILL_PENDING_RECEIPT":
      case "RECEIPT_PENDING_BILL":
      case "REVIEW_REQUIRED":
        return "HIGH";
      case "PARTIALLY_MATCHED":
      case "NOT_RECEIVED":
      case "NOT_BILLED":
        return "MEDIUM";
    }
  }

  private compareExceptionItems(a: PurchaseMatchingExceptionItem, b: PurchaseMatchingExceptionItem): number {
    const severityDelta = PURCHASE_MATCHING_EXCEPTION_SEVERITY_ORDER[a.severity] - PURCHASE_MATCHING_EXCEPTION_SEVERITY_ORDER[b.severity];
    if (severityDelta !== 0) return severityDelta;
    const supplierDelta = a.supplierName.localeCompare(b.supplierName);
    if (supplierDelta !== 0) return supplierDelta;
    const dateDelta = this.dateSortValue(a.latestRelevantDate) - this.dateSortValue(b.latestRelevantDate);
    if (dateDelta !== 0) return dateDelta;
    return a.sourceNumber.localeCompare(b.sourceNumber);
  }

  private sourceHref(sourceType: PurchaseMatchingContext, sourceId: string): string {
    if (sourceType === "purchaseOrder") return `/purchases/purchase-orders/${sourceId}`;
    if (sourceType === "purchaseBill") return `/purchases/bills/${sourceId}`;
    return `/inventory/purchase-receipts/${sourceId}`;
  }

  private documentNumber(document?: MatchingDocumentRef | null): string | null {
    return document?.purchaseOrderNumber ?? document?.billNumber ?? document?.receiptNumber ?? null;
  }

  private documentHref(document?: MatchingDocumentRef | null): string | null {
    if (!document) return null;
    if (document.purchaseOrderNumber) return `/purchases/purchase-orders/${document.id}`;
    if (document.billNumber) return `/purchases/bills/${document.id}`;
    if (document.receiptNumber) return `/inventory/purchase-receipts/${document.id}`;
    return null;
  }

  private documentDate(document?: MatchingDocumentRef | null): Date | string | null {
    return document?.orderDate ?? document?.billDate ?? document?.receiptDate ?? null;
  }

  private supplierName(supplier: MatchingSupplier): string {
    return supplier.displayName ?? supplier.name;
  }

  private documentById(documents: MatchingDocumentRef[], id: string): MatchingDocumentRef | null {
    return documents.find((document) => document.id === id) ?? null;
  }

  private uniqueLinks(links: PurchaseMatchingExceptionLink[]): PurchaseMatchingExceptionLink[] {
    const seen = new Set<string>();
    return links.filter((link) => {
      if (seen.has(link.id)) return false;
      seen.add(link.id);
      return true;
    });
  }

  private latestRelevantDate(values: Array<Date | string | null | undefined>): string | null {
    const timestamps = values
      .filter(Boolean)
      .map((value) => new Date(value as Date | string))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map((date) => date.getTime());
    if (!timestamps.length) return null;
    return new Date(Math.max(...timestamps)).toISOString();
  }

  private dateSortValue(value: string | null): number {
    if (!value) return Number.MAX_SAFE_INTEGER;
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
  }

  private isExceptionSeverity(value?: string): value is PurchaseMatchingExceptionSeverity {
    return value === "CRITICAL" || value === "HIGH" || value === "MEDIUM" || value === "LOW";
  }

  private isExceptionType(value?: string): value is PurchaseMatchingExceptionType {
    return (
      value === "OVER_BILLED" ||
      value === "OVER_RECEIVED" ||
      value === "NOT_RECEIVED" ||
      value === "NOT_BILLED" ||
      value === "PARTIALLY_MATCHED" ||
      value === "RECEIPT_PENDING_BILL" ||
      value === "BILL_PENDING_RECEIPT" ||
      value === "REVIEW_REQUIRED"
    );
  }

  private isMatchingContext(value?: string): value is PurchaseMatchingContext {
    return value === "purchaseOrder" || value === "purchaseBill" || value === "purchaseReceipt";
  }

  private isReviewStatus(value?: string): value is PurchaseMatchingReviewStatus {
    return Object.values(PurchaseMatchingReviewStatus).includes(value as PurchaseMatchingReviewStatus);
  }

  private isReviewReason(value?: string): value is PurchaseMatchingReviewReason {
    return Object.values(PurchaseMatchingReviewReason).includes(value as PurchaseMatchingReviewReason);
  }

  private cleanNullable(value: string | null | undefined): string | null | undefined {
    if (value === undefined) return undefined;
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private parseOptionalDate(value: string | null | undefined, label: string): Date | null {
    const cleaned = this.cleanNullable(value);
    if (!cleaned) return null;
    const date = new Date(cleaned);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${label} must be a valid date.`);
    }
    return date;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }

  private buildPurchaseOrderSummary(
    organizationId: string,
    purchaseOrder: MatchingPurchaseOrder,
    linkedBills: MatchingPurchaseBill[],
    linkedReceipts: MatchingPurchaseReceipt[],
    sourceType: PurchaseMatchingContext,
  ) {
    const orderLines = purchaseOrder.lines;
    const billLineToOrderLine = this.matchBillLinesToOrderLines(orderLines, linkedBills.flatMap((bill) => bill.lines));
    const billedByLine = new Map<string, Prisma.Decimal>();
    const billsByLine = new Map<string, ReturnType<typeof this.billLineDocument>[]>();
    const warnings: string[] = [];

    for (const bill of linkedBills) {
      for (const billLine of bill.lines) {
        const orderLineId = billLineToOrderLine.get(billLine.id);
        if (!orderLineId) {
          warnings.push(`Bill ${bill.billNumber} has a line that could not be matched to a purchase order line.`);
          continue;
        }
        billedByLine.set(orderLineId, (billedByLine.get(orderLineId) ?? this.zero()).plus(billLine.quantity));
        const list = billsByLine.get(orderLineId) ?? [];
        list.push(this.billLineDocument(bill, billLine));
        billsByLine.set(orderLineId, list);
      }
    }

    const receivedByLine = new Map<string, Prisma.Decimal>();
    const receiptsByLine = new Map<string, ReturnType<typeof this.receiptLineDocument>[]>();
    for (const receipt of linkedReceipts) {
      for (const receiptLine of receipt.lines) {
        const orderLineId = receiptLine.purchaseOrderLineId ?? (receiptLine.purchaseBillLineId ? billLineToOrderLine.get(receiptLine.purchaseBillLineId) ?? null : null);
        if (!orderLineId) {
          warnings.push(`Receipt ${receipt.receiptNumber} has a line that could not be matched to a purchase order line.`);
          continue;
        }
        receivedByLine.set(orderLineId, (receivedByLine.get(orderLineId) ?? this.zero()).plus(receiptLine.quantity));
        const list = receiptsByLine.get(orderLineId) ?? [];
        list.push(this.receiptLineDocument(receipt, receiptLine));
        receiptsByLine.set(orderLineId, list);
      }
    }

    const lines = orderLines.map((line) => {
      const orderedQuantity = line.quantity;
      const billedQuantity = billedByLine.get(line.id) ?? this.zero();
      const receivedQuantity = receivedByLine.get(line.id) ?? this.zero();
      const calculated = this.calculateLineStatus({ orderedQuantity, billedQuantity, receivedQuantity, orderedQuantityKnown: true });
      return {
        lineId: line.id,
        description: line.description,
        item: line.item,
        orderedQuantity: this.decimalString(orderedQuantity),
        billedQuantity: this.decimalString(billedQuantity),
        receivedQuantity: this.decimalString(receivedQuantity),
        remainingToBill: this.decimalString(calculated.remainingToBill ?? this.zero()),
        remainingToReceive: this.decimalString(calculated.remainingToReceive),
        overBilledQuantity: this.decimalString(calculated.overBilledQuantity),
        overReceivedQuantity: this.decimalString(calculated.overReceivedQuantity),
        status: calculated.status,
        warnings: calculated.warnings,
        bills: billsByLine.get(line.id) ?? [],
        receipts: receiptsByLine.get(line.id) ?? [],
      };
    });

    const totals = this.calculateTotals(lines);
    return {
      readOnly: true,
      noMutation: true,
      sourceType,
      sourceId: sourceType === "purchaseOrder" ? purchaseOrder.id : organizationId,
      sourceNumber: sourceType === "purchaseOrder" ? purchaseOrder.purchaseOrderNumber : "",
      status: this.overallStatus(lines),
      supplier: purchaseOrder.supplier,
      purchaseOrder: this.orderDocument(purchaseOrder),
      purchaseBill: null,
      purchaseReceipt: null,
      relatedBills: linkedBills.map((bill) => this.billDocument(bill)),
      relatedReceipts: linkedReceipts.map((receipt) => this.receiptDocument(receipt)),
      totals,
      warnings: this.uniqueStrings([
        "Read-only purchase matching visibility only. No journals, AP balances, inventory quantities, variances, or source documents are changed.",
        ...warnings,
      ]),
      lines,
    };
  }

  private buildPurchaseBillSummary(
    purchaseBill: MatchingPurchaseBill,
    linkedReceipts: MatchingPurchaseReceipt[],
    sourceType: PurchaseMatchingContext,
  ) {
    const order = purchaseBill.purchaseOrder ?? null;
    const billLineToOrderLine = order ? this.matchBillLinesToOrderLines(order.lines, purchaseBill.lines) : new Map<string, string>();
    const orderLinesById = new Map((order?.lines ?? []).map((line) => [line.id, line]));
    const receivedByLine = new Map<string, Prisma.Decimal>();
    const receiptsByLine = new Map<string, ReturnType<typeof this.receiptLineDocument>[]>();
    const warnings: string[] = [];

    for (const receipt of linkedReceipts) {
      for (const receiptLine of receipt.lines) {
        if (!receiptLine.purchaseBillLineId) {
          warnings.push(`Receipt ${receipt.receiptNumber} has a line without a linked bill line.`);
          continue;
        }
        receivedByLine.set(receiptLine.purchaseBillLineId, (receivedByLine.get(receiptLine.purchaseBillLineId) ?? this.zero()).plus(receiptLine.quantity));
        const list = receiptsByLine.get(receiptLine.purchaseBillLineId) ?? [];
        list.push(this.receiptLineDocument(receipt, receiptLine));
        receiptsByLine.set(receiptLine.purchaseBillLineId, list);
      }
    }

    const lines = purchaseBill.lines.map((line) => {
      const orderLineId = billLineToOrderLine.get(line.id) ?? null;
      const orderLine = orderLineId ? orderLinesById.get(orderLineId) ?? null : null;
      const orderedQuantity = orderLine?.quantity ?? null;
      const billedQuantity = line.quantity;
      const receivedQuantity = receivedByLine.get(line.id) ?? this.zero();
      const calculated = this.calculateLineStatus({ orderedQuantity, billedQuantity, receivedQuantity, orderedQuantityKnown: Boolean(orderLine) });
      return {
        lineId: line.id,
        description: line.description,
        item: line.item,
        orderedQuantity: orderedQuantity === null ? null : this.decimalString(orderedQuantity),
        billedQuantity: this.decimalString(billedQuantity),
        receivedQuantity: this.decimalString(receivedQuantity),
        remainingToBill: calculated.remainingToBill === null ? null : this.decimalString(calculated.remainingToBill),
        remainingToReceive: this.decimalString(calculated.remainingToReceive),
        overBilledQuantity: this.decimalString(calculated.overBilledQuantity),
        overReceivedQuantity: this.decimalString(calculated.overReceivedQuantity),
        status: calculated.status,
        warnings: this.uniqueStrings([
          ...(orderLine ? [] : ["No linked purchase order line is available for ordered quantity comparison."]),
          ...calculated.warnings,
        ]),
        bills: [this.billLineDocument(purchaseBill, line)],
        receipts: receiptsByLine.get(line.id) ?? [],
      };
    });

    return {
      readOnly: true,
      noMutation: true,
      sourceType,
      sourceId: purchaseBill.id,
      sourceNumber: purchaseBill.billNumber,
      status: this.overallStatus(lines),
      supplier: purchaseBill.supplier,
      purchaseOrder: order ? this.orderDocument(order) : null,
      purchaseBill: this.billDocument(purchaseBill),
      purchaseReceipt: null,
      relatedBills: [this.billDocument(purchaseBill)],
      relatedReceipts: linkedReceipts.map((receipt) => this.receiptDocument(receipt)),
      totals: this.calculateTotals(lines),
      warnings: this.uniqueStrings([
        "Read-only purchase matching visibility only. No journals, AP balances, inventory quantities, variances, or source documents are changed.",
        ...(order ? [] : ["This bill is not linked to a purchase order, so ordered quantity comparison is unavailable."]),
        ...warnings,
      ]),
      lines,
    };
  }

  private buildStandaloneReceiptSummary(receipt: MatchingPurchaseReceipt) {
    const lines = receipt.lines.map((line) => {
      const receivedQuantity = line.quantity;
      return {
        lineId: line.id,
        description: line.item?.name ?? line.id,
        item: line.item,
        orderedQuantity: null,
        billedQuantity: "0.0000",
        receivedQuantity: this.decimalString(receivedQuantity),
        remainingToBill: null,
        remainingToReceive: "0.0000",
        overBilledQuantity: "0.0000",
        overReceivedQuantity: "0.0000",
        status: "Receipt pending bill" as PurchaseMatchingStatusLabel,
        warnings: ["Standalone receipt is not linked to a purchase order or purchase bill."],
        bills: [],
        receipts: [this.receiptLineDocument(receipt, line)],
      };
    });

    return {
      readOnly: true,
      noMutation: true,
      sourceType: "purchaseReceipt" as const,
      sourceId: receipt.id,
      sourceNumber: receipt.receiptNumber,
      status: lines.length > 0 ? ("Receipt pending bill" as PurchaseMatchingStatusLabel) : ("Review required" as PurchaseMatchingStatusLabel),
      supplier: receipt.supplier,
      purchaseOrder: null,
      purchaseBill: null,
      purchaseReceipt: this.receiptDocument(receipt),
      focusReceiptId: receipt.id,
      relatedBills: [],
      relatedReceipts: [this.receiptDocument(receipt)],
      totals: this.calculateTotals(lines),
      warnings: [
        "Read-only purchase matching visibility only. No journals, AP balances, inventory quantities, variances, or source documents are changed.",
        "Standalone receipt has no purchase order or purchase bill for three-way matching.",
      ],
      lines,
    };
  }

  private matchBillLinesToOrderLines(orderLines: MatchingOrderLine[], billLines: MatchingBillLine[]): Map<string, string> {
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

  private calculateLineStatus(input: {
    orderedQuantity: Prisma.Decimal | null;
    billedQuantity: Prisma.Decimal;
    receivedQuantity: Prisma.Decimal;
    orderedQuantityKnown: boolean;
  }): LineCalculation {
    const warnings: string[] = [];
    const orderedQuantity = input.orderedQuantity ?? this.zero();
    const remainingToBill = input.orderedQuantityKnown ? Prisma.Decimal.max(orderedQuantity.minus(input.billedQuantity), 0) : null;
    const comparisonQuantity = input.orderedQuantityKnown ? orderedQuantity : input.billedQuantity;
    const remainingToReceive = Prisma.Decimal.max(comparisonQuantity.minus(input.receivedQuantity), 0);
    const overBilledQuantity = input.orderedQuantityKnown ? Prisma.Decimal.max(input.billedQuantity.minus(orderedQuantity), 0) : this.zero();
    const overReceivedQuantity = Prisma.Decimal.max(input.receivedQuantity.minus(comparisonQuantity), 0);

    if (overBilledQuantity.gt(0)) warnings.push("Over billed");
    if (overReceivedQuantity.gt(0)) warnings.push("Over received");
    if (input.billedQuantity.eq(0)) warnings.push("Not billed");
    if (input.receivedQuantity.eq(0)) warnings.push("Not received");
    if (input.billedQuantity.gt(input.receivedQuantity)) warnings.push("Bill pending receipt");
    if (input.receivedQuantity.gt(input.billedQuantity)) warnings.push("Receipt pending bill");

    let status: PurchaseMatchingStatusLabel;
    if (!input.orderedQuantityKnown && input.billedQuantity.eq(0) && input.receivedQuantity.gt(0)) {
      status = "Receipt pending bill";
    } else if (overBilledQuantity.gt(0)) {
      status = "Over billed";
    } else if (overReceivedQuantity.gt(0)) {
      status = "Over received";
    } else if (input.billedQuantity.eq(0)) {
      status = "Not billed";
    } else if (input.receivedQuantity.eq(0)) {
      status = "Not received";
    } else if (input.billedQuantity.gt(input.receivedQuantity)) {
      status = "Bill pending receipt";
    } else if (input.receivedQuantity.gt(input.billedQuantity)) {
      status = "Receipt pending bill";
    } else if ((remainingToBill === null || remainingToBill.eq(0)) && remainingToReceive.eq(0)) {
      status = "Matched";
    } else {
      status = "Partially matched";
    }

    return {
      status,
      warnings: this.uniqueStrings(warnings),
      remainingToBill,
      remainingToReceive,
      overBilledQuantity,
      overReceivedQuantity,
    };
  }

  private overallStatus(lines: Array<{ status: PurchaseMatchingStatusLabel }>): PurchaseMatchingStatusLabel {
    if (lines.length === 0) return "Review required";
    const statuses = lines.map((line) => line.status);
    const priority: PurchaseMatchingStatusLabel[] = [
      "Over billed",
      "Over received",
      "Bill pending receipt",
      "Receipt pending bill",
      "Not billed",
      "Not received",
      "Partially matched",
      "Review required",
      "Matched",
    ];
    return priority.find((status) => statuses.includes(status)) ?? "Review required";
  }

  private calculateTotals(
    lines: Array<{
      orderedQuantity: string | null;
      billedQuantity: string;
      receivedQuantity: string;
      remainingToBill: string | null;
      remainingToReceive: string;
      overBilledQuantity: string;
      overReceivedQuantity: string;
    }>,
  ) {
    return {
      orderedQuantity: this.sumStrings(lines.map((line) => line.orderedQuantity)),
      billedQuantity: this.sumStrings(lines.map((line) => line.billedQuantity)),
      receivedQuantity: this.sumStrings(lines.map((line) => line.receivedQuantity)),
      remainingToBill: this.sumStrings(lines.map((line) => line.remainingToBill)),
      remainingToReceive: this.sumStrings(lines.map((line) => line.remainingToReceive)),
      overBilledQuantity: this.sumStrings(lines.map((line) => line.overBilledQuantity)),
      overReceivedQuantity: this.sumStrings(lines.map((line) => line.overReceivedQuantity)),
    };
  }

  private sumStrings(values: Array<string | null>): string {
    return this.decimalString(values.reduce((sum, value) => (value === null ? sum : sum.plus(value)), this.zero()));
  }

  private orderDocument(order: MatchingPurchaseOrder) {
    return {
      id: order.id,
      purchaseOrderNumber: order.purchaseOrderNumber,
      status: order.status,
      orderDate: order.orderDate,
      total: this.decimalString(order.total),
    };
  }

  private billDocument(bill: MatchingPurchaseBill) {
    return {
      id: bill.id,
      billNumber: bill.billNumber,
      status: bill.status,
      billDate: bill.billDate,
      total: this.decimalString(bill.total),
      inventoryPostingMode: bill.inventoryPostingMode,
      purchaseOrderId: bill.purchaseOrderId ?? null,
    };
  }

  private receiptDocument(receipt: MatchingPurchaseReceipt) {
    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      status: receipt.status,
      receiptDate: receipt.receiptDate,
      purchaseOrderId: receipt.purchaseOrderId,
      purchaseBillId: receipt.purchaseBillId,
      inventoryAssetJournalEntryId: receipt.inventoryAssetJournalEntryId,
      inventoryAssetReversalJournalEntryId: receipt.inventoryAssetReversalJournalEntryId,
    };
  }

  private billLineDocument(bill: MatchingPurchaseBill, line: MatchingBillLine) {
    return {
      id: bill.id,
      billNumber: bill.billNumber,
      billLineId: line.id,
      status: bill.status,
      quantity: this.decimalString(line.quantity),
      href: `/purchases/bills/${bill.id}`,
    };
  }

  private receiptLineDocument(receipt: MatchingPurchaseReceipt, line: MatchingReceiptLine) {
    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      receiptLineId: line.id,
      status: receipt.status,
      quantity: this.decimalString(line.quantity),
      unitCost: line.unitCost === null ? null : this.decimalString(line.unitCost),
      href: `/inventory/purchase-receipts/${receipt.id}`,
      inventoryAssetJournalEntryId: receipt.inventoryAssetJournalEntryId,
      inventoryAssetReversalJournalEntryId: receipt.inventoryAssetReversalJournalEntryId,
    };
  }

  private decimalString(value: Prisma.Decimal | string | number): string {
    return new Prisma.Decimal(value).toFixed(4);
  }

  private zero(): Prisma.Decimal {
    return new Prisma.Decimal(0);
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
  }
}
