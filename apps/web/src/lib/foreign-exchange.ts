import { apiRequest } from "@/lib/api";
import type { Account } from "@/lib/types";

export interface FxCurrencyCatalog {
  baseCurrency: string;
  supportedCurrencies: Array<{ code: string; name: string }>;
  manualRateEntryEnabled: boolean;
  liveRateProviderEnabled: boolean;
  providerState: "DISABLED";
}

export interface CurrencyRateSnapshot {
  id: string;
  organizationId: string;
  transactionCurrency: string;
  baseCurrency: string;
  rate: string;
  rateDate: string;
  source: "MANUAL" | "IMPORT" | "SYSTEM_RATE_1" | "FUTURE_PROVIDER_DISABLED";
  sourceReference: string | null;
  createdAt: string;
}

export interface CurrencyRateListResponse {
  data: CurrencyRateSnapshot[];
  pagination: { page: number; limit: number; hasMore: boolean };
}

export interface CurrencyRateQuery {
  transactionCurrency?: string;
  rateDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateCurrencyRateInput {
  transactionCurrency: string;
  rate: string;
  rateDate: string;
  sourceReference?: string;
}

export type FxPostingAccount = Pick<Account, "id" | "code" | "name" | "type" | "isActive" | "allowPosting">;

export interface FxAccountConfigurationInput {
  realizedGainAccountId: string | null;
  realizedLossAccountId: string | null;
  unrealizedGainAccountId: string | null;
  unrealizedLossAccountId: string | null;
}

export interface FxAccountConfiguration extends FxAccountConfigurationInput {
  id: string;
  organizationId: string;
  realizedGainAccount: FxPostingAccount | null;
  realizedLossAccount: FxPostingAccount | null;
  unrealizedGainAccount: FxPostingAccount | null;
  unrealizedLossAccount: FxPostingAccount | null;
  createdAt: string;
  updatedAt: string;
}

export interface FxReadiness {
  status: "BLOCKED";
  baseCurrency: string;
  supportedCurrencyCodes: string[];
  manualRateEntryEnabled: boolean;
  liveRateProviderEnabled: boolean;
  providerState: "DISABLED";
  accountConfigurationComplete: boolean;
  foreignDocumentPostingEnabled: boolean;
  blockers: string[];
}

export function getFxCurrencies() {
  return apiRequest<FxCurrencyCatalog>("/fx/currencies");
}

export function listCurrencyRates(query: CurrencyRateQuery = {}) {
  const search = new URLSearchParams();
  if (query.transactionCurrency) search.set("transactionCurrency", query.transactionCurrency);
  if (query.rateDate) search.set("rateDate", query.rateDate);
  if (query.page) search.set("page", String(query.page));
  if (query.limit) search.set("limit", String(query.limit));
  const suffix = search.size ? `?${search.toString()}` : "";
  return apiRequest<CurrencyRateListResponse>(`/fx/rates${suffix}`);
}

export function getCurrencyRate(id: string) {
  return apiRequest<CurrencyRateSnapshot>(`/fx/rates/${id}`);
}

export function createCurrencyRate(body: CreateCurrencyRateInput) {
  return apiRequest<CurrencyRateSnapshot>("/fx/rates", { method: "POST", body });
}

export function getFxAccountConfiguration() {
  return apiRequest<FxAccountConfiguration | null>("/fx/account-configuration");
}

export function saveFxAccountConfiguration(body: FxAccountConfigurationInput) {
  return apiRequest<FxAccountConfiguration>("/fx/account-configuration", { method: "PUT", body });
}

export function getFxReadiness() {
  return apiRequest<FxReadiness>("/fx/readiness");
}

export function ratePairLabel(transactionCurrency: string, baseCurrency: string) {
  return `${transactionCurrency}/${baseCurrency}`;
}

export function formatFxRate(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return `${whole}.${fraction.padEnd(8, "0").slice(0, 8)}`;
}
