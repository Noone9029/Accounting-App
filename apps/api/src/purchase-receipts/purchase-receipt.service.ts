import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ContactType,
  ItemStatus,
  NumberSequenceScope,
  Prisma,
  PurchaseBillStatus,
  PurchaseOrderStatus,
  PurchaseReceiptStatus,
  StockMovementType,
  WarehouseStatus,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import {
  InventoryAccountingService,
  NO_FINANCIAL_POSTING_WARNING,
  PURCHASE_RECEIPT_DESIGN_WARNING,
} from "../inventory/inventory-accounting.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { stockMovementDirection } from "../stock-movements/stock-movement-rules";
import { CreatePurchaseReceiptDto, PurchaseReceiptLineDto } from "./dto/create-purchase-receipt.dto";

const purchaseReceiptInclude = {
  supplier: { select: { id: true, name: true, displayName: true, type: true, taxNumber: true } },
  warehouse: { select: { id: true, code: true, name: true, status: true, isDefault: true } },
  purchaseOrder: { select: { id: true, purchaseOrderNumber: true, status: true, orderDate: true, total: true } },
  purchaseBill: { select: { id: true, billNumber: true, status: true, billDate: true, total: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  lines: {
    orderBy: { createdAt: "asc" as const },
    include: {
      item: { select: { id: true, name: true, sku: true, type: true, status: true, inventoryTracking: true } },
      purchaseOrderLine: { select: { id: true, description: true, quantity: true, unitPrice: true } },
      purchaseBillLine: { select: { id: true, description: true, quantity: true, unitPrice: true } },
      stockMovement: { select: { id: true, type: true, movementDate: true, quantity: true, referenceType: true, referenceId: true } },
      voidStockMovement: { select: { id: true, type: true, movementDate: true, quantity: true, referenceType: true, referenceId: true } },
    },
  },
};

type PrismaExecutor = PrismaService | Prisma.TransactionClient;
type SourceKind = "purchaseOrder" | "purchaseBill" | "standalone";

type PreparedReceiptLine = {
  itemId: string;
  purchaseOrderLineId: string | null;
  purchaseBillLineId: string | null;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal | null;
};

@Injectable()
export class PurchaseReceiptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly inventoryAccountingService: InventoryAccountingService,
  ) {}

  list(organizationId: string) {
    return this.prisma.purchaseReceipt.findMany({
      where: { organizationId },
      orderBy: [{ receiptDate: "desc" }, { createdAt: "desc" }],
      include: purchaseReceiptInclude,
    });
  }

  async get(organizationId: string, id: string) {
    const receipt = await this.prisma.purchaseReceipt.findFirst({
      where: { id, organizationId },
      include: purchaseReceiptInclude,
    });
    if (!receipt) {
      throw new NotFoundException("Purchase receipt not found.");
    }
    return receipt;
  }

  async accountingPreview(organizationId: string, id: string) {
    const receipt = await this.prisma.purchaseReceipt.findFirst({
      where: { id, organizationId },
      include: purchaseReceiptInclude,
    });
    if (!receipt) {
      throw new NotFoundException("Purchase receipt not found.");
    }

    const readiness = await this.inventoryAccountingService.previewReadiness(organizationId, ["inventoryAsset"]);
    const blockingReasons = [...readiness.blockingReasons];
    const warnings = [PURCHASE_RECEIPT_DESIGN_WARNING, NO_FINANCIAL_POSTING_WARNING, ...readiness.warnings];
    let totalValue = new Prisma.Decimal(0);

    const lines = receipt.lines.map((line, index) => {
      const quantity = new Prisma.Decimal(line.quantity);
      const lineWarnings: string[] = [];
      let lineValue: Prisma.Decimal | null = null;
      if (line.unitCost === null) {
        const reason = `Purchase receipt line ${index + 1} is missing unit cost.`;
        lineWarnings.push(reason);
        blockingReasons.push(reason);
      } else {
        lineValue = quantity.mul(line.unitCost);
        totalValue = totalValue.plus(lineValue);
      }

      return {
        lineId: line.id,
        item: line.item,
        quantity: this.decimalString(quantity),
        unitCost: line.unitCost === null ? null : this.decimalString(new Prisma.Decimal(line.unitCost)),
        lineValue: lineValue === null ? null : this.decimalString(lineValue),
        warnings: lineWarnings,
      };
    });

    const assetAccount = readiness.settings.inventoryAssetAccount;
    const journalLines =
      assetAccount && totalValue.gt(0)
        ? [
            {
              lineNumber: 1,
              side: "DEBIT",
              accountId: assetAccount.id,
              accountCode: assetAccount.code,
              accountName: assetAccount.name,
              amount: this.decimalString(totalValue),
              description: `Purchase receipt ${receipt.receiptNumber} inventory asset preview`,
            },
            {
              lineNumber: 2,
              side: "CREDIT",
              accountId: null,
              accountCode: null,
              accountName: "Inventory Clearing / Accounts Payable placeholder",
              amount: this.decimalString(totalValue),
              description: "Placeholder pending bill/receipt matching and inventory clearing design",
            },
          ]
        : [];

    return {
      sourceType: "PurchaseReceipt",
      sourceId: receipt.id,
      sourceNumber: receipt.receiptNumber,
      previewOnly: true,
      postingStatus: "DESIGN_ONLY",
      canPost: false,
      canPostReason: "Purchase receipt accounting is design-only until inventory clearing and bill/receipt matching are finalized.",
      valuationMethod: readiness.settings.valuationMethod,
      blockingReasons: this.uniqueStrings(blockingReasons),
      warnings: this.uniqueStrings(warnings),
      lines,
      journal: {
        description: `Purchase receipt ${receipt.receiptNumber} accounting preview`,
        entryDate: receipt.receiptDate.toISOString(),
        totalDebit: this.decimalString(totalValue),
        totalCredit: this.decimalString(totalValue),
        lines: journalLines,
      },
    };
  }

  async create(organizationId: string, actorUserId: string, dto: CreatePurchaseReceiptDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const sourceKind = this.sourceKind(dto);
      const warehouse = await this.findActiveWarehouse(organizationId, dto.warehouseId, tx);
      const receiptDate = this.requiredDate(dto.receiptDate, "Receipt date");
      const source = await this.loadSource(organizationId, sourceKind, dto, tx);
      const supplierId = source.supplierId ?? (await this.findStandaloneSupplier(organizationId, dto.supplierId, tx)).id;
      if (dto.supplierId && dto.supplierId !== supplierId) {
        throw new BadRequestException("Receipt supplier must match the linked purchase source.");
      }

      const preparedLines = await this.prepareLines(organizationId, sourceKind, source, dto.lines, tx);
      if (preparedLines.length === 0) {
        throw new BadRequestException("Purchase receipt requires at least one inventory-tracked line.");
      }

      const receiptNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.PURCHASE_RECEIPT, tx);
      const postedAt = new Date();
      const receipt = await tx.purchaseReceipt.create({
        data: {
          organizationId,
          receiptNumber,
          purchaseOrderId: source.purchaseOrderId,
          purchaseBillId: source.purchaseBillId,
          supplierId,
          warehouseId: warehouse.id,
          receiptDate,
          status: PurchaseReceiptStatus.POSTED,
          notes: this.cleanOptional(dto.notes),
          createdById: actorUserId,
          postedAt,
        },
        select: { id: true },
      });

      for (const line of preparedLines) {
        const movement = await this.createStockMovement(tx, {
          organizationId,
          actorUserId,
          itemId: line.itemId,
          warehouseId: warehouse.id,
          movementDate: receiptDate,
          type: StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER,
          quantity: line.quantity,
          unitCost: line.unitCost,
          referenceType: "PurchaseReceipt",
          referenceId: receipt.id,
          description: `Purchase receipt ${receiptNumber}`,
        });
        await tx.purchaseReceiptLine.create({
          data: {
            organizationId,
            receiptId: receipt.id,
            itemId: line.itemId,
            purchaseOrderLineId: line.purchaseOrderLineId,
            purchaseBillLineId: line.purchaseBillLineId,
            quantity: line.quantity.toFixed(4),
            unitCost: line.unitCost?.toFixed(4) ?? null,
            stockMovementId: movement.id,
          },
        });
      }

      return tx.purchaseReceipt.findUniqueOrThrow({ where: { id: receipt.id }, include: purchaseReceiptInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "PurchaseReceipt",
      entityId: created.id,
      after: created,
    });
    return created;
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === PurchaseReceiptStatus.VOIDED) {
      throw new BadRequestException("Purchase receipt is already voided.");
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const receipt = await tx.purchaseReceipt.findFirst({
        where: { id, organizationId },
        include: { lines: true },
      });
      if (!receipt) {
        throw new NotFoundException("Purchase receipt not found.");
      }
      if (receipt.status === PurchaseReceiptStatus.VOIDED) {
        throw new BadRequestException("Purchase receipt is already voided.");
      }

      const requiredByItem = new Map<string, Prisma.Decimal>();
      for (const line of receipt.lines) {
        const quantity = new Prisma.Decimal(line.quantity);
        requiredByItem.set(line.itemId, (requiredByItem.get(line.itemId) ?? new Prisma.Decimal(0)).plus(quantity));
      }
      for (const [itemId, requiredQuantity] of requiredByItem) {
        const currentQuantity = await this.quantityOnHand(organizationId, itemId, receipt.warehouseId, tx);
        if (currentQuantity.minus(requiredQuantity).lt(0)) {
          throw new BadRequestException("Voiding this purchase receipt cannot make stock negative.");
        }
      }

      const voidedAt = new Date();
      const claim = await tx.purchaseReceipt.updateMany({
        where: { id, organizationId, status: PurchaseReceiptStatus.POSTED },
        data: { status: PurchaseReceiptStatus.VOIDED, voidedAt },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("Purchase receipt is no longer posted.");
      }

      for (const line of receipt.lines) {
        const quantity = new Prisma.Decimal(line.quantity);
        const unitCost = line.unitCost === null ? null : new Prisma.Decimal(line.unitCost);
        const movement = await this.createStockMovement(tx, {
          organizationId,
          actorUserId,
          itemId: line.itemId,
          warehouseId: receipt.warehouseId,
          movementDate: voidedAt,
          type: StockMovementType.ADJUSTMENT_OUT,
          quantity,
          unitCost,
          referenceType: "PurchaseReceiptVoid",
          referenceId: receipt.id,
          description: `Void purchase receipt ${receipt.receiptNumber}`,
        });
        await tx.purchaseReceiptLine.update({
          where: { id: line.id },
          data: { voidStockMovementId: movement.id },
        });
      }

      return tx.purchaseReceipt.findUniqueOrThrow({ where: { id }, include: purchaseReceiptInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "VOID",
      entityType: "PurchaseReceipt",
      entityId: id,
      before: existing,
      after: voided,
    });
    return voided;
  }

  async purchaseOrderReceivingStatus(organizationId: string, purchaseOrderId: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, organizationId },
      include: {
        lines: {
          orderBy: { sortOrder: "asc" },
          include: { item: { select: { id: true, name: true, sku: true, type: true, status: true, inventoryTracking: true } } },
        },
      },
    });
    if (!purchaseOrder) {
      throw new NotFoundException("Purchase order not found.");
    }

    return this.receivingStatus(
      "purchaseOrder",
      purchaseOrder.id,
      purchaseOrder.lines.map((line) => ({
        id: line.id,
        item: line.item,
        sourceQuantity: line.quantity,
      })),
    );
  }

  async purchaseBillReceivingStatus(organizationId: string, purchaseBillId: string) {
    const purchaseBill = await this.prisma.purchaseBill.findFirst({
      where: { id: purchaseBillId, organizationId },
      include: {
        lines: {
          orderBy: { sortOrder: "asc" },
          include: { item: { select: { id: true, name: true, sku: true, type: true, status: true, inventoryTracking: true } } },
        },
      },
    });
    if (!purchaseBill) {
      throw new NotFoundException("Purchase bill not found.");
    }

    return this.receivingStatus(
      "purchaseBill",
      purchaseBill.id,
      purchaseBill.lines.map((line) => ({
        id: line.id,
        item: line.item,
        sourceQuantity: line.quantity,
      })),
    );
  }

  private async receivingStatus(
    sourceKind: "purchaseOrder" | "purchaseBill",
    sourceId: string,
    lines: Array<{ id: string; item: { id: string; name: string; sku: string | null; inventoryTracking: boolean } | null; sourceQuantity: Prisma.Decimal }>,
  ) {
    const lineIds = lines.map((line) => line.id);
    const receiptLines = await this.prisma.purchaseReceiptLine.findMany({
      where: {
        ...(sourceKind === "purchaseOrder" ? { purchaseOrderLineId: { in: lineIds } } : { purchaseBillLineId: { in: lineIds } }),
        receipt: {
          status: { not: PurchaseReceiptStatus.VOIDED },
          ...(sourceKind === "purchaseOrder" ? { purchaseOrderId: sourceId } : { purchaseBillId: sourceId }),
        },
      },
      select: { purchaseOrderLineId: true, purchaseBillLineId: true, quantity: true },
    });
    const receivedByLine = new Map<string, Prisma.Decimal>();
    for (const receiptLine of receiptLines) {
      const key = sourceKind === "purchaseOrder" ? receiptLine.purchaseOrderLineId : receiptLine.purchaseBillLineId;
      if (!key) continue;
      receivedByLine.set(key, (receivedByLine.get(key) ?? new Prisma.Decimal(0)).plus(receiptLine.quantity));
    }

    const statusLines = lines.map((line) => {
      const receivedQuantity = receivedByLine.get(line.id) ?? new Prisma.Decimal(0);
      const inventoryTracking = Boolean(line.item?.inventoryTracking);
      const sourceQuantity = new Prisma.Decimal(line.sourceQuantity);
      const remainingQuantity = inventoryTracking ? Prisma.Decimal.max(sourceQuantity.minus(receivedQuantity), 0) : new Prisma.Decimal(0);
      return {
        lineId: line.id,
        item: line.item,
        inventoryTracking,
        ...(sourceKind === "purchaseOrder" ? { orderedQuantity: sourceQuantity.toFixed(4) } : { billedQuantity: sourceQuantity.toFixed(4) }),
        sourceQuantity: sourceQuantity.toFixed(4),
        receivedQuantity: receivedQuantity.toFixed(4),
        remainingQuantity: remainingQuantity.toFixed(4),
      };
    });
    const trackedLines = statusLines.filter((line) => line.inventoryTracking);
    const anyReceived = trackedLines.some((line) => new Prisma.Decimal(line.receivedQuantity).gt(0));
    const anyRemaining = trackedLines.some((line) => new Prisma.Decimal(line.remainingQuantity).gt(0));
    const overallStatus = trackedLines.length === 0 || !anyReceived ? "NOT_STARTED" : anyRemaining ? "PARTIAL" : "COMPLETE";
    return { sourceId, sourceType: sourceKind, status: overallStatus, lines: statusLines };
  }

  private sourceKind(dto: CreatePurchaseReceiptDto): SourceKind {
    if (dto.purchaseOrderId && dto.purchaseBillId) {
      throw new BadRequestException("Purchase receipt can reference either a purchase order or a purchase bill, not both.");
    }
    if (dto.purchaseOrderId) return "purchaseOrder";
    if (dto.purchaseBillId) return "purchaseBill";
    return "standalone";
  }

  private async loadSource(organizationId: string, sourceKind: SourceKind, dto: CreatePurchaseReceiptDto, tx: Prisma.TransactionClient) {
    if (sourceKind === "purchaseOrder") {
      const purchaseOrder = await tx.purchaseOrder.findFirst({
        where: { id: dto.purchaseOrderId, organizationId },
        include: { lines: { include: { item: true } } },
      });
      if (!purchaseOrder) throw new BadRequestException("Purchase order must belong to this organization.");
      if (purchaseOrder.status === PurchaseOrderStatus.DRAFT || purchaseOrder.status === PurchaseOrderStatus.VOIDED) {
        throw new BadRequestException("Purchase order must be approved or sent before receiving stock.");
      }
      return { purchaseOrderId: purchaseOrder.id, purchaseBillId: null, supplierId: purchaseOrder.supplierId, lines: purchaseOrder.lines };
    }
    if (sourceKind === "purchaseBill") {
      const purchaseBill = await tx.purchaseBill.findFirst({
        where: { id: dto.purchaseBillId, organizationId },
        include: { lines: { include: { item: true } } },
      });
      if (!purchaseBill) throw new BadRequestException("Purchase bill must belong to this organization.");
      if (purchaseBill.status !== PurchaseBillStatus.FINALIZED) {
        throw new BadRequestException("Purchase bill must be finalized before receiving stock.");
      }
      return { purchaseOrderId: null, purchaseBillId: purchaseBill.id, supplierId: purchaseBill.supplierId, lines: purchaseBill.lines };
    }
    if (!dto.supplierId) {
      throw new BadRequestException("Standalone purchase receipts require a supplier.");
    }
    return { purchaseOrderId: null, purchaseBillId: null, supplierId: null, lines: [] };
  }

  private async prepareLines(
    organizationId: string,
    sourceKind: SourceKind,
    source: { lines: Array<{ id: string; itemId: string | null; quantity: Prisma.Decimal; unitPrice: Prisma.Decimal; item: { inventoryTracking: boolean; status: ItemStatus } | null }> },
    lineDtos: PurchaseReceiptLineDto[],
    tx: Prisma.TransactionClient,
  ): Promise<PreparedReceiptLine[]> {
    const prepared: PreparedReceiptLine[] = [];
    const sourceLines = new Map(source.lines.map((line) => [line.id, line]));
    const remainingByLine =
      sourceKind === "purchaseOrder" || sourceKind === "purchaseBill"
        ? await this.remainingReceiptQuantity(sourceKind, [...sourceLines.keys()], tx)
        : new Map<string, Prisma.Decimal>();
    const requestedBySourceLine = new Map<string, Prisma.Decimal>();

    for (const dto of lineDtos) {
      const quantity = this.positiveDecimal(dto.quantity, "Receipt quantity");
      const unitCost = this.optionalNonNegativeDecimal(dto.unitCost, "Unit cost");

      if (sourceKind === "standalone") {
        if (!dto.itemId) {
          throw new BadRequestException("Standalone receipt lines require an item.");
        }
        await this.findTrackedActiveItem(organizationId, dto.itemId, tx);
        prepared.push({
          itemId: dto.itemId,
          purchaseOrderLineId: null,
          purchaseBillLineId: null,
          quantity,
          unitCost,
        });
        continue;
      }

      const sourceLineId = sourceKind === "purchaseOrder" ? dto.purchaseOrderLineId : dto.purchaseBillLineId;
      if (!sourceLineId) {
        throw new BadRequestException(sourceKind === "purchaseOrder" ? "Receipt lines require a purchase order line." : "Receipt lines require a purchase bill line.");
      }
      const sourceLine = sourceLines.get(sourceLineId);
      if (!sourceLine || !sourceLine.itemId) {
        throw new BadRequestException("Receipt line must reference an inventory item on the purchase source.");
      }
      if (dto.itemId && dto.itemId !== sourceLine.itemId) {
        throw new BadRequestException("Receipt line item must match the purchase source line.");
      }
      if (!sourceLine.item?.inventoryTracking) {
        throw new BadRequestException("Purchase receipts can only receive inventory-tracked items.");
      }
      if (sourceLine.item.status !== ItemStatus.ACTIVE) {
        throw new BadRequestException("Purchase receipts can only receive active items.");
      }
      const remaining = remainingByLine.get(sourceLineId) ?? new Prisma.Decimal(sourceLine.quantity);
      const requested = (requestedBySourceLine.get(sourceLineId) ?? new Prisma.Decimal(0)).plus(quantity);
      if (requested.gt(remaining)) {
        throw new BadRequestException("Receipt quantity cannot exceed the remaining source quantity.");
      }
      requestedBySourceLine.set(sourceLineId, requested);
      prepared.push({
        itemId: sourceLine.itemId,
        purchaseOrderLineId: sourceKind === "purchaseOrder" ? sourceLine.id : null,
        purchaseBillLineId: sourceKind === "purchaseBill" ? sourceLine.id : null,
        quantity,
        unitCost: unitCost ?? new Prisma.Decimal(sourceLine.unitPrice),
      });
    }
    return prepared;
  }

  private async remainingReceiptQuantity(sourceKind: "purchaseOrder" | "purchaseBill", lineIds: string[], tx: Prisma.TransactionClient) {
    const sourceLines =
      sourceKind === "purchaseOrder"
        ? await tx.purchaseOrderLine.findMany({ where: { id: { in: lineIds } }, select: { id: true, quantity: true } })
        : await tx.purchaseBillLine.findMany({ where: { id: { in: lineIds } }, select: { id: true, quantity: true } });
    const remaining = new Map(sourceLines.map((line) => [line.id, new Prisma.Decimal(line.quantity)]));
    const receiptLines = await tx.purchaseReceiptLine.findMany({
      where: {
        ...(sourceKind === "purchaseOrder" ? { purchaseOrderLineId: { in: lineIds } } : { purchaseBillLineId: { in: lineIds } }),
        receipt: { status: { not: PurchaseReceiptStatus.VOIDED } },
      },
      select: { purchaseOrderLineId: true, purchaseBillLineId: true, quantity: true },
    });
    for (const receiptLine of receiptLines) {
      const key = sourceKind === "purchaseOrder" ? receiptLine.purchaseOrderLineId : receiptLine.purchaseBillLineId;
      if (!key) continue;
      remaining.set(key, (remaining.get(key) ?? new Prisma.Decimal(0)).minus(receiptLine.quantity));
    }
    return remaining;
  }

  private async findTrackedActiveItem(organizationId: string, itemId: string, executor: PrismaExecutor) {
    const item = await executor.item.findFirst({
      where: { id: itemId, organizationId },
      select: { id: true, inventoryTracking: true, status: true },
    });
    if (!item) throw new BadRequestException("Item must belong to this organization.");
    if (!item.inventoryTracking) throw new BadRequestException("Purchase receipts can only receive inventory-tracked items.");
    if (item.status !== ItemStatus.ACTIVE) throw new BadRequestException("Purchase receipts can only receive active items.");
    return item;
  }

  private async findStandaloneSupplier(organizationId: string, supplierId: string | undefined, executor: PrismaExecutor) {
    if (!supplierId) {
      throw new BadRequestException("Standalone purchase receipts require a supplier.");
    }
    const supplier = await executor.contact.findFirst({
      where: { id: supplierId, organizationId, isActive: true, type: { in: [ContactType.SUPPLIER, ContactType.BOTH] } },
      select: { id: true },
    });
    if (!supplier) {
      throw new BadRequestException("Supplier must be active and belong to this organization.");
    }
    return supplier;
  }

  private async findActiveWarehouse(organizationId: string, warehouseId: string, executor: PrismaExecutor) {
    const warehouse = await executor.warehouse.findFirst({
      where: { id: warehouseId, organizationId },
      select: { id: true, status: true },
    });
    if (!warehouse) throw new BadRequestException("Warehouse must belong to this organization.");
    if (warehouse.status !== WarehouseStatus.ACTIVE) throw new BadRequestException("Warehouse must be active.");
    return warehouse;
  }

  private async quantityOnHand(organizationId: string, itemId: string, warehouseId: string, executor: PrismaExecutor): Promise<Prisma.Decimal> {
    const movements = await executor.stockMovement.findMany({
      where: { organizationId, itemId, warehouseId },
      select: { type: true, quantity: true },
    });
    return movements.reduce((quantity, movement) => {
      const value = new Prisma.Decimal(movement.quantity);
      return stockMovementDirection(movement.type) === "IN" ? quantity.plus(value) : quantity.minus(value);
    }, new Prisma.Decimal(0));
  }

  private createStockMovement(
    tx: Prisma.TransactionClient,
    input: {
      organizationId: string;
      actorUserId: string;
      itemId: string;
      warehouseId: string;
      movementDate: Date;
      type: StockMovementType;
      quantity: Prisma.Decimal;
      unitCost: Prisma.Decimal | null;
      referenceType: string;
      referenceId: string;
      description: string;
    },
  ) {
    return tx.stockMovement.create({
      data: {
        organizationId: input.organizationId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        movementDate: input.movementDate,
        type: input.type,
        quantity: input.quantity.toFixed(4),
        unitCost: input.unitCost?.toFixed(4) ?? null,
        totalCost: input.unitCost ? input.quantity.mul(input.unitCost).toFixed(4) : null,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        description: input.description,
        createdById: input.actorUserId,
      },
    });
  }

  private requiredDate(value: string, label: string): Date {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`${label} must be a valid date.`);
    return date;
  }

  private positiveDecimal(value: Prisma.Decimal.Value, label: string): Prisma.Decimal {
    const decimal = this.decimal(value);
    if (decimal.lte(0)) throw new BadRequestException(`${label} must be greater than zero.`);
    return decimal;
  }

  private optionalNonNegativeDecimal(value: Prisma.Decimal.Value | null | undefined, label: string): Prisma.Decimal | null {
    if (value === undefined || value === null || value === "") return null;
    const decimal = this.decimal(value);
    if (decimal.lt(0)) throw new BadRequestException(`${label} cannot be negative.`);
    return decimal;
  }

  private decimal(value: Prisma.Decimal.Value): Prisma.Decimal {
    try {
      return new Prisma.Decimal(value);
    } catch {
      throw new BadRequestException("Quantity and cost values must be valid decimals.");
    }
  }

  private cleanOptional(value?: string | null): string | null {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private decimalString(value: Prisma.Decimal): string {
    return value.toFixed(4);
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values)];
  }
}
