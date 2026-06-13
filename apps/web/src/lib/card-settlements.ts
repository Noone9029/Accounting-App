import type { CardSettlementStatus, CardSettlementType } from "./types";

export function cardSettlementTypeLabel(type: CardSettlementType): string {
  switch (type) {
    case "CREDIT_CARD_PAYDOWN":
      return "Credit card paydown";
    case "CREDIT_CARD_CREDIT":
      return "Credit card credit/refund";
    case "PREPAID_CARD_TOP_UP":
      return "Prepaid card top-up";
  }
}

export function cardSettlementStatusLabel(status: CardSettlementStatus): string {
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

export function cardSettlementStatusBadgeClass(status: CardSettlementStatus): string {
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

export function canPostCardSettlement(status: CardSettlementStatus): boolean {
  return status === "DRAFT";
}

export function canMatchCardSettlement(status: CardSettlementStatus): boolean {
  return status === "POSTED";
}

export function canVoidCardSettlement(status: CardSettlementStatus): boolean {
  return status === "DRAFT" || status === "POSTED";
}

export function validateCardSettlementInput(input: {
  settlementType: CardSettlementType;
  fundingBankAccountProfileId?: string;
  cardAccountProfileId: string;
  amount: string;
  currency: string;
}): string | null {
  if (!input.settlementType) {
    return "Select a settlement type.";
  }
  if ((input.settlementType === "CREDIT_CARD_PAYDOWN" || input.settlementType === "PREPAID_CARD_TOP_UP") && !input.fundingBankAccountProfileId) {
    return "Select the funding bank account.";
  }
  if (!input.cardAccountProfileId) {
    return "Select the card or prepaid account.";
  }
  if (input.fundingBankAccountProfileId && input.fundingBankAccountProfileId === input.cardAccountProfileId) {
    return "Funding account and card account must be different.";
  }
  if (!Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0) {
    return "Settlement amount must be greater than zero.";
  }
  if (!/^[A-Z]{3}$/.test(input.currency.trim().toUpperCase())) {
    return "Currency must be a three-letter ISO code.";
  }
  return null;
}
