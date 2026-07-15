import { Prisma } from "@prisma/client";
import { FixedAssetReportsService } from "./fixed-asset-reports.service";

describe("FixedAssetReportsService", () => {
  it("keeps disposal proceeds and gain or loss from the posted movement evidence", async () => {
    const prisma = {
      fixedAssetMovement: {
        findMany: jest.fn().mockResolvedValue([
          {
            fixedAssetId: "asset-1",
            movementType: "DISPOSAL",
            effectiveDate: new Date("2026-07-15T00:00:00.000Z"),
            baseAmount: "100.0000",
            proceedsAmount: "125.0000",
            gainAmount: "25.0000",
            lossAmount: "0.0000",
            journalEntryId: "journal-1",
            reason: "Sold at replacement date",
            fixedAsset: {
              id: "asset-1",
              assetNumber: "FA-000001",
              name: "Office equipment",
              baseAcquisitionCost: "200.0000",
              accumulatedDepreciation: "100.0000",
              carryingAmount: "100.0000",
              category: { code: "EQUIP", name: "Equipment" },
            },
          },
        ]),
      },
    };
    const service = new FixedAssetReportsService(prisma as never);

    await expect(service.disposals("org-1")).resolves.toEqual([
      expect.objectContaining({
        proceeds: "125.0000",
        gain: "25.0000",
        loss: "0.0000",
        journalEntryId: "journal-1",
      }),
    ]);
  });

  it("reconciles current asset balances without counting disposed historical rows", async () => {
    const prisma = {
      fixedAssetCategory: {
        findMany: jest.fn().mockResolvedValue([
          { assetCostAccountId: "cost-account", accumulatedDepreciationAccountId: "accum-account", depreciationExpenseAccountId: "expense-account" },
        ]),
      },
      fixedAsset: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            baseAcquisitionCost: new Prisma.Decimal("100.0000"),
            accumulatedDepreciation: new Prisma.Decimal("10.0000"),
            carryingAmount: new Prisma.Decimal("90.0000"),
          },
        }),
      },
      journalLine: {
        groupBy: jest.fn().mockResolvedValue([
          { accountId: "cost-account", _sum: { debit: new Prisma.Decimal("100.0000"), credit: new Prisma.Decimal("0.0000") } },
          { accountId: "accum-account", _sum: { debit: new Prisma.Decimal("0.0000"), credit: new Prisma.Decimal("10.0000") } },
          { accountId: "expense-account", _sum: { debit: new Prisma.Decimal("10.0000"), credit: new Prisma.Decimal("0.0000") } },
        ]),
      },
      fixedAssetMovement: {
        groupBy: jest.fn().mockResolvedValue([
          { movementType: "DEPRECIATION", _sum: { baseAmount: new Prisma.Decimal("10.0000") } },
        ]),
      },
    };
    const service = new FixedAssetReportsService(prisma as never);

    await expect(service.reconciliation("org-1")).resolves.toMatchObject({ reconciled: true });
    expect(prisma.fixedAsset.aggregate).toHaveBeenCalledWith({
      where: { organizationId: "org-1", status: { in: ["ACTIVE", "FULLY_DEPRECIATED"] } },
      _sum: { baseAcquisitionCost: true, accumulatedDepreciation: true, carryingAmount: true },
    });
  });

  it("nets depreciation reversal movements when reconciling expense", async () => {
    const prisma = {
      fixedAssetCategory: {
        findMany: jest.fn().mockResolvedValue([
          { assetCostAccountId: "cost-account", accumulatedDepreciationAccountId: "accum-account", depreciationExpenseAccountId: "expense-account" },
        ]),
      },
      fixedAsset: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            baseAcquisitionCost: new Prisma.Decimal("100.0000"),
            accumulatedDepreciation: new Prisma.Decimal("0.0000"),
            carryingAmount: new Prisma.Decimal("100.0000"),
          },
        }),
      },
      journalLine: {
        groupBy: jest.fn().mockResolvedValue([
          { accountId: "cost-account", _sum: { debit: new Prisma.Decimal("100.0000"), credit: new Prisma.Decimal("0.0000") } },
          { accountId: "accum-account", _sum: { debit: new Prisma.Decimal("0.0000"), credit: new Prisma.Decimal("0.0000") } },
          { accountId: "expense-account", _sum: { debit: new Prisma.Decimal("0.0000"), credit: new Prisma.Decimal("0.0000") } },
        ]),
      },
      fixedAssetMovement: {
        groupBy: jest.fn().mockResolvedValue([
          { movementType: "DEPRECIATION", _sum: { baseAmount: new Prisma.Decimal("10.0000") } },
          { movementType: "DEPRECIATION_REVERSAL", _sum: { baseAmount: new Prisma.Decimal("10.0000") } },
        ]),
      },
    };
    const service = new FixedAssetReportsService(prisma as never);

    await expect(service.reconciliation("org-1")).resolves.toMatchObject({
      reconciled: true,
      register: { depreciationExpense: "0" },
      generalLedger: { depreciationExpense: "0" },
    });
  });
});
