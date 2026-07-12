import { apiRequest } from "./api";

export type RecurringTransactionType = "SALES_INVOICE" | "PURCHASE_BILL" | "EXPENSE" | "MANUAL_JOURNAL";
export type RecurringTransactionStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
export type RecurringRunStatus = "PENDING" | "CLAIMED" | "GENERATED" | "BLOCKED" | "FAILED" | "SKIPPED";

export interface RecurringTemplateLine {
  id?: string;
  itemId?: string | null;
  accountId: string;
  taxRateId?: string | null;
  costCenterId?: string | null;
  projectId?: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  debit: string;
  credit: string;
  sortOrder: number;
  item?: { id: string; sku: string; name: string; status: string } | null;
  account?: { id: string; code: string; name: string; isActive?: boolean; allowPosting?: boolean } | null;
  taxRate?: { id: string; name: string; rate: string; isActive?: boolean } | null;
  costCenter?: { id: string; code: string; name: string; status?: string } | null;
  project?: { id: string; code: string; name: string; status?: string } | null;
}

export interface RecurringRun {
  id: string;
  templateId: string;
  templateVersion: number;
  scheduledFor: string;
  scheduledLocalDate: string;
  trigger: "MANUAL" | "SCHEDULED";
  status: RecurringRunStatus;
  attemptCount: number;
  failureCode?: string | null;
  failureMessageSafe?: string | null;
  generatedSalesInvoice?: { id: string; invoiceNumber: string; status: string } | null;
  generatedPurchaseBill?: { id: string; billNumber: string; status: string } | null;
  generatedJournalEntry?: { id: string; entryNumber: string; status: string } | null;
  generatedExpenseProposal?: { id: string; status: string } | null;
}

export interface RecurringTemplate {
  id: string;
  templateCode: string;
  transactionType: RecurringTransactionType;
  name: string;
  description?: string | null;
  status: RecurringTransactionStatus;
  timezone: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  interval: number;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  monthOfYear?: number | null;
  startDate: string;
  endDate?: string | null;
  nextRunAt: string;
  lastRunAt?: string | null;
  catchUpPolicy: "SKIP_MISSED" | "RUN_LATEST_ONLY" | "RUN_BOUNDED";
  templateVersion: number;
  currencyCode: string;
  exchangeRatePolicy: "BASE_CURRENCY_ONLY" | "FIXED_TEMPLATE_RATE" | "REQUIRE_RATE_AT_RUN" | "RATE_SNAPSHOT";
  fixedExchangeRate?: string | null;
  rateSnapshotId?: string | null;
  partyId?: string | null;
  branchId?: string | null;
  paidThroughAccountId?: string | null;
  paymentTermsDays: number;
  reference?: string | null;
  notes?: string | null;
  terms?: string | null;
  taxMode?: string | null;
  inventoryPostingMode?: string | null;
  total: string;
  party?: { id: string; name: string; displayName?: string | null } | null;
  branch?: { id: string; name: string; displayName?: string | null } | null;
  lines: RecurringTemplateLine[];
  runs: RecurringRun[];
}

export interface RecurringReadiness {
  status: "NOT_APPLICABLE" | "READY" | "NEEDS_ATTENTION";
  templateCount: number;
  activeTemplates: number;
  dueTemplates: number;
  failedRuns: number;
  blockedRuns: number;
  generatedDraftsAwaitingReview: number;
  schedulesMissingReferences: number;
  foreignTemplatesMissingRateEvidence: number;
  runsScheduledInsideLockedPeriods: number;
  blocksFiscalClose: false;
  asOf: string;
}

export interface RecurringPage<T> { items: T[]; page: number; limit: number; total: number; totalPages: number }

export function listRecurringTemplates(filters: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
  return apiRequest<RecurringPage<RecurringTemplate>>(`/recurring-transactions?${query.toString()}`);
}

export function getRecurringReadiness() { return apiRequest<RecurringReadiness>("/recurring-transactions/readiness"); }
export function getRecurringTemplate(id: string) { return apiRequest<RecurringTemplate>(`/recurring-transactions/${encodeURIComponent(id)}`); }
export function listRecurringRuns(id: string, page = 1) { return apiRequest<RecurringPage<RecurringRun>>(`/recurring-transactions/${encodeURIComponent(id)}/runs?page=${page}&limit=25`); }
export function runRecurringTemplate(id: string, idempotencyKey: string) {
  return apiRequest<RecurringRun>(`/recurring-transactions/${encodeURIComponent(id)}/run`, { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: {} });
}
export function transitionRecurringTemplate(id: string, action: "activate" | "pause" | "resume" | "archive") {
  return apiRequest<RecurringTemplate>(`/recurring-transactions/${encodeURIComponent(id)}/${action}`, { method: "POST", body: {} });
}
