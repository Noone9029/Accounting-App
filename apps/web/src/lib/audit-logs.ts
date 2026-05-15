const ACTION_LABELS: Record<string, string> = {
  AUTH_LOGIN: "Login",
  AUTH_PASSWORD_RESET_REQUESTED: "Password reset requested",
  AUTH_PASSWORD_RESET_COMPLETED: "Password reset completed",
  AUTH_INVITE_ACCEPTED: "Invite accepted",
  ORGANIZATION_UPDATED: "Organization updated",
  MEMBER_INVITED: "Member invited",
  MEMBER_ROLE_CHANGED: "Member role changed",
  MEMBER_STATUS_CHANGED: "Member status changed",
  ROLE_CREATED: "Role created",
  ROLE_UPDATED: "Role updated",
  ROLE_DELETED: "Role deleted",
  JOURNAL_CREATED: "Journal created",
  JOURNAL_POSTED: "Journal posted",
  JOURNAL_REVERSED: "Journal reversed",
  FISCAL_PERIOD_CREATED: "Fiscal period created",
  FISCAL_PERIOD_CLOSED: "Fiscal period closed",
  FISCAL_PERIOD_REOPENED: "Fiscal period reopened",
  FISCAL_PERIOD_LOCKED: "Fiscal period locked",
  SALES_INVOICE_CREATED: "Sales invoice created",
  SALES_INVOICE_UPDATED: "Sales invoice updated",
  SALES_INVOICE_FINALIZED: "Sales invoice finalized",
  SALES_INVOICE_VOIDED: "Sales invoice voided",
  CUSTOMER_PAYMENT_CREATED: "Customer payment created",
  CUSTOMER_PAYMENT_VOIDED: "Customer payment voided",
  CREDIT_NOTE_CREATED: "Credit note created",
  CREDIT_NOTE_FINALIZED: "Credit note finalized",
  CREDIT_NOTE_VOIDED: "Credit note voided",
  CUSTOMER_REFUND_CREATED: "Customer refund created",
  CUSTOMER_REFUND_VOIDED: "Customer refund voided",
  PURCHASE_BILL_CREATED: "Purchase bill created",
  PURCHASE_BILL_FINALIZED: "Purchase bill finalized",
  PURCHASE_BILL_VOIDED: "Purchase bill voided",
  SUPPLIER_PAYMENT_CREATED: "Supplier payment created",
  SUPPLIER_PAYMENT_VOIDED: "Supplier payment voided",
  PURCHASE_DEBIT_NOTE_CREATED: "Purchase debit note created",
  PURCHASE_DEBIT_NOTE_FINALIZED: "Purchase debit note finalized",
  PURCHASE_DEBIT_NOTE_VOIDED: "Purchase debit note voided",
  SUPPLIER_REFUND_CREATED: "Supplier refund created",
  SUPPLIER_REFUND_VOIDED: "Supplier refund voided",
  PURCHASE_ORDER_CREATED: "Purchase order created",
  PURCHASE_ORDER_APPROVED: "Purchase order approved",
  PURCHASE_ORDER_CONVERTED_TO_BILL: "Purchase order converted to bill",
  CASH_EXPENSE_CREATED: "Cash expense created",
  CASH_EXPENSE_VOIDED: "Cash expense voided",
  BANK_TRANSFER_CREATED: "Bank transfer created",
  BANK_TRANSFER_VOIDED: "Bank transfer voided",
  BANK_STATEMENT_IMPORTED: "Bank statement imported",
  BANK_STATEMENT_TRANSACTION_MATCHED: "Bank transaction matched",
  BANK_STATEMENT_TRANSACTION_CATEGORIZED: "Bank transaction categorized",
  BANK_RECONCILIATION_SUBMITTED: "Bank reconciliation submitted",
  BANK_RECONCILIATION_APPROVED: "Bank reconciliation approved",
  BANK_RECONCILIATION_CLOSED: "Bank reconciliation closed",
  BANK_RECONCILIATION_VOIDED: "Bank reconciliation voided",
  WAREHOUSE_CREATED: "Warehouse created",
  WAREHOUSE_ARCHIVED: "Warehouse archived",
  STOCK_MOVEMENT_CREATED: "Stock movement created",
  INVENTORY_ADJUSTMENT_CREATED: "Inventory adjustment created",
  INVENTORY_ADJUSTMENT_APPROVED: "Inventory adjustment approved",
  INVENTORY_ADJUSTMENT_VOIDED: "Inventory adjustment voided",
  WAREHOUSE_TRANSFER_CREATED: "Warehouse transfer created",
  WAREHOUSE_TRANSFER_VOIDED: "Warehouse transfer voided",
  PURCHASE_RECEIPT_CREATED: "Purchase receipt created",
  PURCHASE_RECEIPT_VOIDED: "Purchase receipt voided",
  PURCHASE_RECEIPT_ASSET_POSTED: "Receipt asset posted",
  PURCHASE_RECEIPT_ASSET_REVERSED: "Receipt asset reversed",
  SALES_STOCK_ISSUE_CREATED: "Sales stock issue created",
  SALES_STOCK_ISSUE_VOIDED: "Sales stock issue voided",
  COGS_POSTED: "COGS posted",
  COGS_REVERSED: "COGS reversed",
  INVENTORY_VARIANCE_PROPOSAL_CREATED: "Variance proposal created",
  INVENTORY_VARIANCE_PROPOSAL_APPROVED: "Variance proposal approved",
  INVENTORY_VARIANCE_PROPOSAL_POSTED: "Variance proposal posted",
  INVENTORY_VARIANCE_PROPOSAL_REVERSED: "Variance proposal reversed",
  ATTACHMENT_UPLOADED: "Attachment uploaded",
  ATTACHMENT_DELETED: "Attachment deleted",
  GENERATED_DOCUMENT_CREATED: "Generated document created",
  DOCUMENT_SETTINGS_UPDATED: "Document settings updated",
  AUDIT_LOG_RETENTION_SETTINGS_UPDATED: "Audit retention settings updated",
  NUMBER_SEQUENCE_UPDATED: "Number sequence updated",
  ZATCA_PROFILE_UPDATED: "ZATCA profile updated",
  ZATCA_EGS_CREATED: "ZATCA EGS created",
  ZATCA_CSR_GENERATED: "ZATCA CSR generated",
  ZATCA_MOCK_CSID_REQUESTED: "ZATCA mock CSID requested",
  ZATCA_XML_GENERATED: "ZATCA XML generated",
  ZATCA_COMPLIANCE_CHECK_RUN: "ZATCA compliance check run",
};

const ENTITY_LABELS: Record<string, string> = {
  SalesInvoice: "Sales Invoice",
  PurchaseBill: "Purchase Bill",
  CustomerPayment: "Customer Payment",
  SupplierPayment: "Supplier Payment",
  CreditNote: "Credit Note",
  PurchaseDebitNote: "Purchase Debit Note",
  CustomerRefund: "Customer Refund",
  SupplierRefund: "Supplier Refund",
  BankTransfer: "Bank Transfer",
  BankStatementImport: "Bank Statement Import",
  BankStatementTransaction: "Bank Statement Transaction",
  BankReconciliation: "Bank Reconciliation",
  InventoryVarianceProposal: "Inventory Variance Proposal",
  PurchaseReceipt: "Purchase Receipt",
  SalesStockIssue: "Sales Stock Issue",
  InventoryAdjustment: "Inventory Adjustment",
  WarehouseTransfer: "Warehouse Transfer",
  Attachment: "Attachment",
  GeneratedDocument: "Generated Document",
  AuditLogRetentionSettings: "Audit Log Retention Settings",
  NumberSequence: "Number Sequence",
  ZatcaOrganizationProfile: "ZATCA Profile",
  ZatcaEgsUnit: "ZATCA EGS Unit",
  ZatcaInvoiceMetadata: "ZATCA Invoice Metadata",
  Role: "Role",
  OrganizationMember: "Organization Member",
  JournalEntry: "Journal Entry",
  FiscalPeriod: "Fiscal Period",
};

const redactedValue = "[REDACTED]";
const riskyKeyFragments = [
  "password",
  "passwordhash",
  "token",
  "tokenhash",
  "secret",
  "apikey",
  "accesskey",
  "privatekey",
  "authorization",
  "base64",
  "contentbase64",
  "database_url",
  "direct_url",
  "smtp_password",
  "jwt_secret",
];

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? humanize(action);
}

export function auditEntityTypeLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? humanize(entityType);
}

export function sanitizeMetadataForDisplay(value: unknown): unknown {
  return sanitizeValue(value, new WeakSet<object>());
}

export function buildAuditLogQuery(filters: Record<string, string | undefined>): string {
  return buildAuditLogPath("/audit-logs", filters);
}

export function buildAuditLogExportPath(filters: Record<string, string | undefined>): string {
  return buildAuditLogPath("/audit-logs/export.csv", filters);
}

export function auditRetentionDaysLabel(days: number): string {
  const years = days / 365;
  return `${days} days (${years.toFixed(years % 1 === 0 ? 0 : 1)} years)`;
}

export function retentionPreviewSummary(logsOlderThanCutoff: number): string {
  return logsOlderThanCutoff === 0
    ? "No audit logs are older than the current cutoff."
    : `${logsOlderThanCutoff} audit log${logsOlderThanCutoff === 1 ? "" : "s"} would be eligible in a dry run.`;
}

function buildAuditLogPath(basePath: string, filters: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    const cleaned = value?.trim();
    if (cleaned) {
      params.set(key, cleaned);
    }
  });
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function auditLogSummary(after: unknown, before: unknown): string {
  const source = isRecord(after) ? after : isRecord(before) ? before : {};
  const reference =
    readFirstString(source, [
      "invoiceNumber",
      "billNumber",
      "paymentNumber",
      "creditNoteNumber",
      "debitNoteNumber",
      "refundNumber",
      "purchaseOrderNumber",
      "expenseNumber",
      "receiptNumber",
      "issueNumber",
      "proposalNumber",
      "entryNumber",
      "filename",
      "name",
      "email",
    ]) ?? null;

  return reference ?? "No reference captured";
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  if (!isRecord(value)) {
    return value;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, shouldRedactKey(key) ? redactedValue : sanitizeValue(entry, seen)]),
  );
}

function shouldRedactKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return riskyKeyFragments.some((fragment) => normalized.includes(fragment));
}

function readFirstString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
}

function humanize(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
