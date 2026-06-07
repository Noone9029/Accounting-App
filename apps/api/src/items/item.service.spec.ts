import { AccountType, ItemStatus, ItemTrackingMode, ItemType } from "@prisma/client";
import { ItemService } from "./item.service";

describe("ItemService tracking settings", () => {
  const account = { id: "revenue-1", organizationId: "org-1", isActive: true, allowPosting: true, type: AccountType.REVENUE };
  const item = {
    id: "item-1",
    organizationId: "org-1",
    name: "Tracked item",
    description: null,
    sku: "TRK",
    type: ItemType.PRODUCT,
    status: ItemStatus.ACTIVE,
    sellingPrice: "0.0000",
    revenueAccountId: account.id,
    salesTaxRateId: null,
    purchaseCost: null,
    expenseAccountId: null,
    purchaseTaxRateId: null,
    inventoryTracking: true,
    trackingMode: ItemTrackingMode.NONE,
    expiryTrackingEnabled: false,
    binTrackingEnabled: false,
  };

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      item: {
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(item),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...item, ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...item, ...data })),
        delete: jest.fn(),
      },
      account: { findFirst: jest.fn().mockResolvedValue(account) },
      taxRate: { findFirst: jest.fn() },
      stockMovement: { count: jest.fn().mockResolvedValue(0) },
      salesInvoiceLine: { count: jest.fn().mockResolvedValue(0) },
      ...overrides,
    };
    const audit = { log: jest.fn() };
    return { service: new ItemService(prisma as never, audit as never), prisma, audit };
  }

  it("defaults item tracking settings to NONE", async () => {
    const { service, prisma } = makeService();

    await service.create("org-1", "user-1", {
      name: "Tracked item",
      type: ItemType.PRODUCT,
      sellingPrice: "0.0000",
      revenueAccountId: account.id,
      inventoryTracking: true,
    });

    expect(prisma.item.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trackingMode: ItemTrackingMode.NONE,
          expiryTrackingEnabled: false,
          binTrackingEnabled: false,
        }),
      }),
    );
  });

  it("updates tracking settings for an item without movements", async () => {
    const { service, prisma, audit } = makeService();

    await expect(
      service.update("org-1", "user-1", item.id, {
        trackingMode: ItemTrackingMode.BATCH,
        expiryTrackingEnabled: true,
        binTrackingEnabled: true,
      }),
    ).resolves.toMatchObject({ trackingMode: ItemTrackingMode.BATCH, expiryTrackingEnabled: true, binTrackingEnabled: true });

    expect(prisma.stockMovement.count).toHaveBeenCalledWith({ where: { organizationId: "org-1", itemId: item.id } });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "UPDATE_TRACKING_SETTINGS", entityType: "Item" }));
  });

  it("blocks tracking setting changes for items with existing movements", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.count.mockResolvedValue(1);

    await expect(service.update("org-1", "user-1", item.id, { trackingMode: ItemTrackingMode.SERIAL })).rejects.toThrow(
      "Tracking settings cannot be changed for items with existing stock movements until a migration policy exists.",
    );
    expect(prisma.item.update).not.toHaveBeenCalled();
  });

  it("rejects serial, batch, expiry, or bin settings when inventory tracking is disabled", async () => {
    const { service } = makeService();

    await expect(
      service.create("org-1", "user-1", {
        name: "Service",
        type: ItemType.SERVICE,
        sellingPrice: "0.0000",
        revenueAccountId: account.id,
        inventoryTracking: false,
        trackingMode: ItemTrackingMode.SERIAL,
      }),
    ).rejects.toThrow("Serial, batch, expiry, or bin tracking requires inventory tracking to be enabled.");
  });
});
