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
  createdByUserId: string | null;
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
  status: "READY" | "BLOCKED";
  baseCurrency: string;
  supportedCurrencyCodes: string[];
  manualRateEntryEnabled: boolean;
  liveRateProviderEnabled: boolean;
  providerState: "DISABLED";
  accountConfigurationComplete: boolean;
  controlAccountsComplete: boolean;
  foreignDocumentPostingEnabled: boolean;
  fxRevaluationEnabled: boolean;
  blockers: string[];
}

export type FxRevaluationStatus = "DRAFT" | "REVIEWED" | "POSTED" | "REVERSED" | "FAILED";
export type FxMonetarySourceType = "CUSTOMER_RECEIVABLE" | "SUPPLIER_PAYABLE";

export interface FxRevaluationLine {
  id: string;
  sourceType: FxMonetarySourceType;
  salesInvoiceId: string | null;
  purchaseBillId: string | null;
  counterpartyId: string | null;
  currencyCode: string;
  baseCurrencyCode: string;
  openTransactionAmount: string;
  sourceBaseOpenAmount: string;
  carryingBaseAmount: string;
  closingRate: string;
  revaluedBaseAmount: string;
  unrealizedGainAmount: string;
  unrealizedLossAmount: string;
  rateSnapshotId: string;
  salesInvoice: { id: string; invoiceNumber: string } | null;
  purchaseBill: { id: string; billNumber: string } | null;
  counterparty: { id: string; name: string; displayName: string | null } | null;
  rateSnapshot: Pick<CurrencyRateSnapshot, "id" | "rate" | "rateDate" | "source" | "sourceReference">;
}

export interface FxRevaluationRun {
  id: string;
  organizationId: string;
  revaluationDate: string;
  rateDate: string;
  status: FxRevaluationStatus;
  idempotencyKey: string;
  reviewIdempotencyKey: string | null;
  postIdempotencyKey: string | null;
  reversalIdempotencyKey: string | null;
  reviewedAt: string | null;
  postedAt: string | null;
  reversedAt: string | null;
  postedJournalEntry: { id: string; entryNumber: string; status: string } | null;
  reversalJournalEntry: { id: string; entryNumber: string; status: string } | null;
  lines: FxRevaluationLine[];
  _count?: { lines: number };
}

export interface FxRevaluationListResponse {
  data: FxRevaluationRun[];
  pagination: { page: number; limit: number; hasMore: boolean };
}

export interface PreviewFxRevaluationInput {
  revaluationDate: string;
  rateDate: string;
  rates: Array<{ currencyCode: string; rateSnapshotId: string }>;
  idempotencyKey: string;
}

export interface FxRevaluationContext {
  catalog: FxCurrencyCatalog;
  readiness: FxReadiness;
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

export function listFxRevaluations(query: { status?: FxRevaluationStatus; page?: number; limit?: number } = {}) {
  const search = new URLSearchParams();
  if (query.status) search.set("status", query.status);
  if (query.page) search.set("page", String(query.page));
  if (query.limit) search.set("limit", String(query.limit));
  const suffix = search.size ? `?${search.toString()}` : "";
  return apiRequest<FxRevaluationListResponse>(`/fx/revaluations${suffix}`);
}

export function getFxRevaluationContext() {
  return apiRequest<FxRevaluationContext>("/fx/revaluations/context");
}

export function getFxRevaluation(id: string) {
  return apiRequest<FxRevaluationRun>(`/fx/revaluations/${id}`);
}

export function previewFxRevaluation(body: PreviewFxRevaluationInput) {
  return apiRequest<FxRevaluationRun>("/fx/revaluations/preview", { method: "POST", body });
}

function mutateFxRevaluation(id: string, action: "review" | "post" | "reverse", idempotencyKey: string) {
  return apiRequest<FxRevaluationRun>(`/fx/revaluations/${id}/${action}`, { method: "POST", body: { idempotencyKey } });
}

export function reviewFxRevaluation(id: string, idempotencyKey: string) {
  return mutateFxRevaluation(id, "review", idempotencyKey);
}

export function postFxRevaluation(id: string, idempotencyKey: string) {
  return mutateFxRevaluation(id, "post", idempotencyKey);
}

export function reverseFxRevaluation(id: string, idempotencyKey: string) {
  return mutateFxRevaluation(id, "reverse", idempotencyKey);
}

export function ratePairLabel(transactionCurrency: string, baseCurrency: string) {
  return `${transactionCurrency}/${baseCurrency}`;
}

export function formatFxRate(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return `${whole}.${fraction.padEnd(8, "0").slice(0, 8)}`;
}
