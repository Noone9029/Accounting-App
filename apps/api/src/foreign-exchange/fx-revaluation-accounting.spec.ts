import { buildFxRevaluationJournalLines } from "./fx-revaluation-accounting";

describe("FX revaluation journal accounting", () => {
  it("posts receivable gains and losses through AR and unrealized accounts", () => {
    expect(buildFxRevaluationJournalLines({
      baseCurrency: "AED",
      receivableAccountId: "ar",
      payableAccountId: "ap",
      unrealizedGainAccountId: "gain",
      unrealizedLossAccountId: "loss",
      lines: [
        { sourceType: "CUSTOMER_RECEIVABLE", reference: "INV-1", unrealizedGainAmount: "10", unrealizedLossAmount: "0" },
        { sourceType: "CUSTOMER_RECEIVABLE", reference: "INV-2", unrealizedGainAmount: "0", unrealizedLossAmount: "4" },
      ],
    })).toEqual([
      expect.objectContaining({ accountId: "ar", debit: "10.0000", credit: "0.0000", functionalCurrencyOnly: true }),
      expect.objectContaining({ accountId: "gain", debit: "0.0000", credit: "10.0000", functionalCurrencyOnly: true }),
      expect.objectContaining({ accountId: "loss", debit: "4.0000", credit: "0.0000", functionalCurrencyOnly: true }),
      expect.objectContaining({ accountId: "ar", debit: "0.0000", credit: "4.0000", functionalCurrencyOnly: true }),
    ]);
  });

  it("uses AP for supplier adjustments and omits zero-difference rows", () => {
    expect(buildFxRevaluationJournalLines({
      baseCurrency: "SAR",
      receivableAccountId: "ar",
      payableAccountId: "ap",
      unrealizedGainAccountId: "gain",
      unrealizedLossAccountId: "loss",
      lines: [
        { sourceType: "SUPPLIER_PAYABLE", reference: "BILL-1", unrealizedGainAmount: "3", unrealizedLossAmount: "0" },
        { sourceType: "SUPPLIER_PAYABLE", reference: "BILL-2", unrealizedGainAmount: "0", unrealizedLossAmount: "0" },
      ],
    })).toEqual([
      expect.objectContaining({ accountId: "ap", debit: "3.0000", credit: "0.0000" }),
      expect.objectContaining({ accountId: "gain", debit: "0.0000", credit: "3.0000" }),
    ]);
  });
});
