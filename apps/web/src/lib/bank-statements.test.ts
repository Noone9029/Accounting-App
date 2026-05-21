import {
  bankReconciliationStatusBadgeClass,
  bankReconciliationStatusLabel,
  bankStatementImportStatusLabel,
  bankStatementTransactionStatusLabel,
  bankStatementTransactionTypeLabel,
  candidateScoreLabel,
  closeBlockedMessage,
  closedThroughDateLabel,
  lockedStatementTransactionWarning,
  parseStatementImportText,
  parseStatementRowsText,
  reconciliationDifferenceStatus,
  reconciliationActionBlockedMessage,
  reviewEventLabel,
  statementImportPreviewSummary,
  submitBlockedMessage,
  validateStatementImportFile,
} from "./bank-statements";

describe("bank statement helpers", () => {
  it("formats status, type, and candidate labels", () => {
    expect(bankStatementTransactionStatusLabel("UNMATCHED")).toBe("Unmatched");
    expect(bankStatementTransactionTypeLabel("CREDIT")).toBe("Credit");
    expect(bankStatementImportStatusLabel("IMPORTED")).toBe("Imported");
    expect(bankStatementImportStatusLabel("PARTIALLY_RECONCILED")).toBe("Partially reconciled");
    expect(bankStatementImportStatusLabel("RECONCILED")).toBe("Reconciled");
    expect(bankStatementImportStatusLabel("VOIDED")).toBe("Voided");
    expect(candidateScoreLabel({ score: 95 })).toBe("Strong match");
    expect(candidateScoreLabel({ score: 80 })).toBe("Likely match");
    expect(candidateScoreLabel({ score: 70 })).toBe("Possible match");
  });

  it("parses JSON statement rows from an array or rows object", () => {
    expect(parseStatementRowsText('[{"date":"2026-05-13","description":"Receipt","credit":"10.0000"}]')).toEqual([
      { date: "2026-05-13", description: "Receipt", reference: undefined, debit: "0.0000", credit: "10.0000" },
    ]);
    expect(parseStatementRowsText('{"rows":[{"date":"2026-05-14","description":"Fee","debit":5}]}')).toEqual([
      { date: "2026-05-14", description: "Fee", reference: undefined, debit: "5.0000", credit: "0.0000" },
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

  it("previews signed amount statement rows and duplicate candidates without raw content leakage", () => {
    const result = parseStatementImportText(
      "postedDate,details,bankReference,amount,balance,currency\n13/05/2026,Receipt,PAY-1,100.00,100.00,SAR\n13/05/2026,Receipt,PAY-1,100.00,200.00,SAR",
      { accountCurrency: "SAR" },
    );

    expect(result.format).toBe("CSV");
    expect(result.validRowCount).toBe(2);
    expect(result.duplicateCandidateCount).toBe(1);
    expect(result.rows[0]).toMatchObject({ date: "2026-05-13", description: "Receipt", reference: "PAY-1", credit: "100.0000" });
    expect(result.warnings.map((issue) => issue.message)).toContain("This row may duplicate another row in this file.");
    expect(JSON.stringify(result.errors)).not.toContain("Receipt,PAY-1");
  });

  it("flags malformed dates, malformed amounts, conflicting debit and credit, and currency mismatch", () => {
    const result = parseStatementImportText(
      "date,description,debit,credit,currency\nbad-date,Fee,1.00,2.00,USD\n2026-05-14,,abc,0.00,SAR",
      { accountCurrency: "SAR" },
    );

    expect(result.invalidRowCount).toBe(2);
    expect(result.errors.map((issue) => issue.message)).toEqual(
      expect.arrayContaining(["Invalid date.", "Both debit and credit are populated.", "Invalid debit amount.", "Missing amount."]),
    );
    expect(result.warnings.map((issue) => issue.message)).toContain("Currency USD differs from this bank account currency SAR.");
  });

  it("validates statement upload file size and type", () => {
    expect(validateStatementImportFile({ name: "statement.csv", size: 100, type: "text/csv" })).toBeNull();
    expect(validateStatementImportFile({ name: "statement.pdf", size: 100, type: "application/pdf" })).toMatch(/CSV or JSON/);
    expect(validateStatementImportFile({ name: "statement.csv", size: 1024 * 1024 + 1, type: "text/csv" })).toMatch(/too large/);
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
