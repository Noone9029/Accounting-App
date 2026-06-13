import type {
  BankReconciliation,
  BankReconciliationReviewEvent,
  BankReconciliationStatus,
  BankReconciliationSummary,
  BankRuleActionType,
  BankRuleDirection,
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

export type StatementImportClientFormat = "CSV" | "JSON" | "OFX" | "CAMT" | "MT940" | "UNKNOWN";

export interface StatementImportClientPreview {
  format: StatementImportClientFormat;
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
export const STATEMENT_IMPORT_TEMPLATE_COLUMNS = [
  "date",
  "description",
  "reference",
  "bankReference",
  "debit",
  "credit",
  "amount",
  "balance",
  "counterparty",
  "currency",
] as const;
export const STATEMENT_IMPORT_TEMPLATE_FILENAME = "ledgerbyte-bank-statement-template.csv";

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

export function bankRuleDirectionLabel(direction: BankRuleDirection): string {
  switch (direction) {
    case "ANY":
      return "Any direction";
    case "DEBIT":
      return "Debit";
    case "CREDIT":
      return "Credit";
  }
}

export function bankRuleActionLabel(action: BankRuleActionType): string {
  switch (action) {
    case "SUGGEST_CATEGORIZE":
      return "Suggest categorize";
    case "SUGGEST_IGNORE":
      return "Suggest ignore";
    case "SUGGEST_MATCH_CANDIDATES":
      return "Suggest match candidates";
    case "CATEGORIZE":
      return "Categorize on explicit apply";
    case "IGNORE":
      return "Ignore on explicit apply";
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

export function statementImportPreviewSummary(
  preview: Pick<BankStatementImportPreview, "rowCount" | "validRows" | "invalidRows" | "totalCredits" | "totalDebits" | "summary">,
): string {
  const base = `${preview.validRows.length} valid / ${preview.invalidRows.length} invalid of ${preview.rowCount} rows. Credits ${preview.totalCredits}, debits ${preview.totalDebits}.`;
  if (!preview.summary) {
    return base;
  }
  const duplicateCount = preview.summary.duplicateInFileCount + preview.summary.duplicateExistingCount;
  const blocked = preview.summary.blockedRowCount;
  return `${base} ${preview.summary.importableRowCount} rows are importable${duplicateCount > 0 ? `, ${duplicateCount} duplicate rows need review` : ""}${blocked > 0 ? `, ${blocked} rows block full import` : ""}.`;
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
    return "Statement file is too large. Use a CSV, XLSX, JSON, OFX, CAMT XML, or MT940 file up to 1 MB.";
  }
  const name = file.name.toLowerCase();
  const type = (file.type ?? "").toLowerCase();
  const allowedExtension =
    name.endsWith(".csv") ||
    name.endsWith(".json") ||
    name.endsWith(".txt") ||
    name.endsWith(".ofx") ||
    name.endsWith(".xml") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".camt") ||
    name.endsWith(".mt940") ||
    name.endsWith(".940") ||
    name.endsWith(".sta");
  const allowedType = [
    "",
    "text/csv",
    "application/csv",
    "application/json",
    "text/plain",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/xml",
    "text/xml",
    "application/octet-stream",
  ].includes(type);
  return allowedExtension && allowedType
    ? null
    : "Use a CSV, XLSX, JSON, OFX, CAMT XML, or MT940 statement file. Live bank feed exports are not accepted here.";
}

export function isXlsxStatementImportFile(file: StatementImportFileLike): boolean {
  const name = file.name.toLowerCase();
  const type = (file.type ?? "").toLowerCase();
  return name.endsWith(".xlsx") || type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

export function buildStatementImportTemplateCsv(): string {
  const sampleRows = [
    {
      date: "2026-01-31",
      description: "Customer receipt",
      reference: "RCPT-0001",
      bankReference: "BANK-REF-0001",
      debit: "",
      credit: "2500.00",
      amount: "",
      balance: "12500.00",
      counterparty: "Sample Customer",
      currency: "SAR",
    },
    {
      date: "2026-02-01",
      description: "Bank fee",
      reference: "FEE-0001",
      bankReference: "BANK-REF-0002",
      debit: "",
      credit: "",
      amount: "-15.50",
      balance: "12484.50",
      counterparty: "Sample Bank",
      currency: "SAR",
    },
  ];
  return [
    STATEMENT_IMPORT_TEMPLATE_COLUMNS.join(","),
    ...sampleRows.map((row) => STATEMENT_IMPORT_TEMPLATE_COLUMNS.map((column) => csvCell(row[column])).join(",")),
  ].join("\r\n");
}

export function parseStatementImportText(input: string, options: { accountCurrency?: string } = {}): StatementImportClientPreview {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      format: "UNKNOWN",
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

  const format = detectStatementImportFormat(trimmed);
  if (format === "UNKNOWN") {
    return {
      format,
      rowCount: 0,
      validRowCount: 0,
      invalidRowCount: 1,
      duplicateCandidateCount: 0,
      detectedColumns: [],
      rows: [],
      errors: [{ rowNumber: 0, message: "Statement format could not be detected. Use CSV, JSON, OFX, CAMT XML, or MT940 manual exports." }],
      warnings: [],
    };
  }

  const parsed = parseDetectedStatementText(trimmed, format);
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
  const warnings = [
    ...(parsed.warnings ?? []).map((message) => ({ rowNumber: 0, message })),
    ...rows.flatMap((row) => row.warnings.map((message) => ({ rowNumber: row.rowNumber, message }))),
  ];

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

export function detectStatementImportFormat(text: string): StatementImportClientFormat {
  const trimmed = text.trim();
  if (!trimmed) {
    return "UNKNOWN";
  }
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return "JSON";
  }
  if (/<ofx[\s>]/i.test(trimmed) || /<stmttrn[\s>]/i.test(trimmed) || /<banktranlist[\s>]/i.test(trimmed)) {
    return "OFX";
  }
  if (
    /camt\.05[34]/i.test(trimmed) ||
    /<[^>]*bktocstmrstmt[\s>]/i.test(trimmed) ||
    /<[^>]*bktocstmrdbtcdtntfctn[\s>]/i.test(trimmed) ||
    (/<[^>]*ntry[\s>]/i.test(trimmed) && /<[^>]*cdtdbtind[\s>]/i.test(trimmed))
  ) {
    return "CAMT";
  }
  if (/^:20:/m.test(trimmed) || /^:61:/m.test(trimmed) || trimmed.includes("\n:61:") || trimmed.includes("\r\n:61:")) {
    return "MT940";
  }
  const firstLine = trimmed.split(/\r?\n/, 1)[0] ?? "";
  if (firstLine.includes(",") && firstLine.split(",").some((header) => canonicalStatementColumn(header))) {
    return "CSV";
  }
  return "UNKNOWN";
}

function parseDetectedStatementText(
  text: string,
  format: Exclude<StatementImportClientFormat, "UNKNOWN">,
): {
  format: Exclude<StatementImportClientFormat, "UNKNOWN">;
  records: Array<{ rowNumber: number; values: Record<string, unknown> }>;
  detectedColumns: string[];
  warnings?: string[];
} {
  switch (format) {
    case "JSON":
      return parseStatementJsonText(text);
    case "OFX":
      return parseStatementOfxText(text);
    case "CAMT":
      return parseStatementCamtText(text);
    case "MT940":
      return parseStatementMt940Text(text);
    case "CSV":
      return parseStatementCsvText(text);
  }
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

function parseStatementOfxText(text: string): {
  format: "OFX";
  records: Array<{ rowNumber: number; values: Record<string, unknown> }>;
  detectedColumns: string[];
  warnings?: string[];
} {
  const currency = ofxTagValue(text, "CURDEF");
  const closingBalance = ofxTagValue(text, "BALAMT");
  const records = findOfxTransactionBlocks(text).map((block, index) => {
    const bankReference = ofxTagValue(block, "FITID");
    const memo = ofxTagValue(block, "MEMO");
    const name = ofxTagValue(block, "NAME");
    return {
      rowNumber: index + 1,
      values: {
        date: (ofxTagValue(block, "DTPOSTED") ?? "").slice(0, 8),
        description: memo || name || bankReference,
        bankReference,
        reference: bankReference,
        amount: normalizeDirectionalAmount(ofxTagValue(block, "TRNAMT")),
        balance: closingBalance,
        counterparty: name && name !== memo ? name : undefined,
        currency,
      },
    };
  });
  const missingFitIdCount = records.filter((record) => !record.values.reference).length;
  const warnings =
    missingFitIdCount > 0
      ? [
          `${missingFitIdCount} OFX ${missingFitIdCount === 1 ? "transaction is" : "transactions are"} missing FITID; duplicate checks will fall back to date, amount, and description.`,
        ]
      : [];
  return { format: "OFX", records, detectedColumns: ["DTPOSTED", "TRNAMT", "FITID", "NAME", "MEMO", "CURDEF"], warnings };
}

function parseStatementCamtText(text: string): {
  format: "CAMT";
  records: Array<{ rowNumber: number; values: Record<string, unknown> }>;
  detectedColumns: string[];
  warnings?: string[];
} {
  const records = findXmlBlocks(text, "Ntry").map((block, index) => {
    const indicator = xmlTagValue(block, "CdtDbtInd");
    const direction = camtDebitCreditDirection(indicator);
    const reference = firstMeaningfulValue(
      xmlTagValue(block, "AcctSvcrRef"),
      xmlTagValue(block, "NtryRef"),
      xmlTagValue(block, "EndToEndId"),
      xmlTagValue(block, "InstrId"),
      xmlTagValue(block, "TxId"),
      xmlTagValue(block, "PmtInfId"),
      xmlTagValue(block, "MsgId"),
    );
    return {
      rowNumber: index + 1,
      values: {
        date: xmlNestedDate(block, "BookgDt") || xmlNestedDate(block, "ValDt"),
        description: xmlTagValue(block, "Ustrd") || xmlTagValue(block, "AddtlTxInf") || xmlTagValue(block, "AddtlNtryInf") || xmlTagValue(block, "RmtInf") || reference,
        reference,
        bankReference: reference,
        amount: direction ? signedAmountFromDirection(xmlTagValue(block, "Amt"), direction) : undefined,
        counterparty: xmlTagValue(block, "Nm"),
        currency: xmlAttributeValue(block, "Amt", "Ccy") || xmlTagValue(text, "Ccy"),
        indicator,
      },
    };
  });
  const missingDirectionCount = records.filter((record) => record.values.indicator !== "CRDT" && record.values.indicator !== "DBIT").length;
  const warnings =
    missingDirectionCount > 0
      ? [
          `${missingDirectionCount} CAMT ${missingDirectionCount === 1 ? "entry is" : "entries are"} missing CdtDbtInd; amount direction could not be inferred.`,
        ]
      : [];
  return { format: "CAMT", records, detectedColumns: ["BookgDt", "ValDt", "Amt", "CdtDbtInd", "AcctSvcrRef", "Ustrd"], warnings };
}

function parseStatementMt940Text(text: string): { format: "MT940"; records: Array<{ rowNumber: number; values: Record<string, unknown> }>; detectedColumns: string[] } {
  const currency = text.match(/^:60[FM]:[CD]\d{6}([A-Z]{3})/m)?.[1] ?? text.match(/^:62[FM]:[CD]\d{6}([A-Z]{3})/m)?.[1];
  const lines = text.split(/\r?\n/);
  const records: Array<{ rowNumber: number; values: Record<string, unknown> }> = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!line.startsWith(":61:")) {
      continue;
    }
    const match = /^(\d{6})(?:\d{4})?(R?[CD])([0-9.,]+)(?:[A-Z][A-Z0-9]{3})?([^/]*)?(?:\/\/(.+))?/.exec(line.slice(4));
    if (!match) {
      records.push({ rowNumber: records.length + 1, values: { description: "Imported MT940 statement row" } });
      continue;
    }
    const reference = cleanMt940Reference(match[5] ?? match[4]);
    const direction = match[2]!.endsWith("D") ? "DEBIT" : "CREDIT";
    records.push({
      rowNumber: records.length + 1,
      values: {
        date: normalizeMt940Date(match[1]),
        description: collectMt940Narrative(lines, index + 1) || reference,
        reference,
        bankReference: reference,
        amount: signedAmountFromDirection(match[3], direction),
        currency,
      },
    });
  }
  return { format: "MT940", records, detectedColumns: [":61:", ":86:", ":60F:", ":62F:"] };
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
  const isoDateTime = /^(\d{4}-\d{2}-\d{2})[T\s]/.exec(trimmed);
  if (isoDateTime) {
    return isoDateTime[1] ?? null;
  }
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed);
  if (compact) {
    const year = Number(compact[1]);
    const month = Number(compact[2]);
    const day = Number(compact[3]);
    return validDateParts(year, month, day) ? `${year}-${compact[2]}-${compact[3]}` : null;
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

function normalizeMt940Date(value: string | undefined): string | undefined {
  const match = /^(\d{2})(\d{2})(\d{2})$/.exec(value ?? "");
  if (!match) {
    return value;
  }
  const year = Number(match[1]) >= 70 ? 1900 + Number(match[1]) : 2000 + Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return validDateParts(year, month, day) ? `${year}-${match[2]}-${match[3]}` : value;
}

function parseStatementAmount(value: string): { value: number | null; error: boolean } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { value: null, error: false };
  }
  const negative = /^\(.*\)$/.test(trimmed) || trimmed.startsWith("-");
  const withoutWrapping = trimmed.replace(/[()\s]/g, "");
  const lastComma = withoutWrapping.lastIndexOf(",");
  const lastDot = withoutWrapping.lastIndexOf(".");
  const decimalNormalized =
    lastComma >= 0 && lastComma > lastDot ? withoutWrapping.replace(/\./g, "").replace(",", ".") : withoutWrapping.replace(/,/g, "");
  const normalized = decimalNormalized.replace(/[^0-9.-]/g, "");
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

function normalizeDirectionalAmount(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return trimmed;
  }
  const lastComma = trimmed.lastIndexOf(",");
  const lastDot = trimmed.lastIndexOf(".");
  return lastComma >= 0 && lastComma > lastDot ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed.replace(/,/g, "");
}

function signedAmountFromDirection(amount: string | undefined, direction: "DEBIT" | "CREDIT"): string | undefined {
  const normalized = normalizeDirectionalAmount(amount);
  if (!normalized) {
    return normalized;
  }
  const unsigned = normalized.startsWith("-") ? normalized.slice(1) : normalized;
  return direction === "DEBIT" ? `-${unsigned}` : unsigned;
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

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll("\"", "\"\"")}"` : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function ofxTagValue(text: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i").exec(text);
  return cleanParsedText(match?.[1]);
}

function findOfxTransactionBlocks(text: string): string[] {
  return Array.from(text.matchAll(/<STMTTRN\b[^>]*>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN\b)|(?=<\/BANKTRANLIST>)|$)/gi)).map(
    (match) => match[1] ?? "",
  );
}

function findXmlBlocks(text: string, tag: string): string[] {
  return Array.from(text.matchAll(new RegExp(`<(?:\\w+:)?${tag}\\b[\\s\\S]*?<\\/(?:\\w+:)?${tag}>`, "gi"))).map((match) => match[0]);
}

function xmlNestedDate(text: string, parentTag: string): string | undefined {
  const block = findXmlBlocks(text, parentTag)[0];
  return block ? xmlTagValue(block, "Dt") || xmlTagValue(block, "DtTm") : undefined;
}

function xmlTagValue(text: string, tag: string): string | undefined {
  const match = new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, "i").exec(text);
  return cleanParsedText(match?.[1]);
}

function xmlAttributeValue(text: string, tag: string, attribute: string): string | undefined {
  const match = new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*\\b${attribute}=["']([^"']+)["']`, "i").exec(text);
  return cleanParsedText(match?.[1]);
}

function firstMeaningfulValue(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value && value.toUpperCase() !== "NOTPROVIDED");
}

function camtDebitCreditDirection(indicator: string | undefined): "DEBIT" | "CREDIT" | null {
  if (indicator === "DBIT") {
    return "DEBIT";
  }
  if (indicator === "CRDT") {
    return "CREDIT";
  }
  return null;
}

function collectMt940Narrative(lines: string[], startIndex: number): string | undefined {
  const firstLine = lines[startIndex] ?? "";
  if (!firstLine.startsWith(":86:")) {
    return undefined;
  }
  const parts = [firstLine.slice(4).trim()];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (/^:\d{2}[A-Z]?:/.test(line)) {
      break;
    }
    if (line.trim()) {
      parts.push(line.trim());
    }
  }
  return cleanParsedText(parts.join(" "));
}

function cleanMt940Reference(value: string | undefined): string | undefined {
  const cleaned = cleanParsedText(value);
  return cleaned?.split("CRLF")[0]?.trim() || undefined;
}

function cleanParsedText(value: string | undefined): string | undefined {
  const trimmed = value
    ?.replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}
