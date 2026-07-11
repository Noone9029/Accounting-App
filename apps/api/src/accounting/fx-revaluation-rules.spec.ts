import {
  allocateForeignSettlement,
  revalueMonetaryBalance,
} from "@ledgerbyte/accounting-core";

describe("period-end FX revaluation arithmetic", () => {
  it("recognizes receivable gains and losses from the selected closing rate", () => {
    expect(revalueMonetaryBalance({
      direction: "CUSTOMER",
      transactionOpenAmount: "100.0000",
      carryingBaseAmount: "365.0000",
      closingRate: "3.75000000",
    })).toEqual({
      transactionOpenAmount: "100.0000",
      carryingBaseAmount: "365.0000",
      closingRate: "3.75000000",
      revaluedBaseAmount: "375.0000",
      unrealizedGainAmount: "10.0000",
      unrealizedLossAmount: "0.0000",
    });

    expect(revalueMonetaryBalance({
      direction: "CUSTOMER",
      transactionOpenAmount: "100",
      carryingBaseAmount: "365",
      closingRate: "3.55",
    })).toMatchObject({
      revaluedBaseAmount: "355.0000",
      unrealizedGainAmount: "0.0000",
      unrealizedLossAmount: "10.0000",
    });
  });

  it("uses the opposite gain and loss direction for supplier payables", () => {
    expect(revalueMonetaryBalance({
      direction: "SUPPLIER",
      transactionOpenAmount: "100",
      carryingBaseAmount: "365",
      closingRate: "3.75",
    })).toMatchObject({ unrealizedGainAmount: "0.0000", unrealizedLossAmount: "10.0000" });

    expect(revalueMonetaryBalance({
      direction: "SUPPLIER",
      transactionOpenAmount: "100",
      carryingBaseAmount: "365",
      closingRate: "3.55",
    })).toMatchObject({ unrealizedGainAmount: "10.0000", unrealizedLossAmount: "0.0000" });
  });

  it("handles partial open balances and zero-difference rows exactly", () => {
    expect(revalueMonetaryBalance({
      direction: "CUSTOMER",
      transactionOpenAmount: "40",
      carryingBaseAmount: "146",
      closingRate: "3.75",
    })).toMatchObject({ revaluedBaseAmount: "150.0000", unrealizedGainAmount: "4.0000" });

    expect(revalueMonetaryBalance({
      direction: "SUPPLIER",
      transactionOpenAmount: "40",
      carryingBaseAmount: "150",
      closingRate: "3.75",
    })).toMatchObject({
      revaluedBaseAmount: "150.0000",
      unrealizedGainAmount: "0.0000",
      unrealizedLossAmount: "0.0000",
    });
  });

  it("settles a partial receivable against adjusted carrying basis while preserving source basis", () => {
    expect(allocateForeignSettlement({
      direction: "CUSTOMER",
      transactionAmount: "40",
      transactionOpenAmount: "100",
      baseOpenAmount: "375",
      sourceBaseOpenAmount: "364.9990",
      recognitionRate: "3.65",
      settlementRate: "3.80",
      useProportionalCarryingBasis: true,
    })).toEqual({
      transactionAmount: "40.0000",
      documentBaseAmount: "150.0000",
      sourceBaseAmount: "145.9996",
      settlementBaseAmount: "152.0000",
      realizedGainAmount: "2.0000",
      realizedLossAmount: "0.0000",
      remainingTransactionAmount: "60.0000",
      remainingBaseAmount: "225.0000",
      remainingSourceBaseAmount: "218.9994",
    });
  });

  it("consumes exact adjusted and source residuals on final settlement", () => {
    expect(allocateForeignSettlement({
      direction: "CUSTOMER",
      transactionAmount: "60",
      transactionOpenAmount: "60",
      baseOpenAmount: "225.0001",
      sourceBaseOpenAmount: "219.0001",
      recognitionRate: "3.65",
      settlementRate: "3.80",
      useProportionalCarryingBasis: true,
    })).toMatchObject({
      documentBaseAmount: "225.0001",
      sourceBaseAmount: "219.0001",
      remainingBaseAmount: "0.0000",
      remainingSourceBaseAmount: "0.0000",
    });
  });
});
