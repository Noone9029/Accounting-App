import { BadRequestException, Injectable } from "@nestjs/common";
import { InventoryValuationMethod, Prisma, StockMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { STOCK_MOVEMENT_IN_TYPES, STOCK_MOVEMENT_OUT_TYPES, stockMovementDirection } from "../stock-movements/stock-movement-rules";
import type { InventoryFifoPreviewQueryDto } from "./dto/inventory-fifo-preview-query.dto";

export type InventoryFifoPreviewWarningType =
  | "MISSING_UNIT_COST"
  | "NEGATIVE_LAYER_QUANTITY"
  | "INSUFFICIENT_LAYER_QUANTITY"
  | "UNSUPPORTED_TRANSFER_SHAPE"
  | "UNTRACEABLE_PURCHASE_RETURN_COST"
  | "UNTRACEABLE_SALES_RETURN_COST"
  | "MIXED_WAREHOUSE_SCOPE"
  | "NO_MOVEMENTS"
  | "PREVIEW_ONLY_NOT_ACCOUNTING_METHOD";

export interface InventoryFifoPreviewWarning {
  type: InventoryFifoPreviewWarningType;
  severity: "WARNING" | "BLOCKER";
  message: string;
  movementId: string | null;
  itemId: string | null;
  warehouseId: string | null;
}

export interface InventoryFifoPreviewMovementSummary {
  movementId: string;
  movementDate: string;
  type: StockMovementType;
  quantity: string;
  unitCost: string | null;
  totalCost: string | null;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
}

export interface InventoryFifoPreviewSourceDocument {
  type: string;
  id: string;
  href: string | null;
}

export interface InventoryFifoPreviewLayer {
  layerId: string;
  sourceMovementId: string;
  layerDate: string;
  sourceMovement: InventoryFifoPreviewMovementSummary;
  sourceDocument: InventoryFifoPreviewSourceDocument | null;
  originalQuantity: string;
  consumedQuantity: string;
  remainingQuantity: string;
  unitCost: string | null;
  layerValue: string | null;
  warnings: InventoryFifoPreviewWarning[];
}

export interface InventoryFifoPreviewConsumedLayer {
  layerId: string;
  sourceMovementId: string;
  consumedQuantity: string;
  unitCost: string | null;
  cost: string | null;
}

export interface InventoryFifoPreviewConsumedMovement {
  movementId: string;
  movementDate: string;
  type: StockMovementType;
  sourceMovement: InventoryFifoPreviewMovementSummary;
  sourceDocument: InventoryFifoPreviewSourceDocument | null;
  consumedQuantity: string;
  consumedLayers: InventoryFifoPreviewConsumedLayer[];
  estimatedCost: string | null;
  warnings: InventoryFifoPreviewWarning[];
  blockers: InventoryFifoPreviewWarning[];
}

export interface InventoryFifoPreviewRow {
  item: FifoItem;
  warehouse: FifoWarehouse;
  layers: InventoryFifoPreviewLayer[];
  consumedMovements: InventoryFifoPreviewConsumedMovement[];
  warnings: InventoryFifoPreviewWarning[];
  blockers: InventoryFifoPreviewWarning[];
  totalOnHandQuantity: string;
  fifoPreviewValue: string | null;
  currentOperationalValuationValue: string | null;
  differenceFromCurrentOperationalValuation: string | null;
}

export interface InventoryFifoPreviewResponse {
  readOnly: true;
  previewOnly: true;
  noMutation: true;
  noPostingEffect: true;
  noInventoryEffect: true;
  noApEffect: true;
  noArEffect: true;
  noVatEffect: true;
  noZatcaEffect: true;
  noFinancialStatementEffect: true;
  generatedAt: string;
  asOfDate: string;
  activeValuationMethod: {
    method: InventoryValuationMethod;
    note: string;
  };
  previewValuationMethod: "FIFO_PREVIEW";
  filters: {
    itemId: string | null;
    warehouseId: string | null;
  };
  rows: InventoryFifoPreviewRow[];
  warnings: InventoryFifoPreviewWarning[];
  blockers: InventoryFifoPreviewWarning[];
  totals: {
    totalOnHandQuantity: string;
    fifoPreviewValue: string | null;
    currentOperationalValuationValue: string | null;
    differenceFromCurrentOperationalValuation: string | null;
    warningCount: number;
    blockerCount: number;
  };
}

const ZERO = new Prisma.Decimal(0);
const itemSelect = {
  id: true,
  name: true,
  sku: true,
  type: true,
  status: true,
  inventoryTracking: true,
  reorderPoint: true,
  reorderQuantity: true,
} satisfies Prisma.ItemSelect;
const warehouseSelect = { id: true, code: true, name: true, status: true, isDefault: true } satisfies Prisma.WarehouseSelect;
const stockMovementSelect = {
  id: true,
  itemId: true,
  warehouseId: true,
  movementDate: true,
  type: true,
  quantity: true,
  unitCost: true,
  totalCost: true,
  referenceType: true,
  referenceId: true,
  description: true,
  createdAt: true,
  item: { select: itemSelect },
  warehouse: { select: warehouseSelect },
} satisfies Prisma.StockMovementSelect;

type FifoItem = Prisma.ItemGetPayload<{ select: typeof itemSelect }>;
type FifoWarehouse = Prisma.WarehouseGetPayload<{ select: typeof warehouseSelect }>;
type FifoMovement = Prisma.StockMovementGetPayload<{ select: typeof stockMovementSelect }>;

interface InternalLayer extends InventoryFifoPreviewLayer {
  originalQuantityDecimal: Prisma.Decimal;
  consumedQuantityDecimal: Prisma.Decimal;
  remainingQuantityDecimal: Prisma.Decimal;
  unitCostDecimal: Prisma.Decimal | null;
}

@Injectable()
export class InventoryFifoPreviewService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(organizationId: string, query: InventoryFifoPreviewQueryDto = {}): Promise<InventoryFifoPreviewResponse> {
    const asOfDate = this.parseAsOfDate(query.asOfDate);
    const [settings, scope] = await Promise.all([
      this.prisma.inventorySettings.findUnique({
        where: { organizationId },
        select: { valuationMethod: true },
      }),
      this.inventoryScope(organizationId, query),
    ]);

    const movements =
      scope.items.length === 0 || scope.warehouses.length === 0
        ? []
        : await this.prisma.stockMovement.findMany({
            where: {
              organizationId,
              itemId: { in: scope.items.map((item) => item.id) },
              warehouseId: { in: scope.warehouses.map((warehouse) => warehouse.id) },
              movementDate: { lte: asOfDate },
            },
            select: stockMovementSelect,
            orderBy: [{ movementDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
          });

    const grouped = this.groupByItemWarehouse(movements as FifoMovement[]);
    const rows = scope.items.flatMap((item) =>
      scope.warehouses.map((warehouse) => this.previewRow(item, warehouse, grouped.get(this.balanceKey(item.id, warehouse.id)) ?? [])),
    );
    const responseWarnings = [this.warning("PREVIEW_ONLY_NOT_ACCOUNTING_METHOD", "WARNING", previewOnlyMessage(), null, null, null)];
    if (!query.warehouseId && scope.warehouses.length > 1) {
      responseWarnings.push(
        this.warning(
          "MIXED_WAREHOUSE_SCOPE",
          "WARNING",
          "Preview includes multiple warehouses; layers are reconstructed separately for each item and warehouse.",
          null,
          null,
          null,
        ),
      );
    }

    const rowWarnings = rows.flatMap((row) => row.warnings);
    const rowBlockers = rows.flatMap((row) => row.blockers);
    const totals = this.responseTotals(rows, rowWarnings.length + responseWarnings.length, rowBlockers.length);
    return {
      readOnly: true,
      previewOnly: true,
      noMutation: true,
      noPostingEffect: true,
      noInventoryEffect: true,
      noApEffect: true,
      noArEffect: true,
      noVatEffect: true,
      noZatcaEffect: true,
      noFinancialStatementEffect: true,
      generatedAt: new Date().toISOString(),
      asOfDate: asOfDate.toISOString(),
      activeValuationMethod: {
        method: settings?.valuationMethod ?? InventoryValuationMethod.MOVING_AVERAGE,
        note: "Active operational valuation remains moving-average style. FIFO_PREVIEW is informational only and is not the accounting method.",
      },
      previewValuationMethod: "FIFO_PREVIEW",
      filters: {
        itemId: query.itemId ?? null,
        warehouseId: query.warehouseId ?? null,
      },
      rows,
      warnings: [...responseWarnings, ...rowWarnings],
      blockers: rowBlockers,
      totals,
    };
  }

  private previewRow(item: FifoItem, warehouse: FifoWarehouse, movements: FifoMovement[]): InventoryFifoPreviewRow {
    const layers: InternalLayer[] = [];
    const consumedMovements: InventoryFifoPreviewConsumedMovement[] = [];
    const warnings: InventoryFifoPreviewWarning[] = [];
    const blockers: InventoryFifoPreviewWarning[] = [];
    let totalOnHandQuantity = ZERO;

    if (movements.length === 0) {
      warnings.push(this.warning("NO_MOVEMENTS", "WARNING", "No stock movements exist for this item and warehouse scope.", null, item.id, warehouse.id));
    }

    for (const movement of movements) {
      const quantity = this.decimal(movement.quantity);
      if (stockMovementDirection(movement.type) === "IN") {
        totalOnHandQuantity = totalOnHandQuantity.plus(quantity);
        const layerWarnings = this.inboundWarnings(movement);
        warnings.push(...layerWarnings);
        layers.push(this.createLayer(movement, quantity, layerWarnings));
        continue;
      }

      totalOnHandQuantity = totalOnHandQuantity.minus(quantity);
      const consumption = this.consumeLayers(movement, quantity, layers, item.id, warehouse.id);
      consumedMovements.push(consumption);
      warnings.push(...consumption.warnings);
      blockers.push(...consumption.blockers);
    }

    const negativeLayer = layers.find((layer) => layer.remainingQuantityDecimal.lt(0));
    if (negativeLayer) {
      blockers.push(
        this.warning(
          "NEGATIVE_LAYER_QUANTITY",
          "BLOCKER",
          "FIFO preview produced a negative remaining layer quantity; movement history needs review before FIFO can be relied on.",
          negativeLayer.sourceMovementId,
          item.id,
          warehouse.id,
        ),
      );
    }

    const publicLayers = layers.map((layer) => this.publicLayer(layer));
    const fifoPreviewValue = this.fifoPreviewValue(layers, blockers);
    const operationalValue = this.currentOperationalValuationValue(movements, totalOnHandQuantity);
    return {
      item,
      warehouse,
      layers: publicLayers,
      consumedMovements,
      warnings,
      blockers,
      totalOnHandQuantity: this.decimalString(totalOnHandQuantity),
      fifoPreviewValue,
      currentOperationalValuationValue: operationalValue,
      differenceFromCurrentOperationalValuation: fifoPreviewValue !== null && operationalValue !== null ? this.decimalString(this.decimal(fifoPreviewValue).minus(operationalValue)) : null,
    };
  }

  private createLayer(movement: FifoMovement, quantity: Prisma.Decimal, warnings: InventoryFifoPreviewWarning[]): InternalLayer {
    const unitCost = this.movementUnitCost(movement, quantity);
    const layerValue = unitCost ? quantity.mul(unitCost) : null;
    return {
      layerId: `layer:${movement.id}`,
      sourceMovementId: movement.id,
      layerDate: movement.movementDate.toISOString(),
      sourceMovement: this.movementSummary(movement),
      sourceDocument: this.sourceDocument(movement),
      originalQuantity: this.decimalString(quantity),
      consumedQuantity: "0.0000",
      remainingQuantity: this.decimalString(quantity),
      unitCost: unitCost ? this.decimalString(unitCost) : null,
      layerValue: layerValue ? this.decimalString(layerValue) : null,
      warnings,
      originalQuantityDecimal: quantity,
      consumedQuantityDecimal: ZERO,
      remainingQuantityDecimal: quantity,
      unitCostDecimal: unitCost,
    };
  }

  private consumeLayers(
    movement: FifoMovement,
    quantity: Prisma.Decimal,
    layers: InternalLayer[],
    itemId: string,
    warehouseId: string,
  ): InventoryFifoPreviewConsumedMovement {
    const warnings = this.outboundWarnings(movement);
    const blockers: InventoryFifoPreviewWarning[] = [];
    const consumedLayers: InventoryFifoPreviewConsumedLayer[] = [];
    let remainingToConsume = quantity;
    let totalCost: Prisma.Decimal | null = ZERO;

    for (const layer of layers) {
      if (remainingToConsume.lte(0)) break;
      if (layer.remainingQuantityDecimal.lte(0)) continue;

      const consumedQuantity = Prisma.Decimal.min(layer.remainingQuantityDecimal, remainingToConsume);
      const cost = layer.unitCostDecimal ? consumedQuantity.mul(layer.unitCostDecimal) : null;
      if (cost === null) totalCost = null;
      if (totalCost !== null && cost !== null) totalCost = totalCost.plus(cost);
      layer.remainingQuantityDecimal = layer.remainingQuantityDecimal.minus(consumedQuantity);
      layer.consumedQuantityDecimal = layer.consumedQuantityDecimal.plus(consumedQuantity);
      layer.remainingQuantity = this.decimalString(layer.remainingQuantityDecimal);
      layer.consumedQuantity = this.decimalString(layer.consumedQuantityDecimal);
      layer.layerValue = layer.unitCostDecimal ? this.decimalString(layer.remainingQuantityDecimal.mul(layer.unitCostDecimal)) : null;
      consumedLayers.push({
        layerId: layer.layerId,
        sourceMovementId: layer.sourceMovementId,
        consumedQuantity: this.decimalString(consumedQuantity),
        unitCost: layer.unitCostDecimal ? this.decimalString(layer.unitCostDecimal) : null,
        cost: cost ? this.decimalString(cost) : null,
      });
      remainingToConsume = remainingToConsume.minus(consumedQuantity);
    }

    if (remainingToConsume.gt(0)) {
      const message = `Outbound movement ${movement.id} exceeds available FIFO layer quantity by ${this.decimalString(remainingToConsume)}.`;
      blockers.push(this.warning("INSUFFICIENT_LAYER_QUANTITY", "BLOCKER", message, movement.id, itemId, warehouseId));
      blockers.push(
        this.warning(
          "NEGATIVE_LAYER_QUANTITY",
          "BLOCKER",
          "Available FIFO layers cannot cover this outbound movement without a negative layer quantity.",
          movement.id,
          itemId,
          warehouseId,
        ),
      );
      totalCost = null;
    }

    return {
      movementId: movement.id,
      movementDate: movement.movementDate.toISOString(),
      type: movement.type,
      sourceMovement: this.movementSummary(movement),
      sourceDocument: this.sourceDocument(movement),
      consumedQuantity: this.decimalString(quantity),
      consumedLayers,
      estimatedCost: totalCost ? this.decimalString(totalCost) : null,
      warnings,
      blockers,
    };
  }

  private inboundWarnings(movement: FifoMovement): InventoryFifoPreviewWarning[] {
    const warnings: InventoryFifoPreviewWarning[] = [];
    if (!this.movementUnitCost(movement, this.decimal(movement.quantity))) {
      warnings.push(
        this.warning(
          "MISSING_UNIT_COST",
          "WARNING",
          "Inbound movement is missing unit cost or total cost, so FIFO layer value cannot be calculated precisely.",
          movement.id,
          movement.itemId,
          movement.warehouseId,
        ),
      );
    }
    if (movement.type === StockMovementType.SALES_RETURN_IN && !this.movementUnitCost(movement, this.decimal(movement.quantity))) {
      warnings.push(
        this.warning(
          "UNTRACEABLE_SALES_RETURN_COST",
          "WARNING",
          "Sales return inbound cost is not safely traceable from the movement data.",
          movement.id,
          movement.itemId,
          movement.warehouseId,
        ),
      );
    }
    if (movement.type === StockMovementType.TRANSFER_IN && !this.supportedTransferShape(movement)) {
      warnings.push(this.unsupportedTransferWarning(movement));
    }
    return warnings;
  }

  private outboundWarnings(movement: FifoMovement): InventoryFifoPreviewWarning[] {
    const warnings: InventoryFifoPreviewWarning[] = [];
    if (movement.type === StockMovementType.PURCHASE_RETURN_OUT && !this.movementUnitCost(movement, this.decimal(movement.quantity))) {
      warnings.push(
        this.warning(
          "UNTRACEABLE_PURCHASE_RETURN_COST",
          "WARNING",
          "Purchase return outbound movement does not expose a directly traceable unit cost; preview consumes FIFO layers without treating that as accounting evidence.",
          movement.id,
          movement.itemId,
          movement.warehouseId,
        ),
      );
    }
    if (movement.type === StockMovementType.TRANSFER_OUT && !this.supportedTransferShape(movement)) {
      warnings.push(this.unsupportedTransferWarning(movement));
    }
    return warnings;
  }

  private unsupportedTransferWarning(movement: FifoMovement): InventoryFifoPreviewWarning {
    return this.warning(
      "UNSUPPORTED_TRANSFER_SHAPE",
      "WARNING",
      "Transfer movement is not clearly linked to a warehouse transfer record, so transfer cost-layer treatment should be reviewed.",
      movement.id,
      movement.itemId,
      movement.warehouseId,
    );
  }

  private supportedTransferShape(movement: FifoMovement): boolean {
    return movement.referenceId !== null && (movement.referenceType === "WarehouseTransfer" || movement.referenceType === "WarehouseTransferVoid");
  }

  private fifoPreviewValue(layers: InternalLayer[], blockers: InventoryFifoPreviewWarning[]): string | null {
    if (blockers.length > 0) return null;
    let value = ZERO;
    for (const layer of layers) {
      if (layer.remainingQuantityDecimal.lte(0)) continue;
      if (!layer.unitCostDecimal) return null;
      value = value.plus(layer.remainingQuantityDecimal.mul(layer.unitCostDecimal));
    }
    return this.decimalString(value);
  }

  private currentOperationalValuationValue(movements: FifoMovement[], quantityOnHand: Prisma.Decimal): string | null {
    if (quantityOnHand.eq(0)) return "0.0000";
    if (quantityOnHand.lt(0)) return null;
    let costedInQuantity = ZERO;
    let costedInValue = ZERO;
    let missingCost = false;

    for (const movement of movements) {
      if (!STOCK_MOVEMENT_IN_TYPES.has(movement.type)) continue;
      const quantity = this.decimal(movement.quantity);
      const totalCost = this.movementTotalCost(movement, quantity);
      if (quantity.gt(0) && totalCost) {
        costedInQuantity = costedInQuantity.plus(quantity);
        costedInValue = costedInValue.plus(totalCost);
      } else if (quantity.gt(0)) {
        missingCost = true;
      }
    }

    if (missingCost || costedInQuantity.eq(0)) return null;
    return this.decimalString(costedInValue.div(costedInQuantity).mul(quantityOnHand));
  }

  private responseTotals(rows: InventoryFifoPreviewRow[], warningCount: number, blockerCount: number): InventoryFifoPreviewResponse["totals"] {
    const quantity = rows.reduce((sum, row) => sum.plus(row.totalOnHandQuantity), ZERO);
    const fifoValues = rows.map((row) => row.fifoPreviewValue);
    const operationalValues = rows.map((row) => row.currentOperationalValuationValue);
    const fifoTotal = fifoValues.every((value): value is string => value !== null) ? fifoValues.reduce((sum, value) => sum.plus(value), ZERO) : null;
    const operationalTotal = operationalValues.every((value): value is string => value !== null)
      ? operationalValues.reduce((sum, value) => sum.plus(value), ZERO)
      : null;
    return {
      totalOnHandQuantity: this.decimalString(quantity),
      fifoPreviewValue: fifoTotal ? this.decimalString(fifoTotal) : null,
      currentOperationalValuationValue: operationalTotal ? this.decimalString(operationalTotal) : null,
      differenceFromCurrentOperationalValuation: fifoTotal && operationalTotal ? this.decimalString(fifoTotal.minus(operationalTotal)) : null,
      warningCount,
      blockerCount,
    };
  }

  private async inventoryScope(organizationId: string, query: InventoryFifoPreviewQueryDto): Promise<{ items: FifoItem[]; warehouses: FifoWarehouse[] }> {
    const [items, warehouses] = await Promise.all([
      this.prisma.item.findMany({
        where: {
          organizationId,
          inventoryTracking: true,
          ...(query.itemId ? { id: query.itemId } : {}),
        },
        select: itemSelect,
        orderBy: { name: "asc" },
      }),
      this.prisma.warehouse.findMany({
        where: {
          organizationId,
          ...(query.warehouseId ? { id: query.warehouseId } : {}),
        },
        select: warehouseSelect,
        orderBy: [{ isDefault: "desc" }, { code: "asc" }],
      }),
    ]);
    if (query.itemId && items.length === 0) {
      throw new BadRequestException("Item must be inventory-tracked and belong to this organization.");
    }
    if (query.warehouseId && warehouses.length === 0) {
      throw new BadRequestException("Warehouse must belong to this organization.");
    }
    return { items: items as FifoItem[], warehouses: warehouses as FifoWarehouse[] };
  }

  private movementUnitCost(movement: FifoMovement, quantity: Prisma.Decimal): Prisma.Decimal | null {
    if (movement.unitCost !== null) return this.decimal(movement.unitCost);
    if (movement.totalCost !== null && quantity.gt(0)) return this.decimal(movement.totalCost).div(quantity);
    return null;
  }

  private movementTotalCost(movement: FifoMovement, quantity: Prisma.Decimal): Prisma.Decimal | null {
    if (movement.totalCost !== null) return this.decimal(movement.totalCost);
    if (movement.unitCost !== null) return quantity.mul(movement.unitCost);
    return null;
  }

  private movementSummary(movement: FifoMovement): InventoryFifoPreviewMovementSummary {
    const quantity = this.decimal(movement.quantity);
    const unitCost = this.movementUnitCost(movement, quantity);
    const totalCost = this.movementTotalCost(movement, quantity);
    return {
      movementId: movement.id,
      movementDate: movement.movementDate.toISOString(),
      type: movement.type,
      quantity: this.decimalString(quantity),
      unitCost: unitCost ? this.decimalString(unitCost) : null,
      totalCost: totalCost ? this.decimalString(totalCost) : null,
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      description: movement.description,
    };
  }

  private sourceDocument(movement: FifoMovement): InventoryFifoPreviewSourceDocument | null {
    if (!movement.referenceType || !movement.referenceId) return null;
    const hrefByType: Record<string, string | null> = {
      PurchaseReceipt: `/inventory/purchase-receipts/${movement.referenceId}`,
      PurchaseReceiptVoid: `/inventory/purchase-receipts/${movement.referenceId}`,
      SalesStockIssue: `/inventory/sales-stock-issues/${movement.referenceId}`,
      SalesStockIssueVoid: `/inventory/sales-stock-issues/${movement.referenceId}`,
      PurchaseReturn: `/purchases/returns/${movement.referenceId}`,
      SalesInventoryReturn: `/sales/inventory-returns/${movement.referenceId}`,
      InventoryAdjustment: `/inventory/adjustments/${movement.referenceId}`,
      InventoryAdjustmentVoid: `/inventory/adjustments/${movement.referenceId}`,
      WarehouseTransfer: `/inventory/transfers/${movement.referenceId}`,
      WarehouseTransferVoid: `/inventory/transfers/${movement.referenceId}`,
    };
    return {
      type: movement.referenceType,
      id: movement.referenceId,
      href: hrefByType[movement.referenceType] ?? null,
    };
  }

  private publicLayer(layer: InternalLayer): InventoryFifoPreviewLayer {
    return {
      layerId: layer.layerId,
      sourceMovementId: layer.sourceMovementId,
      layerDate: layer.layerDate,
      sourceMovement: layer.sourceMovement,
      sourceDocument: layer.sourceDocument,
      originalQuantity: layer.originalQuantity,
      consumedQuantity: this.decimalString(layer.consumedQuantityDecimal),
      remainingQuantity: this.decimalString(layer.remainingQuantityDecimal),
      unitCost: layer.unitCost,
      layerValue: layer.unitCostDecimal ? this.decimalString(layer.remainingQuantityDecimal.mul(layer.unitCostDecimal)) : null,
      warnings: layer.warnings,
    };
  }

  private groupByItemWarehouse(movements: FifoMovement[]): Map<string, FifoMovement[]> {
    const grouped = new Map<string, FifoMovement[]>();
    for (const movement of movements) {
      if (!STOCK_MOVEMENT_IN_TYPES.has(movement.type) && !STOCK_MOVEMENT_OUT_TYPES.has(movement.type)) continue;
      const key = this.balanceKey(movement.itemId, movement.warehouseId);
      grouped.set(key, [...(grouped.get(key) ?? []), movement]);
    }
    return grouped;
  }

  private parseAsOfDate(value: string | undefined): Date {
    const normalized = value ? (/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value) : new Date().toISOString();
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("Invalid FIFO preview as-of date.");
    }
    return date;
  }

  private warning(
    type: InventoryFifoPreviewWarningType,
    severity: "WARNING" | "BLOCKER",
    message: string,
    movementId: string | null,
    itemId: string | null,
    warehouseId: string | null,
  ): InventoryFifoPreviewWarning {
    return { type, severity, message, movementId, itemId, warehouseId };
  }

  private decimal(value: Prisma.Decimal.Value): Prisma.Decimal {
    return new Prisma.Decimal(value);
  }

  private decimalString(value: Prisma.Decimal.Value): string {
    return this.decimal(value).toFixed(4);
  }

  private balanceKey(itemId: string, warehouseId: string): string {
    return `${itemId}:${warehouseId}`;
  }
}

function previewOnlyMessage(): string {
  return "FIFO preview reconstructs possible cost layers from existing inventory movements. It is read-only and does not change inventory valuation, moving average, COGS, journals, VAT, ZATCA, AP, AR, financial statements, source documents, or stock movements.";
}
