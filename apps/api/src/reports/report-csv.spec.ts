import { advancedReportCsv, bankReconciliationReportCsv, coreReportCsv, csvEscape, toCsv, vatReturnCsv } from "./report-csv";

describe("report CSV helpers", () => {
  it("escapes commas, quotes, and newlines", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape("Cash, Bank")).toBe('"Cash, Bank"');
    expect(csvEscape('Say "yes"')).toBe('"Say ""yes"""');
    expect(csvEscape("line 1\nline 2")).toBe('"line 1\nline 2"');
  });

  it("protects formula-like CSV cells while preserving negative numeric amounts", () => {
    expect(csvEscape("=HYPERLINK(\"https://example.test\")")).toBe('"\'=HYPERLINK(""https://example.test"")"');
    expect(csvEscape("+SUM(1,1)")).toBe('"\'+SUM(1,1)"');
    expect(csvEscape("@cmd")).toBe("'@cmd");
    expect(csvEscape("-cmd")).toBe("'-cmd");
    expect(csvEscape("-10.5000")).toBe("-10.5000");
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

  it("includes readable dimension filter labels in supported core and advanced CSV exports", () => {
    const filters = {
      costCenter: { id: "cost-center-1", code: "CC-OPS", name: "Operations", status: "ACTIVE" },
      project: { id: "project-1", code: "PRJ-ALPHA", name: "Alpha", status: "ARCHIVED" },
    };
    const coreCsv = coreReportCsv(
      "trial-balance",
      { from: null, to: null, filters, accounts: [], totals: {} },
      new Date("2026-05-13T10:00:00.000Z"),
    );
    const advancedCsv = advancedReportCsv(
      "cash-flow",
      { from: null, to: null, filters, rows: [], totals: {} },
      new Date("2026-05-13T10:00:00.000Z"),
    );

    for (const csv of [coreCsv, advancedCsv]) {
      expect(csv.content).toContain("Cost Center,CC-OPS Operations\r\n");
      expect(csv.content).toContain("Project,PRJ-ALPHA Alpha\r\n");
    }
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

  it("exports advanced cash flow CSV without changing report math or implying PDF support", () => {
    const csv = advancedReportCsv(
      "cash-flow",
      {
        from: "2026-05-01",
        to: "2026-05-31",
        basis: "POSTED_AND_REVERSED_CASH_AND_BANK_JOURNAL_LINES",
        granularity: "month",
        rows: [{ period: "2026-05", inflows: "100.0000", outflows: "25.0000", netCashFlow: "75.0000", lineCount: 2 }],
        totals: {
          openingCash: "10.0000",
          inflows: "100.0000",
          outflows: "25.0000",
          netCashFlow: "75.0000",
          closingCash: "85.0000",
          accountCount: 1,
          lineCount: 2,
        },
        notes: ["No provider calls are made."],
      },
      new Date("2026-05-13T10:00:00.000Z"),
    );

    expect(csv.filename).toBe("cash-flow-2026-05-13.csv");
    expect(csv.content).toContain("Cash Flow");
    expect(csv.content).toContain("Export Status,CSV supported");
    expect(csv.content).toContain("PDF Export,Not implemented");
    expect(csv.content).toContain("Opening Cash,10.0000");
    expect(csv.content).toContain("2026-05,100.0000,25.0000,75.0000,2");
    expect(csv.content).not.toContain("rawData");
  });

  it("exports advanced sales ranking CSVs with formula-cell protection", () => {
    const customers = advancedReportCsv(
      "top-customers",
      {
        from: "2026-05-01",
        to: "2026-05-31",
        basis: "FINALIZED_SALES_INVOICES",
        limit: 10,
        rows: [
          {
            customer: { id: "customer-1", name: "=SUM(1,1)", displayName: "+Acme" },
            invoiceCount: 1,
            taxableAmount: "100.0000",
            taxAmount: "15.0000",
            grossAmount: "115.0000",
            latestInvoiceDate: "2026-05-03T00:00:00.000Z",
          },
        ],
        totals: { customerCount: 1, invoiceCount: 1, taxableAmount: "100.0000", taxAmount: "15.0000", grossAmount: "115.0000" },
        notes: [],
      },
      new Date("2026-05-13T10:00:00.000Z"),
    );
    const products = advancedReportCsv(
      "top-products-services",
      {
        from: "2026-05-01",
        to: "2026-05-31",
        basis: "FINALIZED_SALES_INVOICE_LINES",
        limit: 10,
        rows: [
          {
            kind: "UNCATALOGED_LINE",
            label: "-cmd",
            item: null,
            lineCount: 1,
            quantity: "2.0000",
            taxableAmount: "100.0000",
            taxAmount: "15.0000",
            grossAmount: "115.0000",
            latestInvoiceDate: "2026-05-03T00:00:00.000Z",
          },
        ],
        totals: {
          lineCount: 1,
          catalogItemCount: 0,
          uncatalogedLineGroupCount: 1,
          quantity: "2.0000",
          taxableAmount: "100.0000",
          taxAmount: "15.0000",
          grossAmount: "115.0000",
        },
        notes: [],
      },
      new Date("2026-05-13T10:00:00.000Z"),
    );

    expect(customers.content).toContain("'+Acme,1,100.0000,15.0000,115.0000,2026-05-03");
    expect(products.content).toContain("UNCATALOGED_LINE,'-cmd,,1,2.0000,100.0000,15.0000,115.0000,2026-05-03");
  });
});
