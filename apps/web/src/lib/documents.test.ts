import { documentSourceTypeLabel, documentTypeLabel, generatedDocumentStatusBadgeClass, generatedDocumentStatusLabel } from "./documents";

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
    expect(generatedDocumentStatusBadgeClass("FAILED")).toContain("rose");
  });

  it("formats source type labels for archive rows", () => {
    expect(documentSourceTypeLabel("CustomerStatement")).toBe("Customer Statement");
    expect(documentSourceTypeLabel("PURCHASE_DEBIT_NOTE")).toBe("Purchase Debit Note");
  });
});
