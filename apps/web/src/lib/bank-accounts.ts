import type { Account, BankAccountSummary, BankAccountTransaction, BankAccountType } from "./types";

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
