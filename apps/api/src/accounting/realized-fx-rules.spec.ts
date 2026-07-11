import { AccountingRuleError, allocateForeignSettlement } from "@ledgerbyte/accounting-core";
import { buildRealizedFxAdjustmentJournalLines } from "../foreign-exchange/realized-fx-adjustment";

describe("realized FX settlement arithmetic", () => {
  it("recognizes a customer gain when settlement base exceeds receivable carrying base", () => {
    expect(allocateForeignSettlement({
      direction: "CUSTOMER",
      transactionAmount: "100.0000",
      transactionOpenAmount: "100.0000",
      baseOpenAmount: "365.0000",
      recognitionRate: "3.65000000",
      settlementRate: "3.75000000",
    })).toEqual({
      transactionAmount: "100.0000",
      documentBaseAmount: "365.0000",
      settlementBaseAmount: "375.0000",
      realizedGainAmount: "10.0000",
      realizedLossAmount: "0.0000",
      remainingTransactionAmount: "0.0000",
      remainingBaseAmount: "0.0000",
    });
  });

  it("recognizes customer loss and supplier gain/loss with the correct accounting direction", () => {
    expect(allocateForeignSettlement({
      direction: "CUSTOMER", transactionAmount: "100", transactionOpenAmount: "100", baseOpenAmount: "375", recognitionRate: "3.75", settlementRate: "3.65",
    })).toMatchObject({ realizedGainAmount: "0.0000", realizedLossAmount: "10.0000" });
    expect(allocateForeignSettlement({
      direction: "SUPPLIER", transactionAmount: "100", transactionOpenAmount: "100", baseOpenAmount: "375", recognitionRate: "3.75", settlementRate: "3.65",
    })).toMatchObject({ realizedGainAmount: "10.0000", realizedLossAmount: "0.0000" });
    expect(allocateForeignSettlement({
      direction: "SUPPLIER", transactionAmount: "100", transactionOpenAmount: "100", baseOpenAmount: "365", recognitionRate: "3.65", settlementRate: "3.75",
    })).toMatchObject({ realizedGainAmount: "0.0000", realizedLossAmount: "10.0000" });
  });

  it("allocates partial carrying value at the document rate and consumes the exact final residual", () => {
    expect(allocateForeignSettlement({
      direction: "CUSTOMER", transactionAmount: "40", transactionOpenAmount: "100", baseOpenAmount: "365.0001", recognitionRate: "3.65", settlementRate: "3.75",
    })).toEqual({
      transactionAmount: "40.0000",
      documentBaseAmount: "146.0000",
      settlementBaseAmount: "150.0000",
      realizedGainAmount: "4.0000",
      realizedLossAmount: "0.0000",
      remainingTransactionAmount: "60.0000",
      remainingBaseAmount: "219.0001",
    });
    expect(allocateForeignSettlement({
      direction: "CUSTOMER", transactionAmount: "60", transactionOpenAmount: "60", baseOpenAmount: "219.0001", recognitionRate: "3.65", settlementRate: "3.75",
    })).toMatchObject({ documentBaseAmount: "219.0001", remainingBaseAmount: "0.0000" });
  });

  it("consumes the exact final settlement-base residual across rounded components", () => {
    const first = allocateForeignSettlement({
      direction: "CUSTOMER", transactionAmount: "0.0200", transactionOpenAmount: "0.0200", baseOpenAmount: "0.0730",
      recognitionRate: "3.65000000", settlementRate: "3.67250000",
      settlementTransactionOpenAmount: "1.0000", settlementBaseOpenAmount: "3.6725",
    });
    expect(first.settlementBaseAmount).toBe("0.0735");
    const final = allocateForeignSettlement({
      direction: "CUSTOMER", transactionAmount: "0.9800", transactionOpenAmount: "0.9800", baseOpenAmount: "3.5770",
      recognitionRate: "3.65000000", settlementRate: "3.67250000",
      settlementTransactionOpenAmount: "0.9800", settlementBaseOpenAmount: "3.5990",
    });
    expect(final.settlementBaseAmount).toBe("3.5990");
    expect([first.settlementBaseAmount, final.settlementBaseAmount]).toEqual(["0.0735", "3.5990"]);
  });

  it("allows zero-base components after tiny allocations exhaust the settlement residual", () => {
    let settlementTransactionOpen = "0.0004";
    let settlementBaseOpen = "0.0002";
    const settlementComponents: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      const allocation = allocateForeignSettlement({
        direction: index % 2 === 0 ? "CUSTOMER" : "SUPPLIER",
        transactionAmount: "0.0001", transactionOpenAmount: "0.0001", baseOpenAmount: "0.0001",
        recognitionRate: "0.5", settlementRate: "0.5",
        settlementTransactionOpenAmount: settlementTransactionOpen,
        settlementBaseOpenAmount: settlementBaseOpen,
      });
      settlementComponents.push(allocation.settlementBaseAmount);
      settlementTransactionOpen = `0.000${3 - index}`;
      settlementBaseOpen = index === 0 ? "0.0001" : "0.0000";
    }
    expect(settlementComponents).toEqual(["0.0001", "0.0001", "0.0000", "0.0000"]);
  });

  it("produces no FX at the same rate and rejects over-allocation", () => {
    expect(allocateForeignSettlement({
      direction: "CUSTOMER", transactionAmount: "25", transactionOpenAmount: "100", baseOpenAmount: "367.25", recognitionRate: "3.6725", settlementRate: "3.6725",
    })).toMatchObject({ realizedGainAmount: "0.0000", realizedLossAmount: "0.0000" });
    expect(() => allocateForeignSettlement({
      direction: "CUSTOMER", transactionAmount: "101", transactionOpenAmount: "100", baseOpenAmount: "365", recognitionRate: "3.65", settlementRate: "3.75",
    })).toThrow(AccountingRuleError);
  });

  it("builds functional-currency-only gain and loss adjustment journals", () => {
    expect(buildRealizedFxAdjustmentJournalLines({
      clearingAccountId: "ar", realizedGainAccountId: "gain", realizedGainAmount: "10", realizedLossAmount: "0",
      baseCurrency: "AED", reference: "PAY-1",
    })).toEqual([
      expect.objectContaining({ accountId: "ar", debit: "10.0000", functionalCurrencyOnly: true }),
      expect.objectContaining({ accountId: "gain", credit: "10.0000", functionalCurrencyOnly: true }),
    ]);
    expect(buildRealizedFxAdjustmentJournalLines({
      clearingAccountId: "ap", realizedLossAccountId: "loss", realizedGainAmount: "0", realizedLossAmount: "7.5",
      baseCurrency: "SAR", reference: "PAY-2",
    })).toEqual([
      expect.objectContaining({ accountId: "loss", debit: "7.5000", functionalCurrencyOnly: true }),
      expect.objectContaining({ accountId: "ap", credit: "7.5000", functionalCurrencyOnly: true }),
    ]);
  });
});
