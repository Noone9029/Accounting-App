import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ContactType,
  ItemStatus,
  NumberSequenceScope,
  Prisma,
  PurchaseBillStatus,
  PurchaseMatchingReviewStatus,
  PurchaseOrderStatus,
  PurchaseReceiptStatus,
  PurchaseReturnStatus,
  StockMovementType,
  SupplierRefundStatus,
  WarehouseStatus,
} from "@prisma/client";
import { AUDIT_ENTITY_TYPES } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { hasAdvancedTracking } from "../inventory/inventory-tracking-validation";
import { CreatePurchaseReturnDto } from "./dto/create-purchase-return.dto";
import { PurchaseReturnLineDto } from "./dto/purchase-return-line.dto";
import { UpdatePurchaseReturnDto } from "./dto/update-purchase-return.dto";

const purchaseReturnInclude = {
  supplier: { select: { id: true, name: true, displayName: true, type: true, taxNumber: true } },
  sourcePurchaseBill: { select: { id: true, billNumber: true, status: true, billDate: true, total: true, supplierId: true } },
  sourcePurchaseOrder: {
    select: { id: true, purchaseOrderNumber: true, status: true, orderDate: true, total: true, supplierId: true },
  },
  sourcePurchaseReceipt: {
    select: {
      id: true,
      receiptNumber: true,
      status: true,
      receiptDate: true,
      supplierId: true,
      purchaseOrderId: true,
      purchaseBillId: true,
      warehouseId: true,
      warehouse: { select: { id: true, code: true, name: true, status: true, isDefault: true } },
    },
  },
  sourceMatchingReview: {
    select: { id: true, sourceType: true, sourceId: true, exceptionType: true, severity: true, status: true, reasonCode: true },
  },
  relatedPurchaseDebitNote: { select: { id: true, debitNoteNumber: true, status: true, total: true, unappliedAmount: true } },
  relatedSupplierRefund: { select: { id: true, refundNumber: true, status: true, amountRefunded: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
  inventoryReturnPostedBy: { select: { id: true, name: true, email: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      item: {
        select: {
          id: true,
          name: true,
          sku: true,
          status: true,
          inventoryTracking: true,
          trackingMode: true,
          expiryTrackingEnabled: true,
          binTrackingEnabled: true,
        },
      },
      sourcePurchaseBillLine: { select: { id: true, billId: true, description: true, quantity: true, unitPrice: true } },
      sourcePurchaseReceiptLine: {
        select: {
          id: true,
          receiptId: true,
          quantity: true,
          unitCost: true,
          stockMovementId: true,
          stockMovement: {
            select: {
              id: true,
              type: true,
              movementDate: true,
              quantity: true,
              unitCost: true,
              totalCost: true,
              warehouseId: true,
              warehouse: { select: { id: true, code: true, name: true, status: true, isDefault: true } },
            },
          },
          receipt: {
            select: {
              id: true,
              receiptNumber: true,
              status: true,
              warehouseId: true,
              warehouse: { select: { id: true, code: true, name: true, status: true, isDefault: true } },
            },
          },
        },
      },
      sourcePurchaseOrderLine: { select: { id: true, purchaseOrderId: true, description: true, quantity: true, unitPrice: true } },
      stockMovement: { select: { id: true, type: true, movementDate: true, quantity: true, referenceType: true, referenceId: true } },
    },
  },
} satisfies Prisma.PurchaseReturnInclude;

type PrismaExecutor = PrismaService | Prisma.TransactionClient;
type PurchaseReturnWithLines = Prisma.PurchaseReturnGetPayload<{ include: typeof purchaseReturnInclude }>;
type PurchaseReturnInventoryLineStatus = "POSTABLE" | "POSTED" | "BLOCKED" | "SKIPPED_NON_TRACKED";

const PURCHASE_RETURN_INVENTORY_ALLOWED_STATUSES: readonly PurchaseReturnStatus[] = [
  PurchaseReturnStatus.APPROVED,
  PurchaseReturnStatus.COMPLETED,
] as const;

export const PURCHASE_RETURN_INVENTORY_MOVEMENT_HELPER_TEXT =
  "This action records an operational stock movement only. It does not create accounting journals, AP adjustments, supplier credits/refunds, VAT entries, or valuation postings.";

interface PurchaseReturnInventoryPreviewLine {
  lineId: string;
  description: string;
  item: { id: string; name: string; sku: string | null; inventoryTracking: boolean } | null;
  warehouse: { id: string; code: string; name: string } | null;
  returnQuantity: string;
  currentOnHand: string | null;
  projectedOnHandAfterReturn: string | null;
  movementType: "PURCHASE_RETURN_OUT";
  movementRequired: boolean;
  status: PurchaseReturnInventoryLineStatus;
  stockMovementId: string | null;
  sourcePurchaseReceiptLineId: string | null;
  sourcePurchaseReceiptNumber: string | null;
  blockingReasons: string[];
  warnings: string[];
}

export interface PurchaseReturnInventoryPreview {
  readOnly: true;
  previewOnly: true;
  noPostingEffect: true;
  noAccountingEffect: true;
  noApEffect: true;
  noVatEffect: true;
  noValuationPosting: true;
  sourceType: "PurchaseReturn";
  sourcePurchaseReturn: { id: string; purchaseReturnNumber: string; status: PurchaseReturnStatus };
  inventoryMovementStatus: "NOT_POSTED" | "POSTED" | "BLOCKED";
  canPost: boolean;
  alreadyPosted: boolean;
  reversalSupported: false;
  postedAt: string | null;
  movementIds: string[];
  blockingReasons: string[];
  warnings: string[];
  safeHelperText: string;
  lines: PurchaseReturnInventoryPreviewLine[];
}

interface PreparedSourceHeader {
  sourcePurchaseBillId: string | null;
  sourcePurchaseOrderId: string | null;
  sourcePurchaseReceiptId: string | null;
  sourceMatchingReviewId: string | null;
  relatedPurchaseDebitNoteId: string | null;
  relatedSupplierRefundId: string | null;
}

interface PreparedLine {
  itemId: string | null;
  description: string;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal | null;
  sourcePurchaseBillLineId: string | null;
  sourcePurchaseReceiptLineId: string | null;
  sourcePurchaseOrderLineId: string | null;
  reason: string | null;
  sortOrder: number;
}

interface SourceLineDetails {
  sourceKind: "bill" | "receipt" | "order";
  sourceLineId: string;
  sourceHeaderId: string;
  supplierId: string;
  itemId: string | null;
  description: string | null;
  sourceQuantity: Prisma.Decimal;
  unitCost: Prisma.Decimal | null;
}

@Injectable()
export class PurchaseReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
  ) {}

  async list(organizationId: string, rawFilters: Record<string, string | string[] | undefined> = {}) {
    const filters = this.normalizeListFilters(rawFilters);
    const where: Prisma.PurchaseReturnWhereInput = {
      organizationId,
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.sourceMatchingReviewId ? { sourceMatchingReviewId: filters.sourceMatchingReviewId } : {}),
      ...(filters.search
        ? {
            OR: [
              { purchaseReturnNumber: { contains: filters.search, mode: "insensitive" } },
              { reference: { contains: filters.search, mode: "insensitive" } },
              { reason: { contains: filters.search, mode: "insensitive" } },
              { supplier: { OR: [{ name: { contains: filters.search, mode: "insensitive" } }, { displayName: { contains: filters.search, mode: "insensitive" } }] } },
            ],
          }
        : {}),
    };

    const purchaseReturns = await this.prisma.purchaseReturn.findMany({
      where,
      orderBy: [{ returnDate: "desc" }, { createdAt: "desc" }],
      take: filters.limit,
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
        sourcePurchaseBill: { select: { id: true, billNumber: true, status: true } },
        sourcePurchaseOrder: { select: { id: true, purchaseOrderNumber: true, status: true } },
        sourcePurchaseReceipt: { select: { id: true, receiptNumber: true, status: true } },
        sourceMatchingReview: { select: { id: true, status: true, reasonCode: true } },
        relatedPurchaseDebitNote: { select: { id: true, debitNoteNumber: true, status: true } },
        relatedSupplierRefund: { select: { id: true, refundNumber: true, status: true } },
        lines: { select: { id: true, stockMovementId: true } },
      },
    });

    return {
      noPostingEffect: true,
      noInventoryEffect: true,
      filters,
      data: purchaseReturns.map((purchaseReturn) => ({
        ...purchaseReturn,
        lineCount: purchaseReturn.lines.length,
        inventoryReturnMovementStatus: this.inventoryMovementStatus(purchaseReturn),
        inventoryReturnMovementIds: this.purchaseReturnMovementIds(purchaseReturn),
        inventoryReturnReversalSupported: false,
      })),
    };
  }

  nextNumber(organizationId: string) {
    return this.numberSequenceService.preview(organizationId, NumberSequenceScope.PURCHASE_RETURN);
  }

  async get(organizationId: string, id: string) {
    const purchaseReturn = await this.prisma.purchaseReturn.findFirst({
      where: { id, organizationId },
      include: purchaseReturnInclude,
    });
    if (!purchaseReturn) {
      throw new NotFoundException("Purchase return not found.");
    }
    return {
      ...purchaseReturn,
      noPostingEffect: true,
      noInventoryEffect: true,
      noAutomaticInventoryEffect: true,
      inventoryReturnMovementStatus: this.inventoryMovementStatus(purchaseReturn),
      inventoryReturnMovementIds: this.purchaseReturnMovementIds(purchaseReturn),
      inventoryReturnReversalSupported: false,
    };
  }

  async create(organizationId: string, actorUserId: string, dto: CreatePurchaseReturnDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const prepared = await this.preparePurchaseReturn(organizationId, dto.supplierId, dto, undefined, tx);
      const purchaseReturnNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.PURCHASE_RETURN, tx);

      return tx.purchaseReturn.create({
        data: {
          organizationId,
          purchaseReturnNumber,
          supplierId: dto.supplierId,
          status: PurchaseReturnStatus.DRAFT,
          returnDate: this.parseRequiredDate(dto.returnDate, "Return date"),
          reason: this.cleanOptional(dto.reason),
          reference: this.cleanOptional(dto.reference),
          sourcePurchaseBillId: prepared.header.sourcePurchaseBillId,
          sourcePurchaseOrderId: prepared.header.sourcePurchaseOrderId,
          sourcePurchaseReceiptId: prepared.header.sourcePurchaseReceiptId,
          sourceMatchingReviewId: prepared.header.sourceMatchingReviewId,
          relatedPurchaseDebitNoteId: prepared.header.relatedPurchaseDebitNoteId,
          relatedSupplierRefundId: prepared.header.relatedSupplierRefundId,
          notes: this.cleanOptional(dto.notes),
          createdByUserId: actorUserId,
          lines: { create: this.toLineCreateMany(organizationId, prepared.lines) },
        },
        include: purchaseReturnInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: AUDIT_ENTITY_TYPES.PURCHASE_RETURN,
      entityId: created.id,
      after: this.auditSnapshot(created),
    });
    return created;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdatePurchaseReturnDto) {
    const before = await this.get(organizationId, id);
    this.assertEditable(before.status);

    const nextSupplierId = dto.supplierId ?? before.supplierId;
    const headerInput = {
      sourcePurchaseBillId: this.has(dto, "sourcePurchaseBillId") ? dto.sourcePurchaseBillId : before.sourcePurchaseBillId,
      sourcePurchaseOrderId: this.has(dto, "sourcePurchaseOrderId") ? dto.sourcePurchaseOrderId : before.sourcePurchaseOrderId,
      sourcePurchaseReceiptId: this.has(dto, "sourcePurchaseReceiptId") ? dto.sourcePurchaseReceiptId : before.sourcePurchaseReceiptId,
      sourceMatchingReviewId: this.has(dto, "sourceMatchingReviewId") ? dto.sourceMatchingReviewId : before.sourceMatchingReviewId,
      relatedPurchaseDebitNoteId: this.has(dto, "relatedPurchaseDebitNoteId") ? dto.relatedPurchaseDebitNoteId : before.relatedPurchaseDebitNoteId,
      relatedSupplierRefundId: this.has(dto, "relatedSupplierRefundId") ? dto.relatedSupplierRefundId : before.relatedSupplierRefundId,
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const prepared = await this.preparePurchaseReturn(
        organizationId,
        nextSupplierId,
        { ...headerInput, lines: dto.lines ?? before.lines.map((line) => this.existingLineToDto(line)) },
        id,
        tx,
      );

      if (dto.lines) {
        await tx.purchaseReturnLine.deleteMany({ where: { organizationId, purchaseReturnId: id } });
      }

      return tx.purchaseReturn.update({
        where: { id },
        data: {
          supplierId: dto.supplierId,
          returnDate: dto.returnDate ? this.parseRequiredDate(dto.returnDate, "Return date") : undefined,
          reason: this.has(dto, "reason") ? this.cleanOptional(dto.reason) : undefined,
          reference: this.has(dto, "reference") ? this.cleanOptional(dto.reference) : undefined,
          sourcePurchaseBillId: this.has(dto, "sourcePurchaseBillId") ? prepared.header.sourcePurchaseBillId : undefined,
          sourcePurchaseOrderId: this.has(dto, "sourcePurchaseOrderId") ? prepared.header.sourcePurchaseOrderId : undefined,
          sourcePurchaseReceiptId: this.has(dto, "sourcePurchaseReceiptId") ? prepared.header.sourcePurchaseReceiptId : undefined,
          sourceMatchingReviewId: this.has(dto, "sourceMatchingReviewId") ? prepared.header.sourceMatchingReviewId : undefined,
          relatedPurchaseDebitNoteId: this.has(dto, "relatedPurchaseDebitNoteId") ? prepared.header.relatedPurchaseDebitNoteId : undefined,
          relatedSupplierRefundId: this.has(dto, "relatedSupplierRefundId") ? prepared.header.relatedSupplierRefundId : undefined,
          notes: this.has(dto, "notes") ? this.cleanOptional(dto.notes) : undefined,
          lines: dto.lines ? { create: this.toLineCreateMany(organizationId, prepared.lines) } : undefined,
        },
        include: purchaseReturnInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: AUDIT_ENTITY_TYPES.PURCHASE_RETURN,
      entityId: id,
      before: this.auditSnapshot(before),
      after: this.auditSnapshot(updated),
    });
    return updated;
  }

  submit(organizationId: string, actorUserId: string, id: string) {
    return this.transition(organizationId, actorUserId, id, PurchaseReturnStatus.DRAFT, PurchaseReturnStatus.SUBMITTED, "SUBMIT");
  }

  approve(organizationId: string, actorUserId: string, id: string) {
    return this.transition(organizationId, actorUserId, id, PurchaseReturnStatus.SUBMITTED, PurchaseReturnStatus.APPROVED, "APPROVE", {
      approvedBy: { connect: { id: actorUserId } },
      approvedAt: new Date(),
    });
  }

  complete(organizationId: string, actorUserId: string, id: string) {
    return this.transition(organizationId, actorUserId, id, PurchaseReturnStatus.APPROVED, PurchaseReturnStatus.COMPLETED, "COMPLETE", {
      completedAt: new Date(),
    });
  }

  cancel(organizationId: string, actorUserId: string, id: string) {
    return this.transition(organizationId, actorUserId, id, [PurchaseReturnStatus.DRAFT, PurchaseReturnStatus.SUBMITTED], PurchaseReturnStatus.CANCELLED, "CANCEL");
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.inventoryReturnPostedAt || this.purchaseReturnMovementIds(existing).length > 0) {
      throw new BadRequestException("Purchase return inventory movement has been posted; reversal is not supported yet.");
    }
    return this.transition(organizationId, actorUserId, id, PurchaseReturnStatus.APPROVED, PurchaseReturnStatus.VOIDED, "VOID", {
      voidedAt: new Date(),
    });
  }

  async inventoryReturnPreview(organizationId: string, id: string): Promise<PurchaseReturnInventoryPreview> {
    const purchaseReturn = await this.loadPurchaseReturnForInventory(organizationId, id, this.prisma);
    return this.buildInventoryReturnPreview(organizationId, purchaseReturn, this.prisma);
  }

  async postInventoryReturnMovement(organizationId: string, actorUserId: string, id: string) {
    const before = await this.get(organizationId, id);

    const result = await this.prisma.$transaction(async (tx) => {
      const purchaseReturn = await this.loadPurchaseReturnForInventory(organizationId, id, tx);
      const preview = await this.buildInventoryReturnPreview(organizationId, purchaseReturn, tx);
      if (!preview.canPost) {
        throw new BadRequestException(preview.blockingReasons.length > 0 ? preview.blockingReasons.join(" ") : "Purchase return inventory movement cannot be posted.");
      }

      const postedAt = new Date();
      const claim = await tx.purchaseReturn.updateMany({
        where: {
          id,
          organizationId,
          status: { in: [...PURCHASE_RETURN_INVENTORY_ALLOWED_STATUSES] },
          inventoryReturnPostedAt: null,
        },
        data: {
          inventoryReturnPostedAt: postedAt,
          inventoryReturnPostedByUserId: actorUserId,
        },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("Purchase return inventory movement has already been posted or the return is no longer in a postable status.");
      }

      const postedLines = preview.lines.filter((line) => line.status === "POSTABLE");
      const movements: Array<{ id: string; itemId: string; warehouseId: string; quantity: string }> = [];
      for (const line of postedLines) {
        if (!line.item || !line.warehouse) continue;
        const returnLine = purchaseReturn.lines.find((candidate) => candidate.id === line.lineId);
        if (!returnLine) continue;
        const quantity = new Prisma.Decimal(line.returnQuantity);
        const unitCost = this.inventoryReturnUnitCost(returnLine);
        const movement = await tx.stockMovement.create({
          data: {
            organizationId,
            itemId: line.item.id,
            warehouseId: line.warehouse.id,
            movementDate: purchaseReturn.returnDate,
            type: StockMovementType.PURCHASE_RETURN_OUT,
            quantity: quantity.toFixed(4),
            unitCost: unitCost?.toFixed(4) ?? null,
            totalCost: unitCost ? quantity.mul(unitCost).toFixed(4) : null,
            referenceType: "PurchaseReturn",
            referenceId: purchaseReturn.id,
            description: `Purchase return ${purchaseReturn.purchaseReturnNumber} operational stock-out`,
            createdById: actorUserId,
          },
          select: { id: true, itemId: true, warehouseId: true, quantity: true },
        });
        await tx.purchaseReturnLine.update({
          where: { id: line.lineId },
          data: { stockMovementId: movement.id },
        });
        movements.push({
          id: movement.id,
          itemId: movement.itemId,
          warehouseId: movement.warehouseId,
          quantity: this.decimalString(movement.quantity),
        });
      }

      return { movementIds: movements.map((movement) => movement.id), movements };
    });

    const updated = await this.get(organizationId, id);
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "POST_INVENTORY_RETURN_MOVEMENT",
      entityType: AUDIT_ENTITY_TYPES.PURCHASE_RETURN,
      entityId: id,
      before: this.auditSnapshot(before),
      after: {
        ...this.auditSnapshot(updated),
        inventoryMovementPosted: true,
        movementIds: result.movementIds,
        itemIds: this.uniqueStrings(result.movements.map((movement) => movement.itemId)),
        warehouseIds: this.uniqueStrings(result.movements.map((movement) => movement.warehouseId)),
        quantities: result.movements.map((movement) => ({ movementId: movement.id, quantity: movement.quantity })),
        noAccountingEffect: true,
        noApEffect: true,
        noArEffect: true,
        noVatEffect: true,
        noValuationPosting: true,
      },
    });
    return updated;
  }

  private async transition(
    organizationId: string,
    actorUserId: string,
    id: string,
    allowedFrom: PurchaseReturnStatus | PurchaseReturnStatus[],
    toStatus: PurchaseReturnStatus,
    action: string,
    extraData: Prisma.PurchaseReturnUpdateInput = {},
  ) {
    const before = await this.get(organizationId, id);
    const allowed = Array.isArray(allowedFrom) ? allowedFrom : [allowedFrom];
    if (!allowed.includes(before.status)) {
      throw new BadRequestException(
        `Only ${allowed.map((status) => status.toLowerCase()).join(" or ")} purchase returns can be ${this.pastTense(action)}.`,
      );
    }

    const updated = await this.prisma.purchaseReturn.update({
      where: { id },
      data: { status: toStatus, ...extraData },
      include: purchaseReturnInclude,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action,
      entityType: AUDIT_ENTITY_TYPES.PURCHASE_RETURN,
      entityId: id,
      before: this.auditSnapshot(before),
      after: this.auditSnapshot(updated),
    });
    return updated;
  }

  private async loadPurchaseReturnForInventory(organizationId: string, id: string, executor: PrismaExecutor): Promise<PurchaseReturnWithLines> {
    const purchaseReturn = await executor.purchaseReturn.findFirst({
      where: { id, organizationId },
      include: purchaseReturnInclude,
    });
    if (!purchaseReturn) {
      throw new NotFoundException("Purchase return not found.");
    }
    return purchaseReturn;
  }

  private async buildInventoryReturnPreview(
    organizationId: string,
    purchaseReturn: PurchaseReturnWithLines,
    executor: PrismaExecutor,
  ): Promise<PurchaseReturnInventoryPreview> {
    const blockingReasons: string[] = [];
    const warnings = [
      PURCHASE_RETURN_INVENTORY_MOVEMENT_HELPER_TEXT,
      "Reversal is not supported yet; use a separately approved inventory adjustment if a return movement must be corrected.",
    ];
    const movementIds = this.purchaseReturnMovementIds(purchaseReturn);
    const alreadyPosted = Boolean(purchaseReturn.inventoryReturnPostedAt || movementIds.length > 0);
    const statusAllowed = PURCHASE_RETURN_INVENTORY_ALLOWED_STATUSES.includes(purchaseReturn.status);

    if (!statusAllowed) {
      blockingReasons.push("Inventory return movement can be posted only for approved or completed purchase returns.");
    }
    if (alreadyPosted) {
      blockingReasons.push("Purchase return inventory movement has already been posted.");
    }

    const lines: PurchaseReturnInventoryPreviewLine[] = [];
    for (const [index, line] of purchaseReturn.lines.entries()) {
      const lineWarnings: string[] = [];
      const lineBlockers: string[] = [];
      const quantity = this.decimal(line.quantity);
      const sourceReceiptLine = line.sourcePurchaseReceiptLine;
      const sourceMovement = sourceReceiptLine?.stockMovement ?? null;
      const warehouse = sourceMovement?.warehouse ?? sourceReceiptLine?.receipt?.warehouse ?? purchaseReturn.sourcePurchaseReceipt?.warehouse ?? null;
      const postedMovementId = line.stockMovementId ?? line.stockMovement?.id ?? null;
      const item = line.item
        ? {
            id: line.item.id,
            name: line.item.name,
            sku: line.item.sku,
            inventoryTracking: line.item.inventoryTracking,
          }
        : null;

      if (!line.item || !line.item.inventoryTracking) {
        lines.push({
          lineId: line.id,
          description: line.description,
          item,
          warehouse: warehouse ? { id: warehouse.id, code: warehouse.code, name: warehouse.name } : null,
          returnQuantity: this.decimalString(quantity),
          currentOnHand: null,
          projectedOnHandAfterReturn: null,
          movementType: StockMovementType.PURCHASE_RETURN_OUT,
          movementRequired: false,
          status: postedMovementId ? "POSTED" : "SKIPPED_NON_TRACKED",
          stockMovementId: postedMovementId,
          sourcePurchaseReceiptLineId: line.sourcePurchaseReceiptLineId,
          sourcePurchaseReceiptNumber: sourceReceiptLine?.receipt?.receiptNumber ?? purchaseReturn.sourcePurchaseReceipt?.receiptNumber ?? null,
          blockingReasons: [],
          warnings: ["Line is not inventory-tracked, so no operational stock movement is required."],
        });
        continue;
      }

      if (postedMovementId) {
        const currentOnHand = warehouse ? await this.quantityOnHand(organizationId, line.item.id, warehouse.id, executor) : null;
        lines.push({
          lineId: line.id,
          description: line.description,
          item,
          warehouse: warehouse ? { id: warehouse.id, code: warehouse.code, name: warehouse.name } : null,
          returnQuantity: this.decimalString(quantity),
          currentOnHand: currentOnHand ? this.decimalString(currentOnHand) : null,
          projectedOnHandAfterReturn: currentOnHand ? this.decimalString(currentOnHand) : null,
          movementType: StockMovementType.PURCHASE_RETURN_OUT,
          movementRequired: true,
          status: "POSTED",
          stockMovementId: postedMovementId,
          sourcePurchaseReceiptLineId: line.sourcePurchaseReceiptLineId,
          sourcePurchaseReceiptNumber: sourceReceiptLine?.receipt?.receiptNumber ?? purchaseReturn.sourcePurchaseReceipt?.receiptNumber ?? null,
          blockingReasons: [],
          warnings: ["Operational inventory return movement has already been posted for this line."],
        });
        continue;
      }

      if (line.item.status !== ItemStatus.ACTIVE) {
        lineBlockers.push(`Line ${index + 1} item is not active.`);
      }
      if (hasAdvancedTracking(line.item)) {
        lineBlockers.push(
          `Line ${index + 1} item uses serial, batch, expiry, or bin tracking; purchase return stock-out does not capture tracking metadata yet.`,
        );
      }
      if (!sourceReceiptLine) {
        lineBlockers.push(`Line ${index + 1} requires a linked purchase receipt line before inventory return movement can be posted.`);
      } else {
        if (sourceReceiptLine.receipt?.status !== PurchaseReceiptStatus.POSTED) {
          lineBlockers.push(`Line ${index + 1} source purchase receipt must be posted.`);
        }
        if (!sourceMovement) {
          lineBlockers.push(`Line ${index + 1} source purchase receipt line has no posted stock movement.`);
        }
      }
      if (!warehouse) {
        lineBlockers.push(`Line ${index + 1} requires a source warehouse.`);
      } else if (warehouse.status !== WarehouseStatus.ACTIVE) {
        lineBlockers.push(`Line ${index + 1} source warehouse is archived.`);
      }

      const currentOnHand = warehouse ? await this.quantityOnHand(organizationId, line.item.id, warehouse.id, executor) : null;
      const projectedOnHand = currentOnHand ? currentOnHand.minus(quantity) : null;
      if (projectedOnHand && projectedOnHand.lt(0)) {
        lineBlockers.push(`Line ${index + 1} would make warehouse stock negative.`);
      }
      if (line.unitCost === null && sourceReceiptLine?.unitCost === null && sourceMovement?.unitCost === null) {
        lineWarnings.push("No unit cost is available for this operational stock movement; quantity will still be controlled.");
      }

      blockingReasons.push(...lineBlockers);
      lines.push({
        lineId: line.id,
        description: line.description,
        item,
        warehouse: warehouse ? { id: warehouse.id, code: warehouse.code, name: warehouse.name } : null,
        returnQuantity: this.decimalString(quantity),
        currentOnHand: currentOnHand ? this.decimalString(currentOnHand) : null,
        projectedOnHandAfterReturn: projectedOnHand ? this.decimalString(projectedOnHand) : null,
        movementType: StockMovementType.PURCHASE_RETURN_OUT,
        movementRequired: true,
        status: lineBlockers.length > 0 || alreadyPosted || !statusAllowed ? "BLOCKED" : "POSTABLE",
        stockMovementId: null,
        sourcePurchaseReceiptLineId: line.sourcePurchaseReceiptLineId,
        sourcePurchaseReceiptNumber: sourceReceiptLine?.receipt?.receiptNumber ?? purchaseReturn.sourcePurchaseReceipt?.receiptNumber ?? null,
        blockingReasons: lineBlockers,
        warnings: lineWarnings,
      });
    }

    const postableLineCount = lines.filter((line) => line.status === "POSTABLE").length;
    if (postableLineCount === 0 && !alreadyPosted) {
      blockingReasons.push("Purchase return has no inventory-tracked receipt-linked lines to move.");
    }

    const uniqueBlockingReasons = this.uniqueStrings(blockingReasons);
    const inventoryMovementStatus = alreadyPosted ? "POSTED" : uniqueBlockingReasons.length > 0 ? "BLOCKED" : "NOT_POSTED";
    return {
      readOnly: true,
      previewOnly: true,
      noPostingEffect: true,
      noAccountingEffect: true,
      noApEffect: true,
      noVatEffect: true,
      noValuationPosting: true,
      sourceType: "PurchaseReturn",
      sourcePurchaseReturn: {
        id: purchaseReturn.id,
        purchaseReturnNumber: purchaseReturn.purchaseReturnNumber,
        status: purchaseReturn.status,
      },
      inventoryMovementStatus,
      canPost: !alreadyPosted && statusAllowed && postableLineCount > 0 && uniqueBlockingReasons.length === 0,
      alreadyPosted,
      reversalSupported: false,
      postedAt: purchaseReturn.inventoryReturnPostedAt ? purchaseReturn.inventoryReturnPostedAt.toISOString() : null,
      movementIds,
      blockingReasons: uniqueBlockingReasons,
      warnings,
      safeHelperText: PURCHASE_RETURN_INVENTORY_MOVEMENT_HELPER_TEXT,
      lines,
    };
  }

  private async preparePurchaseReturn(
    organizationId: string,
    supplierId: string,
    input: Partial<CreatePurchaseReturnDto> & { lines: PurchaseReturnLineDto[] },
    excludePurchaseReturnId: string | undefined,
    executor: PrismaExecutor,
  ): Promise<{ header: PreparedSourceHeader; lines: PreparedLine[] }> {
    await this.assertSupplier(organizationId, supplierId, executor);
    const header = await this.prepareHeaderReferences(organizationId, supplierId, input, executor);
    const lines = await this.prepareLines(organizationId, supplierId, header, input.lines, excludePurchaseReturnId, executor);
    return { header, lines };
  }

  private async prepareHeaderReferences(
    organizationId: string,
    supplierId: string,
    input: Partial<CreatePurchaseReturnDto>,
    executor: PrismaExecutor,
  ): Promise<PreparedSourceHeader> {
    const sourcePurchaseBillId = this.cleanOptional(input.sourcePurchaseBillId);
    const sourcePurchaseOrderId = this.cleanOptional(input.sourcePurchaseOrderId);
    const sourcePurchaseReceiptId = this.cleanOptional(input.sourcePurchaseReceiptId);
    const sourceMatchingReviewId = this.cleanOptional(input.sourceMatchingReviewId);
    const relatedPurchaseDebitNoteId = this.cleanOptional(input.relatedPurchaseDebitNoteId);
    const relatedSupplierRefundId = this.cleanOptional(input.relatedSupplierRefundId);
    const directSourceCount = [sourcePurchaseBillId, sourcePurchaseOrderId, sourcePurchaseReceiptId].filter(Boolean).length;
    if (directSourceCount > 1) {
      throw new BadRequestException("Purchase return can reference only one source purchase bill, order, or receipt.");
    }

    if (sourcePurchaseBillId) await this.assertSourceBill(organizationId, supplierId, sourcePurchaseBillId, executor);
    if (sourcePurchaseOrderId) await this.assertSourceOrder(organizationId, supplierId, sourcePurchaseOrderId, executor);
    if (sourcePurchaseReceiptId) await this.assertSourceReceipt(organizationId, supplierId, sourcePurchaseReceiptId, executor);
    if (sourceMatchingReviewId) await this.assertReturnReview(organizationId, supplierId, sourceMatchingReviewId, executor);
    if (relatedPurchaseDebitNoteId) await this.assertRelatedDebitNote(organizationId, supplierId, relatedPurchaseDebitNoteId, executor);
    if (relatedSupplierRefundId) await this.assertRelatedSupplierRefund(organizationId, supplierId, relatedSupplierRefundId, executor);

    return {
      sourcePurchaseBillId,
      sourcePurchaseOrderId,
      sourcePurchaseReceiptId,
      sourceMatchingReviewId,
      relatedPurchaseDebitNoteId,
      relatedSupplierRefundId,
    };
  }

  private async prepareLines(
    organizationId: string,
    supplierId: string,
    header: PreparedSourceHeader,
    lineDtos: PurchaseReturnLineDto[],
    excludePurchaseReturnId: string | undefined,
    executor: PrismaExecutor,
  ): Promise<PreparedLine[]> {
    if (!lineDtos.length) {
      throw new BadRequestException("Purchase return requires at least one line.");
    }

    const prepared: PreparedLine[] = [];
    const requestedBySourceLine = new Map<string, Prisma.Decimal>();
    const sourceLimits = new Map<string, { quantity: Prisma.Decimal; label: string }>();

    for (const [index, dto] of lineDtos.entries()) {
      const quantity = this.positiveDecimal(dto.quantity, `Purchase return line ${index + 1} quantity`);
      const unitCost = this.optionalNonNegativeDecimal(dto.unitCost, `Purchase return line ${index + 1} unit cost`);
      const sourceRefs = [
        this.cleanOptional(dto.sourcePurchaseBillLineId),
        this.cleanOptional(dto.sourcePurchaseReceiptLineId),
        this.cleanOptional(dto.sourcePurchaseOrderLineId),
      ].filter(Boolean);
      if (sourceRefs.length > 1) {
        throw new BadRequestException(`Purchase return line ${index + 1} can reference only one source line.`);
      }

      const sourceLine = await this.resolveSourceLine(organizationId, supplierId, header, dto, executor);
      const itemId = this.cleanOptional(dto.itemId) ?? sourceLine?.itemId ?? null;
      if (dto.itemId && sourceLine?.itemId && dto.itemId !== sourceLine.itemId) {
        throw new BadRequestException(`Purchase return line ${index + 1} item must match the linked source line.`);
      }
      if (itemId) {
        await this.assertItem(organizationId, itemId, executor);
      }

      if (sourceLine) {
        const existing = requestedBySourceLine.get(sourceLine.sourceLineId) ?? new Prisma.Decimal(0);
        requestedBySourceLine.set(sourceLine.sourceLineId, existing.plus(quantity));
        sourceLimits.set(sourceLine.sourceLineId, {
          quantity: sourceLine.sourceQuantity,
          label: `source line ${index + 1}`,
        });
      }

      prepared.push({
        itemId,
        description: this.cleanOptional(dto.description) ?? sourceLine?.description ?? `Return line ${index + 1}`,
        quantity,
        unitCost: unitCost ?? sourceLine?.unitCost ?? null,
        sourcePurchaseBillLineId: sourceLine?.sourceKind === "bill" ? sourceLine.sourceLineId : null,
        sourcePurchaseReceiptLineId: sourceLine?.sourceKind === "receipt" ? sourceLine.sourceLineId : null,
        sourcePurchaseOrderLineId: sourceLine?.sourceKind === "order" ? sourceLine.sourceLineId : null,
        reason: this.cleanOptional(dto.reason),
        sortOrder: dto.sortOrder ?? index,
      });
    }

    await this.assertReturnQuantitiesWithinSource(organizationId, requestedBySourceLine, sourceLimits, excludePurchaseReturnId, executor);
    return prepared;
  }

  private async resolveSourceLine(
    organizationId: string,
    supplierId: string,
    header: PreparedSourceHeader,
    dto: PurchaseReturnLineDto,
    executor: PrismaExecutor,
  ): Promise<SourceLineDetails | null> {
    const billLineId = this.cleanOptional(dto.sourcePurchaseBillLineId);
    const receiptLineId = this.cleanOptional(dto.sourcePurchaseReceiptLineId);
    const orderLineId = this.cleanOptional(dto.sourcePurchaseOrderLineId);
    if (!billLineId && !receiptLineId && !orderLineId) return null;

    if (billLineId) {
      const line = await executor.purchaseBillLine.findFirst({
        where: { id: billLineId, organizationId },
        include: {
          item: { select: { id: true, name: true } },
          bill: { select: { id: true, supplierId: true, status: true } },
        },
      });
      if (!line) throw new BadRequestException("Purchase return bill source line must belong to this organization.");
      if (line.bill.supplierId !== supplierId) throw new BadRequestException("Purchase return bill source line must belong to the selected supplier.");
      if (line.bill.status === PurchaseBillStatus.VOIDED) throw new BadRequestException("Purchase return cannot reference a voided purchase bill.");
      if (header.sourcePurchaseBillId && line.billId !== header.sourcePurchaseBillId) {
        throw new BadRequestException("Purchase return bill line must belong to the selected source bill.");
      }
      return {
        sourceKind: "bill",
        sourceLineId: line.id,
        sourceHeaderId: line.billId,
        supplierId: line.bill.supplierId,
        itemId: line.itemId,
        description: line.description,
        sourceQuantity: new Prisma.Decimal(line.quantity),
        unitCost: new Prisma.Decimal(line.unitPrice),
      };
    }

    if (receiptLineId) {
      const line = await executor.purchaseReceiptLine.findFirst({
        where: { id: receiptLineId, organizationId },
        include: {
          item: { select: { id: true, name: true } },
          receipt: { select: { id: true, supplierId: true, status: true } },
        },
      });
      if (!line) throw new BadRequestException("Purchase return receipt source line must belong to this organization.");
      if (line.receipt.supplierId !== supplierId) throw new BadRequestException("Purchase return receipt source line must belong to the selected supplier.");
      if (line.receipt.status === PurchaseReceiptStatus.VOIDED) throw new BadRequestException("Purchase return cannot reference a voided purchase receipt.");
      if (header.sourcePurchaseReceiptId && line.receiptId !== header.sourcePurchaseReceiptId) {
        throw new BadRequestException("Purchase return receipt line must belong to the selected source receipt.");
      }
      return {
        sourceKind: "receipt",
        sourceLineId: line.id,
        sourceHeaderId: line.receiptId,
        supplierId: line.receipt.supplierId,
        itemId: line.itemId,
        description: line.item?.name ?? null,
        sourceQuantity: new Prisma.Decimal(line.quantity),
        unitCost: line.unitCost === null ? null : new Prisma.Decimal(line.unitCost),
      };
    }

    if (!orderLineId) return null;

    const line = await executor.purchaseOrderLine.findFirst({
      where: { id: orderLineId, organizationId },
      include: {
        item: { select: { id: true, name: true } },
      },
    });
    if (!line) throw new BadRequestException("Purchase return order source line must belong to this organization.");
    const order = await executor.purchaseOrder.findFirst({
      where: { id: line.purchaseOrderId, organizationId },
      select: { id: true, supplierId: true, status: true },
    });
    if (!order) throw new BadRequestException("Purchase return order source line must belong to a purchase order in this organization.");
    if (order.supplierId !== supplierId) throw new BadRequestException("Purchase return order source line must belong to the selected supplier.");
    if (order.status === PurchaseOrderStatus.VOIDED) throw new BadRequestException("Purchase return cannot reference a voided purchase order.");
    if (header.sourcePurchaseOrderId && line.purchaseOrderId !== header.sourcePurchaseOrderId) {
      throw new BadRequestException("Purchase return order line must belong to the selected source purchase order.");
    }
    return {
      sourceKind: "order",
      sourceLineId: line.id,
      sourceHeaderId: line.purchaseOrderId,
      supplierId: order.supplierId,
      itemId: line.itemId,
      description: line.description,
      sourceQuantity: new Prisma.Decimal(line.quantity),
      unitCost: new Prisma.Decimal(line.unitPrice),
    };
  }

  private async assertReturnQuantitiesWithinSource(
    organizationId: string,
    requestedBySourceLine: Map<string, Prisma.Decimal>,
    sourceLimits: Map<string, { quantity: Prisma.Decimal; label: string }>,
    excludePurchaseReturnId: string | undefined,
    executor: PrismaExecutor,
  ) {
    if (requestedBySourceLine.size === 0) return;
    const sourceLineIds = [...requestedBySourceLine.keys()];
    const existingLines = await executor.purchaseReturnLine.findMany({
      where: {
        organizationId,
        purchaseReturn: {
          status: { notIn: [PurchaseReturnStatus.CANCELLED, PurchaseReturnStatus.VOIDED] },
          ...(excludePurchaseReturnId ? { id: { not: excludePurchaseReturnId } } : {}),
        },
        OR: [
          { sourcePurchaseBillLineId: { in: sourceLineIds } },
          { sourcePurchaseReceiptLineId: { in: sourceLineIds } },
          { sourcePurchaseOrderLineId: { in: sourceLineIds } },
        ],
      },
      select: { quantity: true, sourcePurchaseBillLineId: true, sourcePurchaseReceiptLineId: true, sourcePurchaseOrderLineId: true },
    });

    const existingBySourceLine = new Map<string, Prisma.Decimal>();
    for (const line of existingLines) {
      const sourceLineId = line.sourcePurchaseBillLineId ?? line.sourcePurchaseReceiptLineId ?? line.sourcePurchaseOrderLineId;
      if (!sourceLineId) continue;
      existingBySourceLine.set(sourceLineId, (existingBySourceLine.get(sourceLineId) ?? new Prisma.Decimal(0)).plus(line.quantity));
    }

    for (const [sourceLineId, requestedQuantity] of requestedBySourceLine) {
      const limit = sourceLimits.get(sourceLineId);
      if (!limit) continue;
      const existingQuantity = existingBySourceLine.get(sourceLineId) ?? new Prisma.Decimal(0);
      if (existingQuantity.plus(requestedQuantity).gt(limit.quantity)) {
        throw new BadRequestException(`Returned quantity cannot exceed available quantity on ${limit.label}.`);
      }
    }
  }

  private async assertSupplier(organizationId: string, supplierId: string, executor: PrismaExecutor) {
    const supplier = await executor.contact.findFirst({
      where: { id: supplierId, organizationId, isActive: true, type: { in: [ContactType.SUPPLIER, ContactType.BOTH] } },
      select: { id: true },
    });
    if (!supplier) {
      throw new BadRequestException("Supplier must be an active supplier contact in this organization.");
    }
  }

  private async assertItem(organizationId: string, itemId: string, executor: PrismaExecutor) {
    const item = await executor.item.findFirst({ where: { id: itemId, organizationId }, select: { id: true } });
    if (!item) {
      throw new BadRequestException("Purchase return line item must belong to this organization.");
    }
  }

  private async assertSourceBill(organizationId: string, supplierId: string, id: string, executor: PrismaExecutor) {
    const bill = await executor.purchaseBill.findFirst({ where: { id, organizationId }, select: { id: true, supplierId: true, status: true } });
    if (!bill) throw new BadRequestException("Source purchase bill must belong to this organization.");
    if (bill.supplierId !== supplierId) throw new BadRequestException("Source purchase bill must belong to the selected supplier.");
    if (bill.status === PurchaseBillStatus.VOIDED) throw new BadRequestException("Purchase return cannot reference a voided purchase bill.");
  }

  private async assertSourceOrder(organizationId: string, supplierId: string, id: string, executor: PrismaExecutor) {
    const order = await executor.purchaseOrder.findFirst({ where: { id, organizationId }, select: { id: true, supplierId: true, status: true } });
    if (!order) throw new BadRequestException("Source purchase order must belong to this organization.");
    if (order.supplierId !== supplierId) throw new BadRequestException("Source purchase order must belong to the selected supplier.");
    if (order.status === PurchaseOrderStatus.VOIDED) throw new BadRequestException("Purchase return cannot reference a voided purchase order.");
  }

  private async assertSourceReceipt(organizationId: string, supplierId: string, id: string, executor: PrismaExecutor) {
    const receipt = await executor.purchaseReceipt.findFirst({ where: { id, organizationId }, select: { id: true, supplierId: true, status: true } });
    if (!receipt) throw new BadRequestException("Source purchase receipt must belong to this organization.");
    if (receipt.supplierId !== supplierId) throw new BadRequestException("Source purchase receipt must belong to the selected supplier.");
    if (receipt.status === PurchaseReceiptStatus.VOIDED) throw new BadRequestException("Purchase return cannot reference a voided purchase receipt.");
  }

  private async assertReturnReview(organizationId: string, supplierId: string, id: string, executor: PrismaExecutor) {
    const review = await executor.purchaseMatchingReview.findFirst({
      where: { id, organizationId },
      select: { id: true, supplierId: true, status: true },
    });
    if (!review) throw new BadRequestException("Source matching review must belong to this organization.");
    if (review.supplierId && review.supplierId !== supplierId) {
      throw new BadRequestException("Source matching review must belong to the selected supplier.");
    }
    if (review.status !== PurchaseMatchingReviewStatus.NEEDS_RETURN_REVIEW) {
      throw new BadRequestException("Purchase returns can only link matching reviews marked as needing return review.");
    }
  }

  private async assertRelatedDebitNote(organizationId: string, supplierId: string, id: string, executor: PrismaExecutor) {
    const debitNote = await executor.purchaseDebitNote.findFirst({
      where: { id, organizationId },
      select: { id: true, supplierId: true },
    });
    if (!debitNote) throw new BadRequestException("Related purchase debit note must belong to this organization.");
    if (debitNote.supplierId !== supplierId) throw new BadRequestException("Related purchase debit note must belong to the selected supplier.");
  }

  private async assertRelatedSupplierRefund(organizationId: string, supplierId: string, id: string, executor: PrismaExecutor) {
    const refund = await executor.supplierRefund.findFirst({
      where: { id, organizationId },
      select: { id: true, supplierId: true, status: true },
    });
    if (!refund) throw new BadRequestException("Related supplier refund must belong to this organization.");
    if (refund.supplierId !== supplierId) throw new BadRequestException("Related supplier refund must belong to the selected supplier.");
    if (refund.status === SupplierRefundStatus.VOIDED) throw new BadRequestException("Purchase return cannot reference a voided supplier refund.");
  }

  private assertEditable(status: PurchaseReturnStatus) {
    if (status !== PurchaseReturnStatus.DRAFT) {
      throw new BadRequestException("Only draft purchase returns can be edited.");
    }
  }

  private toLineCreateMany(organizationId: string, lines: PreparedLine[]): Prisma.PurchaseReturnLineCreateWithoutPurchaseReturnInput[] {
    return lines.map((line) => ({
      organization: { connect: { id: organizationId } },
      item: line.itemId ? { connect: { id: line.itemId } } : undefined,
      description: line.description,
      quantity: line.quantity.toFixed(4),
      unitCost: line.unitCost?.toFixed(4) ?? null,
      sourcePurchaseBillLine: line.sourcePurchaseBillLineId ? { connect: { id: line.sourcePurchaseBillLineId } } : undefined,
      sourcePurchaseReceiptLine: line.sourcePurchaseReceiptLineId ? { connect: { id: line.sourcePurchaseReceiptLineId } } : undefined,
      sourcePurchaseOrderLine: line.sourcePurchaseOrderLineId ? { connect: { id: line.sourcePurchaseOrderLineId } } : undefined,
      reason: line.reason,
      sortOrder: line.sortOrder,
    }));
  }

  private existingLineToDto(line: {
    itemId: string | null;
    description: string;
    quantity: unknown;
    unitCost: unknown | null;
    sourcePurchaseBillLineId: string | null;
    sourcePurchaseReceiptLineId: string | null;
    sourcePurchaseOrderLineId: string | null;
    reason: string | null;
    sortOrder: number;
  }): PurchaseReturnLineDto {
    return {
      itemId: line.itemId,
      description: line.description,
      quantity: this.decimalString(line.quantity),
      unitCost: line.unitCost === null ? null : this.decimalString(line.unitCost),
      sourcePurchaseBillLineId: line.sourcePurchaseBillLineId,
      sourcePurchaseReceiptLineId: line.sourcePurchaseReceiptLineId,
      sourcePurchaseOrderLineId: line.sourcePurchaseOrderLineId,
      reason: line.reason,
      sortOrder: line.sortOrder,
    };
  }

  private async quantityOnHand(organizationId: string, itemId: string, warehouseId: string, executor: PrismaExecutor): Promise<Prisma.Decimal> {
    const movements = await executor.stockMovement.findMany({
      where: { organizationId, itemId, warehouseId },
      select: { type: true, quantity: true },
    });

    return movements.reduce((quantity, movement) => {
      const value = this.decimal(movement.quantity);
      return this.isInboundStockMovement(movement.type) ? quantity.plus(value) : quantity.minus(value);
    }, new Prisma.Decimal(0));
  }

  private isInboundStockMovement(type: StockMovementType): boolean {
    return new Set<StockMovementType>([
      StockMovementType.OPENING_BALANCE,
      StockMovementType.ADJUSTMENT_IN,
      StockMovementType.TRANSFER_IN,
      StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER,
      StockMovementType.SALES_RETURN_IN,
    ]).has(type);
  }

  private inventoryReturnUnitCost(line: PurchaseReturnWithLines["lines"][number]): Prisma.Decimal | null {
    if (line.unitCost !== null) return this.decimal(line.unitCost);
    if (line.sourcePurchaseReceiptLine?.unitCost !== null && line.sourcePurchaseReceiptLine?.unitCost !== undefined) {
      return this.decimal(line.sourcePurchaseReceiptLine.unitCost);
    }
    if (line.sourcePurchaseReceiptLine?.stockMovement?.unitCost !== null && line.sourcePurchaseReceiptLine?.stockMovement?.unitCost !== undefined) {
      return this.decimal(line.sourcePurchaseReceiptLine.stockMovement.unitCost);
    }
    return null;
  }

  private inventoryMovementStatus(purchaseReturn: { inventoryReturnPostedAt?: Date | string | null; lines?: Array<{ stockMovementId?: string | null }> }) {
    return purchaseReturn.inventoryReturnPostedAt || this.purchaseReturnMovementIds(purchaseReturn).length > 0 ? "POSTED" : "NOT_POSTED";
  }

  private purchaseReturnMovementIds(purchaseReturn: { lines?: Array<{ stockMovementId?: string | null; stockMovement?: { id: string } | null }> }): string[] {
    return this.uniqueStrings((purchaseReturn.lines ?? []).map((line) => line.stockMovementId ?? line.stockMovement?.id ?? null));
  }

  private uniqueStrings(values: Array<string | null | undefined>): string[] {
    return [...new Set(values.filter((value): value is string => Boolean(value)))];
  }

  private normalizeListFilters(rawFilters: Record<string, string | string[] | undefined>) {
    const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
    const status = first(rawFilters.status);
    const parsedLimit = Number(first(rawFilters.limit));
    return {
      supplierId: this.cleanOptional(first(rawFilters.supplierId)),
      status: this.isPurchaseReturnStatus(status) ? status : undefined,
      sourceMatchingReviewId: this.cleanOptional(first(rawFilters.sourceMatchingReviewId)),
      search: this.cleanOptional(first(rawFilters.search)),
      limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(Math.trunc(parsedLimit), 200) : 100,
    };
  }

  private isPurchaseReturnStatus(value?: string): value is PurchaseReturnStatus {
    return Object.values(PurchaseReturnStatus).includes(value as PurchaseReturnStatus);
  }

  private parseRequiredDate(value: string, label: string): Date {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${label} must be a valid date.`);
    }
    return date;
  }

  private positiveDecimal(value: Prisma.Decimal.Value, label: string): Prisma.Decimal {
    const decimal = this.decimal(value);
    if (decimal.lte(0)) {
      throw new BadRequestException(`${label} must be greater than zero.`);
    }
    return decimal;
  }

  private optionalNonNegativeDecimal(value: Prisma.Decimal.Value | null | undefined, label: string): Prisma.Decimal | null {
    if (value === undefined || value === null || value === "") return null;
    const decimal = this.decimal(value);
    if (decimal.lt(0)) {
      throw new BadRequestException(`${label} cannot be negative.`);
    }
    return decimal;
  }

  private decimal(value: Prisma.Decimal.Value): Prisma.Decimal {
    try {
      return new Prisma.Decimal(value);
    } catch {
      throw new BadRequestException("Purchase return quantities and costs must be valid decimals.");
    }
  }

  private decimalString(value: unknown): string {
    return new Prisma.Decimal(value as Prisma.Decimal.Value).toFixed(4);
  }

  private cleanOptional(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private has<T extends object>(object: T, key: keyof T): boolean {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  private pastTense(action: string): string {
    const map: Record<string, string> = {
      SUBMIT: "submitted",
      APPROVE: "approved",
      COMPLETE: "completed",
      CANCEL: "cancelled",
      VOID: "voided",
    };
    return map[action] ?? action.toLowerCase();
  }

  private auditSnapshot(purchaseReturn: {
    id: string;
    purchaseReturnNumber: string;
    supplierId: string;
    status: PurchaseReturnStatus;
    reason?: string | null;
    inventoryReturnPostedAt?: Date | string | null;
    lines?: Array<{ stockMovementId?: string | null; stockMovement?: { id: string } | null }>;
  }) {
    const movementIds = this.purchaseReturnMovementIds(purchaseReturn);
    return {
      returnId: purchaseReturn.id,
      returnNumber: purchaseReturn.purchaseReturnNumber,
      supplierId: purchaseReturn.supplierId,
      status: purchaseReturn.status,
      reason: purchaseReturn.reason ?? null,
      nonPosting: true,
      noAutomaticInventoryMutation: true,
      inventoryMovementPosted: Boolean(purchaseReturn.inventoryReturnPostedAt || movementIds.length > 0),
      movementIds,
    };
  }
}
