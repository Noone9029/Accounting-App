import { suggestBankStatementMatches, MatchSuggestionJournalLine, MatchSuggestionStatement } from "./bank-statement-match-suggestions";

describe("bank statement match suggestions", () => {
  const statement: MatchSuggestionStatement = {
    transactionDate: new Date("2026-05-13T00:00:00.000Z"),
    type: "CREDIT",
    amount: "250.0000",
    status: "UNMATCHED",
    reference: "PAY-1001",
    description: "Receipt from Sample Trading invoice INV-4477",
    counterparty: "Sample Trading",
  };

  it("scores and ranks deterministic non-mutating match suggestions", () => {
    const result = suggestBankStatementMatches(statement, [
      journalLine({
        id: "line-near",
        debit: "250.0000",
        credit: "0.0000",
        entryNumber: "JE-000002",
        entryDate: "2026-05-15",
        description: "Receipt from Sample Trading INV-4477",
        reference: "BANK",
      }),
      journalLine({
        id: "line-strong",
        debit: "250.0000",
        credit: "0.0000",
        entryNumber: "JE-000001",
        entryDate: "2026-05-13",
        description: "Customer payment from Sample Trading",
        reference: "PAY-1001",
      }),
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        journalLineId: "line-strong",
        score: 100,
        reason: "amount and direction match, same date, reference match, counterparty text match, document number match",
      }),
      expect.objectContaining({
        journalLineId: "line-near",
        score: 88,
        reason: "amount and direction match, nearby date, counterparty text match, document number match",
      }),
    ]);
  });

  it("filters direction mismatches, date-window misses, and non-unmatched statement rows", () => {
    expect(
      suggestBankStatementMatches(statement, [
        journalLine({ id: "wrong-direction", debit: "0.0000", credit: "250.0000" }),
        journalLine({ id: "outside-window", debit: "250.0000", credit: "0.0000", entryDate: "2026-05-25" }),
      ]),
    ).toEqual([]);

    expect(
      suggestBankStatementMatches(
        {
          ...statement,
          status: "MATCHED",
        },
        [journalLine({ id: "line-1", debit: "250.0000", credit: "0.0000" })],
      ),
    ).toEqual([]);
  });

  it("supports debit statement rows with opposite posted bank-line direction", () => {
    const result = suggestBankStatementMatches(
      {
        ...statement,
        type: "DEBIT",
        amount: "15.5000",
        reference: "FEE-1",
        description: "Bank fee FEE-1",
        counterparty: null,
      },
      [journalLine({ id: "fee-line", debit: "0.0000", credit: "15.5000", reference: "FEE-1" })],
    );

    expect(result).toEqual([expect.objectContaining({ journalLineId: "fee-line", score: 100, reason: expect.stringContaining("document number match") })]);
  });
});

function journalLine(overrides: Partial<MatchSuggestionJournalLine> & { entryDate?: string; entryNumber?: string; reference?: string } = {}): MatchSuggestionJournalLine {
  return {
    id: overrides.id ?? "line-1",
    debit: overrides.debit ?? "250.0000",
    credit: overrides.credit ?? "0.0000",
    description: overrides.description ?? "Posted bank line",
    journalEntry: {
      id: overrides.journalEntry?.id ?? "journal-1",
      entryNumber: overrides.entryNumber ?? overrides.journalEntry?.entryNumber ?? "JE-000001",
      entryDate: new Date(overrides.entryDate ?? overrides.journalEntry?.entryDate ?? "2026-05-13T00:00:00.000Z"),
      description: overrides.journalEntry?.description ?? "Posted bank entry",
      reference: overrides.reference ?? overrides.journalEntry?.reference ?? null,
    },
  };
}
