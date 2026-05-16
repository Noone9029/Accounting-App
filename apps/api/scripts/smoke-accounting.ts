import { Decimal } from "decimal.js";

const apiUrl = (process.env.LEDGERBYTE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const seedEmail = process.env.LEDGERBYTE_SMOKE_EMAIL ?? "admin@example.com";
const seedPassword = process.env.LEDGERBYTE_SMOKE_PASSWORD ?? "Password123!";

interface LoginResponse {
  accessToken: string;
  organization?: Organization;
}

interface AuthMeResponse {
  id: string;
  email: string;
  memberships: Array<{
    id: string;
    status: string;
    organization: Organization;
    role: {
      id: string;
      name: string;
      permissions: unknown;
    };
  }>;
}

interface Organization {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
  memberCount: number;
}

interface OrganizationMember {
  id: string;
  status: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  role: {
    id: string;
    name: string;
    permissions: string[];
    isSystem: boolean;
  };
}

interface InviteOrganizationMemberResponse {
  message: string;
  member: OrganizationMember;
  emailOutboxId?: string;
  invitePreviewUrl?: string;
}

interface InvitationPreviewResponse {
  valid: boolean;
  email?: string;
  organization?: Organization | null;
  role?: { id: string; name: string } | null;
  consumed?: boolean;
}

interface EmailOutboxEntry {
  id: string;
  toEmail: string;
  templateType: "ORGANIZATION_INVITE" | "PASSWORD_RESET" | "TEST_EMAIL";
  status: "QUEUED" | "SENT_MOCK" | "SENT_PROVIDER" | "FAILED";
  provider: string;
  createdAt: string;
}

interface EmailOutboxDetail extends EmailOutboxEntry {
  bodyText: string;
  bodyHtml: string | null;
}

interface EmailReadinessResponse {
  provider: string;
  ready: boolean;
  blockingReasons: string[];
  warnings: string[];
  fromEmail: string;
  smtp: {
    hostConfigured: boolean;
    portConfigured: boolean;
    userConfigured: boolean;
    passwordConfigured: boolean;
    secure: boolean;
  };
  mockMode: boolean;
  realSendingEnabled: boolean;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  createdAt: string;
}

interface AuditLogListResponse {
  data: AuditLogEntry[];
  pagination: {
    total: number;
    limit: number;
    page: number;
    hasMore: boolean;
  };
}

interface AuditLogRetentionSettingsResponse {
  retentionDays: number;
  autoPurgeEnabled: boolean;
  exportBeforePurgeRequired: boolean;
  warnings: string[];
}

interface AuditLogRetentionPreviewResponse {
  retentionDays: number;
  cutoffDate: string;
  totalAuditLogs: number;
  logsOlderThanCutoff: number;
  dryRunOnly: boolean;
  warnings: string[];
}

interface NumberSequenceResponse {
  id: string;
  scope: string;
  prefix: string;
  nextNumber: number;
  padding: number;
  exampleNextNumber: string;
  updatedAt: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type?: string;
  allowPosting: boolean;
  isActive: boolean;
}

interface BankAccountSummary {
  id: string;
  accountId: string;
  displayName: string;
  type: string;
  status: string;
  currency: string;
  openingBalance: string;
  openingBalanceDate: string | null;
  openingBalanceJournalEntryId: string | null;
  openingBalancePostedAt: string | null;
  ledgerBalance: string;
  transactionCount: number;
  account: {
    id: string;
    code: string;
    name: string;
  };
}

interface BankAccountTransactionsResponse {
  closingBalance: string;
  transactions: Array<{
    id: string;
    sourceType: string;
    sourceId: string | null;
    sourceNumber: string | null;
    debit: string;
    credit: string;
    runningBalance: string;
  }>;
}

interface BankTransfer {
  id: string;
  transferNumber: string;
  status: "POSTED" | "VOIDED";
  amount: string;
  currency: string;
  journalEntryId: string | null;
  voidReversalJournalEntryId: string | null;
}

interface BankStatementImport {
  id: string;
  filename: string;
  status: string;
  rowCount: number;
  closingStatementBalance?: string | null;
}

interface BankStatementImportPreview {
  rowCount: number;
  validRows: Array<{ rowNumber: number; amount: string; type: "DEBIT" | "CREDIT" }>;
  invalidRows: Array<{ rowNumber: number; errors: string[] }>;
  totalCredits: string;
  totalDebits: string;
  detectedColumns: string[];
  warnings: string[];
}

interface BankStatementTransaction {
  id: string;
  importId: string;
  status: string;
  type: "DEBIT" | "CREDIT";
  amount: string;
  reference?: string | null;
  matchedJournalLineId?: string | null;
  matchedJournalEntryId?: string | null;
  createdJournalEntryId?: string | null;
  matchType?: string | null;
}

interface BankStatementMatchCandidate {
  journalLineId: string;
  journalEntryId: string;
  entryNumber: string;
  reference?: string | null;
  debit: string;
  credit: string;
  score: number;
}

interface BankReconciliationSummary {
  ledgerBalance: string;
  statementClosingBalance: string | null;
  difference: string | null;
  statusSuggestion: "RECONCILED" | "NEEDS_REVIEW";
  totals: Record<"credits" | "debits" | "unmatched" | "matched" | "categorized" | "ignored", { count: number; total: string }>;
  latestClosedReconciliation?: BankReconciliation | null;
  hasOpenDraftReconciliation?: boolean;
  unreconciledTransactionCount?: number;
  closedThroughDate?: string | null;
}

interface BankReconciliation {
  id: string;
  reconciliationNumber: string;
  bankAccountProfileId: string;
  periodStart: string;
  periodEnd: string;
  statementClosingBalance: string;
  ledgerClosingBalance: string;
  difference: string;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "CLOSED" | "VOIDED";
  submittedAt?: string | null;
  approvedAt?: string | null;
  closedAt?: string | null;
  voidedAt?: string | null;
  unmatchedTransactionCount?: number;
}

interface BankReconciliationReviewEvent {
  id: string;
  action: "SUBMIT" | "APPROVE" | "REOPEN" | "CLOSE" | "VOID";
  fromStatus?: string | null;
  toStatus: string;
}

interface BankReconciliationItem {
  id: string;
  statementTransactionId: string;
  statusAtClose: string;
  amount: string;
  type: "DEBIT" | "CREDIT";
}

interface BankReconciliationReportData {
  reconciliation: {
    id: string;
    reconciliationNumber: string;
    status: string;
  };
  items: Array<{
    statementTransactionId: string;
    statusAtClose: string;
  }>;
  summary: {
    itemCount: number;
  };
}

interface FiscalPeriod {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status: "OPEN" | "CLOSED" | "LOCKED";
}

interface JournalEntry {
  id: string;
  status: string;
  entryDate: string;
  lines?: Array<{
    accountId: string;
    debit: string;
    credit: string;
    account?: { id: string; code: string; name: string } | null;
  }>;
}

interface GeneralLedgerReport {
  accounts: Array<{
    accountId: string;
    lines: Array<{
      journalEntryId: string;
      debit: string;
      credit: string;
    }>;
  }>;
}

  interface DashboardSummary {
    asOf: string;
    currency: string;
    sales: Record<string, unknown>;
    purchases: Record<string, unknown>;
    banking: Record<string, unknown>;
    inventory: Record<string, unknown> & {
      lowStockItems?: unknown[];
    };
    reports: Record<string, unknown>;
    trends: {
      monthlySales: unknown[];
      monthlyPurchases: unknown[];
      monthlyNetProfit: unknown[];
      cashBalanceTrend: unknown[];
    };
    aging: {
      receivablesBuckets: unknown[];
      payablesBuckets: unknown[];
    };
    compliance: Record<string, unknown>;
    attentionItems: Array<{
      type: string;
    severity: string;
    title: string;
    description: string;
    href: string;
  }>;
}

interface TaxRate {
  id: string;
  name: string;
  rate: string;
  isActive: boolean;
}

interface Contact {
  id: string;
  name: string;
  displayName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  buildingNumber?: string | null;
  district?: string | null;
  city?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
}

interface Item {
  id: string;
  name: string;
  sku?: string | null;
  inventoryTracking?: boolean;
  reorderPoint?: string | null;
  reorderQuantity?: string | null;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  isDefault: boolean;
}

interface StockMovement {
  id: string;
  itemId: string;
  warehouseId: string;
  type:
    | "OPENING_BALANCE"
    | "ADJUSTMENT_IN"
    | "ADJUSTMENT_OUT"
    | "TRANSFER_IN"
    | "TRANSFER_OUT"
    | "PURCHASE_RECEIPT_PLACEHOLDER"
    | "SALES_ISSUE_PLACEHOLDER";
  quantity: string;
  unitCost?: string | null;
  totalCost?: string | null;
}

interface InventoryAdjustment {
  id: string;
  adjustmentNumber: string;
  status: "DRAFT" | "APPROVED" | "VOIDED";
  type: "INCREASE" | "DECREASE";
  quantity: string;
  stockMovementId?: string | null;
  voidStockMovementId?: string | null;
}

interface WarehouseTransfer {
  id: string;
  transferNumber: string;
  status: "POSTED" | "VOIDED";
  quantity: string;
  fromStockMovementId?: string | null;
  toStockMovementId?: string | null;
  voidFromStockMovementId?: string | null;
  voidToStockMovementId?: string | null;
}

interface PurchaseReceipt {
  id: string;
  receiptNumber: string;
  status: "POSTED" | "VOIDED";
  inventoryAssetJournalEntryId?: string | null;
  inventoryAssetReversalJournalEntryId?: string | null;
  lines?: Array<{ id: string; stockMovementId?: string | null; voidStockMovementId?: string | null }>;
}

interface PurchaseReceivingStatus {
  status: "NOT_STARTED" | "PARTIAL" | "COMPLETE";
  lines: Array<{
    lineId: string;
    inventoryTracking: boolean;
    receivedQuantity: string;
    remainingQuantity: string;
  }>;
}

interface SalesStockIssue {
  id: string;
  issueNumber: string;
  status: "POSTED" | "VOIDED";
  cogsJournalEntryId?: string | null;
  cogsReversalJournalEntryId?: string | null;
  lines?: Array<{ id: string; stockMovementId?: string | null; voidStockMovementId?: string | null }>;
}

interface SalesInvoiceStockIssueStatus {
  status: "NOT_STARTED" | "PARTIAL" | "COMPLETE";
  lines: Array<{
    lineId: string;
    inventoryTracking: boolean;
    issuedQuantity: string;
    remainingQuantity: string;
  }>;
}

interface InventoryBalance {
  item: { id: string; name: string; sku?: string | null };
  warehouse: { id: string; code: string; name: string };
  quantityOnHand: string;
  averageUnitCost: string | null;
  inventoryValue: string | null;
}

interface InventorySettings {
  id: string;
  valuationMethod: "MOVING_AVERAGE" | "FIFO_PLACEHOLDER";
  allowNegativeStock: boolean;
  trackInventoryValue: boolean;
  warnings: string[];
}

interface InventoryAccountingSettings {
  id: string;
  valuationMethod: "MOVING_AVERAGE" | "FIFO_PLACEHOLDER";
  enableInventoryAccounting: boolean;
  inventoryAssetAccountId: string | null;
  cogsAccountId: string | null;
  inventoryClearingAccountId: string | null;
  purchaseReceiptPostingMode: "DISABLED" | "PREVIEW_ONLY";
  inventoryAdjustmentGainAccountId: string | null;
  inventoryAdjustmentLossAccountId: string | null;
  canEnableInventoryAccounting: boolean;
  previewOnly: true;
  noAutomaticPosting: true;
  blockingReasons: string[];
  warnings: string[];
}

interface PurchaseReceiptPostingReadiness {
  ready: boolean;
  canEnablePosting: boolean;
  blockingReasons: string[];
  warnings: string[];
  requiredAccounts: {
    inventoryAssetAccount: Account | null;
    inventoryClearingAccount: Account | null;
  };
  compatibleBillPostingModeExists: boolean;
  existingBillsInDirectModeCount: number;
  billsUsingInventoryClearingCount: number;
  recommendedNextStep: string;
}

interface AccountingPreviewJournalLine {
  lineNumber: number;
  side: "DEBIT" | "CREDIT";
  accountId: string | null;
  accountCode: string | null;
  accountName: string;
  amount: string;
}

interface AccountingPreviewJournal {
  totalDebit: string;
  totalCredit: string;
  lines: AccountingPreviewJournalLine[];
}

interface PurchaseReceiptAccountingPreview {
  previewOnly: true;
  postingStatus: "DESIGN_ONLY" | "POSTABLE" | "POSTED" | "REVERSED";
  canPost: boolean;
  alreadyPosted: boolean;
  alreadyReversed: boolean;
  journalEntryId: string | null;
  reversalJournalEntryId: string | null;
  postingMode: "DISABLED" | "PREVIEW_ONLY";
  linkedBill: {
    id: string;
    billNumber: string;
    status: string;
    inventoryPostingMode: PurchaseBillInventoryPostingMode;
  } | null;
  receiptValue: string;
  matchedBillValue: string;
  unmatchedReceiptValue: string;
  valueDifference: string;
  journalPreview: AccountingPreviewJournalLine[];
  matchingSummary: {
    sourceType: "purchaseBill" | "purchaseOrder" | "standalone";
    sourceId: string | null;
    matchedQuantity: string;
    unmatchedQuantity: string;
    valueDifference: string;
  };
  blockingReasons: string[];
  warnings: string[];
  journal: AccountingPreviewJournal;
  lines: Array<{
    lineId: string;
    quantity: string;
    unitCost: string | null;
    lineValue: string | null;
    matchedQuantity: string;
    unmatchedQuantity: string;
    matchedBillValue: string | null;
    valueDifference: string | null;
    warnings: string[];
  }>;
}

type PurchaseBillInventoryPostingMode = "DIRECT_EXPENSE_OR_ASSET" | "INVENTORY_CLEARING";

interface PurchaseBillAccountingPreview {
  previewOnly: true;
  sourceType: "PurchaseBill";
  sourceId: string;
  sourceNumber: string;
  inventoryPostingMode: PurchaseBillInventoryPostingMode;
  canFinalize: boolean;
  canUseInventoryClearingMode: boolean;
  blockingReasons: string[];
  warnings: string[];
  inventoryTrackedLineCount: number;
  directLineCount: number;
  clearingAccount: Account | null;
  vatReceivableAccount: Account | null;
  accountsPayableAccount: Account | null;
  journal: AccountingPreviewJournal;
  journalPreview: AccountingPreviewJournalLine[];
}

interface PurchaseBillReceiptMatchingStatus {
  bill: {
    id: string;
    billNumber: string;
    status: string;
    inventoryPostingMode: PurchaseBillInventoryPostingMode;
  };
  billTotal: string;
  receiptCount: number;
  receiptValue: string;
  status: "NOT_RECEIVED" | "PARTIALLY_RECEIVED" | "FULLY_RECEIVED" | "OVER_RECEIVED_WARNING";
  warnings: string[];
  lines: Array<{
    lineId: string;
    sourceQuantity: string;
    receivedQuantity: string;
    remainingQuantity: string;
    receivedValue: string;
    matchedBillValue: string;
    valueDifference: string;
    receipts?: Array<{
      id: string;
      receiptNumber: string;
      status: string;
      inventoryAssetJournalEntryId?: string | null;
      inventoryAssetReversalJournalEntryId?: string | null;
    }>;
  }>;
}

interface SalesStockIssueAccountingPreview {
  previewOnly: true;
  postingStatus: "DESIGN_ONLY" | "POSTABLE" | "POSTED" | "REVERSED";
  canPost: boolean;
  alreadyPosted: boolean;
  alreadyReversed: boolean;
  journalEntryId: string | null;
  reversalJournalEntryId: string | null;
  blockingReasons: string[];
  warnings: string[];
  journal: AccountingPreviewJournal;
  lines: Array<{
    lineId: string;
    quantity: string;
    estimatedUnitCost: string | null;
    estimatedCOGS: string | null;
    warnings: string[];
  }>;
}

interface InventoryStockValuationReport {
  rows: Array<{
    item: { id: string; name: string; sku?: string | null };
    warehouse: { id: string; code: string; name: string };
    quantityOnHand: string;
    averageUnitCost: string | null;
    estimatedValue: string | null;
    warnings: string[];
  }>;
  grandTotalEstimatedValue: string;
}

interface InventoryMovementSummaryReport {
  rows: Array<{
    item: { id: string; name: string; sku?: string | null };
    warehouse: { id: string; code: string; name: string };
    openingQuantity: string;
    inboundQuantity: string;
    outboundQuantity: string;
    closingQuantity: string;
    movementCount: number;
  }>;
  totals: {
    inboundQuantity: string;
    outboundQuantity: string;
    closingQuantity: string;
    movementCount: number;
  };
}

interface InventoryLowStockReport {
  rows: Array<{
    item: { id: string; name: string; sku?: string | null };
    quantityOnHand: string;
    reorderPoint: string;
    reorderQuantity: string | null;
    status: "BELOW_REORDER_POINT" | "AT_REORDER_POINT";
  }>;
  totalItems: number;
}

type InventoryClearingReportStatus =
  | "MATCHED"
  | "PARTIAL"
  | "VARIANCE"
  | "BILL_WITHOUT_RECEIPT_POSTING"
  | "RECEIPT_WITHOUT_CLEARING_BILL"
  | "DIRECT_MODE_EXCLUDED";

interface InventoryClearingReconciliationReport {
  clearingAccountBalance: string;
  reportComputedOpenDifference: string;
  differenceBetweenGLAndReport: string;
  summary: {
    rowCount: number;
    matchedCount: number;
    varianceCount: number;
    billWithoutReceiptPostingCount: number;
    receiptWithoutClearingBillCount: number;
    billClearingDebit: string;
    receiptClearingCredit: string;
    netClearingDifference: string;
  };
  rows: Array<{
    status: InventoryClearingReportStatus;
    purchaseBill: { id: string; billNumber: string; inventoryPostingMode: PurchaseBillInventoryPostingMode } | null;
    supplier: { id: string; name: string; displayName?: string | null } | null;
    billClearingDebit: string;
    receiptClearingCredit: string;
    netClearingDifference: string;
    billedQuantity: string;
    receivedQuantity: string;
    receipts: Array<{
      id: string;
      receiptNumber: string;
      receiptValue: string;
      activeClearingCredit: string;
      assetPostingStatus: "NOT_POSTED" | "POSTED" | "REVERSED";
    }>;
    warnings: string[];
  }>;
}

interface InventoryClearingVarianceReport {
  clearingAccountBalance: string;
  summary: {
    rowCount: number;
    totalVarianceAmount: string;
  };
  rows: Array<{
    status: InventoryClearingReportStatus;
    purchaseBill: { id: string; billNumber: string; inventoryPostingMode: PurchaseBillInventoryPostingMode } | null;
    receipt: { id: string; receiptNumber: string } | null;
    varianceAmount: string;
    varianceReason: string;
    recommendedAction: string;
    warnings: string[];
  }>;
}

type InventoryVarianceProposalStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "POSTED" | "REVERSED" | "VOIDED";
type InventoryVarianceReason =
  | "PRICE_DIFFERENCE"
  | "QUANTITY_DIFFERENCE"
  | "RECEIPT_WITHOUT_CLEARING_BILL"
  | "CLEARING_BILL_WITHOUT_RECEIPT"
  | "REVERSED_RECEIPT_POSTING"
  | "MANUAL_ADJUSTMENT";

interface InventoryVarianceProposal {
  id: string;
  proposalNumber: string;
  status: InventoryVarianceProposalStatus;
  sourceType: "CLEARING_VARIANCE" | "MANUAL";
  reason: InventoryVarianceReason;
  amount: string;
  journalEntryId: string | null;
  reversalJournalEntryId: string | null;
  purchaseBillId?: string | null;
  purchaseReceiptId?: string | null;
}

interface InventoryVarianceProposalEvent {
  id: string;
  action: "CREATE" | "SUBMIT" | "APPROVE" | "POST" | "REVERSE" | "VOID";
  fromStatus?: InventoryVarianceProposalStatus | null;
  toStatus: InventoryVarianceProposalStatus;
}

interface InventoryVarianceProposalAccountingPreview {
  previewOnly: true;
  status: InventoryVarianceProposalStatus;
  canPost: boolean;
  amount: string;
  blockingReasons: string[];
  warnings: string[];
  journalEntryId: string | null;
  reversalJournalEntryId: string | null;
  journal: AccountingPreviewJournal;
  journalLines: AccountingPreviewJournalLine[];
}

interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: string;
  balanceDue: string;
  journalEntryId?: string | null;
  notes?: string | null;
}

interface CustomerPayment {
  id: string;
  paymentNumber: string;
  status: string;
  amountReceived: string;
  unappliedAmount: string;
  journalEntryId?: string | null;
  voidReversalJournalEntryId?: string | null;
}

interface CreditNote {
  id: string;
  creditNoteNumber: string;
  status: string;
  total: string;
  unappliedAmount: string;
  journalEntryId?: string | null;
  reversalJournalEntryId?: string | null;
}

interface PurchaseBill {
  id: string;
  billNumber: string;
  status: string;
  inventoryPostingMode?: PurchaseBillInventoryPostingMode;
  total: string;
  balanceDue: string;
  journalEntryId?: string | null;
  reversalJournalEntryId?: string | null;
  purchaseOrderId?: string | null;
}

interface PurchaseOrder {
  id: string;
  purchaseOrderNumber: string;
  status: string;
  total: string;
  convertedBillId?: string | null;
}

interface PurchaseDebitNote {
  id: string;
  debitNoteNumber: string;
  status: string;
  total: string;
  unappliedAmount: string;
  journalEntryId?: string | null;
  reversalJournalEntryId?: string | null;
}

interface CashExpense {
  id: string;
  expenseNumber: string;
  status: string;
  total: string;
  taxTotal: string;
  contactId?: string | null;
  journalEntryId?: string | null;
  voidReversalJournalEntryId?: string | null;
}

type AttachmentLinkedEntityType = "SALES_INVOICE" | "PURCHASE_BILL" | "CASH_EXPENSE";

interface Attachment {
  id: string;
  linkedEntityType: AttachmentLinkedEntityType;
  linkedEntityId: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  contentHash: string;
  status: "ACTIVE" | "DELETED";
  notes?: string | null;
}

interface StorageReadinessResponse {
  attachmentStorage: {
    activeProvider: "database" | "s3";
    ready: boolean;
    blockingReasons: string[];
    warnings: string[];
    maxSizeMb: number;
  };
  generatedDocumentStorage: {
    activeProvider: "database" | "s3";
    ready: boolean;
    blockingReasons: string[];
    warnings: string[];
  };
  s3Config: {
    endpointConfigured: boolean;
    regionConfigured: boolean;
    bucketConfigured: boolean;
    accessKeyConfigured: boolean;
    secretConfigured: boolean;
    forcePathStyle: boolean;
    publicBaseUrlConfigured: boolean;
  };
  warnings: string[];
}

interface StorageMigrationPlanResponse {
  attachmentCount: number;
  attachmentTotalBytes: number;
  generatedDocumentCount: number;
  generatedDocumentTotalBytes: number;
  databaseStorageCount: number;
  s3StorageCount: number;
  migrationRequired?: boolean;
  targetProvider?: "database" | "s3";
  estimatedMigrationRequired: boolean;
  dryRunOnly: boolean;
  notes: string[];
}

interface PurchaseDebitNoteAllocation {
  id: string;
  debitNoteId: string;
  billId: string;
  amountApplied: string;
  reversedAt?: string | null;
  reversalReason?: string | null;
}

interface SupplierPayment {
  id: string;
  paymentNumber: string;
  status: string;
  amountPaid: string;
  unappliedAmount: string;
  journalEntryId?: string | null;
  voidReversalJournalEntryId?: string | null;
}

interface SupplierPaymentUnappliedAllocation {
  id: string;
  paymentId: string;
  billId: string;
  amountApplied: string;
  reversedAt?: string | null;
  reversalReason?: string | null;
}

interface SupplierRefund {
  id: string;
  refundNumber: string;
  status: string;
  amountRefunded: string;
  sourceType: "SUPPLIER_PAYMENT" | "PURCHASE_DEBIT_NOTE";
  sourcePaymentId?: string | null;
  sourceDebitNoteId?: string | null;
  journalEntryId?: string | null;
  voidReversalJournalEntryId?: string | null;
}

interface CreditNoteAllocation {
  id: string;
  creditNoteId: string;
  invoiceId: string;
  amountApplied: string;
  reversedAt?: string | null;
  reversalReason?: string | null;
}

interface CustomerPaymentUnappliedAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  amountApplied: string;
  reversedAt?: string | null;
  reversalReason?: string | null;
}

interface CustomerRefund {
  id: string;
  refundNumber: string;
  status: string;
  amountRefunded: string;
  sourceType: "CUSTOMER_PAYMENT" | "CREDIT_NOTE";
  sourcePaymentId?: string | null;
  sourceCreditNoteId?: string | null;
  journalEntryId?: string | null;
  voidReversalJournalEntryId?: string | null;
}

interface LedgerRow {
  type: string;
  sourceId: string;
  debit: string;
  credit: string;
  status: string;
  balance: string;
  metadata?: Record<string, unknown>;
}

interface TrialBalanceReport {
  accounts: Array<{
    accountId: string;
    periodDebit: string;
    periodCredit: string;
    closingDebit: string;
    closingCredit: string;
  }>;
  totals: {
    closingDebit: string;
    closingCredit: string;
    balanced: boolean;
  };
}

interface ProfitAndLossReport {
  revenue: string;
  costOfSales: string;
  grossProfit: string;
  expenses: string;
  netProfit: string;
}

interface BalanceSheetReport {
  balanced: boolean;
  totalAssets: string;
  totalLiabilitiesAndEquity: string;
}

interface VatSummaryReport {
  salesVat: string;
  purchaseVat: string;
  netVatPayable: string;
}

interface AgingReport {
  rows: unknown[];
  bucketTotals: Record<string, string>;
  grandTotal: string;
}

interface LedgerResponse {
  closingBalance: string;
  rows: LedgerRow[];
}

interface ReceiptData {
  customer?: { id: string; name: string };
  journalEntry?: { id: string; entryNumber: string } | null;
  allocations: Array<{ invoiceId: string; amountApplied: string }>;
  unappliedAllocations?: Array<{ invoiceId: string; amountApplied: string; status: string }>;
}

interface OrganizationDocumentSettings {
  footerText: string;
  primaryColor: string | null;
  accentColor: string | null;
}

interface GeneratedDocument {
  id: string;
  documentType: string;
  sourceId: string;
  filename: string;
  status: string;
}

interface ZatcaOrganizationProfile {
  id: string;
  sellerName?: string | null;
  vatNumber?: string | null;
  countryCode: string;
}

interface ZatcaAdapterConfigSummary {
  mode: string;
  realNetworkEnabled: boolean;
  effectiveRealNetworkEnabled: boolean;
}

interface ZatcaComplianceChecklistResponse {
  warning: string;
  summary: {
    total: number;
    byStatus: Record<string, number>;
    byRisk: Record<string, number>;
  };
  groups: Record<string, unknown[]>;
}

interface ZatcaReadinessSummary {
  warning: string;
  status: "READY" | "WARNINGS" | "BLOCKED";
  localOnly: true;
  productionCompliance: false;
  productionReady: boolean;
  blockingReasons: string[];
  sellerProfile?: ZatcaReadinessSection;
  signing: ZatcaReadinessSection;
  keyCustody: ZatcaReadinessSection;
  csr: ZatcaReadinessSection;
  phase2Qr: ZatcaReadinessSection;
  pdfA3: ZatcaReadinessSection;
}

interface ZatcaReadinessSection {
  status: "READY" | "WARNINGS" | "BLOCKED";
  checks: Array<{
    code: string;
    severity: "ERROR" | "WARNING" | "INFO";
    sourceRule?: string;
  }>;
}

interface ZatcaInvoiceReadinessResponse {
  status: "READY" | "WARNINGS" | "BLOCKED";
  localOnly: true;
  noMutation: true;
  productionCompliance: false;
  sellerProfile: ZatcaReadinessSection;
  buyerContact: ZatcaReadinessSection;
  invoice: ZatcaReadinessSection;
  egs: ZatcaReadinessSection;
  xml: ZatcaReadinessSection;
  signing: ZatcaReadinessSection;
  phase2Qr: ZatcaReadinessSection;
  pdfA3: ZatcaReadinessSection;
  checks: Array<{
    code: string;
    severity: "ERROR" | "WARNING" | "INFO";
    sourceRule?: string;
  }>;
}

interface ZatcaInvoiceSigningPlanResponse {
  localOnly: true;
  dryRun: true;
  noMutation: true;
  productionCompliance: false;
  executionEnabled: boolean;
  sdkCommand: string;
  commandPlan: {
    command: string | null;
    args: string[];
    displayCommand: string;
    warnings: string[];
  };
  requiredInputs: Array<{ id: string; available: boolean; path: string | null }>;
  blockers: string[];
  warnings: string[];
}

interface ZatcaInvoiceLocalSigningDryRunResponse {
  localOnly: true;
  dryRun: true;
  noMutation: true;
  noCsidRequest: true;
  noNetwork: true;
  noClearanceReporting: true;
  noPdfA3: true;
  noProductionCredentials: true;
  noPersistence: true;
  productionCompliance: false;
  executionEnabled: boolean;
  executionAttempted: boolean;
  executionSkipped: boolean;
  executionStatus: "SKIPPED" | "FAILED" | "SUCCEEDED_LOCALLY";
  signingExecuted: boolean;
  qrExecuted: boolean;
  signedXmlDetected: boolean;
  qrDetected: boolean;
  phase2Qr: { blockers: string[]; dependencyChain: string[] };
  tempFilesWritten: { unsignedXml: boolean; sdkConfig: boolean; sdkRuntime: boolean; signedXml: boolean; tempDirectory: string | null; filesRetained: boolean };
  cleanup: { performed: boolean; success: boolean; filesRetained: boolean; tempDirectory: string | null };
  blockers: string[];
  warnings: string[];
}

interface ZatcaEgsCsrPlanResponse {
  localOnly: true;
  dryRun: true;
  noMutation: true;
  productionCompliance: false;
  noCsidRequest: true;
  sdkCommand: string;
  requiredFields: Array<{ sdkConfigKey: string; currentValue: string | null; status: "AVAILABLE" | "MISSING" | "NEEDS_REVIEW" }>;
  missingValues: Array<{ sdkConfigKey: string; currentValue: string | null; status: "AVAILABLE" | "MISSING" | "NEEDS_REVIEW" }>;
  plannedFiles: { csrConfig: string; privateKey: string; generatedCsr: string };
  keyCustody: { mode: "MISSING" | "RAW_DATABASE_PEM"; privateKeyConfigured: boolean; privateKeyReturned: false };
  blockers: string[];
  warnings: string[];
}

interface ZatcaEgsCsrConfigPreviewResponse {
  localOnly: true;
  dryRun: true;
  noMutation: true;
  noCsidRequest: true;
  noNetwork: true;
  productionCompliance: false;
  canPrepareConfig: boolean;
  sanitizedConfigPreview: string;
  configEntries: Array<{ key: string; valuePreview: string | null; status: "AVAILABLE" | "MISSING" | "NEEDS_REVIEW" }>;
  missingFields: Array<{ key: string; status: "AVAILABLE" | "MISSING" | "NEEDS_REVIEW" }>;
  reviewFields: Array<{ key: string; status: "AVAILABLE" | "MISSING" | "NEEDS_REVIEW" }>;
  blockers: string[];
  warnings: string[];
}

interface ZatcaCsrConfigReview {
  id: string;
  egsUnitId: string;
  status: "DRAFT" | "APPROVED" | "SUPERSEDED" | "REVOKED";
  configHash: string;
  configPreviewRedacted: string;
  missingFieldsJson: unknown;
  blockersJson: unknown;
  approvedById?: string | null;
  approvedAt?: string | null;
  localOnly: true;
  noCsidRequest: true;
  noNetwork: true;
  sdkExecution: false;
  productionCompliance: false;
}

interface ZatcaEgsCsrDryRunResponse {
  localOnly: true;
  dryRun: true;
  noMutation: true;
  noCsidRequest: true;
  noNetwork: true;
  productionCompliance: false;
  configReviewRequired: true;
  latestReviewId: string | null;
  latestReviewStatus: "DRAFT" | "APPROVED" | "SUPERSEDED" | "REVOKED" | null;
  configApprovedForDryRun: boolean;
  warnings: string[];
}

interface ZatcaEgsCsrLocalGenerateResponse {
  localOnly: true;
  noMutation: true;
  noCsidRequest: true;
  noNetwork: true;
  noSigning: true;
  noPersistence: true;
  productionCompliance: false;
  executionEnabled: boolean;
  executionAttempted: boolean;
  executionSkipped: boolean;
  executionSkipReason: string | null;
  reviewId: string | null;
  latestReviewStatus: "DRAFT" | "APPROVED" | "SUPERSEDED" | "REVOKED" | null;
  configHash: string;
  tempFilesWritten: {
    csrConfig: boolean;
    privateKey: boolean;
    generatedCsr: boolean;
    tempDirectory: string | null;
    filesRetained: boolean;
  };
  cleanup: {
    performed: boolean;
    success: boolean;
    filesRetained: boolean;
    tempDirectory: string | null;
  };
  stdoutSummary: string;
  stderrSummary: string;
  sdkExitCode: number | null;
  generatedCsrDetected: boolean;
  privateKeyDetected: boolean;
  blockers: string[];
  warnings: string[];
}

interface ZatcaXmlFieldMappingResponse {
  warning: string;
  summary: {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
  };
  items: unknown[];
}

interface ZatcaEgsUnit {
  id: string;
  name: string;
  deviceSerialNumber: string;
  csrCommonName?: string | null;
  csrSerialNumber?: string | null;
  csrOrganizationUnitName?: string | null;
  csrInvoiceType?: string | null;
  csrLocationAddress?: string | null;
  status: string;
  isActive: boolean;
  hasCsr: boolean;
  hasComplianceCsid: boolean;
  hasProductionCsid?: boolean;
  hasPrivateKey?: boolean;
  keyCustodyMode?: "MISSING" | "RAW_DATABASE_PEM";
  certificateExpiryKnown?: boolean;
  certificateExpiresAt?: string | null;
  renewalStatus?: string;
  certificateRequestId?: string | null;
  lastIcv: number;
  lastInvoiceHash?: string | null;
  hashMode: "LOCAL_DETERMINISTIC" | "SDK_GENERATED";
}

interface ZatcaInvoiceMetadata {
  id: string;
  invoiceUuid: string;
  zatcaStatus: string;
  icv?: number | null;
  previousInvoiceHash?: string | null;
  invoiceHash?: string | null;
  hashModeSnapshot?: "LOCAL_DETERMINISTIC" | "SDK_GENERATED";
  qrCodeBase64?: string | null;
  xmlBase64?: string | null;
}

interface ZatcaQrResponse {
  qrCodeBase64: string;
}

interface ZatcaXmlValidationResult {
  localOnly: true;
  officialValidation: false;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ZatcaSdkReadinessResponse {
  enabled: boolean;
  referenceFolderFound: boolean;
  sdkJarFound: boolean;
  configDirFound: boolean;
  workingDirectoryWritable: boolean;
  supportedCommandsKnown: boolean;
  javaFound: boolean;
  detectedJavaVersion: string | null;
  javaSupported: boolean;
  requiredJavaRange: string;
  javaBinUsed: string;
  javaBlockerMessage: string | null;
  sdkCommand: string;
  canAttemptSdkValidation: boolean;
  canRunLocalValidation: boolean;
  blockingReasons: string[];
  warnings: string[];
  suggestedFixes: string[];
  hashMode?: {
    mode: "LOCAL_DETERMINISTIC" | "SDK_GENERATED";
    envValue: "local" | "sdk";
    sdkModeRequested: boolean;
    blockingReasons: string[];
    warnings: string[];
  };
  sdkHashModeBlocked?: boolean;
}

interface ZatcaSdkDryRunResponse {
  dryRun: true;
  localOnly: true;
  officialSdkValidation: false;
  commandPlan: {
    command: string | null;
    args: string[];
    warnings: string[];
  };
  warnings: string[];
}

interface ZatcaSdkValidationResponse {
  success: boolean;
  disabled: boolean;
  localOnly: true;
  officialValidationAttempted: boolean;
  sdkExitCode: number | null;
  sdkHash: string | null;
  appHash: string | null;
  hashMatches: boolean | null;
  hashComparisonStatus: "MATCH" | "MISMATCH" | "NOT_AVAILABLE" | "BLOCKED";
  stdoutSummary: string;
  stderrSummary: string;
  validationMessages: string[];
  blockingReasons: string[];
  warnings: string[];
}

interface ZatcaInvoiceHashCompareResponse {
  disabled: boolean;
  localOnly: true;
  noMutation: true;
  officialHashAttempted: boolean;
  sdkExitCode: number | null;
  sdkHash: string | null;
  appHash: string | null;
  hashMatches: boolean | null;
  hashComparisonStatus: "MATCH" | "MISMATCH" | "NOT_AVAILABLE" | "BLOCKED";
  blockingReasons: string[];
  warnings: string[];
  invoiceId: string;
  metadataId: string;
  previousInvoiceHash: string | null;
  icv: number | null;
  egsUnitId: string | null;
  egsHashMode: "LOCAL_DETERMINISTIC" | "SDK_GENERATED" | null;
  metadataHashModeSnapshot: "LOCAL_DETERMINISTIC" | "SDK_GENERATED" | null;
  hashMode: {
    mode: "LOCAL_DETERMINISTIC" | "SDK_GENERATED";
    envValue: "local" | "sdk";
  };
}

interface ZatcaHashChainResetPlanResponse {
  dryRunOnly: true;
  localOnly: true;
  noMutation: true;
  hashMode: {
    mode: "LOCAL_DETERMINISTIC" | "SDK_GENERATED";
    envValue: "local" | "sdk";
  };
  summary: {
    activeEgsUnitCount: number;
    invoicesWithMetadataCount: number;
    sdkModeEgsUnitCount: number;
    currentIcv: number | null;
    currentLastInvoiceHash: string | null;
  };
  egsUnits: Array<{
    id: string;
    hashMode: "LOCAL_DETERMINISTIC" | "SDK_GENERATED";
    metadataCount: number;
    canEnableSdkHashMode: boolean;
    enableSdkHashModeBlockers: string[];
  }>;
  resetRisks: string[];
  recommendedNextSteps: string[];
}

interface ZatcaSubmissionLog {
  id: string;
  invoiceMetadataId?: string | null;
  egsUnitId?: string | null;
  responseCode?: string | null;
  submissionType: string;
  status: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
  }
}

interface SmokeContext {
  token: string;
  organization: Organization;
  roleName: string;
  permissionCount: number;
}

async function main(): Promise<void> {
  const context = await loginAndSelectOrganization();
  const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const headers = tenantHeaders(context);

  const roles = await get<Role[]>("/roles", headers);
  for (const roleName of ["Owner", "Admin", "Accountant", "Sales", "Purchases", "Viewer"]) {
    assert(roles.some((role) => role.name === roleName && role.isSystem), `default role ${roleName} exists and is system-protected`);
  }
  const ownerRole = required(roles.find((role) => role.name === "Owner"), "Owner role");
  assert(ownerRole.permissions.includes("admin.fullAccess"), "Owner role includes admin.fullAccess");
  const viewerRole = required(roles.find((role) => role.name === "Viewer"), "Viewer role");
  const members = await get<OrganizationMember[]>("/organization-members", headers);
  assert(
    members.some((member) => member.user.email === seedEmail && member.role.name === "Owner" && member.status === "ACTIVE"),
    "seed user is an active Owner member",
  );

  const emailReadiness = await get<EmailReadinessResponse>("/email/readiness", headers);
  assertEqual(emailReadiness.provider, "mock", "email readiness provider");
  assert(emailReadiness.mockMode, "email readiness reports mock mode");
  assert(!emailReadiness.realSendingEnabled, "email readiness keeps real sending disabled");
  assert(!JSON.stringify(emailReadiness).includes("SMTP_PASSWORD"), "email readiness does not expose SMTP password");
  assert(!JSON.stringify(emailReadiness).includes("SMTP_SECRET"), "email readiness does not expose SMTP secret");
  const testEmailAddress = `smoke-test-send-${Date.now()}@example.com`;
  const testEmail = await post<EmailOutboxDetail>("/email/test-send", headers, { toEmail: testEmailAddress });
  assertEqual(testEmail.templateType, "TEST_EMAIL", "test-send template type");
  assertEqual(testEmail.status, "SENT_MOCK", "test-send uses mock delivery by default");
  assertEqual(testEmail.provider, "mock", "test-send records mock provider");
  const testEmailOutbox = await get<EmailOutboxEntry[]>("/email/outbox", headers);
  assert(
    testEmailOutbox.some((email) => email.id === testEmail.id && email.toEmail === testEmailAddress),
    "test-send email appears in outbox",
  );

  const invitedEmail = `smoke-invite-${Date.now()}@example.com`;
  const invitedPassword = `Invite${runId}!`;
  const invitedResetPassword = `Reset${runId}!`;
  const invite = await post<InviteOrganizationMemberResponse>("/organization-members/invite", headers, {
    email: invitedEmail,
    name: "Smoke Invite",
    roleId: viewerRole.id,
  });
  assertEqual(invite.member.status, "INVITED", "invited member status");
  assertPresent(invite.emailOutboxId, "invite email outbox id");
  assertPresent(invite.invitePreviewUrl, "mock invite preview URL");
  const inviteOutbox = await get<EmailOutboxEntry[]>("/email/outbox", headers);
  assert(
    inviteOutbox.some((email) => email.id === invite.emailOutboxId && email.templateType === "ORGANIZATION_INVITE" && email.status === "SENT_MOCK"),
    "invite email appears in mock outbox",
  );
  const inviteToken = required(new URL(invite.invitePreviewUrl!).searchParams.get("token"), "invite token from mock preview URL");
  const invitePreview = await get<InvitationPreviewResponse>(`/auth/invitations/${encodeURIComponent(inviteToken)}/preview`, {});
  assert(invitePreview.valid, "invite preview is valid");
  assertEqual(invitePreview.email, invitedEmail, "invite preview email");
  const inviteAccept = await post<LoginResponse>(`/auth/invitations/${encodeURIComponent(inviteToken)}/accept`, {}, {
    name: "Smoke Invited User",
    password: invitedPassword,
  });
  assertPresent(inviteAccept.accessToken, "invite acceptance access token");
  assertEqual(inviteAccept.organization?.id, context.organization.id, "invite acceptance organization");
  const invitedLogin = await post<LoginResponse>("/auth/login", {}, { email: invitedEmail, password: invitedPassword });
  const invitedMe = await get<AuthMeResponse>("/auth/me", { Authorization: `Bearer ${invitedLogin.accessToken}` });
  const invitedMembership = required(
    invitedMe.memberships.find((membership) => membership.organization.id === context.organization.id),
    "invited user membership",
  );
  assertEqual(invitedMembership.role.name, "Viewer", "invited user role");
  const invitedPermissions = normalizePermissionList(invitedMembership.role.permissions);
  assert(invitedPermissions.includes("organization.view"), "invited user has viewer permissions");
  const resetRequest = await post<{ message: string }>("/auth/password-reset/request", {}, { email: invitedEmail });
  assertEqual(resetRequest.message, "If an account exists, password reset instructions have been sent.", "password reset generic response");
  const resetOutbox = await get<EmailOutboxEntry[]>("/email/outbox", headers);
  const resetEmail = required(
    resetOutbox.find((email) => email.toEmail === invitedEmail && email.templateType === "PASSWORD_RESET"),
    "password reset outbox entry",
  );
  const resetEmailDetail = await get<EmailOutboxDetail>(`/email/outbox/${resetEmail.id}`, headers);
  const resetToken = extractTokenFromEmailBody(resetEmailDetail.bodyText);
  await post<{ message: string }>("/auth/password-reset/confirm", {}, { token: resetToken, password: invitedResetPassword });
  await expectHttpError("duplicate password reset token use", () =>
    post<{ message: string }>("/auth/password-reset/confirm", {}, { token: resetToken, password: `${invitedResetPassword}Again` }),
  );
  const resetLogin = await post<LoginResponse>("/auth/login", {}, { email: invitedEmail, password: invitedResetPassword });
  assertPresent(resetLogin.accessToken, "password reset login access token");

  const smokeRole = await post<Role>("/roles", headers, {
    name: `Smoke Reports Viewer ${runId}`,
    permissions: ["reports.view"],
  });
  assertEqual(smokeRole.permissions.length, 1, "smoke custom role permission count");
  assert(smokeRole.permissions.includes("reports.view"), "smoke custom role reports.view permission");
  await expectHttpError("unknown role permission", () =>
    post<Role>("/roles", headers, {
      name: `Smoke Invalid Role ${runId}`,
      permissions: ["reports.view", "unknown.permission"],
    }),
  );

  const documentSettings = await get<OrganizationDocumentSettings>("/organization-document-settings", headers);
  assertPresent(documentSettings.footerText, "document settings footer text");
  const patchedSettings = await patch<OrganizationDocumentSettings>("/organization-document-settings", headers, {
    footerText: documentSettings.footerText,
    primaryColor: documentSettings.primaryColor,
    accentColor: documentSettings.accentColor,
  });
  assertEqual(patchedSettings.footerText, documentSettings.footerText, "document settings patch footer text");

  const accounts = await get<Account[]>("/accounts", headers);
  const salesAccount = required(
    accounts.find((account) => account.code === "411" && account.allowPosting && account.isActive),
    "Sales revenue account code 411",
  );
  const expenseAccount = required(
    accounts.find((account) => account.code === "511" && account.allowPosting && account.isActive),
    "General expenses account code 511",
  );
  const inventoryAssetAccount = required(
    accounts.find((account) => account.code === "130" && account.type === "ASSET" && account.allowPosting && account.isActive),
    "Inventory asset account code 130",
  );
  const cogsAccount = required(
    accounts.find((account) => account.code === "611" && (account.type === "COST_OF_SALES" || account.type === "EXPENSE") && account.allowPosting && account.isActive),
    "Cost of Goods Sold account code 611",
  );
  const existingInventoryClearingAccount = accounts.find((account) => account.code === "240");
  const inventoryClearingAccount = existingInventoryClearingAccount
    ? await patch<Account>(`/accounts/${existingInventoryClearingAccount.id}`, headers, {
        name: "Inventory Clearing",
        type: "LIABILITY",
        allowPosting: true,
        isActive: true,
      })
    : await post<Account>("/accounts", headers, {
        code: "240",
        name: "Inventory Clearing",
        type: "LIABILITY",
        allowPosting: true,
        isActive: true,
      });
  assert(inventoryClearingAccount.id !== inventoryAssetAccount.id, "inventory clearing account is separate from inventory asset");
  const paidThroughAccount =
    accounts.find((account) => account.code === "112" && account.allowPosting && account.isActive) ??
    accounts.find((account) => account.code === "111" && account.allowPosting && account.isActive);
  required(paidThroughAccount, "Bank Account code 112 or Cash code 111");
  const bankAccounts = await get<BankAccountSummary[]>("/bank-accounts", headers);
  assert(
    bankAccounts.some((profile) => profile.account.code === "111" && profile.displayName === "Cash" && profile.status === "ACTIVE"),
    "default Cash bank account profile exists",
  );
  assert(
    bankAccounts.some((profile) => profile.account.code === "112" && profile.displayName === "Bank Account" && profile.status === "ACTIVE"),
    "default Bank Account profile exists",
  );
  const paidThroughBankProfile = required(
    bankAccounts.find((profile) => profile.accountId === paidThroughAccount!.id),
    "bank account profile for paid-through account",
  );
  const defaultCashProfile = required(
    bankAccounts.find((profile) => profile.account.code === "111" && profile.status === "ACTIVE"),
    "default active Cash bank account profile",
  );
  const defaultBankProfile = required(
    bankAccounts.find((profile) => profile.account.code === "112" && profile.status === "ACTIVE"),
    "default active Bank Account profile",
  );

  const inventorySettings = await get<InventorySettings>("/inventory/settings", headers);
  assertEqual(inventorySettings.valuationMethod, "MOVING_AVERAGE", "inventory settings default moving-average valuation");
  const patchedInventorySettings = await patch<InventorySettings>("/inventory/settings", headers, {
    valuationMethod: "MOVING_AVERAGE",
    allowNegativeStock: false,
    trackInventoryValue: true,
  });
  assertEqual(patchedInventorySettings.valuationMethod, "MOVING_AVERAGE", "inventory settings patched valuation method");
  assertEqual(patchedInventorySettings.allowNegativeStock, false, "inventory settings negative stock blocked");
  assertEqual(patchedInventorySettings.trackInventoryValue, true, "inventory settings value tracking enabled");
  const defaultInventoryAccountingSettings = await get<InventoryAccountingSettings>("/inventory/accounting-settings", headers);
  assertEqual(defaultInventoryAccountingSettings.previewOnly, true, "inventory accounting settings are preview-only");
  assertEqual(defaultInventoryAccountingSettings.noAutomaticPosting, true, "inventory accounting settings do not enable automatic posting");
  const disabledInventoryAccountingSettings = await patch<InventoryAccountingSettings>("/inventory/accounting-settings", headers, {
    valuationMethod: "MOVING_AVERAGE",
    enableInventoryAccounting: false,
  });
  assertEqual(disabledInventoryAccountingSettings.enableInventoryAccounting, false, "inventory accounting disabled before manual COGS smoke");
  const patchedInventoryAccountingSettings = await patch<InventoryAccountingSettings>("/inventory/accounting-settings", headers, {
    valuationMethod: "MOVING_AVERAGE",
    enableInventoryAccounting: true,
    inventoryAssetAccountId: inventoryAssetAccount.id,
    cogsAccountId: cogsAccount.id,
    inventoryClearingAccountId: inventoryClearingAccount.id,
    inventoryAdjustmentGainAccountId: salesAccount.id,
    inventoryAdjustmentLossAccountId: expenseAccount.id,
    purchaseReceiptPostingMode: "PREVIEW_ONLY",
  });
  assertEqual(patchedInventoryAccountingSettings.enableInventoryAccounting, true, "inventory accounting manually enabled for COGS posting smoke");
  assertEqual(patchedInventoryAccountingSettings.inventoryAssetAccountId, inventoryAssetAccount.id, "inventory asset account mapping patched");
  assertEqual(patchedInventoryAccountingSettings.cogsAccountId, cogsAccount.id, "COGS account mapping patched");
  assertEqual(patchedInventoryAccountingSettings.inventoryClearingAccountId, inventoryClearingAccount.id, "inventory clearing account mapping patched");
  assertEqual(patchedInventoryAccountingSettings.purchaseReceiptPostingMode, "PREVIEW_ONLY", "purchase receipt posting mode patched preview-only");
  assertEqual(patchedInventoryAccountingSettings.previewOnly, true, "patched inventory accounting settings remain preview-only");
  const journalEntriesBeforePurchaseReceiptReadiness = await get<JournalEntry[]>("/journal-entries", headers);
  const purchaseReceiptPostingReadiness = await get<PurchaseReceiptPostingReadiness>(
    "/inventory/purchase-receipt-posting-readiness",
    headers,
  );
  assertEqual(purchaseReceiptPostingReadiness.ready, false, "purchase receipt posting readiness remains no-go");
  assertEqual(purchaseReceiptPostingReadiness.canEnablePosting, false, "purchase receipt posting readiness cannot enable posting yet");
  assertPresent(purchaseReceiptPostingReadiness.requiredAccounts.inventoryAssetAccount, "purchase receipt readiness inventory asset account");
  assertPresent(purchaseReceiptPostingReadiness.requiredAccounts.inventoryClearingAccount, "purchase receipt readiness inventory clearing account");
  assertPresent(purchaseReceiptPostingReadiness.existingBillsInDirectModeCount, "purchase receipt readiness direct-mode bill count");
  assertPresent(purchaseReceiptPostingReadiness.billsUsingInventoryClearingCount, "purchase receipt readiness clearing-mode bill count");
  assert(
    purchaseReceiptPostingReadiness.warnings.some((warning) => warning.includes("explicit manual post action")),
    "purchase receipt posting readiness includes manual posting warning",
  );
  assert(
    purchaseReceiptPostingReadiness.warnings.some((warning) => warning.includes("purchase bills to use inventory clearing mode")),
    "purchase receipt posting readiness includes bill clearing mode warning",
  );
  assert(
    purchaseReceiptPostingReadiness.warnings.some((warning) => warning.includes("Manual purchase receipt inventory asset posting is available")),
    "purchase receipt posting readiness reports clearing bill finalization availability",
  );
  assert(
    purchaseReceiptPostingReadiness.blockingReasons.some((reason) => reason.includes("Automatic purchase receipt GL posting is not enabled")),
    "purchase receipt posting readiness remains blocked for automatic receipt posting",
  );
  const journalEntriesAfterPurchaseReceiptReadiness = await get<JournalEntry[]>("/journal-entries", headers);
  assertEqual(
    journalEntriesAfterPurchaseReceiptReadiness.length,
    journalEntriesBeforePurchaseReceiptReadiness.length,
    "purchase receipt posting readiness does not create journal entries",
  );

  const warehouses = await get<Warehouse[]>("/warehouses", headers);
  const mainWarehouse = required(
    warehouses.find((warehouse) => warehouse.code === "MAIN" && warehouse.status === "ACTIVE" && warehouse.isDefault),
    "default active MAIN warehouse",
  );
  const secondWarehouse = await post<Warehouse>("/warehouses", headers, {
    code: `SMK${runId.slice(-6)}`,
    name: `Smoke Transfer Warehouse ${runId}`,
    countryCode: "SA",
  });
  assertEqual(secondWarehouse.status, "ACTIVE", "second smoke warehouse active");
  const inventoryItem = await post<Item>("/items", headers, {
    name: `Smoke Inventory Item ${runId}`,
    sku: `SMKINV-${runId}`,
    type: "PRODUCT",
    status: "ACTIVE",
    sellingPrice: "25.0000",
    revenueAccountId: salesAccount.id,
    purchaseCost: "4.0000",
    expenseAccountId: expenseAccount.id,
    inventoryTracking: true,
    reorderPoint: "15.0000",
    reorderQuantity: "6.0000",
  });
  assertEqual(inventoryItem.inventoryTracking, true, "inventory smoke item tracking enabled");
  assertMoney(inventoryItem.reorderPoint, money("15.0000"), "inventory smoke item reorder point");
  const journalEntriesBeforeInventory = await get<JournalEntry[]>("/journal-entries", headers);
  const balanceFor = async (warehouse: Warehouse) => {
    const balances = await get<InventoryBalance[]>(
      `/inventory/balances?itemId=${encodeURIComponent(inventoryItem.id)}&warehouseId=${encodeURIComponent(warehouse.id)}`,
      headers,
    );
    return required(
      balances.find((balance) => balance.item.id === inventoryItem.id && balance.warehouse.id === warehouse.id),
      `inventory balance for smoke tracked item in ${warehouse.code}`,
    );
  };
  const openingStock = await post<StockMovement>("/stock-movements", headers, {
    itemId: inventoryItem.id,
    warehouseId: mainWarehouse.id,
    movementDate: new Date().toISOString(),
    type: "OPENING_BALANCE",
    quantity: "10.0000",
    unitCost: "4.0000",
    description: "Smoke opening stock",
  });
  assertEqual(openingStock.type, "OPENING_BALANCE", "opening stock movement type");
  assertMoney((await balanceFor(mainWarehouse)).quantityOnHand, money("10.0000"), "inventory quantity after opening balance");
  const draftIncreaseAdjustment = await post<InventoryAdjustment>("/inventory-adjustments", headers, {
    itemId: inventoryItem.id,
    warehouseId: mainWarehouse.id,
    adjustmentDate: new Date().toISOString(),
    type: "INCREASE",
    quantity: "2.0000",
    unitCost: "4.5000",
    reason: "Smoke adjustment increase",
  });
  assertEqual(draftIncreaseAdjustment.status, "DRAFT", "increase adjustment draft status");
  const approvedIncreaseAdjustment = await post<InventoryAdjustment>(`/inventory-adjustments/${draftIncreaseAdjustment.id}/approve`, headers, {});
  assertEqual(approvedIncreaseAdjustment.status, "APPROVED", "increase adjustment approved status");
  assertPresent(approvedIncreaseAdjustment.stockMovementId, "approved increase adjustment stock movement");
  assertMoney((await balanceFor(mainWarehouse)).quantityOnHand, money("12.0000"), "inventory quantity after approved increase adjustment");
  const warehouseTransfer = await post<WarehouseTransfer>("/warehouse-transfers", headers, {
    itemId: inventoryItem.id,
    fromWarehouseId: mainWarehouse.id,
    toWarehouseId: secondWarehouse.id,
    transferDate: new Date().toISOString(),
    quantity: "4.0000",
    unitCost: "4.2500",
    description: "Smoke warehouse transfer",
  });
  assertEqual(warehouseTransfer.status, "POSTED", "warehouse transfer posted status");
  assertPresent(warehouseTransfer.fromStockMovementId, "warehouse transfer source movement");
  assertPresent(warehouseTransfer.toStockMovementId, "warehouse transfer destination movement");
  assertMoney((await balanceFor(mainWarehouse)).quantityOnHand, money("8.0000"), "main warehouse quantity after transfer out");
  assertMoney((await balanceFor(secondWarehouse)).quantityOnHand, money("4.0000"), "second warehouse quantity after transfer in");
  const voidedWarehouseTransfer = await post<WarehouseTransfer>(`/warehouse-transfers/${warehouseTransfer.id}/void`, headers, {});
  assertEqual(voidedWarehouseTransfer.status, "VOIDED", "warehouse transfer voided status");
  assertPresent(voidedWarehouseTransfer.voidFromStockMovementId, "voided warehouse transfer source reversal movement");
  assertPresent(voidedWarehouseTransfer.voidToStockMovementId, "voided warehouse transfer destination reversal movement");
  assertMoney((await balanceFor(mainWarehouse)).quantityOnHand, money("12.0000"), "main warehouse quantity after transfer void");
  assertMoney((await balanceFor(secondWarehouse)).quantityOnHand, money("0.0000"), "second warehouse quantity after transfer void");
  const draftDecreaseAdjustment = await post<InventoryAdjustment>("/inventory-adjustments", headers, {
    itemId: inventoryItem.id,
    warehouseId: mainWarehouse.id,
    adjustmentDate: new Date().toISOString(),
    type: "DECREASE",
    quantity: "3.0000",
    unitCost: "4.2500",
    reason: "Smoke adjustment decrease",
  });
  assertEqual(draftDecreaseAdjustment.status, "DRAFT", "decrease adjustment draft status");
  const approvedDecreaseAdjustment = await post<InventoryAdjustment>(`/inventory-adjustments/${draftDecreaseAdjustment.id}/approve`, headers, {});
  assertEqual(approvedDecreaseAdjustment.status, "APPROVED", "decrease adjustment approved status");
  assertPresent(approvedDecreaseAdjustment.stockMovementId, "approved decrease adjustment stock movement");
  assertMoney((await balanceFor(mainWarehouse)).quantityOnHand, money("9.0000"), "main warehouse quantity after approved decrease adjustment");
  const voidedDecreaseAdjustment = await post<InventoryAdjustment>(`/inventory-adjustments/${approvedDecreaseAdjustment.id}/void`, headers, {});
  assertEqual(voidedDecreaseAdjustment.status, "VOIDED", "decrease adjustment voided status");
  assertPresent(voidedDecreaseAdjustment.voidStockMovementId, "voided decrease adjustment reversal movement");
  const inventoryBalance = await balanceFor(mainWarehouse);
  assertMoney(inventoryBalance.quantityOnHand, money("12.0000"), "main warehouse quantity after decrease adjustment void");
  const inventoryReportDate = isoDate(new Date());
  const stockValuationReport = await get<InventoryStockValuationReport>(
    `/inventory/reports/stock-valuation?itemId=${encodeURIComponent(inventoryItem.id)}&warehouseId=${encodeURIComponent(mainWarehouse.id)}`,
    headers,
  );
  const stockValuationRow = required(
    stockValuationReport.rows.find((row) => row.item.id === inventoryItem.id && row.warehouse.id === mainWarehouse.id),
    "stock valuation row for smoke item",
  );
  assertMoney(stockValuationRow.quantityOnHand, money("12.0000"), "stock valuation quantity on hand");
  assertPresent(stockValuationRow.averageUnitCost, "stock valuation average unit cost");
  assertPresent(stockValuationRow.estimatedValue, "stock valuation estimated value");
  assertPresent(stockValuationReport.grandTotalEstimatedValue, "stock valuation grand total estimated value");
  const movementSummaryReport = await get<InventoryMovementSummaryReport>(
    `/inventory/reports/movement-summary?from=${inventoryReportDate}&to=${inventoryReportDate}&itemId=${encodeURIComponent(inventoryItem.id)}&warehouseId=${encodeURIComponent(mainWarehouse.id)}`,
    headers,
  );
  const movementSummaryRow = required(
    movementSummaryReport.rows.find((row) => row.item.id === inventoryItem.id && row.warehouse.id === mainWarehouse.id),
    "movement summary row for smoke item",
  );
  assertMoney(movementSummaryRow.closingQuantity, money("12.0000"), "movement summary closing quantity");
  assert(money(movementSummaryRow.inboundQuantity).gt(0), "movement summary includes inbound quantity");
  assert(money(movementSummaryRow.outboundQuantity).gt(0), "movement summary includes outbound quantity");
  assert(movementSummaryRow.movementCount >= 6, "movement summary includes inventory operation movements");
  const lowStockReport = await get<InventoryLowStockReport>("/inventory/reports/low-stock", headers);
  const lowStockRow = required(
    lowStockReport.rows.find((row) => row.item.id === inventoryItem.id),
    "low-stock row for smoke item",
  );
  assertMoney(lowStockRow.quantityOnHand, money("12.0000"), "low-stock quantity on hand");
  assertMoney(lowStockRow.reorderPoint, money("15.0000"), "low-stock reorder point");
  assert(lowStockReport.totalItems >= 1, "low-stock report returns report shape");
  const stockMovementList = await get<StockMovement[]>(
    `/stock-movements?itemId=${encodeURIComponent(inventoryItem.id)}&warehouseId=${encodeURIComponent(mainWarehouse.id)}`,
    headers,
  );
  assert(stockMovementList.length >= 6, "stock movements list includes opening, adjustments, transfer, and reversals");
  const journalEntriesAfterInventory = await get<JournalEntry[]>("/journal-entries", headers);
  assertEqual(
    journalEntriesAfterInventory.length,
    journalEntriesBeforeInventory.length,
    "inventory adjustments and transfers do not create journal entries",
  );

  const receivingSupplier = await post<Contact>("/contacts", headers, {
    type: "SUPPLIER",
    name: `Smoke Inventory Supplier ${runId}`,
    displayName: `Smoke Inventory Supplier ${runId}`,
    countryCode: "SA",
  });
  const issuingCustomer = await post<Contact>("/contacts", headers, {
    type: "CUSTOMER",
    name: `Smoke Inventory Customer ${runId}`,
    displayName: `Smoke Inventory Customer ${runId}`,
    countryCode: "SA",
  });
  const purchaseOrderForReceipt = await post<PurchaseOrder>("/purchase-orders", headers, {
    supplierId: receivingSupplier.id,
    orderDate: new Date().toISOString(),
    currency: "SAR",
    lines: [
      {
        itemId: inventoryItem.id,
        description: "Smoke inventory receiving line",
        accountId: expenseAccount.id,
        quantity: "5.0000",
        unitPrice: "4.0000",
      },
    ],
  });
  const approvedReceivingPo = await post<PurchaseOrder>(`/purchase-orders/${purchaseOrderForReceipt.id}/approve`, headers, {});
  assertEqual(approvedReceivingPo.status, "APPROVED", "purchase order approved for inventory receiving");
  const sentReceivingPo = await post<PurchaseOrder>(`/purchase-orders/${purchaseOrderForReceipt.id}/mark-sent`, headers, {});
  assertEqual(sentReceivingPo.status, "SENT", "purchase order sent for inventory receiving");
  const poReceivingStatus = await get<PurchaseReceivingStatus>(`/purchase-orders/${purchaseOrderForReceipt.id}/receiving-status`, headers);
  assertEqual(poReceivingStatus.status, "NOT_STARTED", "purchase order receiving status starts not started");
  assert(
    poReceivingStatus.lines.some((line) => line.inventoryTracking && money(line.remainingQuantity).gt(0)),
    "purchase order has a receivable inventory line",
  );
  const purchaseBillForReceipt = await post<PurchaseBill>("/purchase-bills", headers, {
    supplierId: receivingSupplier.id,
    billDate: new Date().toISOString(),
    currency: "SAR",
    notes: "Smoke inventory bill for receipt matching",
    lines: [
      {
        itemId: inventoryItem.id,
        description: "Smoke inventory bill/receipt matching line",
        accountId: inventoryAssetAccount.id,
        quantity: "5.0000",
        unitPrice: "4.0000",
      },
    ],
  });
  assertEqual(purchaseBillForReceipt.status, "DRAFT", "purchase bill for receipt matching created as draft");
  const journalEntriesBeforePurchaseBillDirectPreview = await get<JournalEntry[]>("/journal-entries", headers);
  const directPurchaseBillPreview = await get<PurchaseBillAccountingPreview>(
    `/purchase-bills/${purchaseBillForReceipt.id}/accounting-preview`,
    headers,
  );
  assertEqual(directPurchaseBillPreview.previewOnly, true, "direct purchase bill accounting preview is preview-only");
  assertEqual(
    directPurchaseBillPreview.inventoryPostingMode,
    "DIRECT_EXPENSE_OR_ASSET",
    "direct purchase bill accounting preview reports direct mode",
  );
  assertEqual(directPurchaseBillPreview.canFinalize, true, "direct purchase bill accounting preview can finalize");
  assert(
    directPurchaseBillPreview.journal.lines.some(
      (line) => line.side === "DEBIT" && line.accountCode === inventoryAssetAccount.code && money(line.amount).eq("20.0000"),
    ),
    "direct purchase bill preview includes debit selected line account",
  );
  assert(
    directPurchaseBillPreview.journal.lines.some((line) => line.side === "CREDIT" && line.accountCode === "210" && money(line.amount).eq("20.0000")),
    "direct purchase bill preview includes credit accounts payable",
  );
  const journalEntriesAfterPurchaseBillDirectPreview = await get<JournalEntry[]>("/journal-entries", headers);
  assertEqual(
    journalEntriesAfterPurchaseBillDirectPreview.length,
    journalEntriesBeforePurchaseBillDirectPreview.length,
    "direct purchase bill accounting preview does not create journal entries",
  );
  const clearingModePurchaseBill = await post<PurchaseBill>("/purchase-bills", headers, {
    supplierId: receivingSupplier.id,
    billDate: new Date().toISOString(),
    currency: "SAR",
    notes: "Smoke inventory clearing mode preview bill",
    inventoryPostingMode: "INVENTORY_CLEARING",
    lines: [
      {
        itemId: inventoryItem.id,
        description: "Smoke inventory clearing mode line",
        accountId: inventoryAssetAccount.id,
        quantity: "2.0000",
        unitPrice: "4.0000",
      },
    ],
  });
  assertEqual(clearingModePurchaseBill.status, "DRAFT", "inventory clearing mode purchase bill is draft");
  assertEqual(
    clearingModePurchaseBill.inventoryPostingMode,
    "INVENTORY_CLEARING",
    "inventory clearing mode purchase bill stores selected posting mode",
  );
  const journalEntriesBeforePurchaseBillClearingPreview = await get<JournalEntry[]>("/journal-entries", headers);
  const clearingPurchaseBillPreview = await get<PurchaseBillAccountingPreview>(
    `/purchase-bills/${clearingModePurchaseBill.id}/accounting-preview`,
    headers,
  );
  assertEqual(clearingPurchaseBillPreview.previewOnly, true, "inventory clearing purchase bill preview is preview-only");
  assertEqual(clearingPurchaseBillPreview.inventoryPostingMode, "INVENTORY_CLEARING", "inventory clearing purchase bill preview reports clearing mode");
  assertEqual(clearingPurchaseBillPreview.canFinalize, true, "inventory clearing purchase bill preview can finalize");
  assert(
    clearingPurchaseBillPreview.journal.lines.some(
      (line) => line.side === "DEBIT" && line.accountCode === inventoryClearingAccount.code && money(line.amount).eq("8.0000"),
    ),
    "inventory clearing purchase bill preview debits inventory clearing",
  );
  assertEqual(clearingPurchaseBillPreview.blockingReasons.length, 0, "inventory clearing purchase bill preview has no blockers");
  const journalEntriesAfterPurchaseBillClearingPreview = await get<JournalEntry[]>("/journal-entries", headers);
  assertEqual(
    journalEntriesAfterPurchaseBillClearingPreview.length,
    journalEntriesBeforePurchaseBillClearingPreview.length,
    "inventory clearing purchase bill accounting preview does not create journal entries",
  );
  const finalizedClearingModePurchaseBill = await post<PurchaseBill>(`/purchase-bills/${clearingModePurchaseBill.id}/finalize`, headers, {});
  assertEqual(finalizedClearingModePurchaseBill.status, "FINALIZED", "inventory clearing mode purchase bill finalizes");
  const clearingBillJournalEntryId = required(
    finalizedClearingModePurchaseBill.journalEntryId,
    "inventory clearing mode purchase bill journalEntryId",
  );
  const clearingBillJournal = await get<JournalEntry>(`/journal-entries/${clearingBillJournalEntryId}`, headers);
  assert(
    clearingBillJournal.lines?.some(
      (line) => line.account?.code === inventoryClearingAccount.code && money(line.debit).eq("8.0000") && money(line.credit).eq(0),
    ),
    "inventory clearing purchase bill journal debits inventory clearing",
  );
  assert(
    clearingBillJournal.lines?.some((line) => line.account?.code === "210" && money(line.credit).eq("8.0000") && money(line.debit).eq(0)),
    "inventory clearing purchase bill journal credits accounts payable",
  );
  const purchaseReceiptPostingReadinessAfterClearingBill = await get<PurchaseReceiptPostingReadiness>(
    "/inventory/purchase-receipt-posting-readiness",
    headers,
  );
  assertEqual(purchaseReceiptPostingReadinessAfterClearingBill.ready, false, "purchase receipt posting readiness remains no-go after clearing bill");
  assertEqual(
    purchaseReceiptPostingReadinessAfterClearingBill.compatibleBillPostingModeExists,
    true,
    "purchase receipt posting readiness sees compatible bill mode groundwork",
  );
  const finalizedPurchaseBillForReceipt = await post<PurchaseBill>(`/purchase-bills/${purchaseBillForReceipt.id}/finalize`, headers, {});
  assertEqual(finalizedPurchaseBillForReceipt.status, "FINALIZED", "purchase bill finalized for receipt matching");
  assertPresent(finalizedPurchaseBillForReceipt.journalEntryId, "purchase bill for receipt matching AP journal");
  const directPurchaseBillJournal = await get<JournalEntry>(
    `/journal-entries/${required(finalizedPurchaseBillForReceipt.journalEntryId, "direct purchase bill journalEntryId")}`,
    headers,
  );
  assert(
    directPurchaseBillJournal.lines?.some(
      (line) => line.account?.code === inventoryAssetAccount.code && money(line.debit).eq("20.0000") && money(line.credit).eq(0),
    ),
    "direct purchase bill finalization keeps selected line account debit",
  );
  assert(
    !directPurchaseBillJournal.lines?.some((line) => line.account?.code === inventoryClearingAccount.code && money(line.debit).gt(0)),
    "direct purchase bill finalization does not debit inventory clearing",
  );
  const billReceivingStatus = await get<PurchaseReceivingStatus>(`/purchase-bills/${finalizedPurchaseBillForReceipt.id}/receiving-status`, headers);
  assertEqual(billReceivingStatus.status, "NOT_STARTED", "purchase bill receiving status starts not started");
  const billReceivableLine = required(
    billReceivingStatus.lines.find((line) => line.inventoryTracking && money(line.remainingQuantity).gt(0)),
    "purchase bill receivable inventory line",
  );

  const salesInvoiceForIssue = await post<SalesInvoice>("/sales-invoices", headers, {
    customerId: issuingCustomer.id,
    issueDate: new Date().toISOString(),
    dueDate: new Date().toISOString(),
    currency: "SAR",
    lines: [
      {
        itemId: inventoryItem.id,
        description: "Smoke inventory issue line",
        accountId: salesAccount.id,
        quantity: "3.0000",
        unitPrice: "25.0000",
      },
    ],
  });
  const finalizedIssueInvoice = await post<SalesInvoice>(`/sales-invoices/${salesInvoiceForIssue.id}/finalize`, headers, {});
  assertEqual(finalizedIssueInvoice.status, "FINALIZED", "sales invoice finalized for stock issue");
  assertPresent(finalizedIssueInvoice.journalEntryId, "sales invoice journal for AR posting before stock issue");

  const journalEntriesBeforeReceiptIssue = await get<JournalEntry[]>("/journal-entries", headers);
  const purchaseReceipt = await post<PurchaseReceipt>("/purchase-receipts", headers, {
    purchaseBillId: finalizedPurchaseBillForReceipt.id,
    warehouseId: mainWarehouse.id,
    receiptDate: new Date().toISOString(),
    notes: "Smoke operational purchase receipt from finalized bill",
    lines: [{ purchaseBillLineId: billReceivableLine.lineId, quantity: "5.0000", unitCost: "4.0000" }],
  });
  assertEqual(purchaseReceipt.status, "POSTED", "purchase receipt posted status");
  assertPresent(purchaseReceipt.lines?.[0]?.stockMovementId, "purchase receipt stock movement");
  assertMoney((await balanceFor(mainWarehouse)).quantityOnHand, money("17.0000"), "main warehouse quantity after purchase receipt");
  const billReceivingStatusAfterReceipt = await get<PurchaseReceivingStatus>(`/purchase-bills/${finalizedPurchaseBillForReceipt.id}/receiving-status`, headers);
  assertEqual(billReceivingStatusAfterReceipt.status, "COMPLETE", "purchase bill receiving status complete after receipt");
  const purchaseReceiptAccountingPreview = await get<PurchaseReceiptAccountingPreview>(
    `/purchase-receipts/${purchaseReceipt.id}/accounting-preview`,
    headers,
  );
  assertEqual(purchaseReceiptAccountingPreview.previewOnly, true, "purchase receipt accounting preview is preview-only");
  assertEqual(purchaseReceiptAccountingPreview.canPost, false, "purchase receipt accounting preview cannot post");
  assertEqual(purchaseReceiptAccountingPreview.alreadyPosted, false, "purchase receipt accounting preview starts unposted");
  assertEqual(purchaseReceiptAccountingPreview.alreadyReversed, false, "purchase receipt accounting preview starts unreversed");
  assertEqual(purchaseReceiptAccountingPreview.postingMode, "PREVIEW_ONLY", "purchase receipt accounting preview reports preview-only posting mode");
  assertEqual(
    purchaseReceiptAccountingPreview.linkedBill?.inventoryPostingMode,
    "DIRECT_EXPENSE_OR_ASSET",
    "direct-mode purchase receipt preview reports linked bill mode",
  );
  assertEqual(purchaseReceiptAccountingPreview.matchingSummary.sourceType, "purchaseBill", "purchase receipt preview is matched to a purchase bill");
  assertMoney(purchaseReceiptAccountingPreview.receiptValue, money("20.0000"), "purchase receipt preview receipt value");
  assertMoney(purchaseReceiptAccountingPreview.matchedBillValue, money("20.0000"), "purchase receipt preview matched bill value");
  assertMoney(purchaseReceiptAccountingPreview.valueDifference, money("0.0000"), "purchase receipt preview value difference");
  assertMoney(purchaseReceiptAccountingPreview.matchingSummary.matchedQuantity, money("5.0000"), "purchase receipt preview matched quantity");
  assert(
    purchaseReceiptAccountingPreview.blockingReasons.some((reason) =>
      reason.includes("Purchase receipt asset posting requires a finalized INVENTORY_CLEARING purchase bill"),
    ),
    "direct-mode purchase receipt preview blocks receipt asset posting",
  );
  assert(
    purchaseReceiptAccountingPreview.warnings.some((warning) => warning.includes("explicit manual action")),
    "purchase receipt preview includes manual posting warning",
  );
  assert(
    purchaseReceiptAccountingPreview.journal.lines.some(
      (line) => line.side === "DEBIT" && line.accountCode === inventoryAssetAccount.code && money(line.amount).eq("20.0000"),
    ),
    "purchase receipt preview includes debit inventory asset line",
  );
  assert(
    purchaseReceiptAccountingPreview.journal.lines.some(
      (line) => line.side === "CREDIT" && line.accountCode === inventoryClearingAccount.code && money(line.amount).eq("20.0000"),
    ),
    "purchase receipt preview includes credit inventory clearing line",
  );
  assert(
    purchaseReceiptAccountingPreview.journalPreview.some((line) => line.side === "CREDIT" && line.accountCode === inventoryClearingAccount.code),
    "purchase receipt preview top-level journalPreview includes inventory clearing",
  );
  const billReceiptMatchingStatus = await get<PurchaseBillReceiptMatchingStatus>(
    `/purchase-bills/${finalizedPurchaseBillForReceipt.id}/receipt-matching-status`,
    headers,
  );
  assertEqual(billReceiptMatchingStatus.status, "FULLY_RECEIVED", "purchase bill receipt matching status fully received");
  assertEqual(billReceiptMatchingStatus.receiptCount, 1, "purchase bill receipt matching status receipt count");
  assertMoney(billReceiptMatchingStatus.receiptValue, money("20.0000"), "purchase bill receipt matching receipt value");
  assert(
    billReceiptMatchingStatus.lines.some(
      (line) => money(line.receivedQuantity).eq("5.0000") && money(line.remainingQuantity).eq("0.0000") && money(line.valueDifference).eq("0.0000"),
    ),
    "purchase bill receipt matching includes matched quantity and value",
  );
  const journalEntriesAfterPurchaseReceiptPreview = await get<JournalEntry[]>("/journal-entries", headers);
  assertEqual(
    journalEntriesAfterPurchaseReceiptPreview.length,
    journalEntriesBeforeReceiptIssue.length,
    "purchase receipt accounting preview does not create journal entries",
  );

  const invoiceIssueStatus = await get<SalesInvoiceStockIssueStatus>(`/sales-invoices/${salesInvoiceForIssue.id}/stock-issue-status`, headers);
  assertEqual(invoiceIssueStatus.status, "NOT_STARTED", "sales invoice stock issue status starts not started");
  const issuableLine = required(
    invoiceIssueStatus.lines.find((line) => line.inventoryTracking && money(line.remainingQuantity).gt(0)),
    "sales invoice issuable inventory line",
  );
  const salesStockIssue = await post<SalesStockIssue>("/sales-stock-issues", headers, {
    salesInvoiceId: salesInvoiceForIssue.id,
    warehouseId: mainWarehouse.id,
    issueDate: new Date().toISOString(),
    notes: "Smoke operational sales stock issue",
    lines: [{ salesInvoiceLineId: issuableLine.lineId, quantity: "3.0000" }],
  });
  assertEqual(salesStockIssue.status, "POSTED", "sales stock issue posted status");
  assertPresent(salesStockIssue.lines?.[0]?.stockMovementId, "sales stock issue stock movement");
  assertMoney((await balanceFor(mainWarehouse)).quantityOnHand, money("14.0000"), "main warehouse quantity after sales stock issue");
  const invoiceIssueStatusAfterIssue = await get<SalesInvoiceStockIssueStatus>(`/sales-invoices/${salesInvoiceForIssue.id}/stock-issue-status`, headers);
  assertEqual(invoiceIssueStatusAfterIssue.status, "COMPLETE", "sales invoice stock issue status complete after issue");
  const salesStockIssueAccountingPreview = await get<SalesStockIssueAccountingPreview>(
    `/sales-stock-issues/${salesStockIssue.id}/accounting-preview`,
    headers,
  );
  assertEqual(salesStockIssueAccountingPreview.previewOnly, true, "sales stock issue accounting preview is preview-only");
  assertEqual(salesStockIssueAccountingPreview.canPost, true, "sales stock issue accounting preview can be posted manually");
  assertEqual(salesStockIssueAccountingPreview.alreadyPosted, false, "sales stock issue COGS preview starts unposted");
  assert(
    salesStockIssueAccountingPreview.warnings.some((warning) => warning.includes("affects financial reports")),
    "sales issue preview includes financial report warning",
  );
  assert(
    salesStockIssueAccountingPreview.lines.some((line) => line.estimatedCOGS !== null && money(line.estimatedCOGS).gt(0)),
    "sales issue preview includes estimated COGS",
  );
  assert(
    salesStockIssueAccountingPreview.journal.lines.some(
      (line) => line.side === "DEBIT" && line.accountCode === cogsAccount.code && money(line.amount).gt(0),
    ),
    "sales issue preview includes debit COGS line",
  );
  assert(
    salesStockIssueAccountingPreview.journal.lines.some(
      (line) => line.side === "CREDIT" && line.accountCode === inventoryAssetAccount.code && money(line.amount).gt(0),
    ),
    "sales issue preview includes credit inventory asset line",
  );
  const estimatedCogs = money(salesStockIssueAccountingPreview.journal.totalDebit);
  const journalEntriesAfterSalesIssuePreview = await get<JournalEntry[]>("/journal-entries", headers);
  assertEqual(
    journalEntriesAfterSalesIssuePreview.length,
    journalEntriesBeforeReceiptIssue.length,
    "sales stock issue accounting preview does not create journal entries",
  );

  const profitAndLossBeforeCogs = await get<ProfitAndLossReport>("/reports/profit-and-loss", headers);
  const postedCogsIssue = await post<SalesStockIssue>(`/sales-stock-issues/${salesStockIssue.id}/post-cogs`, headers, {});
  assertPresent(postedCogsIssue.cogsJournalEntryId, "posted sales stock issue COGS journalEntryId");
  const postedCogsPreview = await get<SalesStockIssueAccountingPreview>(`/sales-stock-issues/${salesStockIssue.id}/accounting-preview`, headers);
  assertEqual(postedCogsPreview.alreadyPosted, true, "sales stock issue COGS preview reports posted state");
  assertEqual(postedCogsPreview.canPost, false, "sales stock issue COGS preview cannot post twice");
  assertEqual(postedCogsPreview.journalEntryId, postedCogsIssue.cogsJournalEntryId, "sales stock issue COGS preview journal id");
  const journalEntriesAfterCogsPost = await get<JournalEntry[]>("/journal-entries", headers);
  assertEqual(journalEntriesAfterCogsPost.length, journalEntriesBeforeReceiptIssue.length + 1, "manual COGS posting creates one journal entry");
  const profitAndLossAfterCogs = await get<ProfitAndLossReport>("/reports/profit-and-loss", headers);
  assertMoney(
    profitAndLossAfterCogs.costOfSales,
    money(profitAndLossBeforeCogs.costOfSales).plus(estimatedCogs),
    "P&L cost of sales includes manually posted COGS",
  );
  await expectHttpError("void stock issue with active COGS", () => post<SalesStockIssue>(`/sales-stock-issues/${salesStockIssue.id}/void`, headers, {}));
  const reversedCogsIssue = await post<SalesStockIssue>(`/sales-stock-issues/${salesStockIssue.id}/reverse-cogs`, headers, {
    reason: "Smoke COGS reversal",
  });
  assertPresent(reversedCogsIssue.cogsReversalJournalEntryId, "reversed sales stock issue COGS reversal journalEntryId");
  const reversedCogsPreview = await get<SalesStockIssueAccountingPreview>(`/sales-stock-issues/${salesStockIssue.id}/accounting-preview`, headers);
  assertEqual(reversedCogsPreview.alreadyReversed, true, "sales stock issue COGS preview reports reversed state");
  assertEqual(reversedCogsPreview.reversalJournalEntryId, reversedCogsIssue.cogsReversalJournalEntryId, "sales stock issue COGS preview reversal journal id");
  const journalEntriesAfterCogsReversal = await get<JournalEntry[]>("/journal-entries", headers);
  assertEqual(journalEntriesAfterCogsReversal.length, journalEntriesBeforeReceiptIssue.length + 2, "manual COGS reversal creates one reversal journal entry");

  const voidedSalesStockIssue = await post<SalesStockIssue>(`/sales-stock-issues/${salesStockIssue.id}/void`, headers, {});
  assertEqual(voidedSalesStockIssue.status, "VOIDED", "sales stock issue voided status");
  assertPresent(voidedSalesStockIssue.lines?.[0]?.voidStockMovementId, "sales stock issue void reversal movement");
  assertMoney((await balanceFor(mainWarehouse)).quantityOnHand, money("17.0000"), "main warehouse quantity after sales stock issue void");
  const voidedPurchaseReceipt = await post<PurchaseReceipt>(`/purchase-receipts/${purchaseReceipt.id}/void`, headers, {});
  assertEqual(voidedPurchaseReceipt.status, "VOIDED", "purchase receipt voided status");
  assertPresent(voidedPurchaseReceipt.lines?.[0]?.voidStockMovementId, "purchase receipt void reversal movement");
  assertMoney((await balanceFor(mainWarehouse)).quantityOnHand, money("12.0000"), "main warehouse quantity after purchase receipt void");
  const journalEntriesAfterReceiptIssue = await get<JournalEntry[]>("/journal-entries", headers);
  assertEqual(
    journalEntriesAfterReceiptIssue.length,
    journalEntriesBeforeReceiptIssue.length + 2,
    "purchase receipts and sales stock issues only create journals through manual COGS post and reversal",
  );

  const clearingBillReceivingStatusForAssetReceipt = await get<PurchaseReceivingStatus>(
    `/purchase-bills/${finalizedClearingModePurchaseBill.id}/receiving-status`,
    headers,
  );
  assertEqual(
    clearingBillReceivingStatusForAssetReceipt.status,
    "NOT_STARTED",
    "inventory clearing purchase bill receiving status starts not started",
  );
  const clearingBillReceivableLine = required(
    clearingBillReceivingStatusForAssetReceipt.lines.find((line) => line.inventoryTracking && money(line.remainingQuantity).gt(0)),
    "inventory clearing purchase bill receivable inventory line",
  );
  const journalEntriesBeforeReceiptAssetPost = await get<JournalEntry[]>("/journal-entries", headers);
  const trialBalanceBeforeReceiptAssetPost = await get<TrialBalanceReport>("/reports/trial-balance", headers);
  const assetRowBeforeReceiptAssetPost = required(
    trialBalanceBeforeReceiptAssetPost.accounts.find((account) => account.accountId === inventoryAssetAccount.id),
    "trial balance inventory asset before receipt asset post",
  );
  const clearingRowBeforeReceiptAssetPost = required(
    trialBalanceBeforeReceiptAssetPost.accounts.find((account) => account.accountId === inventoryClearingAccount.id),
    "trial balance inventory clearing before receipt asset post",
  );
  const clearingPurchaseReceipt = await post<PurchaseReceipt>("/purchase-receipts", headers, {
    purchaseBillId: finalizedClearingModePurchaseBill.id,
    warehouseId: mainWarehouse.id,
    receiptDate: new Date().toISOString(),
    notes: "Smoke explicit inventory asset posting receipt",
    lines: [{ purchaseBillLineId: clearingBillReceivableLine.lineId, quantity: "2.0000", unitCost: "4.0000" }],
  });
  assertEqual(clearingPurchaseReceipt.status, "POSTED", "inventory clearing purchase receipt posted status");
  assertPresent(clearingPurchaseReceipt.lines?.[0]?.stockMovementId, "inventory clearing purchase receipt stock movement");
  assertMoney((await balanceFor(mainWarehouse)).quantityOnHand, money("14.0000"), "main warehouse quantity after clearing purchase receipt");
  const clearingReceiptAccountingPreview = await get<PurchaseReceiptAccountingPreview>(
    `/purchase-receipts/${clearingPurchaseReceipt.id}/accounting-preview`,
    headers,
  );
  assertEqual(clearingReceiptAccountingPreview.previewOnly, true, "clearing receipt accounting preview is preview-only");
  assertEqual(clearingReceiptAccountingPreview.canPost, true, "clearing receipt accounting preview can post manually");
  assertEqual(clearingReceiptAccountingPreview.postingStatus, "POSTABLE", "clearing receipt preview reports postable state");
  assertEqual(clearingReceiptAccountingPreview.alreadyPosted, false, "clearing receipt preview starts unposted");
  assertEqual(
    clearingReceiptAccountingPreview.linkedBill?.inventoryPostingMode,
    "INVENTORY_CLEARING",
    "clearing receipt preview reports linked inventory clearing bill",
  );
  assertMoney(clearingReceiptAccountingPreview.receiptValue, money("8.0000"), "clearing receipt preview receipt value");
  assert(
    clearingReceiptAccountingPreview.journal.lines.some(
      (line) => line.side === "DEBIT" && line.accountCode === inventoryAssetAccount.code && money(line.amount).eq("8.0000"),
    ),
    "clearing receipt preview includes debit inventory asset line",
  );
  assert(
    clearingReceiptAccountingPreview.journal.lines.some(
      (line) => line.side === "CREDIT" && line.accountCode === inventoryClearingAccount.code && money(line.amount).eq("8.0000"),
    ),
    "clearing receipt preview includes credit inventory clearing line",
  );
  const journalEntriesAfterClearingReceiptPreview = await get<JournalEntry[]>("/journal-entries", headers);
  assertEqual(
    journalEntriesAfterClearingReceiptPreview.length,
    journalEntriesBeforeReceiptAssetPost.length,
    "clearing receipt accounting preview does not create journal entries",
  );
  const postedAssetReceipt = await post<PurchaseReceipt>(
    `/purchase-receipts/${clearingPurchaseReceipt.id}/post-inventory-asset`,
    headers,
    {},
  );
  const receiptAssetJournalEntryId = required(
    postedAssetReceipt.inventoryAssetJournalEntryId,
    "purchase receipt inventory asset journalEntryId",
  );
  const receiptAssetJournal = await get<JournalEntry>(`/journal-entries/${receiptAssetJournalEntryId}`, headers);
  assert(
    receiptAssetJournal.lines?.some(
      (line) => line.account?.code === inventoryAssetAccount.code && money(line.debit).eq("8.0000") && money(line.credit).eq(0),
    ),
    "purchase receipt asset journal debits inventory asset",
  );
  assert(
    receiptAssetJournal.lines?.some(
      (line) => line.account?.code === inventoryClearingAccount.code && money(line.credit).eq("8.0000") && money(line.debit).eq(0),
    ),
    "purchase receipt asset journal credits inventory clearing",
  );
  const postedAssetPreview = await get<PurchaseReceiptAccountingPreview>(
    `/purchase-receipts/${clearingPurchaseReceipt.id}/accounting-preview`,
    headers,
  );
  assertEqual(postedAssetPreview.alreadyPosted, true, "purchase receipt asset preview reports posted state");
  assertEqual(postedAssetPreview.canPost, false, "purchase receipt asset preview cannot post twice");
  assertEqual(postedAssetPreview.journalEntryId, receiptAssetJournalEntryId, "purchase receipt asset preview journal id");
  const journalEntriesAfterReceiptAssetPost = await get<JournalEntry[]>("/journal-entries", headers);
  assertEqual(journalEntriesAfterReceiptAssetPost.length, journalEntriesBeforeReceiptAssetPost.length + 1, "receipt asset posting creates one journal");
  const trialBalanceAfterReceiptAssetPost = await get<TrialBalanceReport>("/reports/trial-balance", headers);
  const assetRowAfterReceiptAssetPost = required(
    trialBalanceAfterReceiptAssetPost.accounts.find((account) => account.accountId === inventoryAssetAccount.id),
    "trial balance inventory asset after receipt asset post",
  );
  const clearingRowAfterReceiptAssetPost = required(
    trialBalanceAfterReceiptAssetPost.accounts.find((account) => account.accountId === inventoryClearingAccount.id),
    "trial balance inventory clearing after receipt asset post",
  );
  assertMoney(
    money(assetRowAfterReceiptAssetPost.periodDebit).minus(assetRowBeforeReceiptAssetPost.periodDebit),
    money("8.0000"),
    "trial balance inventory asset includes receipt asset debit",
  );
  assertMoney(
    money(clearingRowAfterReceiptAssetPost.periodCredit).minus(clearingRowBeforeReceiptAssetPost.periodCredit),
    money("8.0000"),
    "trial balance inventory clearing includes receipt asset credit",
  );
  const generalLedgerAfterReceiptAssetPost = await get<GeneralLedgerReport>("/reports/general-ledger", headers);
  const assetLedgerAfterReceiptAssetPost = required(
    generalLedgerAfterReceiptAssetPost.accounts.find((account) => account.accountId === inventoryAssetAccount.id),
    "general ledger inventory asset account after receipt asset post",
  );
  const clearingLedgerAfterReceiptAssetPost = required(
    generalLedgerAfterReceiptAssetPost.accounts.find((account) => account.accountId === inventoryClearingAccount.id),
    "general ledger inventory clearing account after receipt asset post",
  );
  assert(
    assetLedgerAfterReceiptAssetPost.lines.some((line) => line.journalEntryId === receiptAssetJournalEntryId && money(line.debit).eq("8.0000")),
    "general ledger includes receipt asset debit",
  );
  assert(
    clearingLedgerAfterReceiptAssetPost.lines.some((line) => line.journalEntryId === receiptAssetJournalEntryId && money(line.credit).eq("8.0000")),
    "general ledger includes receipt clearing credit",
  );
  const clearingReportJournalCountBefore = (await get<JournalEntry[]>("/journal-entries", headers)).length;
  const clearingReconciliationReport = await get<InventoryClearingReconciliationReport>("/inventory/reports/clearing-reconciliation", headers);
  const clearingReconciliationRow = required(
    clearingReconciliationReport.rows.find((row) => row.purchaseBill?.id === finalizedClearingModePurchaseBill.id),
    "inventory clearing reconciliation row for smoke clearing bill",
  );
  assertEqual(clearingReconciliationRow.status, "MATCHED", "inventory clearing reconciliation reports matched bill/receipt");
  assertMoney(clearingReconciliationRow.billClearingDebit, money("8.0000"), "inventory clearing reconciliation bill debit");
  assertMoney(clearingReconciliationRow.receiptClearingCredit, money("8.0000"), "inventory clearing reconciliation receipt credit");
  assert(
    clearingReconciliationRow.receipts.some((receipt) => receipt.id === clearingPurchaseReceipt.id && receipt.assetPostingStatus === "POSTED"),
    "inventory clearing reconciliation includes posted receipt asset state",
  );
  const clearingReconciliationFiltered = await get<InventoryClearingReconciliationReport>(
    `/inventory/reports/clearing-reconciliation?purchaseReceiptId=${encodeURIComponent(clearingPurchaseReceipt.id)}`,
    headers,
  );
  assert(
    clearingReconciliationFiltered.rows.some((row) => row.receipts.some((receipt) => receipt.id === clearingPurchaseReceipt.id)),
    "inventory clearing reconciliation receipt filter includes linked receipt",
  );
  await assertCsv(
    "/inventory/reports/clearing-reconciliation?format=csv",
    headers,
    "inventory clearing reconciliation CSV",
    "Inventory Clearing Reconciliation",
  );
  const clearingVarianceReport = await get<InventoryClearingVarianceReport>("/inventory/reports/clearing-variance", headers);
  assertPresent(clearingVarianceReport.summary.totalVarianceAmount, "inventory clearing variance total");
  assert(Array.isArray(clearingVarianceReport.rows), "inventory clearing variance rows array");
  await assertCsv(
    "/inventory/reports/clearing-variance?format=csv",
    headers,
    "inventory clearing variance CSV",
    "Inventory Clearing Variance",
  );
  const clearingReportJournalCountAfter = (await get<JournalEntry[]>("/journal-entries", headers)).length;
  const clearingReportNoJournal = clearingReportJournalCountAfter === clearingReportJournalCountBefore;
  assertEqual(
    clearingReportJournalCountAfter,
    clearingReportJournalCountBefore,
    "inventory clearing report endpoints do not create journal entries",
  );
  await expectHttpError("duplicate receipt asset posting", () =>
    post<PurchaseReceipt>(`/purchase-receipts/${clearingPurchaseReceipt.id}/post-inventory-asset`, headers, {}),
  );
  await expectHttpError("void receipt with active inventory asset posting", () =>
    post<PurchaseReceipt>(`/purchase-receipts/${clearingPurchaseReceipt.id}/void`, headers, {}),
  );
  const reversedAssetReceipt = await post<PurchaseReceipt>(
    `/purchase-receipts/${clearingPurchaseReceipt.id}/reverse-inventory-asset`,
    headers,
    { reason: "Smoke receipt asset reversal" },
  );
  const receiptAssetReversalJournalEntryId = required(
    reversedAssetReceipt.inventoryAssetReversalJournalEntryId,
    "purchase receipt inventory asset reversal journalEntryId",
  );
  const reversedAssetPreview = await get<PurchaseReceiptAccountingPreview>(
    `/purchase-receipts/${clearingPurchaseReceipt.id}/accounting-preview`,
    headers,
  );
  assertEqual(reversedAssetPreview.alreadyReversed, true, "purchase receipt asset preview reports reversed state");
  assertEqual(
    reversedAssetPreview.reversalJournalEntryId,
    receiptAssetReversalJournalEntryId,
    "purchase receipt asset preview reversal journal id",
  );
  const journalEntriesAfterReceiptAssetReversal = await get<JournalEntry[]>("/journal-entries", headers);
  assertEqual(
    journalEntriesAfterReceiptAssetReversal.length,
    journalEntriesBeforeReceiptAssetPost.length + 2,
    "receipt asset reversal creates one reversal journal",
  );
  await expectHttpError("duplicate receipt asset reversal", () =>
    post<PurchaseReceipt>(`/purchase-receipts/${clearingPurchaseReceipt.id}/reverse-inventory-asset`, headers, {}),
  );
  const clearingBillReceiptMatchingStatus = await get<PurchaseBillReceiptMatchingStatus>(
    `/purchase-bills/${finalizedClearingModePurchaseBill.id}/receipt-matching-status`,
    headers,
  );
  assertEqual(
    clearingBillReceiptMatchingStatus.bill.inventoryPostingMode,
    "INVENTORY_CLEARING",
    "clearing bill receipt matching reports inventory posting mode",
  );
  assert(
    clearingBillReceiptMatchingStatus.lines.some((line) =>
      line.receipts?.some(
        (receipt) =>
          receipt.id === clearingPurchaseReceipt.id &&
          receipt.inventoryAssetJournalEntryId === receiptAssetJournalEntryId &&
          receipt.inventoryAssetReversalJournalEntryId === receiptAssetReversalJournalEntryId,
      ),
    ),
    "clearing bill receipt matching includes receipt asset posting status",
  );
  const voidedClearingPurchaseReceipt = await post<PurchaseReceipt>(`/purchase-receipts/${clearingPurchaseReceipt.id}/void`, headers, {});
  assertEqual(voidedClearingPurchaseReceipt.status, "VOIDED", "clearing purchase receipt voided after asset reversal");
  assertPresent(voidedClearingPurchaseReceipt.lines?.[0]?.voidStockMovementId, "clearing purchase receipt void reversal movement");
  assertMoney((await balanceFor(mainWarehouse)).quantityOnHand, money("12.0000"), "main warehouse quantity after clearing receipt void");

  const variancePurchaseBill = await post<PurchaseBill>("/purchase-bills", headers, {
    supplierId: receivingSupplier.id,
    billDate: new Date().toISOString(),
    currency: "SAR",
    notes: "Smoke inventory variance proposal bill",
    inventoryPostingMode: "INVENTORY_CLEARING",
    lines: [
      {
        itemId: inventoryItem.id,
        description: "Smoke variance proposal tracked line",
        accountId: inventoryAssetAccount.id,
        quantity: "1.0000",
        unitPrice: "10.0000",
      },
    ],
  });
  const finalizedVariancePurchaseBill = await post<PurchaseBill>(`/purchase-bills/${variancePurchaseBill.id}/finalize`, headers, {});
  assertEqual(finalizedVariancePurchaseBill.status, "FINALIZED", "variance proposal clearing bill finalized");
  const varianceBillReceivingStatus = await get<PurchaseReceivingStatus>(
    `/purchase-bills/${finalizedVariancePurchaseBill.id}/receiving-status`,
    headers,
  );
  const varianceBillReceivableLine = required(
    varianceBillReceivingStatus.lines.find((line) => line.inventoryTracking && money(line.remainingQuantity).gt(0)),
    "variance proposal clearing bill receivable line",
  );
  const variancePurchaseReceipt = await post<PurchaseReceipt>("/purchase-receipts", headers, {
    purchaseBillId: finalizedVariancePurchaseBill.id,
    warehouseId: mainWarehouse.id,
    receiptDate: new Date().toISOString(),
    lines: [{ purchaseBillLineId: varianceBillReceivableLine.lineId, quantity: "1.0000", unitCost: "8.0000" }],
  });
  const varianceReceiptPreview = await get<PurchaseReceiptAccountingPreview>(
    `/purchase-receipts/${variancePurchaseReceipt.id}/accounting-preview`,
    headers,
  );
  assertEqual(varianceReceiptPreview.canPost, true, "variance receipt asset preview can post");
  const postedVariancePurchaseReceipt = await post<PurchaseReceipt>(
    `/purchase-receipts/${variancePurchaseReceipt.id}/post-inventory-asset`,
    headers,
    {},
  );
  assertPresent(postedVariancePurchaseReceipt.inventoryAssetJournalEntryId, "variance receipt asset journal id");
  const varianceReportForProposal = await get<InventoryClearingVarianceReport>(
    `/inventory/reports/clearing-variance?purchaseBillId=${encodeURIComponent(finalizedVariancePurchaseBill.id)}`,
    headers,
  );
  const varianceRowForProposal = required(
    varianceReportForProposal.rows.find((row) => row.purchaseBill?.id === finalizedVariancePurchaseBill.id && money(row.varianceAmount).eq("2.0000")),
    "inventory clearing variance row for proposal",
  );
  assertEqual(varianceRowForProposal.status, "VARIANCE", "variance proposal source row reports variance");
  const varianceProposalJournalCountBefore = (await get<JournalEntry[]>("/journal-entries", headers)).length;
  const draftVarianceProposal = await post<InventoryVarianceProposal>(
    "/inventory/variance-proposals/from-clearing-variance",
    headers,
    {
      purchaseBillId: finalizedVariancePurchaseBill.id,
      purchaseReceiptId: variancePurchaseReceipt.id,
      reason: "PRICE_DIFFERENCE",
      description: "Smoke clearing variance proposal",
    },
  );
  assertEqual(draftVarianceProposal.status, "DRAFT", "inventory variance proposal starts draft");
  assertMoney(draftVarianceProposal.amount, money("2.0000"), "inventory variance proposal uses report variance amount");
  assertEqual(
    (await get<JournalEntry[]>("/journal-entries", headers)).length,
    varianceProposalJournalCountBefore,
    "variance proposal creation does not create journal entries",
  );
  const submittedVarianceProposal = await post<InventoryVarianceProposal>(
    `/inventory/variance-proposals/${draftVarianceProposal.id}/submit`,
    headers,
    { notes: "Smoke variance proposal submission" },
  );
  assertEqual(submittedVarianceProposal.status, "PENDING_APPROVAL", "inventory variance proposal submitted");
  const approvedVarianceProposal = await post<InventoryVarianceProposal>(
    `/inventory/variance-proposals/${draftVarianceProposal.id}/approve`,
    headers,
    { approvalNotes: "Smoke variance proposal approval" },
  );
  assertEqual(approvedVarianceProposal.status, "APPROVED", "inventory variance proposal approved");
  const varianceProposalPreview = await get<InventoryVarianceProposalAccountingPreview>(
    `/inventory/variance-proposals/${draftVarianceProposal.id}/accounting-preview`,
    headers,
  );
  assertEqual(varianceProposalPreview.previewOnly, true, "inventory variance proposal preview is preview-only");
  assertEqual(varianceProposalPreview.canPost, true, "approved variance proposal preview can post");
  assert(
    varianceProposalPreview.journal.lines.some(
      (line) => line.side === "DEBIT" && line.accountId === expenseAccount.id && money(line.amount).eq("2.0000"),
    ),
    "variance proposal preview debits adjustment loss account",
  );
  assert(
    varianceProposalPreview.journal.lines.some(
      (line) => line.side === "CREDIT" && line.accountId === inventoryClearingAccount.id && money(line.amount).eq("2.0000"),
    ),
    "variance proposal preview credits inventory clearing",
  );
  assertEqual(
    (await get<JournalEntry[]>("/journal-entries", headers)).length,
    varianceProposalJournalCountBefore,
    "variance proposal preview and approval do not create journal entries",
  );
  const postedVarianceProposal = await post<InventoryVarianceProposal>(
    `/inventory/variance-proposals/${draftVarianceProposal.id}/post`,
    headers,
    {},
  );
  assertEqual(postedVarianceProposal.status, "POSTED", "inventory variance proposal posted");
  const varianceProposalJournalEntryId = required(postedVarianceProposal.journalEntryId, "inventory variance proposal journal id");
  assertEqual(
    (await get<JournalEntry[]>("/journal-entries", headers)).length,
    varianceProposalJournalCountBefore + 1,
    "variance proposal explicit post creates one journal entry",
  );
  const varianceProposalJournal = await get<JournalEntry>(`/journal-entries/${varianceProposalJournalEntryId}`, headers);
  assert(
    varianceProposalJournal.lines?.some((line) => line.account?.id === expenseAccount.id && money(line.debit).eq("2.0000")),
    "variance proposal journal debits adjustment loss account",
  );
  assert(
    varianceProposalJournal.lines?.some((line) => line.account?.id === inventoryClearingAccount.id && money(line.credit).eq("2.0000")),
    "variance proposal journal credits inventory clearing",
  );
  await expectHttpError("duplicate variance proposal posting", () =>
    post<InventoryVarianceProposal>(`/inventory/variance-proposals/${draftVarianceProposal.id}/post`, headers, {}),
  );
  await expectHttpError("void posted variance proposal", () =>
    post<InventoryVarianceProposal>(`/inventory/variance-proposals/${draftVarianceProposal.id}/void`, headers, { reason: "Not allowed" }),
  );
  const reversedVarianceProposal = await post<InventoryVarianceProposal>(
    `/inventory/variance-proposals/${draftVarianceProposal.id}/reverse`,
    headers,
    { reason: "Smoke variance proposal reversal" },
  );
  assertEqual(reversedVarianceProposal.status, "REVERSED", "inventory variance proposal reversed");
  assertPresent(reversedVarianceProposal.reversalJournalEntryId, "inventory variance proposal reversal journal id");
  const varianceProposalEvents = await get<InventoryVarianceProposalEvent[]>(
    `/inventory/variance-proposals/${draftVarianceProposal.id}/events`,
    headers,
  );
  for (const action of ["CREATE", "SUBMIT", "APPROVE", "POST", "REVERSE"] as const) {
    assert(varianceProposalEvents.some((event) => event.action === action), `inventory variance proposal event ${action}`);
  }
  const varianceProposalJournalCountAfterReversal = (await get<JournalEntry[]>("/journal-entries", headers)).length;
  assertEqual(
    varianceProposalJournalCountAfterReversal,
    varianceProposalJournalCountBefore + 2,
    "variance proposal reversal creates one reversal journal",
  );
  await expectHttpError("duplicate variance proposal reversal", () =>
    post<InventoryVarianceProposal>(`/inventory/variance-proposals/${draftVarianceProposal.id}/reverse`, headers, {}),
  );

  const bankTransferAmount = money("12.3400");
  const bankBeforeTransfer = await get<BankAccountSummary>(`/bank-accounts/${defaultBankProfile.id}`, headers);
  const cashBeforeTransfer = await get<BankAccountSummary>(`/bank-accounts/${defaultCashProfile.id}`, headers);
  const bankTransfer = await post<BankTransfer>("/bank-transfers", headers, {
    fromBankAccountProfileId: defaultBankProfile.id,
    toBankAccountProfileId: defaultCashProfile.id,
    transferDate: new Date().toISOString(),
    amount: bankTransferAmount.toFixed(4),
    currency: "SAR",
    description: "Smoke bank to cash transfer",
  });
  assertEqual(bankTransfer.status, "POSTED", "bank transfer posted status");
  assertPresent(bankTransfer.journalEntryId, "bank transfer journalEntryId");
  const bankAfterTransfer = await get<BankAccountSummary>(`/bank-accounts/${defaultBankProfile.id}`, headers);
  const cashAfterTransfer = await get<BankAccountSummary>(`/bank-accounts/${defaultCashProfile.id}`, headers);
  assertMoney(
    bankAfterTransfer.ledgerBalance,
    money(bankBeforeTransfer.ledgerBalance).minus(bankTransferAmount),
    "bank profile balance after transfer out",
  );
  assertMoney(
    cashAfterTransfer.ledgerBalance,
    money(cashBeforeTransfer.ledgerBalance).plus(bankTransferAmount),
    "cash profile balance after transfer in",
  );
  const bankTransferTransactions = await get<BankAccountTransactionsResponse>(
    `/bank-accounts/${defaultBankProfile.id}/transactions`,
    headers,
  );
  assert(
    bankTransferTransactions.transactions.some(
      (transaction) =>
        transaction.sourceType === "BANK_TRANSFER" &&
        transaction.sourceId === bankTransfer.id &&
        money(transaction.credit).eq(bankTransferAmount),
    ),
    "bank transactions include bank transfer credit",
  );
  const transferStatementImport = await post<BankStatementImport>(`/bank-accounts/${defaultBankProfile.id}/statement-imports`, headers, {
    filename: `smoke-bank-transfer-${runId}.csv`,
    rows: [
      {
        date: new Date().toISOString().slice(0, 10),
        description: "Smoke bank transfer statement debit",
        reference: bankTransfer.transferNumber,
        debit: bankTransferAmount.toFixed(4),
        credit: "0.0000",
      },
    ],
    openingStatementBalance: bankBeforeTransfer.ledgerBalance,
    closingStatementBalance: money(bankBeforeTransfer.ledgerBalance).minus(bankTransferAmount).toFixed(4),
  });
  assertEqual(transferStatementImport.rowCount, 1, "bank statement transfer import row count");
  const unmatchedTransferStatementRows = await get<BankStatementTransaction[]>(
    `/bank-accounts/${defaultBankProfile.id}/statement-transactions?status=UNMATCHED`,
    headers,
  );
  const transferStatementRow = required(
    unmatchedTransferStatementRows.find((transaction) => transaction.importId === transferStatementImport.id),
    "imported bank transfer statement row",
  );
  const transferMatchCandidates = await get<BankStatementMatchCandidate[]>(
    `/bank-statement-transactions/${transferStatementRow.id}/match-candidates`,
    headers,
  );
  const transferMatchCandidate = required(
    transferMatchCandidates.find((candidate) => candidate.reference === bankTransfer.transferNumber && money(candidate.credit).eq(bankTransferAmount)),
    "bank statement transfer match candidate",
  );
  const matchedTransferStatementRow = await post<BankStatementTransaction>(
    `/bank-statement-transactions/${transferStatementRow.id}/match`,
    headers,
    { journalLineId: transferMatchCandidate.journalLineId },
  );
  assertEqual(matchedTransferStatementRow.status, "MATCHED", "bank statement transfer row matched");
  assertEqual(matchedTransferStatementRow.matchType, "JOURNAL_LINE", "bank statement transfer match type");
  const voidedBankTransfer = await post<BankTransfer>(`/bank-transfers/${bankTransfer.id}/void`, headers, {});
  assertEqual(voidedBankTransfer.status, "VOIDED", "voided bank transfer status");
  assertPresent(voidedBankTransfer.voidReversalJournalEntryId, "voided bank transfer reversal journal");
  const voidedBankTransferAgain = await post<BankTransfer>(`/bank-transfers/${bankTransfer.id}/void`, headers, {});
  assertEqual(
    voidedBankTransferAgain.voidReversalJournalEntryId,
    voidedBankTransfer.voidReversalJournalEntryId,
    "double void bank transfer reversal journal idempotent",
  );
  const bankAfterTransferVoid = await get<BankAccountSummary>(`/bank-accounts/${defaultBankProfile.id}`, headers);
  const cashAfterTransferVoid = await get<BankAccountSummary>(`/bank-accounts/${defaultCashProfile.id}`, headers);
  assertMoney(bankAfterTransferVoid.ledgerBalance, bankBeforeTransfer.ledgerBalance, "bank profile balance after transfer void");
  assertMoney(cashAfterTransferVoid.ledgerBalance, cashBeforeTransfer.ledgerBalance, "cash profile balance after transfer void");
  const bankTransferVoidTransactions = await get<BankAccountTransactionsResponse>(
    `/bank-accounts/${defaultBankProfile.id}/transactions`,
    headers,
  );
  assert(
    bankTransferVoidTransactions.transactions.some(
      (transaction) =>
        transaction.sourceType === "VOID_BANK_TRANSFER" &&
        transaction.sourceId === bankTransfer.id &&
        money(transaction.debit).eq(bankTransferAmount),
    ),
    "bank transactions include bank transfer void reversal debit",
  );

  const statementCategoryAmount = money("3.2100");
  const categoryStatementImport = await post<BankStatementImport>(`/bank-accounts/${defaultBankProfile.id}/statement-imports`, headers, {
    filename: `smoke-bank-fee-${runId}.csv`,
    rows: [
      {
        date: new Date().toISOString().slice(0, 10),
        description: "Smoke bank statement fee",
        reference: `SMOKE-FEE-${runId}`,
        debit: statementCategoryAmount.toFixed(4),
        credit: "0.0000",
      },
    ],
    openingStatementBalance: bankAfterTransferVoid.ledgerBalance,
    closingStatementBalance: money(bankAfterTransferVoid.ledgerBalance).minus(statementCategoryAmount).toFixed(4),
  });
  const unmatchedCategoryRows = await get<BankStatementTransaction[]>(
    `/bank-accounts/${defaultBankProfile.id}/statement-transactions?status=UNMATCHED`,
    headers,
  );
  const categoryStatementRow = required(
    unmatchedCategoryRows.find((transaction) => transaction.importId === categoryStatementImport.id),
    "unmatched bank statement fee row",
  );
  const categorizedStatementRow = await post<BankStatementTransaction>(
    `/bank-statement-transactions/${categoryStatementRow.id}/categorize`,
    headers,
    { accountId: expenseAccount.id, description: "Smoke bank statement expense categorization" },
  );
  assertEqual(categorizedStatementRow.status, "CATEGORIZED", "bank statement row categorized");
  assertEqual(categorizedStatementRow.matchType, "MANUAL_JOURNAL", "bank statement categorization match type");
  assertPresent(categorizedStatementRow.createdJournalEntryId, "bank statement categorization journalEntryId");
  const bankAfterStatementCategorization = await get<BankAccountSummary>(`/bank-accounts/${defaultBankProfile.id}`, headers);
  assertMoney(
    bankAfterStatementCategorization.ledgerBalance,
    money(bankAfterTransferVoid.ledgerBalance).minus(statementCategoryAmount),
    "bank profile balance after statement categorization",
  );
  const reconciliationSummary = await get<BankReconciliationSummary>(
    `/bank-accounts/${defaultBankProfile.id}/reconciliation-summary`,
    headers,
  );
  assert(reconciliationSummary.totals.matched.count >= 1, "bank reconciliation summary includes matched statement row");
  assert(reconciliationSummary.totals.categorized.count >= 1, "bank reconciliation summary includes categorized statement row");
  assertPresent(reconciliationSummary.ledgerBalance, "bank reconciliation summary ledger balance");
  assertPresent(reconciliationSummary.difference, "bank reconciliation summary difference");
  assertPresent(reconciliationSummary.unreconciledTransactionCount, "bank reconciliation summary unreconciled count");

  const reconciliationAmount = money("7.7700");
  const reconciliationDate = new Date().toISOString().slice(0, 10);
  const reconciliationAccount = await post<Account>("/accounts", headers, {
    code: `SMKREC-${runId}`,
    name: `Smoke Reconciliation Bank ${runId}`,
    type: "ASSET",
    allowPosting: true,
    isActive: true,
  });
  const reconciliationProfile = await post<BankAccountSummary>("/bank-accounts", headers, {
    accountId: reconciliationAccount.id,
    type: "BANK",
    displayName: `Smoke Reconciliation Bank ${runId}`,
    currency: "SAR",
  });
  const reconciliationCsvText = [
    "Transaction Date,Memo,Ref,Money Out,Money In",
    `${reconciliationDate},Smoke reconciliation receipt,SMOKE-REC-${runId},0.0000,${reconciliationAmount.toFixed(4)}`,
  ].join("\n");
  const reconciliationPreview = await post<BankStatementImportPreview>(
    `/bank-accounts/${reconciliationProfile.id}/statement-imports/preview`,
    headers,
    {
      filename: `smoke-reconciliation-${runId}.csv`,
      csvText: reconciliationCsvText,
    },
  );
  assertEqual(reconciliationPreview.rowCount, 1, "bank statement preview row count");
  assertEqual(reconciliationPreview.validRows.length, 1, "bank statement preview valid row count");
  assertEqual(reconciliationPreview.invalidRows.length, 0, "bank statement preview invalid row count");
  assertMoney(reconciliationPreview.totalCredits, reconciliationAmount, "bank statement preview credit total");
  const reconciliationImport = await post<BankStatementImport>(`/bank-accounts/${reconciliationProfile.id}/statement-imports`, headers, {
    filename: `smoke-reconciliation-${runId}.csv`,
    csvText: reconciliationCsvText,
    openingStatementBalance: "0.0000",
    closingStatementBalance: reconciliationAmount.toFixed(4),
  });
  const reconciliationRows = await get<BankStatementTransaction[]>(
    `/bank-accounts/${reconciliationProfile.id}/statement-transactions?status=UNMATCHED`,
    headers,
  );
  const reconciliationRow = required(
    reconciliationRows.find((transaction) => transaction.importId === reconciliationImport.id),
    "isolated reconciliation statement row",
  );
  const categorizedReconciliationRow = await post<BankStatementTransaction>(
    `/bank-statement-transactions/${reconciliationRow.id}/categorize`,
    headers,
    { accountId: salesAccount.id, description: "Smoke reconciliation categorization" },
  );
  assertEqual(categorizedReconciliationRow.status, "CATEGORIZED", "isolated reconciliation row categorized");
  const reconciliationProfileAfterCategorize = await get<BankAccountSummary>(`/bank-accounts/${reconciliationProfile.id}`, headers);
  assertMoney(
    reconciliationProfileAfterCategorize.ledgerBalance,
    reconciliationAmount,
    "isolated reconciliation bank ledger balance",
  );
  const isolatedSummary = await get<BankReconciliationSummary>(
    `/bank-accounts/${reconciliationProfile.id}/reconciliation-summary?from=${reconciliationDate}&to=${reconciliationDate}`,
    headers,
  );
  assertEqual(isolatedSummary.statusSuggestion, "RECONCILED", "isolated reconciliation summary suggestion");
  const draftReconciliation = await post<BankReconciliation>(
    `/bank-accounts/${reconciliationProfile.id}/reconciliations`,
    headers,
    {
      periodStart: reconciliationDate,
      periodEnd: reconciliationDate,
      statementOpeningBalance: "0.0000",
      statementClosingBalance: reconciliationAmount.toFixed(4),
      notes: "Smoke isolated bank reconciliation close",
    },
  );
  assertEqual(draftReconciliation.status, "DRAFT", "bank reconciliation draft status");
  assertMoney(draftReconciliation.difference, money(0), "bank reconciliation draft difference");
  assertEqual(draftReconciliation.unmatchedTransactionCount, 0, "bank reconciliation draft unmatched count");
  const submittedReconciliation = await post<BankReconciliation>(
    `/bank-reconciliations/${draftReconciliation.id}/submit`,
    headers,
    {},
  );
  assertEqual(submittedReconciliation.status, "PENDING_APPROVAL", "bank reconciliation submitted status");
  assertPresent(submittedReconciliation.submittedAt, "bank reconciliation submittedAt");
  const approvedReconciliation = await post<BankReconciliation>(
    `/bank-reconciliations/${submittedReconciliation.id}/approve`,
    headers,
    { approvalNotes: "Smoke approval" },
  );
  assertEqual(approvedReconciliation.status, "APPROVED", "bank reconciliation approved status");
  assertPresent(approvedReconciliation.approvedAt, "bank reconciliation approvedAt");
  const closedReconciliation = await post<BankReconciliation>(`/bank-reconciliations/${approvedReconciliation.id}/close`, headers, {});
  assertEqual(closedReconciliation.status, "CLOSED", "bank reconciliation closed status");
  assertPresent(closedReconciliation.closedAt, "bank reconciliation closedAt");
  const reconciliationReviewEvents = await get<BankReconciliationReviewEvent[]>(
    `/bank-reconciliations/${closedReconciliation.id}/review-events`,
    headers,
  );
  assert(
    ["SUBMIT", "APPROVE", "CLOSE"].every((action) => reconciliationReviewEvents.some((event) => event.action === action)),
    "bank reconciliation review events include submit approve close",
  );
  const reconciliationItems = await get<BankReconciliationItem[]>(
    `/bank-reconciliations/${closedReconciliation.id}/items`,
    headers,
  );
  assert(
    reconciliationItems.some((item) => item.statementTransactionId === categorizedReconciliationRow.id),
    "bank reconciliation close snapshots statement row",
  );
  const reconciliationReportData = await get<BankReconciliationReportData>(
    `/bank-reconciliations/${closedReconciliation.id}/report-data`,
    headers,
  );
  assertEqual(reconciliationReportData.reconciliation.status, "CLOSED", "bank reconciliation report-data status");
  assert(
    reconciliationReportData.items.some((item) => item.statementTransactionId === categorizedReconciliationRow.id),
    "bank reconciliation report-data includes snapshot row",
  );
  assert(reconciliationReportData.summary.itemCount >= 1, "bank reconciliation report-data summary item count");
  await assertPdf(`/bank-reconciliations/${closedReconciliation.id}/report.pdf`, headers, "bank reconciliation report PDF");
  await assertCsv(
    `/bank-reconciliations/${closedReconciliation.id}/report.csv`,
    headers,
    "bank reconciliation report CSV",
    closedReconciliation.reconciliationNumber,
  );
  const reconciliationReportDocuments = await get<GeneratedDocument[]>(
    `/generated-documents?documentType=BANK_RECONCILIATION_REPORT&sourceId=${encodeURIComponent(closedReconciliation.id)}`,
    headers,
  );
  assert(reconciliationReportDocuments.length >= 1, "generated documents include bank reconciliation report PDF");
  const closedPeriodPreview = await post<BankStatementImportPreview>(
    `/bank-accounts/${reconciliationProfile.id}/statement-imports/preview`,
    headers,
    {
      filename: `smoke-reconciliation-closed-preview-${runId}.csv`,
      csvText: `date,description,debit,credit\n${reconciliationDate},Closed period preview,0.0100,0.0000`,
    },
  );
  assert(
    closedPeriodPreview.warnings.some((warning) => warning.includes("closed reconciliation")),
    "bank statement preview warns for closed reconciliation period",
  );
  await expectHttpError("closed reconciliation statement import", () =>
    post<BankStatementImport>(`/bank-accounts/${reconciliationProfile.id}/statement-imports`, headers, {
      filename: `smoke-reconciliation-closed-import-${runId}.csv`,
      csvText: `date,description,debit,credit\n${reconciliationDate},Closed period import,0.0100,0.0000`,
    }),
  );
  await expectHttpError("closed reconciliation statement row mutation", () =>
    post<BankStatementTransaction>(`/bank-statement-transactions/${categorizedReconciliationRow.id}/ignore`, headers, {
      reason: "Smoke closed-period mutation check",
    }),
  );
  const voidedReconciliation = await post<BankReconciliation>(
    `/bank-reconciliations/${closedReconciliation.id}/void`,
    headers,
    {},
  );
  assertEqual(voidedReconciliation.status, "VOIDED", "bank reconciliation voided status");
  const unlockedImport = await post<BankStatementImport>(
    `/bank-accounts/${reconciliationProfile.id}/statement-imports`,
    headers,
    {
      filename: `smoke-reconciliation-unlocked-${runId}.csv`,
      rows: [
        {
          date: reconciliationDate,
          description: "Smoke reconciliation unlocked row",
          reference: `SMOKE-REC-UNLOCK-${runId}`,
          debit: "0.0100",
          credit: "0.0000",
        },
      ],
    },
  );
  assertEqual(unlockedImport.rowCount, 1, "voided reconciliation unlocks statement import in period");

  const openingBalanceAmount = money("23.0000");
  const openingAccount = await post<Account>("/accounts", headers, {
    code: `SMKOB-${runId}`,
    name: `Smoke Opening Bank ${runId}`,
    type: "ASSET",
    allowPosting: true,
    isActive: true,
  });
  const openingProfile = await post<BankAccountSummary>("/bank-accounts", headers, {
    accountId: openingAccount.id,
    type: "BANK",
    displayName: `Smoke Opening Bank ${runId}`,
    currency: "SAR",
    openingBalance: openingBalanceAmount.toFixed(4),
    openingBalanceDate: new Date().toISOString(),
  });
  const postedOpeningProfile = await post<BankAccountSummary>(
    `/bank-accounts/${openingProfile.id}/post-opening-balance`,
    headers,
    {},
  );
  assertPresent(postedOpeningProfile.openingBalanceJournalEntryId, "opening balance journalEntryId");
  assertPresent(postedOpeningProfile.openingBalancePostedAt, "opening balance postedAt");
  assertMoney(postedOpeningProfile.ledgerBalance, openingBalanceAmount, "opening balance profile ledger balance");
  const openingTransactions = await get<BankAccountTransactionsResponse>(
    `/bank-accounts/${openingProfile.id}/transactions`,
    headers,
  );
  assert(
    openingTransactions.transactions.some(
      (transaction) =>
        transaction.sourceType === "BANK_ACCOUNT_OPENING_BALANCE" &&
        transaction.sourceId === openingProfile.id &&
        money(transaction.debit).eq(openingBalanceAmount),
    ),
    "bank transactions include opening balance debit",
  );
  await expectHttpError("duplicate opening balance posting", () =>
    post<BankAccountSummary>(`/bank-accounts/${openingProfile.id}/post-opening-balance`, headers, {}),
  );

  const fiscalPeriods = await get<FiscalPeriod[]>("/fiscal-periods", headers);
  let closedSmokeYear = 1990;
  while (
    fiscalPeriods.some((period) => {
      const start = new Date(`${closedSmokeYear}-01-01T00:00:00.000Z`);
      const end = new Date(`${closedSmokeYear}-12-31T23:59:59.999Z`);
      return new Date(period.startsOn) <= end && new Date(period.endsOn) >= start;
    })
  ) {
    closedSmokeYear += 1;
  }
  assert(closedSmokeYear < 2100, "available isolated fiscal period year for smoke lock check");
  const closedFiscalPeriod = await post<FiscalPeriod>("/fiscal-periods", headers, {
    name: `Smoke Closed Period ${closedSmokeYear}`,
    startsOn: `${closedSmokeYear}-01-01`,
    endsOn: `${closedSmokeYear}-12-31`,
  });
  assertEqual(closedFiscalPeriod.status, "OPEN", "new fiscal period starts open");
  const closedFiscalPeriodAfterClose = await post<FiscalPeriod>(`/fiscal-periods/${closedFiscalPeriod.id}/close`, headers, {});
  assertEqual(closedFiscalPeriodAfterClose.status, "CLOSED", "closed fiscal period status");
  const blockedJournal = await post<JournalEntry>("/journal-entries", headers, {
    entryDate: `${closedSmokeYear}-06-15T00:00:00.000Z`,
    description: "Smoke test closed fiscal period posting guard",
    reference: `SMOKE-CLOSED-${runId}`,
    currency: "SAR",
    lines: [
      {
        accountId: paidThroughAccount!.id,
        debit: "1.0000",
        credit: "0.0000",
        description: "Closed period guard debit",
        currency: "SAR",
      },
      {
        accountId: salesAccount.id,
        debit: "0.0000",
        credit: "1.0000",
        description: "Closed period guard credit",
        currency: "SAR",
      },
    ],
  });
  await expectHttpError("manual journal post in closed fiscal period", () => post(`/journal-entries/${blockedJournal.id}/post`, headers, {}));

  const taxRates = await get<TaxRate[]>("/tax-rates", headers);
  const salesVat = taxRates.find((taxRate) => taxRate.name === "VAT on Sales 15%" && taxRate.isActive);
  const purchaseVat = taxRates.find((taxRate) => taxRate.name === "VAT on Purchases 15%" && taxRate.isActive);
  const expectedTotal = salesVat ? money("115.0000") : money("100.0000");
  const expectedPurchaseBillTotal = purchaseVat ? money("115.0000") : money("100.0000");
  const expectedCreditNoteTotal = salesVat ? money("11.5000") : money("10.0000");
  const expectedPurchaseDebitNoteTotal = purchaseVat ? money("11.5000") : money("10.0000");
  const partialPaymentAmount = money("50.0000");
  const remainingPaymentAmount = expectedTotal.minus(partialPaymentAmount);

  const customer = await post<Contact>("/contacts", headers, {
    type: "CUSTOMER",
    name: `Smoke Test Customer ${runId}`,
    displayName: `Smoke Test Customer ${runId}`,
    taxNumber: "399999999800003",
    addressLine1: "Salah Al-Din",
    addressLine2: "Unit 12",
    buildingNumber: "1111",
    district: "Al Murooj",
    city: "Riyadh",
    postalCode: "12222",
    countryCode: "SA",
  });

  const itemPayload: Record<string, unknown> = {
    name: `Smoke Test Service ${runId}`,
    sku: `SMOKE-SERVICE-${runId}`,
    type: "SERVICE",
    sellingPrice: "100.0000",
    revenueAccountId: salesAccount.id,
  };
  if (salesVat) {
    itemPayload.salesTaxRateId = salesVat.id;
  }
  const item = await post<Item>("/items", headers, itemPayload);

  const linePayload: Record<string, unknown> = {
    itemId: item.id,
    description: "Smoke test service line",
    quantity: "1.0000",
    unitPrice: "100.0000",
  };
  if (salesVat) {
    linePayload.taxRateId = salesVat.id;
  }

  const draftInvoice = await post<SalesInvoice>("/sales-invoices", headers, {
    customerId: customer.id,
    issueDate: new Date().toISOString(),
    currency: "SAR",
    lines: [linePayload],
  });
  assertEqual(draftInvoice.status, "DRAFT", "created invoice status");

  const updatedInvoice = await patch<SalesInvoice>(`/sales-invoices/${draftInvoice.id}`, headers, {
    notes: `Smoke edited ${runId}`,
  });
  assertEqual(updatedInvoice.notes, `Smoke edited ${runId}`, "draft invoice notes update");

  const finalizedInvoice = await post<SalesInvoice>(`/sales-invoices/${draftInvoice.id}/finalize`, headers, {});
  assertEqual(finalizedInvoice.status, "FINALIZED", "finalized invoice status");
  assertPresent(finalizedInvoice.journalEntryId, "finalized invoice journalEntryId");
  assertMoney(finalizedInvoice.total, expectedTotal, "finalized invoice total");
  assertMoney(finalizedInvoice.balanceDue, expectedTotal, "finalized invoice balanceDue");

  const finalizedAgain = await post<SalesInvoice>(`/sales-invoices/${draftInvoice.id}/finalize`, headers, {});
  assertEqual(finalizedAgain.id, finalizedInvoice.id, "double finalize invoice id");
  assertEqual(finalizedAgain.journalEntryId, finalizedInvoice.journalEntryId, "double finalize journalEntryId");

  const zatcaProfile = await get<ZatcaOrganizationProfile>("/zatca/profile", headers);
  assertPresent(zatcaProfile.id, "ZATCA profile id");
  const patchedZatcaProfile = await patch<ZatcaOrganizationProfile>("/zatca/profile", headers, {
    sellerName: "LedgerByte Smoke Seller",
    vatNumber: "300000000000003",
    countryCode: "SA",
    city: "Riyadh",
    streetName: "King Fahd Road",
    buildingNumber: "1234",
    district: "Olaya",
    postalCode: "12271",
    businessCategory: "Smoke testing",
    environment: "SANDBOX",
  });
  assertEqual(patchedZatcaProfile.vatNumber, "300000000000003", "ZATCA profile VAT number");
  const zatcaAdapterConfig = await get<ZatcaAdapterConfigSummary>("/zatca/adapter-config", headers);
  assertEqual(zatcaAdapterConfig.mode, "mock", "ZATCA adapter default mode");
  assertEqual(zatcaAdapterConfig.realNetworkEnabled, false, "ZATCA real network disabled flag");
  assertEqual(zatcaAdapterConfig.effectiveRealNetworkEnabled, false, "ZATCA effective real network disabled flag");
  const zatcaChecklist = await get<ZatcaComplianceChecklistResponse>("/zatca/compliance-checklist", headers);
  assert(zatcaChecklist.warning.includes("not legal certification"), "ZATCA checklist warning is present");
  assert(zatcaChecklist.summary.total > 0, "ZATCA checklist has items");
  assert((zatcaChecklist.groups.API?.length ?? 0) > 0, "ZATCA checklist groups API items");
  assert((zatcaChecklist.groups.PDF_A3?.length ?? 0) > 0, "ZATCA checklist groups PDF/A-3 items");
  const zatcaXmlFieldMapping = await get<ZatcaXmlFieldMappingResponse>("/zatca/xml-field-mapping", headers);
  assert(zatcaXmlFieldMapping.warning.includes("not official ZATCA validation"), "ZATCA XML field mapping warning is present");
  assert(zatcaXmlFieldMapping.summary.total > 0, "ZATCA XML field mapping has items");
  assert(zatcaXmlFieldMapping.items.length === zatcaXmlFieldMapping.summary.total, "ZATCA XML field mapping item count matches summary");
  const zatcaReadiness = await get<ZatcaReadinessSummary>("/zatca/readiness", headers);
  assert(zatcaReadiness.warning.includes("not legal certification"), "ZATCA readiness warning is present");
  assertEqual(zatcaReadiness.localOnly, true, "ZATCA readiness localOnly");
  assertEqual(zatcaReadiness.productionCompliance, false, "ZATCA readiness productionCompliance");
  assertEqual(zatcaReadiness.productionReady, false, "ZATCA readiness productionReady");
  assertEqual(zatcaReadiness.sellerProfile?.status, "READY", "ZATCA seller readiness ready after smoke profile patch");
  assertEqual(zatcaReadiness.signing.status, "BLOCKED", "ZATCA signing readiness blocked");
  assertEqual(zatcaReadiness.keyCustody.status, "BLOCKED", "ZATCA key custody readiness blocked");
  assert(["READY", "WARNINGS", "BLOCKED"].includes(zatcaReadiness.csr.status), "ZATCA CSR readiness returns a valid local-only status");
  assertEqual(zatcaReadiness.phase2Qr.status, "BLOCKED", "ZATCA Phase 2 QR readiness blocked");
  assertEqual(zatcaReadiness.pdfA3.status, "BLOCKED", "ZATCA PDF/A-3 readiness blocked");
  assert(zatcaReadiness.blockingReasons.length > 0, "ZATCA readiness returns blocking reasons");
  assertNoPrivateKey(zatcaReadiness, "ZATCA readiness response");

  const smokeEgsSerial = "LEDGERBYTE-SMOKE-EGS";
  const existingEgsUnits = await get<ZatcaEgsUnit[]>("/zatca/egs-units", headers);
  assertNoPrivateKey(existingEgsUnits, "ZATCA EGS list response");
  let smokeEgs =
    existingEgsUnits.find((unit) => unit.deviceSerialNumber === smokeEgsSerial) ??
    (await post<ZatcaEgsUnit>("/zatca/egs-units", headers, {
      name: "LedgerByte Smoke Dev EGS",
      deviceSerialNumber: smokeEgsSerial,
      environment: "SANDBOX",
      solutionName: "LedgerByte",
    }));
  assertNoPrivateKey(smokeEgs, "ZATCA EGS create/detail response");
  const egsBeforeCsrFieldCapture = await get<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}`, headers);
  smokeEgs = await patch<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}/csr-fields`, headers, {
    csrCommonName: "TST-886431145-399999999900003",
    csrSerialNumber: "1-TST|2-TST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f",
    csrOrganizationUnitName: "Riyadh Branch",
    csrInvoiceType: "1100",
    csrLocationAddress: "RRRD2929",
  });
  assertNoPrivateKey(smokeEgs, "ZATCA EGS CSR field capture response");
  assertEqual(smokeEgs.csrInvoiceType, "1100", "ZATCA smoke EGS CSR invoice type captured");
  assertEqual(smokeEgs.csrLocationAddress, "RRRD2929", "ZATCA smoke EGS CSR location address captured");
  assertEqual(smokeEgs.lastIcv, egsBeforeCsrFieldCapture.lastIcv, "ZATCA CSR field capture does not mutate EGS ICV");
  assertEqual(smokeEgs.lastInvoiceHash, egsBeforeCsrFieldCapture.lastInvoiceHash, "ZATCA CSR field capture does not mutate EGS previous hash");
  smokeEgs = await post<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}/generate-csr`, headers, {});
  assertNoPrivateKey(smokeEgs, "ZATCA EGS CSR generation response");
  assertEqual(smokeEgs.hasCsr, true, "ZATCA smoke EGS CSR flag");
  const csrResponse = await get<{ csrPem: string }>(`/zatca/egs-units/${smokeEgs.id}/csr`, headers);
  assert(csrResponse.csrPem.includes("BEGIN CERTIFICATE REQUEST"), "ZATCA CSR endpoint returns CSR PEM");
  assert(!csrResponse.csrPem.includes("PRIVATE KEY"), "ZATCA CSR endpoint does not return private key material");
  await assertText(`/zatca/egs-units/${smokeEgs.id}/csr/download`, headers, "EGS CSR download", "BEGIN CERTIFICATE REQUEST");
  const egsBeforeCsrPlan = await get<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}`, headers);
  const zatcaCsrPlan = await get<ZatcaEgsCsrPlanResponse>(`/zatca/egs-units/${smokeEgs.id}/csr-plan`, headers);
  assertEqual(zatcaCsrPlan.localOnly, true, "ZATCA CSR plan localOnly");
  assertEqual(zatcaCsrPlan.dryRun, true, "ZATCA CSR plan dryRun");
  assertEqual(zatcaCsrPlan.noMutation, true, "ZATCA CSR plan noMutation");
  assertEqual(zatcaCsrPlan.productionCompliance, false, "ZATCA CSR plan productionCompliance");
  assertEqual(zatcaCsrPlan.noCsidRequest, true, "ZATCA CSR plan noCsidRequest");
  assert(zatcaCsrPlan.sdkCommand.includes("-csr"), "ZATCA CSR plan uses SDK CSR command");
  assert(zatcaCsrPlan.requiredFields.some((field) => field.sdkConfigKey === "csr.organization.identifier"), "ZATCA CSR plan lists organization identifier");
  assert(zatcaCsrPlan.requiredFields.some((field) => field.sdkConfigKey === "csr.common.name" && field.status === "AVAILABLE"), "ZATCA CSR plan uses captured common name");
  assert(zatcaCsrPlan.requiredFields.some((field) => field.sdkConfigKey === "csr.invoice.type" && field.currentValue === "1100" && field.status === "AVAILABLE"), "ZATCA CSR plan uses captured invoice type");
  assert(zatcaCsrPlan.requiredFields.some((field) => field.sdkConfigKey === "csr.location.address" && field.currentValue === "RRRD2929" && field.status === "AVAILABLE"), "ZATCA CSR plan uses captured location address");
  assert(!zatcaCsrPlan.missingValues.some((field) => field.sdkConfigKey === "csr.invoice.type" || field.sdkConfigKey === "csr.location.address" || field.sdkConfigKey === "csr.common.name"), "ZATCA CSR plan captured fields clear missing CSR blockers");
  assert(zatcaCsrPlan.blockers.some((blocker) => blocker.includes("CSID requests are intentionally disabled")), "ZATCA CSR plan blocks CSID requests");
  assertNoPrivateKey(zatcaCsrPlan, "ZATCA CSR plan response");
  const egsAfterCsrPlan = await get<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}`, headers);
  assertEqual(egsAfterCsrPlan.lastIcv, egsBeforeCsrPlan.lastIcv, "ZATCA CSR plan does not mutate EGS ICV");
  assertEqual(egsAfterCsrPlan.lastInvoiceHash, egsBeforeCsrPlan.lastInvoiceHash, "ZATCA CSR plan does not mutate EGS previous hash");
  const egsBeforeCsrConfigPreview = await get<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}`, headers);
  const zatcaCsrConfigPreview = await get<ZatcaEgsCsrConfigPreviewResponse>(`/zatca/egs-units/${smokeEgs.id}/csr-config-preview`, headers);
  assertEqual(zatcaCsrConfigPreview.localOnly, true, "ZATCA CSR config preview localOnly");
  assertEqual(zatcaCsrConfigPreview.dryRun, true, "ZATCA CSR config preview dryRun");
  assertEqual(zatcaCsrConfigPreview.noMutation, true, "ZATCA CSR config preview noMutation");
  assertEqual(zatcaCsrConfigPreview.noCsidRequest, true, "ZATCA CSR config preview noCsidRequest");
  assertEqual(zatcaCsrConfigPreview.noNetwork, true, "ZATCA CSR config preview noNetwork");
  assertEqual(zatcaCsrConfigPreview.productionCompliance, false, "ZATCA CSR config preview productionCompliance");
  assertEqual(zatcaCsrConfigPreview.canPrepareConfig, true, "ZATCA CSR config preview can prepare after field capture");
  assertEqual(
    zatcaCsrConfigPreview.configEntries.map((entry) => entry.key).join("|"),
    [
      "csr.common.name",
      "csr.serial.number",
      "csr.organization.identifier",
      "csr.organization.unit.name",
      "csr.organization.name",
      "csr.country.name",
      "csr.invoice.type",
      "csr.location.address",
      "csr.industry.business.category",
    ].join("|"),
    "ZATCA CSR config preview preserves official key order",
  );
  assert(zatcaCsrConfigPreview.sanitizedConfigPreview.includes("csr.common.name=TST-886431145-399999999900003"), "ZATCA CSR config preview includes captured common name");
  assert(zatcaCsrConfigPreview.sanitizedConfigPreview.includes("csr.invoice.type=1100"), "ZATCA CSR config preview includes captured invoice type");
  assert(zatcaCsrConfigPreview.sanitizedConfigPreview.includes("csr.location.address=RRRD2929"), "ZATCA CSR config preview includes captured location address");
  assertEqual(zatcaCsrConfigPreview.missingFields.length, 0, "ZATCA CSR config preview has no missing fields after capture");
  assertNoPrivateKey(zatcaCsrConfigPreview, "ZATCA CSR config preview response");
  const serializedCsrConfigPreview = JSON.stringify(zatcaCsrConfigPreview);
  assert(!serializedCsrConfigPreview.includes("BEGIN CERTIFICATE"), "ZATCA CSR config preview does not expose certificate bodies");
  assert(!serializedCsrConfigPreview.includes("binarySecurityToken"), "ZATCA CSR config preview does not expose CSID token field names");
  assert(!serializedCsrConfigPreview.includes("secret"), "ZATCA CSR config preview does not expose CSID secret field names");
  assert(!serializedCsrConfigPreview.includes("BEGIN CERTIFICATE REQUEST"), "ZATCA CSR config preview does not expose generated CSR bodies");
  const egsAfterCsrConfigPreview = await get<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}`, headers);
  assertEqual(egsAfterCsrConfigPreview.lastIcv, egsBeforeCsrConfigPreview.lastIcv, "ZATCA CSR config preview does not mutate EGS ICV");
  assertEqual(egsAfterCsrConfigPreview.lastInvoiceHash, egsBeforeCsrConfigPreview.lastInvoiceHash, "ZATCA CSR config preview does not mutate EGS previous hash");
  const egsBeforeCsrReview = await get<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}`, headers);
  const submissionsBeforeCsrReview = await get<ZatcaSubmissionLog[]>("/zatca/submissions", headers);
  const zatcaCsrConfigReview = await post<ZatcaCsrConfigReview>(`/zatca/egs-units/${smokeEgs.id}/csr-config-reviews`, headers, {
    note: "Smoke reviewed sanitized CSR config preview only.",
  });
  assertEqual(zatcaCsrConfigReview.localOnly, true, "ZATCA CSR config review localOnly");
  assertEqual(zatcaCsrConfigReview.noCsidRequest, true, "ZATCA CSR config review noCsidRequest");
  assertEqual(zatcaCsrConfigReview.noNetwork, true, "ZATCA CSR config review noNetwork");
  assertEqual(zatcaCsrConfigReview.sdkExecution, false, "ZATCA CSR config review sdkExecution false");
  assertEqual(zatcaCsrConfigReview.productionCompliance, false, "ZATCA CSR config review productionCompliance");
  assertEqual(zatcaCsrConfigReview.status, "DRAFT", "ZATCA CSR config review starts as DRAFT");
  assert(zatcaCsrConfigReview.configPreviewRedacted.includes("csr.common.name=TST-886431145-399999999900003"), "ZATCA CSR config review stores sanitized preview");
  const approvedZatcaCsrConfigReview = await post<ZatcaCsrConfigReview>(`/zatca/csr-config-reviews/${zatcaCsrConfigReview.id}/approve`, headers, {
    note: "Smoke approved sanitized CSR config preview locally.",
  });
  assertEqual(approvedZatcaCsrConfigReview.status, "APPROVED", "ZATCA CSR config review approves when preview is ready");
  assertPresent(approvedZatcaCsrConfigReview.approvedAt, "ZATCA CSR config review approvedAt");
  const listedCsrConfigReviews = await get<ZatcaCsrConfigReview[]>(`/zatca/egs-units/${smokeEgs.id}/csr-config-reviews`, headers);
  assert(listedCsrConfigReviews.some((review) => review.id === approvedZatcaCsrConfigReview.id && review.status === "APPROVED"), "ZATCA CSR config review list returns approved review");
  const serializedCsrConfigReview = JSON.stringify([zatcaCsrConfigReview, approvedZatcaCsrConfigReview, listedCsrConfigReviews]);
  assertNoPrivateKey([zatcaCsrConfigReview, approvedZatcaCsrConfigReview, listedCsrConfigReviews], "ZATCA CSR config review responses");
  assert(!serializedCsrConfigReview.includes("BEGIN CERTIFICATE"), "ZATCA CSR config review does not expose certificate bodies");
  assert(!serializedCsrConfigReview.includes("binarySecurityToken"), "ZATCA CSR config review does not expose CSID token field names");
  assert(!serializedCsrConfigReview.includes("BEGIN CERTIFICATE REQUEST"), "ZATCA CSR config review does not expose generated CSR bodies");
  assert(!serializedCsrConfigReview.includes("OTP"), "ZATCA CSR config review does not expose one-time portal codes");
  const egsAfterCsrReview = await get<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}`, headers);
  assertEqual(egsAfterCsrReview.lastIcv, egsBeforeCsrReview.lastIcv, "ZATCA CSR config review does not mutate EGS ICV");
  assertEqual(egsAfterCsrReview.lastInvoiceHash, egsBeforeCsrReview.lastInvoiceHash, "ZATCA CSR config review does not mutate EGS previous hash");
  const submissionsAfterCsrReview = await get<ZatcaSubmissionLog[]>("/zatca/submissions", headers);
  assertEqual(submissionsAfterCsrReview.length, submissionsBeforeCsrReview.length, "ZATCA CSR config review does not create submission logs");
  const zatcaCsrDryRunAfterReview = await post<ZatcaEgsCsrDryRunResponse>(`/zatca/egs-units/${smokeEgs.id}/csr-dry-run`, headers, {});
  assertEqual(zatcaCsrDryRunAfterReview.localOnly, true, "ZATCA CSR dry-run after review localOnly");
  assertEqual(zatcaCsrDryRunAfterReview.noCsidRequest, true, "ZATCA CSR dry-run after review noCsidRequest");
  assertEqual(zatcaCsrDryRunAfterReview.noNetwork, true, "ZATCA CSR dry-run after review noNetwork");
  assertEqual(zatcaCsrDryRunAfterReview.productionCompliance, false, "ZATCA CSR dry-run after review productionCompliance");
  assertEqual(zatcaCsrDryRunAfterReview.configReviewRequired, true, "ZATCA CSR dry-run reports review required");
  assertEqual(zatcaCsrDryRunAfterReview.latestReviewId, approvedZatcaCsrConfigReview.id, "ZATCA CSR dry-run reports latest review id");
  assertEqual(zatcaCsrDryRunAfterReview.latestReviewStatus, "APPROVED", "ZATCA CSR dry-run reports approved review status");
  assertEqual(zatcaCsrDryRunAfterReview.configApprovedForDryRun, true, "ZATCA CSR dry-run reports config approved for future dry-run phase");
  const egsBeforeCsrLocalGenerate = await get<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}`, headers);
  const submissionsBeforeCsrLocalGenerate = await get<ZatcaSubmissionLog[]>("/zatca/submissions", headers);
  const zatcaCsrLocalGenerate = await post<ZatcaEgsCsrLocalGenerateResponse>(`/zatca/egs-units/${smokeEgs.id}/csr-local-generate`, headers, {});
  assertEqual(zatcaCsrLocalGenerate.localOnly, true, "ZATCA CSR local generate localOnly");
  assertEqual(zatcaCsrLocalGenerate.noCsidRequest, true, "ZATCA CSR local generate noCsidRequest");
  assertEqual(zatcaCsrLocalGenerate.noNetwork, true, "ZATCA CSR local generate noNetwork");
  assertEqual(zatcaCsrLocalGenerate.noSigning, true, "ZATCA CSR local generate noSigning");
  assertEqual(zatcaCsrLocalGenerate.noPersistence, true, "ZATCA CSR local generate noPersistence");
  assertEqual(zatcaCsrLocalGenerate.productionCompliance, false, "ZATCA CSR local generate productionCompliance");
  assertEqual(zatcaCsrLocalGenerate.executionEnabled, false, "ZATCA CSR local generate disabled by default");
  assertEqual(zatcaCsrLocalGenerate.executionAttempted, false, "ZATCA CSR local generate does not execute by default");
  assertEqual(zatcaCsrLocalGenerate.executionSkipped, true, "ZATCA CSR local generate skipped by default");
  assertEqual(zatcaCsrLocalGenerate.reviewId, approvedZatcaCsrConfigReview.id, "ZATCA CSR local generate reports approved review id");
  assertEqual(zatcaCsrLocalGenerate.tempFilesWritten.privateKey, false, "ZATCA CSR local generate does not write private key by default");
  assertEqual(zatcaCsrLocalGenerate.generatedCsrDetected, false, "ZATCA CSR local generate does not generate CSR by default");
  const serializedCsrLocalGenerate = JSON.stringify(zatcaCsrLocalGenerate);
  assertNoPrivateKey(zatcaCsrLocalGenerate, "ZATCA CSR local generate response");
  assert(!serializedCsrLocalGenerate.includes("BEGIN CERTIFICATE"), "ZATCA CSR local generate does not expose certificate bodies");
  assert(!serializedCsrLocalGenerate.includes("binarySecurityToken"), "ZATCA CSR local generate does not expose CSID token field names");
  assert(!serializedCsrLocalGenerate.includes("BEGIN CERTIFICATE REQUEST"), "ZATCA CSR local generate does not expose generated CSR bodies");
  assert(!serializedCsrLocalGenerate.includes("OTP"), "ZATCA CSR local generate does not expose one-time portal codes");
  const egsAfterCsrLocalGenerate = await get<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}`, headers);
  assertEqual(egsAfterCsrLocalGenerate.lastIcv, egsBeforeCsrLocalGenerate.lastIcv, "ZATCA CSR local generate does not mutate EGS ICV");
  assertEqual(egsAfterCsrLocalGenerate.lastInvoiceHash, egsBeforeCsrLocalGenerate.lastInvoiceHash, "ZATCA CSR local generate does not mutate EGS previous hash");
  const submissionsAfterCsrLocalGenerate = await get<ZatcaSubmissionLog[]>("/zatca/submissions", headers);
  assertEqual(submissionsAfterCsrLocalGenerate.length, submissionsBeforeCsrLocalGenerate.length, "ZATCA CSR local generate does not create submission logs by default");
  smokeEgs = await post<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}/request-compliance-csid`, headers, { otp: "000000", mode: "mock" });
  assertNoPrivateKey(smokeEgs, "ZATCA compliance CSID response");
  assertEqual(smokeEgs.hasComplianceCsid, true, "ZATCA smoke EGS compliance CSID flag");
  assertPresent(smokeEgs.certificateRequestId, "ZATCA smoke EGS certificate request id");
  if (!smokeEgs.isActive) {
    smokeEgs = await post<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}/activate-dev`, headers, {});
  }
  assertNoPrivateKey(smokeEgs, "ZATCA EGS activation response");
  assert(smokeEgs.isActive || smokeEgs.status === "ACTIVE" || smokeEgs.status === "CERTIFICATE_ISSUED", "ZATCA smoke EGS active or certificate state");
  assertEqual(smokeEgs.hashMode, "LOCAL_DETERMINISTIC", "ZATCA smoke EGS default hash mode");
  const zatcaSubmissions = await get<ZatcaSubmissionLog[]>("/zatca/submissions", headers);
  assert(
    zatcaSubmissions.some((log) => log.egsUnitId === smokeEgs.id && log.responseCode === "LOCAL_MOCK" && log.status === "SUCCESS"),
    "ZATCA submissions include local mock onboarding log",
  );

  const zatcaMetadata = await post<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca/generate`, headers, {});
  assertPresent(zatcaMetadata.invoiceUuid, "ZATCA invoice UUID");
  assertPresent(zatcaMetadata.invoiceHash, "ZATCA invoice hash");
  assertPresent(zatcaMetadata.xmlBase64, "ZATCA XML base64");
  assertPresent(zatcaMetadata.qrCodeBase64, "ZATCA QR base64");
  assertPresent(zatcaMetadata.icv, "ZATCA ICV");
  assertEqual(zatcaMetadata.hashModeSnapshot, "LOCAL_DETERMINISTIC", "ZATCA metadata hash mode snapshot");
  assertEqual(zatcaMetadata.zatcaStatus, "XML_GENERATED", "ZATCA metadata status");
  const egsAfterFirstZatcaGenerate = await get<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}`, headers);
  const repeatedZatcaMetadata = await post<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca/generate`, headers, {});
  assertEqual(repeatedZatcaMetadata.id, zatcaMetadata.id, "repeated ZATCA generate metadata id");
  assertEqual(repeatedZatcaMetadata.icv, zatcaMetadata.icv, "repeated ZATCA generate ICV");
  assertEqual(repeatedZatcaMetadata.previousInvoiceHash, zatcaMetadata.previousInvoiceHash, "repeated ZATCA generate previous hash");
  assertEqual(repeatedZatcaMetadata.invoiceHash, zatcaMetadata.invoiceHash, "repeated ZATCA generate invoice hash");
  const egsAfterRepeatedZatcaGenerate = await get<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}`, headers);
  assertEqual(egsAfterRepeatedZatcaGenerate.lastIcv, egsAfterFirstZatcaGenerate.lastIcv, "repeated ZATCA generate does not change EGS ICV");
  assertEqual(
    egsAfterRepeatedZatcaGenerate.lastInvoiceHash,
    egsAfterFirstZatcaGenerate.lastInvoiceHash,
    "repeated ZATCA generate does not change EGS previous hash",
  );
  await assertXml(`/sales-invoices/${draftInvoice.id}/zatca/xml`, headers, "invoice ZATCA XML", finalizedInvoice.invoiceNumber);
  await assertXml(`/sales-invoices/${draftInvoice.id}/zatca/xml`, headers, "invoice ZATCA XML supply date", "<cbc:ActualDeliveryDate>");
  await assertXml(`/sales-invoices/${draftInvoice.id}/zatca/xml`, headers, "invoice ZATCA buyer building number", "<cbc:BuildingNumber>1111</cbc:BuildingNumber>");
  const zatcaXmlValidation = await get<ZatcaXmlValidationResult>(`/sales-invoices/${draftInvoice.id}/zatca/xml-validation`, headers);
  assertEqual(zatcaXmlValidation.localOnly, true, "ZATCA XML validation localOnly");
  assertEqual(zatcaXmlValidation.officialValidation, false, "ZATCA XML validation officialValidation");
  assertEqual(zatcaXmlValidation.valid, true, "ZATCA XML validation valid");
  assertNoPrivateKey(zatcaXmlValidation, "ZATCA XML validation response");
  const metadataBeforeReadiness = await get<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca`, headers);
  const invoiceZatcaReadiness = await get<ZatcaInvoiceReadinessResponse>(`/sales-invoices/${draftInvoice.id}/zatca/readiness`, headers);
  assertEqual(invoiceZatcaReadiness.localOnly, true, "ZATCA invoice readiness localOnly");
  assertEqual(invoiceZatcaReadiness.noMutation, true, "ZATCA invoice readiness noMutation");
  assertEqual(invoiceZatcaReadiness.productionCompliance, false, "ZATCA invoice readiness productionCompliance");
  assertEqual(invoiceZatcaReadiness.sellerProfile.status, "READY", "ZATCA seller invoice readiness ready");
  assertEqual(invoiceZatcaReadiness.buyerContact.status, "READY", "ZATCA buyer invoice readiness ready");
  assertEqual(invoiceZatcaReadiness.signing.status, "BLOCKED", "ZATCA invoice signing readiness blocked");
  assertEqual(invoiceZatcaReadiness.phase2Qr.status, "BLOCKED", "ZATCA invoice Phase 2 QR readiness blocked");
  assertEqual(invoiceZatcaReadiness.pdfA3.status, "BLOCKED", "ZATCA invoice PDF/A-3 readiness blocked");
  assert(invoiceZatcaReadiness.buyerContact.checks.every((check) => check.severity !== "ERROR"), "ZATCA buyer invoice readiness has no blocking checks");
  assert(
    invoiceZatcaReadiness.checks.every((check) => check.code !== "ZATCA_BUYER_BUILDING_NUMBER_MISSING"),
    "ZATCA buyer building-number warning cleared in smoke data",
  );
  const metadataAfterReadiness = await get<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca`, headers);
  assertEqual(metadataAfterReadiness.icv, metadataBeforeReadiness.icv, "ZATCA invoice readiness does not mutate ICV");
  assertEqual(metadataAfterReadiness.invoiceHash, metadataBeforeReadiness.invoiceHash, "ZATCA invoice readiness does not mutate invoice hash");
  assertEqual(metadataAfterReadiness.previousInvoiceHash, metadataBeforeReadiness.previousInvoiceHash, "ZATCA invoice readiness does not mutate previous hash");
  assertNoPrivateKey(invoiceZatcaReadiness, "ZATCA invoice readiness response");
  const metadataBeforeSigningPlan = await get<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca`, headers);
  const zatcaSigningPlan = await get<ZatcaInvoiceSigningPlanResponse>(`/sales-invoices/${draftInvoice.id}/zatca/signing-plan`, headers);
  assertEqual(zatcaSigningPlan.localOnly, true, "ZATCA signing plan localOnly");
  assertEqual(zatcaSigningPlan.dryRun, true, "ZATCA signing plan dryRun");
  assertEqual(zatcaSigningPlan.noMutation, true, "ZATCA signing plan noMutation");
  assertEqual(zatcaSigningPlan.productionCompliance, false, "ZATCA signing plan productionCompliance");
  assertEqual(zatcaSigningPlan.executionEnabled, false, "ZATCA signing plan execution disabled");
  assert(zatcaSigningPlan.sdkCommand.includes("-sign"), "ZATCA signing plan uses SDK sign command");
  assert(zatcaSigningPlan.commandPlan.displayCommand.includes("-signedInvoice"), "ZATCA signing plan includes signed output path");
  assert(zatcaSigningPlan.requiredInputs.some((input) => input.id === "certificate"), "ZATCA signing plan lists certificate input");
  assert(zatcaSigningPlan.requiredInputs.some((input) => input.id === "privateKeyCustody"), "ZATCA signing plan lists private key custody input");
  assert(zatcaSigningPlan.blockers.length > 0, "ZATCA signing plan returns blockers");
  assertNoPrivateKey(zatcaSigningPlan, "ZATCA signing plan response");
  const metadataAfterSigningPlan = await get<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca`, headers);
  assertEqual(metadataAfterSigningPlan.icv, metadataBeforeSigningPlan.icv, "ZATCA signing plan does not mutate ICV");
  assertEqual(metadataAfterSigningPlan.invoiceHash, metadataBeforeSigningPlan.invoiceHash, "ZATCA signing plan does not mutate invoice hash");
  assertEqual(metadataAfterSigningPlan.previousInvoiceHash, metadataBeforeSigningPlan.previousInvoiceHash, "ZATCA signing plan does not mutate previous hash");
  const metadataBeforeLocalSigningDryRun = await get<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca`, headers);
  const zatcaLocalSigningDryRun = await post<ZatcaInvoiceLocalSigningDryRunResponse>(`/sales-invoices/${draftInvoice.id}/zatca/local-signing-dry-run`, headers, {});
  assertEqual(zatcaLocalSigningDryRun.localOnly, true, "ZATCA local signing dry-run localOnly");
  assertEqual(zatcaLocalSigningDryRun.dryRun, true, "ZATCA local signing dry-run dryRun");
  assertEqual(zatcaLocalSigningDryRun.noMutation, true, "ZATCA local signing dry-run noMutation");
  assertEqual(zatcaLocalSigningDryRun.noCsidRequest, true, "ZATCA local signing dry-run no CSID request");
  assertEqual(zatcaLocalSigningDryRun.noNetwork, true, "ZATCA local signing dry-run no network");
  assertEqual(zatcaLocalSigningDryRun.noClearanceReporting, true, "ZATCA local signing dry-run no clearance/reporting");
  assertEqual(zatcaLocalSigningDryRun.noPdfA3, true, "ZATCA local signing dry-run no PDF/A-3");
  assertEqual(zatcaLocalSigningDryRun.noProductionCredentials, true, "ZATCA local signing dry-run no production credentials");
  assertEqual(zatcaLocalSigningDryRun.productionCompliance, false, "ZATCA local signing dry-run productionCompliance");
  assertEqual(zatcaLocalSigningDryRun.executionEnabled, false, "ZATCA local signing dry-run execution disabled by default");
  assertEqual(zatcaLocalSigningDryRun.executionAttempted, false, "ZATCA local signing dry-run execution not attempted by default");
  assertEqual(zatcaLocalSigningDryRun.executionStatus, "SKIPPED", "ZATCA local signing dry-run skipped by default");
  assertEqual(zatcaLocalSigningDryRun.signingExecuted, false, "ZATCA local signing dry-run signing not executed by default");
  assertEqual(zatcaLocalSigningDryRun.qrExecuted, false, "ZATCA local signing dry-run QR not executed by default");
  assertEqual(zatcaLocalSigningDryRun.tempFilesWritten.sdkConfig, false, "ZATCA local signing dry-run SDK config not written by default");
  assertEqual(zatcaLocalSigningDryRun.tempFilesWritten.sdkRuntime, false, "ZATCA local signing dry-run SDK runtime not staged by default");
  assertEqual(zatcaLocalSigningDryRun.signedXmlDetected, false, "ZATCA local signing dry-run signed XML not detected by default");
  assertEqual(zatcaLocalSigningDryRun.qrDetected, false, "ZATCA local signing dry-run QR not detected by default");
  assert(zatcaLocalSigningDryRun.phase2Qr.blockers.length > 0, "ZATCA local signing dry-run reports Phase 2 QR blockers");
  assertNoPrivateKey(zatcaLocalSigningDryRun, "ZATCA local signing dry-run response");
  const metadataAfterLocalSigningDryRun = await get<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca`, headers);
  assertEqual(metadataAfterLocalSigningDryRun.icv, metadataBeforeLocalSigningDryRun.icv, "ZATCA local signing dry-run does not mutate ICV");
  assertEqual(metadataAfterLocalSigningDryRun.invoiceHash, metadataBeforeLocalSigningDryRun.invoiceHash, "ZATCA local signing dry-run does not mutate invoice hash");
  assertEqual(metadataAfterLocalSigningDryRun.previousInvoiceHash, metadataBeforeLocalSigningDryRun.previousInvoiceHash, "ZATCA local signing dry-run does not mutate previous hash");
  const zatcaSdkReadiness = await get<ZatcaSdkReadinessResponse>("/zatca-sdk/readiness", headers);
  assertEqual(zatcaSdkReadiness.enabled, false, "ZATCA SDK execution disabled by default");
  assert(typeof zatcaSdkReadiness.referenceFolderFound === "boolean", "ZATCA SDK readiness returns reference folder flag");
  assert(typeof zatcaSdkReadiness.sdkJarFound === "boolean", "ZATCA SDK readiness returns SDK JAR flag");
  assert(typeof zatcaSdkReadiness.configDirFound === "boolean", "ZATCA SDK readiness returns config dir flag");
  assert(typeof zatcaSdkReadiness.workingDirectoryWritable === "boolean", "ZATCA SDK readiness returns work directory flag");
  assert(typeof zatcaSdkReadiness.supportedCommandsKnown === "boolean", "ZATCA SDK readiness returns command support flag");
  assert(typeof zatcaSdkReadiness.javaFound === "boolean", "ZATCA SDK readiness returns Java flag");
  assert(typeof zatcaSdkReadiness.javaSupported === "boolean", "ZATCA SDK readiness returns Java supported flag");
  assertEqual(zatcaSdkReadiness.requiredJavaRange, ">=11 <15", "ZATCA SDK readiness required Java range");
  assertEqual(zatcaSdkReadiness.sdkCommand, "fatoora -validate -invoice <filename>", "ZATCA SDK readiness documented command");
  assert(typeof zatcaSdkReadiness.javaBinUsed === "string", "ZATCA SDK readiness returns Java bin used");
  assertEqual(zatcaSdkReadiness.hashMode?.mode, "LOCAL_DETERMINISTIC", "ZATCA hash mode default remains local deterministic");
  assertEqual(zatcaSdkReadiness.canRunLocalValidation, false, "ZATCA SDK local validation cannot run by default");
  assert(zatcaSdkReadiness.blockingReasons.length > 0, "ZATCA SDK readiness returns disabled blockers");
  assertNoPrivateKey(zatcaSdkReadiness, "ZATCA SDK readiness response");
  const zatcaSdkDryRun = await post<ZatcaSdkDryRunResponse>("/zatca-sdk/validate-xml-dry-run", headers, { invoiceId: draftInvoice.id, mode: "dry-run" });
  assertEqual(zatcaSdkDryRun.dryRun, true, "ZATCA SDK dry-run flag");
  assertEqual(zatcaSdkDryRun.localOnly, true, "ZATCA SDK dry-run localOnly");
  assertEqual(zatcaSdkDryRun.officialSdkValidation, false, "ZATCA SDK dry-run does not execute SDK");
  assert(
    Boolean(zatcaSdkDryRun.commandPlan.command) || zatcaSdkDryRun.warnings.length > 0 || zatcaSdkDryRun.commandPlan.warnings.length > 0,
    "ZATCA SDK dry-run returns command plan or safe warnings",
  );
  assertNoPrivateKey(zatcaSdkDryRun, "ZATCA SDK dry-run response");
  const zatcaSdkLocalValidation = await post<ZatcaSdkValidationResponse>(`/sales-invoices/${draftInvoice.id}/zatca/sdk-validate`, headers, {});
  assertEqual(zatcaSdkLocalValidation.localOnly, true, "ZATCA SDK local validation localOnly");
  assertEqual(zatcaSdkLocalValidation.officialValidationAttempted, false, "ZATCA SDK local validation disabled by default");
  assertEqual(zatcaSdkLocalValidation.disabled, true, "ZATCA SDK local validation disabled flag");
  assertEqual(zatcaSdkLocalValidation.hashComparisonStatus, "BLOCKED", "ZATCA SDK local hash comparison blocked by default");
  assertEqual(zatcaSdkLocalValidation.hashMatches, null, "ZATCA SDK local hash comparison does not run by default");
  assertNoPrivateKey(zatcaSdkLocalValidation, "ZATCA SDK local validation response");
  const metadataBeforeHashCompare = await get<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca`, headers);
  const zatcaHashCompare = await post<ZatcaInvoiceHashCompareResponse>(`/sales-invoices/${draftInvoice.id}/zatca/hash-compare`, headers, {});
  assertEqual(zatcaHashCompare.localOnly, true, "ZATCA hash compare localOnly");
  assertEqual(zatcaHashCompare.noMutation, true, "ZATCA hash compare noMutation");
  assertEqual(zatcaHashCompare.officialHashAttempted, false, "ZATCA hash compare disabled by default");
  assertEqual(zatcaHashCompare.hashComparisonStatus, "BLOCKED", "ZATCA hash compare blocked by default");
  assertEqual(zatcaHashCompare.hashMode.mode, "LOCAL_DETERMINISTIC", "ZATCA hash compare local hash mode");
  assertEqual(zatcaHashCompare.egsHashMode, "LOCAL_DETERMINISTIC", "ZATCA hash compare EGS hash mode");
  assertEqual(zatcaHashCompare.metadataHashModeSnapshot, "LOCAL_DETERMINISTIC", "ZATCA hash compare metadata hash mode snapshot");
  const metadataAfterHashCompare = await get<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca`, headers);
  assertEqual(metadataAfterHashCompare.icv, metadataBeforeHashCompare.icv, "ZATCA hash compare does not mutate ICV");
  assertEqual(metadataAfterHashCompare.invoiceHash, metadataBeforeHashCompare.invoiceHash, "ZATCA hash compare does not mutate invoice hash");
  assertEqual(metadataAfterHashCompare.previousInvoiceHash, metadataBeforeHashCompare.previousInvoiceHash, "ZATCA hash compare does not mutate previous hash");
  assertNoPrivateKey(zatcaHashCompare, "ZATCA hash compare response");
  const zatcaHashResetPlan = await get<ZatcaHashChainResetPlanResponse>("/zatca/hash-chain-reset-plan", headers);
  assertEqual(zatcaHashResetPlan.dryRunOnly, true, "ZATCA hash-chain reset plan dryRunOnly");
  assertEqual(zatcaHashResetPlan.noMutation, true, "ZATCA hash-chain reset plan noMutation");
  assertEqual(zatcaHashResetPlan.hashMode.mode, "LOCAL_DETERMINISTIC", "ZATCA hash-chain reset plan local hash mode");
  assert(typeof zatcaHashResetPlan.summary.sdkModeEgsUnitCount === "number", "ZATCA hash-chain reset plan SDK mode count");
  assert(
    zatcaHashResetPlan.egsUnits.some(
      (unit) => unit.id === smokeEgs.id && unit.hashMode === "LOCAL_DETERMINISTIC" && unit.metadataCount > 0 && unit.canEnableSdkHashMode === false,
    ),
    "ZATCA hash-chain reset plan blocks SDK hash mode on EGS with metadata",
  );
  await expectHttpError("SDK hash mode enable blocked by default", () =>
    post<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}/enable-sdk-hash-mode`, headers, {
      reason: "Smoke confirms SDK hash mode remains explicitly blocked by default.",
      confirmReset: true,
    }),
  );
  assert(zatcaHashResetPlan.resetRisks.length > 0, "ZATCA hash-chain reset plan returns risks");
  assertNoPrivateKey(zatcaHashResetPlan, "ZATCA hash-chain reset plan response");
  const zatcaSdkFixtureValidation = await post<ZatcaSdkValidationResponse>("/zatca-sdk/validate-reference-fixture", headers, {
    fixturePath: "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml",
  });
  assertEqual(zatcaSdkFixtureValidation.localOnly, true, "ZATCA SDK fixture validation localOnly");
  assertEqual(zatcaSdkFixtureValidation.officialValidationAttempted, false, "ZATCA SDK fixture validation disabled by default");
  assertEqual(zatcaSdkFixtureValidation.disabled, true, "ZATCA SDK fixture validation disabled flag");
  assertEqual(zatcaSdkFixtureValidation.hashComparisonStatus, "BLOCKED", "ZATCA SDK fixture hash comparison blocked by default");
  assertNoPrivateKey(zatcaSdkFixtureValidation, "ZATCA SDK fixture validation response");
  const zatcaQr = await get<ZatcaQrResponse>(`/sales-invoices/${draftInvoice.id}/zatca/qr`, headers);
  assertPresent(zatcaQr.qrCodeBase64, "ZATCA QR endpoint payload");
  const checkedZatcaMetadata = await post<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca/compliance-check`, headers, {});
  assertEqual(checkedZatcaMetadata.zatcaStatus, "READY_FOR_SUBMISSION", "ZATCA mock compliance-check status");
  const invoiceZatcaSubmissions = await get<ZatcaSubmissionLog[]>("/zatca/submissions", headers);
  assert(
    invoiceZatcaSubmissions.some(
      (log) => log.invoiceMetadataId === zatcaMetadata.id && log.responseCode === "LOCAL_MOCK_COMPLIANCE_CHECK" && log.status === "SUCCESS",
    ),
    "ZATCA submissions include local mock invoice compliance-check log",
  );
  await expectHttpError("mock clearance safe block", () => post<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca/clearance`, headers, {}));
  await expectHttpError("mock reporting safe block", () => post<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca/reporting`, headers, {}));
  const blockedZatcaSubmissions = await get<ZatcaSubmissionLog[]>("/zatca/submissions", headers);
  assert(
    blockedZatcaSubmissions.some((log) => log.invoiceMetadataId === zatcaMetadata.id && log.submissionType === "CLEARANCE" && log.status === "FAILED"),
    "ZATCA submissions include safe blocked clearance log",
  );
  assert(
    blockedZatcaSubmissions.some((log) => log.invoiceMetadataId === zatcaMetadata.id && log.submissionType === "REPORTING" && log.status === "FAILED"),
    "ZATCA submissions include safe blocked reporting log",
  );

  await expectHttpError("over-allocation payment", () =>
    post<CustomerPayment>("/customer-payments", headers, {
      customerId: customer.id,
      paymentDate: new Date().toISOString(),
      currency: "SAR",
      amountReceived: expectedTotal.plus(1).toFixed(4),
      accountId: paidThroughAccount!.id,
      allocations: [{ invoiceId: draftInvoice.id, amountApplied: expectedTotal.plus(1).toFixed(4) }],
    }),
  );

  const bankBeforePartialPayment = await get<BankAccountSummary>(`/bank-accounts/${paidThroughBankProfile.id}`, headers);
  const partialPayment = await post<CustomerPayment>("/customer-payments", headers, {
    customerId: customer.id,
    paymentDate: new Date().toISOString(),
    currency: "SAR",
    amountReceived: partialPaymentAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test partial payment",
    allocations: [{ invoiceId: draftInvoice.id, amountApplied: partialPaymentAmount.toFixed(4) }],
  });
  assertEqual(partialPayment.status, "POSTED", "partial payment status");
  const bankAfterPartialPayment = await get<BankAccountSummary>(`/bank-accounts/${paidThroughBankProfile.id}`, headers);
  assertMoney(
    bankAfterPartialPayment.ledgerBalance,
    money(bankBeforePartialPayment.ledgerBalance).plus(partialPaymentAmount),
    "bank account balance after customer payment",
  );

  const afterPartialPayment = await get<SalesInvoice>(`/sales-invoices/${draftInvoice.id}`, headers);
  assertMoney(afterPartialPayment.balanceDue, remainingPaymentAmount, "invoice balance after partial payment");

  const remainingPayment = await post<CustomerPayment>("/customer-payments", headers, {
    customerId: customer.id,
    paymentDate: new Date().toISOString(),
    currency: "SAR",
    amountReceived: remainingPaymentAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test remaining payment",
    allocations: [{ invoiceId: draftInvoice.id, amountApplied: remainingPaymentAmount.toFixed(4) }],
  });
  assertEqual(remainingPayment.status, "POSTED", "remaining payment status");

  const afterFullPayment = await get<SalesInvoice>(`/sales-invoices/${draftInvoice.id}`, headers);
  assertMoney(afterFullPayment.balanceDue, money(0), "invoice balance after remaining payment");

  const ledgerBeforeVoid = await get<LedgerResponse>(`/contacts/${customer.id}/ledger`, headers);
  assert(
    ledgerBeforeVoid.rows.some((row) => row.type === "INVOICE" && row.sourceId === draftInvoice.id && money(row.debit).eq(expectedTotal)),
    "ledger includes invoice debit",
  );
  assert(
    ledgerBeforeVoid.rows.some((row) => row.type === "PAYMENT" && row.sourceId === partialPayment.id && money(row.credit).eq(partialPaymentAmount)),
    "ledger includes partial payment credit",
  );
  assert(
    ledgerBeforeVoid.rows.some((row) => row.type === "PAYMENT" && row.sourceId === remainingPayment.id && money(row.credit).eq(remainingPaymentAmount)),
    "ledger includes remaining payment credit",
  );
  assertMoney(ledgerBeforeVoid.closingBalance, money(0), "ledger closing balance before void");

  const { from, to } = statementRange();
  const statement = await get<LedgerResponse>(`/contacts/${customer.id}/statement?from=${from}&to=${to}`, headers);
  assert(statement.rows.length > 0, "statement returns rows");
  assertMoney(statement.closingBalance, money(0), "statement closing balance before void");

  const receipt = await get<ReceiptData>(`/customer-payments/${partialPayment.id}/receipt-data`, headers);
  assertEqual(receipt.customer?.id, customer.id, "receipt customer id");
  assertPresent(receipt.journalEntry?.id, "receipt journal entry id");
  assert(receipt.allocations.some((allocation) => allocation.invoiceId === draftInvoice.id), "receipt includes invoice allocation");

  const invoicePdfData = await get<{ invoice: { total: string; balanceDue: string }; lines: unknown[] }>(
    `/sales-invoices/${draftInvoice.id}/pdf-data`,
    headers,
  );
  assertMoney(invoicePdfData.invoice.total, expectedTotal, "invoice pdf-data total");
  assert(invoicePdfData.lines.length > 0, "invoice pdf-data returns lines");
  await assertPdf(`/sales-invoices/${draftInvoice.id}/pdf`, headers, "invoice PDF");
  const invoiceDocuments = await get<GeneratedDocument[]>(
    `/generated-documents?documentType=SALES_INVOICE&sourceId=${encodeURIComponent(draftInvoice.id)}`,
    headers,
  );
  const archivedInvoicePdf = required(
    invoiceDocuments.find((document) => document.sourceId === draftInvoice.id && document.status === "GENERATED"),
    "archived invoice PDF document",
  );
  await assertPdf(`/generated-documents/${archivedInvoicePdf.id}/download`, headers, "archived invoice PDF");

  const receiptPdfData = await get<{ payment: { paymentNumber: string }; allocations: unknown[] }>(
    `/customer-payments/${partialPayment.id}/receipt-pdf-data`,
    headers,
  );
  assertEqual(receiptPdfData.payment.paymentNumber, partialPayment.paymentNumber, "receipt pdf-data payment number");
  assert(receiptPdfData.allocations.length > 0, "receipt pdf-data returns allocations");
  await assertPdf(`/customer-payments/${partialPayment.id}/receipt.pdf`, headers, "receipt PDF");

  const statementPdfData = await get<{ closingBalance: string; rows: unknown[] }>(
    `/contacts/${customer.id}/statement-pdf-data?from=${from}&to=${to}`,
    headers,
  );
  assertMoney(statementPdfData.closingBalance, money(0), "statement pdf-data closing balance before void");
  assert(statementPdfData.rows.length > 0, "statement pdf-data returns rows");
  await assertPdf(`/contacts/${customer.id}/statement.pdf?from=${from}&to=${to}`, headers, "statement PDF");

  const refundCustomer = await post<Contact>("/contacts", headers, {
    type: "CUSTOMER",
    name: `Smoke Refund Customer ${runId}`,
    displayName: `Smoke Refund Customer ${runId}`,
    countryCode: "SA",
  });
  const refundDraftInvoice = await post<SalesInvoice>("/sales-invoices", headers, {
    customerId: refundCustomer.id,
    issueDate: new Date().toISOString(),
    currency: "SAR",
    lines: [linePayload],
  });
  const refundInvoice = await post<SalesInvoice>(`/sales-invoices/${refundDraftInvoice.id}/finalize`, headers, {});
  const overpaymentAmount = expectedTotal.plus(20);
  const refundSourcePayment = await post<CustomerPayment>("/customer-payments", headers, {
    customerId: refundCustomer.id,
    paymentDate: new Date().toISOString(),
    currency: "SAR",
    amountReceived: overpaymentAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test overpayment for refund",
    allocations: [{ invoiceId: refundInvoice.id, amountApplied: expectedTotal.toFixed(4) }],
  });
  assertEqual(refundSourcePayment.status, "POSTED", "refund source payment status");
  assertMoney(refundSourcePayment.unappliedAmount, money("20.0000"), "refund source payment opening unapplied amount");
  const paymentRefundAmount = money("7.0000");
  const paymentRefund = await post<CustomerRefund>("/customer-refunds", headers, {
    customerId: refundCustomer.id,
    sourceType: "CUSTOMER_PAYMENT",
    sourcePaymentId: refundSourcePayment.id,
    refundDate: new Date().toISOString(),
    currency: "SAR",
    amountRefunded: paymentRefundAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test payment refund",
  });
  assertEqual(paymentRefund.status, "POSTED", "payment refund status");
  assertPresent(paymentRefund.journalEntryId, "payment refund journal entry id");
  const afterPaymentRefund = await get<CustomerPayment>(`/customer-payments/${refundSourcePayment.id}`, headers);
  assertMoney(afterPaymentRefund.unappliedAmount, money("13.0000"), "payment unapplied amount after refund");
  const refundCustomerLedger = await get<LedgerResponse>(`/contacts/${refundCustomer.id}/ledger`, headers);
  assert(
    refundCustomerLedger.rows.some(
      (row) => row.type === "CUSTOMER_REFUND" && row.sourceId === paymentRefund.id && money(row.debit).eq(paymentRefundAmount),
    ),
    "ledger includes customer refund row for payment refund",
  );
  assertMoney(refundCustomerLedger.closingBalance, money("-13.0000"), "refund customer ledger after payment refund");
  await assertPdf(`/customer-refunds/${paymentRefund.id}/pdf`, headers, "customer refund PDF");
  const voidedPaymentRefund = await post<CustomerRefund>(`/customer-refunds/${paymentRefund.id}/void`, headers, {});
  assertEqual(voidedPaymentRefund.status, "VOIDED", "voided payment refund status");
  assertPresent(voidedPaymentRefund.voidReversalJournalEntryId, "voided payment refund reversal journal");
  const afterPaymentRefundVoid = await get<CustomerPayment>(`/customer-payments/${refundSourcePayment.id}`, headers);
  assertMoney(afterPaymentRefundVoid.unappliedAmount, money("20.0000"), "payment unapplied amount after refund void");
  const refundCustomerLedgerAfterVoid = await get<LedgerResponse>(`/contacts/${refundCustomer.id}/ledger`, headers);
  assert(
    refundCustomerLedgerAfterVoid.rows.some(
      (row) => row.type === "VOID_CUSTOMER_REFUND" && row.sourceId === paymentRefund.id && money(row.credit).eq(paymentRefundAmount),
    ),
    "ledger includes void customer refund row for payment refund",
  );
  assertMoney(refundCustomerLedgerAfterVoid.closingBalance, money("-20.0000"), "refund customer ledger after payment refund void");

  const paymentUnappliedDraftInvoice = await post<SalesInvoice>("/sales-invoices", headers, {
    customerId: refundCustomer.id,
    issueDate: new Date().toISOString(),
    currency: "SAR",
    lines: [linePayload],
  });
  const paymentUnappliedInvoice = await post<SalesInvoice>(
    `/sales-invoices/${paymentUnappliedDraftInvoice.id}/finalize`,
    headers,
    {},
  );
  assertMoney(paymentUnappliedInvoice.balanceDue, expectedTotal, "payment unapplied application invoice opening balance");

  const paymentUnappliedApplyAmount = money("8.0000");
  const paymentBeforeUnappliedApply = await get<CustomerPayment>(`/customer-payments/${refundSourcePayment.id}`, headers);
  const appliedUnappliedPayment = await post<CustomerPayment>(`/customer-payments/${refundSourcePayment.id}/apply-unapplied`, headers, {
    invoiceId: paymentUnappliedInvoice.id,
    amountApplied: paymentUnappliedApplyAmount.toFixed(4),
  });
  assertEqual(
    appliedUnappliedPayment.journalEntryId,
    paymentBeforeUnappliedApply.journalEntryId,
    "unapplied payment application reuses original payment journal only",
  );
  assertMoney(appliedUnappliedPayment.unappliedAmount, money("20.0000").minus(paymentUnappliedApplyAmount), "payment unapplied amount after invoice application");
  const paymentUnappliedInvoiceAfterApply = await get<SalesInvoice>(`/sales-invoices/${paymentUnappliedInvoice.id}`, headers);
  assertMoney(paymentUnappliedInvoiceAfterApply.balanceDue, expectedTotal.minus(paymentUnappliedApplyAmount), "invoice balance after unapplied payment application");
  const paymentUnappliedAllocations = await get<CustomerPaymentUnappliedAllocation[]>(
    `/customer-payments/${refundSourcePayment.id}/unapplied-allocations`,
    headers,
  );
  const paymentUnappliedAllocation = required(
    paymentUnappliedAllocations.find(
      (allocation) => allocation.invoiceId === paymentUnappliedInvoice.id && money(allocation.amountApplied).eq(paymentUnappliedApplyAmount),
    ),
    "payment unapplied allocation for smoke application",
  );
  const invoicePaymentUnappliedAllocations = await get<CustomerPaymentUnappliedAllocation[]>(
    `/sales-invoices/${paymentUnappliedInvoice.id}/customer-payment-unapplied-allocations`,
    headers,
  );
  assert(
    invoicePaymentUnappliedAllocations.some((allocation) => allocation.id === paymentUnappliedAllocation.id),
    "invoice exposes unapplied payment allocation",
  );
  const receiptAfterPaymentUnappliedApply = await get<ReceiptData>(`/customer-payments/${refundSourcePayment.id}/receipt-data`, headers);
  assert(
    Boolean(receiptAfterPaymentUnappliedApply.unappliedAllocations?.some(
      (allocation) => allocation.invoiceId === paymentUnappliedInvoice.id && money(allocation.amountApplied).eq(paymentUnappliedApplyAmount),
    )),
    "receipt-data includes unapplied payment allocation",
  );
  const ledgerAfterPaymentUnappliedApply = await get<LedgerResponse>(`/contacts/${refundCustomer.id}/ledger`, headers);
  const paymentUnappliedAllocationRow = required(
    ledgerAfterPaymentUnappliedApply.rows.find(
      (row) =>
        row.type === "CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION" &&
        row.sourceId === paymentUnappliedAllocation.id &&
        money(row.debit).eq(0) &&
        money(row.credit).eq(0),
    ),
    "ledger row for unapplied payment allocation",
  );
  assertMoney(paymentUnappliedAllocationRow.balance, expectedTotal.minus(money("20.0000")), "unapplied payment allocation row keeps running balance unchanged");
  assertMoney(
    ledgerAfterPaymentUnappliedApply.closingBalance,
    expectedTotal.minus(money("20.0000")),
    "refund customer ledger after unapplied payment application",
  );

  await expectHttpError("refund above current payment unapplied amount", () =>
    post<CustomerRefund>("/customer-refunds", headers, {
      customerId: refundCustomer.id,
      sourceType: "CUSTOMER_PAYMENT",
      sourcePaymentId: refundSourcePayment.id,
      refundDate: new Date().toISOString(),
      currency: "SAR",
      amountRefunded: "13.0000",
      accountId: paidThroughAccount!.id,
      description: "Smoke test refund above current unapplied amount",
    }),
  );
  await expectHttpError("void payment with active unapplied allocation", () =>
    post<CustomerPayment>(`/customer-payments/${refundSourcePayment.id}/void`, headers, {}),
  );
  await expectHttpError("void invoice with active unapplied payment allocation", () =>
    post<SalesInvoice>(`/sales-invoices/${paymentUnappliedInvoice.id}/void`, headers, {}),
  );

  const reversedUnappliedPayment = await post<CustomerPayment>(
    `/customer-payments/${refundSourcePayment.id}/unapplied-allocations/${paymentUnappliedAllocation.id}/reverse`,
    headers,
    { reason: "Smoke test unapplied payment allocation reversal" },
  );
  assertMoney(reversedUnappliedPayment.unappliedAmount, money("20.0000"), "payment unapplied amount after allocation reversal");
  const paymentUnappliedInvoiceAfterReverse = await get<SalesInvoice>(`/sales-invoices/${paymentUnappliedInvoice.id}`, headers);
  assertMoney(paymentUnappliedInvoiceAfterReverse.balanceDue, expectedTotal, "invoice balance after unapplied payment allocation reversal");
  const reversedPaymentUnappliedAllocations = await get<CustomerPaymentUnappliedAllocation[]>(
    `/customer-payments/${refundSourcePayment.id}/unapplied-allocations`,
    headers,
  );
  assert(
    reversedPaymentUnappliedAllocations.some(
      (allocation) =>
        allocation.id === paymentUnappliedAllocation.id &&
        Boolean(allocation.reversedAt) &&
        allocation.reversalReason === "Smoke test unapplied payment allocation reversal",
    ),
    "payment unapplied allocations include reversal metadata",
  );
  const ledgerAfterPaymentUnappliedReverse = await get<LedgerResponse>(`/contacts/${refundCustomer.id}/ledger`, headers);
  assert(
    ledgerAfterPaymentUnappliedReverse.rows.some(
      (row) =>
        row.type === "CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL" &&
        row.sourceId === paymentUnappliedAllocation.id &&
        money(row.debit).eq(0) &&
        money(row.credit).eq(0),
    ),
    "ledger includes neutral unapplied payment allocation reversal row",
  );
  assertMoney(
    ledgerAfterPaymentUnappliedReverse.closingBalance,
    expectedTotal.minus(money("20.0000")),
    "refund customer ledger after unapplied payment allocation reversal",
  );

  const creditApplicationDraftInvoice = await post<SalesInvoice>("/sales-invoices", headers, {
    customerId: customer.id,
    issueDate: new Date().toISOString(),
    currency: "SAR",
    lines: [linePayload],
  });
  const creditApplicationInvoice = await post<SalesInvoice>(`/sales-invoices/${creditApplicationDraftInvoice.id}/finalize`, headers, {});
  assertEqual(creditApplicationInvoice.status, "FINALIZED", "credit application invoice status");
  assertMoney(creditApplicationInvoice.balanceDue, expectedTotal, "credit application invoice opening balance");

  const creditNoteLinePayload: Record<string, unknown> = {
    description: "Smoke test credit adjustment",
    accountId: salesAccount.id,
    quantity: "1.0000",
    unitPrice: "10.0000",
  };
  if (salesVat) {
    creditNoteLinePayload.taxRateId = salesVat.id;
  }
  const draftCreditNote = await post<CreditNote>("/credit-notes", headers, {
    customerId: customer.id,
    originalInvoiceId: creditApplicationInvoice.id,
    issueDate: new Date().toISOString(),
    currency: "SAR",
    reason: "Smoke test credit note",
    lines: [creditNoteLinePayload],
  });
  assertEqual(draftCreditNote.status, "DRAFT", "created credit note status");
  assertMoney(draftCreditNote.total, expectedCreditNoteTotal, "draft credit note total");
  assertMoney(draftCreditNote.unappliedAmount, expectedCreditNoteTotal, "draft credit note unapplied amount");

  const finalizedCreditNote = await post<CreditNote>(`/credit-notes/${draftCreditNote.id}/finalize`, headers, {});
  assertEqual(finalizedCreditNote.status, "FINALIZED", "finalized credit note status");
  assertPresent(finalizedCreditNote.journalEntryId, "finalized credit note journalEntryId");
  assertMoney(finalizedCreditNote.total, expectedCreditNoteTotal, "finalized credit note total");

  const finalizedCreditNoteAgain = await post<CreditNote>(`/credit-notes/${draftCreditNote.id}/finalize`, headers, {});
  assertEqual(finalizedCreditNoteAgain.journalEntryId, finalizedCreditNote.journalEntryId, "double finalize credit note journalEntryId");

  const invoiceCreditNotes = await get<CreditNote[]>(`/sales-invoices/${creditApplicationInvoice.id}/credit-notes`, headers);
  assert(
    invoiceCreditNotes.some((creditNote) => creditNote.id === draftCreditNote.id && creditNote.status === "FINALIZED"),
    "invoice linked credit notes include finalized smoke credit note",
  );

  const ledgerAfterCreditNote = await get<LedgerResponse>(`/contacts/${customer.id}/ledger`, headers);
  assert(
    ledgerAfterCreditNote.rows.some((row) => row.type === "CREDIT_NOTE" && row.sourceId === draftCreditNote.id && money(row.credit).eq(expectedCreditNoteTotal)),
    "ledger includes finalized credit note credit",
  );
  const expectedLedgerAfterCreditNote = expectedTotal.minus(expectedCreditNoteTotal);
  assertMoney(ledgerAfterCreditNote.closingBalance, expectedLedgerAfterCreditNote, "ledger closing balance after credit note");

  const creditApplyAmount = money("5.0000");
  const appliedCreditNote = await post<CreditNote>(`/credit-notes/${draftCreditNote.id}/apply`, headers, {
    invoiceId: creditApplicationInvoice.id,
    amountApplied: creditApplyAmount.toFixed(4),
  });
  assertMoney(appliedCreditNote.unappliedAmount, expectedCreditNoteTotal.minus(creditApplyAmount), "credit note unapplied amount after partial application");
  const afterCreditApplyInvoice = await get<SalesInvoice>(`/sales-invoices/${creditApplicationInvoice.id}`, headers);
  assertMoney(afterCreditApplyInvoice.balanceDue, expectedTotal.minus(creditApplyAmount), "invoice balance after credit note application");
  const creditNoteAllocations = await get<CreditNoteAllocation[]>(`/credit-notes/${draftCreditNote.id}/allocations`, headers);
  const creditNoteAllocation = required(
    creditNoteAllocations.find((allocation) => allocation.invoiceId === creditApplicationInvoice.id && money(allocation.amountApplied).eq(creditApplyAmount)),
    "credit note allocation for smoke application",
  );
  assert(
    !creditNoteAllocation.reversedAt,
    "credit note allocations include partial application",
  );
  const invoiceCreditAllocations = await get<CreditNoteAllocation[]>(`/sales-invoices/${creditApplicationInvoice.id}/credit-note-allocations`, headers);
  assert(
    invoiceCreditAllocations.some((allocation) => allocation.creditNoteId === draftCreditNote.id && money(allocation.amountApplied).eq(creditApplyAmount)),
    "invoice credit note allocations include partial application",
  );
  const ledgerAfterCreditApply = await get<LedgerResponse>(`/contacts/${customer.id}/ledger`, headers);
  assert(
    ledgerAfterCreditApply.rows.some(
      (row) => row.type === "CREDIT_NOTE_ALLOCATION" && row.sourceId === creditNoteAllocations[0]?.id && money(row.debit).eq(0) && money(row.credit).eq(0),
    ),
    "ledger includes neutral credit note allocation row",
  );
  assertMoney(ledgerAfterCreditApply.closingBalance, expectedLedgerAfterCreditNote, "ledger closing balance after credit allocation is not double counted");

  await expectHttpError("over-apply credit note", () =>
    post<CreditNote>(`/credit-notes/${draftCreditNote.id}/apply`, headers, {
      invoiceId: creditApplicationInvoice.id,
      amountApplied: expectedCreditNoteTotal.toFixed(4),
    }),
  );
  await expectHttpError("void allocated credit note", () => post<CreditNote>(`/credit-notes/${draftCreditNote.id}/void`, headers, {}));

  const reversedCreditNote = await post<CreditNote>(
    `/credit-notes/${draftCreditNote.id}/allocations/${creditNoteAllocation.id}/reverse`,
    headers,
    { reason: "Smoke test allocation reversal" },
  );
  assertMoney(reversedCreditNote.unappliedAmount, expectedCreditNoteTotal, "credit note unapplied amount after allocation reversal");
  const afterCreditReverseInvoice = await get<SalesInvoice>(`/sales-invoices/${creditApplicationInvoice.id}`, headers);
  assertMoney(afterCreditReverseInvoice.balanceDue, expectedTotal, "invoice balance after credit allocation reversal");
  const reversedCreditNoteAllocations = await get<CreditNoteAllocation[]>(`/credit-notes/${draftCreditNote.id}/allocations`, headers);
  assert(
    reversedCreditNoteAllocations.some(
      (allocation) => allocation.id === creditNoteAllocation.id && Boolean(allocation.reversedAt) && allocation.reversalReason === "Smoke test allocation reversal",
    ),
    "credit note allocations include reversal metadata",
  );
  const ledgerAfterCreditReverse = await get<LedgerResponse>(`/contacts/${customer.id}/ledger`, headers);
  assert(
    ledgerAfterCreditReverse.rows.some(
      (row) => row.type === "CREDIT_NOTE_ALLOCATION_REVERSAL" && row.sourceId === creditNoteAllocation.id && money(row.debit).eq(0) && money(row.credit).eq(0),
    ),
    "ledger includes neutral credit note allocation reversal row",
  );
  assertMoney(ledgerAfterCreditReverse.closingBalance, expectedLedgerAfterCreditNote, "ledger closing balance after credit allocation reversal is not double counted");

  const creditNotePdfData = await get<{ creditNote: { total: string; unappliedAmount: string }; lines: unknown[]; allocations: unknown[] }>(
    `/credit-notes/${draftCreditNote.id}/pdf-data`,
    headers,
  );
  assertMoney(creditNotePdfData.creditNote.total, expectedCreditNoteTotal, "credit note pdf-data total");
  assertMoney(creditNotePdfData.creditNote.unappliedAmount, expectedCreditNoteTotal, "credit note pdf-data unapplied amount after reversal");
  assert(creditNotePdfData.lines.length > 0, "credit note pdf-data returns lines");
  assert(creditNotePdfData.allocations.length > 0, "credit note pdf-data returns allocations");
  await assertPdf(`/credit-notes/${draftCreditNote.id}/pdf`, headers, "credit note PDF");
  const creditNoteDocuments = await get<GeneratedDocument[]>(
    `/generated-documents?documentType=CREDIT_NOTE&sourceId=${encodeURIComponent(draftCreditNote.id)}`,
    headers,
  );
  const archivedCreditNotePdf = required(
    creditNoteDocuments.find((document) => document.sourceId === draftCreditNote.id && document.status === "GENERATED"),
    "archived credit note PDF document",
  );
  await assertPdf(`/generated-documents/${archivedCreditNotePdf.id}/download`, headers, "archived credit note PDF");

  const creditNoteRefundAmount = money("2.0000");
  const creditNoteRefund = await post<CustomerRefund>("/customer-refunds", headers, {
    customerId: customer.id,
    sourceType: "CREDIT_NOTE",
    sourceCreditNoteId: draftCreditNote.id,
    refundDate: new Date().toISOString(),
    currency: "SAR",
    amountRefunded: creditNoteRefundAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test credit note refund",
  });
  assertEqual(creditNoteRefund.status, "POSTED", "credit note refund status");
  assertPresent(creditNoteRefund.journalEntryId, "credit note refund journal entry id");
  const afterCreditNoteRefund = await get<CreditNote>(`/credit-notes/${draftCreditNote.id}`, headers);
  assertMoney(afterCreditNoteRefund.unappliedAmount, expectedCreditNoteTotal.minus(creditNoteRefundAmount), "credit note unapplied amount after refund");
  const ledgerAfterCreditNoteRefund = await get<LedgerResponse>(`/contacts/${customer.id}/ledger`, headers);
  assert(
    ledgerAfterCreditNoteRefund.rows.some(
      (row) => row.type === "CUSTOMER_REFUND" && row.sourceId === creditNoteRefund.id && money(row.debit).eq(creditNoteRefundAmount),
    ),
    "ledger includes customer refund row for credit note refund",
  );
  assertMoney(
    ledgerAfterCreditNoteRefund.closingBalance,
    expectedLedgerAfterCreditNote.plus(creditNoteRefundAmount),
    "ledger closing balance after credit note refund",
  );
  await expectHttpError("void refunded credit note", () => post<CreditNote>(`/credit-notes/${draftCreditNote.id}/void`, headers, {}));
  const voidedCreditNoteRefund = await post<CustomerRefund>(`/customer-refunds/${creditNoteRefund.id}/void`, headers, {});
  assertEqual(voidedCreditNoteRefund.status, "VOIDED", "voided credit note refund status");
  assertPresent(voidedCreditNoteRefund.voidReversalJournalEntryId, "voided credit note refund reversal journal");
  const afterCreditNoteRefundVoid = await get<CreditNote>(`/credit-notes/${draftCreditNote.id}`, headers);
  assertMoney(afterCreditNoteRefundVoid.unappliedAmount, expectedCreditNoteTotal, "credit note unapplied amount after refund void");
  const ledgerAfterCreditNoteRefundVoid = await get<LedgerResponse>(`/contacts/${customer.id}/ledger`, headers);
  assert(
    ledgerAfterCreditNoteRefundVoid.rows.some(
      (row) => row.type === "VOID_CUSTOMER_REFUND" && row.sourceId === creditNoteRefund.id && money(row.credit).eq(creditNoteRefundAmount),
    ),
    "ledger includes void customer refund row for credit note refund",
  );
  assertMoney(
    ledgerAfterCreditNoteRefundVoid.closingBalance,
    expectedLedgerAfterCreditNote,
    "ledger closing balance after credit note refund void",
  );

  const voidedCreditNote = await post<CreditNote>(`/credit-notes/${draftCreditNote.id}/void`, headers, {});
  assertEqual(voidedCreditNote.status, "VOIDED", "voided credit note after allocation reversal status");
  assertPresent(voidedCreditNote.reversalJournalEntryId, "voided credit note reversal journal after allocation reversal");

  const supplier = await post<Contact>("/contacts", headers, {
    type: "SUPPLIER",
    name: `Smoke Test Supplier ${runId}`,
    displayName: `Smoke Test Supplier ${runId}`,
    countryCode: "SA",
  });
  const purchaseBillLinePayload: Record<string, unknown> = {
    description: "Smoke test supplier bill line",
    accountId: expenseAccount.id,
    quantity: "1.0000",
    unitPrice: "100.0000",
  };
  if (purchaseVat) {
    purchaseBillLinePayload.taxRateId = purchaseVat.id;
  }

  const poSupplier = await post<Contact>("/contacts", headers, {
    type: "SUPPLIER",
    name: `Smoke Test PO Supplier ${runId}`,
    displayName: `Smoke Test PO Supplier ${runId}`,
    countryCode: "SA",
  });
  const purchaseOrder = await post<PurchaseOrder>("/purchase-orders", headers, {
    supplierId: poSupplier.id,
    orderDate: new Date().toISOString(),
    expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    currency: "SAR",
    notes: "Smoke purchase order",
    terms: "Convert to bill smoke",
    lines: [purchaseBillLinePayload],
  });
  assertEqual(purchaseOrder.status, "DRAFT", "created purchase order status");
  assertMoney(purchaseOrder.total, expectedPurchaseBillTotal, "draft purchase order total");
  const approvedPurchaseOrder = await post<PurchaseOrder>(`/purchase-orders/${purchaseOrder.id}/approve`, headers, {});
  assertEqual(approvedPurchaseOrder.status, "APPROVED", "approved purchase order status");
  const sentPurchaseOrder = await post<PurchaseOrder>(`/purchase-orders/${purchaseOrder.id}/mark-sent`, headers, {});
  assertEqual(sentPurchaseOrder.status, "SENT", "sent purchase order status");
  const purchaseOrderPdfData = await get<{ purchaseOrder: { total: string }; lines: unknown[] }>(
    `/purchase-orders/${purchaseOrder.id}/pdf-data`,
    headers,
  );
  assertMoney(purchaseOrderPdfData.purchaseOrder.total, expectedPurchaseBillTotal, "purchase order pdf-data total");
  assert(purchaseOrderPdfData.lines.length > 0, "purchase order pdf-data returns lines");
  await assertPdf(`/purchase-orders/${purchaseOrder.id}/pdf`, headers, "purchase order PDF");
  const convertedPurchaseBill = await post<PurchaseBill>(`/purchase-orders/${purchaseOrder.id}/convert-to-bill`, headers, {});
  assertEqual(convertedPurchaseBill.status, "DRAFT", "converted purchase bill status");
  assertEqual(convertedPurchaseBill.purchaseOrderId, purchaseOrder.id, "converted purchase bill source PO");
  assertMoney(convertedPurchaseBill.total, expectedPurchaseBillTotal, "converted purchase bill total");
  assert(!convertedPurchaseBill.journalEntryId, "converted purchase bill has no journal before finalization");
  const billedPurchaseOrder = await get<PurchaseOrder>(`/purchase-orders/${purchaseOrder.id}`, headers);
  assertEqual(billedPurchaseOrder.status, "BILLED", "purchase order status after conversion");
  assertEqual(billedPurchaseOrder.convertedBillId, convertedPurchaseBill.id, "purchase order converted bill id");
  const finalizedConvertedPurchaseBill = await post<PurchaseBill>(
    `/purchase-bills/${convertedPurchaseBill.id}/finalize`,
    headers,
    {},
  );
  assertEqual(finalizedConvertedPurchaseBill.status, "FINALIZED", "finalized converted purchase bill status");
  assertPresent(finalizedConvertedPurchaseBill.journalEntryId, "finalized converted purchase bill journalEntryId");

  const draftPurchaseBill = await post<PurchaseBill>("/purchase-bills", headers, {
    supplierId: supplier.id,
    billDate: new Date().toISOString(),
    currency: "SAR",
    notes: "Smoke purchase bill",
    lines: [purchaseBillLinePayload],
  });
  assertEqual(draftPurchaseBill.status, "DRAFT", "created purchase bill status");
  assertMoney(draftPurchaseBill.total, expectedPurchaseBillTotal, "draft purchase bill total");

  const finalizedPurchaseBill = await post<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}/finalize`, headers, {});
  assertEqual(finalizedPurchaseBill.status, "FINALIZED", "finalized purchase bill status");
  assertPresent(finalizedPurchaseBill.journalEntryId, "finalized purchase bill journalEntryId");
  assertMoney(finalizedPurchaseBill.balanceDue, expectedPurchaseBillTotal, "finalized purchase bill balanceDue");
  const finalizedPurchaseBillAgain = await post<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}/finalize`, headers, {});
  assertEqual(finalizedPurchaseBillAgain.journalEntryId, finalizedPurchaseBill.journalEntryId, "double finalize purchase bill journalEntryId");

  const purchaseBillPdfData = await get<{ bill: { total: string; balanceDue: string }; lines: unknown[] }>(
    `/purchase-bills/${draftPurchaseBill.id}/pdf-data`,
    headers,
  );
  assertMoney(purchaseBillPdfData.bill.total, expectedPurchaseBillTotal, "purchase bill pdf-data total");
  assert(purchaseBillPdfData.lines.length > 0, "purchase bill pdf-data returns lines");
  await assertPdf(`/purchase-bills/${draftPurchaseBill.id}/pdf`, headers, "purchase bill PDF");

  const cashExpensePayload: Record<string, unknown> = {
    contactId: supplier.id,
    expenseDate: new Date().toISOString(),
    currency: "SAR",
    paidThroughAccountId: paidThroughAccount!.id,
    description: "Smoke cash expense",
    notes: "Smoke test immediate paid expense",
    lines: [
      {
        description: "Smoke test office supplies",
        accountId: expenseAccount.id,
        quantity: "1.0000",
        unitPrice: "100.0000",
        taxRateId: purchaseVat?.id,
      },
    ],
  };
  const bankBeforeCashExpense = await get<BankAccountSummary>(`/bank-accounts/${paidThroughBankProfile.id}`, headers);
  const cashExpense = await post<CashExpense>("/cash-expenses", headers, cashExpensePayload);
  assertEqual(cashExpense.status, "POSTED", "cash expense posted status");
  assertPresent(cashExpense.journalEntryId, "cash expense journalEntryId");
  assertMoney(cashExpense.total, expectedPurchaseBillTotal, "cash expense total");
  const bankAfterCashExpense = await get<BankAccountSummary>(`/bank-accounts/${paidThroughBankProfile.id}`, headers);
  assertMoney(
    bankAfterCashExpense.ledgerBalance,
    money(bankBeforeCashExpense.ledgerBalance).minus(expectedPurchaseBillTotal),
    "bank account balance after cash expense",
  );
  const bankTransactionsAfterCashExpense = await get<BankAccountTransactionsResponse>(
    `/bank-accounts/${paidThroughBankProfile.id}/transactions`,
    headers,
  );
  assert(
    bankTransactionsAfterCashExpense.transactions.some(
      (transaction) =>
        transaction.sourceType === "CashExpense" &&
        transaction.sourceId === cashExpense.id &&
        money(transaction.credit).eq(expectedPurchaseBillTotal),
    ),
    "bank account transactions include posted cash expense credit",
  );
  const cashExpensePdfData = await get<{ expense: { expenseNumber: string; total: string }; lines: unknown[] }>(
    `/cash-expenses/${cashExpense.id}/pdf-data`,
    headers,
  );
  assertEqual(cashExpensePdfData.expense.expenseNumber, cashExpense.expenseNumber, "cash expense pdf-data number");
  assertMoney(cashExpensePdfData.expense.total, expectedPurchaseBillTotal, "cash expense pdf-data total");
  assert(cashExpensePdfData.lines.length > 0, "cash expense pdf-data returns lines");
  await assertPdf(`/cash-expenses/${cashExpense.id}/pdf`, headers, "cash expense PDF");
  const supplierLedgerAfterCashExpense = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterCashExpense.rows.some(
      (row) =>
        row.type === "CASH_EXPENSE" &&
        row.sourceId === cashExpense.id &&
        money(row.debit).eq(0) &&
        money(row.credit).eq(0) &&
        money(row.metadata?.total).eq(cashExpense.total),
    ),
    "supplier ledger includes neutral cash expense row",
  );
  assertMoney(supplierLedgerAfterCashExpense.closingBalance, expectedPurchaseBillTotal, "supplier ledger cash expense row is neutral");

  const journalEntriesBeforeAttachments = await get<JournalEntry[]>("/journal-entries", headers);
  const attachmentCsvBase64 = Buffer.from("entity,number\nattachment-smoke,1\n").toString("base64");
  const purchaseBillAttachment = await post<Attachment>("/attachments", headers, {
    linkedEntityType: "PURCHASE_BILL",
    linkedEntityId: finalizedPurchaseBill.id,
    filename: "purchase-bill-support.csv",
    mimeType: "text/csv",
    contentBase64: attachmentCsvBase64,
    notes: "Smoke purchase bill support",
  });
  const cashExpenseAttachment = await post<Attachment>("/attachments", headers, {
    linkedEntityType: "CASH_EXPENSE",
    linkedEntityId: cashExpense.id,
    filename: "cash-expense-support.csv",
    mimeType: "text/csv",
    contentBase64: attachmentCsvBase64,
    notes: "Smoke cash expense support",
  });
  const salesInvoiceAttachment = await post<Attachment>("/attachments", headers, {
    linkedEntityType: "SALES_INVOICE",
    linkedEntityId: finalizedInvoice.id,
    filename: "sales-invoice-support.csv",
    mimeType: "text/csv",
    contentBase64: attachmentCsvBase64,
    notes: "Smoke sales invoice support",
  });
  assertEqual(purchaseBillAttachment.status, "ACTIVE", "purchase bill attachment active");
  assertEqual(cashExpenseAttachment.status, "ACTIVE", "cash expense attachment active");
  assertEqual(salesInvoiceAttachment.status, "ACTIVE", "sales invoice attachment active");
  const purchaseBillAttachments = await get<Attachment[]>(
    `/attachments?linkedEntityType=PURCHASE_BILL&linkedEntityId=${encodeURIComponent(finalizedPurchaseBill.id)}`,
    headers,
  );
  assert(
    purchaseBillAttachments.some((attachment) => attachment.id === purchaseBillAttachment.id && attachment.contentHash),
    "purchase bill attachment appears in linked active list",
  );
  await assertAttachmentDownload(
    `/attachments/${purchaseBillAttachment.id}/download`,
    headers,
    "purchase bill attachment",
    "attachment-smoke",
  );
  const deletedCashExpenseAttachment = await del<Attachment>(`/attachments/${cashExpenseAttachment.id}`, headers);
  assertEqual(deletedCashExpenseAttachment.status, "DELETED", "cash expense attachment soft-deleted");
  const cashExpenseAttachmentsAfterDelete = await get<Attachment[]>(
    `/attachments?linkedEntityType=CASH_EXPENSE&linkedEntityId=${encodeURIComponent(cashExpense.id)}`,
    headers,
  );
  assert(
    !cashExpenseAttachmentsAfterDelete.some((attachment) => attachment.id === cashExpenseAttachment.id),
    "deleted cash expense attachment is hidden from active list",
  );
  await expectHttpError("download deleted attachment", () =>
    assertAttachmentDownload(`/attachments/${cashExpenseAttachment.id}/download`, headers, "deleted cash expense attachment", "attachment-smoke"),
  );
  const journalEntriesAfterAttachments = await get<JournalEntry[]>("/journal-entries", headers);
  assertEqual(journalEntriesAfterAttachments.length, journalEntriesBeforeAttachments.length, "attachment endpoints do not create journal entries");

  const finalizedInvoiceAuditLogs = await get<AuditLogListResponse>(
    `/audit-logs?action=SALES_INVOICE_FINALIZED&entityType=SalesInvoice&entityId=${encodeURIComponent(finalizedInvoice.id)}`,
    headers,
  );
  const attachmentUploadAuditLogs = await get<AuditLogListResponse>(
    `/audit-logs?action=ATTACHMENT_UPLOADED&entityType=Attachment&entityId=${encodeURIComponent(purchaseBillAttachment.id)}`,
    headers,
  );
  const attachmentDeleteAuditLogs = await get<AuditLogListResponse>(
    `/audit-logs?action=ATTACHMENT_DELETED&entityType=Attachment&entityId=${encodeURIComponent(cashExpenseAttachment.id)}`,
    headers,
  );
  const cogsPostAuditLogs = await get<AuditLogListResponse>(
    `/audit-logs?action=COGS_POSTED&entityType=SalesStockIssue&entityId=${encodeURIComponent(salesStockIssue.id)}`,
    headers,
  );
  const cogsReverseAuditLogs = await get<AuditLogListResponse>(
    `/audit-logs?action=COGS_REVERSED&entityType=SalesStockIssue&entityId=${encodeURIComponent(salesStockIssue.id)}`,
    headers,
  );
  assert(finalizedInvoiceAuditLogs.data.length > 0, "audit logs include finalized invoice action");
  assert(attachmentUploadAuditLogs.data.length > 0, "audit logs include attachment upload action");
  assert(attachmentDeleteAuditLogs.data.length > 0, "audit logs include attachment delete action");
  assert(cogsPostAuditLogs.data.length > 0, "audit logs include COGS post action");
  assert(cogsReverseAuditLogs.data.length > 0, "audit logs include COGS reverse action");
  const serializedAuditLogs = JSON.stringify([
    ...finalizedInvoiceAuditLogs.data,
    ...attachmentUploadAuditLogs.data,
    ...attachmentDeleteAuditLogs.data,
    ...cogsPostAuditLogs.data,
    ...cogsReverseAuditLogs.data,
  ]);
  assert(!serializedAuditLogs.includes(inviteToken), "audit logs do not expose raw invite token");
  assert(!serializedAuditLogs.includes(resetToken), "audit logs do not expose raw password reset token");
  assert(!serializedAuditLogs.includes(invitedPassword), "audit logs do not expose invited user password");
  assert(!serializedAuditLogs.includes(invitedResetPassword), "audit logs do not expose reset password");
  assert(!serializedAuditLogs.includes(attachmentCsvBase64), "audit logs do not expose attachment base64 content");
  const auditRetentionSettings = await get<AuditLogRetentionSettingsResponse>("/audit-logs/retention-settings", headers);
  assertEqual(auditRetentionSettings.retentionDays, 2555, "audit retention settings default to seven years");
  assertEqual(auditRetentionSettings.autoPurgeEnabled, false, "audit retention auto purge is disabled by default");
  const auditRetentionPreview = await get<AuditLogRetentionPreviewResponse>("/audit-logs/retention-preview", headers);
  assertEqual(auditRetentionPreview.dryRunOnly, true, "audit retention preview is dry-run only");
  assert(auditRetentionPreview.totalAuditLogs >= 1, "audit retention preview returns total audit logs");
  assert(auditRetentionPreview.warnings.some((warning) => warning.includes("No audit logs are deleted")), "audit retention preview warns that no logs are deleted");
  const auditExportCsv = await getCsvText(
    `/audit-logs/export.csv?action=ATTACHMENT_UPLOADED&entityType=Attachment&entityId=${encodeURIComponent(purchaseBillAttachment.id)}`,
    headers,
    "audit log CSV export",
  );
  assert(auditExportCsv.includes("ATTACHMENT_UPLOADED"), "audit log CSV export includes filtered action");
  assert(!auditExportCsv.includes(inviteToken), "audit log CSV export does not expose raw invite token");
  assert(!auditExportCsv.includes(resetToken), "audit log CSV export does not expose raw password reset token");
  assert(!auditExportCsv.includes(invitedPassword), "audit log CSV export does not expose invited user password");
  assert(!auditExportCsv.includes(invitedResetPassword), "audit log CSV export does not expose reset password");
  assert(!auditExportCsv.includes(attachmentCsvBase64), "audit log CSV export does not expose attachment base64 content");
  assert(!auditExportCsv.includes("privateKeyPem"), "audit log CSV export does not expose private key field names from smoke data");

  const numberSequences = await get<NumberSequenceResponse[]>("/number-sequences", headers);
  assert(numberSequences.length > 0, "number sequence list returns configured scopes");
  const contactSequence = required(
    numberSequences.find((sequence) => sequence.scope === "CONTACT") ?? numberSequences[0],
    "number sequence for smoke no-op patch",
  );
  assertEqual(
    contactSequence.exampleNextNumber,
    `${contactSequence.prefix}${String(contactSequence.nextNumber).padStart(contactSequence.padding, "0")}`,
    "number sequence example matches prefix, next number, and padding",
  );
  const patchedNumberSequence = await patch<NumberSequenceResponse>(`/number-sequences/${contactSequence.id}`, headers, {
    prefix: contactSequence.prefix,
    nextNumber: contactSequence.nextNumber,
    padding: contactSequence.padding,
  });
  assertEqual(patchedNumberSequence.exampleNextNumber, contactSequence.exampleNextNumber, "number sequence safe no-op patch preserves example");
  const numberSequenceAuditLogs = await get<AuditLogListResponse>(
    `/audit-logs?action=NUMBER_SEQUENCE_UPDATED&entityType=NumberSequence&entityId=${encodeURIComponent(contactSequence.id)}`,
    headers,
  );
  assert(numberSequenceAuditLogs.data.length > 0, "audit logs include number sequence update action");

  const storageReadiness = await get<StorageReadinessResponse>("/storage/readiness", headers);
  assertEqual(storageReadiness.attachmentStorage.activeProvider, "database", "attachment storage readiness default provider");
  assertEqual(storageReadiness.generatedDocumentStorage.activeProvider, "database", "generated document storage readiness default provider");
  assertEqual(storageReadiness.attachmentStorage.ready, true, "attachment database storage readiness");
  assertEqual(storageReadiness.generatedDocumentStorage.ready, true, "generated document database storage readiness");
  assertEqual(typeof storageReadiness.s3Config.accessKeyConfigured, "boolean", "storage readiness redacted access key flag");
  assertEqual(typeof storageReadiness.s3Config.secretConfigured, "boolean", "storage readiness redacted secret key flag");
  const serializedStorageReadiness = JSON.stringify(storageReadiness);
  assert(!serializedStorageReadiness.includes("S3_ACCESS_KEY_ID"), "storage readiness does not expose access key field name");
  assert(!serializedStorageReadiness.includes("S3_SECRET_ACCESS_KEY"), "storage readiness does not expose secret key field name");
  assert(!serializedStorageReadiness.includes("accessKeyId"), "storage readiness does not expose access key value field");
  assert(!serializedStorageReadiness.includes("secretAccessKey"), "storage readiness does not expose secret key value field");

  const storageMigrationPlan = await get<StorageMigrationPlanResponse>("/storage/migration-plan", headers);
  assertEqual(typeof storageMigrationPlan.attachmentCount, "number", "storage migration plan attachment count");
  assertEqual(typeof storageMigrationPlan.generatedDocumentCount, "number", "storage migration plan generated document count");
  assertEqual(storageMigrationPlan.targetProvider, "database", "storage migration plan default target provider");
  assertEqual(storageMigrationPlan.migrationRequired, storageMigrationPlan.estimatedMigrationRequired, "storage migration plan compatibility flags align");
  assertEqual(storageMigrationPlan.dryRunOnly, true, "storage migration plan dry run only");
  const journalEntriesAfterStorageReports = await get<JournalEntry[]>("/journal-entries", headers);
  assertEqual(journalEntriesAfterStorageReports.length, journalEntriesAfterAttachments.length, "storage readiness endpoints do not create journal entries");

  const voidedCashExpense = await post<CashExpense>(`/cash-expenses/${cashExpense.id}/void`, headers, {});
  assertEqual(voidedCashExpense.status, "VOIDED", "voided cash expense status");
  assertPresent(voidedCashExpense.voidReversalJournalEntryId, "voided cash expense reversal journal");

  const debitNoteLinePayload: Record<string, unknown> = {
    description: "Smoke test supplier debit adjustment",
    accountId: expenseAccount.id,
    quantity: "1.0000",
    unitPrice: "10.0000",
  };
  if (purchaseVat) {
    debitNoteLinePayload.taxRateId = purchaseVat.id;
  }
  const draftPurchaseDebitNote = await post<PurchaseDebitNote>("/purchase-debit-notes", headers, {
    supplierId: supplier.id,
    originalBillId: draftPurchaseBill.id,
    issueDate: new Date().toISOString(),
    currency: "SAR",
    reason: "Smoke test supplier debit note",
    lines: [debitNoteLinePayload],
  });
  assertEqual(draftPurchaseDebitNote.status, "DRAFT", "created purchase debit note status");
  assertMoney(draftPurchaseDebitNote.total, expectedPurchaseDebitNoteTotal, "draft purchase debit note total");
  assertMoney(draftPurchaseDebitNote.unappliedAmount, expectedPurchaseDebitNoteTotal, "draft purchase debit note unapplied amount");

  const finalizedPurchaseDebitNote = await post<PurchaseDebitNote>(`/purchase-debit-notes/${draftPurchaseDebitNote.id}/finalize`, headers, {});
  assertEqual(finalizedPurchaseDebitNote.status, "FINALIZED", "finalized purchase debit note status");
  assertPresent(finalizedPurchaseDebitNote.journalEntryId, "finalized purchase debit note journalEntryId");
  assertMoney(finalizedPurchaseDebitNote.total, expectedPurchaseDebitNoteTotal, "finalized purchase debit note total");
  const finalizedPurchaseDebitNoteAgain = await post<PurchaseDebitNote>(`/purchase-debit-notes/${draftPurchaseDebitNote.id}/finalize`, headers, {});
  assertEqual(
    finalizedPurchaseDebitNoteAgain.journalEntryId,
    finalizedPurchaseDebitNote.journalEntryId,
    "double finalize purchase debit note journalEntryId",
  );

  const billDebitNotes = await get<PurchaseDebitNote[]>(`/purchase-bills/${draftPurchaseBill.id}/debit-notes`, headers);
  assert(
    billDebitNotes.some((debitNote) => debitNote.id === draftPurchaseDebitNote.id && debitNote.status === "FINALIZED"),
    "purchase bill linked debit notes include finalized smoke debit note",
  );
  const supplierLedgerAfterDebitNote = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterDebitNote.rows.some(
      (row) => row.type === "PURCHASE_DEBIT_NOTE" && row.sourceId === draftPurchaseDebitNote.id && money(row.debit).eq(expectedPurchaseDebitNoteTotal),
    ),
    "supplier ledger includes purchase debit note debit",
  );
  assertMoney(
    supplierLedgerAfterDebitNote.closingBalance,
    expectedPurchaseBillTotal.minus(expectedPurchaseDebitNoteTotal),
    "supplier ledger closing balance after purchase debit note",
  );

  const debitApplyAmount = money("5.0000");
  const appliedPurchaseDebitNote = await post<PurchaseDebitNote>(`/purchase-debit-notes/${draftPurchaseDebitNote.id}/apply`, headers, {
    billId: draftPurchaseBill.id,
    amountApplied: debitApplyAmount.toFixed(4),
  });
  assertMoney(
    appliedPurchaseDebitNote.unappliedAmount,
    expectedPurchaseDebitNoteTotal.minus(debitApplyAmount),
    "purchase debit note unapplied amount after partial application",
  );
  const purchaseBillAfterDebitApply = await get<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}`, headers);
  assertMoney(purchaseBillAfterDebitApply.balanceDue, expectedPurchaseBillTotal.minus(debitApplyAmount), "purchase bill balance after debit note application");
  const purchaseDebitNoteAllocations = await get<PurchaseDebitNoteAllocation[]>(
    `/purchase-debit-notes/${draftPurchaseDebitNote.id}/allocations`,
    headers,
  );
  const purchaseDebitNoteAllocation = required(
    purchaseDebitNoteAllocations.find((allocation) => allocation.billId === draftPurchaseBill.id && money(allocation.amountApplied).eq(debitApplyAmount)),
    "purchase debit note allocation for smoke application",
  );
  const billDebitNoteAllocations = await get<PurchaseDebitNoteAllocation[]>(`/purchase-bills/${draftPurchaseBill.id}/debit-note-allocations`, headers);
  assert(
    billDebitNoteAllocations.some(
      (allocation) => allocation.debitNoteId === draftPurchaseDebitNote.id && money(allocation.amountApplied).eq(debitApplyAmount),
    ),
    "purchase bill debit note allocations include partial application",
  );
  const supplierLedgerAfterDebitApply = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterDebitApply.rows.some(
      (row) =>
        row.type === "PURCHASE_DEBIT_NOTE_ALLOCATION" &&
        row.sourceId === purchaseDebitNoteAllocation.id &&
        money(row.debit).eq(0) &&
        money(row.credit).eq(0),
    ),
    "supplier ledger includes neutral purchase debit note allocation row",
  );
  assertMoney(
    supplierLedgerAfterDebitApply.closingBalance,
    expectedPurchaseBillTotal.minus(expectedPurchaseDebitNoteTotal),
    "supplier ledger closing balance after debit allocation is not double counted",
  );
  await expectHttpError("over-apply purchase debit note", () =>
    post<PurchaseDebitNote>(`/purchase-debit-notes/${draftPurchaseDebitNote.id}/apply`, headers, {
      billId: draftPurchaseBill.id,
      amountApplied: expectedPurchaseDebitNoteTotal.toFixed(4),
    }),
  );
  await expectHttpError("void allocated purchase debit note", () => post<PurchaseDebitNote>(`/purchase-debit-notes/${draftPurchaseDebitNote.id}/void`, headers, {}));
  await expectHttpError("void purchase bill with active debit note allocation", () =>
    post<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}/void`, headers, {}),
  );

  const reversedPurchaseDebitNote = await post<PurchaseDebitNote>(
    `/purchase-debit-notes/${draftPurchaseDebitNote.id}/allocations/${purchaseDebitNoteAllocation.id}/reverse`,
    headers,
    { reason: "Smoke test purchase debit allocation reversal" },
  );
  assertMoney(reversedPurchaseDebitNote.unappliedAmount, expectedPurchaseDebitNoteTotal, "purchase debit note unapplied amount after allocation reversal");
  const purchaseBillAfterDebitReverse = await get<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}`, headers);
  assertMoney(purchaseBillAfterDebitReverse.balanceDue, expectedPurchaseBillTotal, "purchase bill balance after debit allocation reversal");
  const reversedPurchaseDebitNoteAllocations = await get<PurchaseDebitNoteAllocation[]>(
    `/purchase-debit-notes/${draftPurchaseDebitNote.id}/allocations`,
    headers,
  );
  assert(
    reversedPurchaseDebitNoteAllocations.some(
      (allocation) =>
        allocation.id === purchaseDebitNoteAllocation.id &&
        Boolean(allocation.reversedAt) &&
        allocation.reversalReason === "Smoke test purchase debit allocation reversal",
    ),
    "purchase debit note allocations include reversal metadata",
  );
  const supplierLedgerAfterDebitReverse = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterDebitReverse.rows.some(
      (row) =>
        row.type === "PURCHASE_DEBIT_NOTE_ALLOCATION_REVERSAL" &&
        row.sourceId === purchaseDebitNoteAllocation.id &&
        money(row.debit).eq(0) &&
        money(row.credit).eq(0),
    ),
    "supplier ledger includes neutral purchase debit note allocation reversal row",
  );
  assertMoney(
    supplierLedgerAfterDebitReverse.closingBalance,
    expectedPurchaseBillTotal.minus(expectedPurchaseDebitNoteTotal),
    "supplier ledger closing balance after debit allocation reversal is not double counted",
  );
  const purchaseDebitNotePdfData = await get<{ debitNote: { total: string; unappliedAmount: string }; lines: unknown[]; allocations: unknown[] }>(
    `/purchase-debit-notes/${draftPurchaseDebitNote.id}/pdf-data`,
    headers,
  );
  assertMoney(purchaseDebitNotePdfData.debitNote.total, expectedPurchaseDebitNoteTotal, "purchase debit note pdf-data total");
  assertMoney(
    purchaseDebitNotePdfData.debitNote.unappliedAmount,
    expectedPurchaseDebitNoteTotal,
    "purchase debit note pdf-data unapplied amount after reversal",
  );
  assert(purchaseDebitNotePdfData.lines.length > 0, "purchase debit note pdf-data returns lines");
  assert(purchaseDebitNotePdfData.allocations.length > 0, "purchase debit note pdf-data returns allocations");
  await assertPdf(`/purchase-debit-notes/${draftPurchaseDebitNote.id}/pdf`, headers, "purchase debit note PDF");
  const purchaseDebitNoteDocuments = await get<GeneratedDocument[]>(
    `/generated-documents?documentType=PURCHASE_DEBIT_NOTE&sourceId=${encodeURIComponent(draftPurchaseDebitNote.id)}`,
    headers,
  );
  const archivedPurchaseDebitNotePdf = required(
    purchaseDebitNoteDocuments.find((document) => document.sourceId === draftPurchaseDebitNote.id && document.status === "GENERATED"),
    "archived purchase debit note PDF document",
  );
  await assertPdf(`/generated-documents/${archivedPurchaseDebitNotePdf.id}/download`, headers, "archived purchase debit note PDF");
  const voidedPurchaseDebitNote = await post<PurchaseDebitNote>(`/purchase-debit-notes/${draftPurchaseDebitNote.id}/void`, headers, {});
  assertEqual(voidedPurchaseDebitNote.status, "VOIDED", "voided purchase debit note status after reversed allocation");
  assertPresent(voidedPurchaseDebitNote.reversalJournalEntryId, "voided purchase debit note reversal journal");
  const supplierLedgerAfterDebitNoteVoid = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterDebitNoteVoid.rows.some(
      (row) =>
        row.type === "VOID_PURCHASE_DEBIT_NOTE" &&
        row.sourceId === draftPurchaseDebitNote.id &&
        money(row.credit).eq(expectedPurchaseDebitNoteTotal),
    ),
    "supplier ledger includes void purchase debit note credit",
  );
  assertMoney(
    supplierLedgerAfterDebitNoteVoid.closingBalance,
    expectedPurchaseBillTotal,
    "supplier ledger closing balance after purchase debit note void",
  );

  const supplierPaymentAmount = money("40.0000");
  const bankBeforeSupplierPayment = await get<BankAccountSummary>(`/bank-accounts/${paidThroughBankProfile.id}`, headers);
  const supplierPayment = await post<SupplierPayment>("/supplier-payments", headers, {
    supplierId: supplier.id,
    paymentDate: new Date().toISOString(),
    currency: "SAR",
    amountPaid: supplierPaymentAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test supplier payment",
    allocations: [{ billId: draftPurchaseBill.id, amountApplied: supplierPaymentAmount.toFixed(4) }],
  });
  assertEqual(supplierPayment.status, "POSTED", "supplier payment status");
  assertPresent(supplierPayment.journalEntryId, "supplier payment journalEntryId");
  assertMoney(supplierPayment.unappliedAmount, money(0), "supplier payment unapplied amount");
  const bankAfterSupplierPayment = await get<BankAccountSummary>(`/bank-accounts/${paidThroughBankProfile.id}`, headers);
  assertMoney(
    bankAfterSupplierPayment.ledgerBalance,
    money(bankBeforeSupplierPayment.ledgerBalance).minus(supplierPaymentAmount),
    "bank account balance after supplier payment",
  );
  const bankTransactionsAfterSupplierPayment = await get<BankAccountTransactionsResponse>(
    `/bank-accounts/${paidThroughBankProfile.id}/transactions`,
    headers,
  );
  assert(
    bankTransactionsAfterSupplierPayment.transactions.some(
      (transaction) =>
        transaction.sourceType === "SupplierPayment" &&
        transaction.sourceId === supplierPayment.id &&
        money(transaction.credit).eq(supplierPaymentAmount),
    ),
    "bank account transactions include posted supplier payment credit",
  );

  const purchaseBillAfterPayment = await get<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}`, headers);
  assertMoney(purchaseBillAfterPayment.balanceDue, expectedPurchaseBillTotal.minus(supplierPaymentAmount), "purchase bill balance after supplier payment");
  const supplierLedgerAfterPayment = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterPayment.rows.some(
      (row) => row.type === "PURCHASE_BILL" && row.sourceId === draftPurchaseBill.id && money(row.credit).eq(expectedPurchaseBillTotal),
    ),
    "supplier ledger includes purchase bill credit",
  );
  assert(
    supplierLedgerAfterPayment.rows.some(
      (row) => row.type === "SUPPLIER_PAYMENT" && row.sourceId === supplierPayment.id && money(row.debit).eq(supplierPaymentAmount),
    ),
    "supplier ledger includes supplier payment debit",
  );
  assertMoney(
    supplierLedgerAfterPayment.closingBalance,
    expectedPurchaseBillTotal.minus(supplierPaymentAmount),
    "supplier ledger closing balance after payment",
  );

  const supplierStatement = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-statement?from=${from}&to=${to}`, headers);
  assert(supplierStatement.rows.length > 0, "supplier statement returns rows");
  assertMoney(
    supplierStatement.closingBalance,
    expectedPurchaseBillTotal.minus(supplierPaymentAmount),
    "supplier statement closing balance after payment",
  );
  const supplierReceiptPdfData = await get<{ payment: { paymentNumber: string }; allocations: unknown[] }>(
    `/supplier-payments/${supplierPayment.id}/receipt-pdf-data`,
    headers,
  );
  assertEqual(supplierReceiptPdfData.payment.paymentNumber, supplierPayment.paymentNumber, "supplier receipt pdf-data payment number");
  assert(supplierReceiptPdfData.allocations.length > 0, "supplier receipt pdf-data returns allocations");
  await assertPdf(`/supplier-payments/${supplierPayment.id}/receipt.pdf`, headers, "supplier payment receipt PDF");

  await expectHttpError("void purchase bill with active supplier payment", () =>
    post<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}/void`, headers, {}),
  );
  const voidedSupplierPayment = await post<SupplierPayment>(`/supplier-payments/${supplierPayment.id}/void`, headers, {});
  assertEqual(voidedSupplierPayment.status, "VOIDED", "voided supplier payment status");
  assertPresent(voidedSupplierPayment.voidReversalJournalEntryId, "voided supplier payment reversal journal");
  const purchaseBillAfterSupplierPaymentVoid = await get<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}`, headers);
  assertMoney(purchaseBillAfterSupplierPaymentVoid.balanceDue, expectedPurchaseBillTotal, "purchase bill balance after supplier payment void");
  const supplierLedgerAfterPaymentVoid = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterPaymentVoid.rows.some(
      (row) => row.type === "VOID_SUPPLIER_PAYMENT" && row.sourceId === supplierPayment.id && money(row.credit).eq(supplierPaymentAmount),
    ),
    "supplier ledger includes void supplier payment credit",
  );
  assertMoney(supplierLedgerAfterPaymentVoid.closingBalance, expectedPurchaseBillTotal, "supplier ledger closing balance after payment void");

  const voidedPurchaseBill = await post<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}/void`, headers, {});
  assertEqual(voidedPurchaseBill.status, "VOIDED", "voided purchase bill status");
  assertPresent(voidedPurchaseBill.reversalJournalEntryId, "voided purchase bill reversal journal");

  const supplierOverpaymentBill = await post<PurchaseBill>("/purchase-bills", headers, {
    supplierId: supplier.id,
    billDate: new Date().toISOString(),
    currency: "SAR",
    notes: "Smoke test supplier overpayment target bill",
    lines: [purchaseBillLinePayload],
  });
  const finalizedSupplierOverpaymentBill = await post<PurchaseBill>(
    `/purchase-bills/${supplierOverpaymentBill.id}/finalize`,
    headers,
    {},
  );
  assertMoney(finalizedSupplierOverpaymentBill.balanceDue, expectedPurchaseBillTotal, "supplier overpayment target bill balance");

  const supplierOverpaymentAmount = money("80.0000");
  const supplierUnappliedApplyAmount = money("30.0000");
  const supplierOverpayment = await post<SupplierPayment>("/supplier-payments", headers, {
    supplierId: supplier.id,
    paymentDate: new Date().toISOString(),
    currency: "SAR",
    amountPaid: supplierOverpaymentAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test supplier overpayment",
    allocations: [],
  });
  assertMoney(supplierOverpayment.unappliedAmount, supplierOverpaymentAmount, "supplier overpayment unapplied amount");

  const supplierPaymentAfterUnappliedApply = await post<SupplierPayment>(
    `/supplier-payments/${supplierOverpayment.id}/apply-unapplied`,
    headers,
    {
      billId: finalizedSupplierOverpaymentBill.id,
      amountApplied: supplierUnappliedApplyAmount.toFixed(4),
    },
  );
  assertMoney(
    supplierPaymentAfterUnappliedApply.unappliedAmount,
    supplierOverpaymentAmount.minus(supplierUnappliedApplyAmount),
    "supplier payment unapplied amount after application",
  );
  const supplierOverpaymentBillAfterApply = await get<PurchaseBill>(
    `/purchase-bills/${finalizedSupplierOverpaymentBill.id}`,
    headers,
  );
  assertMoney(
    supplierOverpaymentBillAfterApply.balanceDue,
    expectedPurchaseBillTotal.minus(supplierUnappliedApplyAmount),
    "purchase bill balance after supplier overpayment application",
  );
  const supplierPaymentUnappliedAllocations = await get<SupplierPaymentUnappliedAllocation[]>(
    `/supplier-payments/${supplierOverpayment.id}/unapplied-allocations`,
    headers,
  );
  const supplierPaymentUnappliedAllocation = required(
    supplierPaymentUnappliedAllocations.find(
      (allocation) =>
        allocation.billId === finalizedSupplierOverpaymentBill.id &&
        money(allocation.amountApplied).eq(supplierUnappliedApplyAmount),
    ),
    "supplier payment unapplied allocation for smoke application",
  );
  const billSupplierPaymentUnappliedAllocations = await get<SupplierPaymentUnappliedAllocation[]>(
    `/purchase-bills/${finalizedSupplierOverpaymentBill.id}/supplier-payment-unapplied-allocations`,
    headers,
  );
  assert(
    billSupplierPaymentUnappliedAllocations.some((allocation) => allocation.id === supplierPaymentUnappliedAllocation.id),
    "purchase bill exposes supplier payment unapplied allocation",
  );
  const supplierReceiptAfterUnappliedApply = await get<{
    unappliedAllocations?: Array<{ billId: string; amountApplied: string; status: string }>;
  }>(`/supplier-payments/${supplierOverpayment.id}/receipt-pdf-data`, headers);
  assert(
    Boolean(
      supplierReceiptAfterUnappliedApply.unappliedAllocations?.some(
        (allocation) =>
          allocation.billId === finalizedSupplierOverpaymentBill.id &&
          money(allocation.amountApplied).eq(supplierUnappliedApplyAmount),
      ),
    ),
    "supplier receipt pdf-data includes unapplied payment allocation",
  );
  const supplierLedgerAfterUnappliedApply = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterUnappliedApply.rows.some(
      (row) =>
        row.type === "SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION" &&
        row.sourceId === supplierPaymentUnappliedAllocation.id &&
        money(row.debit).eq(0) &&
        money(row.credit).eq(0),
    ),
    "supplier ledger includes neutral supplier payment unapplied allocation row",
  );

  const supplierPaymentAfterUnappliedReverse = await post<SupplierPayment>(
    `/supplier-payments/${supplierOverpayment.id}/unapplied-allocations/${supplierPaymentUnappliedAllocation.id}/reverse`,
    headers,
    { reason: "Smoke test supplier payment application reversal" },
  );
  assertMoney(
    supplierPaymentAfterUnappliedReverse.unappliedAmount,
    supplierOverpaymentAmount,
    "supplier payment unapplied amount after application reversal",
  );
  const supplierOverpaymentBillAfterReverse = await get<PurchaseBill>(
    `/purchase-bills/${finalizedSupplierOverpaymentBill.id}`,
    headers,
  );
  assertMoney(
    supplierOverpaymentBillAfterReverse.balanceDue,
    expectedPurchaseBillTotal,
    "purchase bill balance after supplier overpayment application reversal",
  );
  const reversedSupplierPaymentUnappliedAllocations = await get<SupplierPaymentUnappliedAllocation[]>(
    `/supplier-payments/${supplierOverpayment.id}/unapplied-allocations`,
    headers,
  );
  assert(
    reversedSupplierPaymentUnappliedAllocations.some(
      (allocation) =>
        allocation.id === supplierPaymentUnappliedAllocation.id &&
        Boolean(allocation.reversedAt) &&
        allocation.reversalReason === "Smoke test supplier payment application reversal",
    ),
    "supplier payment unapplied allocations include reversal metadata",
  );
  const supplierLedgerAfterUnappliedReverse = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterUnappliedReverse.rows.some(
      (row) =>
        row.type === "SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL" &&
        row.sourceId === supplierPaymentUnappliedAllocation.id &&
        money(row.debit).eq(0) &&
        money(row.credit).eq(0),
    ),
    "supplier ledger includes neutral supplier payment unapplied allocation reversal row",
  );

  const supplierRefundableSources = await get<{ payments: SupplierPayment[]; debitNotes: PurchaseDebitNote[] }>(
    `/supplier-refunds/refundable-sources?supplierId=${supplier.id}`,
    headers,
  );
  assert(
    supplierRefundableSources.payments.some(
      (payment) => payment.id === supplierOverpayment.id && money(payment.unappliedAmount).eq(supplierOverpaymentAmount),
    ),
    "supplier refundable sources include unapplied supplier payment",
  );

  const supplierPaymentRefundAmount = money("20.0000");
  const supplierPaymentRefund = await post<SupplierRefund>("/supplier-refunds", headers, {
    supplierId: supplier.id,
    sourceType: "SUPPLIER_PAYMENT",
    sourcePaymentId: supplierOverpayment.id,
    refundDate: new Date().toISOString(),
    currency: "SAR",
    amountRefunded: supplierPaymentRefundAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test supplier payment refund",
  });
  assertEqual(supplierPaymentRefund.status, "POSTED", "supplier payment refund status");
  assertPresent(supplierPaymentRefund.journalEntryId, "supplier payment refund journalEntryId");
  const supplierOverpaymentAfterRefund = await get<SupplierPayment>(`/supplier-payments/${supplierOverpayment.id}`, headers);
  assertMoney(
    supplierOverpaymentAfterRefund.unappliedAmount,
    supplierOverpaymentAmount.minus(supplierPaymentRefundAmount),
    "supplier payment unapplied amount after refund",
  );
  const supplierLedgerAfterPaymentRefund = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterPaymentRefund.rows.some(
      (row) =>
        row.type === "SUPPLIER_REFUND" &&
        row.sourceId === supplierPaymentRefund.id &&
        money(row.credit).eq(supplierPaymentRefundAmount),
    ),
    "supplier ledger includes supplier payment refund credit",
  );

  const voidedSupplierPaymentRefund = await post<SupplierRefund>(`/supplier-refunds/${supplierPaymentRefund.id}/void`, headers, {});
  assertEqual(voidedSupplierPaymentRefund.status, "VOIDED", "voided supplier payment refund status");
  assertPresent(voidedSupplierPaymentRefund.voidReversalJournalEntryId, "voided supplier payment refund reversal journal");
  const supplierOverpaymentAfterRefundVoid = await get<SupplierPayment>(`/supplier-payments/${supplierOverpayment.id}`, headers);
  assertMoney(
    supplierOverpaymentAfterRefundVoid.unappliedAmount,
    supplierOverpaymentAmount,
    "supplier payment unapplied amount after refund void",
  );
  const supplierLedgerAfterPaymentRefundVoid = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterPaymentRefundVoid.rows.some(
      (row) =>
        row.type === "VOID_SUPPLIER_REFUND" &&
        row.sourceId === supplierPaymentRefund.id &&
        money(row.debit).eq(supplierPaymentRefundAmount),
    ),
    "supplier ledger includes void supplier payment refund debit",
  );

  const supplierRefundDebitNote = await post<PurchaseDebitNote>("/purchase-debit-notes", headers, {
    supplierId: supplier.id,
    issueDate: new Date().toISOString(),
    currency: "SAR",
    reason: "Smoke test supplier refund debit note",
    lines: [debitNoteLinePayload],
  });
  const finalizedSupplierRefundDebitNote = await post<PurchaseDebitNote>(
    `/purchase-debit-notes/${supplierRefundDebitNote.id}/finalize`,
    headers,
    {},
  );
  assertMoney(
    finalizedSupplierRefundDebitNote.unappliedAmount,
    expectedPurchaseDebitNoteTotal,
    "supplier refund debit note unapplied amount",
  );
  const supplierDebitNoteRefundableSources = await get<{ payments: SupplierPayment[]; debitNotes: PurchaseDebitNote[] }>(
    `/supplier-refunds/refundable-sources?supplierId=${supplier.id}`,
    headers,
  );
  assert(
    supplierDebitNoteRefundableSources.debitNotes.some(
      (debitNote) =>
        debitNote.id === finalizedSupplierRefundDebitNote.id &&
        money(debitNote.unappliedAmount).eq(expectedPurchaseDebitNoteTotal),
    ),
    "supplier refundable sources include unapplied purchase debit note",
  );

  const supplierDebitNoteRefundAmount = money("5.0000");
  const supplierDebitNoteRefund = await post<SupplierRefund>("/supplier-refunds", headers, {
    supplierId: supplier.id,
    sourceType: "PURCHASE_DEBIT_NOTE",
    sourceDebitNoteId: finalizedSupplierRefundDebitNote.id,
    refundDate: new Date().toISOString(),
    currency: "SAR",
    amountRefunded: supplierDebitNoteRefundAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test purchase debit note supplier refund",
  });
  assertEqual(supplierDebitNoteRefund.status, "POSTED", "supplier debit note refund status");
  assertPresent(supplierDebitNoteRefund.journalEntryId, "supplier debit note refund journalEntryId");
  const supplierRefundDebitNoteAfterRefund = await get<PurchaseDebitNote>(
    `/purchase-debit-notes/${finalizedSupplierRefundDebitNote.id}`,
    headers,
  );
  assertMoney(
    supplierRefundDebitNoteAfterRefund.unappliedAmount,
    expectedPurchaseDebitNoteTotal.minus(supplierDebitNoteRefundAmount),
    "purchase debit note unapplied amount after supplier refund",
  );
  const supplierRefundPdfData = await get<{ refund: { refundNumber: string }; source: { number: string } }>(
    `/supplier-refunds/${supplierDebitNoteRefund.id}/pdf-data`,
    headers,
  );
  assertEqual(
    supplierRefundPdfData.refund.refundNumber,
    supplierDebitNoteRefund.refundNumber,
    "supplier refund pdf-data refund number",
  );
  await assertPdf(`/supplier-refunds/${supplierDebitNoteRefund.id}/pdf`, headers, "supplier refund PDF");
  const supplierLedgerAfterDebitNoteRefund = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterDebitNoteRefund.rows.some(
      (row) =>
        row.type === "SUPPLIER_REFUND" &&
        row.sourceId === supplierDebitNoteRefund.id &&
        money(row.credit).eq(supplierDebitNoteRefundAmount),
    ),
    "supplier ledger includes purchase debit note supplier refund credit",
  );

  const generalLedgerReport = await get<GeneralLedgerReport>("/reports/general-ledger", headers);
  assert(generalLedgerReport.accounts.length > 0, "general ledger returns account activity");
  const trialBalanceReport = await get<TrialBalanceReport>("/reports/trial-balance", headers);
  assertMoney(trialBalanceReport.totals.closingDebit, money(trialBalanceReport.totals.closingCredit), "trial balance closing debit equals credit");
  assertEqual(trialBalanceReport.totals.balanced, true, "trial balance balanced flag");
  await assertCsv("/reports/trial-balance?format=csv", headers, "trial balance CSV", "Trial Balance");
  await assertPdf("/reports/trial-balance/pdf", headers, "trial balance PDF");
  const trialBalanceReportDocuments = await get<GeneratedDocument[]>("/generated-documents?documentType=REPORT_TRIAL_BALANCE", headers);
  assert(trialBalanceReportDocuments.length >= 1, "generated documents include trial balance report PDF");
  const profitAndLossReport = await get<ProfitAndLossReport>("/reports/profit-and-loss", headers);
  assertPresent(profitAndLossReport.revenue, "profit and loss revenue");
  assertPresent(profitAndLossReport.expenses, "profit and loss expenses");
  assertPresent(profitAndLossReport.netProfit, "profit and loss net profit");
  const balanceSheetReport = await get<BalanceSheetReport>("/reports/balance-sheet", headers);
  assertEqual(typeof balanceSheetReport.balanced, "boolean", "balance sheet balanced flag exists");
  assertPresent(balanceSheetReport.totalAssets, "balance sheet total assets");
  assertPresent(balanceSheetReport.totalLiabilitiesAndEquity, "balance sheet total liabilities and equity");
  const vatSummaryReport = await get<VatSummaryReport>("/reports/vat-summary", headers);
  assertPresent(vatSummaryReport.salesVat, "VAT summary salesVat");
  assertPresent(vatSummaryReport.purchaseVat, "VAT summary purchaseVat");
  assertPresent(vatSummaryReport.netVatPayable, "VAT summary netVatPayable");
  const agedReceivablesReport = await get<AgingReport>("/reports/aged-receivables", headers);
  assertPresent(agedReceivablesReport.grandTotal, "aged receivables grand total");
  const agedPayablesReport = await get<AgingReport>("/reports/aged-payables", headers);
  assertPresent(agedPayablesReport.grandTotal, "aged payables grand total");
  const dashboardSummary = await get<DashboardSummary>("/dashboard/summary", headers);
  assertPresent(dashboardSummary.asOf, "dashboard summary asOf");
  assertPresent(dashboardSummary.currency, "dashboard summary currency");
  for (const section of ["sales", "purchases", "banking", "inventory", "reports", "compliance"] as const) {
    assert(typeof dashboardSummary[section] === "object" && dashboardSummary[section] !== null, `dashboard summary ${section} section exists`);
  }
  assert(typeof dashboardSummary.trends === "object" && dashboardSummary.trends !== null, "dashboard summary trends section exists");
  assert(Array.isArray(dashboardSummary.trends.monthlySales), "dashboard monthly sales trend is an array");
  assert(Array.isArray(dashboardSummary.trends.monthlyPurchases), "dashboard monthly purchases trend is an array");
  assert(Array.isArray(dashboardSummary.trends.monthlyNetProfit), "dashboard monthly net profit trend is an array");
  assert(Array.isArray(dashboardSummary.trends.cashBalanceTrend), "dashboard cash balance trend is an array");
  assert(dashboardSummary.trends.monthlySales.length === 6, "dashboard monthly sales trend returns six months");
  assert(typeof dashboardSummary.aging === "object" && dashboardSummary.aging !== null, "dashboard aging section exists");
  assert(Array.isArray(dashboardSummary.aging.receivablesBuckets), "dashboard receivables aging buckets exist");
  assert(Array.isArray(dashboardSummary.aging.payablesBuckets), "dashboard payables aging buckets exist");
  assert(Array.isArray(dashboardSummary.inventory.lowStockItems), "dashboard low-stock item list exists");
  assert(Array.isArray(dashboardSummary.attentionItems), "dashboard summary attentionItems is an array");
  const serializedDashboardSummary = JSON.stringify(dashboardSummary);
  assert(!/password|tokenHash|contentBase64|DATABASE_URL|JWT_SECRET/i.test(serializedDashboardSummary), "dashboard summary does not expose sensitive fields");
  const bankTransactions = await get<BankAccountTransactionsResponse>(`/bank-accounts/${paidThroughBankProfile.id}/transactions`, headers);
  assert(bankTransactions.transactions.length > 0, "bank account transactions endpoint returns posted activity");
  assert(
    bankTransactions.transactions.some(
      (transaction) =>
        transaction.sourceType === "CustomerPayment" &&
        transaction.sourceId === partialPayment.id &&
        money(transaction.debit).eq(partialPaymentAmount),
    ),
    "bank account transactions include customer payment debit",
  );
  assert(
    bankTransactions.transactions.some(
      (transaction) =>
        transaction.sourceType === "SupplierPayment" &&
        transaction.sourceId === supplierOverpayment.id &&
        money(transaction.credit).eq(supplierOverpaymentAmount),
    ),
    "bank account transactions include still-posted supplier payment credit",
  );
  assert(
    bankTransactions.transactions.some(
      (transaction) =>
        transaction.sourceType === "VoidCashExpense" &&
        transaction.sourceId === cashExpense.id &&
        money(transaction.debit).eq(expectedPurchaseBillTotal),
    ),
    "bank account transactions include posted cash expense void reversal",
  );

  const voidedPayment = await post<CustomerPayment>(`/customer-payments/${partialPayment.id}/void`, headers, {});
  assertEqual(voidedPayment.status, "VOIDED", "voided payment status");
  assertPresent(voidedPayment.voidReversalJournalEntryId, "voided payment reversal journal");

  const afterPaymentVoid = await get<SalesInvoice>(`/sales-invoices/${draftInvoice.id}`, headers);
  assertMoney(afterPaymentVoid.balanceDue, partialPaymentAmount, "invoice balance after voiding partial payment");

  const voidedAgain = await post<CustomerPayment>(`/customer-payments/${partialPayment.id}/void`, headers, {});
  assertEqual(voidedAgain.voidReversalJournalEntryId, voidedPayment.voidReversalJournalEntryId, "double payment void reversal id");
  const afterSecondPaymentVoid = await get<SalesInvoice>(`/sales-invoices/${draftInvoice.id}`, headers);
  assertMoney(afterSecondPaymentVoid.balanceDue, partialPaymentAmount, "invoice balance after double payment void");

  await expectHttpError("void invoice with active payment", () =>
    post<SalesInvoice>(`/sales-invoices/${draftInvoice.id}/void`, headers, {}),
  );

  const ledgerAfterVoid = await get<LedgerResponse>(`/contacts/${customer.id}/ledger`, headers);

  console.log("LedgerByte accounting smoke: PASS");
  console.log(
    JSON.stringify(
      {
        apiUrl,
        organization: context.organization,
        smokeRoleName: context.roleName,
        smokePermissionCount: context.permissionCount,
        roleManagementChecked: true,
        emailReadinessProvider: emailReadiness.provider,
        emailReadinessRealSendingEnabled: emailReadiness.realSendingEnabled,
        emailReadinessSecretsRedacted: !JSON.stringify(emailReadiness).includes("SMTP_PASSWORD"),
        emailTestSendStatus: testEmail.status,
        emailTestSendProvider: testEmail.provider,
        inviteEmailQueued: Boolean(invite.emailOutboxId),
        inviteAcceptedRole: invitedMembership.role.name,
        invitedUserCanLogin: Boolean(invitedLogin.accessToken),
        passwordResetGenericResponse: resetRequest.message,
        passwordResetOutboxStatus: resetEmail.status,
        passwordResetLoginChecked: Boolean(resetLogin.accessToken),
        smokeCustomRoleId: smokeRole.id,
        memberManagementChecked: true,
        bankAccountProfileId: paidThroughBankProfile.id,
        bankAccountTransactionCount: bankTransactions.transactions.length,
        bankTransferId: bankTransfer.id,
        bankTransferNumber: bankTransfer.transferNumber,
        bankOpeningProfileId: openingProfile.id,
        bankOpeningJournalEntryId: postedOpeningProfile.openingBalanceJournalEntryId,
        bankStatementTransferImportId: transferStatementImport.id,
        bankStatementMatchedTransactionId: matchedTransferStatementRow.id,
        bankStatementCategorizedTransactionId: categorizedStatementRow.id,
        bankReconciliationStatusSuggestion: reconciliationSummary.statusSuggestion,
        bankReconciliationId: closedReconciliation.id,
        bankReconciliationNumber: closedReconciliation.reconciliationNumber,
        bankReconciliationClosedStatus: closedReconciliation.status,
        bankReconciliationVoidedStatus: voidedReconciliation.status,
        bankReconciliationItemCount: reconciliationItems.length,
        bankReconciliationReportDocumentId: reconciliationReportDocuments[0]?.id,
        warehouseId: mainWarehouse.id,
        secondWarehouseId: secondWarehouse.id,
        inventoryItemId: inventoryItem.id,
        inventoryAdjustmentIds: [approvedIncreaseAdjustment.id, approvedDecreaseAdjustment.id, voidedDecreaseAdjustment.id],
        warehouseTransferId: warehouseTransfer.id,
        voidedWarehouseTransferId: voidedWarehouseTransfer.id,
        stockMovementIds: [
          openingStock.id,
          approvedIncreaseAdjustment.stockMovementId,
          approvedDecreaseAdjustment.stockMovementId,
          voidedDecreaseAdjustment.voidStockMovementId,
          warehouseTransfer.fromStockMovementId,
          warehouseTransfer.toStockMovementId,
          voidedWarehouseTransfer.voidFromStockMovementId,
          voidedWarehouseTransfer.voidToStockMovementId,
        ],
        inventoryQuantityOnHand: inventoryBalance.quantityOnHand,
        inventorySettingsId: patchedInventorySettings.id,
        inventoryAccountingSettingsId: patchedInventoryAccountingSettings.id,
        inventoryAccountingMappedAssetCode: inventoryAssetAccount.code,
        inventoryAccountingMappedCogsCode: cogsAccount.code,
        inventoryAccountingMappedClearingCode: inventoryClearingAccount.code,
        purchaseReceiptPostingMode: patchedInventoryAccountingSettings.purchaseReceiptPostingMode,
        purchaseReceiptPostingReadinessReady: purchaseReceiptPostingReadiness.ready,
        purchaseReceiptPostingReadinessCanEnable: purchaseReceiptPostingReadiness.canEnablePosting,
        purchaseReceiptPostingCompatibleBillModeExists: purchaseReceiptPostingReadinessAfterClearingBill.compatibleBillPostingModeExists,
        purchaseReceiptPostingDirectModeBillCount: purchaseReceiptPostingReadinessAfterClearingBill.existingBillsInDirectModeCount,
        purchaseReceiptPostingClearingModeBillCount: purchaseReceiptPostingReadinessAfterClearingBill.billsUsingInventoryClearingCount,
        purchaseReceiptPostingReadinessNoJournal:
          journalEntriesAfterPurchaseReceiptReadiness.length === journalEntriesBeforePurchaseReceiptReadiness.length,
        inventoryValuationGrandTotal: stockValuationReport.grandTotalEstimatedValue,
        inventoryMovementClosingQuantity: movementSummaryRow.closingQuantity,
        lowStockItemIds: lowStockReport.rows.map((row) => row.item.id),
        inventoryJournalEntryCountUnchanged: journalEntriesAfterInventory.length === journalEntriesBeforeInventory.length,
        purchaseReceiptId: purchaseReceipt.id,
        directPurchaseBillPreviewMode: directPurchaseBillPreview.inventoryPostingMode,
        inventoryClearingPurchaseBillId: clearingModePurchaseBill.id,
        inventoryClearingPurchaseBillPreviewCanFinalize: clearingPurchaseBillPreview.canFinalize,
        inventoryClearingPurchaseBillJournalEntryId: finalizedClearingModePurchaseBill.journalEntryId,
        purchaseReceiptAccountingPreviewOnly: purchaseReceiptAccountingPreview.previewOnly,
        purchaseReceiptAccountingPreviewCanPost: purchaseReceiptAccountingPreview.canPost,
        purchaseReceiptAccountingPreviewTotal: purchaseReceiptAccountingPreview.journal.totalDebit,
        purchaseReceiptMatchedBillValue: purchaseReceiptAccountingPreview.matchedBillValue,
        purchaseBillReceiptMatchingStatus: billReceiptMatchingStatus.status,
        purchaseReceiptVoided: voidedPurchaseReceipt.status === "VOIDED",
        purchaseReceiptAssetPostingReceiptId: clearingPurchaseReceipt.id,
        purchaseReceiptAssetPreviewCanPost: clearingReceiptAccountingPreview.canPost,
        purchaseReceiptAssetJournalEntryId: receiptAssetJournalEntryId,
        purchaseReceiptAssetReversalJournalEntryId: receiptAssetReversalJournalEntryId,
        purchaseReceiptAssetJournalDelta: journalEntriesAfterReceiptAssetReversal.length - journalEntriesBeforeReceiptAssetPost.length,
        purchaseReceiptAssetVoided: voidedClearingPurchaseReceipt.status === "VOIDED",
        purchaseReceiptAssetReportImpactChecked: true,
        inventoryClearingReconciliationStatus: clearingReconciliationRow.status,
        inventoryClearingReconciliationNetDifference: clearingReconciliationRow.netClearingDifference,
        inventoryClearingVarianceRowCount: clearingVarianceReport.summary.rowCount,
        inventoryClearingReportNoJournal: clearingReportNoJournal,
        inventoryVarianceProposalId: draftVarianceProposal.id,
        inventoryVarianceProposalStatus: reversedVarianceProposal.status,
        inventoryVarianceProposalJournalEntryId: varianceProposalJournalEntryId,
        inventoryVarianceProposalReversalJournalEntryId: reversedVarianceProposal.reversalJournalEntryId,
        inventoryVarianceProposalEventCount: varianceProposalEvents.length,
        inventoryVarianceProposalExplicitJournalDelta: varianceProposalJournalCountAfterReversal - varianceProposalJournalCountBefore,
        salesStockIssueId: salesStockIssue.id,
        salesStockIssueAccountingPreviewOnly: salesStockIssueAccountingPreview.previewOnly,
        salesStockIssueAccountingPreviewCanPost: salesStockIssueAccountingPreview.canPost,
        salesStockIssueEstimatedCogs: salesStockIssueAccountingPreview.journal.totalDebit,
        salesStockIssueCogsJournalEntryId: postedCogsIssue.cogsJournalEntryId,
        salesStockIssueCogsReversalJournalEntryId: reversedCogsIssue.cogsReversalJournalEntryId,
        salesStockIssueCogsJournalDelta: journalEntriesAfterCogsReversal.length - journalEntriesBeforeReceiptIssue.length,
        profitAndLossCogsAfterManualPost: profitAndLossAfterCogs.costOfSales,
        salesStockIssueVoided: voidedSalesStockIssue.status === "VOIDED",
        inventoryAccountingPreviewJournalEntryCountUnchanged:
          journalEntriesAfterPurchaseReceiptPreview.length === journalEntriesBeforeReceiptIssue.length &&
          journalEntriesAfterSalesIssuePreview.length === journalEntriesBeforeReceiptIssue.length,
        receiptIssueJournalEntryDeltaFromManualCogs: journalEntriesAfterReceiptIssue.length - journalEntriesBeforeReceiptIssue.length,
        closedFiscalPeriodId: closedFiscalPeriod.id,
        fiscalPeriodLockChecked: true,
        customerId: customer.id,
        invoiceId: draftInvoice.id,
        invoiceNumber: finalizedInvoice.invoiceNumber,
        creditApplicationInvoiceId: creditApplicationInvoice.id,
        zatcaMetadataId: zatcaMetadata.id,
        zatcaIcv: zatcaMetadata.icv,
        zatcaReadinessStatus: invoiceZatcaReadiness.status,
        zatcaSellerReadinessStatus: invoiceZatcaReadiness.sellerProfile.status,
        zatcaBuyerReadinessStatus: invoiceZatcaReadiness.buyerContact.status,
        zatcaSigningReadinessStatus: invoiceZatcaReadiness.signing.status,
        zatcaKeyCustodyReadinessStatus: zatcaReadiness.keyCustody.status,
        zatcaCsrReadinessStatus: zatcaReadiness.csr.status,
        zatcaPhase2QrReadinessStatus: invoiceZatcaReadiness.phase2Qr.status,
        zatcaSigningPlanDryRun: zatcaSigningPlan.dryRun,
        zatcaSigningPlanNoMutation: zatcaSigningPlan.noMutation,
        zatcaLocalSigningDryRunExecutionEnabled: zatcaLocalSigningDryRun.executionEnabled,
        zatcaLocalSigningDryRunExecutionAttempted: zatcaLocalSigningDryRun.executionAttempted,
        zatcaLocalSigningDryRunExecutionStatus: zatcaLocalSigningDryRun.executionStatus,
        zatcaLocalSigningDryRunSignedXmlDetected: zatcaLocalSigningDryRun.signedXmlDetected,
        zatcaLocalSigningDryRunQrDetected: zatcaLocalSigningDryRun.qrDetected,
        zatcaCsrPlanDryRun: zatcaCsrPlan.dryRun,
        zatcaCsrPlanNoMutation: zatcaCsrPlan.noMutation,
        zatcaCsrConfigReviewStatus: approvedZatcaCsrConfigReview.status,
        zatcaCsrConfigReviewNoNetwork: approvedZatcaCsrConfigReview.noNetwork,
        zatcaCsrDryRunLatestReviewStatus: zatcaCsrDryRunAfterReview.latestReviewStatus,
        zatcaCsrDryRunConfigApprovedForDryRun: zatcaCsrDryRunAfterReview.configApprovedForDryRun,
        zatcaCsrLocalGenerateExecutionEnabled: zatcaCsrLocalGenerate.executionEnabled,
        zatcaCsrLocalGenerateExecutionAttempted: zatcaCsrLocalGenerate.executionAttempted,
        zatcaCsrLocalGenerateNoNetwork: zatcaCsrLocalGenerate.noNetwork,
        paymentIds: [partialPayment.id, remainingPayment.id],
        paymentRefundId: paymentRefund.id,
        paymentUnappliedInvoiceId: paymentUnappliedInvoice.id,
        paymentUnappliedAllocationId: paymentUnappliedAllocation.id,
        creditNoteRefundId: creditNoteRefund.id,
        creditNoteId: draftCreditNote.id,
        creditNoteNumber: finalizedCreditNote.creditNoteNumber,
        creditApplyAmount: creditApplyAmount.toFixed(4),
        supplierId: supplier.id,
        purchaseOrderSupplierId: poSupplier.id,
        purchaseOrderId: purchaseOrder.id,
        purchaseOrderNumber: billedPurchaseOrder.purchaseOrderNumber,
        convertedPurchaseBillId: convertedPurchaseBill.id,
        convertedPurchaseBillNumber: finalizedConvertedPurchaseBill.billNumber,
        purchaseBillId: draftPurchaseBill.id,
        purchaseBillNumber: finalizedPurchaseBill.billNumber,
        cashExpenseId: cashExpense.id,
        cashExpenseNumber: cashExpense.expenseNumber,
        purchaseBillAttachmentId: purchaseBillAttachment.id,
        cashExpenseAttachmentDeleted: deletedCashExpenseAttachment.status === "DELETED",
        salesInvoiceAttachmentId: salesInvoiceAttachment.id,
        attachmentJournalCountUnchanged: journalEntriesAfterAttachments.length === journalEntriesBeforeAttachments.length,
        auditLogInvoiceFinalizeFound: finalizedInvoiceAuditLogs.data.length > 0,
        auditLogAttachmentUploadFound: attachmentUploadAuditLogs.data.length > 0,
        auditLogAttachmentDeleteFound: attachmentDeleteAuditLogs.data.length > 0,
        auditLogCogsPostFound: cogsPostAuditLogs.data.length > 0,
        auditLogCogsReverseFound: cogsReverseAuditLogs.data.length > 0,
        auditLogSensitiveMetadataRedacted:
          !serializedAuditLogs.includes(inviteToken) &&
          !serializedAuditLogs.includes(resetToken) &&
          !serializedAuditLogs.includes(invitedPassword) &&
          !serializedAuditLogs.includes(invitedResetPassword) &&
          !serializedAuditLogs.includes(attachmentCsvBase64),
        auditRetentionDays: auditRetentionSettings.retentionDays,
        auditRetentionDryRunOnly: auditRetentionPreview.dryRunOnly,
        auditLogExportCsvChecked: auditExportCsv.includes("ATTACHMENT_UPLOADED"),
        numberSequenceExample: patchedNumberSequence.exampleNextNumber,
        numberSequenceAuditFound: numberSequenceAuditLogs.data.length > 0,
        storageReadinessAttachmentProvider: storageReadiness.attachmentStorage.activeProvider,
        storageReadinessGeneratedDocumentProvider: storageReadiness.generatedDocumentStorage.activeProvider,
        storageReadinessSecretsRedacted:
          typeof storageReadiness.s3Config.accessKeyConfigured === "boolean" &&
          typeof storageReadiness.s3Config.secretConfigured === "boolean",
        storageMigrationPlanDryRunOnly: storageMigrationPlan.dryRunOnly,
        storageMigrationDatabaseCount: storageMigrationPlan.databaseStorageCount,
        purchaseDebitNoteId: draftPurchaseDebitNote.id,
        purchaseDebitNoteNumber: finalizedPurchaseDebitNote.debitNoteNumber,
        purchaseDebitNoteAllocationId: purchaseDebitNoteAllocation.id,
        archivedPurchaseDebitNotePdfId: archivedPurchaseDebitNotePdf.id,
        supplierPaymentId: supplierPayment.id,
        supplierOverpaymentId: supplierOverpayment.id,
        supplierPaymentUnappliedAllocationId: supplierPaymentUnappliedAllocation.id,
        supplierPaymentRefundId: supplierPaymentRefund.id,
        supplierRefundDebitNoteId: finalizedSupplierRefundDebitNote.id,
        supplierDebitNoteRefundId: supplierDebitNoteRefund.id,
        reportsChecked: [
          "general-ledger",
          "trial-balance",
          "profit-and-loss",
          "balance-sheet",
          "vat-summary",
          "aged-receivables",
          "aged-payables",
          "inventory-clearing-reconciliation",
          "inventory-clearing-variance",
        ],
        reportCsvChecked: "trial-balance",
        reportPdfDocumentId: trialBalanceReportDocuments[0]?.id,
        dashboardSummaryChecked: true,
        dashboardAttentionCount: dashboardSummary.attentionItems.length,
        dashboardCurrency: dashboardSummary.currency,
        dashboardMonthlySalesTrendPoints: dashboardSummary.trends.monthlySales.length,
        dashboardReceivablesAgingBuckets: dashboardSummary.aging.receivablesBuckets.length,
        archivedInvoicePdfId: archivedInvoicePdf.id,
        archivedCreditNotePdfId: archivedCreditNotePdf.id,
        finalInvoiceBalance: afterSecondPaymentVoid.balanceDue,
        ledgerClosingBalanceBeforeVoid: ledgerBeforeVoid.closingBalance,
        ledgerClosingBalanceAfterVoid: ledgerAfterVoid.closingBalance,
      },
      null,
      2,
    ),
  );
}

async function loginAndSelectOrganization(): Promise<SmokeContext> {
  const login = await post<LoginResponse>("/auth/login", {}, { email: seedEmail, password: seedPassword });
  const authHeaders = { Authorization: `Bearer ${login.accessToken}` };
  const me = await get<AuthMeResponse>("/auth/me", authHeaders);
  const membership = me.memberships.find((item) => item.status === "ACTIVE") ?? me.memberships[0];
  if (!membership) {
    throw new Error("Seed user does not have an organization membership.");
  }
  const permissions = normalizePermissionList(membership.role.permissions);
  assert(permissions.length > 0, "/auth/me returns role permissions");
  assert(
    permissions.includes("admin.fullAccess") || permissions.includes("*") || permissions.includes("reports.view"),
    "/auth/me role permissions include recognizable permission strings",
  );

  return {
    token: login.accessToken,
    organization: membership.organization,
    roleName: membership.role.name,
    permissionCount: permissions.length,
  };
}

function tenantHeaders(context: SmokeContext): Record<string, string> {
  return {
    Authorization: `Bearer ${context.token}`,
    "x-organization-id": context.organization.id,
  };
}

async function get<T>(path: string, headers: Record<string, string>): Promise<T> {
  return request<T>("GET", path, headers);
}

async function post<T>(path: string, headers: Record<string, string>, body: unknown): Promise<T> {
  return request<T>("POST", path, headers, body);
}

async function patch<T>(path: string, headers: Record<string, string>, body: unknown): Promise<T> {
  return request<T>("PATCH", path, headers, body);
}

async function del<T>(path: string, headers: Record<string, string>): Promise<T> {
  return request<T>("DELETE", path, headers);
}

async function request<T>(method: string, path: string, headers: Record<string, string>, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`Could not reach LedgerByte API at ${apiUrl}: ${String(error)}`);
  }

  const text = await response.text();
  const parsedBody = text ? safeJson(text) : null;
  if (!response.ok) {
    throw new ApiError(`${method} ${path} failed with ${response.status}: ${text}`, response.status, parsedBody);
  }
  return parsedBody as T;
}

async function expectHttpError(label: string, action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (error instanceof ApiError) {
      console.log(`Expected rejection: ${label} -> HTTP ${error.status}`);
      return;
    }
    throw error;
  }
  throw new Error(`Expected ${label} to fail, but it succeeded.`);
}

async function assertPdf(path: string, headers: Record<string, string>, label: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { headers });
  } catch (error) {
    throw new Error(`Could not reach LedgerByte API at ${apiUrl}: ${String(error)}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(`GET ${path} failed with ${response.status}: ${text}`, response.status, safeJson(text));
  }

  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.includes("application/pdf"), `${label} returns application/pdf`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert(bytes.byteLength > 1000, `${label} returns a non-empty PDF body`);
  assertEqual(bytes.subarray(0, 4).toString(), "%PDF", `${label} starts with PDF header`);
}

async function assertCsv(path: string, headers: Record<string, string>, label: string, expectedText: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { headers });
  } catch (error) {
    throw new Error(`Could not reach LedgerByte API at ${apiUrl}: ${String(error)}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(`GET ${path} failed with ${response.status}: ${text}`, response.status, safeJson(text));
  }

  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.includes("text/csv"), `${label} returns text/csv`);
  const text = await response.text();
  assert(text.includes(expectedText), `${label} includes expected text`);
}

async function getCsvText(path: string, headers: Record<string, string>, label: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { headers });
  } catch (error) {
    throw new Error(`Could not reach LedgerByte API at ${apiUrl}: ${String(error)}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(`GET ${path} failed with ${response.status}: ${text}`, response.status, safeJson(text));
  }

  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.includes("text/csv"), `${label} returns text/csv`);
  return response.text();
}

async function assertAttachmentDownload(path: string, headers: Record<string, string>, label: string, expectedText: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { headers });
  } catch (error) {
    throw new Error(`Could not reach LedgerByte API at ${apiUrl}: ${String(error)}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(`GET ${path} failed with ${response.status}: ${text}`, response.status, safeJson(text));
  }

  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.includes("text/csv"), `${label} returns text/csv`);
  const text = await response.text();
  assert(text.includes(expectedText), `${label} download includes expected content`);
}

async function assertXml(path: string, headers: Record<string, string>, label: string, expectedText: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { headers });
  } catch (error) {
    throw new Error(`Could not reach LedgerByte API at ${apiUrl}: ${String(error)}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(`GET ${path} failed with ${response.status}: ${text}`, response.status, safeJson(text));
  }

  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.includes("application/xml"), `${label} returns application/xml`);
  const text = await response.text();
  assert(text.includes(expectedText), `${label} includes expected XML content`);
}

async function assertText(path: string, headers: Record<string, string>, label: string, expectedText: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { headers });
  } catch (error) {
    throw new Error(`Could not reach LedgerByte API at ${apiUrl}: ${String(error)}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(`GET ${path} failed with ${response.status}: ${text}`, response.status, safeJson(text));
  }

  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.includes("text/plain"), `${label} returns text/plain`);
  const text = await response.text();
  assert(text.includes(expectedText), `${label} includes expected text`);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function required<T>(value: T | undefined | null, label: string): T {
  if (value === undefined || value === null) {
    throw new Error(`Missing required smoke dependency: ${label}.`);
  }
  return value;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Smoke assertion failed: ${message}.`);
  }
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`Smoke assertion failed: ${label}. Expected ${String(expected)}, got ${String(actual)}.`);
  }
}

function assertPresent(value: unknown, label: string): void {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Smoke assertion failed: missing ${label}.`);
  }
}

function assertNoPrivateKey(value: unknown, label: string): void {
  const serialized = JSON.stringify(value) ?? "";
  assert(!serialized.includes("privateKeyPem"), `${label} does not expose privateKeyPem`);
  assert(!serialized.includes("PRIVATE KEY"), `${label} does not expose private key material`);
}

function normalizePermissionList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((permission): permission is string => typeof permission === "string");
  }

  if (typeof value === "object" && value !== null && Array.isArray((value as { permissions?: unknown }).permissions)) {
    return (value as { permissions: unknown[] }).permissions.filter((permission): permission is string => typeof permission === "string");
  }

  return [];
}

function extractTokenFromEmailBody(bodyText: string): string {
  const match = bodyText.match(/token=([^\s]+)/);
  const token = match?.[1];
  if (!token) {
    throw new Error("Password reset email body did not include a token link.");
  }
  return decodeURIComponent(token.trim());
}

function assertMoney(actual: unknown, expected: Decimal, label: string): void {
  const actualMoney = money(actual);
  if (!actualMoney.eq(expected)) {
    throw new Error(`Smoke assertion failed: ${label}. Expected ${expected.toFixed(4)}, got ${actualMoney.toFixed(4)}.`);
  }
}

function money(value: unknown): Decimal {
  return new Decimal(value === undefined || value === null || value === "" ? 0 : String(value));
}

function statementRange(): { from: string; to: string } {
  const now = new Date();
  const fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return { from: isoDate(fromDate), to: isoDate(toDate) };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

main().catch((error) => {
  console.error("LedgerByte accounting smoke: FAIL");
  if (error instanceof ApiError) {
    console.error(error.message);
    console.error(JSON.stringify(error.body, null, 2));
  } else {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  }
  process.exitCode = 1;
});
