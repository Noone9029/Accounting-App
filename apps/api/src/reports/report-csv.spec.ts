import { bankReconciliationReportCsv, coreReportCsv, csvEscape, toCsv, vatReturnCsv } from "./report-csv";

describe("report CSV helpers", () => {
  it("escapes commas, quotes, and newlines", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape("Cash, Bank")).toBe('"Cash, Bank"');
    expect(csvEscape('Say "yes"')).toBe('"Say ""yes"""');
    expect(csvEscape("line 1\nline 2")).toBe('"line 1\nline 2"');
  });

  it("builds CRLF-terminated CSV rows", () => {
    expect(toCsv([["Name", "Value"], ["Cash, Bank", "100.0000"]])).toBe('Name,Value\r\n"Cash, Bank",100.0000\r\n');
  });

  it("exports trial balance rows with accountant-friendly headers", () => {
    const csv = coreReportCsv(
      "trial-balance",
      {
        from: "2026-05-01",
        to: "2026-05-31",
        accounts: [
          {
            code: "111",
            name: "Operating Bank",
            type: "ASSET",
            openingDebit: "0.0000",
            openingCredit: "0.0000",
            periodDebit: "100.0000",
            periodCredit: "0.0000",
            closingDebit: "100.0000",
            closingCredit: "0.0000",
          },
        ],
        totals: {
          openingDebit: "0.0000",
          openingCredit: "0.0000",
          periodDebit: "100.0000",
          periodCredit: "100.0000",
          closingDebit: "100.0000",
          closingCredit: "100.0000",
        },
      },
      new Date("2026-05-13T10:00:00.000Z"),
    );

    expect(csv.filename).toBe("trial-balance-2026-05-13.csv");
    expect(csv.content).toContain("Trial Balance");
    expect(csv.content).toContain("Account Code,Account Name,Type");
    expect(csv.content).toContain("111,Operating Bank,ASSET");
  });

  it("exports bank reconciliation report snapshots", () => {
    const csv = bankReconciliationReportCsv(
      {
        reconciliation: {
          reconciliationNumber: "REC-000001",
          periodStart: "2026-05-01T00:00:00.000Z",
          periodEnd: "2026-05-31T00:00:00.000Z",
          status: "CLOSED",
          statementOpeningBalance: "0.0000",
          statementClosingBalance: "100.0000",
          ledgerClosingBalance: "100.0000",
          difference: "0.0000",
          closedAt: "2026-05-13T00:00:00.000Z",
          closedBy: { name: "Owner" },
        },
        bankAccount: { displayName: "Operating Bank", account: { code: "1010", name: "Operating Bank" } },
        summary: {
          itemCount: 1,
          debitTotal: "0.0000",
          creditTotal: "100.0000",
          matchedCount: 1,
          categorizedCount: 0,
          ignoredCount: 0,
          totalRowsCount: 2,
          debitRowsTotal: "25.0000",
          creditRowsTotal: "100.0000",
          matchedRowsCount: 1,
          categorizedRowsCount: 0,
          ignoredRowsCount: 0,
          unmatchedRowsCount: 1,
          unreconciledRowsCount: 1,
          exceptionRowsCount: 1,
          ruleAppliedRowsCount: 1,
        },
        linkedTreasurySummary: {
          depositBatches: { count: 1, matchedCount: 1, journalPostedCount: 1, operationalOnlyCount: 0, totalAmount: "100.0000" },
          cardSettlements: { count: 1, matchedCount: 0, journalPostedCount: 0, operationalOnlyCount: 1, totalAmount: "50.0000" },
          cheques: { count: 1, matchedCount: 1, journalPostedCount: 0, operationalOnlyCount: 1, totalAmount: "30.0000" },
        },
        accountingStatusSummary: {
          clearingConfigEnabled: true,
          configuredAccountCount: 2,
          journalPostedCount: 1,
          operationalOnlyCount: 2,
          missingClearingConfig: false,
        },
        auditTimeline: [
          {
            occurredAt: "2026-05-10T01:00:00.000Z",
            type: "STATEMENT_ROW_REVIEW",
            label: "Statement row matched",
            entityType: "BankStatementTransaction",
            entityId: "statement-1",
            status: "MATCHED",
            actor: { name: "Owner" },
            amount: "100.0000",
            reference: "REF-1",
          },
        ],
        items: [
          {
            transactionDate: "2026-05-02T00:00:00.000Z",
            description: "Deposit",
            reference: "REF-1",
            type: "CREDIT",
            amount: "100.0000",
            statusAtClose: "MATCHED",
          },
        ],
      },
      new Date("2026-05-13T10:00:00.000Z"),
    );

    expect(csv.filename).toBe("reconciliation-REC-000001.csv");
    expect(csv.content).toContain("Bank Reconciliation Report");
    expect(csv.content).toContain("Banking Mode,Manual statement import only");
    expect(csv.content).toContain("Live Bank Feed,Not enabled");
    expect(csv.content).toContain("Payment Initiation,Not enabled");
    expect(csv.content).toContain("Linked Treasury Summary");
    expect(csv.content).toContain("Deposits,1,1,1,0,100.0000");
    expect(csv.content).toContain("Accounting Status");
    expect(csv.content).toContain("Audit Timeline");
    expect(csv.content).toContain("STATEMENT_ROW_REVIEW,Statement row matched");
    expect(csv.content).toContain("REC-000001");
    expect(csv.content).toContain("Deposit,REF-1,CREDIT,100.0000,MATCHED");
    expect(csv.content).not.toContain("rawData");
    expect(csv.content).not.toContain("uploadedBody");
  });

  it("exports VAT Return as an internal draft review CSV only", () => {
    const csv = vatReturnCsv(
      {
        from: "2026-05-01",
        to: "2026-05-31",
        basis: "FINALIZED_SOURCE_DOCUMENTS",
        outputVat: "15.0000",
        inputVat: "5.0000",
        netVat: "10.0000",
        netVatPayable: "10.0000",
        netVatRefundable: "0.0000",
        sales: {
          documentCount: 1,
          taxableAmount: "100.0000",
          taxAmount: "15.0000",
          grossAmount: "115.0000",
          documents: [{ number: "INV-001", documentDate: "2026-05-03", taxableAmount: "100.0000", taxAmount: "15.0000", grossAmount: "115.0000" }],
        },
        purchases: {
          documentCount: 1,
          taxableAmount: "33.3333",
          taxAmount: "5.0000",
          grossAmount: "38.3333",
          documents: [{ number: "BILL-001", documentDate: "2026-05-04", taxableAmount: "33.3333", taxAmount: "5.0000", grossAmount: "38.3333" }],
        },
        notes: ["Internal review only. Not an official filing format."],
      },
      new Date("2026-05-13T10:00:00.000Z"),
    );

    expect(csv.filename).toBe("vat-return-draft-review-2026-05-13.csv");
    expect(csv.content).toContain("Draft VAT Return Review Export");
    expect(csv.content).toContain("Review Status,Internal review only");
    expect(csv.content).toContain("Official Filing Format,Not implemented");
    expect(csv.content).toContain("INV-001,2026-05-03,100.0000,15.0000,115.0000");
    expect(csv.content).toContain("BILL-001,2026-05-04,33.3333,5.0000,38.3333");
  });
});
