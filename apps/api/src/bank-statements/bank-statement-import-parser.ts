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

export type StatementImportFormat = "CSV" | "JSON" | "OFX" | "CAMT" | "MT940" | "UNKNOWN";

export interface StatementImportParseResult {
  format: StatementImportFormat;
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
    const format = detectBankStatementImportFormat(csvText);
    switch (format) {
      case "JSON":
        return parseBankStatementJsonText(csvText);
      case "OFX":
        return parseBankStatementOfxText(csvText);
      case "CAMT":
        return parseBankStatementCamtText(csvText);
      case "MT940":
        return parseBankStatementMt940Text(csvText);
      case "CSV":
        return parseBankStatementCsvText(csvText);
      case "UNKNOWN":
        return {
          format: "UNKNOWN",
          rows: [],
          detectedColumns: [],
          warnings: ["Statement format could not be detected. Use CSV, JSON, OFX, CAMT XML, or MT940 manual exports."],
        };
    }
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
    format: "JSON",
    rows: rows.map((row, index) => sourceRowFromRecord(row as Record<string, unknown>, index + 1)),
    detectedColumns,
    warnings: rows.length === 0 ? ["No statement rows were provided."] : [],
  };
}

export function detectBankStatementImportFormat(text: string): StatementImportFormat {
  const trimmed = text.trim();
  if (!trimmed) {
    return "UNKNOWN";
  }
  const lower = trimmed.toLowerCase();
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
  if (/^:20:/m.test(trimmed) || /^:61:/m.test(trimmed) || lower.includes("\n:61:") || lower.includes("\r\n:61:")) {
    return "MT940";
  }
  const firstLine = trimmed.split(/\r?\n/, 1)[0] ?? "";
  if (firstLine.includes(",") && firstLine.split(",").some((header) => canonicalHeader(header))) {
    return "CSV";
  }
  return "UNKNOWN";
}

export function parseBankStatementJsonText(jsonText: string): StatementImportParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    return { format: "JSON", rows: [], detectedColumns: [], warnings: ["JSON statement text could not be parsed."] };
  }
  const rows = Array.isArray(parsed) ? parsed : isRecord(parsed) && Array.isArray(parsed.rows) ? parsed.rows : null;
  if (!rows) {
    return { format: "JSON", rows: [], detectedColumns: [], warnings: ["JSON input must be an array of rows or an object with a rows array."] };
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
    format: "JSON",
    rows: rows.filter(isRecord).map((row, index) => sourceRowFromRecord(row, index + 1)),
    detectedColumns,
    warnings,
  };
}

export function parseBankStatementCsvText(csvText: string): StatementImportParseResult {
  const records = parseCsvRecords(csvText).filter((record) => record.some((value) => value.trim() !== ""));
  if (records.length === 0) {
    return { format: "CSV", rows: [], detectedColumns: [], warnings: ["CSV text did not contain any rows."] };
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
    format: "CSV",
    rows,
    detectedColumns: headers.filter(Boolean),
    warnings,
  };
}

export function parseBankStatementOfxText(ofxText: string): StatementImportParseResult {
  const currency = ofxTagValue(ofxText, "CURDEF");
  const closingBalance = ofxTagValue(ofxText, "BALAMT");
  const blocks = ofxText.split(/<STMTTRN>/i).slice(1);
  const rows = blocks.map((block, index) => {
    const postedDate = normalizeDateText((ofxTagValue(block, "DTPOSTED") ?? "").slice(0, 8));
    const amount = normalizeSignedAmount(ofxTagValue(block, "TRNAMT"));
    const fitId = ofxTagValue(block, "FITID");
    const memo = ofxTagValue(block, "MEMO");
    const name = ofxTagValue(block, "NAME");
    const trnType = ofxTagValue(block, "TRNTYPE");
    return normalizeSourceRowAmounts({
      date: postedDate,
      description: memo || name || fitId || "Imported OFX statement row",
      reference: fitId,
      bankReference: fitId,
      amount,
      balance: closingBalance,
      counterparty: name && memo !== name ? name : undefined,
      currency,
      rawData: { format: "OFX", trnType, fitId, postedDate, amount, name, memo },
      sourceRowNumber: index + 1,
    });
  });

  return {
    format: "OFX",
    rows,
    detectedColumns: ["DTPOSTED", "TRNAMT", "FITID", "NAME", "MEMO", "CURDEF"],
    warnings: rows.length === 0 ? ["OFX statement did not contain any STMTTRN transactions."] : [],
  };
}

export function parseBankStatementCamtText(xmlText: string): StatementImportParseResult {
  const rows = findXmlBlocks(xmlText, "Ntry").map((block, index) => {
    const amountText = xmlTagValue(block, "Amt");
    const indicator = xmlTagValue(block, "CdtDbtInd");
    const signedAmount = signedAmountFromDirection(amountText, indicator === "DBIT" ? "DEBIT" : "CREDIT");
    const bookingDate = xmlNestedDate(block, "BookgDt") || xmlNestedDate(block, "ValDt");
    const reference = xmlTagValue(block, "AcctSvcrRef") || xmlTagValue(block, "NtryRef");
    const description = xmlTagValue(block, "Ustrd") || xmlTagValue(block, "AddtlNtryInf") || reference || "Imported CAMT statement row";
    const counterparty = xmlTagValue(block, "Nm");
    const currency = xmlAttributeValue(block, "Amt", "Ccy") || xmlTagValue(xmlText, "Ccy");
    return normalizeSourceRowAmounts({
      date: normalizeDateText(bookingDate),
      description,
      reference,
      bankReference: reference,
      amount: signedAmount,
      counterparty,
      currency,
      rawData: { format: "CAMT", indicator, reference, bookingDate, amount: signedAmount },
      sourceRowNumber: index + 1,
    });
  });

  return {
    format: "CAMT",
    rows,
    detectedColumns: ["BookgDt", "ValDt", "Amt", "CdtDbtInd", "AcctSvcrRef", "Ustrd"],
    warnings: rows.length === 0 ? ["CAMT XML did not contain any Ntry entries."] : [],
  };
}

export function parseBankStatementMt940Text(mt940Text: string): StatementImportParseResult {
  const currency = mt940Text.match(/^:60[FM]:[CD]\d{6}([A-Z]{3})/m)?.[1] ?? mt940Text.match(/^:62[FM]:[CD]\d{6}([A-Z]{3})/m)?.[1];
  const lines = mt940Text.split(/\r?\n/);
  const rows: StatementImportSourceRow[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!line.startsWith(":61:")) {
      continue;
    }
    const details = line.slice(4);
    const match = /^(\d{6})(?:\d{4})?([CD])([0-9,]+)(?:[A-Z]{4})?([^/]*)?(?:\/\/(.+))?/.exec(details);
    if (!match) {
      rows.push(
        normalizeSourceRowAmounts({
          description: "Imported MT940 statement row",
          rawData: { format: "MT940", parseWarning: "Unrecognized :61: shape" },
          sourceRowNumber: rows.length + 1,
        }),
      );
      continue;
    }
    const nextLine = lines[index + 1] ?? "";
    const description = nextLine.startsWith(":86:") ? nextLine.slice(4).trim() : (match[5] ?? match[4] ?? "Imported MT940 statement row").trim();
    const bankReference = (match[5] ?? match[4] ?? "").trim() || undefined;
    rows.push(
      normalizeSourceRowAmounts({
        date: normalizeMt940Date(match[1]),
        description,
        reference: bankReference,
        bankReference,
        amount: signedAmountFromDirection(match[3]!.replace(",", "."), match[2] === "D" ? "DEBIT" : "CREDIT"),
        currency,
        rawData: { format: "MT940", direction: match[2], reference: bankReference },
        sourceRowNumber: rows.length + 1,
      }),
    );
  }

  return {
    format: "MT940",
    rows,
    detectedColumns: [":61:", ":86:", ":60F:", ":62F:"],
    warnings: rows.length === 0 ? ["MT940 statement did not contain any :61: transaction lines."] : [],
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

function normalizeSignedAmount(value: string | undefined): string | undefined {
  return normalizeAmountText(value?.replace(",", "."));
}

function signedAmountFromDirection(amount: string | undefined, direction: "DEBIT" | "CREDIT"): string | undefined {
  const normalized = normalizeSignedAmount(amount);
  if (!normalized) {
    return normalized;
  }
  const unsigned = normalized.startsWith("-") ? normalized.slice(1) : normalized;
  return direction === "DEBIT" ? `-${unsigned}` : unsigned;
}

function normalizeDateText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return trimmed;
  }
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed);
  if (compact) {
    const year = Number(compact[1]);
    const month = Number(compact[2]);
    const day = Number(compact[3]);
    return isValidDatePart(year, month, day) ? `${year}-${compact[2]}-${compact[3]}` : value;
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

function normalizeMt940Date(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  const match = /^(\d{2})(\d{2})(\d{2})$/.exec(trimmed ?? "");
  if (!match) {
    return value;
  }
  const year = Number(match[1]) >= 70 ? 1900 + Number(match[1]) : 2000 + Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return isValidDatePart(year, month, day) ? `${year}-${match[2]}-${match[3]}` : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ofxTagValue(text: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i").exec(text);
  return cleanParsedText(match?.[1]);
}

function findXmlBlocks(text: string, tag: string): string[] {
  return Array.from(text.matchAll(new RegExp(`<(?:\\w+:)?${tag}\\b[\\s\\S]*?<\\/(?:\\w+:)?${tag}>`, "gi"))).map((match) => match[0]);
}

function xmlNestedDate(text: string, parentTag: string): string | undefined {
  const block = findXmlBlocks(text, parentTag)[0];
  return block ? xmlTagValue(block, "Dt") : undefined;
}

function xmlTagValue(text: string, tag: string): string | undefined {
  const match = new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, "i").exec(text);
  return cleanParsedText(match?.[1]);
}

function xmlAttributeValue(text: string, tag: string, attribute: string): string | undefined {
  const match = new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*\\b${attribute}=["']([^"']+)["']`, "i").exec(text);
  return cleanParsedText(match?.[1]);
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
