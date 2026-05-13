import {
  bankAccountOptionLabel,
  bankAccountStatusLabel,
  bankTransactionSourceLabel,
  bankTransferStatusLabel,
  bankAccountTypeLabel,
  canArchiveBankAccount,
  canPostOpeningBalance,
  canReactivateBankAccount,
  canVoidBankTransfer,
  hasPostedOpeningBalance,
  runningBalanceAfter,
  validateBankTransferInput,
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

  it("formats bank transfer status and validates transfer input", () => {
    expect(bankTransferStatusLabel("POSTED")).toBe("Posted");
    expect(canVoidBankTransfer("POSTED")).toBe(true);
    expect(canVoidBankTransfer("VOIDED")).toBe(false);
    expect(validateBankTransferInput({ fromBankAccountProfileId: "a", toBankAccountProfileId: "a", amount: "10" })).toBe(
      "Source and destination bank accounts must be different.",
    );
    expect(validateBankTransferInput({ fromBankAccountProfileId: "a", toBankAccountProfileId: "b", amount: "0" })).toBe(
      "Transfer amount must be greater than zero.",
    );
    expect(validateBankTransferInput({ fromBankAccountProfileId: "a", toBankAccountProfileId: "b", amount: "10" })).toBeNull();
  });

  it("checks opening-balance posting state", () => {
    expect(
      canPostOpeningBalance({
        status: "ACTIVE",
        openingBalance: "100.0000",
        openingBalanceDate: "2026-05-01T00:00:00.000Z",
        openingBalanceJournalEntryId: null,
        openingBalancePostedAt: null,
      }),
    ).toBe(true);
    expect(
      hasPostedOpeningBalance({
        openingBalanceJournalEntryId: "journal-1",
        openingBalancePostedAt: "2026-05-01T00:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("labels bank transaction sources", () => {
    expect(bankTransactionSourceLabel({ sourceType: "BANK_TRANSFER", sourceNumber: "TRF-000001" })).toBe(
      "Bank transfer TRF-000001",
    );
    expect(bankTransactionSourceLabel({ sourceType: "BANK_ACCOUNT_OPENING_BALANCE", sourceNumber: "OPENING-112" })).toBe(
      "Opening balance OPENING-112",
    );
  });
});
