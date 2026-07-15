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

  it("persists preview run lines with an explicit run id and returns their count", async () => {
    const run = {
      id: "run-1",
      organizationId: "org-1",
      fiscalPeriodId: "period-1",
      depreciationDate: new Date("2026-02-01T00:00:00.000Z"),
      status: "DRAFT",
      assetCount: 1,
      totalDepreciation: "100.0000",
      idempotencyKey: "preview-1",
      version: 1,
    };
    const runWithCount = { ...run, _count: { lines: 1 } };
    const scheduleLine = {
      id: "schedule-1",
      fixedAssetId: "asset-1",
      depreciationAmount: "100.0000",
      fixedAsset: {
        category: { depreciationExpenseAccountId: "expense-1", accumulatedDepreciationAccountId: "accumulated-1" },
        costCenterId: null,
        projectId: null,
        status: "ACTIVE",
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) => callback(prisma)),
      fixedAsset: { findMany: jest.fn().mockResolvedValue([]) },
      fixedAssetDepreciationRun: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(run),
        findUniqueOrThrow: jest.fn().mockResolvedValue(runWithCount),
      },
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ id: "period-1", status: "OPEN", startsOn: new Date("2026-01-01"), endsOn: new Date("2026-12-31") }) },
      fixedAssetDepreciationScheduleLine: { findMany: jest.fn().mockResolvedValue([scheduleLine]) },
      fixedAssetDepreciationRunLine: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    } as any;
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new FixedAssetService(prisma, { next: jest.fn() } as any, audit, { assertPostingDateAllowed: jest.fn() } as any);

    const result = await service.previewDepreciationRun("org-1", "user-1", {
      fiscalPeriodId: "period-1",
      depreciationDate: "2026-02-01T00:00:00.000Z",
      idempotencyKey: "preview-1",
    });

    expect(result).toEqual(expect.objectContaining({ id: "run-1", totalDepreciation: "100.0000" }));
    expect(prisma.fixedAssetDepreciationRunLine.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ organizationId: "org-1", runId: "run-1", fixedAssetId: "asset-1", scheduleLineId: "schedule-1" })],
    });
  });

  it("rejects posting an empty reviewed run with a controlled business error", async () => {
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) => callback(prisma)),
      fixedAssetDepreciationRun: {
        findFirst: jest.fn().mockResolvedValue({ id: "run-1", organizationId: "org-1", status: "REVIEWED", version: 2, lines: [] }),
      },
    } as any;
    const service = new FixedAssetService(prisma, { next: jest.fn() } as any, { log: jest.fn() } as any, { assertPostingDateAllowed: jest.fn() } as any);

    await expect(service.postDepreciationRun("org-1", "user-1", "run-1", { expectedVersion: 2 })).rejects.toThrow(
      "Depreciation run has no eligible schedule lines for the selected period.",
    );
  });

  it("claims each asset once when a reviewed run contains multiple monthly lines", async () => {
    const fixedAsset = {
      id: "asset-1",
      organizationId: "org-1",
      version: 7,
      status: "ACTIVE",
      accumulatedDepreciation: "0.0000",
      baseAcquisitionCost: "100.0000",
      baseSalvageValue: "0.0000",
      costCenterId: null,
      projectId: null,
      category: { depreciationExpenseAccountId: "expense-1", accumulatedDepreciationAccountId: "accumulated-1" },
    };
    const run = {
      id: "run-1",
      organizationId: "org-1",
      status: "REVIEWED",
      version: 2,
      depreciationDate: new Date("2026-03-01T00:00:00.000Z"),
      fiscalPeriodId: "period-1",
      lines: [
        { fixedAssetId: "asset-1", scheduleLineId: "schedule-1", depreciationAmount: "10.0000", expenseAccountId: "expense-1", accumulatedDepreciationAccountId: "accumulated-1", costCenterId: null, projectId: null, fixedAsset, scheduleLine: { id: "schedule-1", status: "UNPOSTED" } },
        { fixedAssetId: "asset-1", scheduleLineId: "schedule-2", depreciationAmount: "20.0000", expenseAccountId: "expense-1", accumulatedDepreciationAccountId: "accumulated-1", costCenterId: null, projectId: null, fixedAsset, scheduleLine: { id: "schedule-2", status: "UNPOSTED" } },
      ],
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) => callback(prisma)),
      fixedAssetDepreciationRun: {
        findFirst: jest.fn().mockResolvedValue(run),
        update: jest.fn().mockResolvedValue({ ...run, status: "POSTED", version: 3, _count: { lines: 2 } }),
      },
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ id: "period-1", organizationId: "org-1", status: "OPEN" }) },
      organization: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "SAR" }) },
      fixedAsset: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      fixedAssetDepreciationScheduleLine: { update: jest.fn().mockResolvedValue({}) },
      fixedAssetMovement: { create: jest.fn().mockResolvedValue({}) },
    } as any;
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new FixedAssetService(prisma, { next: jest.fn() } as any, audit, { assertPostingDateAllowed: jest.fn() } as any);
    jest.spyOn(service as any, "createPostedJournal").mockResolvedValue({ id: "journal-1" });

    await expect(service.postDepreciationRun("org-1", "user-1", "run-1", { expectedVersion: 2 })).resolves.toEqual(expect.objectContaining({ status: "POSTED" }));
    expect(prisma.fixedAsset.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.fixedAsset.updateMany).toHaveBeenCalledWith({
      where: { id: "asset-1", organizationId: "org-1", version: 7, status: { in: ["ACTIVE", "FULLY_DEPRECIATED"] } },
      data: { accumulatedDepreciation: expect.anything(), carryingAmount: expect.anything(), status: "ACTIVE", fullyDepreciatedAt: null, version: { increment: 1 } },
    });
    const updateData = prisma.fixedAsset.updateMany.mock.calls[0][0].data;
    expect(String(updateData.accumulatedDepreciation)).toBe("30");
    expect(String(updateData.carryingAmount)).toBe("70");
    expect(prisma.fixedAssetDepreciationScheduleLine.update).toHaveBeenCalledTimes(2);
    expect(prisma.fixedAssetMovement.create).toHaveBeenCalledTimes(2);
  });

  it("restores each asset once when reversing a multi-line depreciation run", async () => {
    const fixedAsset = {
      id: "asset-1",
      organizationId: "org-1",
      version: 9,
      status: "ACTIVE",
      accumulatedDepreciation: "30.0000",
      baseAcquisitionCost: "100.0000",
      baseSalvageValue: "0.0000",
    };
    const run = {
      id: "run-1",
      organizationId: "org-1",
      status: "POSTED",
      version: 3,
      journalEntryId: "journal-1",
      depreciationDate: new Date("2026-03-01T00:00:00.000Z"),
      lines: [
        { fixedAssetId: "asset-1", scheduleLineId: "schedule-1", depreciationAmount: "10.0000", fixedAsset, scheduleLine: { id: "schedule-1", status: "POSTED" } },
        { fixedAssetId: "asset-1", scheduleLineId: "schedule-2", depreciationAmount: "20.0000", fixedAsset, scheduleLine: { id: "schedule-2", status: "POSTED" } },
      ],
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) => callback(prisma)),
      fixedAssetDepreciationRun: {
        findFirst: jest.fn().mockResolvedValue(run),
        update: jest.fn().mockResolvedValue({ ...run, status: "REVERSED", version: 4, _count: { lines: 2 } }),
      },
      fixedAssetMovement: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({}) },
      journalEntry: {
        findFirst: jest.fn().mockResolvedValue({ id: "journal-1", entryNumber: "JE-1", currency: "SAR", status: "POSTED", lines: [{ accountId: "expense-1", debit: "30.0000", credit: "0.0000", description: "Depreciation" }] }),
        update: jest.fn().mockResolvedValue({}),
      },
      fixedAsset: { update: jest.fn().mockResolvedValue({}) },
      fixedAssetDepreciationScheduleLine: { update: jest.fn().mockResolvedValue({}) },
    } as any;
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new FixedAssetService(prisma, { next: jest.fn() } as any, audit, { assertPostingDateAllowed: jest.fn() } as any);
    jest.spyOn(service as any, "createPostedJournal").mockResolvedValue({ id: "reversal-1" });

    await expect(service.reverseDepreciationRun("org-1", "user-1", "run-1", { expectedVersion: 3 })).resolves.toEqual(expect.objectContaining({ status: "REVERSED" }));
    expect(prisma.fixedAsset.update).toHaveBeenCalledTimes(1);
    expect(prisma.fixedAsset.update).toHaveBeenCalledWith({ where: { id: "asset-1" }, data: { accumulatedDepreciation: expect.anything(), carryingAmount: expect.anything(), status: "ACTIVE", fullyDepreciatedAt: null, version: { increment: 1 } } });
    const updateData = prisma.fixedAsset.update.mock.calls[0][0].data;
    expect(String(updateData.accumulatedDepreciation)).toBe("0");
    expect(String(updateData.carryingAmount)).toBe("100");
    expect(prisma.fixedAssetDepreciationScheduleLine.update).toHaveBeenCalledTimes(2);
    expect(prisma.fixedAssetMovement.create).toHaveBeenCalledTimes(2);
  });
});
