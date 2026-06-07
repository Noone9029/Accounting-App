import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ContactType,
  CreditNoteStatus,
  DeliveryNoteStatus,
  ItemStatus,
  NumberSequenceScope,
  Prisma,
  SalesInventoryReturnStatus,
  SalesInvoiceStatus,
  SalesStockIssueStatus,
  StockMovementType,
  WarehouseStatus,
} from "@prisma/client";
import { AUDIT_ENTITY_TYPES } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { stockMovementDirection } from "../stock-movements/stock-movement-rules";
import { hasAdvancedTracking } from "../inventory/inventory-tracking-validation";
import { CreateSalesInventoryReturnDto } from "./dto/create-sales-inventory-return.dto";
import { SalesInventoryReturnLineDto } from "./dto/sales-inventory-return-line.dto";
import { UpdateSalesInventoryReturnDto } from "./dto/update-sales-inventory-return.dto";

const salesInventoryReturnInclude = {
  customer: { select: { id: true, name: true, displayName: true, type: true, taxNumber: true, isActive: true } },
  sourceSalesInvoice: { select: { id: true, invoiceNumber: true, status: true, issueDate: true, total: true, customerId: true } },
  sourceCreditNote: { select: { id: true, creditNoteNumber: true, status: true, issueDate: true, total: true, customerId: true } },
  sourceDeliveryNote: { select: { id: true, deliveryNoteNumber: true, status: true, issueDate: true, deliveryDate: true, customerId: true } },
  sourceSalesStockIssue: {
    select: {
      id: true,
      issueNumber: true,
      status: true,
      issueDate: true,
      customerId: true,
      warehouseId: true,
      warehouse: { select: { id: true, code: true, name: true, status: true, isDefault: true } },
    },
  },
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
      warehouse: { select: { id: true, code: true, name: true, status: true, isDefault: true } },
      sourceSalesInvoiceLine: {
        select: {
          id: true,
          invoiceId: true,
          itemId: true,
          description: true,
          quantity: true,
          invoice: { select: { id: true, invoiceNumber: true, customerId: true, status: true } },
        },
      },
      sourceCreditNoteLine: {
        select: {
          id: true,
          creditNoteId: true,
          itemId: true,
          description: true,
          quantity: true,
          creditNote: { select: { id: true, creditNoteNumber: true, customerId: true, status: true } },
        },
      },
      sourceDeliveryNoteLine: {
        select: {
          id: true,
          deliveryNoteId: true,
          itemId: true,
          description: true,
          quantity: true,
          deliveryNote: { select: { id: true, deliveryNoteNumber: true, customerId: true, status: true } },
        },
      },
      sourceSalesStockIssueLine: {
        select: {
          id: true,
          issueId: true,
          itemId: true,
          quantity: true,
          unitCost: true,
          stockMovementId: true,
          issue: {
            select: {
              id: true,
              issueNumber: true,
              customerId: true,
              status: true,
              warehouseId: true,
              warehouse: { select: { id: true, code: true, name: true, status: true, isDefault: true } },
            },
          },
          stockMovement: { select: { id: true, type: true, warehouseId: true, unitCost: true } },
        },
      },
      stockMovement: { select: { id: true, type: true, movementDate: true, quantity: true, referenceType: true, referenceId: true } },
    },
  },
} satisfies Prisma.SalesInventoryReturnInclude;

type PrismaExecutor = PrismaService | Prisma.TransactionClient;
type SalesInventoryReturnWithLines = Prisma.SalesInventoryReturnGetPayload<{ include: typeof salesInventoryReturnInclude }>;
type SalesInventoryReturnInventoryLineStatus = "POSTABLE" | "POSTED" | "BLOCKED" | "SKIPPED_NON_TRACKED";

const SALES_RETURN_INVENTORY_ALLOWED_STATUSES: readonly SalesInventoryReturnStatus[] = [
  SalesInventoryReturnStatus.APPROVED,
  SalesInventoryReturnStatus.RECEIVED,
] as const;

export const SALES_INVENTORY_RETURN_HELPER_TEXT =
  "Sales inventory returns record operational stock returned by a customer. They do not create credit notes, refunds, accounting journals, AR adjustments, VAT filings, ZATCA submissions, emails, or payment links by themselves.";

interface PreparedSourceHeader {
  sourceSalesInvoiceId: string | null;
  sourceCreditNoteId: string | null;
  sourceDeliveryNoteId: string | null;
  sourceSalesStockIssueId: string | null;
}

interface PreparedLine {
  itemId: string | null;
  description: string;
  quantity: Prisma.Decimal;
  sourceSalesInvoiceLineId: string | null;
  sourceCreditNoteLineId: string | null;
  sourceDeliveryNoteLineId: string | null;
  sourceSalesStockIssueLineId: string | null;
  warehouseId: string | null;
  reason: string | null;
  sortOrder: number;
}

interface SalesInventoryReturnPreviewLine {
  lineId: string;
  description: string;
  item: { id: string; name: string; sku: string | null; inventoryTracking: boolean } | null;
  warehouse: { id: string; code: string; name: string } | null;
  returnQuantity: string;
  currentOnHand: string | null;
  projectedOnHandAfterReturn: string | null;
  movementType: "SALES_RETURN_IN";
  movementRequired: boolean;
  status: SalesInventoryReturnInventoryLineStatus;
  stockMovementId: string | null;
  sourceType: "salesInvoice" | "creditNote" | "deliveryNote" | "salesStockIssue" | "direct";
  sourceLineId: string | null;
  sourceDocumentNumber: string | null;
  blockingReasons: string[];
  warnings: string[];
}

export interface SalesInventoryReturnPreview {
  readOnly: true;
  previewOnly: true;
  noPostingEffect: true;
  noAccountingEffect: true;
  noArEffect: true;
  noVatEffect: true;
  noZatcaEffect: true;
  sourceType: "SalesInventoryReturn";
  sourceSalesInventoryReturn: { id: string; salesReturnNumber: string; status: SalesInventoryReturnStatus };
  inventoryMovementStatus: "NOT_POSTED" | "POSTED" | "BLOCKED";
  canPost: boolean;
  alreadyPosted: boolean;
  reversalSupported: false;
  postedAt: string | null;
  movementIds: string[];
  blockingReasons: string[];
  warnings: string[];
  safeHelperText: string;
  lines: SalesInventoryReturnPreviewLine[];
}

@Injectable()
export class SalesInventoryReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
  ) {}

  async list(organizationId: string, rawFilters: Record<string, string | string[] | undefined> = {}) {
    const filters = this.normalizeListFilters(rawFilters);
    const where: Prisma.SalesInventoryReturnWhereInput = {
      organizationId,
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              { salesReturnNumber: { contains: filters.search, mode: "insensitive" } },
              { reference: { contains: filters.search, mode: "insensitive" } },
              { reason: { contains: filters.search, mode: "insensitive" } },
              { customer: { OR: [{ name: { contains: filters.search, mode: "insensitive" } }, { displayName: { contains: filters.search, mode: "insensitive" } }] } },
            ],
          }
        : {}),
    };

    const returns = await this.prisma.salesInventoryReturn.findMany({
      where,
      orderBy: [{ returnDate: "desc" }, { createdAt: "desc" }],
      take: filters.limit,
      include: salesInventoryReturnInclude,
    });

    return returns.map((salesReturn) => this.enrichReturn(salesReturn));
  }

  async nextNumberPreview(organizationId: string) {
    const preview = await this.numberSequenceService.preview(organizationId, NumberSequenceScope.SALES_INVENTORY_RETURN);
    return {
      ...preview,
      salesReturnNumber: preview.exampleNextNumber,
      editable: false,
      overrideAllowed: false,
      policy: "SEQUENCE_ASSIGNED_ON_CREATE",
      helperText: "Preview only. The sales inventory return number is assigned from the sales inventory return sequence when the draft is saved.",
    };
  }

  async get(organizationId: string, id: string) {
    const salesReturn = await this.prisma.salesInventoryReturn.findFirst({
      where: { id, organizationId },
      include: salesInventoryReturnInclude,
    });
    if (!salesReturn) {
      throw new NotFoundException("Sales inventory return not found.");
    }
    return this.enrichReturn(salesReturn);
  }

  async create(organizationId: string, actorUserId: string, dto: CreateSalesInventoryReturnDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const prepared = await this.prepareSalesInventoryReturn(organizationId, dto.customerId, dto, undefined, tx);
      const salesReturnNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.SALES_INVENTORY_RETURN, tx);

      return tx.salesInventoryReturn.create({
        data: {
          organizationId,
          customerId: dto.customerId,
          salesReturnNumber,
          status: SalesInventoryReturnStatus.DRAFT,
          returnDate: this.parseRequiredDate(dto.returnDate, "Return date"),
          reason: this.cleanOptional(dto.reason),
          reference: this.cleanOptional(dto.reference),
          sourceSalesInvoiceId: prepared.header.sourceSalesInvoiceId,
          sourceCreditNoteId: prepared.header.sourceCreditNoteId,
          sourceDeliveryNoteId: prepared.header.sourceDeliveryNoteId,
          sourceSalesStockIssueId: prepared.header.sourceSalesStockIssueId,
          notes: this.cleanOptional(dto.notes),
          createdByUserId: actorUserId,
          lines: { create: this.toLineCreateMany(organizationId, prepared.lines) },
        },
        include: salesInventoryReturnInclude,
      });
    }).catch((error: unknown) => {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException("Sales inventory return number already exists for this organization.");
      }
      throw error;
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: AUDIT_ENTITY_TYPES.SALES_INVENTORY_RETURN,
      entityId: created.id,
      after: this.auditSnapshot(created),
    });
    return this.enrichReturn(created);
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateSalesInventoryReturnDto) {
    const before = await this.get(organizationId, id);
    this.assertEditable(before.status);

    const nextCustomerId = dto.customerId ?? before.customerId;
    const headerInput = {
      sourceSalesInvoiceId: this.has(dto, "sourceSalesInvoiceId") ? dto.sourceSalesInvoiceId : before.sourceSalesInvoiceId,
      sourceCreditNoteId: this.has(dto, "sourceCreditNoteId") ? dto.sourceCreditNoteId : before.sourceCreditNoteId,
      sourceDeliveryNoteId: this.has(dto, "sourceDeliveryNoteId") ? dto.sourceDeliveryNoteId : before.sourceDeliveryNoteId,
      sourceSalesStockIssueId: this.has(dto, "sourceSalesStockIssueId") ? dto.sourceSalesStockIssueId : before.sourceSalesStockIssueId,
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const prepared = await this.prepareSalesInventoryReturn(
        organizationId,
        nextCustomerId,
        { ...headerInput, lines: dto.lines ?? before.lines.map((line) => this.existingLineToDto(line)) },
        id,
        tx,
      );

      if (dto.lines) {
        await tx.salesInventoryReturnLine.deleteMany({ where: { organizationId, salesInventoryReturnId: id } });
      }

      return tx.salesInventoryReturn.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          returnDate: dto.returnDate ? this.parseRequiredDate(dto.returnDate, "Return date") : undefined,
          reason: this.has(dto, "reason") ? this.cleanOptional(dto.reason) : undefined,
          reference: this.has(dto, "reference") ? this.cleanOptional(dto.reference) : undefined,
          sourceSalesInvoiceId: this.has(dto, "sourceSalesInvoiceId") ? prepared.header.sourceSalesInvoiceId : undefined,
          sourceCreditNoteId: this.has(dto, "sourceCreditNoteId") ? prepared.header.sourceCreditNoteId : undefined,
          sourceDeliveryNoteId: this.has(dto, "sourceDeliveryNoteId") ? prepared.header.sourceDeliveryNoteId : undefined,
          sourceSalesStockIssueId: this.has(dto, "sourceSalesStockIssueId") ? prepared.header.sourceSalesStockIssueId : undefined,
          notes: this.has(dto, "notes") ? this.cleanOptional(dto.notes) : undefined,
          lines: dto.lines ? { create: this.toLineCreateMany(organizationId, prepared.lines) } : undefined,
        },
        include: salesInventoryReturnInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: AUDIT_ENTITY_TYPES.SALES_INVENTORY_RETURN,
      entityId: id,
      before: this.auditSnapshot(before),
      after: this.auditSnapshot(updated),
    });
    return this.enrichReturn(updated);
  }

  submit(organizationId: string, actorUserId: string, id: string) {
    return this.transition(organizationId, actorUserId, id, SalesInventoryReturnStatus.DRAFT, SalesInventoryReturnStatus.SUBMITTED, "SUBMIT");
  }

  approve(organizationId: string, actorUserId: string, id: string) {
    return this.transition(organizationId, actorUserId, id, SalesInventoryReturnStatus.SUBMITTED, SalesInventoryReturnStatus.APPROVED, "APPROVE", {
      approvedBy: { connect: { id: actorUserId } },
      approvedAt: new Date(),
    });
  }

  receive(organizationId: string, actorUserId: string, id: string) {
    return this.transition(organizationId, actorUserId, id, SalesInventoryReturnStatus.APPROVED, SalesInventoryReturnStatus.RECEIVED, "RECEIVE", {
      receivedAt: new Date(),
    });
  }

  cancel(organizationId: string, actorUserId: string, id: string) {
    return this.transition(
      organizationId,
      actorUserId,
      id,
      [SalesInventoryReturnStatus.DRAFT, SalesInventoryReturnStatus.SUBMITTED],
      SalesInventoryReturnStatus.CANCELLED,
      "CANCEL",
      { cancelledAt: new Date() },
    );
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.inventoryReturnPostedAt || this.salesInventoryReturnMovementIds(existing).length > 0) {
      throw new BadRequestException("Sales inventory return movement has been posted; reversal is not supported yet.");
    }
    return this.transition(
      organizationId,
      actorUserId,
      id,
      [SalesInventoryReturnStatus.APPROVED, SalesInventoryReturnStatus.RECEIVED],
      SalesInventoryReturnStatus.VOIDED,
      "VOID",
      { voidedAt: new Date() },
    );
  }

  async inventoryReturnPreview(organizationId: string, id: string): Promise<SalesInventoryReturnPreview> {
    const salesReturn = await this.loadSalesInventoryReturnForInventory(organizationId, id, this.prisma);
    return this.buildInventoryReturnPreview(organizationId, salesReturn, this.prisma);
  }

  async postInventoryReturnMovement(organizationId: string, actorUserId: string, id: string) {
    const before = await this.get(organizationId, id);

    const result = await this.prisma.$transaction(async (tx) => {
      const salesReturn = await this.loadSalesInventoryReturnForInventory(organizationId, id, tx);
      const preview = await this.buildInventoryReturnPreview(organizationId, salesReturn, tx);
      if (!preview.canPost) {
        throw new BadRequestException(preview.blockingReasons.length > 0 ? preview.blockingReasons.join(" ") : "Sales inventory return movement cannot be posted.");
      }

      const postedAt = new Date();
      const claim = await tx.salesInventoryReturn.updateMany({
        where: {
          id,
          organizationId,
          status: { in: [...SALES_RETURN_INVENTORY_ALLOWED_STATUSES] },
          inventoryReturnPostedAt: null,
        },
        data: {
          inventoryReturnPostedAt: postedAt,
          inventoryReturnPostedByUserId: actorUserId,
        },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("Sales inventory return movement has already been posted or the return is no longer in a postable status.");
      }

      const postedLines = preview.lines.filter((line) => line.status === "POSTABLE");
      const movements: Array<{ id: string; itemId: string; warehouseId: string; quantity: string }> = [];
      for (const line of postedLines) {
        if (!line.item || !line.warehouse) continue;
        const returnLine = salesReturn.lines.find((candidate) => candidate.id === line.lineId);
        if (!returnLine) continue;
        const quantity = new Prisma.Decimal(line.returnQuantity);
        const unitCost = this.inventoryReturnUnitCost(returnLine);
        const movement = await tx.stockMovement.create({
          data: {
            organizationId,
            itemId: line.item.id,
            warehouseId: line.warehouse.id,
            movementDate: salesReturn.returnDate,
            type: StockMovementType.SALES_RETURN_IN,
            quantity: quantity.toFixed(4),
            unitCost: unitCost?.toFixed(4) ?? null,
            totalCost: unitCost ? quantity.mul(unitCost).toFixed(4) : null,
            referenceType: "SalesInventoryReturn",
            referenceId: salesReturn.id,
            description: `Sales inventory return ${salesReturn.salesReturnNumber} operational stock-in`,
            createdById: actorUserId,
          },
          select: { id: true, itemId: true, warehouseId: true, quantity: true },
        });
        await tx.salesInventoryReturnLine.update({
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
      entityType: AUDIT_ENTITY_TYPES.SALES_INVENTORY_RETURN,
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
        noArEffect: true,
        noVatEffect: true,
        noZatcaEffect: true,
        noCreditNoteEffect: true,
        noRefundEffect: true,
      },
    });
    return updated;
  }

  private async transition(
    organizationId: string,
    actorUserId: string,
    id: string,
    allowedFrom: SalesInventoryReturnStatus | SalesInventoryReturnStatus[],
    toStatus: SalesInventoryReturnStatus,
    action: "SUBMIT" | "APPROVE" | "RECEIVE" | "CANCEL" | "VOID",
    extraData: Prisma.SalesInventoryReturnUpdateInput = {},
  ) {
    const before = await this.get(organizationId, id);
    const allowed = Array.isArray(allowedFrom) ? allowedFrom : [allowedFrom];
    if (!allowed.includes(before.status)) {
      throw new BadRequestException(
        `Only ${allowed.map((status) => status.toLowerCase()).join(" or ")} sales inventory returns can be ${this.pastTense(action)}.`,
      );
    }

    const updated = await this.prisma.salesInventoryReturn.update({
      where: { id },
      data: { status: toStatus, ...extraData },
      include: salesInventoryReturnInclude,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action,
      entityType: AUDIT_ENTITY_TYPES.SALES_INVENTORY_RETURN,
      entityId: id,
      before: this.auditSnapshot(before),
      after: this.auditSnapshot(updated),
    });
    return this.enrichReturn(updated);
  }

  private async loadSalesInventoryReturnForInventory(
    organizationId: string,
    id: string,
    executor: PrismaExecutor,
  ): Promise<SalesInventoryReturnWithLines> {
    const salesReturn = await executor.salesInventoryReturn.findFirst({
      where: { id, organizationId },
      include: salesInventoryReturnInclude,
    });
    if (!salesReturn) {
      throw new NotFoundException("Sales inventory return not found.");
    }
    return salesReturn;
  }

  private async buildInventoryReturnPreview(
    organizationId: string,
    salesReturn: SalesInventoryReturnWithLines,
    executor: PrismaExecutor,
  ): Promise<SalesInventoryReturnPreview> {
    const blockingReasons: string[] = [];
    const warnings = [
      SALES_INVENTORY_RETURN_HELPER_TEXT,
      "Reversal is not supported yet; use a separately approved inventory adjustment if a sales return movement must be corrected.",
    ];
    const movementIds = this.salesInventoryReturnMovementIds(salesReturn);
    const alreadyPosted = Boolean(salesReturn.inventoryReturnPostedAt || movementIds.length > 0);
    const statusAllowed = SALES_RETURN_INVENTORY_ALLOWED_STATUSES.includes(salesReturn.status);

    if (!statusAllowed) {
      blockingReasons.push("Inventory return movement can be posted only for approved or received sales inventory returns.");
    }
    if (alreadyPosted) {
      blockingReasons.push("Sales inventory return movement has already been posted.");
    }

    const lines: SalesInventoryReturnPreviewLine[] = [];
    for (const [index, line] of salesReturn.lines.entries()) {
      const lineWarnings: string[] = [];
      const lineBlockers: string[] = [];
      const quantity = this.decimal(line.quantity);
      const sourceInfo = this.sourceInfo(line);
      const resolvedWarehouse = line.warehouse ?? line.sourceSalesStockIssueLine?.issue?.warehouse ?? salesReturn.sourceSalesStockIssue?.warehouse ?? null;
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
          warehouse: resolvedWarehouse ? { id: resolvedWarehouse.id, code: resolvedWarehouse.code, name: resolvedWarehouse.name } : null,
          returnQuantity: this.decimalString(quantity),
          currentOnHand: null,
          projectedOnHandAfterReturn: null,
          movementType: StockMovementType.SALES_RETURN_IN,
          movementRequired: false,
          status: postedMovementId ? "POSTED" : "SKIPPED_NON_TRACKED",
          stockMovementId: postedMovementId,
          sourceType: sourceInfo.sourceType,
          sourceLineId: sourceInfo.sourceLineId,
          sourceDocumentNumber: sourceInfo.sourceDocumentNumber,
          blockingReasons: [],
          warnings: ["Line is not inventory-tracked, so no operational stock movement is required."],
        });
        continue;
      }

      const currentOnHand = resolvedWarehouse ? await this.quantityOnHand(organizationId, line.item.id, resolvedWarehouse.id, executor) : null;
      const projectedOnHand = currentOnHand ? currentOnHand.plus(quantity) : null;

      if (postedMovementId) {
        lines.push({
          lineId: line.id,
          description: line.description,
          item,
          warehouse: resolvedWarehouse ? { id: resolvedWarehouse.id, code: resolvedWarehouse.code, name: resolvedWarehouse.name } : null,
          returnQuantity: this.decimalString(quantity),
          currentOnHand: currentOnHand ? this.decimalString(currentOnHand) : null,
          projectedOnHandAfterReturn: currentOnHand ? this.decimalString(currentOnHand) : null,
          movementType: StockMovementType.SALES_RETURN_IN,
          movementRequired: true,
          status: "POSTED",
          stockMovementId: postedMovementId,
          sourceType: sourceInfo.sourceType,
          sourceLineId: sourceInfo.sourceLineId,
          sourceDocumentNumber: sourceInfo.sourceDocumentNumber,
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
          `Line ${index + 1} item uses serial, batch, expiry, or bin tracking; sales return stock-in does not capture tracking metadata yet.`,
        );
      }
      if (!resolvedWarehouse) {
        lineBlockers.push(`Line ${index + 1} requires an active return warehouse before stock-in can be posted.`);
      } else if (resolvedWarehouse.status !== WarehouseStatus.ACTIVE) {
        lineBlockers.push(`Line ${index + 1} return warehouse is archived.`);
      }
      if (line.sourceSalesStockIssueLineId && !line.sourceSalesStockIssueLine?.stockMovementId) {
        lineBlockers.push(`Line ${index + 1} source sales stock issue line has no posted stock movement.`);
      }
      if (line.sourceSalesStockIssueLine?.issue.status !== undefined && line.sourceSalesStockIssueLine.issue.status !== SalesStockIssueStatus.POSTED) {
        lineBlockers.push(`Line ${index + 1} source sales stock issue must be posted.`);
      }
      if (line.sourceSalesStockIssueLine?.unitCost === null || line.sourceSalesStockIssueLine?.unitCost === undefined) {
        lineWarnings.push("No source stock-issue unit cost is available; this operational stock-in controls quantity only.");
      }

      blockingReasons.push(...lineBlockers);
      lines.push({
        lineId: line.id,
        description: line.description,
        item,
        warehouse: resolvedWarehouse ? { id: resolvedWarehouse.id, code: resolvedWarehouse.code, name: resolvedWarehouse.name } : null,
        returnQuantity: this.decimalString(quantity),
        currentOnHand: currentOnHand ? this.decimalString(currentOnHand) : null,
        projectedOnHandAfterReturn: projectedOnHand ? this.decimalString(projectedOnHand) : null,
        movementType: StockMovementType.SALES_RETURN_IN,
        movementRequired: true,
        status: lineBlockers.length > 0 || alreadyPosted || !statusAllowed ? "BLOCKED" : "POSTABLE",
        stockMovementId: null,
        sourceType: sourceInfo.sourceType,
        sourceLineId: sourceInfo.sourceLineId,
        sourceDocumentNumber: sourceInfo.sourceDocumentNumber,
        blockingReasons: lineBlockers,
        warnings: lineWarnings,
      });
    }

    const postableLineCount = lines.filter((line) => line.status === "POSTABLE").length;
    if (postableLineCount === 0 && !alreadyPosted) {
      blockingReasons.push("Sales inventory return has no inventory-tracked lines ready for stock-in movement.");
    }

    const uniqueBlockingReasons = this.uniqueStrings(blockingReasons);
    const inventoryMovementStatus = alreadyPosted ? "POSTED" : uniqueBlockingReasons.length > 0 ? "BLOCKED" : "NOT_POSTED";
    return {
      readOnly: true,
      previewOnly: true,
      noPostingEffect: true,
      noAccountingEffect: true,
      noArEffect: true,
      noVatEffect: true,
      noZatcaEffect: true,
      sourceType: "SalesInventoryReturn",
      sourceSalesInventoryReturn: {
        id: salesReturn.id,
        salesReturnNumber: salesReturn.salesReturnNumber,
        status: salesReturn.status,
      },
      inventoryMovementStatus,
      canPost: !alreadyPosted && statusAllowed && postableLineCount > 0 && uniqueBlockingReasons.length === 0,
      alreadyPosted,
      reversalSupported: false,
      postedAt: salesReturn.inventoryReturnPostedAt ? salesReturn.inventoryReturnPostedAt.toISOString() : null,
      movementIds,
      blockingReasons: uniqueBlockingReasons,
      warnings,
      safeHelperText: SALES_INVENTORY_RETURN_HELPER_TEXT,
      lines,
    };
  }

  private async prepareSalesInventoryReturn(
    organizationId: string,
    customerId: string,
    input: Partial<CreateSalesInventoryReturnDto> & { lines: SalesInventoryReturnLineDto[] },
    excludeReturnId: string | undefined,
    executor: PrismaExecutor,
  ): Promise<{ header: PreparedSourceHeader; lines: PreparedLine[] }> {
    await this.assertCustomer(organizationId, customerId, executor);
    const header = await this.prepareHeaderReferences(organizationId, customerId, input, executor);
    const lines = await this.prepareLines(organizationId, customerId, header, input.lines, excludeReturnId, executor);
    return { header, lines };
  }

  private async prepareHeaderReferences(
    organizationId: string,
    customerId: string,
    input: Partial<CreateSalesInventoryReturnDto>,
    executor: PrismaExecutor,
  ): Promise<PreparedSourceHeader> {
    const sourceSalesInvoiceId = this.cleanOptional(input.sourceSalesInvoiceId);
    const sourceCreditNoteId = this.cleanOptional(input.sourceCreditNoteId);
    const sourceDeliveryNoteId = this.cleanOptional(input.sourceDeliveryNoteId);
    const sourceSalesStockIssueId = this.cleanOptional(input.sourceSalesStockIssueId);

    if (sourceSalesInvoiceId) {
      const invoice = await executor.salesInvoice.findFirst({
        where: { id: sourceSalesInvoiceId, organizationId },
        select: { id: true, customerId: true, status: true },
      });
      if (!invoice || invoice.customerId !== customerId) {
        throw new BadRequestException("Source sales invoice must belong to this organization and customer.");
      }
      if (invoice.status === SalesInvoiceStatus.VOIDED) {
        throw new BadRequestException("Voided sales invoices cannot be linked to sales inventory returns.");
      }
    }

    if (sourceCreditNoteId) {
      const creditNote = await executor.creditNote.findFirst({
        where: { id: sourceCreditNoteId, organizationId },
        select: { id: true, customerId: true, status: true },
      });
      if (!creditNote || creditNote.customerId !== customerId) {
        throw new BadRequestException("Source credit note must belong to this organization and customer.");
      }
      if (creditNote.status === CreditNoteStatus.VOIDED) {
        throw new BadRequestException("Voided credit notes cannot be linked to sales inventory returns.");
      }
    }

    if (sourceDeliveryNoteId) {
      const deliveryNote = await executor.deliveryNote.findFirst({
        where: { id: sourceDeliveryNoteId, organizationId },
        select: { id: true, customerId: true, status: true },
      });
      if (!deliveryNote || deliveryNote.customerId !== customerId) {
        throw new BadRequestException("Source delivery note must belong to this organization and customer.");
      }
      if (deliveryNote.status !== DeliveryNoteStatus.DELIVERED) {
        throw new BadRequestException("Sales inventory returns can link only delivered delivery notes.");
      }
    }

    if (sourceSalesStockIssueId) {
      const issue = await executor.salesStockIssue.findFirst({
        where: { id: sourceSalesStockIssueId, organizationId },
        select: { id: true, customerId: true, status: true },
      });
      if (!issue || issue.customerId !== customerId) {
        throw new BadRequestException("Source sales stock issue must belong to this organization and customer.");
      }
      if (issue.status !== SalesStockIssueStatus.POSTED) {
        throw new BadRequestException("Sales inventory returns can link only posted sales stock issues.");
      }
    }

    return { sourceSalesInvoiceId, sourceCreditNoteId, sourceDeliveryNoteId, sourceSalesStockIssueId };
  }

  private async prepareLines(
    organizationId: string,
    customerId: string,
    header: PreparedSourceHeader,
    lines: SalesInventoryReturnLineDto[],
    excludeReturnId: string | undefined,
    executor: PrismaExecutor,
  ): Promise<PreparedLine[]> {
    if (!lines.length) {
      throw new BadRequestException("Sales inventory returns require at least one line.");
    }

    const itemIds = this.uniqueStrings(lines.map((line) => this.cleanOptional(line.itemId)));
    const warehouseIds = this.uniqueStrings(lines.map((line) => this.cleanOptional(line.warehouseId)));
    const invoiceLineIds = this.uniqueStrings(lines.map((line) => this.cleanOptional(line.sourceSalesInvoiceLineId)));
    const creditNoteLineIds = this.uniqueStrings(lines.map((line) => this.cleanOptional(line.sourceCreditNoteLineId)));
    const deliveryNoteLineIds = this.uniqueStrings(lines.map((line) => this.cleanOptional(line.sourceDeliveryNoteLineId)));
    const stockIssueLineIds = this.uniqueStrings(lines.map((line) => this.cleanOptional(line.sourceSalesStockIssueLineId)));

    const [items, warehouses, invoiceLines, creditNoteLines, deliveryNoteLines, stockIssueLines, returnedByInvoiceLine, returnedByCreditNoteLine, returnedByDeliveryLine, returnedByStockIssueLine] =
      await Promise.all([
        itemIds.length
          ? executor.item.findMany({
              where: { organizationId, id: { in: itemIds }, status: ItemStatus.ACTIVE },
              select: {
                id: true,
                name: true,
                description: true,
                status: true,
                inventoryTracking: true,
                trackingMode: true,
                expiryTrackingEnabled: true,
                binTrackingEnabled: true,
              },
            })
          : Promise.resolve([]),
        warehouseIds.length
          ? executor.warehouse.findMany({ where: { organizationId, id: { in: warehouseIds }, status: WarehouseStatus.ACTIVE }, select: { id: true, status: true } })
          : Promise.resolve([]),
        invoiceLineIds.length
          ? executor.salesInvoiceLine.findMany({
              where: { organizationId, id: { in: invoiceLineIds } },
              select: { id: true, invoiceId: true, itemId: true, description: true, quantity: true, invoice: { select: { id: true, customerId: true, status: true } } },
            })
          : Promise.resolve([]),
        creditNoteLineIds.length
          ? executor.creditNoteLine.findMany({
              where: { organizationId, id: { in: creditNoteLineIds } },
              select: { id: true, creditNoteId: true, itemId: true, description: true, quantity: true, creditNote: { select: { id: true, customerId: true, status: true } } },
            })
          : Promise.resolve([]),
        deliveryNoteLineIds.length
          ? executor.deliveryNoteLine.findMany({
              where: { organizationId, id: { in: deliveryNoteLineIds } },
              select: { id: true, deliveryNoteId: true, itemId: true, description: true, quantity: true, deliveryNote: { select: { id: true, customerId: true, status: true } } },
            })
          : Promise.resolve([]),
        stockIssueLineIds.length
          ? executor.salesStockIssueLine.findMany({
              where: { organizationId, id: { in: stockIssueLineIds } },
              select: {
                id: true,
                issueId: true,
                itemId: true,
                quantity: true,
                unitCost: true,
                stockMovementId: true,
                issue: { select: { id: true, customerId: true, status: true, warehouseId: true } },
              },
            })
          : Promise.resolve([]),
        this.returnedQuantitiesBySourceLine(executor, organizationId, "sourceSalesInvoiceLineId", invoiceLineIds, excludeReturnId),
        this.returnedQuantitiesBySourceLine(executor, organizationId, "sourceCreditNoteLineId", creditNoteLineIds, excludeReturnId),
        this.returnedQuantitiesBySourceLine(executor, organizationId, "sourceDeliveryNoteLineId", deliveryNoteLineIds, excludeReturnId),
        this.returnedQuantitiesBySourceLine(executor, organizationId, "sourceSalesStockIssueLineId", stockIssueLineIds, excludeReturnId),
      ]);

    if (items.length !== itemIds.length) {
      throw new BadRequestException("One or more sales inventory return items do not exist or are disabled.");
    }
    if (warehouses.length !== warehouseIds.length) {
      throw new BadRequestException("One or more return warehouses do not exist or are archived.");
    }
    if (invoiceLines.length !== invoiceLineIds.length) {
      throw new BadRequestException("One or more source sales invoice lines do not belong to this organization.");
    }
    if (creditNoteLines.length !== creditNoteLineIds.length) {
      throw new BadRequestException("One or more source credit note lines do not belong to this organization.");
    }
    if (deliveryNoteLines.length !== deliveryNoteLineIds.length) {
      throw new BadRequestException("One or more source delivery note lines do not belong to this organization.");
    }
    if (stockIssueLines.length !== stockIssueLineIds.length) {
      throw new BadRequestException("One or more source sales stock issue lines do not belong to this organization.");
    }

    const sourceItemIds = this.uniqueStrings([
      ...invoiceLines.map((line) => line.itemId),
      ...creditNoteLines.map((line) => line.itemId),
      ...deliveryNoteLines.map((line) => line.itemId),
      ...stockIssueLines.map((line) => line.itemId),
    ]);
    const explicitItemIdSet = new Set(itemIds);
    const sourceOnlyItemIds = sourceItemIds.filter((itemId) => !explicitItemIdSet.has(itemId));
    const sourceOnlyItems = sourceOnlyItemIds.length
      ? await executor.item.findMany({
          where: { organizationId, id: { in: sourceOnlyItemIds }, status: ItemStatus.ACTIVE },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            inventoryTracking: true,
            trackingMode: true,
            expiryTrackingEnabled: true,
            binTrackingEnabled: true,
          },
        })
      : [];
    if (sourceOnlyItems.length !== sourceOnlyItemIds.length) {
      throw new BadRequestException("One or more source line items do not exist or are disabled.");
    }

    const itemsById = new Map([...items, ...sourceOnlyItems].map((item) => [item.id, item]));
    const invoiceLinesById = new Map(invoiceLines.map((line) => [line.id, line]));
    const creditNoteLinesById = new Map(creditNoteLines.map((line) => [line.id, line]));
    const deliveryNoteLinesById = new Map(deliveryNoteLines.map((line) => [line.id, line]));
    const stockIssueLinesById = new Map(stockIssueLines.map((line) => [line.id, line]));
    const requestedBySourceLine = new Map<string, Prisma.Decimal>();

    return lines.map((line, index) => {
      const sourceSalesInvoiceLineId = this.cleanOptional(line.sourceSalesInvoiceLineId);
      const sourceCreditNoteLineId = this.cleanOptional(line.sourceCreditNoteLineId);
      const sourceDeliveryNoteLineId = this.cleanOptional(line.sourceDeliveryNoteLineId);
      const sourceSalesStockIssueLineId = this.cleanOptional(line.sourceSalesStockIssueLineId);
      const sourceCount = [sourceSalesInvoiceLineId, sourceCreditNoteLineId, sourceDeliveryNoteLineId, sourceSalesStockIssueLineId].filter(Boolean).length;
      if (sourceCount > 1) {
        throw new BadRequestException(`Sales inventory return line ${index + 1} can reference only one source line.`);
      }

      const invoiceLine = sourceSalesInvoiceLineId ? invoiceLinesById.get(sourceSalesInvoiceLineId) : undefined;
      const creditNoteLine = sourceCreditNoteLineId ? creditNoteLinesById.get(sourceCreditNoteLineId) : undefined;
      const deliveryNoteLine = sourceDeliveryNoteLineId ? deliveryNoteLinesById.get(sourceDeliveryNoteLineId) : undefined;
      const stockIssueLine = sourceSalesStockIssueLineId ? stockIssueLinesById.get(sourceSalesStockIssueLineId) : undefined;

      if (invoiceLine) {
        this.assertSourceLineCustomer(index, invoiceLine.invoice.customerId, customerId, "sales invoice");
        if (invoiceLine.invoice.status === SalesInvoiceStatus.VOIDED) throw new BadRequestException(`Sales inventory return line ${index + 1} cannot reference a voided sales invoice.`);
        if (header.sourceSalesInvoiceId && invoiceLine.invoiceId !== header.sourceSalesInvoiceId) {
          throw new BadRequestException(`Sales inventory return line ${index + 1} must reference a line from the source sales invoice.`);
        }
      }
      if (creditNoteLine) {
        this.assertSourceLineCustomer(index, creditNoteLine.creditNote.customerId, customerId, "credit note");
        if (creditNoteLine.creditNote.status === CreditNoteStatus.VOIDED) throw new BadRequestException(`Sales inventory return line ${index + 1} cannot reference a voided credit note.`);
        if (header.sourceCreditNoteId && creditNoteLine.creditNoteId !== header.sourceCreditNoteId) {
          throw new BadRequestException(`Sales inventory return line ${index + 1} must reference a line from the source credit note.`);
        }
      }
      if (deliveryNoteLine) {
        this.assertSourceLineCustomer(index, deliveryNoteLine.deliveryNote.customerId, customerId, "delivery note");
        if (deliveryNoteLine.deliveryNote.status !== DeliveryNoteStatus.DELIVERED) throw new BadRequestException(`Sales inventory return line ${index + 1} can reference only a delivered delivery note.`);
        if (header.sourceDeliveryNoteId && deliveryNoteLine.deliveryNoteId !== header.sourceDeliveryNoteId) {
          throw new BadRequestException(`Sales inventory return line ${index + 1} must reference a line from the source delivery note.`);
        }
      }
      if (stockIssueLine) {
        this.assertSourceLineCustomer(index, stockIssueLine.issue.customerId, customerId, "sales stock issue");
        if (stockIssueLine.issue.status !== SalesStockIssueStatus.POSTED) throw new BadRequestException(`Sales inventory return line ${index + 1} can reference only a posted sales stock issue.`);
        if (header.sourceSalesStockIssueId && stockIssueLine.issueId !== header.sourceSalesStockIssueId) {
          throw new BadRequestException(`Sales inventory return line ${index + 1} must reference a line from the source sales stock issue.`);
        }
      }

      const requestedItemId = this.cleanOptional(line.itemId);
      const sourceItemId = invoiceLine?.itemId ?? creditNoteLine?.itemId ?? deliveryNoteLine?.itemId ?? stockIssueLine?.itemId ?? null;
      if (requestedItemId && sourceItemId && requestedItemId !== sourceItemId) {
        throw new BadRequestException(`Sales inventory return line ${index + 1} item must match the selected source line item.`);
      }
      const itemId = requestedItemId ?? sourceItemId;
      const item = itemId ? itemsById.get(itemId) : undefined;
      const quantity = this.positiveDecimal(line.quantity, `Sales inventory return line ${index + 1} quantity`);
      const description = this.cleanOptional(line.description) ?? invoiceLine?.description ?? creditNoteLine?.description ?? deliveryNoteLine?.description ?? item?.description ?? item?.name;
      if (!description) {
        throw new BadRequestException(`Sales inventory return line ${index + 1} requires a description.`);
      }

      const explicitWarehouseId = this.cleanOptional(line.warehouseId);
      const derivedWarehouseId = stockIssueLine?.issue.warehouseId ?? null;
      if (explicitWarehouseId && derivedWarehouseId && explicitWarehouseId !== derivedWarehouseId) {
        throw new BadRequestException(`Sales inventory return line ${index + 1} warehouse must match the source sales stock issue warehouse.`);
      }
      const warehouseId = explicitWarehouseId ?? derivedWarehouseId;

      const sourceQuantity =
        invoiceLine?.quantity ?? creditNoteLine?.quantity ?? deliveryNoteLine?.quantity ?? stockIssueLine?.quantity ?? null;
      const sourceLineId = sourceSalesInvoiceLineId ?? sourceCreditNoteLineId ?? sourceDeliveryNoteLineId ?? sourceSalesStockIssueLineId;
      const alreadyReturned =
        (sourceSalesInvoiceLineId ? returnedByInvoiceLine.get(sourceSalesInvoiceLineId) : null) ??
        (sourceCreditNoteLineId ? returnedByCreditNoteLine.get(sourceCreditNoteLineId) : null) ??
        (sourceDeliveryNoteLineId ? returnedByDeliveryLine.get(sourceDeliveryNoteLineId) : null) ??
        (sourceSalesStockIssueLineId ? returnedByStockIssueLine.get(sourceSalesStockIssueLineId) : null) ??
        new Prisma.Decimal(0);
      if (sourceQuantity && sourceLineId) {
        const requested = (requestedBySourceLine.get(sourceLineId) ?? new Prisma.Decimal(0)).plus(quantity);
        const available = this.decimal(sourceQuantity).minus(alreadyReturned);
        if (requested.gt(available)) {
          throw new BadRequestException(`Returned quantity cannot exceed available source quantity on sales inventory return line ${index + 1}.`);
        }
        requestedBySourceLine.set(sourceLineId, requested);
      }

      return {
        itemId,
        description,
        quantity,
        sourceSalesInvoiceLineId,
        sourceCreditNoteLineId,
        sourceDeliveryNoteLineId,
        sourceSalesStockIssueLineId,
        warehouseId,
        reason: this.cleanOptional(line.reason),
        sortOrder: line.sortOrder ?? index,
      };
    });
  }

  private async assertCustomer(organizationId: string, customerId: string, executor: PrismaExecutor) {
    const customer = await executor.contact.findFirst({
      where: {
        id: customerId,
        organizationId,
        isActive: true,
        type: { in: [ContactType.CUSTOMER, ContactType.BOTH] },
      },
      select: { id: true },
    });
    if (!customer) {
      throw new BadRequestException("Customer must be an active customer contact in this organization.");
    }
  }

  private assertSourceLineCustomer(index: number, sourceCustomerId: string, customerId: string, sourceLabel: string) {
    if (sourceCustomerId !== customerId) {
      throw new BadRequestException(`Sales inventory return line ${index + 1} ${sourceLabel} source must match the selected customer.`);
    }
  }

  private async returnedQuantitiesBySourceLine(
    executor: PrismaExecutor,
    organizationId: string,
    field: "sourceSalesInvoiceLineId" | "sourceCreditNoteLineId" | "sourceDeliveryNoteLineId" | "sourceSalesStockIssueLineId",
    sourceLineIds: string[],
    excludeReturnId?: string,
  ): Promise<Map<string, Prisma.Decimal>> {
    if (!sourceLineIds.length) {
      return new Map();
    }
    const where = {
      organizationId,
      [field]: { in: sourceLineIds },
      salesInventoryReturn: {
        status: { notIn: [SalesInventoryReturnStatus.CANCELLED, SalesInventoryReturnStatus.VOIDED] },
        ...(excludeReturnId ? { id: { not: excludeReturnId } } : {}),
      },
    } as Prisma.SalesInventoryReturnLineWhereInput;
    const rows = (await executor.salesInventoryReturnLine.findMany({
      where,
      select: { [field]: true, quantity: true } as never,
    })) as Array<Record<string, unknown> & { quantity: Prisma.Decimal }>;

    const returnedByLine = new Map<string, Prisma.Decimal>();
    for (const row of rows) {
      const sourceLineId = typeof row[field] === "string" ? row[field] : null;
      if (!sourceLineId) continue;
      returnedByLine.set(sourceLineId, (returnedByLine.get(sourceLineId) ?? new Prisma.Decimal(0)).plus(row.quantity));
    }
    return returnedByLine;
  }

  private assertEditable(status: SalesInventoryReturnStatus) {
    if (status !== SalesInventoryReturnStatus.DRAFT) {
      throw new BadRequestException("Only draft sales inventory returns can be edited.");
    }
  }

  private toLineCreateMany(organizationId: string, lines: PreparedLine[]): Prisma.SalesInventoryReturnLineCreateWithoutSalesInventoryReturnInput[] {
    return lines.map((line) => ({
      organization: { connect: { id: organizationId } },
      item: line.itemId ? { connect: { id: line.itemId } } : undefined,
      description: line.description,
      quantity: line.quantity.toFixed(4),
      sourceSalesInvoiceLine: line.sourceSalesInvoiceLineId ? { connect: { id: line.sourceSalesInvoiceLineId } } : undefined,
      sourceCreditNoteLine: line.sourceCreditNoteLineId ? { connect: { id: line.sourceCreditNoteLineId } } : undefined,
      sourceDeliveryNoteLine: line.sourceDeliveryNoteLineId ? { connect: { id: line.sourceDeliveryNoteLineId } } : undefined,
      sourceSalesStockIssueLine: line.sourceSalesStockIssueLineId ? { connect: { id: line.sourceSalesStockIssueLineId } } : undefined,
      warehouse: line.warehouseId ? { connect: { id: line.warehouseId } } : undefined,
      reason: line.reason,
      sortOrder: line.sortOrder,
    }));
  }

  private existingLineToDto(line: {
    itemId: string | null;
    description: string;
    quantity: unknown;
    sourceSalesInvoiceLineId: string | null;
    sourceCreditNoteLineId: string | null;
    sourceDeliveryNoteLineId: string | null;
    sourceSalesStockIssueLineId: string | null;
    warehouseId: string | null;
    reason: string | null;
    sortOrder: number;
  }): SalesInventoryReturnLineDto {
    return {
      itemId: line.itemId,
      description: line.description,
      quantity: this.decimalString(line.quantity),
      sourceSalesInvoiceLineId: line.sourceSalesInvoiceLineId,
      sourceCreditNoteLineId: line.sourceCreditNoteLineId,
      sourceDeliveryNoteLineId: line.sourceDeliveryNoteLineId,
      sourceSalesStockIssueLineId: line.sourceSalesStockIssueLineId,
      warehouseId: line.warehouseId,
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
      return stockMovementDirection(movement.type) === "IN" ? quantity.plus(value) : quantity.minus(value);
    }, new Prisma.Decimal(0));
  }

  private inventoryReturnUnitCost(line: SalesInventoryReturnWithLines["lines"][number]): Prisma.Decimal | null {
    if (line.sourceSalesStockIssueLine?.unitCost !== null && line.sourceSalesStockIssueLine?.unitCost !== undefined) {
      return this.decimal(line.sourceSalesStockIssueLine.unitCost);
    }
    if (line.sourceSalesStockIssueLine?.stockMovement?.unitCost !== null && line.sourceSalesStockIssueLine?.stockMovement?.unitCost !== undefined) {
      return this.decimal(line.sourceSalesStockIssueLine.stockMovement.unitCost);
    }
    return null;
  }

  private enrichReturn<T extends SalesInventoryReturnWithLines>(salesReturn: T) {
    return {
      ...salesReturn,
      safeHelperText: SALES_INVENTORY_RETURN_HELPER_TEXT,
      nonPostingOperationalReturn: true,
      noAccountingEffect: true,
      noArEffect: true,
      noVatEffect: true,
      noZatcaEffect: true,
      inventoryReturnMovementStatus: this.inventoryMovementStatus(salesReturn),
      inventoryReturnMovementIds: this.salesInventoryReturnMovementIds(salesReturn),
      inventoryReturnReversalSupported: false,
      lineCount: salesReturn.lines.length,
    };
  }

  private inventoryMovementStatus(salesReturn: { inventoryReturnPostedAt?: Date | string | null; lines?: Array<{ stockMovementId?: string | null }> }) {
    return salesReturn.inventoryReturnPostedAt || this.salesInventoryReturnMovementIds(salesReturn).length > 0 ? "POSTED" : "NOT_POSTED";
  }

  private salesInventoryReturnMovementIds(salesReturn: { lines?: Array<{ stockMovementId?: string | null; stockMovement?: { id: string } | null }> }): string[] {
    return this.uniqueStrings((salesReturn.lines ?? []).map((line) => line.stockMovementId ?? line.stockMovement?.id ?? null));
  }

  private sourceInfo(line: SalesInventoryReturnWithLines["lines"][number]): {
    sourceType: SalesInventoryReturnPreviewLine["sourceType"];
    sourceLineId: string | null;
    sourceDocumentNumber: string | null;
  } {
    if (line.sourceSalesStockIssueLine) {
      return {
        sourceType: "salesStockIssue",
        sourceLineId: line.sourceSalesStockIssueLine.id,
        sourceDocumentNumber: line.sourceSalesStockIssueLine.issue.issueNumber,
      };
    }
    if (line.sourceDeliveryNoteLine) {
      return {
        sourceType: "deliveryNote",
        sourceLineId: line.sourceDeliveryNoteLine.id,
        sourceDocumentNumber: line.sourceDeliveryNoteLine.deliveryNote.deliveryNoteNumber,
      };
    }
    if (line.sourceSalesInvoiceLine) {
      return {
        sourceType: "salesInvoice",
        sourceLineId: line.sourceSalesInvoiceLine.id,
        sourceDocumentNumber: line.sourceSalesInvoiceLine.invoice.invoiceNumber,
      };
    }
    if (line.sourceCreditNoteLine) {
      return {
        sourceType: "creditNote",
        sourceLineId: line.sourceCreditNoteLine.id,
        sourceDocumentNumber: line.sourceCreditNoteLine.creditNote.creditNoteNumber,
      };
    }
    return { sourceType: "direct", sourceLineId: null, sourceDocumentNumber: null };
  }

  private normalizeListFilters(rawFilters: Record<string, string | string[] | undefined>) {
    const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
    const status = first(rawFilters.status);
    const parsedLimit = Number(first(rawFilters.limit));
    return {
      customerId: this.cleanOptional(first(rawFilters.customerId)),
      status: this.isSalesInventoryReturnStatus(status) ? status : undefined,
      search: this.cleanOptional(first(rawFilters.search)),
      limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(Math.trunc(parsedLimit), 200) : 100,
    };
  }

  private isSalesInventoryReturnStatus(value?: string): value is SalesInventoryReturnStatus {
    return Object.values(SalesInventoryReturnStatus).includes(value as SalesInventoryReturnStatus);
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

  private decimal(value: Prisma.Decimal.Value): Prisma.Decimal {
    try {
      return new Prisma.Decimal(value);
    } catch {
      throw new BadRequestException("Sales inventory return quantities must be valid decimals.");
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

  private uniqueStrings(values: Array<string | null | undefined>): string[] {
    return [...new Set(values.filter((value): value is string => Boolean(value)))];
  }

  private pastTense(action: string): string {
    const map: Record<string, string> = {
      SUBMIT: "submitted",
      APPROVE: "approved",
      RECEIVE: "received",
      CANCEL: "cancelled",
      VOID: "voided",
    };
    return map[action] ?? action.toLowerCase();
  }

  private auditSnapshot(salesReturn: {
    id: string;
    salesReturnNumber: string;
    customerId: string;
    status: SalesInventoryReturnStatus;
    reason?: string | null;
    sourceSalesInvoiceId?: string | null;
    sourceCreditNoteId?: string | null;
    sourceDeliveryNoteId?: string | null;
    sourceSalesStockIssueId?: string | null;
    inventoryReturnPostedAt?: Date | string | null;
    lines?: Array<{ itemId?: string | null; warehouseId?: string | null; quantity?: unknown; stockMovementId?: string | null; stockMovement?: { id: string } | null }>;
  }) {
    const movementIds = this.salesInventoryReturnMovementIds(salesReturn);
    return {
      returnId: salesReturn.id,
      returnNumber: salesReturn.salesReturnNumber,
      customerId: salesReturn.customerId,
      status: salesReturn.status,
      reason: salesReturn.reason ?? null,
      sourceSalesInvoiceId: salesReturn.sourceSalesInvoiceId ?? null,
      sourceCreditNoteId: salesReturn.sourceCreditNoteId ?? null,
      sourceDeliveryNoteId: salesReturn.sourceDeliveryNoteId ?? null,
      sourceSalesStockIssueId: salesReturn.sourceSalesStockIssueId ?? null,
      itemIds: this.uniqueStrings((salesReturn.lines ?? []).map((line) => line.itemId)),
      warehouseIds: this.uniqueStrings((salesReturn.lines ?? []).map((line) => line.warehouseId)),
      quantities: (salesReturn.lines ?? []).map((line) => this.decimalString(line.quantity ?? 0)),
      operationalStockReturn: true,
      nonPosting: true,
      noAutomaticCreditNote: true,
      noAutomaticRefund: true,
      noAccountingEffect: true,
      noArEffect: true,
      noVatEffect: true,
      noZatcaEffect: true,
      inventoryMovementPosted: Boolean(salesReturn.inventoryReturnPostedAt || movementIds.length > 0),
      movementIds,
    };
  }
}

function isUniqueConstraintError(error: unknown): error is { code: "P2002" } {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}
