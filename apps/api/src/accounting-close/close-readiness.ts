import { createHash } from "node:crypto";

export type AccountingCloseSeverity = "BLOCKER" | "WARNING" | "INFORMATION" | "NOT_APPLICABLE";
export type AccountingCloseCheckStatus = "READY" | "OPEN" | "BLOCKED" | "NOT_APPLICABLE" | "ERROR";

export interface AccountingCloseCheck {
  key: string;
  title: string;
  severity: AccountingCloseSeverity;
  status: AccountingCloseCheckStatus;
  code: string;
  safeMessage: string;
  count: number;
  detailsHref?: string;
  sourceUpdatedAt?: string;
  canAcknowledge: boolean;
}

type FxReadiness = {
  status: "NOT_APPLICABLE" | "READY" | "BLOCKED";
  asOf: string;
  blockers: Array<{ code: string; count: number; message: string; actionHref: string }>;
  actions: Array<{ code: string; label: string; href: string }>;
  counts: Record<string, number>;
  sourceUpdatedAt?: string;
};

type RecurringReadiness = {
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
  blocksFiscalClose: boolean;
  asOf: string;
  sourceUpdatedAt?: string;
};

export type ManualJournalReadiness = {
  draftCount: number;
  sourceUpdatedAt?: string;
};

export type SalesInvoiceReadiness = {
  draftCount: number;
  sourceUpdatedAt?: string;
};

export type CreditNoteReadiness = {
  draftCount: number;
  sourceUpdatedAt?: string;
};

export type CustomerPaymentReadiness = {
  unappliedCount: number;
  sourceUpdatedAt?: string;
};

export type PurchaseBillReadiness = {
  draftCount: number;
  sourceUpdatedAt?: string;
};

export type PurchaseDebitNoteReadiness = {
  draftCount: number;
  sourceUpdatedAt?: string;
};

export type SupplierPaymentReadiness = {
  unappliedCount: number;
  sourceUpdatedAt?: string;
};

export type BankStatementReadiness = {
  unreconciledCount: number;
  sourceUpdatedAt?: string;
};

export type BankReconciliationReadiness = {
  incompleteCount: number;
  sourceUpdatedAt?: string;
};

export type DraftTreasuryReadiness = {
  draftDepositCount: number;
  depositUpdatedAt?: string;
  draftSettlementCount: number;
  settlementUpdatedAt?: string;
};

export type OpenChequeReadiness = {
  openCount: number;
  sourceUpdatedAt?: string;
};

export type InventoryAdjustmentReadiness = {
  draftCount: number;
  sourceUpdatedAt?: string;
};

export type InventoryVarianceProposalReadiness = {
  pendingCount: number;
  sourceUpdatedAt?: string;
};

export type ReportPackReadiness = {
  failedCount: number;
  sourceUpdatedAt?: string;
};

export type CashExpenseReadiness = {
  draftCount: number;
  sourceUpdatedAt?: string;
};

export type DocumentInboxReadiness = {
  reviewRequiredCount: number;
  reviewRequiredUpdatedAt?: string;
  extractionDisabledCount: number;
  extractionDisabledUpdatedAt?: string;
};

export function normalizeFxReadiness(readiness: FxReadiness): AccountingCloseCheck[] {
  if (readiness.status === "NOT_APPLICABLE") {
    return [{ ...check("fx.notApplicable", "Foreign exchange close readiness", "NOT_APPLICABLE", "NOT_APPLICABLE", "FX_NOT_APPLICABLE", "No foreign-currency close activity requires review for this period.", 0, "/fx-close", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
  }
  if (readiness.blockers.length === 0) {
    return [{ ...check("fx.ready", "Foreign exchange close readiness", "INFORMATION", "READY", "FX_READY", "Foreign-exchange close readiness is currently clear.", 0, "/fx-close", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
  }
  return readiness.blockers.map((blocker) => ({ ...check(`fx.${blocker.code}`, "Foreign exchange close readiness", "BLOCKER", "BLOCKED", blocker.code, blocker.message, blocker.count, blocker.actionHref, false), sourceUpdatedAt: readiness.sourceUpdatedAt }));
}

export function normalizeRecurringReadiness(readiness: RecurringReadiness): AccountingCloseCheck[] {
  if (readiness.status === "NOT_APPLICABLE") {
    return [check("recurring.notApplicable", "Recurring transaction readiness", "NOT_APPLICABLE", "NOT_APPLICABLE", "RECURRING_NOT_APPLICABLE", "No recurring transaction templates require close review.", 0, "/recurring-transactions", false)];
  }
  const issues: Array<[keyof Pick<RecurringReadiness, "dueTemplates" | "failedRuns" | "blockedRuns" | "generatedDraftsAwaitingReview" | "schedulesMissingReferences" | "foreignTemplatesMissingRateEvidence" | "runsScheduledInsideLockedPeriods">, string, string]> = [
    ["dueTemplates", "RECURRING_DUE", "Recurring templates are due to run or review."],
    ["failedRuns", "RECURRING_FAILED", "Recurring runs failed and require review."],
    ["blockedRuns", "RECURRING_BLOCKED", "Recurring runs are blocked and require review."],
    ["generatedDraftsAwaitingReview", "RECURRING_DRAFTS", "Generated recurring drafts await review."],
    ["schedulesMissingReferences", "RECURRING_REFERENCE", "Recurring templates have missing references."],
    ["foreignTemplatesMissingRateEvidence", "RECURRING_FX_EVIDENCE", "Recurring templates need FX rate evidence."],
    ["runsScheduledInsideLockedPeriods", "RECURRING_LOCKED_PERIOD", "Recurring runs are scheduled in closed or locked periods."],
  ];
  const result = issues.filter(([field]) => readiness[field] > 0).map(([field, code, message]) =>
    check(`recurring.${String(field)}`, "Recurring transaction readiness", readiness.blocksFiscalClose ? "BLOCKER" : "WARNING", readiness.blocksFiscalClose ? "BLOCKED" : "OPEN", code, message, readiness[field], "/recurring-transactions", !readiness.blocksFiscalClose),
  );
  return result.length
    ? result.map((item) => ({ ...item, sourceUpdatedAt: readiness.sourceUpdatedAt }))
    : [{ ...check("recurring.ready", "Recurring transaction readiness", "INFORMATION", "READY", "RECURRING_READY", "Recurring transaction readiness is currently clear.", 0, "/recurring-transactions", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
}

export function normalizeManualJournalReadiness(readiness: ManualJournalReadiness): AccountingCloseCheck[] {
  if (readiness.draftCount === 0) {
    return [{ ...check("journals.manualDrafts", "Manual draft journals", "INFORMATION", "READY", "NO_MANUAL_DRAFT_JOURNALS", "No manual draft journals are dated in this fiscal period.", 0, "/journal-entries", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
  }
  return [{ ...check("journals.manualDrafts", "Manual draft journals", "WARNING", "OPEN", "MANUAL_DRAFT_JOURNALS", "Manual draft journals dated in this fiscal period require accountant review.", readiness.draftCount, "/journal-entries", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
}

export function normalizeSalesInvoiceReadiness(readiness: SalesInvoiceReadiness): AccountingCloseCheck[] {
  if (readiness.draftCount === 0) {
    return [{ ...check("sales.draftInvoices", "Draft sales invoices", "INFORMATION", "READY", "NO_DRAFT_SALES_INVOICES", "No draft sales invoices are dated in this fiscal period.", 0, "/sales/invoices", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
  }
  return [{ ...check("sales.draftInvoices", "Draft sales invoices", "WARNING", "OPEN", "DRAFT_SALES_INVOICES", "Draft sales invoices dated in this fiscal period require accountant review.", readiness.draftCount, "/sales/invoices", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
}

export function normalizeCreditNoteReadiness(readiness: CreditNoteReadiness): AccountingCloseCheck[] {
  if (readiness.draftCount === 0) {
    return [{ ...check("sales.draftCreditNotes", "Draft credit notes", "INFORMATION", "READY", "NO_DRAFT_CREDIT_NOTES", "No draft credit notes are dated in this fiscal period.", 0, "/sales/credit-notes", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
  }
  return [{ ...check("sales.draftCreditNotes", "Draft credit notes", "WARNING", "OPEN", "DRAFT_CREDIT_NOTES", "Draft credit notes dated in this fiscal period require accountant review.", readiness.draftCount, "/sales/credit-notes", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
}

export function normalizeCustomerPaymentReadiness(readiness: CustomerPaymentReadiness): AccountingCloseCheck[] {
  if (readiness.unappliedCount === 0) {
    return [{ ...check("sales.unappliedCustomerPayments", "Unapplied customer payments", "INFORMATION", "READY", "NO_UNAPPLIED_CUSTOMER_PAYMENTS", "No posted customer payments with an unapplied balance are dated in this fiscal period.", 0, "/sales/customer-payments", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
  }
  return [{ ...check("sales.unappliedCustomerPayments", "Unapplied customer payments", "WARNING", "OPEN", "UNAPPLIED_CUSTOMER_PAYMENTS", "Posted customer payments with an unapplied balance in this fiscal period require accountant review.", readiness.unappliedCount, "/sales/customer-payments", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
}

export function normalizePurchaseBillReadiness(readiness: PurchaseBillReadiness): AccountingCloseCheck[] {
  if (readiness.draftCount === 0) {
    return [{ ...check("purchases.draftBills", "Draft purchase bills", "INFORMATION", "READY", "NO_DRAFT_PURCHASE_BILLS", "No draft purchase bills are dated in this fiscal period.", 0, "/purchases/bills", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
  }
  return [{ ...check("purchases.draftBills", "Draft purchase bills", "WARNING", "OPEN", "DRAFT_PURCHASE_BILLS", "Draft purchase bills dated in this fiscal period require accountant review.", readiness.draftCount, "/purchases/bills", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
}

export function normalizePurchaseDebitNoteReadiness(readiness: PurchaseDebitNoteReadiness): AccountingCloseCheck[] {
  if (readiness.draftCount === 0) {
    return [{ ...check("purchases.draftDebitNotes", "Draft purchase debit notes", "INFORMATION", "READY", "NO_DRAFT_PURCHASE_DEBIT_NOTES", "No draft purchase debit notes are dated in this fiscal period.", 0, "/purchases/debit-notes", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
  }
  return [{ ...check("purchases.draftDebitNotes", "Draft purchase debit notes", "WARNING", "OPEN", "DRAFT_PURCHASE_DEBIT_NOTES", "Draft purchase debit notes dated in this fiscal period require accountant review.", readiness.draftCount, "/purchases/debit-notes", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
}

export function normalizeSupplierPaymentReadiness(readiness: SupplierPaymentReadiness): AccountingCloseCheck[] {
  if (readiness.unappliedCount === 0) {
    return [{ ...check("purchases.unappliedSupplierPayments", "Unapplied supplier payments", "INFORMATION", "READY", "NO_UNAPPLIED_SUPPLIER_PAYMENTS", "No posted supplier payments with an unapplied balance are dated in this fiscal period.", 0, "/purchases/supplier-payments", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
  }
  return [{ ...check("purchases.unappliedSupplierPayments", "Unapplied supplier payments", "WARNING", "OPEN", "UNAPPLIED_SUPPLIER_PAYMENTS", "Posted supplier payments with an unapplied balance in this fiscal period require accountant review.", readiness.unappliedCount, "/purchases/supplier-payments", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
}

export function normalizeBankStatementReadiness(readiness: BankStatementReadiness): AccountingCloseCheck[] {
  if (readiness.unreconciledCount === 0) {
    return [{ ...check("banking.unreconciledStatementTransactions", "Unreconciled bank statement transactions", "INFORMATION", "READY", "NO_UNRECONCILED_BANK_STATEMENT_TRANSACTIONS", "No unmatched bank statement transactions are dated in or before this fiscal period.", 0, "/bank-accounts", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
  }
  return [{ ...check("banking.unreconciledStatementTransactions", "Unreconciled bank statement transactions", "WARNING", "OPEN", "UNRECONCILED_BANK_STATEMENT_TRANSACTIONS", "Unmatched bank statement transactions dated in or before this fiscal period require accountant review.", readiness.unreconciledCount, "/bank-accounts", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
}

export function normalizeBankReconciliationReadiness(readiness: BankReconciliationReadiness): AccountingCloseCheck[] {
  if (readiness.incompleteCount === 0) {
    return [{ ...check("banking.incompleteReconciliations", "Incomplete bank reconciliations", "INFORMATION", "READY", "NO_INCOMPLETE_BANK_RECONCILIATIONS", "No incomplete bank reconciliation sessions overlap this fiscal period.", 0, "/bank-accounts", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
  }
  return [{ ...check("banking.incompleteReconciliations", "Incomplete bank reconciliations", "WARNING", "OPEN", "INCOMPLETE_BANK_RECONCILIATIONS", "Incomplete bank reconciliation sessions overlapping this fiscal period require accountant review.", readiness.incompleteCount, "/bank-accounts", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
}

export function normalizeDraftTreasuryReadiness(readiness: DraftTreasuryReadiness): AccountingCloseCheck[] {
  const deposits = readiness.draftDepositCount === 0
    ? { ...check("banking.draftDepositBatches", "Draft bank deposit batches", "INFORMATION", "READY", "NO_DRAFT_BANK_DEPOSIT_BATCHES", "No draft bank deposit batches are dated in this fiscal period.", 0, "/bank-accounts", false), sourceUpdatedAt: readiness.depositUpdatedAt }
    : { ...check("banking.draftDepositBatches", "Draft bank deposit batches", "WARNING", "OPEN", "DRAFT_BANK_DEPOSIT_BATCHES", "Draft bank deposit batches dated in this fiscal period require accountant review.", readiness.draftDepositCount, "/bank-accounts", false), sourceUpdatedAt: readiness.depositUpdatedAt };
  const settlements = readiness.draftSettlementCount === 0
    ? { ...check("banking.draftCardSettlements", "Draft card settlements", "INFORMATION", "READY", "NO_DRAFT_CARD_SETTLEMENTS", "No draft card settlements are dated in this fiscal period.", 0, "/bank-accounts", false), sourceUpdatedAt: readiness.settlementUpdatedAt }
    : { ...check("banking.draftCardSettlements", "Draft card settlements", "WARNING", "OPEN", "DRAFT_CARD_SETTLEMENTS", "Draft card settlements dated in this fiscal period require accountant review.", readiness.draftSettlementCount, "/bank-accounts", false), sourceUpdatedAt: readiness.settlementUpdatedAt };
  return [deposits, settlements];
}

export function normalizeOpenChequeReadiness(readiness: OpenChequeReadiness): AccountingCloseCheck[] {
  if (readiness.openCount === 0) {
    return [{ ...check("banking.openCheques", "Open cheques", "INFORMATION", "READY", "NO_OPEN_CHEQUES", "No currently open cheques were initiated in or before this fiscal period.", 0, "/bank-accounts", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
  }
  return [{ ...check("banking.openCheques", "Open cheques", "WARNING", "OPEN", "OPEN_CHEQUES", "Currently open cheques initiated in or before this fiscal period require accountant review.", readiness.openCount, "/bank-accounts", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
}

export function normalizeInventoryAdjustmentReadiness(readiness: InventoryAdjustmentReadiness): AccountingCloseCheck[] {
  if (readiness.draftCount === 0) {
    return [{ ...check("inventory.draftAdjustments", "Draft inventory adjustments", "INFORMATION", "READY", "NO_DRAFT_INVENTORY_ADJUSTMENTS", "No draft inventory adjustments are dated in this fiscal period.", 0, "/inventory/adjustments", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
  }
  return [{ ...check("inventory.draftAdjustments", "Draft inventory adjustments", "WARNING", "OPEN", "DRAFT_INVENTORY_ADJUSTMENTS", "Draft inventory adjustments dated in this fiscal period require accountant review.", readiness.draftCount, "/inventory/adjustments", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
}

export function normalizeInventoryVarianceProposalReadiness(readiness: InventoryVarianceProposalReadiness): AccountingCloseCheck[] {
  if (readiness.pendingCount === 0) {
    return [{ ...check("inventory.pendingVarianceProposals", "Inventory variance proposals awaiting posting", "INFORMATION", "READY", "NO_PENDING_INVENTORY_VARIANCE_PROPOSALS", "No inventory variance proposals awaiting posting are dated in this fiscal period.", 0, "/inventory/reports/clearing-reconciliation", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
  }
  return [{ ...check("inventory.pendingVarianceProposals", "Inventory variance proposals awaiting posting", "WARNING", "OPEN", "PENDING_INVENTORY_VARIANCE_PROPOSALS", "Inventory variance proposals awaiting posting in this fiscal period require accountant review.", readiness.pendingCount, "/inventory/reports/clearing-reconciliation", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
}

export function normalizeReportPackReadiness(readiness: ReportPackReadiness): AccountingCloseCheck[] {
  if (readiness.failedCount === 0) {
    return [{ ...check("reports.failedPacks", "Failed report packs", "INFORMATION", "READY", "NO_FAILED_REPORT_PACKS", "No failed report packs overlap this fiscal period.", 0, "/reports", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
  }
  return [{ ...check("reports.failedPacks", "Failed report packs", "WARNING", "OPEN", "FAILED_REPORT_PACKS", "Failed report packs overlapping this fiscal period require accountant review.", readiness.failedCount, "/reports", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
}

export function normalizeCashExpenseReadiness(readiness: CashExpenseReadiness): AccountingCloseCheck[] {
  if (readiness.draftCount === 0) {
    return [{ ...check("purchases.draftCashExpenses", "Draft cash expenses", "INFORMATION", "READY", "NO_DRAFT_CASH_EXPENSES", "No draft cash expenses are dated in this fiscal period.", 0, "/purchases/cash-expenses", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
  }
  return [{ ...check("purchases.draftCashExpenses", "Draft cash expenses", "WARNING", "OPEN", "DRAFT_CASH_EXPENSES", "Draft cash expenses dated in this fiscal period require accountant review.", readiness.draftCount, "/purchases/cash-expenses", false), sourceUpdatedAt: readiness.sourceUpdatedAt }];
}

export function normalizeDocumentInboxReadiness(readiness: DocumentInboxReadiness): AccountingCloseCheck[] {
  const reviewCheck = readiness.reviewRequiredCount === 0
    ? { ...check("documents.reviewRequired", "Document inbox review", "INFORMATION", "READY", "NO_DOCUMENT_INBOX_REVIEW_REQUIRED", "No dated document inbox items require review in this fiscal period.", 0, "/document-inbox", false), sourceUpdatedAt: readiness.reviewRequiredUpdatedAt }
    : { ...check("documents.reviewRequired", "Document inbox review", "WARNING", "OPEN", "DOCUMENT_INBOX_REVIEW_REQUIRED", "Dated document inbox items requiring review in this fiscal period require accountant review.", readiness.reviewRequiredCount, "/document-inbox", false), sourceUpdatedAt: readiness.reviewRequiredUpdatedAt };
  const disabledCheck = { ...check("documents.extractionDisabled", "Document extraction availability", "INFORMATION", "READY", "DOCUMENT_EXTRACTION_DISABLED", readiness.extractionDisabledCount === 0 ? "No dated document inbox items have extraction disabled in this fiscal period." : "Dated document inbox items have extraction disabled; manual review remains required.", readiness.extractionDisabledCount, "/document-inbox", false), sourceUpdatedAt: readiness.extractionDisabledUpdatedAt };
  return [reviewCheck, disabledCheck];
}

export function canonicalReadinessHash(checks: Array<Omit<AccountingCloseCheck, "canAcknowledge"> & Partial<Pick<AccountingCloseCheck, "canAcknowledge">>>): string {
  const canonical = checks.map(({ canAcknowledge: _canAcknowledge, ...check }) => check).sort((left, right) => left.key.localeCompare(right.key));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function check(key: string, title: string, severity: AccountingCloseSeverity, status: AccountingCloseCheckStatus, code: string, safeMessage: string, count: number, detailsHref: string, canAcknowledge: boolean): AccountingCloseCheck {
  return { key, title, severity, status, code, safeMessage, count, detailsHref, canAcknowledge };
}
