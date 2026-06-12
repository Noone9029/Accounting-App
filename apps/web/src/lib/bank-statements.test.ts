import {
  bankReconciliationStatusBadgeClass,
  bankReconciliationStatusLabel,
  bankStatementImportStatusLabel,
  bankStatementTransactionStatusLabel,
  bankStatementTransactionTypeLabel,
  buildStatementImportTemplateCsv,
  candidateScoreLabel,
  closeBlockedMessage,
  closedThroughDateLabel,
  detectStatementImportFormat,
  lockedStatementTransactionWarning,
  parseStatementImportText,
  parseStatementRowsText,
  reconciliationDifferenceStatus,
  reconciliationActionBlockedMessage,
  reviewEventLabel,
  statementImportPreviewSummary,
  STATEMENT_IMPORT_TEMPLATE_COLUMNS,
  submitBlockedMessage,
  validateStatementImportFile,
} from "./bank-statements";

describe("bank statement helpers", () => {
  it("formats status, type, and candidate labels", () => {
    expect(bankStatementTransactionStatusLabel("UNMATCHED")).toBe("Unmatched");
    expect(bankStatementTransactionTypeLabel("CREDIT")).toBe("Credit");
    expect(bankStatementImportStatusLabel("IMPORTED")).toBe("Imported");
    expect(bankStatementImportStatusLabel("PARTIALLY_RECONCILED")).toBe("Partially reconciled");
    expect(bankStatementImportStatusLabel("RECONCILED")).toBe("Reconciled");
    expect(bankStatementImportStatusLabel("VOIDED")).toBe("Voided");
    expect(candidateScoreLabel({ score: 95 })).toBe("Strong match");
    expect(candidateScoreLabel({ score: 80 })).toBe("Likely match");
    expect(candidateScoreLabel({ score: 70 })).toBe("Possible match");
  });

  it("parses JSON statement rows from an array or rows object", () => {
    expect(parseStatementRowsText('[{"date":"2026-05-13","description":"Receipt","credit":"10.0000"}]')).toEqual([
      { date: "2026-05-13", description: "Receipt", reference: undefined, debit: "0.0000", credit: "10.0000" },
    ]);
    expect(parseStatementRowsText('{"rows":[{"date":"2026-05-14","description":"Fee","debit":5}]}')).toEqual([
      { date: "2026-05-14", description: "Fee", reference: undefined, debit: "5.0000", credit: "0.0000" },
    ]);
  });

  it("parses simple CSV statement rows with quoted descriptions", () => {
    expect(parseStatementRowsText('date,description,reference,debit,credit\n2026-05-13,"Bank, fee",FEE-1,2.5000,0.0000')).toEqual([
      { date: "2026-05-13", description: "Bank, fee", reference: "FEE-1", debit: "2.5000", credit: "0.0000" },
    ]);
  });

  it("parses CSV statement rows with common bank header aliases", () => {
    expect(parseStatementRowsText("Transaction Date,Memo,Ref,Money Out,Money In\n2026-05-13,Receipt,PAY-1,0.0000,10.0000")).toEqual([
      { date: "2026-05-13", description: "Receipt", reference: "PAY-1", debit: "0.0000", credit: "10.0000" },
    ]);
  });

  it("previews signed amount statement rows and duplicate candidates without raw content leakage", () => {
    const result = parseStatementImportText(
      "postedDate,details,bankReference,amount,balance,currency\n13/05/2026,Receipt,PAY-1,100.00,100.00,SAR\n13/05/2026,Receipt,PAY-1,100.00,200.00,SAR",
      { accountCurrency: "SAR" },
    );

    expect(result.format).toBe("CSV");
    expect(result.validRowCount).toBe(2);
    expect(result.duplicateCandidateCount).toBe(1);
    expect(result.rows[0]).toMatchObject({ date: "2026-05-13", description: "Receipt", reference: "PAY-1", credit: "100.0000" });
    expect(result.warnings.map((issue) => issue.message)).toContain("This row may duplicate another row in this file.");
    expect(JSON.stringify(result.errors)).not.toContain("Receipt,PAY-1");
  });

  it("detects and previews manual OFX, CAMT, and MT940 statement text without live-bank wording", () => {
    const ofx = `<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20260513000000<TRNAMT>25.00<FITID>FAKE-OFX-1<MEMO>Manual OFX sample</STMTTRN></BANKTRANLIST></OFX>`;
    const camt = `<Document><BkToCstmrStmt><Stmt><Ntry><Amt Ccy="SAR">15.50</Amt><CdtDbtInd>DBIT</CdtDbtInd><BookgDt><Dt>2026-05-14</Dt></BookgDt><AcctSvcrRef>FAKE-CAMT-1</AcctSvcrRef><NtryDtls><TxDtls><RmtInf><Ustrd>Manual CAMT fee</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry></Stmt></BkToCstmrStmt></Document>`;
    const mt940 = `:20:FAKESTATEMENT\n:25:FAKEACCOUNT\n:60F:C260501SAR0,00\n:61:2605130513C25,00NTRFFAKE//FAKE-MT940-1\n:86:Manual MT940 receipt\n:62F:C260531SAR25,00`;

    expect(detectStatementImportFormat(ofx)).toBe("OFX");
    expect(parseStatementImportText(ofx).rows[0]).toMatchObject({ date: "2026-05-13", description: "Manual OFX sample", credit: "25.0000" });
    expect(detectStatementImportFormat(camt)).toBe("CAMT");
    expect(parseStatementImportText(camt).rows[0]).toMatchObject({ date: "2026-05-14", description: "Manual CAMT fee", debit: "15.5000" });
    expect(detectStatementImportFormat(mt940)).toBe("MT940");
    expect(parseStatementImportText(mt940).rows[0]).toMatchObject({ date: "2026-05-13", description: "Manual MT940 receipt", credit: "25.0000" });
    expect(JSON.stringify(parseStatementImportText(ofx))).not.toMatch(/live bank sync/i);
  });

  it("previews OFX XML-style rows, CAMT date-time references, and MT940 multiline narratives", () => {
    const ofx = `<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20260515000000</DTPOSTED><TRNAMT>75.25</TRNAMT><NAME>FAKE OFX COUNTERPARTY</NAME><MEMO>Manual OFX XML sample receipt</MEMO></STMTTRN></BANKTRANLIST></OFX>`;
    const camt = `<Document><BkToCstmrDbtCdtNtfctn><Ntfctn><Ntry><Amt Ccy="SAR">175.25</Amt><CdtDbtInd>CRDT</CdtDbtInd><BookgDt><DtTm>2026-05-15T09:30:00Z</DtTm></BookgDt><NtryDtls><TxDtls><Refs><EndToEndId>FAKE-CAMT054-E2E-0001</EndToEndId></Refs><RmtInf><Ustrd>Manual CAMT054 sample receipt</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry></Ntfctn></BkToCstmrDbtCdtNtfctn></Document>`;
    const mt940 = `:20:FAKESTATEMENT2\n:60F:C260501SAR0,00\n:61:2605150515C1234,56NTRFFAKE//FAKE-MT940-ML-0001\n:86:Manual MT940 multiline receipt\nadditional sanitized narrative line\n:62F:C260531SAR1234,56`;

    expect(parseStatementImportText(ofx).rows[0]).toMatchObject({
      date: "2026-05-15",
      description: "Manual OFX XML sample receipt",
      credit: "75.2500",
      counterparty: "FAKE OFX COUNTERPARTY",
    });
    expect(parseStatementImportText(ofx).warnings.map((issue) => issue.message)).toContain(
      "1 OFX transaction is missing FITID; duplicate checks will fall back to date, amount, and description.",
    );
    expect(parseStatementImportText(camt).rows[0]).toMatchObject({
      date: "2026-05-15",
      description: "Manual CAMT054 sample receipt",
      reference: "FAKE-CAMT054-E2E-0001",
      credit: "175.2500",
    });
    expect(parseStatementImportText(mt940).rows[0]).toMatchObject({
      date: "2026-05-15",
      description: "Manual MT940 multiline receipt additional sanitized narrative line",
      reference: "FAKE-MT940-ML-0001",
      credit: "1234.5600",
    });
  });

  it("warns safely when CAMT direction is missing", () => {
    const result = parseStatementImportText(
      `<Document><BkToCstmrStmt><Stmt><Ntry><Amt Ccy="SAR">10.00</Amt><BookgDt><Dt>2026-05-17</Dt></BookgDt><AcctSvcrRef>FAKE-CAMT-MISSING-DIR</AcctSvcrRef></Ntry></Stmt></BkToCstmrStmt></Document>`,
    );

    expect(result.format).toBe("CAMT");
    expect(result.invalidRowCount).toBe(1);
    expect(result.errors.map((issue) => issue.message)).toContain("Missing amount.");
    expect(result.warnings.map((issue) => issue.message)).toContain("1 CAMT entry is missing CdtDbtInd; amount direction could not be inferred.");
    expect(JSON.stringify(result.warnings)).not.toContain("<Document>");
  });

  it("returns safe unsupported-format errors without echoing raw text", () => {
    const result = parseStatementImportText("private-looking raw statement body");

    expect(result.format).toBe("UNKNOWN");
    expect(result.invalidRowCount).toBe(1);
    expect(result.errors[0]?.message).toBe("Statement format could not be detected. Use CSV, JSON, OFX, CAMT XML, or MT940 manual exports.");
    expect(JSON.stringify(result.errors)).not.toContain("private-looking raw statement body");
  });

  it("flags malformed dates, malformed amounts, conflicting debit and credit, and currency mismatch", () => {
    const result = parseStatementImportText(
      "date,description,debit,credit,currency\nbad-date,Fee,1.00,2.00,USD\n2026-05-14,,abc,0.00,SAR",
      { accountCurrency: "SAR" },
    );

    expect(result.invalidRowCount).toBe(2);
    expect(result.errors.map((issue) => issue.message)).toEqual(
      expect.arrayContaining(["Invalid date.", "Both debit and credit are populated.", "Invalid debit amount.", "Missing amount."]),
    );
    expect(result.warnings.map((issue) => issue.message)).toContain("Currency USD differs from this bank account currency SAR.");
  });

  it("validates statement upload file size and type", () => {
    expect(validateStatementImportFile({ name: "statement.csv", size: 100, type: "text/csv" })).toBeNull();
    expect(
      validateStatementImportFile({
        name: "statement.xlsx",
        size: 100,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    ).toBeNull();
    expect(validateStatementImportFile({ name: "statement.ofx", size: 100, type: "application/octet-stream" })).toBeNull();
    expect(validateStatementImportFile({ name: "statement.xml", size: 100, type: "application/xml" })).toBeNull();
    expect(validateStatementImportFile({ name: "statement.mt940", size: 100, type: "text/plain" })).toBeNull();
    expect(validateStatementImportFile({ name: "statement.pdf", size: 100, type: "application/pdf" })).toMatch(/CSV, XLSX, JSON, OFX, CAMT XML, or MT940/);
    expect(validateStatementImportFile({ name: "statement.csv", size: 1024 * 1024 + 1, type: "text/csv" })).toMatch(/too large/);
  });

  it("builds a deterministic canonical CSV template", () => {
    const template = buildStatementImportTemplateCsv();
    const lines = template.split(/\r?\n/);

    expect(lines[0]).toBe(STATEMENT_IMPORT_TEMPLATE_COLUMNS.join(","));
    expect(lines).toHaveLength(3);
    expect(template).toContain("Customer receipt");
    expect(template).toContain("Bank fee");
    expect(template).toContain("SAR");
  });

  it("computes reconciliation status from difference and unmatched count", () => {
    expect(
      reconciliationDifferenceStatus({
        statusSuggestion: "NEEDS_REVIEW",
        difference: "0.0000",
        totals: { unmatched: { count: 0, total: "0.0000" } },
      } as never),
    ).toBe("RECONCILED");
    expect(
      reconciliationDifferenceStatus({
        statusSuggestion: "NEEDS_REVIEW",
        difference: "5.0000",
        totals: { unmatched: { count: 0, total: "0.0000" } },
      } as never),
    ).toBe("NEEDS_REVIEW");
  });

  it("formats reconciliation close and lock helpers", () => {
    expect(bankReconciliationStatusLabel("CLOSED")).toBe("Closed");
    expect(bankReconciliationStatusLabel("PENDING_APPROVAL")).toBe("Pending approval");
    expect(bankReconciliationStatusBadgeClass("DRAFT")).toContain("amber");
    expect(submitBlockedMessage({ status: "DRAFT", difference: "5.0000", unmatchedTransactionCount: 0 })).toBe(
      "Cannot submit reconciliation while difference is not zero.",
    );
    expect(submitBlockedMessage({ status: "DRAFT", difference: "0.0000", unmatchedTransactionCount: 1 })).toBe(
      "Cannot submit reconciliation with unmatched statement transactions.",
    );
    expect(closeBlockedMessage({ status: "DRAFT", difference: "0.0000", unmatchedTransactionCount: 0 })).toBe(
      "Reconciliation must be approved before it can be closed.",
    );
    expect(closeBlockedMessage({ status: "APPROVED", difference: "5.0000", unmatchedTransactionCount: 0 })).toBe(
      "Cannot close reconciliation while difference is not zero.",
    );
    expect(closeBlockedMessage({ status: "APPROVED", difference: "0.0000", unmatchedTransactionCount: 1 })).toBe(
      "Cannot close reconciliation with unmatched statement transactions.",
    );
    expect(closeBlockedMessage({ status: "APPROVED", difference: "0.0000", unmatchedTransactionCount: 0 })).toBeNull();
    expect(reconciliationActionBlockedMessage({ status: "PENDING_APPROVAL", difference: "0.0000" }, "approve")).toBeNull();
    expect(closedThroughDateLabel({ closedThroughDate: "2026-05-31T23:59:59.999Z" })).toBe("2026-05-31");
    expect(
      lockedStatementTransactionWarning({
        reconciliationItems: [
          {
            id: "item-1",
            reconciliationId: "rec-1",
            reconciliation: {
              id: "rec-1",
              reconciliationNumber: "REC-000001",
              status: "CLOSED",
              periodStart: "2026-05-01",
              periodEnd: "2026-05-31",
              closedAt: "2026-05-31",
            },
          },
        ],
      }),
    ).toBe("Statement transaction belongs to closed reconciliation REC-000001.");
  });

  it("formats import preview and review timeline helpers", () => {
    expect(
      statementImportPreviewSummary({
        rowCount: 3,
        validRows: [{ rowNumber: 1 }] as never,
        invalidRows: [{ rowNumber: 2 }] as never,
        totalCredits: "10.0000",
        totalDebits: "2.0000",
      }),
    ).toBe("1 valid / 1 invalid of 3 rows. Credits 10.0000, debits 2.0000.");
    expect(reviewEventLabel({ action: "APPROVE", fromStatus: "PENDING_APPROVAL", toStatus: "APPROVED" })).toBe(
      "Approve: Pending approval to Approved",
    );
  });
});
