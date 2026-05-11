import {
  creditNoteAllocationsPath,
  creditNoteAppliedAmount,
  creditNoteActiveAppliedAmount,
  creditNoteAllocationStatusBadgeClass,
  creditNoteAllocationStatusLabel,
  creditNotePdfDataPath,
  creditNoteStatusBadgeClass,
  creditNoteStatusLabel,
  canReverseCreditNoteAllocation,
  salesInvoiceCreditNoteAllocationsPath,
  salesInvoiceCreditNotesPath,
  validateCreditNoteAllocation,
} from "./credit-notes";

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
    expect(creditNoteAllocationsPath("cn 1")).toBe("/credit-notes/cn%201/allocations");
    expect(salesInvoiceCreditNotesPath("inv 1")).toBe("/sales-invoices/inv%201/credit-notes");
    expect(salesInvoiceCreditNoteAllocationsPath("inv 1")).toBe("/sales-invoices/inv%201/credit-note-allocations");
  });

  it("calculates applied credit note amount", () => {
    expect(creditNoteAppliedAmount("100.0000", "40.0000")).toBe("60.0000");
    expect(creditNoteAppliedAmount("10.0000", "15.0000")).toBe("0.0000");
  });

  it("validates credit note allocation amounts", () => {
    expect(validateCreditNoteAllocation("0.0000", "100.0000", "100.0000")).toContain("greater than zero");
    expect(validateCreditNoteAllocation("120.0000", "100.0000", "200.0000")).toContain("unapplied");
    expect(validateCreditNoteAllocation("120.0000", "200.0000", "100.0000")).toContain("balance due");
    expect(validateCreditNoteAllocation("50.0000", "100.0000", "80.0000")).toBeNull();
  });

  it("labels credit note allocation reversal state", () => {
    expect(creditNoteAllocationStatusLabel({ reversedAt: null })).toBe("Active");
    expect(creditNoteAllocationStatusLabel({ reversedAt: "2026-05-12T00:00:00.000Z" })).toBe("Reversed");
    expect(creditNoteAllocationStatusBadgeClass({ reversedAt: null })).toContain("emerald");
    expect(creditNoteAllocationStatusBadgeClass({ reversedAt: "2026-05-12T00:00:00.000Z" })).toContain("slate");
    expect(canReverseCreditNoteAllocation({ reversedAt: null })).toBe(true);
    expect(canReverseCreditNoteAllocation({ reversedAt: "2026-05-12T00:00:00.000Z" })).toBe(false);
  });

  it("calculates active applied amount from unreversed allocations", () => {
    expect(
      creditNoteActiveAppliedAmount([
        { amountApplied: "10.0000", reversedAt: null },
        { amountApplied: "5.0000", reversedAt: "2026-05-12T00:00:00.000Z" },
        { amountApplied: "2.5000", reversedAt: null },
      ]),
    ).toBe("12.5000");
  });
});
