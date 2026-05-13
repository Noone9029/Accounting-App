import type { Account, BankAccountSummary, BankAccountTransaction, BankAccountType, BankTransferStatus } from "./types";

export function bankAccountTypeLabel(type: BankAccountType): string {
  switch (type) {
    case "BANK":
      return "Bank";
    case "CASH":
      return "Cash";
    case "WALLET":
      return "Wallet";
    case "CARD":
      return "Card";
    case "OTHER":
      return "Other";
  }
}

export function bankAccountStatusLabel(status: BankAccountSummary["status"]): string {
  return status === "ACTIVE" ? "Active" : "Archived";
}

export function bankAccountStatusBadgeClass(status: BankAccountSummary["status"]): string {
  return status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600";
}

export function canArchiveBankAccount(status: BankAccountSummary["status"]): boolean {
  return status === "ACTIVE";
}

export function canReactivateBankAccount(status: BankAccountSummary["status"]): boolean {
  return status === "ARCHIVED";
}

export function bankAccountOptionLabel(
  account: Pick<Account, "id" | "code" | "name">,
  profiles: Array<Pick<BankAccountSummary, "accountId" | "displayName">> = [],
): string {
  const profile = profiles.find((candidate) => candidate.accountId === account.id);
  return profile ? `${profile.displayName} - ${account.code} ${account.name}` : `${account.code} ${account.name}`;
}

export function runningBalanceAfter(transactions: Array<Pick<BankAccountTransaction, "runningBalance">>): string {
  return transactions.at(-1)?.runningBalance ?? "0.0000";
}

export function bankTransferStatusLabel(status: BankTransferStatus): string {
  return status === "POSTED" ? "Posted" : "Voided";
}

export function bankTransferStatusBadgeClass(status: BankTransferStatus): string {
  return status === "POSTED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600";
}

export function canVoidBankTransfer(status: BankTransferStatus): boolean {
  return status === "POSTED";
}

export function hasPostedOpeningBalance(profile: Pick<BankAccountSummary, "openingBalanceJournalEntryId" | "openingBalancePostedAt">): boolean {
  return Boolean(profile.openingBalanceJournalEntryId || profile.openingBalancePostedAt);
}

export function canPostOpeningBalance(
  profile: Pick<BankAccountSummary, "status" | "openingBalance" | "openingBalanceDate" | "openingBalanceJournalEntryId" | "openingBalancePostedAt">,
): boolean {
  return (
    profile.status === "ACTIVE" &&
    !hasPostedOpeningBalance(profile) &&
    Boolean(profile.openingBalanceDate) &&
    Number(profile.openingBalance) !== 0
  );
}

export function validateBankTransferInput(input: {
  fromBankAccountProfileId: string;
  toBankAccountProfileId: string;
  amount: string;
}): string | null {
  if (!input.fromBankAccountProfileId) {
    return "Select the source bank account.";
  }
  if (!input.toBankAccountProfileId) {
    return "Select the destination bank account.";
  }
  if (input.fromBankAccountProfileId === input.toBankAccountProfileId) {
    return "Source and destination bank accounts must be different.";
  }
  if (!Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0) {
    return "Transfer amount must be greater than zero.";
  }
  return null;
}

export function bankTransactionSourceLabel(transaction: Pick<BankAccountTransaction, "sourceType" | "sourceNumber">): string {
  const sourceNumber = transaction.sourceNumber ? ` ${transaction.sourceNumber}` : "";
  switch (transaction.sourceType) {
    case "BANK_TRANSFER":
      return `Bank transfer${sourceNumber}`;
    case "VOID_BANK_TRANSFER":
      return `Void bank transfer${sourceNumber}`;
    case "BANK_ACCOUNT_OPENING_BALANCE":
      return `Opening balance${sourceNumber}`;
    case "CustomerPayment":
      return `Customer payment${sourceNumber}`;
    case "SupplierPayment":
      return `Supplier payment${sourceNumber}`;
    case "CashExpense":
      return `Cash expense${sourceNumber}`;
    case "CustomerRefund":
      return `Customer refund${sourceNumber}`;
    case "SupplierRefund":
      return `Supplier refund${sourceNumber}`;
    default:
      return transaction.sourceType.replace(/([a-z])([A-Z])/g, "$1 $2");
  }
}
