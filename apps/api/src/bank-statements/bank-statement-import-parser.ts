export interface StatementImportSourceRow {
  date?: string;
  description?: string;
  reference?: string;
  debit?: string;
  credit?: string;
  rawData: Record<string, unknown>;
  sourceRowNumber: number;
}

export interface StatementImportParseResult {
  rows: StatementImportSourceRow[];
  detectedColumns: string[];
  warnings: string[];
}

const HEADER_ALIASES: Record<"date" | "description" | "reference" | "debit" | "credit", string[]> = {
  date: ["date", "transaction date"],
  description: ["description", "memo", "narration"],
  reference: ["reference", "ref"],
  debit: ["debit", "withdrawal", "money out"],
  credit: ["credit", "deposit", "money in"],
};

export function parseBankStatementImportInput(input: {
  csvText?: string | null;
  rows?: Array<{
    date?: string;
    description?: string;
    reference?: string;
    debit?: string;
    credit?: string;
  }> | null;
}): StatementImportParseResult {
  const csvText = input.csvText?.trim();
  if (csvText) {
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
    rows: rows.map((row, index) => ({
      date: row.date,
      description: row.description,
      reference: row.reference,
      debit: row.debit,
      credit: row.credit,
      rawData: {
        date: row.date ?? null,
        description: row.description ?? null,
        reference: row.reference ?? null,
        debit: row.debit ?? null,
        credit: row.credit ?? null,
      },
      sourceRowNumber: index + 1,
    })),
    detectedColumns,
    warnings: rows.length === 0 ? ["No statement rows were provided."] : [],
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
    return row;
  });

  return {
    rows,
    detectedColumns: headers.filter(Boolean),
    warnings,
  };
}

function mapHeaders(headers: string[]) {
  const byIndex = new Map<number, keyof typeof HEADER_ALIASES>();
  const seen = new Set<keyof typeof HEADER_ALIASES>();
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
  if (!seen.has("debit") && !seen.has("credit")) {
    warnings.push("CSV columns debit/credit were not detected.");
  }

  return { byIndex, warnings };
}

function canonicalHeader(header: string): keyof typeof HEADER_ALIASES | null {
  const normalized = normalizeHeader(header);
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(normalized)) {
      return canonical as keyof typeof HEADER_ALIASES;
    }
  }
  return null;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
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
