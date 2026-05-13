import type {
  BankReconciliation,
  BankReconciliationStatus,
  BankReconciliationSummary,
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
  if (reconciliation.status !== "DRAFT") {
    return "Only draft reconciliations can be closed.";
  }
  if (Number(reconciliation.difference) !== 0) {
    return "Cannot close reconciliation while difference is not zero.";
  }
  if ((reconciliation.unmatchedTransactionCount ?? 0) > 0) {
    return "Cannot close reconciliation with unmatched statement transactions.";
  }
  return null;
}

export function closedThroughDateLabel(summary: Pick<BankReconciliationSummary, "closedThroughDate">): string {
  return summary.closedThroughDate ? summary.closedThroughDate.slice(0, 10) : "Not closed";
}

export function lockedStatementTransactionWarning(transaction: Pick<BankStatementTransaction, "reconciliationItems">): string | null {
  const closed = transaction.reconciliationItems?.find((item) => item.reconciliation.status === "CLOSED");
  return closed ? `Statement transaction belongs to closed reconciliation ${closed.reconciliation.reconciliationNumber}.` : null;
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
  const header = splitCsvLine(lines[0] ?? "").map((item) => item.trim().toLowerCase());
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
