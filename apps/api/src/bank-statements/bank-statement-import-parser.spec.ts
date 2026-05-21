import { parseBankStatementCsvText, parseBankStatementImportInput } from "./bank-statement-import-parser";

describe("bank statement import parser", () => {
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
});
