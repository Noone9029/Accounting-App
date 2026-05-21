export interface StatementImportSourceRow {
  date?: string;
  description?: string;
  reference?: string;
  bankReference?: string;
  debit?: string;
  credit?: string;
  amount?: string;
  balance?: string;
  counterparty?: string;
  currency?: string;
  rawData: Record<string, unknown>;
  sourceRowNumber: number;
}

export interface StatementImportParseResult {
  rows: StatementImportSourceRow[];
  detectedColumns: string[];
  warnings: string[];
}

type StatementColumn = "date" | "description" | "reference" | "bankReference" | "debit" | "credit" | "amount" | "balance" | "counterparty" | "currency";

const HEADER_ALIASES: Record<StatementColumn, string[]> = {
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

export function parseBankStatementImportInput(input: {
  csvText?: string | null;
  rows?: Array<{
    date?: string;
    description?: string;
    reference?: string;
    bankReference?: string;
    debit?: string;
    credit?: string;
    amount?: string;
    balance?: string;
    counterparty?: string;
    currency?: string;
  }> | null;
}): StatementImportParseResult {
  const csvText = input.csvText?.trim();
  if (csvText) {
    if (csvText.startsWith("[") || csvText.startsWith("{")) {
      return parseBankStatementJsonText(csvText);
    }
    return parseBankStatementCsvText(csvText);
  }

  const rows = input.rows ?? [];
  const detectedColumns = Array.from(
    rows.reduce((columns, row) => {
      for (const key of Object.keys(row)) {
        columns.add(key);
      }
      return columns;
    }, new Set<string>()),
  );

  return {
    rows: rows.map((row, index) => sourceRowFromRecord(row as Record<string, unknown>, index + 1)),
    detectedColumns,
    warnings: rows.length === 0 ? ["No statement rows were provided."] : [],
  };
}

export function parseBankStatementJsonText(jsonText: string): StatementImportParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    return { rows: [], detectedColumns: [], warnings: ["JSON statement text could not be parsed."] };
  }
  const rows = Array.isArray(parsed) ? parsed : isRecord(parsed) && Array.isArray(parsed.rows) ? parsed.rows : null;
  if (!rows) {
    return { rows: [], detectedColumns: [], warnings: ["JSON input must be an array of rows or an object with a rows array."] };
  }
  const detectedColumnSet = new Set<string>();
  rows.forEach((row) => {
    if (isRecord(row)) {
      for (const key of Object.keys(row)) {
        detectedColumnSet.add(key);
      }
    }
  });
  const detectedColumns = Array.from(detectedColumnSet);
  const warnings = rows.some((row) => !isRecord(row)) ? ["JSON statement rows must be objects."] : [];
  return {
    rows: rows.filter(isRecord).map((row, index) => sourceRowFromRecord(row, index + 1)),
    detectedColumns,
    warnings,
  };
}

export function parseBankStatementCsvText(csvText: string): StatementImportParseResult {
  const records = parseCsvRecords(csvText).filter((record) => record.some((value) => value.trim() !== ""));
  if (records.length === 0) {
    return { rows: [], detectedColumns: [], warnings: ["CSV text did not contain any rows."] };
  }

  const headers = records[0]!.map((header) => header.trim());
  const mappedHeaders = mapHeaders(headers);
  const warnings = mappedHeaders.warnings;
  const rows = records.slice(1).map((record, rowIndex) => {
    const rawData = Object.fromEntries(headers.map((header, index) => [header || `Column ${index + 1}`, record[index] ?? ""]));
    const row: StatementImportSourceRow = {
      rawData,
      sourceRowNumber: rowIndex + 2,
    };
    for (const [index, canonical] of mappedHeaders.byIndex.entries()) {
      if (!canonical) {
        continue;
      }
      row[canonical] = record[index]?.trim();
    }
    if (!row.description) {
      row.description = row.counterparty || row.reference || row.bankReference;
    }
    if (!row.reference) {
      row.reference = row.bankReference;
    }
    return normalizeSourceRowAmounts(row);
  });

  return {
    rows,
    detectedColumns: headers.filter(Boolean),
    warnings,
  };
}

function mapHeaders(headers: string[]) {
  const byIndex = new Map<number, StatementColumn>();
  const seen = new Set<StatementColumn>();
  const warnings: string[] = [];

  headers.forEach((header, index) => {
    const canonical = canonicalHeader(header);
    if (!canonical) {
      return;
    }
    if (seen.has(canonical)) {
      warnings.push(`Duplicate ${canonical} column detected; the later column was used.`);
    }
    seen.add(canonical);
    byIndex.set(index, canonical);
  });

  for (const required of ["date", "description"] as const) {
    if (!seen.has(required)) {
      warnings.push(`CSV column ${required} was not detected.`);
    }
  }
  if (!seen.has("debit") && !seen.has("credit") && !seen.has("amount")) {
    warnings.push("CSV columns debit/credit or signed amount were not detected.");
  }

  return { byIndex, warnings };
}

function canonicalHeader(header: string): StatementColumn | null {
  const normalized = normalizeHeader(header);
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(normalized)) {
      return canonical as StatementColumn;
    }
  }
  return null;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
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

function sourceRowFromRecord(record: Record<string, unknown>, sourceRowNumber: number): StatementImportSourceRow {
  const row: StatementImportSourceRow = {
    date: stringField(record, "date"),
    description: stringField(record, "description") || stringField(record, "counterparty") || stringField(record, "reference") || stringField(record, "bankReference"),
    reference: stringField(record, "reference") || stringField(record, "bankReference"),
    bankReference: stringField(record, "bankReference"),
    debit: stringField(record, "debit"),
    credit: stringField(record, "credit"),
    amount: stringField(record, "amount"),
    balance: stringField(record, "balance"),
    counterparty: stringField(record, "counterparty"),
    currency: stringField(record, "currency"),
    rawData: { ...record },
    sourceRowNumber,
  };
  return normalizeSourceRowAmounts(row);
}

function stringField(record: Record<string, unknown>, field: StatementColumn): string | undefined {
  for (const [key, value] of Object.entries(record)) {
    if (canonicalHeader(key) === field && value !== undefined && value !== null) {
      return String(value);
    }
  }
  return undefined;
}

function normalizeSourceRowAmounts(row: StatementImportSourceRow): StatementImportSourceRow {
  return {
    ...row,
    date: normalizeDateText(row.date),
    debit: normalizeAmountText(row.debit),
    credit: normalizeAmountText(row.credit),
    amount: normalizeAmountText(row.amount),
    balance: normalizeAmountText(row.balance),
  };
}

function normalizeAmountText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (!/\d/.test(trimmed)) {
    return trimmed;
  }
  const negative = /^\(.*\)$/.test(trimmed) || trimmed.startsWith("-");
  const normalized = trimmed.replace(/[(),]/g, "").replace(/[^0-9.-]/g, "");
  return negative && !normalized.startsWith("-") ? `-${normalized}` : normalized;
}

function normalizeDateText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return trimmed;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    return isValidDatePart(Number(iso[1]), Number(iso[2]), Number(iso[3])) ? trimmed : value;
  }
  const dayMonthYear = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const month = Number(dayMonthYear[2]);
    const year = Number(dayMonthYear[3]);
    return isValidDatePart(year, month, day) ? `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}` : value;
  }
  return value;
}

function isValidDatePart(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
