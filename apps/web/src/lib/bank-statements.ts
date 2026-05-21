import type {
  BankReconciliation,
  BankReconciliationReviewEvent,
  BankReconciliationStatus,
  BankReconciliationSummary,
  BankStatementImportStatus,
  BankStatementImportPreview,
  BankStatementMatchCandidate,
  BankStatementTransaction,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
} from "./types";

export interface StatementImportRowInput {
  date: string;
  description: string;
  reference?: string;
  debit?: string;
  credit?: string;
  amount?: string;
  balance?: string;
  counterparty?: string;
  currency?: string;
  bankReference?: string;
}

export interface StatementImportFileLike {
  name: string;
  size: number;
  type?: string;
}

export interface StatementImportClientIssue {
  rowNumber: number;
  message: string;
}

export interface StatementImportClientRowPreview extends StatementImportRowInput {
  rowNumber: number;
  duplicateCandidate: boolean;
  errors: string[];
  warnings: string[];
}

export interface StatementImportClientPreview {
  format: "CSV" | "JSON";
  rowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  duplicateCandidateCount: number;
  detectedColumns: string[];
  rows: StatementImportClientRowPreview[];
  errors: StatementImportClientIssue[];
  warnings: StatementImportClientIssue[];
}

export const STATEMENT_IMPORT_MAX_FILE_BYTES = 1024 * 1024;

export function bankStatementTransactionStatusLabel(status: BankStatementTransactionStatus): string {
  switch (status) {
    case "UNMATCHED":
      return "Unmatched";
    case "MATCHED":
      return "Matched";
    case "CATEGORIZED":
      return "Categorized";
    case "IGNORED":
      return "Ignored";
    case "VOIDED":
      return "Voided";
  }
}

export function bankStatementTransactionStatusBadgeClass(status: BankStatementTransactionStatus): string {
  switch (status) {
    case "UNMATCHED":
      return "bg-amber-50 text-amber-700";
    case "MATCHED":
    case "CATEGORIZED":
      return "bg-emerald-50 text-emerald-700";
    case "IGNORED":
      return "bg-slate-100 text-slate-600";
    case "VOIDED":
      return "bg-rose-50 text-rose-700";
  }
}

export function bankStatementTransactionTypeLabel(type: BankStatementTransactionType): string {
  return type === "CREDIT" ? "Credit" : "Debit";
}

export function bankStatementImportStatusLabel(status: BankStatementImportStatus): string {
  switch (status) {
    case "IMPORTED":
      return "Imported";
    case "PARTIALLY_RECONCILED":
      return "Partially reconciled";
    case "RECONCILED":
      return "Reconciled";
    case "VOIDED":
      return "Voided";
  }
}

export function bankStatementImportStatusBadgeClass(status: BankStatementImportStatus): string {
  switch (status) {
    case "IMPORTED":
      return "bg-amber-50 text-amber-700";
    case "PARTIALLY_RECONCILED":
      return "bg-sky-50 text-sky-700";
    case "RECONCILED":
      return "bg-emerald-50 text-emerald-700";
    case "VOIDED":
      return "bg-rose-50 text-rose-700";
  }
}

export function bankReconciliationStatusLabel(status: BankReconciliationStatus): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "PENDING_APPROVAL":
      return "Pending approval";
    case "APPROVED":
      return "Approved";
    case "CLOSED":
      return "Closed";
    case "VOIDED":
      return "Voided";
  }
}

export function bankReconciliationStatusBadgeClass(status: BankReconciliationStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-amber-50 text-amber-700";
    case "PENDING_APPROVAL":
      return "bg-sky-50 text-sky-700";
    case "APPROVED":
      return "bg-indigo-50 text-indigo-700";
    case "CLOSED":
      return "bg-emerald-50 text-emerald-700";
    case "VOIDED":
      return "bg-rose-50 text-rose-700";
  }
}

export function candidateScoreLabel(candidate: Pick<BankStatementMatchCandidate, "score">): string {
  if (candidate.score >= 90) {
    return "Strong match";
  }
  if (candidate.score >= 75) {
    return "Likely match";
  }
  return "Possible match";
}

export function closeBlockedMessage(
  reconciliation: Pick<BankReconciliation, "status" | "difference"> & { unmatchedTransactionCount?: number },
): string | null {
  if (reconciliation.status !== "APPROVED") {
    return reconciliation.status === "DRAFT" || reconciliation.status === "PENDING_APPROVAL"
      ? "Reconciliation must be approved before it can be closed."
      : "Only approved reconciliations can be closed.";
  }
  if (Number(reconciliation.difference) !== 0) {
    return "Cannot close reconciliation while difference is not zero.";
  }
  if ((reconciliation.unmatchedTransactionCount ?? 0) > 0) {
    return "Cannot close reconciliation with unmatched statement transactions.";
  }
  return null;
}

export function submitBlockedMessage(
  reconciliation: Pick<BankReconciliation, "status" | "difference"> & { unmatchedTransactionCount?: number },
): string | null {
  if (reconciliation.status !== "DRAFT") {
    return "Only draft reconciliations can be submitted for approval.";
  }
  if (Number(reconciliation.difference) !== 0) {
    return "Cannot submit reconciliation while difference is not zero.";
  }
  if ((reconciliation.unmatchedTransactionCount ?? 0) > 0) {
    return "Cannot submit reconciliation with unmatched statement transactions.";
  }
  return null;
}

export function reconciliationActionBlockedMessage(
  reconciliation: Pick<BankReconciliation, "status" | "difference"> & { unmatchedTransactionCount?: number },
  action: "submit" | "approve" | "reopen" | "close" | "void",
): string | null {
  if (action === "submit") {
    return submitBlockedMessage(reconciliation);
  }
  if (action === "approve") {
    return reconciliation.status === "PENDING_APPROVAL" ? null : "Only reconciliations pending approval can be approved.";
  }
  if (action === "reopen") {
    return reconciliation.status === "PENDING_APPROVAL" || reconciliation.status === "APPROVED"
      ? null
      : "Only pending approval or approved reconciliations can be reopened.";
  }
  if (action === "close") {
    return closeBlockedMessage(reconciliation);
  }
  return reconciliation.status === "VOIDED" ? "Reconciliation has already been voided." : null;
}

export function closedThroughDateLabel(summary: Pick<BankReconciliationSummary, "closedThroughDate">): string {
  return summary.closedThroughDate ? summary.closedThroughDate.slice(0, 10) : "Not closed";
}

export function lockedStatementTransactionWarning(transaction: Pick<BankStatementTransaction, "reconciliationItems">): string | null {
  const closed = transaction.reconciliationItems?.find((item) => item.reconciliation.status === "CLOSED");
  return closed ? `Statement transaction belongs to closed reconciliation ${closed.reconciliation.reconciliationNumber}.` : null;
}

export function statementImportPreviewSummary(preview: Pick<BankStatementImportPreview, "rowCount" | "validRows" | "invalidRows" | "totalCredits" | "totalDebits">): string {
  return `${preview.validRows.length} valid / ${preview.invalidRows.length} invalid of ${preview.rowCount} rows. Credits ${preview.totalCredits}, debits ${preview.totalDebits}.`;
}

export function reviewEventLabel(event: Pick<BankReconciliationReviewEvent, "action" | "fromStatus" | "toStatus">): string {
  const actionLabel = event.action
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
  const statusLabel = event.fromStatus
    ? `${bankReconciliationStatusLabel(event.fromStatus)} to ${bankReconciliationStatusLabel(event.toStatus)}`
    : bankReconciliationStatusLabel(event.toStatus);
  return `${actionLabel}: ${statusLabel}`;
}

export function reconciliationDifferenceStatus(
  summary: Pick<BankReconciliationSummary, "difference" | "totals" | "statusSuggestion">,
): "RECONCILED" | "NEEDS_REVIEW" {
  if (summary.statusSuggestion === "RECONCILED") {
    return "RECONCILED";
  }
  if (Number(summary.difference ?? "0") === 0 && summary.totals.unmatched.count === 0) {
    return "RECONCILED";
  }
  return "NEEDS_REVIEW";
}

export function parseStatementRowsText(input: string): StatementImportRowInput[] {
  return parseStatementImportText(input).rows.map((row) => ({
    date: row.date,
    description: row.description,
    reference: row.reference,
    debit: row.debit,
    credit: row.credit,
  }));
}

export function validateStatementImportFile(file: StatementImportFileLike): string | null {
  if (file.size > STATEMENT_IMPORT_MAX_FILE_BYTES) {
    return "Statement file is too large. Use a CSV or JSON file up to 1 MB.";
  }
  const name = file.name.toLowerCase();
  const type = (file.type ?? "").toLowerCase();
  const allowedExtension = name.endsWith(".csv") || name.endsWith(".json") || name.endsWith(".txt");
  const allowedType = ["", "text/csv", "application/csv", "application/json", "text/plain", "application/vnd.ms-excel"].includes(type);
  return allowedExtension && allowedType ? null : "Use a CSV or JSON statement file. Live bank feed exports are not accepted here.";
}

export function parseStatementImportText(input: string, options: { accountCurrency?: string } = {}): StatementImportClientPreview {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      format: "CSV",
      rowCount: 0,
      validRowCount: 0,
      invalidRowCount: 0,
      duplicateCandidateCount: 0,
      detectedColumns: [],
      rows: [],
      errors: [{ rowNumber: 0, message: "Paste or upload at least one statement row." }],
      warnings: [],
    };
  }

  const parsed = trimmed.startsWith("[") || trimmed.startsWith("{") ? parseStatementJsonText(trimmed) : parseStatementCsvText(trimmed);
  const rows = parsed.records.map((record) => normalizeStatementRecord(record, options));
  const seenKeys = new Set<string>();
  let duplicateCandidateCount = 0;

  for (const row of rows) {
    const key = statementRowDuplicateKey(row);
    if (!key) {
      continue;
    }
    if (seenKeys.has(key)) {
      row.duplicateCandidate = true;
      row.warnings.push("This row may duplicate another row in this file.");
      duplicateCandidateCount += 1;
    } else {
      seenKeys.add(key);
    }
  }

  const errors = rows.flatMap((row) => row.errors.map((message) => ({ rowNumber: row.rowNumber, message })));
  const warnings = rows.flatMap((row) => row.warnings.map((message) => ({ rowNumber: row.rowNumber, message })));

  return {
    format: parsed.format,
    rowCount: rows.length,
    validRowCount: rows.filter((row) => row.errors.length === 0).length,
    invalidRowCount: rows.filter((row) => row.errors.length > 0).length,
    duplicateCandidateCount,
    detectedColumns: parsed.detectedColumns,
    rows,
    errors,
    warnings,
  };
}

function parseStatementJsonText(text: string): { format: "JSON"; records: Array<{ rowNumber: number; values: Record<string, unknown> }>; detectedColumns: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("JSON statement text could not be parsed.");
  }
  const rows = Array.isArray(parsed) ? parsed : isRecord(parsed) && Array.isArray(parsed.rows) ? parsed.rows : null;
  if (!rows) {
    throw new Error("JSON input must be an array of rows or an object with a rows array.");
  }
  const detectedColumnSet = new Set<string>();
  rows.forEach((row) => {
    if (isRecord(row)) {
      Object.keys(row).forEach((key) => detectedColumnSet.add(key));
    }
  });
  const detectedColumns = Array.from(detectedColumnSet);
  return {
    format: "JSON",
    records: rows.map((row, index) => {
      if (!isRecord(row)) {
        throw new Error("Each statement row must be an object.");
      }
      return { rowNumber: index + 1, values: row };
    }),
    detectedColumns,
  };
}

function parseStatementCsvText(text: string): { format: "CSV"; records: Array<{ rowNumber: number; values: Record<string, unknown> }>; detectedColumns: string[] } {
  const records = parseCsvRecords(text).filter((record) => record.some((value) => value.trim() !== ""));
  if (records.length === 0) {
    return { format: "CSV", records: [], detectedColumns: [] };
  }
  const headers = records[0]!.map((header) => header.trim());
  const hasHeader = headers.some((header) => canonicalStatementColumn(header) !== null);
  const detectedColumns = hasHeader ? headers.filter(Boolean) : ["date", "description", "reference", "debit", "credit"];
  const dataRows = hasHeader ? records.slice(1) : records;
  const columns = hasHeader ? headers : detectedColumns;

  return {
    format: "CSV",
    detectedColumns,
    records: dataRows.map((record, index) => ({
      rowNumber: index + (hasHeader ? 2 : 1),
      values: Object.fromEntries(columns.map((header, columnIndex) => [header || `Column ${columnIndex + 1}`, record[columnIndex] ?? ""])),
    })),
  };
}

function normalizeStatementRecord(
  record: { rowNumber: number; values: Record<string, unknown> },
  options: { accountCurrency?: string },
): StatementImportClientRowPreview {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dateValue = cleanStatementValue(readStatementField(record.values, "date"));
  const normalizedDate = normalizeStatementDate(dateValue);
  const reference = cleanStatementValue(readStatementField(record.values, "reference") ?? readStatementField(record.values, "bankReference"));
  const counterparty = cleanStatementValue(readStatementField(record.values, "counterparty"));
  let description = cleanStatementValue(readStatementField(record.values, "description")) || counterparty || reference;
  const currency = cleanStatementValue(readStatementField(record.values, "currency"));
  const balance = cleanStatementValue(readStatementField(record.values, "balance"));
  const debitValue = cleanStatementValue(readStatementField(record.values, "debit"));
  const creditValue = cleanStatementValue(readStatementField(record.values, "credit"));
  const signedAmountValue = cleanStatementValue(readStatementField(record.values, "amount"));
  const parsedDebit = parseStatementAmount(debitValue);
  const parsedCredit = parseStatementAmount(creditValue);
  const parsedSignedAmount = parseStatementAmount(signedAmountValue);
  let debit = parsedDebit.value ?? 0;
  let credit = parsedCredit.value ?? 0;

  if (!dateValue) {
    errors.push("Missing date.");
  } else if (!normalizedDate) {
    errors.push("Invalid date.");
  }
  if (!description && !reference) {
    warnings.push("No description or reference was found. The row will use a generic description until you review it.");
    description = "Imported statement row";
  }
  if (parsedDebit.error) {
    errors.push("Invalid debit amount.");
  }
  if (parsedCredit.error) {
    errors.push("Invalid credit amount.");
  }
  if (parsedSignedAmount.error) {
    errors.push("Invalid signed amount.");
  }
  if (debit < 0 || credit < 0) {
    errors.push("Debit and credit columns must not be negative. Use a signed amount column instead.");
  }
  if (debit > 0 && credit > 0) {
    errors.push("Both debit and credit are populated.");
  }
  if (debit === 0 && credit === 0 && parsedSignedAmount.value !== null) {
    if (parsedSignedAmount.value < 0) {
      debit = Math.abs(parsedSignedAmount.value);
    } else {
      credit = parsedSignedAmount.value;
    }
  }
  if (debit === 0 && credit === 0) {
    errors.push("Missing amount.");
  }
  if (currency && options.accountCurrency && currency.toUpperCase() !== options.accountCurrency.toUpperCase()) {
    warnings.push(`Currency ${currency.toUpperCase()} differs from this bank account currency ${options.accountCurrency.toUpperCase()}.`);
  }

  return {
    rowNumber: record.rowNumber,
    date: normalizedDate ?? dateValue,
    description,
    reference: reference || undefined,
    debit: formatStatementAmount(debit),
    credit: formatStatementAmount(credit),
    amount: signedAmountValue || undefined,
    balance: balance || undefined,
    counterparty: counterparty || undefined,
    currency: currency || undefined,
    bankReference: cleanStatementValue(readStatementField(record.values, "bankReference")) || undefined,
    duplicateCandidate: false,
    errors,
    warnings,
  };
}

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"") {
      if (inQuotes && next === "\"") {
        value += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      record.push(value);
      value = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      record.push(value);
      records.push(record);
      record = [];
      value = "";
      continue;
    }
    value += char;
  }

  record.push(value);
  records.push(record);
  return records;
}

function readStatementField(record: Record<string, unknown>, field: StatementCanonicalColumn): unknown {
  for (const [key, value] of Object.entries(record)) {
    if (canonicalStatementColumn(key) === field) {
      return value;
    }
  }
  return undefined;
}

type StatementCanonicalColumn =
  | "date"
  | "description"
  | "reference"
  | "bankReference"
  | "debit"
  | "credit"
  | "amount"
  | "balance"
  | "counterparty"
  | "currency";

const STATEMENT_COLUMN_ALIASES: Record<StatementCanonicalColumn, string[]> = {
  date: ["date", "transactiondate", "posteddate", "postingdate", "valuedate"],
  description: ["description", "memo", "narration", "details", "detail", "particulars", "narrative"],
  reference: ["reference", "ref"],
  bankReference: ["bankreference", "bankref", "transactionid", "transactionreference", "id"],
  debit: ["debit", "withdrawal", "moneyout", "debitamount"],
  credit: ["credit", "deposit", "moneyin", "creditamount"],
  amount: ["amount", "signedamount", "transactionamount"],
  balance: ["balance", "runningbalance", "closingbalance"],
  counterparty: ["counterparty", "payee", "payer", "party", "beneficiary"],
  currency: ["currency", "ccy"],
};

function canonicalStatementColumn(value: string): StatementCanonicalColumn | null {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [canonical, aliases] of Object.entries(STATEMENT_COLUMN_ALIASES)) {
    if (aliases.includes(normalized)) {
      return canonical as StatementCanonicalColumn;
    }
  }
  return null;
}

function cleanStatementValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}

function normalizeStatementDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    return validDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3])) ? trimmed : null;
  }
  const slashOrDash = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (slashOrDash) {
    const day = Number(slashOrDash[1]);
    const month = Number(slashOrDash[2]);
    const year = Number(slashOrDash[3]);
    return validDateParts(year, month, day) ? `${year}-${padDatePart(month)}-${padDatePart(day)}` : null;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function validDateParts(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function padDatePart(value: number): string {
  return value.toString().padStart(2, "0");
}

function parseStatementAmount(value: string): { value: number | null; error: boolean } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { value: null, error: false };
  }
  const negative = /^\(.*\)$/.test(trimmed) || trimmed.startsWith("-");
  const normalized = trimmed.replace(/[(),]/g, "").replace(/[^0-9.-]/g, "");
  if (!normalized || normalized === "-" || normalized === ".") {
    return { value: null, error: true };
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return { value: null, error: true };
  }
  return { value: negative ? -Math.abs(parsed) : parsed, error: false };
}

function formatStatementAmount(value: number): string {
  return Math.abs(value) < 0.00005 ? "0.0000" : Math.abs(value).toFixed(4);
}

function statementRowDuplicateKey(row: StatementImportClientRowPreview): string | null {
  if (row.errors.length > 0) {
    return null;
  }
  return [
    row.date,
    row.debit ?? "0.0000",
    row.credit ?? "0.0000",
    (row.reference ?? row.bankReference ?? "").trim().toLowerCase(),
    row.description.trim().toLowerCase(),
  ].join("|");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
