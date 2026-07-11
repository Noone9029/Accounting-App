import {
  convertTransactionToBasePreview,
  documentFxPostingIsReady,
  documentFxRateEvidence,
  documentFxIsComplete,
  realizedFxSettlementPreview,
  selectableDocumentRateSnapshots,
  transactionDocumentDisplayTotals,
  transactionLineDisplayAmounts,
} from "./document-fx";

describe("document FX form arithmetic", () => {
  it("converts with exact integer arithmetic and half-up rounding", () => {
    expect(convertTransactionToBasePreview("105.0000", "3.67250000")).toBe("385.6125");
    expect(convertTransactionToBasePreview("1.00005", "1")).toBeNull();
  });

  it("previews customer and supplier realized FX without floating-point arithmetic", () => {
    const allocation = {
      transactionAmountApplied: "100.0000",
      transactionBalanceDue: "100.0000",
      baseBalanceDue: "365.0000",
      recognitionRate: "3.65000000",
    };
    expect(realizedFxSettlementPreview("customer", "3.75000000", [allocation])).toEqual({
      gain: "10.0000", loss: "0.0000", net: "10.0000",
    });
    expect(realizedFxSettlementPreview("supplier", "3.75000000", [allocation])).toEqual({
      gain: "0.0000", loss: "10.0000", net: "-10.0000",
    });
  });

  it("uses the exact remaining base residual for a final partial settlement", () => {
    expect(realizedFxSettlementPreview("customer", "3.75000000", [{
      transactionAmountApplied: "40.0000",
      transactionBalanceDue: "40.0000",
      baseBalanceDue: "145.9999",
      recognitionRate: "3.65000000",
    }])).toEqual({ gain: "4.0001", loss: "0.0000", net: "4.0001" });
  });

  it("shows mixed realized gains and losses gross instead of netting them", () => {
    expect(realizedFxSettlementPreview("customer", "3.75000000", [
      { transactionAmountApplied: "100", transactionBalanceDue: "100", baseBalanceDue: "365", recognitionRate: "3.65" },
      { transactionAmountApplied: "100", transactionBalanceDue: "100", baseBalanceDue: "382", recognitionRate: "3.82" },
    ], "200.0000")).toEqual({ gain: "10.0000", loss: "7.0000", net: "3.0000" });
  });

  it("keeps preview parity when tiny components exhaust the payment base residual", () => {
    expect(realizedFxSettlementPreview("customer", "0.5", Array.from({ length: 4 }, () => ({
      transactionAmountApplied: "0.0001", transactionBalanceDue: "0.0001", baseBalanceDue: "0.0001", recognitionRate: "0.5",
    })), "0.0004")).toEqual({ gain: "0.0000", loss: "0.0002", net: "-0.0002" });
  });

  it("requires a complete foreign rate context while accepting identity-rate base documents", () => {
    expect(documentFxIsComplete({ currency: "AED", exchangeRate: "1", rateDate: "", rateSource: "SYSTEM_RATE_1", rateSnapshotId: null }, "AED")).toBe(true);
    expect(documentFxIsComplete({ currency: "USD", exchangeRate: "3.6725", rateDate: "2026-07-11", rateSource: "MANUAL", rateSnapshotId: null }, "AED")).toBe(true);
    expect(documentFxIsComplete({ currency: "USD", exchangeRate: "0", rateDate: "2026-07-11", rateSource: "MANUAL", rateSnapshotId: null }, "AED")).toBe(false);
    expect(documentFxIsComplete({ currency: "USD", exchangeRate: "3.6725", rateDate: "2026-07-11", rateSource: "SYSTEM_RATE_1", rateSnapshotId: null }, "AED")).toBe(false);
  });

  it("fails closed for incomplete stored drafts and exposes complete captured-rate evidence", () => {
    expect(documentFxPostingIsReady({ currency: "USD", baseCurrency: "AED", exchangeRate: null, rateDate: null, rateSource: null })).toBe(false);
    expect(documentFxPostingIsReady({ currency: "USD", baseCurrency: "AED", exchangeRate: "3.6725", rateDate: "2026-07-11T00:00:00.000Z", rateSource: "MANUAL" })).toBe(true);
    expect(documentFxPostingIsReady({ currency: "AED", baseCurrency: "AED", exchangeRate: "1.00000000", rateDate: "2026-07-11", rateSource: "SYSTEM_RATE_1" })).toBe(true);
    expect(documentFxRateEvidence({ currency: "USD", baseCurrency: "AED", exchangeRate: "3.67250000", rateDate: "2026-07-11T00:00:00.000Z", rateSource: "MANUAL" })).toBe(
      "1 USD = 3.67250000 AED · 2026-07-11 · Manual",
    );
  });

  it("prefers transaction amounts for foreign-document presentation while preserving legacy fallbacks", () => {
    expect(transactionDocumentDisplayTotals({
      subtotal: "367.2500", discountTotal: "0", taxableTotal: "367.2500", taxTotal: "18.3625", total: "385.6125",
      transactionSubtotal: "100.0000", transactionDiscountTotal: "0", transactionTaxableTotal: "100.0000", transactionTaxTotal: "5.0000", transactionTotal: "105.0000",
    })).toEqual({ subtotal: "100.0000", discountTotal: "0", taxableTotal: "100.0000", taxTotal: "5.0000", total: "105.0000" });
    expect(transactionLineDisplayAmounts({
      lineGrossAmount: "367.2500", discountAmount: "0", taxableAmount: "367.2500", taxAmount: "18.3625", lineTotal: "385.6125",
      transactionLineGrossAmount: "100.0000", transactionDiscountAmount: "0", transactionTaxableAmount: "100.0000", transactionTaxAmount: "5.0000", transactionLineTotal: "105.0000",
    }).lineTotal).toBe("105.0000");
  });

  it("never offers disabled provider snapshots as document rates", () => {
    expect(selectableDocumentRateSnapshots([
      { id: "manual", source: "MANUAL" },
      { id: "import", source: "IMPORT" },
      { id: "disabled", source: "FUTURE_PROVIDER_DISABLED" },
      { id: "identity", source: "SYSTEM_RATE_1" },
    ])).toEqual([
      { id: "manual", source: "MANUAL" },
      { id: "import", source: "IMPORT" },
    ]);
  });
});
