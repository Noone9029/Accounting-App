import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  detectBankStatementImportFormat,
  parseBankStatementCsvText,
  parseBankStatementImportInput,
} from "./bank-statement-import-parser";

describe("bank statement import parser", () => {
  function readFixture(filename: string) {
    return readFileSync(join(__dirname, "fixtures", filename), "utf8");
  }

  it("parses common CSV headers case-insensitively", () => {
    const result = parseBankStatementCsvText(
      'Transaction Date,Memo,Ref,Withdrawal,Deposit\n2026-05-13,"Bank, fee",FEE-1,2.5000,0.0000',
    );

    expect(result.detectedColumns).toEqual(["Transaction Date", "Memo", "Ref", "Withdrawal", "Deposit"]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        sourceRowNumber: 2,
        date: "2026-05-13",
        description: "Bank, fee",
        reference: "FEE-1",
        debit: "2.5000",
        credit: "0.0000",
      }),
    ]);
  });

  it("escapes quotes and newlines inside CSV fields", () => {
    const result = parseBankStatementCsvText('Date,Description,Credit\n2026-05-13,"Receipt ""A""\nDeposit",10.0000');

    expect(result.rows[0]).toMatchObject({
      date: "2026-05-13",
      description: 'Receipt "A"\nDeposit',
      credit: "10.0000",
    });
  });

  it("parses signed amount, balance, currency, and bank reference columns", () => {
    const result = parseBankStatementCsvText("postedDate,details,bankReference,amount,balance,currency\n2026-05-13,Receipt,PAY-1,-15.0000,985.0000,SAR");

    expect(result.detectedColumns).toEqual(["postedDate", "details", "bankReference", "amount", "balance", "currency"]);
    expect(result.rows[0]).toMatchObject({
      sourceRowNumber: 2,
      date: "2026-05-13",
      description: "Receipt",
      reference: "PAY-1",
      bankReference: "PAY-1",
      amount: "-15.0000",
      balance: "985.0000",
      currency: "SAR",
    });
  });

  it("parses debit and credit column variants, decimal commas, and date-times", () => {
    const result = parseBankStatementCsvText(
      "Value Date,Narration,Transaction Reference,Debit Amount,Credit Amount,Running Balance\n2026-05-15T09:30:00Z,Service fee,FEE-44,\"1.234,56\",0,\"9.876,54\"\n15/05/2026,Receipt,RCPT-44,0,\"2.500,00\",\"12.376,54\"",
    );

    expect(result.rows).toEqual([
      expect.objectContaining({
        date: "2026-05-15",
        description: "Service fee",
        reference: "FEE-44",
        debit: "1234.56",
        credit: "0",
        balance: "9876.54",
      }),
      expect.objectContaining({
        date: "2026-05-15",
        description: "Receipt",
        reference: "RCPT-44",
        debit: "0",
        credit: "2500.00",
        balance: "12376.54",
      }),
    ]);
  });

  it("parses JSON statement text without requiring live bank input", () => {
    const result = parseBankStatementImportInput({
      csvText: '{"rows":[{"transactionDate":"2026-05-13","memo":"Receipt","amount":"100.00","counterparty":"Customer"}]}',
    });

    expect(result.detectedColumns).toEqual(["transactionDate", "memo", "amount", "counterparty"]);
    expect(result.rows[0]).toMatchObject({
      date: "2026-05-13",
      description: "Receipt",
      amount: "100.00",
      counterparty: "Customer",
    });
  });

  it("detects CSV, JSON, OFX, CAMT, MT940, and unsupported statement formats", () => {
    expect(detectBankStatementImportFormat("date,description,amount\n2026-05-13,Receipt,10.00")).toBe("CSV");
    expect(detectBankStatementImportFormat('[{"date":"2026-05-13","amount":"10.00"}]')).toBe("JSON");
    expect(detectBankStatementImportFormat(readFixture("sample.ofx"))).toBe("OFX");
    expect(detectBankStatementImportFormat(readFixture("sample-camt053.xml"))).toBe("CAMT");
    expect(detectBankStatementImportFormat(readFixture("sample.mt940"))).toBe("MT940");
    expect(detectBankStatementImportFormat("not a statement export")).toBe("UNKNOWN");
  });

  it("parses sanitized OFX fixtures into normalized manual statement rows", () => {
    const result = parseBankStatementImportInput({ csvText: readFixture("sample.ofx") });

    expect(result.format).toBe("OFX");
    expect(result.detectedColumns).toEqual(expect.arrayContaining(["DTPOSTED", "TRNAMT", "FITID", "MEMO", "CURDEF"]));
    expect(result.rows).toEqual([
      expect.objectContaining({
        sourceRowNumber: 1,
        date: "2026-05-13",
        description: "Manual OFX sample receipt",
        reference: "FAKE-OFX-0001",
        bankReference: "FAKE-OFX-0001",
        amount: "250.00",
        currency: "SAR",
      }),
      expect.objectContaining({
        sourceRowNumber: 2,
        date: "2026-05-14",
        description: "Manual OFX sample bank fee",
        reference: "FAKE-OFX-0002",
        amount: "-15.50",
      }),
    ]);
  });

  it("parses OFX XML-style fixtures and warns when FITID is missing", () => {
    const result = parseBankStatementImportInput({ csvText: readFixture("sample-ofx-xml-missing-fitid.ofx") });

    expect(result.format).toBe("OFX");
    expect(result.warnings).toContain("1 OFX transaction is missing FITID; duplicate checks will fall back to date, amount, and description.");
    expect(result.rows).toEqual([
      expect.objectContaining({
        sourceRowNumber: 1,
        date: "2026-05-15",
        description: "Manual OFX XML sample receipt",
        reference: undefined,
        bankReference: undefined,
        amount: "75.25",
        counterparty: "FAKE OFX COUNTERPARTY",
      }),
      expect.objectContaining({
        sourceRowNumber: 2,
        date: "2026-05-16",
        description: "Manual OFX XML sample fee",
        reference: "FAKE-OFX-XML-0002",
        amount: "-8.75",
      }),
    ]);
  });

  it("parses sanitized CAMT fixtures into normalized manual statement rows", () => {
    const result = parseBankStatementImportInput({ csvText: readFixture("sample-camt053.xml") });

    expect(result.format).toBe("CAMT");
    expect(result.detectedColumns).toEqual(expect.arrayContaining(["BookgDt", "Amt", "CdtDbtInd", "AcctSvcrRef", "Ustrd"]));
    expect(result.rows).toEqual([
      expect.objectContaining({
        sourceRowNumber: 1,
        date: "2026-05-13",
        description: "Manual CAMT sample receipt",
        reference: "FAKE-CAMT-0001",
        bankReference: "FAKE-CAMT-0001",
        amount: "250.00",
        counterparty: "Sample Counterparty",
        currency: "SAR",
      }),
      expect.objectContaining({
        sourceRowNumber: 2,
        date: "2026-05-14",
        description: "Manual CAMT sample bank fee",
        reference: "FAKE-CAMT-0002",
        amount: "-15.50",
      }),
    ]);
  });

  it("parses sanitized CAMT054 fixtures with date-time and reference fallback", () => {
    const result = parseBankStatementImportInput({ csvText: readFixture("sample-camt054.xml") });

    expect(result.format).toBe("CAMT");
    expect(result.rows).toEqual([
      expect.objectContaining({
        sourceRowNumber: 1,
        date: "2026-05-15",
        description: "Manual CAMT054 sample receipt",
        reference: "FAKE-CAMT054-E2E-0001",
        bankReference: "FAKE-CAMT054-E2E-0001",
        amount: "175.25",
        currency: "SAR",
      }),
      expect.objectContaining({
        sourceRowNumber: 2,
        date: "2026-05-16",
        description: "Manual CAMT054 sample fee",
        reference: "FAKE-CAMT054-TX-0002",
        amount: "-22.10",
      }),
    ]);
  });

  it("warns safely when CAMT entries have no credit/debit indicator", () => {
    const result = parseBankStatementImportInput({
      csvText: `<Document><BkToCstmrStmt><Stmt><Ntry><Amt Ccy="SAR">10.00</Amt><BookgDt><Dt>2026-05-17</Dt></BookgDt><AcctSvcrRef>FAKE-CAMT-MISSING-DIR</AcctSvcrRef></Ntry></Stmt></BkToCstmrStmt></Document>`,
    });

    expect(result.format).toBe("CAMT");
    expect(result.rows[0]).toMatchObject({ date: "2026-05-17", reference: "FAKE-CAMT-MISSING-DIR", amount: undefined });
    expect(result.warnings).toContain("1 CAMT entry is missing CdtDbtInd; amount direction could not be inferred.");
    expect(result.warnings.join(" ")).not.toContain("<Document>");
  });

  it("returns explicit empty-file warnings without treating the body as JSON rows", () => {
    const result = parseBankStatementImportInput({ csvText: " \n\t " });

    expect(result).toEqual({
      format: "UNKNOWN",
      rows: [],
      detectedColumns: [],
      warnings: ["Statement text did not contain any rows."],
    });
  });

  it("parses sanitized MT940 fixtures into normalized manual statement rows", () => {
    const result = parseBankStatementImportInput({ csvText: readFixture("sample.mt940") });

    expect(result.format).toBe("MT940");
    expect(result.detectedColumns).toEqual(expect.arrayContaining([":61:", ":86:", ":60F:", ":62F:"]));
    expect(result.rows).toEqual([
      expect.objectContaining({
        sourceRowNumber: 1,
        date: "2026-05-13",
        description: "Manual MT940 sample receipt",
        reference: "FAKE-MT940-0001",
        bankReference: "FAKE-MT940-0001",
        amount: "250.00",
        currency: "SAR",
      }),
      expect.objectContaining({
        sourceRowNumber: 2,
        date: "2026-05-14",
        description: "Manual MT940 sample bank fee",
        reference: "FAKE-MT940-0002",
        amount: "-15.50",
      }),
    ]);
  });

  it("parses MT940 comma decimals, F transaction codes, and multiline :86: narratives", () => {
    const result = parseBankStatementImportInput({ csvText: readFixture("sample-mt940-multiline.mt940") });

    expect(result.format).toBe("MT940");
    expect(result.rows).toEqual([
      expect.objectContaining({
        sourceRowNumber: 1,
        date: "2026-05-15",
        description: "Manual MT940 multiline receipt additional sanitized narrative line",
        reference: "FAKE-MT940-ML-0001",
        amount: "1234.56",
        currency: "SAR",
      }),
      expect.objectContaining({
        sourceRowNumber: 2,
        date: "2026-05-16",
        description: "Manual MT940 debit fee",
        reference: "FAKE-MT940-ML-0002",
        amount: "-22.10",
      }),
    ]);
  });

  it("returns a safe unsupported-format warning without echoing raw file content", () => {
    const result = parseBankStatementImportInput({ csvText: "private-looking raw body that should not be echoed" });

    expect(result.format).toBe("UNKNOWN");
    expect(result.rows).toEqual([]);
    expect(result.warnings).toContain("Statement format could not be detected. Use CSV, JSON, OFX, CAMT XML, or MT940 manual exports.");
    expect(result.warnings.join(" ")).not.toContain("private-looking raw body");
  });

  it("returns safe JSON errors without echoing malformed raw statement content", () => {
    const result = parseBankStatementImportInput({ csvText: '{"rows":[{"description":"private raw memo"' });

    expect(result.format).toBe("JSON");
    expect(result.rows).toEqual([]);
    expect(result.warnings).toContain("JSON statement text could not be parsed.");
    expect(result.warnings.join(" ")).not.toContain("private raw memo");
  });
});
