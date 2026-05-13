import { documentTypeLabel, generatedDocumentStatusLabel } from "./documents";

describe("document helpers", () => {
  it("labels report document types clearly", () => {
    expect(documentTypeLabel("REPORT_GENERAL_LEDGER")).toBe("General Ledger Report");
    expect(documentTypeLabel("REPORT_TRIAL_BALANCE")).toBe("Trial Balance Report");
    expect(documentTypeLabel("REPORT_PROFIT_AND_LOSS")).toBe("Profit & Loss Report");
    expect(documentTypeLabel("BANK_RECONCILIATION_REPORT")).toBe("Bank Reconciliation Report");
  });

  it("labels generated document statuses", () => {
    expect(generatedDocumentStatusLabel("GENERATED")).toBe("Generated");
    expect(generatedDocumentStatusLabel("SUPERSEDED")).toBe("Superseded");
  });
});
