import { ItemStatus, ItemType, Prisma, StockMovementType, WarehouseStatus } from "@prisma/client";
import { InventoryService } from "./inventory.service";

describe("InventoryService", () => {
  const item = {
    id: "item-1",
    name: "Tracked Item",
    sku: "TRK",
    type: ItemType.PRODUCT,
    status: ItemStatus.ACTIVE,
    inventoryTracking: true,
  };
  const warehouse = { id: "warehouse-1", code: "MAIN", name: "Main", status: WarehouseStatus.ACTIVE, isDefault: true };

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      item: { findMany: jest.fn().mockResolvedValue([item]) },
      warehouse: { findMany: jest.fn().mockResolvedValue([warehouse]) },
      stockMovement: { findMany: jest.fn().mockResolvedValue([]) },
      ...overrides,
    };
    return { service: new InventoryService(prisma as never), prisma };
  }

  it("calculates quantity on hand by item and warehouse", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.findMany.mockResolvedValue([
      {
        itemId: item.id,
        warehouseId: warehouse.id,
        type: StockMovementType.OPENING_BALANCE,
        quantity: new Prisma.Decimal("10.0000"),
        unitCost: new Prisma.Decimal("5.0000"),
        totalCost: new Prisma.Decimal("50.0000"),
      },
      {
        itemId: item.id,
        warehouseId: warehouse.id,
        type: StockMovementType.ADJUSTMENT_IN,
        quantity: new Prisma.Decimal("2.0000"),
        unitCost: new Prisma.Decimal("6.0000"),
        totalCost: new Prisma.Decimal("12.0000"),
      },
      {
        itemId: item.id,
        warehouseId: warehouse.id,
        type: StockMovementType.ADJUSTMENT_OUT,
        quantity: new Prisma.Decimal("3.0000"),
        unitCost: null,
        totalCost: null,
      },
    ]);

    await expect(service.balances("org-1", {})).resolves.toEqual([
      expect.objectContaining({
        item,
        warehouse,
        quantityOnHand: "9.0000",
        averageUnitCost: "5.1667",
        inventoryValue: "46.5000",
      }),
    ]);
  });

  it("keeps tenant isolation by rejecting unknown item filters", async () => {
    const { service, prisma } = makeService();
    prisma.item.findMany.mockResolvedValue([]);

    await expect(service.balances("org-2", { itemId: "item-1" })).rejects.toThrow(
      "Item must be inventory-tracked and belong to this organization.",
    );
  });
});
