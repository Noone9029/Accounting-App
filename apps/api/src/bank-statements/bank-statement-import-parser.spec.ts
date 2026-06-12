import { readFileSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import {
  detectBankStatementImportFormat,
  parseBankStatementCsvText,
  parseBankStatementImportInput,
  parseBankStatementXlsxBase64,
} from "./bank-statement-import-parser";

describe("bank statement import parser", () => {
  function readFixture(filename: string) {
    return readFileSync(join(__dirname, "fixtures", filename), "utf8");
  }

  async function workbookBase64(sheets: Record<string, unknown[][]>) {
    const workbook = new ExcelJS.Workbook();
    for (const [name, rows] of Object.entries(sheets)) {
      const worksheet = workbook.addWorksheet(name);
      rows.forEach((row) => worksheet.addRow(row));
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer).toString("base64");
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

  it("parses canonical CSV template headers", () => {
    const result = parseBankStatementCsvText(
      "date,description,reference,bankReference,debit,credit,amount,balance,counterparty,currency\n2026-01-31,Receipt,RCPT-1,BANK-1,,2500.00,,12500.00,Sample Customer,SAR",
    );

    expect(result.detectedColumns).toEqual(["date", "description", "reference", "bankReference", "debit", "credit", "amount", "balance", "counterparty", "currency"]);
    expect(result.rows[0]).toMatchObject({
      date: "2026-01-31",
      description: "Receipt",
      reference: "RCPT-1",
      bankReference: "BANK-1",
      credit: "2500.00",
      balance: "12500.00",
      counterparty: "Sample Customer",
      currency: "SAR",
    });
  });

  it("parses XLSX canonical headers, debit and credit columns, numeric cells, and date cells", async () => {
    const result = await parseBankStatementXlsxBase64(
      await workbookBase64({
        Statement: [
          ["date", "description", "reference", "bankReference", "debit", "credit", "balance", "currency"],
          [new Date(Date.UTC(2026, 0, 31)), "Customer receipt", "RCPT-1", "BANK-1", "", 2500, 12500.75, "SAR"],
          ["", "", "", "", "", "", "", ""],
          [new Date(Date.UTC(2026, 1, 1)), "Bank fee", "FEE-1", "BANK-2", 15.5, "", 12485.25, "SAR"],
        ],
      }),
    );

    expect(result.format).toBe("XLSX");
    expect(result.sourceSheetName).toBe("Statement");
    expect(result.detectedColumns).toEqual(["date", "description", "reference", "bankReference", "debit", "credit", "balance", "currency"]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        sourceRowNumber: 2,
        date: "2026-01-31",
        description: "Customer receipt",
        reference: "RCPT-1",
        bankReference: "BANK-1",
        credit: "2500",
        balance: "12500.75",
      }),
      expect.objectContaining({
        sourceRowNumber: 4,
        date: "2026-02-01",
        description: "Bank fee",
        debit: "15.5",
        balance: "12485.25",
      }),
    ]);
  });

  it("parses XLSX signed amount columns and warns when extra sheets are ignored", async () => {
    const result = await parseBankStatementImportInput({
      xlsxBase64: await workbookBase64({
        First: [
          ["postedDate", "details", "amount", "balance", "counterparty", "currency"],
          ["2026-02-02", "Signed receipt", "100.00", "12600.75", "Customer", "SAR"],
          ["2026-02-03", "Signed fee", "-12.25", "12588.50", "Bank", "SAR"],
        ],
        Ignored: [["date", "description", "amount"], ["2026-02-04", "Ignored", "999.00"]],
      }),
    });

    expect(result.format).toBe("XLSX");
    expect(result.sourceSheetName).toBe("First");
    expect(result.rows).toEqual([
      expect.objectContaining({ date: "2026-02-02", description: "Signed receipt", amount: "100.00", balance: "12600.75" }),
      expect.objectContaining({ date: "2026-02-03", description: "Signed fee", amount: "-12.25", balance: "12588.50" }),
    ]);
    expect(result.warnings).toContain('XLSX workbook contains 2 worksheets; only the first worksheet "First" was parsed.');
    expect(JSON.stringify(result.rows)).not.toContain("Ignored");
  });

  it("rejects malformed or empty XLSX workbooks safely", async () => {
    await expect(parseBankStatementXlsxBase64("not-a-workbook")).resolves.toMatchObject({
      warnings: expect.arrayContaining(["XLSX workbook could not be parsed."]),
    });

    const empty = await parseBankStatementXlsxBase64(await workbookBase64({ Empty: [] }));
    expect(empty.rows).toEqual([]);
    expect(empty.warnings).toContain('XLSX worksheet "Empty" did not contain any rows.');
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

  it("parses JSON statement text without requiring live bank input", async () => {
    const result = await parseBankStatementImportInput({
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

  it("parses sanitized OFX fixtures into normalized manual statement rows", async () => {
    const result = await parseBankStatementImportInput({ csvText: readFixture("sample.ofx") });

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

  it("parses OFX XML-style fixtures and warns when FITID is missing", async () => {
    const result = await parseBankStatementImportInput({ csvText: readFixture("sample-ofx-xml-missing-fitid.ofx") });

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

  it("parses sanitized CAMT fixtures into normalized manual statement rows", async () => {
    const result = await parseBankStatementImportInput({ csvText: readFixture("sample-camt053.xml") });

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

  it("parses sanitized CAMT054 fixtures with date-time and reference fallback", async () => {
    const result = await parseBankStatementImportInput({ csvText: readFixture("sample-camt054.xml") });

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

  it("warns safely when CAMT entries have no credit/debit indicator", async () => {
    const result = await parseBankStatementImportInput({
      csvText: `<Document><BkToCstmrStmt><Stmt><Ntry><Amt Ccy="SAR">10.00</Amt><BookgDt><Dt>2026-05-17</Dt></BookgDt><AcctSvcrRef>FAKE-CAMT-MISSING-DIR</AcctSvcrRef></Ntry></Stmt></BkToCstmrStmt></Document>`,
    });

    expect(result.format).toBe("CAMT");
    expect(result.rows[0]).toMatchObject({ date: "2026-05-17", reference: "FAKE-CAMT-MISSING-DIR", amount: undefined });
    expect(result.warnings).toContain("1 CAMT entry is missing CdtDbtInd; amount direction could not be inferred.");
    expect(result.warnings.join(" ")).not.toContain("<Document>");
  });

  it("returns explicit empty-file warnings without treating the body as JSON rows", async () => {
    const result = await parseBankStatementImportInput({ csvText: " \n\t " });

    expect(result).toEqual({
      format: "UNKNOWN",
      rows: [],
      detectedColumns: [],
      warnings: ["Statement text did not contain any rows."],
    });
  });

  it("parses sanitized MT940 fixtures into normalized manual statement rows", async () => {
    const result = await parseBankStatementImportInput({ csvText: readFixture("sample.mt940") });

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

  it("parses MT940 comma decimals, F transaction codes, and multiline :86: narratives", async () => {
    const result = await parseBankStatementImportInput({ csvText: readFixture("sample-mt940-multiline.mt940") });

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

  it("returns a safe unsupported-format warning without echoing raw file content", async () => {
    const result = await parseBankStatementImportInput({ csvText: "private-looking raw body that should not be echoed" });

    expect(result.format).toBe("UNKNOWN");
    expect(result.rows).toEqual([]);
    expect(result.warnings).toContain("Statement format could not be detected. Use CSV, JSON, OFX, CAMT XML, or MT940 manual exports.");
    expect(result.warnings.join(" ")).not.toContain("private-looking raw body");
  });

  it("returns safe JSON errors without echoing malformed raw statement content", async () => {
    const result = await parseBankStatementImportInput({ csvText: '{"rows":[{"description":"private raw memo"' });

    expect(result.format).toBe("JSON");
    expect(result.rows).toEqual([]);
    expect(result.warnings).toContain("JSON statement text could not be parsed.");
    expect(result.warnings.join(" ")).not.toContain("private raw memo");
  });
});
