import {
  canVoidCashExpense,
  cashExpensePaidThroughLabel,
  cashExpensePdfDataPath,
  cashExpenseStatusBadgeClass,
  cashExpenseStatusLabel,
} from "./cash-expenses";

describe("cash expense helpers", () => {
  it("labels cash expense statuses", () => {
    expect(cashExpenseStatusLabel("POSTED")).toBe("Posted");
    expect(cashExpenseStatusLabel("VOIDED")).toBe("Voided");
    expect(cashExpenseStatusLabel(null)).toBe("Not created");
  });

  it("returns badge classes and void availability", () => {
    expect(cashExpenseStatusBadgeClass("POSTED")).toContain("emerald");
    expect(cashExpenseStatusBadgeClass("VOIDED")).toContain("rose");
    expect(canVoidCashExpense("POSTED")).toBe(true);
    expect(canVoidCashExpense("DRAFT")).toBe(false);
  });

  it("formats paid-through labels and API paths", () => {
    expect(cashExpensePaidThroughLabel({ paidThroughAccount: { id: "bank", code: "112", name: "Bank Account" } })).toBe(
      "112 Bank Account",
    );
    expect(cashExpensePaidThroughLabel({ paidThroughAccount: undefined })).toBe("-");
    expect(cashExpensePdfDataPath("expense 1")).toBe("/cash-expenses/expense%201/pdf-data");
  });
});
