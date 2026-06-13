import type { BankDepositBatchLineSourceType, BankDepositBatchStatus } from "./types";

export function bankDepositStatusLabel(status: BankDepositBatchStatus): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "POSTED":
      return "Posted";
    case "MATCHED":
      return "Matched";
    case "VOIDED":
      return "Voided";
  }
}

export function bankDepositStatusBadgeClass(status: BankDepositBatchStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-amber-50 text-amber-700";
    case "POSTED":
      return "bg-sky-50 text-sky-700";
    case "MATCHED":
      return "bg-emerald-50 text-emerald-700";
    case "VOIDED":
      return "bg-slate-100 text-slate-600";
  }
}

export function bankDepositSourceTypeLabel(sourceType: BankDepositBatchLineSourceType): string {
  switch (sourceType) {
    case "CUSTOMER_PAYMENT":
      return "Customer payment";
    case "RECEIPT":
      return "Receipt";
    case "MANUAL_CASH_RECEIPT":
      return "Manual cash receipt";
    case "CHEQUE_PLACEHOLDER":
      return "Cheque placeholder";
    case "OTHER_CLEARING_ITEM":
      return "Other clearing item";
  }
}

export function canPostBankDeposit(status: BankDepositBatchStatus, totalAmount: string, lineCount: number): boolean {
  return status === "DRAFT" && lineCount > 0 && Number(totalAmount) > 0;
}

export function canMatchBankDeposit(status: BankDepositBatchStatus): boolean {
  return status === "POSTED";
}

export function canVoidBankDeposit(status: BankDepositBatchStatus): boolean {
  return status === "DRAFT" || status === "POSTED";
}

export function validateBankDepositLineInput(input: { amount: string; currency: string; sourceType: BankDepositBatchLineSourceType; sourceId?: string }) {
  if (!input.sourceType) {
    return "Select a deposit line source type.";
  }
  if (input.sourceType === "CUSTOMER_PAYMENT" && !input.sourceId) {
    return "Select a customer payment source.";
  }
  if (!Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0) {
    return "Deposit line amount must be greater than zero.";
  }
  if (!/^[A-Z]{3}$/.test(input.currency.trim().toUpperCase())) {
    return "Currency must be a three-letter ISO code.";
  }
  return null;
}
