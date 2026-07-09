export type CoreReportKind =
  | "general-ledger"
  | "trial-balance"
  | "profit-and-loss"
  | "balance-sheet"
  | "vat-summary"
  | "aged-receivables"
  | "aged-payables";

export type AdvancedReportKind = "cash-flow" | "revenue-trend" | "top-customers" | "top-products-services";

export interface CsvFile {
  filename: string;
  content: string;
}

export function vatReturnCsv(report: any, generatedAt = new Date()): CsvFile {
  const rows: unknown[][] = [
    ["Draft VAT Return Review Export"],
    ["Generated At", generatedAt.toISOString()],
    ["Period From", report.from ?? ""],
    ["Period To", report.to ?? ""],
    ["Basis", report.basis ?? ""],
    ["Review Status", "Internal review only"],
    ["Official Filing Format", "Not implemented"],
    ["Authority Submission", "Not implemented"],
    [],
    ["Metric", "Amount"],
    ["Output VAT (sales)", report.outputVat],
    ["Input VAT (purchases)", report.inputVat],
    ["Net VAT", report.netVat],
    ["Net VAT Payable", report.netVatPayable],
    ["Net VAT Refundable", report.netVatRefundable],
    [],
    ["Source", "Document Count", "Taxable Amount", "Tax Amount", "Gross Amount"],
    ["Finalized sales invoices", report.sales?.documentCount, report.sales?.taxableAmount, report.sales?.taxAmount, report.sales?.grossAmount],
    ["Finalized purchase bills", report.purchases?.documentCount, report.purchases?.taxableAmount, report.purchases?.taxAmount, report.purchases?.grossAmount],
    [],
    ["Notes"],
  ];

  for (const note of report.notes ?? []) {
    rows.push([note]);
  }

  appendVatReturnDocuments(rows, "Sales documents", report.sales?.documents ?? []);
  appendVatReturnDocuments(rows, "Purchase documents", report.purchases?.documents ?? []);

  return { filename: `vat-return-draft-review-${filenameDate(generatedAt)}.csv`, content: toCsv(rows) };
}

const reportTitles: Record<CoreReportKind, string> = {
  "general-ledger": "General Ledger",
  "trial-balance": "Trial Balance",
  "profit-and-loss": "Profit & Loss",
  "balance-sheet": "Balance Sheet",
  "vat-summary": "VAT Summary",
  "aged-receivables": "Aged Receivables",
  "aged-payables": "Aged Payables",
};

const advancedReportTitles: Record<AdvancedReportKind, string> = {
  "cash-flow": "Cash Flow",
  "revenue-trend": "Revenue Trend",
  "top-customers": "Top Customers",
  "top-products-services": "Top Products & Services",
};

export function csvEscape(value: unknown): string {
  const text = csvSafeCellText(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

export function toCsv(rows: unknown[][]): string {
  return `${rows.map((row) => row.map(csvEscape).join(",")).join("\r\n")}\r\n`;
}

export function coreReportCsv(kind: CoreReportKind, report: any, generatedAt = new Date()): CsvFile {
  const rows: unknown[][] = reportHeaderRows(reportTitles[kind], report, generatedAt);

  if (kind === "general-ledger") {
    rows.push([]);
    for (const account of report.accounts ?? []) {
      rows.push([`${account.code} ${account.name}`, account.type]);
      rows.push(["Opening Debit", "Opening Credit", "Period Debit", "Period Credit", "Closing Debit", "Closing Credit"]);
      rows.push([account.openingDebit, account.openingCredit, account.periodDebit, account.periodCredit, account.closingDebit, account.closingCredit]);
      rows.push(["Date", "Entry", "Description", "Reference", "Debit", "Credit", "Running Balance"]);
      for (const line of account.lines ?? []) {
        rows.push([dateOnly(line.date), line.entryNumber, line.description, line.reference ?? "", line.debit, line.credit, line.runningBalance]);
      }
      rows.push([]);
    }
  } else if (kind === "trial-balance") {
    rows.push([], ["Account Code", "Account Name", "Type", "Opening Debit", "Opening Credit", "Period Debit", "Period Credit", "Closing Debit", "Closing Credit"]);
    for (const account of report.accounts ?? []) {
      rows.push([account.code, account.name, account.type, account.openingDebit, account.openingCredit, account.periodDebit, account.periodCredit, account.closingDebit, account.closingCredit]);
    }
    rows.push(["Totals", "", "", report.totals?.openingDebit, report.totals?.openingCredit, report.totals?.periodDebit, report.totals?.periodCredit, report.totals?.closingDebit, report.totals?.closingCredit]);
  } else if (kind === "profit-and-loss") {
    rows.push([], ["Metric", "Amount"], ["Revenue", report.revenue], ["Cost of Sales", report.costOfSales], ["Gross Profit", report.grossProfit], ["Expenses", report.expenses], ["Net Profit", report.netProfit]);
    for (const section of report.sections ?? []) {
      rows.push([], [String(section.type).replaceAll("_", " "), "Amount"]);
      for (const account of section.accounts ?? []) {
        rows.push([`${account.code} ${account.name}`, account.amount]);
      }
      rows.push([`Total ${String(section.type).replaceAll("_", " ").toLowerCase()}`, section.total]);
    }
  } else if (kind === "balance-sheet") {
    appendAmountSection(rows, "Assets", report.assets);
    appendAmountSection(rows, "Liabilities", report.liabilities);
    appendAmountSection(rows, "Equity", report.equity);
    rows.push([], ["Retained Earnings", report.retainedEarnings], ["Total Assets", report.totalAssets], ["Total Liabilities and Equity", report.totalLiabilitiesAndEquity], ["Difference", report.difference], ["Balanced", report.balanced ? "Yes" : "No"]);
  } else if (kind === "vat-summary") {
    rows.push([], ["Metric", "Amount"], ["Sales VAT", report.salesVat], ["Purchase VAT", report.purchaseVat], ["Net VAT Payable", report.netVatPayable]);
    rows.push([], ["Category", "Account Code", "Amount", "Tax Amount"]);
    for (const section of report.sections ?? []) {
      rows.push([String(section.category).replaceAll("_", " "), section.accountCode, section.amount, section.taxAmount]);
    }
    for (const note of report.notes ?? []) {
      rows.push(["Note", note]);
    }
  } else {
    rows.push([], ["Contact", "Number", "Issue Date", "Due Date", "Total", "Balance Due", "Days Overdue", "Bucket"]);
    for (const row of report.rows ?? []) {
      rows.push([
        row.contact?.displayName ?? row.contact?.name ?? "",
        row.number,
        dateOnly(row.issueDate),
        row.dueDate ? dateOnly(row.dueDate) : "",
        row.total,
        row.balanceDue,
        row.daysOverdue,
        row.bucket,
      ]);
    }
    rows.push([], ["Grand Total", report.grandTotal]);
  }

  return { filename: `${kind}-${filenameDate(generatedAt)}.csv`, content: toCsv(rows) };
}

export function advancedReportCsv(kind: AdvancedReportKind, report: any, generatedAt = new Date()): CsvFile {
  const rows: unknown[][] = reportHeaderRows(advancedReportTitles[kind], report, generatedAt);
  rows.push(["Export Status", "CSV supported"]);
  rows.push(["PDF Export", "Not implemented"]);

  if (kind === "cash-flow") {
    rows.push(
      [],
      ["Summary"],
      ["Opening Cash", report.totals?.openingCash],
      ["Inflows", report.totals?.inflows],
      ["Outflows", report.totals?.outflows],
      ["Net Cash Flow", report.totals?.netCashFlow],
      ["Closing Cash", report.totals?.closingCash],
      ["Cash and Bank Accounts", report.totals?.accountCount],
      ["Journal Lines", report.totals?.lineCount],
      [],
      ["Period", "Inflows", "Outflows", "Net Cash Flow", "Journal Lines"],
    );
    for (const row of report.rows ?? []) {
      rows.push([row.period, row.inflows, row.outflows, row.netCashFlow, row.lineCount]);
    }
  } else if (kind === "revenue-trend") {
    rows.push(
      [],
      ["Summary"],
      ["Revenue", report.totals?.revenue],
      ["Journal Lines", report.totals?.lineCount],
      [],
      ["Period", "Revenue", "Journal Lines"],
    );
    for (const row of report.rows ?? []) {
      rows.push([row.period, row.revenue, row.lineCount]);
    }
  } else if (kind === "top-customers") {
    rows.push(
      [],
      ["Summary"],
      ["Customer Count", report.totals?.customerCount],
      ["Invoice Count", report.totals?.invoiceCount],
      ["Taxable Amount", report.totals?.taxableAmount],
      ["Tax Amount", report.totals?.taxAmount],
      ["Gross Amount", report.totals?.grossAmount],
      ["Limit", report.limit],
      [],
      ["Customer", "Invoice Count", "Taxable Amount", "Tax Amount", "Gross Amount", "Latest Invoice Date"],
    );
    for (const row of report.rows ?? []) {
      rows.push([
        row.customer?.displayName ?? row.customer?.name ?? "",
        row.invoiceCount,
        row.taxableAmount,
        row.taxAmount,
        row.grossAmount,
        dateOnly(row.latestInvoiceDate),
      ]);
    }
  } else {
    rows.push(
      [],
      ["Summary"],
      ["Line Count", report.totals?.lineCount],
      ["Catalog Item Count", report.totals?.catalogItemCount],
      ["Uncataloged Line Groups", report.totals?.uncatalogedLineGroupCount],
      ["Quantity", report.totals?.quantity],
      ["Taxable Amount", report.totals?.taxableAmount],
      ["Tax Amount", report.totals?.taxAmount],
      ["Gross Amount", report.totals?.grossAmount],
      ["Limit", report.limit],
      [],
      ["Kind", "Product or Service", "SKU", "Line Count", "Quantity", "Taxable Amount", "Tax Amount", "Gross Amount", "Latest Invoice Date"],
    );
    for (const row of report.rows ?? []) {
      rows.push([
        row.kind,
        row.label,
        row.item?.sku ?? "",
        row.lineCount,
        row.quantity,
        row.taxableAmount,
        row.taxAmount,
        row.grossAmount,
        dateOnly(row.latestInvoiceDate),
      ]);
    }
  }

  appendReportNotes(rows, report.notes ?? []);
  return { filename: `${kind}-${filenameDate(generatedAt)}.csv`, content: toCsv(rows) };
}

export function bankReconciliationReportCsv(report: any, generatedAt = new Date()): CsvFile {
  const reconciliation = report.reconciliation;
  const rows: unknown[][] = [
    ["Bank Reconciliation Report"],
    ["Generated At", generatedAt.toISOString()],
    ["Banking Mode", "Manual statement import only"],
    ["Live Bank Feed", "Not enabled"],
    ["Payment Initiation", "Not enabled"],
    ["Reconciliation Number", reconciliation.reconciliationNumber],
    ["Bank Account", report.bankAccount?.displayName],
    ["Linked Chart Account", report.bankAccount?.account ? `${report.bankAccount.account.code} ${report.bankAccount.account.name}` : ""],
    ["Period Start", dateOnly(reconciliation.periodStart)],
    ["Period End", dateOnly(reconciliation.periodEnd)],
    ["Status", reconciliation.status],
    ["Statement Opening Balance", reconciliation.statementOpeningBalance ?? ""],
    ["Statement Closing Balance", reconciliation.statementClosingBalance],
    ["Ledger Closing Balance", reconciliation.ledgerClosingBalance],
    ["Difference", reconciliation.difference],
    ["Submitted At", reconciliation.submittedAt ? dateOnly(reconciliation.submittedAt) : ""],
    ["Submitted By", reconciliation.submittedBy?.name ?? reconciliation.submittedBy?.email ?? ""],
    ["Approved At", reconciliation.approvedAt ? dateOnly(reconciliation.approvedAt) : ""],
    ["Approved By", reconciliation.approvedBy?.name ?? reconciliation.approvedBy?.email ?? ""],
    ["Approval Notes", reconciliation.approvalNotes ?? ""],
    ["Closed At", reconciliation.closedAt ? dateOnly(reconciliation.closedAt) : ""],
    ["Closed By", reconciliation.closedBy?.name ?? reconciliation.closedBy?.email ?? ""],
    ["Voided At", reconciliation.voidedAt ? dateOnly(reconciliation.voidedAt) : ""],
    ["Voided By", reconciliation.voidedBy?.name ?? reconciliation.voidedBy?.email ?? ""],
    [],
    ["Summary"],
    [
      "Item Count",
      "Period Rows",
      "Debit Total",
      "Credit Total",
      "Matched",
      "Categorized",
      "Ignored",
      "Unmatched",
      "Unreconciled",
      "Rule Applied Rows",
    ],
    [
      report.summary.itemCount,
      report.summary.totalRowsCount ?? "",
      report.summary.debitRowsTotal ?? report.summary.debitTotal,
      report.summary.creditRowsTotal ?? report.summary.creditTotal,
      report.summary.matchedRowsCount ?? report.summary.matchedCount,
      report.summary.categorizedRowsCount ?? report.summary.categorizedCount,
      report.summary.ignoredRowsCount ?? report.summary.ignoredCount,
      report.summary.unmatchedRowsCount ?? "",
      report.summary.unreconciledRowsCount ?? "",
      report.summary.ruleAppliedRowsCount ?? "",
    ],
    [],
    ["Exceptions"],
    ["Unmatched Rows", report.summary.unmatchedRowsCount ?? ""],
    ["Unreconciled Rows", report.summary.unreconciledRowsCount ?? ""],
    ["Exception Rows", report.summary.exceptionRowsCount ?? ""],
    [],
    ["Linked Treasury Summary"],
    ["Area", "Count", "Matched", "Journal Posted", "Operational Only", "Total Amount"],
    [
      "Deposits",
      report.linkedTreasurySummary?.depositBatches?.count ?? "",
      report.linkedTreasurySummary?.depositBatches?.matchedCount ?? "",
      report.linkedTreasurySummary?.depositBatches?.journalPostedCount ?? "",
      report.linkedTreasurySummary?.depositBatches?.operationalOnlyCount ?? "",
      report.linkedTreasurySummary?.depositBatches?.totalAmount ?? "",
    ],
    [
      "Card Settlements",
      report.linkedTreasurySummary?.cardSettlements?.count ?? "",
      report.linkedTreasurySummary?.cardSettlements?.matchedCount ?? "",
      report.linkedTreasurySummary?.cardSettlements?.journalPostedCount ?? "",
      report.linkedTreasurySummary?.cardSettlements?.operationalOnlyCount ?? "",
      report.linkedTreasurySummary?.cardSettlements?.totalAmount ?? "",
    ],
    [
      "Cheques",
      report.linkedTreasurySummary?.cheques?.count ?? "",
      report.linkedTreasurySummary?.cheques?.matchedCount ?? "",
      report.linkedTreasurySummary?.cheques?.journalPostedCount ?? "",
      report.linkedTreasurySummary?.cheques?.operationalOnlyCount ?? "",
      report.linkedTreasurySummary?.cheques?.totalAmount ?? "",
    ],
    [],
    ["Accounting Status"],
    ["Clearing Config Enabled", report.accountingStatusSummary?.clearingConfigEnabled ? "Yes" : "No"],
    ["Configured Account Count", report.accountingStatusSummary?.configuredAccountCount ?? ""],
    ["Journal Posted Treasury Records", report.accountingStatusSummary?.journalPostedCount ?? ""],
    ["Operational Only Treasury Records", report.accountingStatusSummary?.operationalOnlyCount ?? ""],
    ["Missing Clearing Config", report.accountingStatusSummary?.missingClearingConfig ? "Yes" : "No"],
    [],
    ["Audit Timeline"],
    ["Occurred At", "Type", "Label", "Entity Type", "Entity ID", "Status", "Actor", "Amount", "Reference"],
    ...((report.auditTimeline ?? []).map((event: any) => [
      event.occurredAt,
      event.type,
      event.label,
      event.entityType,
      event.entityId,
      event.status ?? "",
      event.actor?.name ?? event.actor?.email ?? "",
      event.amount ?? "",
      event.reference ?? "",
    ]) as unknown[][]),
    [],
    ["Items"],
    ["Transaction Date", "Description", "Reference", "Type", "Amount", "Status At Close"],
  ];
  for (const item of report.items ?? []) {
    rows.push([dateOnly(item.transactionDate), item.description, item.reference ?? "", item.type, item.amount, item.statusAtClose]);
  }

  return { filename: `reconciliation-${reconciliation.reconciliationNumber}.csv`, content: toCsv(rows) };
}

function reportHeaderRows(title: string, report: any, generatedAt: Date): unknown[][] {
  const rows: unknown[][] = [[title], ["Generated At", generatedAt.toISOString()]];
  if ("from" in report || "to" in report) {
    rows.push(["Period From", report.from ?? ""], ["Period To", report.to ?? ""]);
  }
  if ("asOf" in report) {
    rows.push(["As Of", report.asOf ?? ""]);
  }
  return rows;
}

function appendReportNotes(rows: unknown[][], notes: unknown[]): void {
  if (notes.length === 0) {
    return;
  }
  rows.push([], ["Notes"]);
  for (const note of notes) {
    rows.push([note]);
  }
}

function csvSafeCellText(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/^[=+@]/.test(text) || /^-(?!\d+(\.\d+)?$)/.test(text)) {
    return `'${text}`;
  }
  return text;
}

function appendAmountSection(rows: unknown[][], title: string, section: any): void {
  rows.push([], [title, "Amount"]);
  for (const account of section?.accounts ?? []) {
    rows.push([`${account.code} ${account.name}`, account.amount]);
  }
  rows.push([`Total ${title.toLowerCase()}`, section?.total ?? "0.0000"]);
}

function appendVatReturnDocuments(rows: unknown[][], title: string, documents: any[]): void {
  rows.push([], [title], ["Number", "Date", "Taxable Amount", "Tax Amount", "Gross Amount"]);
  for (const document of documents) {
    rows.push([document.number, dateOnly(document.documentDate), document.taxableAmount, document.taxAmount, document.grossAmount]);
  }
}

function filenameDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateOnly(value: string | Date | null | undefined): string {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
}
