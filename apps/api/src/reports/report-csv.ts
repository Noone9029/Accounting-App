export type CoreReportKind =
  | "general-ledger"
  | "trial-balance"
  | "profit-and-loss"
  | "balance-sheet"
  | "vat-summary"
  | "aged-receivables"
  | "aged-payables";

export interface CsvFile {
  filename: string;
  content: string;
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

export function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
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

export function bankReconciliationReportCsv(report: any, generatedAt = new Date()): CsvFile {
  const reconciliation = report.reconciliation;
  const rows: unknown[][] = [
    ["Bank Reconciliation Report"],
    ["Generated At", generatedAt.toISOString()],
    ["Reconciliation Number", reconciliation.reconciliationNumber],
    ["Bank Account", report.bankAccount?.displayName],
    ["Period Start", dateOnly(reconciliation.periodStart)],
    ["Period End", dateOnly(reconciliation.periodEnd)],
    ["Status", reconciliation.status],
    ["Statement Opening Balance", reconciliation.statementOpeningBalance ?? ""],
    ["Statement Closing Balance", reconciliation.statementClosingBalance],
    ["Ledger Closing Balance", reconciliation.ledgerClosingBalance],
    ["Difference", reconciliation.difference],
    ["Closed At", reconciliation.closedAt ? dateOnly(reconciliation.closedAt) : ""],
    ["Closed By", reconciliation.closedBy?.name ?? reconciliation.closedBy?.email ?? ""],
    ["Voided At", reconciliation.voidedAt ? dateOnly(reconciliation.voidedAt) : ""],
    ["Voided By", reconciliation.voidedBy?.name ?? reconciliation.voidedBy?.email ?? ""],
    [],
    ["Summary"],
    ["Item Count", "Debit Total", "Credit Total", "Matched", "Categorized", "Ignored"],
    [report.summary.itemCount, report.summary.debitTotal, report.summary.creditTotal, report.summary.matchedCount, report.summary.categorizedCount, report.summary.ignoredCount],
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

function appendAmountSection(rows: unknown[][], title: string, section: any): void {
  rows.push([], [title, "Amount"]);
  for (const account of section?.accounts ?? []) {
    rows.push([`${account.code} ${account.name}`, account.amount]);
  }
  rows.push([`Total ${title.toLowerCase()}`, section?.total ?? "0.0000"]);
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
