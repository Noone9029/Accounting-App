import { InventoryValuationMethod, ItemStatus, ItemType, Prisma, StockMovementType, WarehouseStatus } from "@prisma/client";
import { InventoryService } from "./inventory.service";

describe("InventoryService", () => {
  const item = {
    id: "item-1",
    name: "Tracked Item",
    sku: "TRK",
    type: ItemType.PRODUCT,
    status: ItemStatus.ACTIVE,
    inventoryTracking: true,
    reorderPoint: new Prisma.Decimal("15.0000"),
    reorderQuantity: new Prisma.Decimal("5.0000"),
  };
  const warehouse = { id: "warehouse-1", code: "MAIN", name: "Main", status: WarehouseStatus.ACTIVE, isDefault: true };
  const settings = {
    id: "settings-1",
    organizationId: "org-1",
    valuationMethod: InventoryValuationMethod.MOVING_AVERAGE,
    allowNegativeStock: false,
    trackInventoryValue: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      item: { findMany: jest.fn().mockResolvedValue([item]) },
      warehouse: { findMany: jest.fn().mockResolvedValue([warehouse]) },
      stockMovement: { findMany: jest.fn().mockResolvedValue([]) },
      inventorySettings: {
        findUnique: jest.fn().mockResolvedValue(settings),
        create: jest.fn().mockResolvedValue(settings),
        update: jest.fn().mockResolvedValue(settings),
      },
      ...overrides,
    };
    return { service: new InventoryService(prisma as never), prisma };
  }

  it("creates default inventory settings when missing", async () => {
    const { service, prisma } = makeService();
    prisma.inventorySettings.findUnique.mockResolvedValue(null);

    await expect(service.settings("org-1")).resolves.toEqual(expect.objectContaining({ valuationMethod: InventoryValuationMethod.MOVING_AVERAGE }));
    expect(prisma.inventorySettings.create).toHaveBeenCalledWith({ data: { organizationId: "org-1" } });
  });

  it("rejects unsupported FIFO and negative-stock settings", async () => {
    const { service, prisma } = makeService();
    await expect(service.updateSettings("org-1", {
      valuationMethod: InventoryValuationMethod.FIFO_PLACEHOLDER,
    })).rejects.toThrow();
    await expect(service.updateSettings("org-1", { allowNegativeStock: true })).rejects.toThrow();
    expect(prisma.inventorySettings.update).not.toHaveBeenCalled();
  });

  it("calculates quantity on hand by item and warehouse", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.findMany.mockResolvedValue([
      valued(movement(StockMovementType.OPENING_BALANCE, "10", "5", "50"), 1, "10", "50"),
      valued(movement(StockMovementType.ADJUSTMENT_IN, "2", "6", "12"), 2, "12", "62"),
      valued(movement(StockMovementType.ADJUSTMENT_OUT, "3", "5.1667", "15.5"), 3, "9", "46.5"),
      valued(movement(StockMovementType.TRANSFER_IN, "4", "5.5", "22"), 4, "13", "68.5"),
      valued(movement(StockMovementType.TRANSFER_OUT, "1", "5.2692", "5.2692"), 5, "12", "63.2308"),
    ]);

    await expect(service.balances("org-1", {})).resolves.toEqual([
      expect.objectContaining({
        item,
        warehouse,
        quantityOnHand: "12.0000",
        averageUnitCost: "5.2692",
        inventoryValue: "63.2308",
      }),
    ]);
  });

  it("uses immutable movement snapshots for stock valuation", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.findMany.mockResolvedValue([
      valued(movement(StockMovementType.OPENING_BALANCE, "10", "5", "50"), 1, "10", "50"),
      valued(movement(StockMovementType.ADJUSTMENT_IN, "2", "6", "12"), 2, "12", "62"),
      valued(movement(StockMovementType.ADJUSTMENT_OUT, "3", "5.1667", "15.5"), 3, "9", "46.5"),
    ]);

    const report = await service.stockValuationReport("org-1");

    expect(report.rows[0]).toEqual(
      expect.objectContaining({
        quantityOnHand: "9.0000",
        averageUnitCost: "5.1667",
        estimatedValue: "46.5000",
        warnings: [],
      }),
    );
    expect(report.grandTotalEstimatedValue).toBe("46.5000");
  });

  it("warns when stock valuation is missing unit cost data", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.findMany.mockResolvedValue([movement(StockMovementType.OPENING_BALANCE, "5.0000")]);

    const report = await service.stockValuationReport("org-1");

    expect(report.rows[0]).toEqual(
      expect.objectContaining({
        averageUnitCost: null,
        estimatedValue: null,
        warnings: ["Inventory contains legacy or unvalued movements; accountant-reviewed valuation cutover is required."],
      }),
    );
  });

  it("summarizes movement opening, inbound, outbound, closing, and breakdown", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.findMany.mockResolvedValue([
      movement(StockMovementType.OPENING_BALANCE, "10.0000", "5.0000", "50.0000", "2026-01-01T00:00:00.000Z"),
      movement(StockMovementType.ADJUSTMENT_IN, "2.0000", "6.0000", "12.0000", "2026-01-03T00:00:00.000Z"),
      movement(StockMovementType.ADJUSTMENT_OUT, "3.0000", null, null, "2026-01-04T00:00:00.000Z"),
    ]);

    const report = await service.movementSummaryReport("org-1", { from: "2026-01-02", to: "2026-01-05" });

    expect(report.rows[0]).toEqual(
      expect.objectContaining({
        openingQuantity: "10.0000",
        inboundQuantity: "2.0000",
        outboundQuantity: "3.0000",
        closingQuantity: "9.0000",
        movementCount: 2,
      }),
    );
    const row = required(report.rows[0]);
    expect(row.movementBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: StockMovementType.ADJUSTMENT_IN, inboundQuantity: "2.0000", netQuantity: "2.0000" }),
        expect.objectContaining({ type: StockMovementType.ADJUSTMENT_OUT, outboundQuantity: "3.0000", netQuantity: "-3.0000" }),
      ]),
    );
  });

  it("detects tracked items below reorder point", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.findMany.mockResolvedValue([movement(StockMovementType.OPENING_BALANCE, "10.0000", "5.0000", "50.0000")]);

    const report = await service.lowStockReport("org-1");

    expect(report.rows).toEqual([
      expect.objectContaining({
        item,
        quantityOnHand: "10.0000",
        reorderPoint: "15.0000",
        reorderQuantity: "5.0000",
        status: "BELOW_REORDER_POINT",
      }),
    ]);
  });

  it("excludes non-tracked items from inventory reports", async () => {
    const { service, prisma } = makeService();
    prisma.item.findMany.mockResolvedValue([]);

    await expect(service.stockValuationReport("org-1")).resolves.toEqual(expect.objectContaining({ rows: [] }));
    expect(prisma.item.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ inventoryTracking: true }) }));
  });

  it("keeps tenant isolation by rejecting unknown item filters", async () => {
    const { service, prisma } = makeService();
    prisma.item.findMany.mockResolvedValue([]);

    await expect(service.balances("org-2", { itemId: "item-1" })).rejects.toThrow(
      "Item must be inventory-tracked and belong to this organization.",
    );
  });

  function required<T>(value: T | undefined): T {
    if (value === undefined) {
      throw new Error("Expected value to be present.");
    }
    return value;
  }

  function valued(record: ReturnType<typeof movement>, sequence: number, quantity: string, value: string) {
    return { ...record, valuationVersion: 1, valuationSequence: sequence, valuationQuantityAfter: new Prisma.Decimal(quantity), valuationValueAfter: new Prisma.Decimal(value) };
  }

  function movement(type: StockMovementType, quantity: string, unitCost?: string | null, totalCost?: string | null, movementDate?: string) {
    return {
      itemId: item.id,
      warehouseId: warehouse.id,
      movementDate: movementDate ? new Date(movementDate) : undefined,
      type,
      quantity: new Prisma.Decimal(quantity),
      unitCost: unitCost ? new Prisma.Decimal(unitCost) : null,
      totalCost: totalCost ? new Prisma.Decimal(totalCost) : null,
    };
  }
});
