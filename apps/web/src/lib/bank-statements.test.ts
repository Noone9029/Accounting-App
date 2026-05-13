import {
  bankReconciliationStatusBadgeClass,
  bankReconciliationStatusLabel,
  bankStatementTransactionStatusLabel,
  bankStatementTransactionTypeLabel,
  candidateScoreLabel,
  closeBlockedMessage,
  closedThroughDateLabel,
  lockedStatementTransactionWarning,
  parseStatementRowsText,
  reconciliationDifferenceStatus,
  reconciliationActionBlockedMessage,
  reviewEventLabel,
  statementImportPreviewSummary,
  submitBlockedMessage,
} from "./bank-statements";

describe("bank statement helpers", () => {
  it("formats status, type, and candidate labels", () => {
    expect(bankStatementTransactionStatusLabel("UNMATCHED")).toBe("Unmatched");
    expect(bankStatementTransactionTypeLabel("CREDIT")).toBe("Credit");
    expect(candidateScoreLabel({ score: 95 })).toBe("Strong match");
    expect(candidateScoreLabel({ score: 80 })).toBe("Likely match");
    expect(candidateScoreLabel({ score: 70 })).toBe("Possible match");
  });

  it("parses JSON statement rows from an array or rows object", () => {
    expect(parseStatementRowsText('[{"date":"2026-05-13","description":"Receipt","credit":"10.0000"}]')).toEqual([
      { date: "2026-05-13", description: "Receipt", reference: undefined, debit: "0.0000", credit: "10.0000" },
    ]);
    expect(parseStatementRowsText('{"rows":[{"date":"2026-05-14","description":"Fee","debit":5}]}')).toEqual([
      { date: "2026-05-14", description: "Fee", reference: undefined, debit: "5", credit: "0.0000" },
    ]);
  });

  it("parses simple CSV statement rows with quoted descriptions", () => {
    expect(parseStatementRowsText('date,description,reference,debit,credit\n2026-05-13,"Bank, fee",FEE-1,2.5000,0.0000')).toEqual([
      { date: "2026-05-13", description: "Bank, fee", reference: "FEE-1", debit: "2.5000", credit: "0.0000" },
    ]);
  });

  it("parses CSV statement rows with common bank header aliases", () => {
    expect(parseStatementRowsText("Transaction Date,Memo,Ref,Money Out,Money In\n2026-05-13,Receipt,PAY-1,0.0000,10.0000")).toEqual([
      { date: "2026-05-13", description: "Receipt", reference: "PAY-1", debit: "0.0000", credit: "10.0000" },
    ]);
  });

  it("computes reconciliation status from difference and unmatched count", () => {
    expect(
      reconciliationDifferenceStatus({
        statusSuggestion: "NEEDS_REVIEW",
        difference: "0.0000",
        totals: { unmatched: { count: 0, total: "0.0000" } },
      } as never),
    ).toBe("RECONCILED");
    expect(
      reconciliationDifferenceStatus({
        statusSuggestion: "NEEDS_REVIEW",
        difference: "5.0000",
        totals: { unmatched: { count: 0, total: "0.0000" } },
      } as never),
    ).toBe("NEEDS_REVIEW");
  });

  it("formats reconciliation close and lock helpers", () => {
    expect(bankReconciliationStatusLabel("CLOSED")).toBe("Closed");
    expect(bankReconciliationStatusLabel("PENDING_APPROVAL")).toBe("Pending approval");
    expect(bankReconciliationStatusBadgeClass("DRAFT")).toContain("amber");
    expect(submitBlockedMessage({ status: "DRAFT", difference: "5.0000", unmatchedTransactionCount: 0 })).toBe(
      "Cannot submit reconciliation while difference is not zero.",
    );
    expect(submitBlockedMessage({ status: "DRAFT", difference: "0.0000", unmatchedTransactionCount: 1 })).toBe(
      "Cannot submit reconciliation with unmatched statement transactions.",
    );
    expect(closeBlockedMessage({ status: "DRAFT", difference: "0.0000", unmatchedTransactionCount: 0 })).toBe(
      "Reconciliation must be approved before it can be closed.",
    );
    expect(closeBlockedMessage({ status: "APPROVED", difference: "5.0000", unmatchedTransactionCount: 0 })).toBe(
      "Cannot close reconciliation while difference is not zero.",
    );
    expect(closeBlockedMessage({ status: "APPROVED", difference: "0.0000", unmatchedTransactionCount: 1 })).toBe(
      "Cannot close reconciliation with unmatched statement transactions.",
    );
    expect(closeBlockedMessage({ status: "APPROVED", difference: "0.0000", unmatchedTransactionCount: 0 })).toBeNull();
    expect(reconciliationActionBlockedMessage({ status: "PENDING_APPROVAL", difference: "0.0000" }, "approve")).toBeNull();
    expect(closedThroughDateLabel({ closedThroughDate: "2026-05-31T23:59:59.999Z" })).toBe("2026-05-31");
    expect(
      lockedStatementTransactionWarning({
        reconciliationItems: [
          {
            id: "item-1",
            reconciliationId: "rec-1",
            reconciliation: {
              id: "rec-1",
              reconciliationNumber: "REC-000001",
              status: "CLOSED",
              periodStart: "2026-05-01",
              periodEnd: "2026-05-31",
              closedAt: "2026-05-31",
            },
          },
        ],
      }),
    ).toBe("Statement transaction belongs to closed reconciliation REC-000001.");
  });

  it("formats import preview and review timeline helpers", () => {
    expect(
      statementImportPreviewSummary({
        rowCount: 3,
        validRows: [{ rowNumber: 1 }] as never,
        invalidRows: [{ rowNumber: 2 }] as never,
        totalCredits: "10.0000",
        totalDebits: "2.0000",
      }),
    ).toBe("1 valid / 1 invalid of 3 rows. Credits 10.0000, debits 2.0000.");
    expect(reviewEventLabel({ action: "APPROVE", fromStatus: "PENDING_APPROVAL", toStatus: "APPROVED" })).toBe(
      "Approve: Pending approval to Approved",
    );
  });
});
