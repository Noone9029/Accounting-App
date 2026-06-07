import { BadRequestException } from "@nestjs/common";
import { InventoryValuationMethod, ItemStatus, ItemType, Prisma, StockMovementType, WarehouseStatus } from "@prisma/client";
import { InventoryFifoPreviewService } from "./inventory-fifo-preview.service";

describe("InventoryFifoPreviewService", () => {
  const item = {
    id: "item-1",
    name: "Tracked Item",
    sku: "TRK",
    type: ItemType.PRODUCT,
    status: ItemStatus.ACTIVE,
    inventoryTracking: true,
    reorderPoint: null,
    reorderQuantity: null,
  };
  const secondItem = { ...item, id: "item-2", name: "Second Item", sku: "SND" };
  const warehouse = { id: "warehouse-1", code: "MAIN", name: "Main", status: WarehouseStatus.ACTIVE, isDefault: true };
  const secondWarehouse = { ...warehouse, id: "warehouse-2", code: "WH2", name: "Second", isDefault: false };

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      item: { findMany: jest.fn().mockResolvedValue([item]) },
      warehouse: { findMany: jest.fn().mockResolvedValue([warehouse]) },
      inventorySettings: {
        findUnique: jest.fn().mockResolvedValue({
          valuationMethod: InventoryValuationMethod.MOVING_AVERAGE,
          allowNegativeStock: false,
          trackInventoryValue: true,
        }),
        create: jest.fn(),
        update: jest.fn(),
      },
      stockMovement: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      journalEntry: { create: jest.fn(), update: jest.fn() },
      purchaseReceipt: { update: jest.fn() },
      purchaseBill: { update: jest.fn() },
      purchaseReturn: { update: jest.fn() },
      salesInventoryReturn: { update: jest.fn() },
      ...overrides,
    };
    return { service: new InventoryFifoPreviewService(prisma as never), prisma };
  }

  it("creates FIFO layers from inbound movements", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.findMany.mockResolvedValue([
      movement({ type: StockMovementType.OPENING_BALANCE, quantity: "10.0000", unitCost: "5.0000" }),
    ]);

    const preview = await service.preview("org-1", { itemId: item.id, warehouseId: warehouse.id });
    const row = preview.rows[0]!;

    expect(row.layers).toEqual([
      expect.objectContaining({
        sourceMovementId: "movement-1",
        originalQuantity: "10.0000",
        remainingQuantity: "10.0000",
        unitCost: "5.0000",
        layerValue: "50.0000",
      }),
    ]);
    expect(row.totalOnHandQuantity).toBe("10.0000");
    expect(row.fifoPreviewValue).toBe("50.0000");
  });

  it("consumes the oldest layer first for outbound movements", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.findMany.mockResolvedValue([
      movement({ id: "in-old", type: StockMovementType.OPENING_BALANCE, quantity: "5.0000", unitCost: "4.0000", movementDate: "2026-01-01T00:00:00.000Z" }),
      movement({ id: "in-new", type: StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER, quantity: "5.0000", unitCost: "6.0000", movementDate: "2026-01-02T00:00:00.000Z" }),
      movement({ id: "out-1", type: StockMovementType.SALES_ISSUE_PLACEHOLDER, quantity: "7.0000", movementDate: "2026-01-03T00:00:00.000Z" }),
    ]);

    const preview = await service.preview("org-1", { itemId: item.id, warehouseId: warehouse.id });
    const row = preview.rows[0]!;

    expect(row.consumedMovements).toEqual([
      expect.objectContaining({
        movementId: "out-1",
        consumedQuantity: "7.0000",
        estimatedCost: "32.0000",
        consumedLayers: [
          expect.objectContaining({ sourceMovementId: "in-old", consumedQuantity: "5.0000", unitCost: "4.0000", cost: "20.0000" }),
          expect.objectContaining({ sourceMovementId: "in-new", consumedQuantity: "2.0000", unitCost: "6.0000", cost: "12.0000" }),
        ],
      }),
    ]);
    expect(row.layers.map((layer) => ({ id: layer.sourceMovementId, remaining: layer.remainingQuantity }))).toEqual([
      { id: "in-old", remaining: "0.0000" },
      { id: "in-new", remaining: "3.0000" },
    ]);
    expect(row.fifoPreviewValue).toBe("18.0000");
  });

  it("consumes multiple inbound layers in FIFO order", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.findMany.mockResolvedValue([
      movement({ id: "layer-1", type: StockMovementType.OPENING_BALANCE, quantity: "3.0000", unitCost: "2.0000", movementDate: "2026-01-01T00:00:00.000Z" }),
      movement({ id: "layer-2", type: StockMovementType.ADJUSTMENT_IN, quantity: "4.0000", unitCost: "3.0000", movementDate: "2026-01-02T00:00:00.000Z" }),
      movement({ id: "layer-3", type: StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER, quantity: "5.0000", unitCost: "4.0000", movementDate: "2026-01-03T00:00:00.000Z" }),
      movement({ id: "out-1", type: StockMovementType.ADJUSTMENT_OUT, quantity: "8.0000", movementDate: "2026-01-04T00:00:00.000Z" }),
    ]);

    const preview = await service.preview("org-1", { itemId: item.id, warehouseId: warehouse.id });

    const row = preview.rows[0]!;
    expect(row.consumedMovements[0]!.consumedLayers.map((layer) => layer.sourceMovementId)).toEqual(["layer-1", "layer-2", "layer-3"]);
    expect(row.fifoPreviewValue).toBe("16.0000");
  });

  it("warns when purchase return cost is not safely traceable but still consumes FIFO layers", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.findMany.mockResolvedValue([
      movement({ id: "in-1", type: StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER, quantity: "5.0000", unitCost: "8.0000" }),
      movement({ id: "return-out", type: StockMovementType.PURCHASE_RETURN_OUT, quantity: "2.0000", unitCost: null, referenceType: "PurchaseReturn" }),
    ]);

    const preview = await service.preview("org-1", { itemId: item.id, warehouseId: warehouse.id });

    const row = preview.rows[0]!;
    expect(row.consumedMovements[0]!.estimatedCost).toBe("16.0000");
    expect(row.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ type: "UNTRACEABLE_PURCHASE_RETURN_COST" })]));
  });

  it("warns when sales return inbound cost is unavailable", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.findMany.mockResolvedValue([
      movement({ id: "sales-return", type: StockMovementType.SALES_RETURN_IN, quantity: "2.0000", unitCost: null, referenceType: "SalesInventoryReturn" }),
    ]);

    const preview = await service.preview("org-1", { itemId: item.id, warehouseId: warehouse.id });

    const row = preview.rows[0]!;
    expect(row.layers[0]).toEqual(expect.objectContaining({ unitCost: null, layerValue: null }));
    expect(row.fifoPreviewValue).toBeNull();
    expect(row.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ type: "MISSING_UNIT_COST" }), expect.objectContaining({ type: "UNTRACEABLE_SALES_RETURN_COST" })]));
  });

  it("warns when inbound unit cost is missing", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.findMany.mockResolvedValue([
      movement({ type: StockMovementType.OPENING_BALANCE, quantity: "10.0000", unitCost: null }),
    ]);

    const preview = await service.preview("org-1", { itemId: item.id, warehouseId: warehouse.id });

    const row = preview.rows[0]!;
    expect(row.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ type: "MISSING_UNIT_COST" })]));
    expect(row.fifoPreviewValue).toBeNull();
  });

  it("adds an insufficient quantity blocker when outbound movement exceeds available layers", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.findMany.mockResolvedValue([
      movement({ type: StockMovementType.OPENING_BALANCE, quantity: "1.0000", unitCost: "5.0000" }),
      movement({ id: "out-1", type: StockMovementType.SALES_ISSUE_PLACEHOLDER, quantity: "3.0000" }),
    ]);

    const preview = await service.preview("org-1", { itemId: item.id, warehouseId: warehouse.id });

    const row = preview.rows[0]!;
    expect(row.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ type: "INSUFFICIENT_LAYER_QUANTITY" })]));
    expect(row.totalOnHandQuantity).toBe("-2.0000");
  });

  it("applies item and warehouse filters to scoped reads", async () => {
    const { service, prisma } = makeService({
      item: { findMany: jest.fn().mockResolvedValue([secondItem]) },
      warehouse: { findMany: jest.fn().mockResolvedValue([secondWarehouse]) },
    });

    await service.preview("org-1", { itemId: secondItem.id, warehouseId: secondWarehouse.id });

    expect(prisma.item.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: secondItem.id }) }));
    expect(prisma.warehouse.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: secondWarehouse.id }) }));
    expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          itemId: { in: [secondItem.id] },
          warehouseId: { in: [secondWarehouse.id] },
        }),
      }),
    );
  });

  it("filters movements by as-of date", async () => {
    const { service, prisma } = makeService();

    await service.preview("org-1", { asOfDate: "2026-02-15" });

    expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          movementDate: { lte: new Date("2026-02-15T23:59:59.999Z") },
        }),
      }),
    );
  });

  it("returns no-movement warnings for empty item/warehouse scopes", async () => {
    const { service } = makeService();

    const preview = await service.preview("org-1", { itemId: item.id, warehouseId: warehouse.id });

    const row = preview.rows[0]!;
    expect(row.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ type: "NO_MOVEMENTS" })]));
    expect(row.totalOnHandQuantity).toBe("0.0000");
  });

  it("rejects unknown item or warehouse filters without creating settings", async () => {
    const { service, prisma } = makeService({
      item: { findMany: jest.fn().mockResolvedValue([]) },
    });

    await expect(service.preview("org-1", { itemId: "missing-item" })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.inventorySettings.create).not.toHaveBeenCalled();
  });

  it("does not mutate stock, documents, journals, valuation, AP, AR, VAT, or ZATCA state", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.findMany.mockResolvedValue([
      movement({ type: StockMovementType.OPENING_BALANCE, quantity: "10.0000", unitCost: "5.0000" }),
    ]);

    const preview = await service.preview("org-1", { itemId: item.id, warehouseId: warehouse.id });

    expect(preview.noMutation).toBe(true);
    expect(preview.noPostingEffect).toBe(true);
    expect(preview.noInventoryEffect).toBe(true);
    expect(preview.noApEffect).toBe(true);
    expect(preview.noArEffect).toBe(true);
    expect(preview.noVatEffect).toBe(true);
    expect(preview.noZatcaEffect).toBe(true);
    expect(preview.noFinancialStatementEffect).toBe(true);
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    expect(prisma.stockMovement.update).not.toHaveBeenCalled();
    expect(prisma.stockMovement.updateMany).not.toHaveBeenCalled();
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    expect(prisma.purchaseReceipt.update).not.toHaveBeenCalled();
    expect(prisma.purchaseBill.update).not.toHaveBeenCalled();
    expect(prisma.purchaseReturn.update).not.toHaveBeenCalled();
    expect(prisma.salesInventoryReturn.update).not.toHaveBeenCalled();
  });

  type TestMovement = ReturnType<typeof movementBase>;
  type TestMovementOverride = Omit<Partial<TestMovement>, "movementDate" | "quantity" | "unitCost" | "totalCost" | "type"> & {
    movementDate?: Date | string;
    quantity?: Prisma.Decimal.Value;
    unitCost?: Prisma.Decimal.Value | null;
    totalCost?: Prisma.Decimal.Value | null;
    type?: StockMovementType;
  };

  function movement(overrides: TestMovementOverride = {}) {
    const base = movementBase();
    return {
      ...base,
      ...overrides,
      type: overrides.type ?? base.type,
      movementDate: overrides.movementDate ? new Date(overrides.movementDate) : base.movementDate,
      quantity: new Prisma.Decimal(overrides.quantity ?? base.quantity),
      unitCost: overrides.unitCost === undefined ? base.unitCost : overrides.unitCost === null ? null : new Prisma.Decimal(overrides.unitCost),
      totalCost: overrides.totalCost === undefined ? base.totalCost : overrides.totalCost === null ? null : new Prisma.Decimal(overrides.totalCost),
    };
  }

  function movementBase() {
    return {
      id: "movement-1",
      itemId: item.id,
      warehouseId: warehouse.id,
      movementDate: new Date("2026-01-01T00:00:00.000Z"),
      type: StockMovementType.OPENING_BALANCE,
      quantity: new Prisma.Decimal("10.0000"),
      unitCost: new Prisma.Decimal("5.0000") as Prisma.Decimal | null,
      totalCost: null as Prisma.Decimal | null,
      referenceType: null as string | null,
      referenceId: null as string | null,
      description: null as string | null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      item,
      warehouse,
    };
  }
});
