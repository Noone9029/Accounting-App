import {
  AccountingRuleError,
  assertBalancedJournal,
  assertDraftEditable,
  createReversalLines,
  getJournalTotals,
} from "@ledgerbyte/accounting-core";

const balancedLines = [
  { accountId: "cash", debit: "100.00", credit: "0.00", currency: "SAR" },
  { accountId: "sales", debit: "0.00", credit: "100.00", currency: "SAR" },
];

describe("journal accounting rules", () => {
  it("accepts balanced journal entries", () => {
    expect(() => assertBalancedJournal(balancedLines)).not.toThrow();
    expect(getJournalTotals(balancedLines)).toEqual({ debit: "100.0000", credit: "100.0000" });
  });

  it("rejects unbalanced journal entries before posting", () => {
    expect(() =>
      assertBalancedJournal([
        { accountId: "cash", debit: "100.00", credit: "0.00", currency: "SAR" },
        { accountId: "sales", debit: "0.00", credit: "99.99", currency: "SAR" },
      ]),
    ).toThrow(AccountingRuleError);
  });

  it("prevents editing non-draft journal entries", () => {
    expect(() => assertDraftEditable("POSTED")).toThrow(AccountingRuleError);
    expect(() => assertDraftEditable("REVERSED")).toThrow(AccountingRuleError);
  });

  it("creates balanced opposite lines for reversal", () => {
    const reversal = createReversalLines(balancedLines);
    expect(reversal).toEqual([
      { accountId: "cash", debit: "0.0000", credit: "100.0000", description: "Reversal", currency: "SAR", exchangeRate: "1", taxRateId: null },
      { accountId: "sales", debit: "100.0000", credit: "0.0000", description: "Reversal", currency: "SAR", exchangeRate: "1", taxRateId: null },
    ]);
    expect(() => assertBalancedJournal(reversal)).not.toThrow();
  });
});
