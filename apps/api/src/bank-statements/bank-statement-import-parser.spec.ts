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

  it("returns a safe unsupported-format warning without echoing raw file content", () => {
    const result = parseBankStatementImportInput({ csvText: "private-looking raw body that should not be echoed" });

    expect(result.format).toBe("UNKNOWN");
    expect(result.rows).toEqual([]);
    expect(result.warnings).toContain("Statement format could not be detected. Use CSV, JSON, OFX, CAMT XML, or MT940 manual exports.");
    expect(result.warnings.join(" ")).not.toContain("private-looking raw body");
  });
});
