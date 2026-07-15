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
});
