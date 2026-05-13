import { ItemStatus, ItemType, Prisma, StockMovementType, WarehouseStatus } from "@prisma/client";
import { StockMovementService } from "./stock-movement.service";

describe("StockMovementService", () => {
  const item = {
    id: "item-1",
    organizationId: "org-1",
    name: "Tracked Item",
    sku: "TRK",
    type: ItemType.PRODUCT,
    status: ItemStatus.ACTIVE,
    inventoryTracking: true,
  };
  const warehouse = { id: "warehouse-1", organizationId: "org-1", code: "MAIN", name: "Main", status: WarehouseStatus.ACTIVE };
  const movement = {
    id: "movement-1",
    organizationId: "org-1",
    itemId: item.id,
    warehouseId: warehouse.id,
    movementDate: new Date("2026-05-13T00:00:00.000Z"),
    type: StockMovementType.OPENING_BALANCE,
    quantity: new Prisma.Decimal("10.0000"),
    unitCost: new Prisma.Decimal("5.0000"),
    totalCost: new Prisma.Decimal("50.0000"),
  };

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      item: { findFirst: jest.fn().mockResolvedValue(item) },
      warehouse: { findFirst: jest.fn().mockResolvedValue(warehouse) },
      stockMovement: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue(movement),
        count: jest.fn().mockResolvedValue(0),
      },
      ...overrides,
    };
    const audit = { log: jest.fn() };
    return { service: new StockMovementService(prisma as never, audit as never), prisma, audit };
  }

  it("creates an opening balance for an inventory-tracked item", async () => {
    const { service, prisma, audit } = makeService();

    await expect(
      service.create("org-1", "user-1", {
        itemId: item.id,
        warehouseId: warehouse.id,
        movementDate: "2026-05-13",
        type: StockMovementType.OPENING_BALANCE,
        quantity: "10.0000",
        unitCost: "5.0000",
      }),
    ).resolves.toMatchObject({ id: "movement-1", type: StockMovementType.OPENING_BALANCE });
    expect(prisma.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quantity: "10.0000", unitCost: "5.0000", totalCost: "50.0000", createdById: "user-1" }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "StockMovement" }));
  });

  it("rejects stock movement for a non-tracked item", async () => {
    const { service, prisma } = makeService();
    prisma.item.findFirst.mockResolvedValue({ ...item, inventoryTracking: false });

    await expect(
      service.create("org-1", "user-1", {
        itemId: item.id,
        warehouseId: warehouse.id,
        movementDate: "2026-05-13",
        type: StockMovementType.OPENING_BALANCE,
        quantity: "1.0000",
      }),
    ).rejects.toThrow("Stock movements can only be created for inventory-tracked items.");
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
  });

  it("rejects movement into an archived warehouse", async () => {
    const { service, prisma } = makeService();
    prisma.warehouse.findFirst.mockResolvedValue({ ...warehouse, status: WarehouseStatus.ARCHIVED });

    await expect(
      service.create("org-1", "user-1", {
        itemId: item.id,
        warehouseId: warehouse.id,
        movementDate: "2026-05-13",
        type: StockMovementType.OPENING_BALANCE,
        quantity: "1.0000",
      }),
    ).rejects.toThrow("Archived warehouses cannot receive stock movements.");
  });

  it("rejects duplicate opening balance for the same item and warehouse", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.count.mockResolvedValue(1);

    await expect(
      service.create("org-1", "user-1", {
        itemId: item.id,
        warehouseId: warehouse.id,
        movementDate: "2026-05-13",
        type: StockMovementType.OPENING_BALANCE,
        quantity: "1.0000",
      }),
    ).rejects.toThrow("Opening balance already exists for this item and warehouse.");
  });

  it("rejects direct adjustment movements so approvals own the lifecycle", async () => {
    const { service, prisma } = makeService();

    await expect(
      service.create("org-1", "user-1", {
        itemId: item.id,
        warehouseId: warehouse.id,
        movementDate: "2026-05-13",
        type: StockMovementType.ADJUSTMENT_OUT,
        quantity: "1.0000",
      }),
    ).rejects.toThrow(
      "Only opening balance stock movements can be created directly. Use inventory adjustments for adjustment in/out movements.",
    );
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
  });

  it("calculates quantity on hand from movement directions", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.findMany.mockResolvedValue([
      { type: StockMovementType.OPENING_BALANCE, quantity: new Prisma.Decimal("10.0000") },
      { type: StockMovementType.ADJUSTMENT_IN, quantity: new Prisma.Decimal("2.0000") },
      { type: StockMovementType.ADJUSTMENT_OUT, quantity: new Prisma.Decimal("3.0000") },
      { type: StockMovementType.TRANSFER_OUT, quantity: new Prisma.Decimal("1.0000") },
      { type: StockMovementType.TRANSFER_IN, quantity: new Prisma.Decimal("4.0000") },
    ]);

    const quantityOnHand = await service.quantityOnHand("org-1", item.id, warehouse.id);
    expect(quantityOnHand.toFixed(4)).toBe("12.0000");
  });
});
