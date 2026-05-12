import type { CashExpense, CashExpenseStatus } from "./types";

export function cashExpenseStatusLabel(status: CashExpenseStatus | undefined | null): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "POSTED":
      return "Posted";
    case "VOIDED":
      return "Voided";
    default:
      return "Not created";
  }
}

export function cashExpenseStatusBadgeClass(status: CashExpenseStatus | undefined | null): string {
  switch (status) {
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";
    case "VOIDED":
      return "bg-rose-50 text-rosewood";
    case "DRAFT":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function canVoidCashExpense(status: CashExpenseStatus | undefined | null): boolean {
  return status === "POSTED";
}

export function cashExpensePaidThroughLabel(expense: Pick<CashExpense, "paidThroughAccount">): string {
  const account = expense.paidThroughAccount;
  return account ? `${account.code} ${account.name}` : "-";
}

export function cashExpensePdfDataPath(expenseId: string): string {
  return `/cash-expenses/${encodeURIComponent(expenseId)}/pdf-data`;
}
