export type MatchSuggestionStatementType = "CREDIT" | "DEBIT";
export type MatchSuggestionStatementStatus = "UNMATCHED" | "MATCHED" | "CATEGORIZED" | "IGNORED" | "VOIDED";

export interface MatchSuggestionStatement {
  transactionDate: Date;
  type: MatchSuggestionStatementType;
  amount: string;
  status: MatchSuggestionStatementStatus;
  reference?: string | null;
  description?: string | null;
  counterparty?: string | null;
}

export interface MatchSuggestionJournalLine {
  id: string;
  debit: string;
  credit: string;
  description?: string | null;
  journalEntry: {
    id: string;
    entryNumber: string;
    entryDate: Date;
    description?: string | null;
    reference?: string | null;
  };
}

export interface BankStatementMatchSuggestion {
  journalLineId: string;
  journalEntryId: string;
  date: Date;
  entryNumber: string;
  description: string | null;
  reference: string | null;
  debit: string;
  credit: string;
  score: number;
  reason: string;
}

export function suggestBankStatementMatches(
  statement: MatchSuggestionStatement,
  journalLines: MatchSuggestionJournalLine[],
  options: { toleranceDays?: number } = {},
): BankStatementMatchSuggestion[] {
  if (statement.status !== "UNMATCHED") {
    return [];
  }

  const toleranceDays = options.toleranceDays ?? 7;
  const candidates = journalLines
    .filter((line) => amountAndDirectionMatch(statement, line))
    .map((line) => scoreCandidate(statement, line, toleranceDays))
    .filter((candidate): candidate is BankStatementMatchSuggestion & { dateDistance: number } => candidate !== null)
    .sort((left, right) => right.score - left.score || left.dateDistance - right.dateDistance || left.entryNumber.localeCompare(right.entryNumber));

  return candidates.map(({ dateDistance: _dateDistance, ...candidate }) => candidate);
}

function scoreCandidate(
  statement: MatchSuggestionStatement,
  line: MatchSuggestionJournalLine,
  toleranceDays: number,
): (BankStatementMatchSuggestion & { dateDistance: number }) | null {
  const dateDistance = absoluteDayDifference(statement.transactionDate, line.journalEntry.entryDate);
  if (dateDistance > toleranceDays) {
    return null;
  }

  const reasons = ["amount and direction match"];
  let score = 70;
  if (dateDistance === 0) {
    score += 15;
    reasons.push("same date");
  } else if (dateDistance <= 3) {
    score += 8;
    reasons.push("nearby date");
  } else {
    score += 3;
    reasons.push("within date window");
  }

  const candidateText = [line.description, line.journalEntry.description, line.journalEntry.reference].filter(Boolean).join(" ");
  if (referenceMatches(statement.reference, candidateText)) {
    score += 10;
    reasons.push("reference match");
  }
  if (normalizedTextIncludes(candidateText, statement.counterparty)) {
    score += 5;
    reasons.push("counterparty text match");
  }
  if (documentNumberMatches([statement.description, statement.reference].filter(Boolean).join(" "), candidateText)) {
    score += 5;
    reasons.push("document number match");
  }

  return {
    journalLineId: line.id,
    journalEntryId: line.journalEntry.id,
    date: line.journalEntry.entryDate,
    entryNumber: line.journalEntry.entryNumber,
    description: line.description ?? line.journalEntry.description ?? null,
    reference: line.journalEntry.reference ?? null,
    debit: line.debit,
    credit: line.credit,
    score: Math.min(score, 100),
    reason: reasons.join(", "),
    dateDistance,
  };
}

function amountAndDirectionMatch(statement: MatchSuggestionStatement, line: MatchSuggestionJournalLine): boolean {
  const amount = normalizeMoney(statement.amount);
  const debit = normalizeMoney(line.debit);
  const credit = normalizeMoney(line.credit);
  return statement.type === "CREDIT" ? debit === amount && credit === "0.0000" : credit === amount && debit === "0.0000";
}

function referenceMatches(reference: string | null | undefined, candidateText: string): boolean {
  const normalizedReference = normalizeSearchText(reference);
  if (!normalizedReference) {
    return false;
  }
  return normalizeSearchText(candidateText).includes(normalizedReference);
}

function normalizedTextIncludes(candidateText: string, needle: string | null | undefined): boolean {
  const normalizedNeedle = normalizeSearchText(needle);
  if (!normalizedNeedle) {
    return false;
  }
  return normalizeSearchText(candidateText).includes(normalizedNeedle);
}

function documentNumberMatches(statementText: string, candidateText: string): boolean {
  const candidateNumbers = new Set(extractDocumentNumbers(candidateText));
  return extractDocumentNumbers(statementText).some((documentNumber) => candidateNumbers.has(documentNumber));
}

function extractDocumentNumbers(value: string): string[] {
  return Array.from(value.toUpperCase().matchAll(/\b(?:INV|BILL|PAY|PMT|CN|DN|JE|REF|TRF|FEE|RCPT)[-\s]?[A-Z0-9-]*\d[A-Z0-9-]*\b/g)).map(
    (match) => match[0].replace(/\s+/g, "-"),
  );
}

function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeMoney(value: string): string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(4) : value;
}

function absoluteDayDifference(left: Date, right: Date): number {
  const leftUtc = Date.UTC(left.getUTCFullYear(), left.getUTCMonth(), left.getUTCDate());
  const rightUtc = Date.UTC(right.getUTCFullYear(), right.getUTCMonth(), right.getUTCDate());
  return Math.abs(Math.round((leftUtc - rightUtc) / 86_400_000));
}
