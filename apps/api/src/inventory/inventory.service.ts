import { BadRequestException, Injectable } from "@nestjs/common";
import { InventoryValuationMethod, Prisma, StockMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CsvFile } from "../reports/report-csv";
import { toCsv } from "../reports/report-csv";
import { STOCK_MOVEMENT_IN_TYPES, stockMovementDirection } from "../stock-movements/stock-movement-rules";
import { InventoryBalanceQueryDto } from "./dto/inventory-balance-query.dto";
import { InventoryReportQueryDto } from "./dto/inventory-report-query.dto";
import { UpdateInventorySettingsDto } from "./dto/update-inventory-settings.dto";

const MISSING_COST_WARNING = "Missing unit cost data.";
const FIFO_PLACEHOLDER_WARNING = "FIFO is saved as a placeholder; stock valuation reports use moving-average estimates only.";
const NEGATIVE_STOCK_WARNING = "Negative stock is risky and remains operational-only; accounting posting is not enabled.";
const OPERATIONAL_ONLY_WARNING = "Operational estimate only; no inventory asset, COGS, VAT, or financial statement posting is created.";

type InventorySettingsRecord = {
  id: string;
  organizationId: string;
  valuationMethod: InventoryValuationMethod;
  allowNegativeStock: boolean;
  trackInventoryValue: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MovementForSummary = {
  itemId: string;
  warehouseId: string;
  movementDate?: Date;
  type: StockMovementType;
  quantity: Prisma.Decimal.Value;
  unitCost: Prisma.Decimal.Value | null;
  totalCost: Prisma.Decimal.Value | null;
};

type InventoryScopeQuery = {
  itemId?: string;
  warehouseId?: string;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async settings(organizationId: string) {
    return this.withSettingsWarnings(await this.ensureSettings(organizationId));
  }

  async updateSettings(organizationId: string, dto: UpdateInventorySettingsDto) {
    await this.ensureSettings(organizationId);
    const settings = await this.prisma.inventorySettings.update({
      where: { organizationId },
      data: {
        valuationMethod: dto.valuationMethod,
        allowNegativeStock: dto.allowNegativeStock,
        trackInventoryValue: dto.trackInventoryValue,
      },
    });
    return this.withSettingsWarnings(settings);
  }

  async balances(organizationId: string, query: InventoryBalanceQueryDto) {
    const { items, warehouses } = await this.inventoryScope(organizationId, query);
    if (items.length === 0 || warehouses.length === 0) {
      return [];
    }

    const movements = await this.prisma.stockMovement.findMany({
      where: {
        organizationId,
        itemId: { in: items.map((item) => item.id) },
        warehouseId: { in: warehouses.map((warehouse) => warehouse.id) },
      },
      select: { itemId: true, warehouseId: true, type: true, quantity: true, unitCost: true, totalCost: true },
    });
    const grouped = this.groupByItemWarehouse(movements);

    return items.flatMap((item) =>
      warehouses.map((warehouse) => {
        const summary = this.summarize(grouped.get(this.balanceKey(item.id, warehouse.id)) ?? []);
        return {
          item,
          warehouse,
          quantityOnHand: this.decimalString(summary.quantityOnHand),
          averageUnitCost: summary.averageUnitCost ? this.decimalString(summary.averageUnitCost) : null,
          inventoryValue: summary.inventoryValue ? this.decimalString(summary.inventoryValue) : null,
        };
      }),
    );
  }

  async stockValuationReport(organizationId: string, query: InventoryReportQueryDto = {}) {
    const settings = await this.ensureSettings(organizationId);
    const { items, warehouses } = await this.inventoryScope(organizationId, query);
    const movements =
      items.length === 0 || warehouses.length === 0
        ? []
        : await this.prisma.stockMovement.findMany({
            where: {
              organizationId,
              itemId: { in: items.map((item) => item.id) },
              warehouseId: { in: warehouses.map((warehouse) => warehouse.id) },
            },
            select: { itemId: true, warehouseId: true, type: true, quantity: true, unitCost: true, totalCost: true },
          });
    const grouped = this.groupByItemWarehouse(movements);
    const totalsByItem = new Map<
      string,
      {
        item: (typeof items)[number];
        quantityOnHand: Prisma.Decimal;
        estimatedValue: Prisma.Decimal | null;
        warnings: Set<string>;
      }
    >();

    const rows = items.flatMap((item) =>
      warehouses.map((warehouse) => {
        const summary = this.summarize(grouped.get(this.balanceKey(item.id, warehouse.id)) ?? []);
        const warnings = this.valuationWarnings(summary);
        const existingTotal =
          totalsByItem.get(item.id) ??
          ({
            item,
            quantityOnHand: new Prisma.Decimal(0),
            estimatedValue: new Prisma.Decimal(0),
            warnings: new Set<string>(),
          } satisfies {
            item: (typeof items)[number];
            quantityOnHand: Prisma.Decimal;
            estimatedValue: Prisma.Decimal | null;
            warnings: Set<string>;
          });
        existingTotal.quantityOnHand = existingTotal.quantityOnHand.plus(summary.quantityOnHand);
        existingTotal.estimatedValue =
          existingTotal.estimatedValue && summary.inventoryValue ? existingTotal.estimatedValue.plus(summary.inventoryValue) : null;
        warnings.forEach((warning) => existingTotal.warnings.add(warning));
        totalsByItem.set(item.id, existingTotal);

        return {
          item,
          warehouse,
          quantityOnHand: this.decimalString(summary.quantityOnHand),
          averageUnitCost: summary.averageUnitCost ? this.decimalString(summary.averageUnitCost) : null,
          estimatedValue: summary.inventoryValue ? this.decimalString(summary.inventoryValue) : null,
          warnings,
        };
      }),
    );

    const totalValues = [...totalsByItem.values()].map((total) => total.estimatedValue).filter((value): value is Prisma.Decimal => value !== null);
    const grandTotalEstimatedValue = totalValues.reduce((sum, value) => sum.plus(value), new Prisma.Decimal(0));

    return {
      generatedAt: new Date().toISOString(),
      valuationMethod: settings.valuationMethod,
      calculationMethod: InventoryValuationMethod.MOVING_AVERAGE,
      accountingWarning: OPERATIONAL_ONLY_WARNING,
      warnings: this.reportWarnings(settings),
      rows,
      totalsByItem: [...totalsByItem.values()].map((total) => ({
        item: total.item,
        quantityOnHand: this.decimalString(total.quantityOnHand),
        estimatedValue: total.estimatedValue ? this.decimalString(total.estimatedValue) : null,
        warnings: [...total.warnings],
      })),
      grandTotalEstimatedValue: this.decimalString(grandTotalEstimatedValue),
    };
  }

  async movementSummaryReport(organizationId: string, query: InventoryReportQueryDto = {}) {
    const fromDate = this.parseOptionalDate(query.from, "from", "start");
    const toDate = this.parseOptionalDate(query.to, "to", "end");
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException("Report from date must be before or equal to to date.");
    }

    const { items, warehouses } = await this.inventoryScope(organizationId, query);
    const movements =
      items.length === 0 || warehouses.length === 0
        ? []
        : await this.prisma.stockMovement.findMany({
            where: {
              organizationId,
              itemId: { in: items.map((item) => item.id) },
              warehouseId: { in: warehouses.map((warehouse) => warehouse.id) },
              ...(toDate ? { movementDate: { lte: toDate } } : {}),
            },
            select: { itemId: true, warehouseId: true, movementDate: true, type: true, quantity: true, unitCost: true, totalCost: true },
            orderBy: { movementDate: "asc" },
          });
    const grouped = this.groupByItemWarehouse(movements);

    const totals = {
      openingQuantity: new Prisma.Decimal(0),
      inboundQuantity: new Prisma.Decimal(0),
      outboundQuantity: new Prisma.Decimal(0),
      closingQuantity: new Prisma.Decimal(0),
      movementCount: 0,
    };

    const rows = items.flatMap((item) =>
      warehouses.map((warehouse) => {
        const row = this.summarizeMovementPeriod(grouped.get(this.balanceKey(item.id, warehouse.id)) ?? [], fromDate);
        totals.openingQuantity = totals.openingQuantity.plus(row.openingQuantity);
        totals.inboundQuantity = totals.inboundQuantity.plus(row.inboundQuantity);
        totals.outboundQuantity = totals.outboundQuantity.plus(row.outboundQuantity);
        totals.closingQuantity = totals.closingQuantity.plus(row.closingQuantity);
        totals.movementCount += row.movementCount;

        return {
          item,
          warehouse,
          openingQuantity: this.decimalString(row.openingQuantity),
          inboundQuantity: this.decimalString(row.inboundQuantity),
          outboundQuantity: this.decimalString(row.outboundQuantity),
          closingQuantity: this.decimalString(row.closingQuantity),
          movementCount: row.movementCount,
          movementBreakdown: row.breakdown.map((breakdown) => ({
            type: breakdown.type,
            inboundQuantity: this.decimalString(breakdown.inboundQuantity),
            outboundQuantity: this.decimalString(breakdown.outboundQuantity),
            netQuantity: this.decimalString(breakdown.netQuantity),
            movementCount: breakdown.movementCount,
          })),
        };
      }),
    );

    return {
      generatedAt: new Date().toISOString(),
      from: query.from ?? null,
      to: query.to ?? null,
      itemId: query.itemId ?? null,
      warehouseId: query.warehouseId ?? null,
      accountingWarning: OPERATIONAL_ONLY_WARNING,
      rows,
      totals: {
        openingQuantity: this.decimalString(totals.openingQuantity),
        inboundQuantity: this.decimalString(totals.inboundQuantity),
        outboundQuantity: this.decimalString(totals.outboundQuantity),
        closingQuantity: this.decimalString(totals.closingQuantity),
        movementCount: totals.movementCount,
      },
    };
  }

  async lowStockReport(organizationId: string) {
    const items = await this.prisma.item.findMany({
      where: {
        organizationId,
        inventoryTracking: true,
        reorderPoint: { not: null },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        status: true,
        inventoryTracking: true,
        reorderPoint: true,
        reorderQuantity: true,
      },
      orderBy: { name: "asc" },
    });
    if (items.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        accountingWarning: OPERATIONAL_ONLY_WARNING,
        rows: [],
        totalItems: 0,
      };
    }

    const movements = await this.prisma.stockMovement.findMany({
      where: {
        organizationId,
        itemId: { in: items.map((item) => item.id) },
      },
      select: { itemId: true, warehouseId: true, type: true, quantity: true, unitCost: true, totalCost: true },
    });
    const grouped = new Map<string, MovementForSummary[]>();
    for (const movement of movements) {
      grouped.set(movement.itemId, [...(grouped.get(movement.itemId) ?? []), movement]);
    }

    const rows = items
      .map((item) => {
        const quantityOnHand = this.summarize(grouped.get(item.id) ?? []).quantityOnHand;
        const reorderPoint = item.reorderPoint ? new Prisma.Decimal(item.reorderPoint) : null;
        const reorderQuantity = item.reorderQuantity ? new Prisma.Decimal(item.reorderQuantity) : null;
        if (!reorderPoint || quantityOnHand.gt(reorderPoint)) {
          return null;
        }
        return {
          item,
          quantityOnHand: this.decimalString(quantityOnHand),
          reorderPoint: this.decimalString(reorderPoint),
          reorderQuantity: reorderQuantity ? this.decimalString(reorderQuantity) : null,
          status: quantityOnHand.eq(reorderPoint) ? "AT_REORDER_POINT" : "BELOW_REORDER_POINT",
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    return {
      generatedAt: new Date().toISOString(),
      accountingWarning: OPERATIONAL_ONLY_WARNING,
      rows,
      totalItems: rows.length,
    };
  }

  async stockValuationCsvFile(organizationId: string, query: InventoryReportQueryDto): Promise<CsvFile> {
    const report = await this.stockValuationReport(organizationId, query);
    const rows: unknown[][] = [
      ["Inventory Stock Valuation"],
      ["Generated At", report.generatedAt],
      ["Valuation Method", report.valuationMethod],
      ["Calculation Method", report.calculationMethod],
      ["Warning", report.accountingWarning],
      [],
      ["Item", "SKU", "Warehouse", "Quantity On Hand", "Average Unit Cost", "Estimated Value", "Warnings"],
      ...report.rows.map((row) => [
        row.item.name,
        row.item.sku ?? "",
        row.warehouse.code,
        row.quantityOnHand,
        row.averageUnitCost ?? "",
        row.estimatedValue ?? "",
        row.warnings.join("; "),
      ]),
      [],
      ["Grand Total Estimated Value", report.grandTotalEstimatedValue],
    ];
    return { filename: `inventory-stock-valuation-${filenameDate()}.csv`, content: toCsv(rows) };
  }

  async movementSummaryCsvFile(organizationId: string, query: InventoryReportQueryDto): Promise<CsvFile> {
    const report = await this.movementSummaryReport(organizationId, query);
    const rows: unknown[][] = [
      ["Inventory Movement Summary"],
      ["Generated At", report.generatedAt],
      ["From", report.from ?? ""],
      ["To", report.to ?? ""],
      ["Warning", report.accountingWarning],
      [],
      ["Item", "SKU", "Warehouse", "Opening", "Inbound", "Outbound", "Closing", "Movement Count", "Breakdown"],
      ...report.rows.map((row) => [
        row.item.name,
        row.item.sku ?? "",
        row.warehouse.code,
        row.openingQuantity,
        row.inboundQuantity,
        row.outboundQuantity,
        row.closingQuantity,
        row.movementCount,
        row.movementBreakdown.map((breakdown) => `${breakdown.type}: ${breakdown.netQuantity}`).join("; "),
      ]),
      [],
      [
        "Totals",
        "",
        "",
        report.totals.openingQuantity,
        report.totals.inboundQuantity,
        report.totals.outboundQuantity,
        report.totals.closingQuantity,
        report.totals.movementCount,
      ],
    ];
    return { filename: `inventory-movement-summary-${filenameDate()}.csv`, content: toCsv(rows) };
  }

  async lowStockCsvFile(organizationId: string): Promise<CsvFile> {
    const report = await this.lowStockReport(organizationId);
    const rows: unknown[][] = [
      ["Inventory Low Stock"],
      ["Generated At", report.generatedAt],
      ["Warning", report.accountingWarning],
      [],
      ["Item", "SKU", "Quantity On Hand", "Reorder Point", "Reorder Quantity", "Status"],
      ...report.rows.map((row) => [
        row.item.name,
        row.item.sku ?? "",
        row.quantityOnHand,
        row.reorderPoint,
        row.reorderQuantity ?? "",
        row.status,
      ]),
    ];
    return { filename: `inventory-low-stock-${filenameDate()}.csv`, content: toCsv(rows) };
  }

  private async ensureSettings(organizationId: string) {
    const existing = await this.prisma.inventorySettings.findUnique({ where: { organizationId } });
    if (existing) {
      return existing;
    }
    return this.prisma.inventorySettings.create({ data: { organizationId } });
  }

  private withSettingsWarnings(settings: InventorySettingsRecord) {
    return {
      ...settings,
      warnings: this.settingsWarnings(settings),
    };
  }

  private settingsWarnings(settings: { valuationMethod: InventoryValuationMethod; allowNegativeStock: boolean }) {
    const warnings: string[] = [];
    if (settings.valuationMethod === InventoryValuationMethod.FIFO_PLACEHOLDER) {
      warnings.push(FIFO_PLACEHOLDER_WARNING);
    }
    if (settings.allowNegativeStock) {
      warnings.push(NEGATIVE_STOCK_WARNING);
    }
    warnings.push(OPERATIONAL_ONLY_WARNING);
    return warnings;
  }

  private reportWarnings(settings: { valuationMethod: InventoryValuationMethod; allowNegativeStock: boolean }) {
    return this.settingsWarnings(settings);
  }

  private async inventoryScope(organizationId: string, query: InventoryScopeQuery) {
    const items = await this.prisma.item.findMany({
      where: {
        organizationId,
        inventoryTracking: true,
        ...(query.itemId ? { id: query.itemId } : {}),
      },
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        status: true,
        inventoryTracking: true,
        reorderPoint: true,
        reorderQuantity: true,
      },
      orderBy: { name: "asc" },
    });
    if (query.itemId && items.length === 0) {
      throw new BadRequestException("Item must be inventory-tracked and belong to this organization.");
    }

    const warehouses = await this.prisma.warehouse.findMany({
      where: {
        organizationId,
        ...(query.warehouseId ? { id: query.warehouseId } : {}),
      },
      select: { id: true, code: true, name: true, status: true, isDefault: true },
      orderBy: [{ isDefault: "desc" }, { code: "asc" }],
    });
    if (query.warehouseId && warehouses.length === 0) {
      throw new BadRequestException("Warehouse must belong to this organization.");
    }

    return { items, warehouses };
  }

  private summarize(
    movements: Array<{
      type: StockMovementType;
      quantity: Prisma.Decimal.Value;
      unitCost: Prisma.Decimal.Value | null;
      totalCost: Prisma.Decimal.Value | null;
    }>,
  ): { quantityOnHand: Prisma.Decimal; averageUnitCost: Prisma.Decimal | null; inventoryValue: Prisma.Decimal | null; missingCostData: boolean } {
    let quantityOnHand = new Prisma.Decimal(0);
    let costedInQuantity = new Prisma.Decimal(0);
    let costedInValue = new Prisma.Decimal(0);
    let missingCostData = false;

    for (const movement of movements) {
      const quantity = new Prisma.Decimal(movement.quantity);
      if (stockMovementDirection(movement.type) === "IN") {
        quantityOnHand = quantityOnHand.plus(quantity);
      } else {
        quantityOnHand = quantityOnHand.minus(quantity);
      }

      if (STOCK_MOVEMENT_IN_TYPES.has(movement.type)) {
        const totalCost = this.movementTotalCost(quantity, movement.unitCost, movement.totalCost);
        if (quantity.gt(0) && totalCost?.gt(0)) {
          costedInQuantity = costedInQuantity.plus(quantity);
          costedInValue = costedInValue.plus(totalCost);
        } else if (quantity.gt(0)) {
          missingCostData = true;
        }
      }
    }

    const averageUnitCost = costedInQuantity.gt(0) ? costedInValue.div(costedInQuantity) : null;
    return {
      quantityOnHand,
      averageUnitCost,
      inventoryValue: averageUnitCost ? averageUnitCost.mul(quantityOnHand) : null,
      missingCostData,
    };
  }

  private summarizeMovementPeriod(movements: MovementForSummary[], fromDate: Date | null) {
    let openingQuantity = new Prisma.Decimal(0);
    let inboundQuantity = new Prisma.Decimal(0);
    let outboundQuantity = new Prisma.Decimal(0);
    let movementCount = 0;
    const breakdown = new Map<
      StockMovementType,
      { type: StockMovementType; inboundQuantity: Prisma.Decimal; outboundQuantity: Prisma.Decimal; netQuantity: Prisma.Decimal; movementCount: number }
    >();

    for (const movement of movements) {
      const quantity = new Prisma.Decimal(movement.quantity);
      const direction = stockMovementDirection(movement.type);
      if (fromDate && movement.movementDate && movement.movementDate < fromDate) {
        openingQuantity = direction === "IN" ? openingQuantity.plus(quantity) : openingQuantity.minus(quantity);
        continue;
      }

      movementCount += 1;
      const existing =
        breakdown.get(movement.type) ?? {
          type: movement.type,
          inboundQuantity: new Prisma.Decimal(0),
          outboundQuantity: new Prisma.Decimal(0),
          netQuantity: new Prisma.Decimal(0),
          movementCount: 0,
        };
      existing.movementCount += 1;

      if (direction === "IN") {
        inboundQuantity = inboundQuantity.plus(quantity);
        existing.inboundQuantity = existing.inboundQuantity.plus(quantity);
        existing.netQuantity = existing.netQuantity.plus(quantity);
      } else {
        outboundQuantity = outboundQuantity.plus(quantity);
        existing.outboundQuantity = existing.outboundQuantity.plus(quantity);
        existing.netQuantity = existing.netQuantity.minus(quantity);
      }
      breakdown.set(movement.type, existing);
    }

    return {
      openingQuantity,
      inboundQuantity,
      outboundQuantity,
      closingQuantity: openingQuantity.plus(inboundQuantity).minus(outboundQuantity),
      movementCount,
      breakdown: [...breakdown.values()].sort((a, b) => a.type.localeCompare(b.type)),
    };
  }

  private valuationWarnings(summary: { quantityOnHand: Prisma.Decimal; averageUnitCost: Prisma.Decimal | null; missingCostData: boolean }): string[] {
    const warnings: string[] = [];
    if ((!summary.quantityOnHand.eq(0) && !summary.averageUnitCost) || summary.missingCostData) {
      warnings.push(MISSING_COST_WARNING);
    }
    return warnings;
  }

  private movementTotalCost(
    quantity: Prisma.Decimal,
    unitCost: Prisma.Decimal.Value | null,
    totalCost: Prisma.Decimal.Value | null,
  ): Prisma.Decimal | null {
    if (totalCost !== null) {
      return new Prisma.Decimal(totalCost);
    }
    if (unitCost !== null) {
      return quantity.mul(unitCost);
    }
    return null;
  }

  private groupByItemWarehouse<T extends MovementForSummary>(movements: T[]): Map<string, T[]> {
    const grouped = new Map<string, T[]>();
    for (const movement of movements) {
      const key = this.balanceKey(movement.itemId, movement.warehouseId);
      grouped.set(key, [...(grouped.get(key) ?? []), movement]);
    }
    return grouped;
  }

  private parseOptionalDate(value: string | undefined, label: string, boundary: "start" | "end"): Date | null {
    if (!value) {
      return null;
    }
    const normalized =
      /^\d{4}-\d{2}-\d{2}$/.test(value) && boundary === "start"
        ? `${value}T00:00:00.000Z`
        : /^\d{4}-\d{2}-\d{2}$/.test(value)
          ? `${value}T23:59:59.999Z`
          : value;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${label} date.`);
    }
    return date;
  }

  private decimalString(value: Prisma.Decimal): string {
    return value.toFixed(4);
  }

  private balanceKey(itemId: string, warehouseId: string): string {
    return `${itemId}:${warehouseId}`;
  }
}

function filenameDate(value = new Date()): string {
  return value.toISOString().slice(0, 10);
}
