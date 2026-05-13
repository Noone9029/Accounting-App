import {
  bankAccountOptionLabel,
  bankAccountStatusLabel,
  bankAccountTypeLabel,
  canArchiveBankAccount,
  canReactivateBankAccount,
  runningBalanceAfter,
} from "./bank-accounts";

describe("bank account helpers", () => {
  it("formats bank account type and status labels", () => {
    expect(bankAccountTypeLabel("BANK")).toBe("Bank");
    expect(bankAccountTypeLabel("CASH")).toBe("Cash");
    expect(bankAccountStatusLabel("ACTIVE")).toBe("Active");
    expect(bankAccountStatusLabel("ARCHIVED")).toBe("Archived");
  });

  it("checks archive/reactivate actions from status", () => {
    expect(canArchiveBankAccount("ACTIVE")).toBe(true);
    expect(canArchiveBankAccount("ARCHIVED")).toBe(false);
    expect(canReactivateBankAccount("ARCHIVED")).toBe(true);
    expect(canReactivateBankAccount("ACTIVE")).toBe(false);
  });

  it("uses profile display names in paid-through dropdown labels", () => {
    const account = { id: "account-1", code: "112", name: "Bank Account" };

    expect(bankAccountOptionLabel(account, [{ accountId: "account-1", displayName: "Operating Bank" }])).toBe(
      "Operating Bank - 112 Bank Account",
    );
    expect(bankAccountOptionLabel(account, [])).toBe("112 Bank Account");
  });

  it("reads the latest running balance safely", () => {
    expect(runningBalanceAfter([{ runningBalance: "10.0000" }, { runningBalance: "7.5000" }])).toBe("7.5000");
    expect(runningBalanceAfter([])).toBe("0.0000");
  });
});
