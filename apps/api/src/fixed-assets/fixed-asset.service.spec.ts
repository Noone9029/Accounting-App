import { FixedAssetService } from "./fixed-asset.service";

describe("FixedAssetService foundation", () => {
  it("creates a tenant-scoped draft without creating a journal", async () => {
    const created = {
      id: "asset-1",
      organizationId: "org-1",
      assetNumber: "FA-000001",
      status: "DRAFT",
      baseAcquisitionCost: "100.0000",
      baseSalvageValue: "0.0000",
      accumulatedDepreciation: "0.0000",
      carryingAmount: "100.0000",
      category: { id: "category-1", code: "EQUIP", name: "Equipment" },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) => callback(prisma)),
      organization: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "SAR" }) },
      fixedAssetCategory: {
        findFirst: jest.fn().mockResolvedValue({ id: "category-1", organizationId: "org-1", status: "ACTIVE" }),
      },
      account: { findFirst: jest.fn() },
      costCenter: { findFirst: jest.fn().mockResolvedValue(null) },
      project: { findFirst: jest.fn().mockResolvedValue(null) },
      fixedAsset: { create: jest.fn().mockResolvedValue(created) },
    } as any;
    const numberSequence = { next: jest.fn().mockResolvedValue("FA-000001") } as any;
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const fiscalPeriod = { assertPostingDateAllowed: jest.fn() } as any;
    const service = new FixedAssetService(prisma, numberSequence, audit, fiscalPeriod);

    const result = await service.create("org-1", "user-1", {
      categoryId: "category-1",
      name: "Office equipment",
      acquisitionDate: "2026-01-15",
      inServiceDate: "2026-01-15",
      baseAcquisitionCost: "100.0000",
      baseSalvageValue: "0.0000",
      usefulLifeMonths: 12,
    });

    expect(result).toEqual(expect.objectContaining({ id: "asset-1", status: "DRAFT" }));
    expect(prisma.fixedAsset.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId: "org-1", createdByUserId: "user-1", status: "DRAFT" }),
    }));
    expect(prisma).not.toHaveProperty("journalEntry.create");
  });
});
