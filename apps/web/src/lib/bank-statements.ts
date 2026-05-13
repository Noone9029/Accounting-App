import type {
  BankReconciliation,
  BankReconciliationReviewEvent,
  BankReconciliationStatus,
  BankReconciliationSummary,
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
}

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
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as unknown;
    const rows = Array.isArray(parsed) ? parsed : isRecord(parsed) && Array.isArray(parsed.rows) ? parsed.rows : null;
    if (!rows) {
      throw new Error("JSON input must be an array of rows or an object with a rows array.");
    }
    return rows.map(normalizeJsonRow);
  }

  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  const header = splitCsvLine(lines[0] ?? "").map(canonicalCsvColumn);
  const hasHeader = ["date", "description"].every((column) => header.includes(column));
  const columns = hasHeader ? header : ["date", "description", "reference", "debit", "credit"];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    columns.forEach((column, index) => {
      row[column] = values[index]?.trim() ?? "";
    });
    return {
      date: row.date ?? "",
      description: row.description ?? "",
      reference: row.reference || undefined,
      debit: row.debit || "0.0000",
      credit: row.credit || "0.0000",
    };
  });
}

function normalizeJsonRow(row: unknown): StatementImportRowInput {
  if (!isRecord(row)) {
    throw new Error("Each statement row must be an object.");
  }
  return {
    date: String(row.date ?? ""),
    description: String(row.description ?? ""),
    reference: row.reference === undefined || row.reference === null ? undefined : String(row.reference),
    debit: row.debit === undefined || row.debit === null ? "0.0000" : String(row.debit),
    credit: row.credit === undefined || row.credit === null ? "0.0000" : String(row.credit),
  };
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  values.push(current);
  return values;
}

function canonicalCsvColumn(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (normalized === "transaction date") {
    return "date";
  }
  if (normalized === "memo" || normalized === "narration") {
    return "description";
  }
  if (normalized === "ref") {
    return "reference";
  }
  if (normalized === "withdrawal" || normalized === "money out") {
    return "debit";
  }
  if (normalized === "deposit" || normalized === "money in") {
    return "credit";
  }
  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
