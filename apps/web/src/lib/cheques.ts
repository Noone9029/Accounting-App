import type { ChequeInstrumentStatus, ChequeInstrumentType } from "./types";

export function chequeTypeLabel(type: ChequeInstrumentType): string {
  return type === "RECEIVED" ? "Received cheque" : "Issued cheque";
}

export function chequeStatusLabel(status: ChequeInstrumentStatus): string {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function chequeStatusBadgeClass(status: ChequeInstrumentStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700";
    case "RECEIVED":
    case "ISSUED":
      return "bg-blue-50 text-blue-700";
    case "DEPOSITED":
      return "bg-amber-50 text-amber-700";
    case "CLEARED":
      return "bg-emerald-50 text-emerald-700";
    case "BOUNCED":
      return "bg-orange-50 text-orange-700";
    case "VOIDED":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function canOpenCheque(status: ChequeInstrumentStatus): boolean {
  return status === "DRAFT";
}

export function canDepositCheque(type: ChequeInstrumentType, status: ChequeInstrumentStatus): boolean {
  return type === "RECEIVED" && status === "RECEIVED";
}

export function canMatchCheque(status: ChequeInstrumentStatus): boolean {
  return status === "RECEIVED" || status === "ISSUED" || status === "DEPOSITED";
}

export function canClearCheque(status: ChequeInstrumentStatus): boolean {
  return status === "RECEIVED" || status === "ISSUED" || status === "DEPOSITED";
}

export function canBounceCheque(status: ChequeInstrumentStatus): boolean {
  return status === "RECEIVED" || status === "ISSUED" || status === "DEPOSITED";
}

export function canVoidCheque(status: ChequeInstrumentStatus): boolean {
  return status !== "VOIDED";
}

export function validateChequeInput(input: {
  chequeNumber: string;
  counterpartyName: string;
  amount: string;
  currency: string;
  chequeType: ChequeInstrumentType;
  issueDate?: string;
  receivedDate?: string;
}): string | null {
  if (!input.chequeNumber.trim()) {
    return "Cheque number is required.";
  }
  if (!input.counterpartyName.trim()) {
    return "Counterparty name is required.";
  }
  if (!input.amount || Number(input.amount) <= 0) {
    return "Cheque amount must be greater than zero.";
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) {
    return "Currency must be a three-letter ISO code.";
  }
  if (input.chequeType === "ISSUED" && !input.issueDate) {
    return "Issued cheques require an issue date.";
  }
  if (input.chequeType === "RECEIVED" && !input.receivedDate && !input.issueDate) {
    return "Received cheques require a received date or issue date.";
  }
  return null;
}
