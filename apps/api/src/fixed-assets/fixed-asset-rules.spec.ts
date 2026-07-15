import { Decimal } from "decimal.js";
import {
  buildStraightLineSchedule,
  calculateDisposal,
  reopenedScheduleLineState,
  validateFixedAssetInput,
} from "./fixed-asset-rules";

describe("fixed asset accounting rules", () => {
  it("starts next month and consumes the exact four-decimal residual", () => {
    const lines = buildStraightLineSchedule({
      inServiceDate: new Date("2024-01-15T00:00:00.000Z"),
      baseAcquisitionCost: new Decimal("100.00"),
      baseSalvageValue: new Decimal("0.01"),
      usefulLifeMonths: 3,
    });

    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({
      depreciationDate: new Date("2024-02-01T00:00:00.000Z"),
      depreciationAmount: "33.3300",
      closingCarryingAmount: "66.6700",
    });
    expect(lines[1]!.depreciationAmount).toBe("33.3300");
    expect(lines[2]).toMatchObject({
      depreciationAmount: "33.3300",
      accumulatedDepreciationAfter: "99.9900",
      closingCarryingAmount: "0.0100",
    });
  });

  it("does not depreciate an asset already at salvage value", () => {
    expect(
      buildStraightLineSchedule({
        inServiceDate: new Date("2024-01-15T00:00:00.000Z"),
        baseAcquisitionCost: new Decimal("10"),
        baseSalvageValue: new Decimal("10"),
        usefulLifeMonths: 12,
      }),
    ).toEqual([]);
  });

  it("calculates sale gain and write-off loss from carrying amount", () => {
    expect(
      calculateDisposal({
        baseAcquisitionCost: new Decimal("100"),
        accumulatedDepreciation: new Decimal("40"),
        proceeds: new Decimal("75"),
      }),
    ).toEqual({ carryingAmount: "60.0000", gain: "15.0000", loss: "0.0000" });

    expect(
      calculateDisposal({
        baseAcquisitionCost: new Decimal("100"),
        accumulatedDepreciation: new Decimal("40"),
        proceeds: new Decimal("0"),
      }),
    ).toEqual({ carryingAmount: "60.0000", gain: "0.0000", loss: "60.0000" });
  });

  it("rejects salvage above cost and non-positive useful life", () => {
    expect(() =>
      validateFixedAssetInput({
        baseAcquisitionCost: new Decimal("10"),
        baseSalvageValue: new Decimal("11"),
        usefulLifeMonths: 0,
      }),
    ).toThrow("Salvage value cannot exceed acquisition cost.");
  });

  it("reopens the original schedule line after depreciation reversal", () => {
    expect(reopenedScheduleLineState()).toEqual({ status: "UNPOSTED", journalEntryId: null, postedAt: null });
  });
});
