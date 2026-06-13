import { apiRequest } from "@/lib/api";
import type {
  BankDepositBatch,
  BankingAccountingPreflight,
  BankingClearingAccountConfigInput,
  BankingClearingAccountConfigResponse,
  BankingClearingAccountConfigValidation,
  CardSettlement,
  ChequeInstrument,
} from "@/lib/types";

export function getBankingClearingConfig() {
  return apiRequest<BankingClearingAccountConfigResponse>("/banking-accounting/clearing-config");
}

export function saveBankingClearingConfig(body: BankingClearingAccountConfigInput) {
  return apiRequest<BankingClearingAccountConfigResponse>("/banking-accounting/clearing-config", { method: "PUT", body });
}

export function validateBankingClearingConfig(body: BankingClearingAccountConfigInput) {
  return apiRequest<BankingClearingAccountConfigValidation>("/banking-accounting/clearing-config/validate", { method: "POST", body });
}

export function getDepositAccountingPreflight(id: string) {
  return apiRequest<BankingAccountingPreflight>(`/banking-accounting/bank-deposits/${id}/preflight`);
}

export function postDepositJournal(id: string) {
  return apiRequest<{ record: BankDepositBatch; journalEntry: { id: string; entryNumber: string } }>(`/banking-accounting/bank-deposits/${id}/post-journal`, {
    method: "POST",
  });
}

export function getCardSettlementAccountingPreflight(id: string) {
  return apiRequest<BankingAccountingPreflight>(`/banking-accounting/card-settlements/${id}/preflight`);
}

export function postCardSettlementJournal(id: string) {
  return apiRequest<{ record: CardSettlement; journalEntry: { id: string; entryNumber: string } }>(
    `/banking-accounting/card-settlements/${id}/post-journal`,
    { method: "POST" },
  );
}

export function getChequeAccountingPreflight(id: string) {
  return apiRequest<BankingAccountingPreflight>(`/banking-accounting/cheques/${id}/preflight`);
}

export function postChequeJournal(id: string) {
  return apiRequest<{ record: ChequeInstrument; journalEntry: { id: string; entryNumber: string } }>(`/banking-accounting/cheques/${id}/post-journal`, {
    method: "POST",
  });
}

export function accountingPreflightLabel(status: BankingAccountingPreflight["status"]) {
  if (status === "READY") {
    return "Ready to post journal";
  }
  if (status === "POSTED") {
    return "Journal posted";
  }
  if (status === "OPERATIONAL_ONLY") {
    return "Operational-only";
  }
  return "Posting blocked";
}

export function accountingPreflightBadgeClass(status: BankingAccountingPreflight["status"]) {
  if (status === "READY") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "POSTED") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (status === "OPERATIONAL_ONLY") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-rose-200 bg-rose-50 text-rose-700";
}
