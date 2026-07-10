import { NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { InventoryLandedCostPreviewService } from "./inventory-landed-cost-preview.service";
import type { LandedCostPreviewDto } from "./dto/landed-cost-preview.dto";

describe("InventoryLandedCostPreviewService", () => {
  const supplier = { id: "supplier-1", name: "Example Supplier", displayName: "Example Supplier" };
  const trackedItem = { id: "item-1", name: "Tracked Item", sku: "TRK", inventoryTracking: true };
  const secondItem = { id: "item-2", name: "Second Item", sku: "SND", inventoryTracking: true };

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      organization: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "AED" }) },
      contact: { count: jest.fn().mockResolvedValue(0) },
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(receipt()) },
      purchaseBill: { findFirst: jest.fn().mockResolvedValue(bill()) },
      purchaseReturnLine: { findMany: jest.fn().mockResolvedValue([]) },
      journalEntry: { create: jest.fn(), update: jest.fn() },
      stockMovement: { create: jest.fn(), update: jest.fn() },
      inventoryVarianceProposal: { create: jest.fn(), update: jest.fn() },
      purchaseBillMutation: { update: jest.fn() },
      purchaseReceiptMutation: { update: jest.fn() },
      ...overrides,
    };
    return { service: new InventoryLandedCostPreviewService(prisma as never), prisma };
  }

  it("allocates landed costs by base value", async () => {
    const { service, prisma } = makeService();

    const preview = await service.preview("org-1", dto({ allocationMethod: "BY_VALUE", costLines: [costLine("FREIGHT", "30.0000")] }));

    expect(preview.allocation).toEqual([
      expect.objectContaining({ sourceLineId: "receipt-line-1", allocatedLandedCost: "15.0000", previewLandedUnitCost: "11.5000" }),
      expect.objectContaining({ sourceLineId: "receipt-line-2", allocatedLandedCost: "15.0000", previewLandedUnitCost: "23.0000" }),
    ]);
    expect(preview.totals).toEqual({
      baseInventoryValue: "200.0000",
      totalLandedCosts: "30.0000",
      previewLandedInventoryValue: "230.0000",
    });
    expect(prisma.purchaseReceipt.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "receipt-1", organizationId: "org-1" } }));
  });

  it("uses the AED tenant base currency for a standalone receipt preview", async () => {
    const { service, prisma } = makeService({
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(receipt({ purchaseBill: null })) },
    });

    const preview = await service.preview("org-1", dto());

    expect(preview.source?.currency).toBe("AED");
    expect(prisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: "org-1" },
      select: { baseCurrency: true },
    });
  });

  it("allocates landed costs by quantity", async () => {
    const { service } = makeService();

    const preview = await service.preview("org-1", dto({ allocationMethod: "BY_QUANTITY", costLines: [costLine("CUSTOMS_DUTY", "30.0000")] }));

    expect(preview.allocation).toEqual([
      expect.objectContaining({ sourceLineId: "receipt-line-1", allocatedLandedCost: "20.0000", landedUnitCostIncrease: "2.0000" }),
      expect.objectContaining({ sourceLineId: "receipt-line-2", allocatedLandedCost: "10.0000", landedUnitCostIncrease: "2.0000" }),
    ]);
  });

  it("allocates landed costs equally across eligible lines", async () => {
    const { service } = makeService();

    const preview = await service.preview("org-1", dto({ allocationMethod: "EQUAL", costLines: [costLine("HANDLING", "30.0000")] }));

    expect(preview.allocation.map((line) => line.allocatedLandedCost)).toEqual(["15.0000", "15.0000"]);
  });

  it("uses manual allocations when totals match landed costs", async () => {
    const { service } = makeService();

    const preview = await service.preview(
      "org-1",
      dto({
        allocationMethod: "MANUAL",
        costLines: [costLine("INSURANCE", "30.0000")],
        manualAllocations: [
          { sourceLineId: "receipt-line-1", amount: "5.0000" },
          { sourceLineId: "receipt-line-2", amount: "25.0000" },
        ],
      }),
    );

    expect(preview.blockers).toEqual([]);
    expect(preview.allocation).toEqual([
      expect.objectContaining({ sourceLineId: "receipt-line-1", allocatedLandedCost: "5.0000" }),
      expect.objectContaining({ sourceLineId: "receipt-line-2", allocatedLandedCost: "25.0000" }),
    ]);
  });

  it("reconciles allocation rounding to the landed cost total", async () => {
    const { service } = makeService({
      purchaseReceipt: {
        findFirst: jest.fn().mockResolvedValue(
          receipt({
            lines: [
              receiptLine({ id: "line-1", quantity: "1.0000", unitCost: "10.0000" }),
              receiptLine({ id: "line-2", item: secondItem, itemId: secondItem.id, quantity: "1.0000", unitCost: "10.0000" }),
              receiptLine({ id: "line-3", quantity: "1.0000", unitCost: "10.0000" }),
            ],
          }),
        ),
      },
    });

    const preview = await service.preview("org-1", dto({ allocationMethod: "EQUAL", costLines: [costLine("BROKERAGE", "100.0000")] }));
    const allocated = preview.allocation.reduce((sum, line) => sum.plus(line.allocatedLandedCost), new Prisma.Decimal(0));

    expect(preview.allocation.map((line) => line.allocatedLandedCost)).toEqual(["33.3333", "33.3333", "33.3334"]);
    expect(allocated.toFixed(4)).toBe("100.0000");
  });

  it("returns a zero quantity blocker", async () => {
    const { service } = makeService({
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(receipt({ lines: [receiptLine({ quantity: "0.0000" })] })) },
    });

    const preview = await service.preview("org-1", dto({ allocationMethod: "BY_QUANTITY", costLines: [costLine("STORAGE", "10.0000")] }));

    expect(preview.blockers).toEqual(expect.arrayContaining([expect.stringContaining("zero quantity")]));
    expect(preview.allocation).toEqual([]);
  });

  it("returns a zero value blocker for value allocation", async () => {
    const { service } = makeService({
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(receipt({ lines: [receiptLine({ unitCost: "0.0000" })] })) },
    });

    const preview = await service.preview("org-1", dto({ allocationMethod: "BY_VALUE", costLines: [costLine("OTHER", "10.0000")] }));

    expect(preview.blockers).toEqual(expect.arrayContaining([expect.stringContaining("zero base value")]));
    expect(preview.allocation).toEqual([]);
  });

  it("returns an unsupported source blocker for purchase orders", async () => {
    const { service, prisma } = makeService();

    const preview = await service.preview("org-1", dto({ sourceType: "PURCHASE_ORDER", sourceId: "po-1", costLines: [costLine("FREIGHT", "10.0000")] }));

    expect(preview.source).toBeNull();
    expect(preview.blockers).toEqual(expect.arrayContaining([expect.stringContaining("Purchase order landed cost preview is not supported")]));
    expect(prisma.purchaseReceipt.findFirst).not.toHaveBeenCalled();
    expect(prisma.purchaseBill.findFirst).not.toHaveBeenCalled();
  });

  it("returns a manual allocation mismatch blocker", async () => {
    const { service } = makeService();

    const preview = await service.preview(
      "org-1",
      dto({
        allocationMethod: "MANUAL",
        costLines: [costLine("FREIGHT", "20.0000")],
        manualAllocations: [{ sourceLineId: "receipt-line-1", amount: "10.0000" }],
      }),
    );

    expect(preview.blockers).toEqual(expect.arrayContaining(["Manual allocation total must equal total landed costs."]));
    expect(preview.allocation).toEqual([]);
  });

  it("denies cross-tenant sources through organization-scoped reads", async () => {
    const { service, prisma } = makeService({
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.preview("org-2", dto())).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.purchaseReceipt.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "receipt-1", organizationId: "org-2" } }));
  });

  it("does not mutate inventory, accounting, AP, or variance proposal state", async () => {
    const { service, prisma } = makeService();

    const preview = await service.preview("org-1", dto({ allocationMethod: "BY_VALUE", costLines: [costLine("FREIGHT", "30.0000")] }));

    expect(preview.noMutation).toBe(true);
    expect(preview.noPostingEffect).toBe(true);
    expect(preview.noInventoryEffect).toBe(true);
    expect(preview.noApEffect).toBe(true);
    expect(preview.noVatEffect).toBe(true);
    expect(preview.noZatcaEffect).toBe(true);
    expect(preview.noEmailEffect).toBe(true);
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    expect(prisma.inventoryVarianceProposal.create).not.toHaveBeenCalled();
    expect(prisma.purchaseBillMutation.update).not.toHaveBeenCalled();
    expect(prisma.purchaseReceiptMutation.update).not.toHaveBeenCalled();
  });

  function dto(overrides: Partial<LandedCostPreviewDto> = {}): LandedCostPreviewDto {
    return {
      sourceType: "PURCHASE_RECEIPT",
      sourceId: "receipt-1",
      allocationMethod: "BY_VALUE",
      costLines: [costLine("FREIGHT", "0.0000")],
      manualAllocations: [],
      ...overrides,
    };
  }

  function costLine(category: LandedCostPreviewDto["costLines"][number]["category"], amount: string) {
    return { category, description: `${category} estimate`, amount };
  }

  function receipt(overrides: Record<string, unknown> = {}) {
    return {
      id: "receipt-1",
      receiptNumber: "PRC-000001",
      receiptDate: new Date("2026-06-01T00:00:00.000Z"),
      supplier,
      purchaseBill: { currency: "SAR" },
      lines: [
        receiptLine({ id: "receipt-line-1", quantity: "10.0000", unitCost: "10.0000" }),
        receiptLine({ id: "receipt-line-2", item: secondItem, itemId: secondItem.id, quantity: "5.0000", unitCost: "20.0000" }),
      ],
      ...overrides,
    };
  }

  function receiptLine(overrides: Record<string, unknown> = {}) {
    return {
      id: "receipt-line-1",
      itemId: trackedItem.id,
      quantity: new Prisma.Decimal("10.0000"),
      unitCost: new Prisma.Decimal("10.0000"),
      item: trackedItem,
      purchaseBillLine: null,
      purchaseOrderLine: null,
      ...overrides,
    };
  }

  function bill(overrides: Record<string, unknown> = {}) {
    return {
      id: "bill-1",
      billNumber: "BILL-000001",
      billDate: new Date("2026-06-02T00:00:00.000Z"),
      currency: "SAR",
      supplier,
      lines: [
        {
          id: "bill-line-1",
          itemId: trackedItem.id,
          description: "Tracked Item",
          quantity: new Prisma.Decimal("10.0000"),
          unitPrice: new Prisma.Decimal("10.0000"),
          item: trackedItem,
        },
      ],
      ...overrides,
    };
  }
});
