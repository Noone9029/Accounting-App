import { bankReconciliationReportCsv, coreReportCsv, csvEscape, toCsv } from "./report-csv";

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
        bankAccount: { displayName: "Operating Bank" },
        summary: {
          itemCount: 1,
          debitTotal: "0.0000",
          creditTotal: "100.0000",
          matchedCount: 1,
          categorizedCount: 0,
          ignoredCount: 0,
        },
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
    expect(csv.content).toContain("REC-000001");
    expect(csv.content).toContain("Deposit,REF-1,CREDIT,100.0000,MATCHED");
  });
});
