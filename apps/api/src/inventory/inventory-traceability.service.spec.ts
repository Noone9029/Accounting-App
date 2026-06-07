import {
  InventoryBatchStatus,
  InventoryBinLocationStatus,
  InventoryBinLocationType,
  InventorySerialNumberStatus,
  ItemStatus,
  ItemTrackingMode,
  ItemType,
  Prisma,
  StockMovementType,
  WarehouseStatus,
} from "@prisma/client";
import { InventoryTraceabilityService } from "./inventory-traceability.service";

describe("InventoryTraceabilityService", () => {
  const warehouse = { id: "warehouse-1", code: "MAIN", name: "Main", status: WarehouseStatus.ACTIVE };
  const binLocation = {
    id: "bin-1",
    organizationId: "org-1",
    warehouseId: warehouse.id,
    code: "A-01",
    name: "Aisle 01",
    type: InventoryBinLocationType.BIN,
    status: InventoryBinLocationStatus.ACTIVE,
    description: null,
    warehouse,
  };
  const batchItem = {
    id: "item-1",
    name: "Batch Item",
    sku: "BAT",
    type: ItemType.PRODUCT,
    status: ItemStatus.ACTIVE,
    inventoryTracking: true,
    trackingMode: ItemTrackingMode.BATCH,
    expiryTrackingEnabled: true,
    binTrackingEnabled: true,
  };
  const serialItem = { ...batchItem, id: "serial-item", name: "Serial Item", trackingMode: ItemTrackingMode.SERIAL };
  const batch = {
    id: "batch-1",
    organizationId: "org-1",
    itemId: batchItem.id,
    batchNumber: "B-001",
    lotNumber: "LOT-1",
    manufactureDate: null,
    expiryDate: new Date("2026-12-31T00:00:00.000Z"),
    status: InventoryBatchStatus.ACTIVE,
    notes: null,
    item: batchItem,
  };
  const serialNumber = {
    id: "serial-1",
    organizationId: "org-1",
    itemId: serialItem.id,
    serialNumber: "SN-001",
    batchId: null,
    status: InventorySerialNumberStatus.AVAILABLE,
    currentWarehouseId: warehouse.id,
    currentBinLocationId: binLocation.id,
    lastMovementId: null,
    item: serialItem,
    batch: null,
    currentWarehouse: warehouse,
    currentBinLocation: binLocation,
    lastMovement: null,
  };

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      warehouse: {
        findFirst: jest.fn().mockResolvedValue(warehouse),
        findMany: jest.fn().mockResolvedValue([warehouse]),
      },
      inventoryBinLocation: {
        findMany: jest.fn().mockResolvedValue([binLocation]),
        findFirst: jest.fn().mockResolvedValue(binLocation),
        create: jest.fn().mockResolvedValue(binLocation),
        update: jest.fn().mockResolvedValue({ ...binLocation, name: "Updated bin" }),
      },
      item: {
        findFirst: jest.fn().mockResolvedValue(batchItem),
      },
      inventoryBatch: {
        findMany: jest.fn().mockResolvedValue([batch]),
        findFirst: jest.fn().mockResolvedValue(batch),
        create: jest.fn().mockResolvedValue(batch),
        update: jest.fn().mockResolvedValue({ ...batch, status: InventoryBatchStatus.QUARANTINED }),
      },
      inventorySerialNumber: {
        findMany: jest.fn().mockResolvedValue([serialNumber]),
        findFirst: jest.fn().mockResolvedValue(serialNumber),
        create: jest.fn().mockResolvedValue(serialNumber),
        update: jest.fn().mockResolvedValue({ ...serialNumber, status: InventorySerialNumberStatus.QUARANTINED }),
      },
      stockMovement: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "movement-1",
            movementDate: new Date("2026-06-06T00:00:00.000Z"),
            type: StockMovementType.OPENING_BALANCE,
            quantity: new Prisma.Decimal("1.0000"),
            warehouseId: warehouse.id,
            batchId: null,
            serialNumberId: null,
            binLocationId: null,
            fromBinLocationId: null,
            toBinLocationId: null,
            referenceType: null,
            referenceId: null,
            warehouse,
            batch: null,
            serialNumber: null,
            binLocation: null,
            fromBinLocation: null,
            toBinLocation: null,
          },
        ]),
      },
      ...overrides,
    };
    const audit = { log: jest.fn() };
    return { service: new InventoryTraceabilityService(prisma as never, audit as never), prisma, audit };
  }

  it("lists bin locations with tenant-scoped filters", async () => {
    const { service, prisma } = makeService();

    await expect(service.listBinLocations("org-1", { warehouseId: warehouse.id, status: InventoryBinLocationStatus.ACTIVE })).resolves.toEqual([
      binLocation,
    ]);
    expect(prisma.inventoryBinLocation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1", warehouseId: warehouse.id, status: InventoryBinLocationStatus.ACTIVE }),
      }),
    );
  });

  it("creates and audits a bin location", async () => {
    const { service, prisma, audit } = makeService();

    await expect(
      service.createBinLocation("org-1", "user-1", { warehouseId: warehouse.id, code: "a-01", name: "Aisle 01", type: InventoryBinLocationType.BIN }),
    ).resolves.toMatchObject({ id: "bin-1", code: "A-01" });
    expect(prisma.inventoryBinLocation.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ code: "A-01" }) }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "InventoryBinLocation" }));
  });

  it("reports unique bin code blockers", async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" });
    const { service, prisma } = makeService();
    prisma.inventoryBinLocation.create.mockRejectedValue(duplicate);

    await expect(service.createBinLocation("org-1", "user-1", { warehouseId: warehouse.id, code: "A-01", name: "Aisle 01" })).rejects.toThrow(
      "Bin/location code must be unique per warehouse.",
    );
  });

  it("requires expiry dates for expiry-tracked batch items", async () => {
    const { service, prisma } = makeService();
    prisma.item.findFirst.mockResolvedValue(batchItem);

    await expect(service.createBatch("org-1", "user-1", { itemId: batchItem.id, batchNumber: "B-002" })).rejects.toThrow(
      "Expiry date is required because this item has expiry tracking enabled.",
    );
  });

  it("creates and audits batches with unique item scope", async () => {
    const { service, audit } = makeService();

    await expect(
      service.createBatch("org-1", "user-1", { itemId: batchItem.id, batchNumber: "B-001", expiryDate: "2026-12-31" }),
    ).resolves.toMatchObject({ id: "batch-1", batchNumber: "B-001" });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "InventoryBatch" }));
  });

  it("creates and audits serial numbers for serial-tracked items", async () => {
    const { service, prisma, audit } = makeService();
    prisma.item.findFirst.mockResolvedValue(serialItem);

    await expect(
      service.createSerialNumber("org-1", "user-1", {
        itemId: serialItem.id,
        serialNumber: "SN-001",
        currentWarehouseId: warehouse.id,
        currentBinLocationId: binLocation.id,
      }),
    ).resolves.toMatchObject({ id: "serial-1", serialNumber: "SN-001" });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "InventorySerialNumber" }));
  });

  it("uses organization scope for serial number detail reads", async () => {
    const { service, prisma } = makeService();

    await service.getSerialNumber("org-1", "serial-1");
    expect(prisma.inventorySerialNumber.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "serial-1", organizationId: "org-1" } }));
  });

  it("returns read-only item traceability with metadata warnings", async () => {
    const { service } = makeService();

    await expect(service.itemTraceability("org-1", batchItem.id)).resolves.toMatchObject({
      item: expect.objectContaining({ id: batchItem.id }),
      trackingMode: ItemTrackingMode.BATCH,
      hasStockMovements: true,
      readOnly: true,
      noPostingEffect: true,
      noInventoryValuationEffect: true,
      noFifoActivation: true,
      noVatEffect: true,
      noZatcaEffect: true,
      warnings: expect.arrayContaining([expect.stringContaining("Some existing movements do not carry")]),
    });
  });
});
