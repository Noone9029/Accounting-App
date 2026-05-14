import { AccountType, InventoryPurchasePostingMode, InventoryValuationMethod, Prisma, StockMovementType } from "@prisma/client";
import { InventoryAccountingService } from "./inventory-accounting.service";

describe("InventoryAccountingService", () => {
  const assetAccount = account("asset-1", "130", "Inventory", AccountType.ASSET);
  const cogsAccount = account("cogs-1", "611", "Cost of Goods Sold", AccountType.COST_OF_SALES);
  const clearingAccount = account("clearing-1", "240", "Inventory Clearing", AccountType.LIABILITY);
  const baseSettings = {
    id: "settings-1",
    organizationId: "org-1",
    valuationMethod: InventoryValuationMethod.MOVING_AVERAGE,
    allowNegativeStock: false,
    trackInventoryValue: true,
    enableInventoryAccounting: false,
    inventoryAssetAccountId: null,
    cogsAccountId: null,
    inventoryClearingAccountId: null,
    inventoryAdjustmentGainAccountId: null,
    inventoryAdjustmentLossAccountId: null,
    purchaseReceiptPostingMode: InventoryPurchasePostingMode.DISABLED,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    inventoryAssetAccount: null,
    cogsAccount: null,
    inventoryClearingAccount: null,
    inventoryAdjustmentGainAccount: null,
    inventoryAdjustmentLossAccount: null,
  };

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      inventorySettings: {
        findUnique: jest.fn().mockResolvedValue(baseSettings),
        create: jest.fn().mockResolvedValue(baseSettings),
        update: jest.fn().mockResolvedValue(baseSettings),
      },
      account: { findFirst: jest.fn() },
      stockMovement: { findMany: jest.fn().mockResolvedValue([]) },
      ...overrides,
    };
    return { service: new InventoryAccountingService(prisma as never), prisma };
  }

  it("creates default disabled inventory accounting settings", async () => {
    const { service, prisma } = makeService();
    prisma.inventorySettings.findUnique.mockResolvedValue(null);

    const result = await service.settings("org-1");

    expect(prisma.inventorySettings.create).toHaveBeenCalledWith(expect.objectContaining({ data: { organizationId: "org-1" } }));
    expect(result).toEqual(
      expect.objectContaining({
        enableInventoryAccounting: false,
        canEnableInventoryAccounting: false,
        previewOnly: true,
      }),
    );
  });

  it("does not allow enabling inventory accounting without required asset and COGS mappings", async () => {
    const { service } = makeService();

    await expectBadRequestMessage(
      service.updateSettings("org-1", { enableInventoryAccounting: true }),
      "Inventory asset account is required before inventory accounting can be enabled.",
    );
  });

  it("validates account mapping type, active, posting, and tenant ownership", async () => {
    const { service, prisma } = makeService();
    prisma.account.findFirst.mockResolvedValue(account("expense-1", "511", "General Expenses", AccountType.EXPENSE));

    await expectBadRequestMessage(
      service.updateSettings("org-1", { inventoryAssetAccountId: "expense-1" }),
      "Inventory asset account must be one of: ASSET.",
    );

    prisma.account.findFirst.mockResolvedValue(null);
    await expect(service.updateSettings("org-1", { cogsAccountId: "other-org-account" })).rejects.toThrow(
      "COGS account must belong to this organization.",
    );

    prisma.account.findFirst.mockResolvedValue({ ...cogsAccount, allowPosting: false });
    await expectBadRequestMessage(service.updateSettings("org-1", { cogsAccountId: cogsAccount.id }), "COGS account must allow posting.");
  });

  it("validates inventory clearing account type and separation from inventory/AP", async () => {
    const { service, prisma } = makeService();
    prisma.account.findFirst.mockResolvedValue(account("revenue-1", "411", "Sales", AccountType.REVENUE));

    await expectBadRequestMessage(
      service.updateSettings("org-1", { inventoryClearingAccountId: "revenue-1" }),
      "Inventory clearing account must be one of: LIABILITY, ASSET.",
    );

    prisma.account.findFirst.mockResolvedValue(assetAccount);
    await expectBadRequestMessage(
      service.updateSettings("org-1", { inventoryAssetAccountId: assetAccount.id, inventoryClearingAccountId: assetAccount.id }),
      "Inventory clearing account must be separate from inventory asset account.",
    );

    prisma.account.findFirst.mockResolvedValue(account("ap-1", "210", "Accounts Payable", AccountType.LIABILITY));
    await expectBadRequestMessage(
      service.updateSettings("org-1", { inventoryClearingAccountId: "ap-1" }),
      "Inventory clearing account must be separate from Accounts Payable account code 210.",
    );
  });

  it("allows mapped moving-average settings to be enabled while remaining preview-only", async () => {
    const enabledSettings = {
      ...baseSettings,
      enableInventoryAccounting: true,
      inventoryAssetAccountId: assetAccount.id,
      cogsAccountId: cogsAccount.id,
      inventoryClearingAccountId: clearingAccount.id,
      inventoryAssetAccount: assetAccount,
      cogsAccount,
      inventoryClearingAccount: clearingAccount,
    };
    const { service, prisma } = makeService();
    prisma.account.findFirst.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(where.id === assetAccount.id ? assetAccount : where.id === cogsAccount.id ? cogsAccount : clearingAccount),
    );
    prisma.inventorySettings.update.mockResolvedValue(enabledSettings);

    const result = await service.updateSettings("org-1", {
      enableInventoryAccounting: true,
      inventoryAssetAccountId: assetAccount.id,
      cogsAccountId: cogsAccount.id,
      inventoryClearingAccountId: clearingAccount.id,
      purchaseReceiptPostingMode: InventoryPurchasePostingMode.PREVIEW_ONLY,
    });

    expect(result.enableInventoryAccounting).toBe(true);
    expect(result.noAutomaticPosting).toBe(true);
    expect(result.canEnableInventoryAccounting).toBe(true);
    expect(result.accounts.inventoryClearing).toEqual(clearingAccount);
  });

  it("calculates moving-average unit cost from costed inbound operational movements", async () => {
    const { service, prisma } = makeService();
    prisma.stockMovement.findMany.mockResolvedValue([
      movement(StockMovementType.OPENING_BALANCE, "10.0000", "4.0000", "40.0000"),
      movement(StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER, "5.0000", "7.0000", "35.0000"),
      movement(StockMovementType.SALES_ISSUE_PLACEHOLDER, "3.0000"),
    ]);

    const result = await service.movingAverageUnitCost("org-1", "item-1", "warehouse-1", new Date("2026-05-14T00:00:00.000Z"));

    expect(result.averageUnitCost?.toFixed(4)).toBe("5.0000");
    expect(result.missingCostData).toBe(false);
  });

  function account(id: string, code: string, name: string, type: AccountType) {
    return { id, code, name, type, allowPosting: true, isActive: true };
  }

  function movement(type: StockMovementType, quantity: string, unitCost?: string, totalCost?: string) {
    return {
      type,
      quantity: new Prisma.Decimal(quantity),
      unitCost: unitCost ? new Prisma.Decimal(unitCost) : null,
      totalCost: totalCost ? new Prisma.Decimal(totalCost) : null,
    };
  }

  async function expectBadRequestMessage(promise: Promise<unknown>, expected: string) {
    try {
      await promise;
    } catch (error) {
      if (error && typeof error === "object" && "getResponse" in error && typeof error.getResponse === "function") {
        const response = error.getResponse() as { message?: string | string[] };
        const messages = Array.isArray(response.message) ? response.message : [response.message];
        expect(messages).toContain(expected);
        return;
      }
      throw error;
    }
    throw new Error("Expected BadRequestException.");
  }
});
