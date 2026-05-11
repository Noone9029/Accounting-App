import { creditNotePdfDataPath, creditNoteStatusBadgeClass, creditNoteStatusLabel, salesInvoiceCreditNotesPath } from "./credit-notes";

describe("credit note helpers", () => {
  it("formats status labels", () => {
    expect(creditNoteStatusLabel("DRAFT")).toBe("Draft");
    expect(creditNoteStatusLabel("FINALIZED")).toBe("Finalized");
    expect(creditNoteStatusLabel("VOIDED")).toBe("Voided");
    expect(creditNoteStatusLabel(undefined)).toBe("Not created");
  });

  it("returns stable badge classes", () => {
    expect(creditNoteStatusBadgeClass("FINALIZED")).toContain("emerald");
    expect(creditNoteStatusBadgeClass("VOIDED")).toContain("rosewood");
    expect(creditNoteStatusBadgeClass("DRAFT")).toContain("amber");
  });

  it("builds credit note URLs safely", () => {
    expect(creditNotePdfDataPath("cn 1")).toBe("/credit-notes/cn%201/pdf-data");
    expect(salesInvoiceCreditNotesPath("inv 1")).toBe("/sales-invoices/inv%201/credit-notes");
  });
});
