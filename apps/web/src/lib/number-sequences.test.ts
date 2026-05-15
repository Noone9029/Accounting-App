import {
  buildNumberSequencePayload,
  canEditNumberSequences,
  formatSequenceExample,
  numberSequenceScopeLabel,
  validateNumberSequenceForm,
} from "./number-sequences";

describe("number sequence helpers", () => {
  it("labels known and fallback scopes", () => {
    expect(numberSequenceScopeLabel("INVOICE")).toBe("Sales Invoice");
    expect(numberSequenceScopeLabel("CUSTOM_SCOPE")).toBe("Custom Scope");
  });

  it("formats next-number examples", () => {
    expect(formatSequenceExample("INV-", 123, 6)).toBe("INV-000123");
    expect(formatSequenceExample("PO/", 9, 3)).toBe("PO/009");
  });

  it("validates prefix, padding, and duplicate-prone lowering", () => {
    expect(validateNumberSequenceForm({ prefix: "INV-", nextNumber: "10", padding: "6" }, 10)).toEqual([]);
    expect(validateNumberSequenceForm({ prefix: "inv-", nextNumber: "9", padding: "2" }, 10)).toEqual([
      "Prefix can only contain uppercase letters, numbers, dash, and slash.",
      "Next number cannot be lowered because that could create duplicate document numbers.",
      "Padding must be between 3 and 10.",
    ]);
  });

  it("builds typed update payloads and gates edit visibility", () => {
    expect(buildNumberSequencePayload({ prefix: " BILL- ", nextNumber: "45", padding: "6" })).toEqual({
      prefix: "BILL-",
      nextNumber: 45,
      padding: 6,
    });
    expect(canEditNumberSequences(true)).toBe(true);
    expect(canEditNumberSequences(false)).toBe(false);
  });
});
