export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE" | "COST_OF_SALES";
export type ContactType = "CUSTOMER" | "SUPPLIER" | "BOTH";
export type TaxRateScope = "SALES" | "PURCHASES" | "BOTH";
export type TaxRateCategory = "STANDARD" | "ZERO_RATED" | "EXEMPT" | "OUT_OF_SCOPE" | "REVERSE_CHARGE";
export type JournalStatus = "DRAFT" | "POSTED" | "VOIDED" | "REVERSED";
export type FiscalPeriodStatus = "OPEN" | "CLOSED" | "LOCKED";
export type ItemType = "SERVICE" | "PRODUCT";
export type ItemStatus = "ACTIVE" | "DISABLED";
export type WarehouseStatus = "ACTIVE" | "ARCHIVED";
export type StockMovementType =
  | "OPENING_BALANCE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "PURCHASE_RECEIPT_PLACEHOLDER"
  | "SALES_ISSUE_PLACEHOLDER";
export type InventoryAdjustmentStatus = "DRAFT" | "APPROVED" | "VOIDED";
export type InventoryAdjustmentType = "INCREASE" | "DECREASE";
export type WarehouseTransferStatus = "POSTED" | "VOIDED";
export type PurchaseReceiptStatus = "POSTED" | "VOIDED";
export type SalesStockIssueStatus = "POSTED" | "VOIDED";
export type InventorySourceProgressStatus = "NOT_STARTED" | "PARTIAL" | "COMPLETE";
export type InventoryValuationMethod = "MOVING_AVERAGE" | "FIFO_PLACEHOLDER";
export type SalesInvoiceStatus = "DRAFT" | "FINALIZED" | "VOIDED";
export type CreditNoteStatus = "DRAFT" | "FINALIZED" | "VOIDED";
export type PurchaseOrderStatus = "DRAFT" | "APPROVED" | "SENT" | "PARTIALLY_BILLED" | "BILLED" | "CLOSED" | "VOIDED";
export type PurchaseBillStatus = "DRAFT" | "FINALIZED" | "VOIDED";
export type PurchaseDebitNoteStatus = "DRAFT" | "FINALIZED" | "VOIDED";
export type CashExpenseStatus = "DRAFT" | "POSTED" | "VOIDED";
export type CustomerPaymentStatus = "DRAFT" | "POSTED" | "VOIDED";
export type SupplierPaymentStatus = "DRAFT" | "POSTED" | "VOIDED";
export type CustomerRefundStatus = "DRAFT" | "POSTED" | "VOIDED";
export type CustomerRefundSourceType = "CUSTOMER_PAYMENT" | "CREDIT_NOTE";
export type SupplierRefundStatus = "DRAFT" | "POSTED" | "VOIDED";
export type SupplierRefundSourceType = "SUPPLIER_PAYMENT" | "PURCHASE_DEBIT_NOTE";
export type BankAccountType = "BANK" | "CASH" | "WALLET" | "CARD" | "OTHER";
export type BankAccountStatus = "ACTIVE" | "ARCHIVED";
export type BankTransferStatus = "POSTED" | "VOIDED";
export type BankStatementImportStatus = "IMPORTED" | "PARTIALLY_RECONCILED" | "RECONCILED" | "VOIDED";
export type BankStatementTransactionStatus = "UNMATCHED" | "MATCHED" | "CATEGORIZED" | "IGNORED" | "VOIDED";
export type BankStatementTransactionType = "DEBIT" | "CREDIT";
export type BankStatementMatchType =
  | "JOURNAL_LINE"
  | "MANUAL_JOURNAL"
  | "CASH_EXPENSE"
  | "CUSTOMER_PAYMENT"
  | "SUPPLIER_PAYMENT"
  | "CUSTOMER_REFUND"
  | "SUPPLIER_REFUND"
  | "BANK_TRANSFER"
  | "OTHER";
export type BankReconciliationStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "CLOSED" | "VOIDED";
export type BankReconciliationReviewAction = "SUBMIT" | "APPROVE" | "REOPEN" | "CLOSE" | "VOID";
export type CustomerLedgerRowType =
  | "INVOICE"
  | "CREDIT_NOTE"
  | "VOID_CREDIT_NOTE"
  | "CREDIT_NOTE_ALLOCATION"
  | "CREDIT_NOTE_ALLOCATION_REVERSAL"
  | "PAYMENT"
  | "PAYMENT_ALLOCATION"
  | "CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION"
  | "CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL"
  | "VOID_PAYMENT"
  | "CUSTOMER_REFUND"
  | "VOID_CUSTOMER_REFUND"
  | "VOID_INVOICE";
export type SupplierLedgerRowType =
  | "PURCHASE_BILL"
  | "PURCHASE_DEBIT_NOTE"
  | "VOID_PURCHASE_DEBIT_NOTE"
  | "PURCHASE_DEBIT_NOTE_ALLOCATION"
  | "PURCHASE_DEBIT_NOTE_ALLOCATION_REVERSAL"
  | "SUPPLIER_PAYMENT"
  | "SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION"
  | "SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL"
  | "SUPPLIER_REFUND"
  | "VOID_SUPPLIER_REFUND"
  | "CASH_EXPENSE"
  | "VOID_SUPPLIER_PAYMENT"
  | "VOID_PURCHASE_BILL";
export type DocumentType =
  | "SALES_INVOICE"
  | "CREDIT_NOTE"
  | "CUSTOMER_PAYMENT_RECEIPT"
  | "CUSTOMER_REFUND"
  | "CUSTOMER_STATEMENT"
  | "PURCHASE_ORDER"
  | "PURCHASE_BILL"
  | "PURCHASE_DEBIT_NOTE"
  | "SUPPLIER_PAYMENT_RECEIPT"
  | "SUPPLIER_REFUND"
  | "CASH_EXPENSE"
  | "REPORT_GENERAL_LEDGER"
  | "REPORT_TRIAL_BALANCE"
  | "REPORT_PROFIT_AND_LOSS"
  | "REPORT_BALANCE_SHEET"
  | "REPORT_VAT_SUMMARY"
  | "REPORT_AGED_RECEIVABLES"
  | "REPORT_AGED_PAYABLES"
  | "BANK_RECONCILIATION_REPORT";
export type GeneratedDocumentStatus = "GENERATED" | "FAILED" | "SUPERSEDED";
export type ZatcaEnvironment = "SANDBOX" | "SIMULATION" | "PRODUCTION";
export type ZatcaRegistrationStatus = "NOT_CONFIGURED" | "DRAFT" | "READY_FOR_CSR" | "OTP_REQUIRED" | "CERTIFICATE_ISSUED" | "ACTIVE" | "SUSPENDED";
export type ZatcaInvoiceType = "STANDARD_TAX_INVOICE" | "SIMPLIFIED_TAX_INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE";
export type ZatcaInvoiceStatus = "NOT_SUBMITTED" | "XML_GENERATED" | "READY_FOR_SUBMISSION" | "SUBMISSION_PENDING" | "CLEARED" | "REPORTED" | "REJECTED" | "FAILED";
export type ZatcaSubmissionType = "COMPLIANCE_CHECK" | "CLEARANCE" | "REPORTING";
export type ZatcaSubmissionStatus = "PENDING" | "SUCCESS" | "REJECTED" | "FAILED";
export type MembershipStatus = "ACTIVE" | "INVITED" | "SUSPENDED";

export interface Organization {
  id: string;
  name: string;
  legalName: string | null;
  taxNumber: string | null;
  countryCode: string;
  baseCurrency: string;
  timezone: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface MeResponse extends AuthUser {
  memberships: Array<{
    id: string;
    status: string;
    organization: Organization;
    role: { id: string; name: string; permissions: unknown };
  }>;
}

export interface Role {
  id: string;
  organizationId: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; name: string; createdAt: string };
  role: { id: string; name: string; permissions: string[]; isSystem: boolean };
}

export interface InviteOrganizationMemberResponse {
  message: string;
  member: OrganizationMember;
}

export interface Account {
  id: string;
  organizationId: string;
  parentId: string | null;
  code: string;
  name: string;
  type: AccountType;
  description: string | null;
  allowPosting: boolean;
  isSystem: boolean;
  isActive: boolean;
  parent?: { id: string; code: string; name: string } | null;
}

export interface BankAccountProfile {
  id: string;
  organizationId: string;
  accountId: string;
  type: BankAccountType;
  status: BankAccountStatus;
  displayName: string;
  bankName: string | null;
  accountNumberMasked: string | null;
  ibanMasked: string | null;
  currency: string;
  openingBalance: string;
  openingBalanceDate: string | null;
  openingBalanceJournalEntryId: string | null;
  openingBalancePostedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  account: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive">;
  openingBalanceJournalEntry?: { id: string; entryNumber: string; status: JournalStatus } | null;
}

export interface BankAccountSummary extends BankAccountProfile {
  ledgerBalance: string;
  latestTransactionDate: string | null;
  transactionCount: number;
}

export interface BankAccountTransaction {
  id: string;
  date: string;
  entryNumber: string;
  journalEntryId: string;
  description: string;
  reference: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
  sourceType: string;
  sourceId: string | null;
  sourceNumber: string | null;
}

export interface BankAccountTransactionsResponse {
  profile: BankAccountProfile;
  account: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive">;
  from: string | null;
  to: string | null;
  openingBalance: string;
  closingBalance: string;
  transactions: BankAccountTransaction[];
}

export interface BankTransfer {
  id: string;
  organizationId: string;
  transferNumber: string;
  fromBankAccountProfileId: string;
  toBankAccountProfileId: string;
  fromAccountId: string;
  toAccountId: string;
  transferDate: string;
  currency: string;
  status: BankTransferStatus;
  amount: string;
  description: string | null;
  journalEntryId: string | null;
  voidReversalJournalEntryId: string | null;
  postedAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fromBankAccountProfile?: Pick<BankAccountProfile, "id" | "displayName" | "type" | "status" | "currency" | "accountId" | "account">;
  toBankAccountProfile?: Pick<BankAccountProfile, "id" | "displayName" | "type" | "status" | "currency" | "accountId" | "account">;
  fromAccount?: Pick<Account, "id" | "code" | "name" | "type">;
  toAccount?: Pick<Account, "id" | "code" | "name" | "type">;
  journalEntry?: { id: string; entryNumber: string; status: JournalStatus; totalDebit?: string; totalCredit?: string } | null;
  voidReversalJournalEntry?: { id: string; entryNumber: string; status: JournalStatus } | null;
}

export interface BankStatementImport {
  id: string;
  organizationId: string;
  bankAccountProfileId: string;
  importedById: string | null;
  filename: string;
  sourceType: string;
  status: BankStatementImportStatus;
  statementStartDate: string | null;
  statementEndDate: string | null;
  openingStatementBalance: string | null;
  closingStatementBalance: string | null;
  rowCount: number;
  importedAt: string;
  createdAt: string;
  updatedAt: string;
  bankAccountProfile?: Pick<BankAccountProfile, "id" | "displayName" | "accountId" | "currency" | "status" | "account">;
  importedBy?: { id: string; name: string; email: string } | null;
  _count?: { transactions: number };
  transactions?: BankStatementTransaction[];
}

export interface BankStatementImportPreviewRow {
  rowNumber: number;
  date: string;
  description: string;
  reference: string | null;
  type: BankStatementTransactionType;
  amount: string;
  rawData: unknown;
}

export interface BankStatementImportInvalidRow {
  rowNumber: number;
  errors: string[];
  rawData: unknown;
}

export interface BankStatementImportPreview {
  filename: string;
  rowCount: number;
  validRows: BankStatementImportPreviewRow[];
  invalidRows: BankStatementImportInvalidRow[];
  totalCredits: string;
  totalDebits: string;
  detectedColumns: string[];
  warnings: string[];
}

export interface BankStatementTransaction {
  id: string;
  organizationId: string;
  importId: string;
  bankAccountProfileId: string;
  transactionDate: string;
  description: string;
  reference: string | null;
  type: BankStatementTransactionType;
  amount: string;
  status: BankStatementTransactionStatus;
  matchedJournalLineId: string | null;
  matchedJournalEntryId: string | null;
  matchType: BankStatementMatchType | null;
  categorizedAccountId: string | null;
  createdJournalEntryId: string | null;
  ignoredReason: string | null;
  rawData?: unknown;
  createdAt: string;
  updatedAt: string;
  import?: Pick<BankStatementImport, "id" | "filename" | "status" | "importedAt">;
  bankAccountProfile?: Pick<BankAccountProfile, "id" | "displayName" | "accountId" | "currency" | "account">;
  matchedJournalLine?: {
    id: string;
    debit: string;
    credit: string;
    description: string | null;
    journalEntry: Pick<JournalEntry, "id" | "entryNumber" | "entryDate" | "description" | "reference">;
  } | null;
  matchedJournalEntry?: Pick<JournalEntry, "id" | "entryNumber" | "entryDate" | "description" | "reference"> | null;
  categorizedAccount?: Pick<Account, "id" | "code" | "name" | "type"> | null;
  createdJournalEntry?: Pick<JournalEntry, "id" | "entryNumber" | "entryDate" | "description" | "reference"> | null;
  reconciliationItems?: Array<{
    id: string;
    reconciliationId: string;
    reconciliation: Pick<BankReconciliation, "id" | "reconciliationNumber" | "status" | "periodStart" | "periodEnd" | "closedAt">;
  }>;
}

export interface BankStatementMatchCandidate {
  journalLineId: string;
  journalEntryId: string;
  date: string;
  entryNumber: string;
  description: string;
  reference: string | null;
  debit: string;
  credit: string;
  score: number;
  reason: string;
}

export interface BankReconciliationSummary {
  profile: BankAccountProfile;
  from: string | null;
  to: string | null;
  imports: BankStatementImport[];
  totals: Record<"credits" | "debits" | "unmatched" | "matched" | "categorized" | "ignored", { count: number; total: string }>;
  ledgerBalance: string;
  statementClosingBalance: string | null;
  difference: string | null;
  statusSuggestion: "RECONCILED" | "NEEDS_REVIEW";
  latestClosedReconciliation: BankReconciliation | null;
  hasOpenDraftReconciliation: boolean;
  unreconciledTransactionCount: number;
  closedThroughDate: string | null;
}

export interface BankReconciliation {
  id: string;
  organizationId: string;
  bankAccountProfileId: string;
  reconciliationNumber: string;
  periodStart: string;
  periodEnd: string;
  statementOpeningBalance: string | null;
  statementClosingBalance: string;
  ledgerClosingBalance: string;
  difference: string;
  status: BankReconciliationStatus;
  notes: string | null;
  createdById: string | null;
  submittedById: string | null;
  approvedById: string | null;
  reopenedById: string | null;
  closedById: string | null;
  voidedById: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  reopenedAt: string | null;
  closedAt: string | null;
  voidedAt: string | null;
  approvalNotes: string | null;
  reopenReason: string | null;
  createdAt: string;
  updatedAt: string;
  unmatchedTransactionCount?: number;
  bankAccountProfile?: Pick<BankAccountProfile, "id" | "displayName" | "accountId" | "currency" | "status" | "account">;
  createdBy?: { id: string; name: string; email: string } | null;
  submittedBy?: { id: string; name: string; email: string } | null;
  approvedBy?: { id: string; name: string; email: string } | null;
  reopenedBy?: { id: string; name: string; email: string } | null;
  closedBy?: { id: string; name: string; email: string } | null;
  voidedBy?: { id: string; name: string; email: string } | null;
  _count?: { items: number };
}

export interface BankReconciliationReviewEvent {
  id: string;
  organizationId: string;
  reconciliationId: string;
  actorUserId: string | null;
  action: BankReconciliationReviewAction;
  fromStatus: BankReconciliationStatus | null;
  toStatus: BankReconciliationStatus;
  notes: string | null;
  createdAt: string;
  actorUser?: { id: string; name: string; email: string } | null;
}

export interface BankReconciliationItem {
  id: string;
  organizationId: string;
  reconciliationId: string;
  statementTransactionId: string;
  statusAtClose: BankStatementTransactionStatus;
  amount: string;
  type: BankStatementTransactionType;
  createdAt: string;
  statementTransaction?: BankStatementTransaction;
}

export interface TaxRate {
  id: string;
  organizationId: string;
  name: string;
  scope: TaxRateScope;
  category: TaxRateCategory;
  rate: string;
  description: string | null;
  isActive: boolean;
  isSystem: boolean;
}

export interface Item {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  sku: string | null;
  type: ItemType;
  status: ItemStatus;
  sellingPrice: string;
  revenueAccountId: string;
  salesTaxRateId: string | null;
  purchaseCost: string | null;
  expenseAccountId: string | null;
  purchaseTaxRateId: string | null;
  inventoryTracking: boolean;
  reorderPoint: string | null;
  reorderQuantity: string | null;
  revenueAccount?: { id: string; code: string; name: string; type: AccountType };
  salesTaxRate?: { id: string; name: string; rate: string; scope: TaxRateScope } | null;
}

export interface Warehouse {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  status: WarehouseStatus;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  countryCode: string;
  phone: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  organizationId: string;
  itemId: string;
  warehouseId: string;
  movementDate: string;
  type: StockMovementType;
  quantity: string;
  unitCost: string | null;
  totalCost: string | null;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  item?: Pick<Item, "id" | "name" | "sku" | "type" | "status" | "inventoryTracking">;
  warehouse?: Pick<Warehouse, "id" | "code" | "name" | "status" | "isDefault">;
  createdBy?: { id: string; name: string; email: string } | null;
}

export interface InventoryAdjustment {
  id: string;
  organizationId: string;
  adjustmentNumber: string;
  itemId: string;
  warehouseId: string;
  type: InventoryAdjustmentType;
  status: InventoryAdjustmentStatus;
  adjustmentDate: string;
  quantity: string;
  unitCost: string | null;
  totalCost: string | null;
  reason: string | null;
  createdById: string | null;
  approvedById: string | null;
  voidedById: string | null;
  approvedAt: string | null;
  voidedAt: string | null;
  stockMovementId: string | null;
  voidStockMovementId: string | null;
  createdAt: string;
  updatedAt: string;
  item?: Pick<Item, "id" | "name" | "sku" | "type" | "status" | "inventoryTracking">;
  warehouse?: Pick<Warehouse, "id" | "code" | "name" | "status" | "isDefault">;
  stockMovement?: Pick<StockMovement, "id" | "type" | "movementDate" | "quantity" | "referenceType" | "referenceId"> | null;
  voidStockMovement?: Pick<StockMovement, "id" | "type" | "movementDate" | "quantity" | "referenceType" | "referenceId"> | null;
  createdBy?: { id: string; name: string; email: string } | null;
  approvedBy?: { id: string; name: string; email: string } | null;
  voidedBy?: { id: string; name: string; email: string } | null;
}

export interface WarehouseTransfer {
  id: string;
  organizationId: string;
  transferNumber: string;
  itemId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: WarehouseTransferStatus;
  transferDate: string;
  quantity: string;
  unitCost: string | null;
  totalCost: string | null;
  description: string | null;
  createdById: string | null;
  postedAt: string | null;
  voidedAt: string | null;
  fromStockMovementId: string | null;
  toStockMovementId: string | null;
  voidFromStockMovementId: string | null;
  voidToStockMovementId: string | null;
  createdAt: string;
  updatedAt: string;
  item?: Pick<Item, "id" | "name" | "sku" | "type" | "status" | "inventoryTracking">;
  fromWarehouse?: Pick<Warehouse, "id" | "code" | "name" | "status" | "isDefault">;
  toWarehouse?: Pick<Warehouse, "id" | "code" | "name" | "status" | "isDefault">;
  fromStockMovement?: Pick<StockMovement, "id" | "type" | "movementDate" | "quantity" | "referenceType" | "referenceId"> | null;
  toStockMovement?: Pick<StockMovement, "id" | "type" | "movementDate" | "quantity" | "referenceType" | "referenceId"> | null;
  voidFromStockMovement?: Pick<StockMovement, "id" | "type" | "movementDate" | "quantity" | "referenceType" | "referenceId"> | null;
  voidToStockMovement?: Pick<StockMovement, "id" | "type" | "movementDate" | "quantity" | "referenceType" | "referenceId"> | null;
  createdBy?: { id: string; name: string; email: string } | null;
}

type StockMovementLink = Pick<StockMovement, "id" | "type" | "movementDate" | "quantity" | "referenceType" | "referenceId">;

export interface PurchaseReceiptLine {
  id: string;
  organizationId: string;
  receiptId: string;
  itemId: string;
  purchaseOrderLineId: string | null;
  purchaseBillLineId: string | null;
  quantity: string;
  unitCost: string | null;
  stockMovementId: string | null;
  voidStockMovementId: string | null;
  createdAt: string;
  updatedAt: string;
  item?: Pick<Item, "id" | "name" | "sku" | "type" | "status" | "inventoryTracking">;
  purchaseOrderLine?: { id: string; description: string; quantity: string; unitPrice: string } | null;
  purchaseBillLine?: { id: string; description: string; quantity: string; unitPrice: string } | null;
  stockMovement?: StockMovementLink | null;
  voidStockMovement?: StockMovementLink | null;
}

export interface PurchaseReceipt {
  id: string;
  organizationId: string;
  receiptNumber: string;
  purchaseOrderId: string | null;
  purchaseBillId: string | null;
  supplierId: string;
  warehouseId: string;
  receiptDate: string;
  status: PurchaseReceiptStatus;
  notes: string | null;
  createdById: string | null;
  postedAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: Pick<Contact, "id" | "name" | "displayName" | "type" | "taxNumber">;
  warehouse?: Pick<Warehouse, "id" | "code" | "name" | "status" | "isDefault">;
  purchaseOrder?: { id: string; purchaseOrderNumber: string; status: PurchaseOrderStatus; orderDate: string; total: string } | null;
  purchaseBill?: { id: string; billNumber: string; status: PurchaseBillStatus; billDate: string; total: string } | null;
  lines?: PurchaseReceiptLine[];
  createdBy?: { id: string; name: string; email: string } | null;
}

export interface SalesStockIssueLine {
  id: string;
  organizationId: string;
  issueId: string;
  itemId: string;
  salesInvoiceLineId: string | null;
  quantity: string;
  unitCost: string | null;
  stockMovementId: string | null;
  voidStockMovementId: string | null;
  createdAt: string;
  updatedAt: string;
  item?: Pick<Item, "id" | "name" | "sku" | "type" | "status" | "inventoryTracking">;
  salesInvoiceLine?: { id: string; description: string; quantity: string; unitPrice: string } | null;
  stockMovement?: StockMovementLink | null;
  voidStockMovement?: StockMovementLink | null;
}

export interface SalesStockIssue {
  id: string;
  organizationId: string;
  issueNumber: string;
  salesInvoiceId: string;
  customerId: string;
  warehouseId: string;
  issueDate: string;
  status: SalesStockIssueStatus;
  notes: string | null;
  createdById: string | null;
  postedAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Pick<Contact, "id" | "name" | "displayName" | "type" | "taxNumber">;
  warehouse?: Pick<Warehouse, "id" | "code" | "name" | "status" | "isDefault">;
  salesInvoice?: { id: string; invoiceNumber: string; status: SalesInvoiceStatus; issueDate: string; total: string } | null;
  lines?: SalesStockIssueLine[];
  createdBy?: { id: string; name: string; email: string } | null;
}

export interface PurchaseReceivingStatusLine {
  lineId: string;
  item: Pick<Item, "id" | "name" | "sku" | "type" | "status" | "inventoryTracking"> | null;
  inventoryTracking: boolean;
  sourceQuantity: string;
  orderedQuantity?: string;
  billedQuantity?: string;
  receivedQuantity: string;
  remainingQuantity: string;
}

export interface PurchaseReceivingStatus {
  sourceId: string;
  sourceType: "purchaseOrder" | "purchaseBill";
  status: InventorySourceProgressStatus;
  lines: PurchaseReceivingStatusLine[];
}

export interface SalesStockIssueStatusLine {
  lineId: string;
  item: Pick<Item, "id" | "name" | "sku" | "type" | "status" | "inventoryTracking"> | null;
  inventoryTracking: boolean;
  invoicedQuantity: string;
  issuedQuantity: string;
  remainingQuantity: string;
}

export interface SalesInvoiceStockIssueStatus {
  sourceId: string;
  sourceType: "salesInvoice";
  status: InventorySourceProgressStatus;
  lines: SalesStockIssueStatusLine[];
}

export interface InventoryBalance {
  item: Pick<Item, "id" | "name" | "sku" | "type" | "status" | "inventoryTracking">;
  warehouse: Pick<Warehouse, "id" | "code" | "name" | "status" | "isDefault">;
  quantityOnHand: string;
  averageUnitCost: string | null;
  inventoryValue: string | null;
}

export interface InventorySettings {
  id: string;
  organizationId: string;
  valuationMethod: InventoryValuationMethod;
  allowNegativeStock: boolean;
  trackInventoryValue: boolean;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
}

export type InventoryReportItem = Pick<
  Item,
  "id" | "name" | "sku" | "type" | "status" | "inventoryTracking" | "reorderPoint" | "reorderQuantity"
>;

export interface InventoryStockValuationRow {
  item: InventoryReportItem;
  warehouse: Pick<Warehouse, "id" | "code" | "name" | "status" | "isDefault">;
  quantityOnHand: string;
  averageUnitCost: string | null;
  estimatedValue: string | null;
  warnings: string[];
}

export interface InventoryStockValuationReport {
  generatedAt: string;
  valuationMethod: InventoryValuationMethod;
  calculationMethod: InventoryValuationMethod;
  accountingWarning: string;
  warnings: string[];
  rows: InventoryStockValuationRow[];
  totalsByItem: Array<{
    item: InventoryReportItem;
    quantityOnHand: string;
    estimatedValue: string | null;
    warnings: string[];
  }>;
  grandTotalEstimatedValue: string;
}

export interface InventoryMovementBreakdown {
  type: StockMovementType;
  inboundQuantity: string;
  outboundQuantity: string;
  netQuantity: string;
  movementCount: number;
}

export interface InventoryMovementSummaryRow {
  item: InventoryReportItem;
  warehouse: Pick<Warehouse, "id" | "code" | "name" | "status" | "isDefault">;
  openingQuantity: string;
  inboundQuantity: string;
  outboundQuantity: string;
  closingQuantity: string;
  movementCount: number;
  movementBreakdown: InventoryMovementBreakdown[];
}

export interface InventoryMovementSummaryReport {
  generatedAt: string;
  from: string | null;
  to: string | null;
  itemId: string | null;
  warehouseId: string | null;
  accountingWarning: string;
  rows: InventoryMovementSummaryRow[];
  totals: {
    openingQuantity: string;
    inboundQuantity: string;
    outboundQuantity: string;
    closingQuantity: string;
    movementCount: number;
  };
}

export type InventoryLowStockStatus = "BELOW_REORDER_POINT" | "AT_REORDER_POINT";

export interface InventoryLowStockRow {
  item: InventoryReportItem;
  quantityOnHand: string;
  reorderPoint: string;
  reorderQuantity: string | null;
  status: InventoryLowStockStatus;
}

export interface InventoryLowStockReport {
  generatedAt: string;
  accountingWarning: string;
  rows: InventoryLowStockRow[];
  totalItems: number;
}

export interface Contact {
  id: string;
  type: ContactType;
  name: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  taxNumber: string | null;
  city: string | null;
  countryCode: string;
  isActive: boolean;
}

export interface Branch {
  id: string;
  name: string;
  displayName: string | null;
  phone: string | null;
  taxNumber: string | null;
  city: string | null;
  countryCode: string;
  isDefault: boolean;
}

export interface FiscalPeriod {
  id: string;
  organizationId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status: FiscalPeriodStatus;
  createdAt: string;
  updatedAt: string;
}

export interface JournalLine {
  id: string;
  accountId: string;
  taxRateId?: string | null;
  lineNumber?: number;
  description?: string | null;
  debit: string;
  credit: string;
  currency: string;
  exchangeRate?: string;
  account?: { id: string; code: string; name: string };
  taxRate?: { id: string; name: string; rate: string } | null;
}

export interface JournalEntry {
  id: string;
  organizationId: string;
  entryNumber: string;
  status: JournalStatus;
  entryDate: string;
  description: string;
  reference: string | null;
  currency: string;
  totalDebit: string;
  totalCredit: string;
  postedAt: string | null;
  reversalOfId: string | null;
  lines: JournalLine[];
  reversedBy?: { id: string; entryNumber: string } | null;
  reversalOf?: { id: string; entryNumber: string } | null;
}

export interface SalesInvoiceLine {
  id: string;
  organizationId: string;
  invoiceId: string;
  itemId: string | null;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId: string | null;
  lineGrossAmount: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  lineSubtotal: string;
  lineTotal: string;
  sortOrder: number;
  item?: { id: string; name: string; sku: string | null } | null;
  account?: { id: string; code: string; name: string; type: AccountType };
  taxRate?: { id: string; name: string; rate: string } | null;
}

export interface CustomerPaymentAllocation {
  id: string;
  organizationId: string;
  paymentId: string;
  invoiceId: string;
  amountApplied: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    issueDate: string;
    total: string;
    balanceDue: string;
    status: SalesInvoiceStatus;
  };
  payment?: {
    id: string;
    paymentNumber: string;
    paymentDate: string;
    status: CustomerPaymentStatus;
    amountReceived: string;
    unappliedAmount: string;
  };
}

export interface CustomerPaymentUnappliedAllocation {
  id: string;
  organizationId: string;
  paymentId: string;
  invoiceId: string;
  amountApplied: string;
  reversedAt: string | null;
  reversedById: string | null;
  reversalReason: string | null;
  createdAt: string;
  updatedAt: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    issueDate: string;
    total: string;
    balanceDue: string;
    status: SalesInvoiceStatus;
  };
  payment?: {
    id: string;
    paymentNumber: string;
    paymentDate: string;
    currency: string;
    status: CustomerPaymentStatus;
    amountReceived: string;
    unappliedAmount: string;
  };
  reversedBy?: { id: string; name: string; email: string } | null;
}

export interface CreditNoteAllocation {
  id: string;
  organizationId: string;
  creditNoteId: string;
  invoiceId: string;
  amountApplied: string;
  reversedAt: string | null;
  reversedById: string | null;
  reversalReason: string | null;
  createdAt: string;
  updatedAt: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    issueDate: string;
    total: string;
    balanceDue: string;
    status: SalesInvoiceStatus;
  };
  reversedBy?: { id: string; name: string; email: string } | null;
  creditNote?: {
    id: string;
    creditNoteNumber: string;
    issueDate: string;
    currency: string;
    status: CreditNoteStatus;
    total: string;
    unappliedAmount: string;
  };
}

export interface CreditNoteLine {
  id: string;
  organizationId: string;
  creditNoteId: string;
  itemId: string | null;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId: string | null;
  lineGrossAmount: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
  sortOrder: number;
  item?: { id: string; name: string; sku: string | null } | null;
  account?: { id: string; code: string; name: string; type: AccountType };
  taxRate?: { id: string; name: string; rate: string } | null;
}

export interface CreditNote {
  id: string;
  organizationId: string;
  creditNoteNumber: string;
  customerId: string;
  originalInvoiceId: string | null;
  branchId: string | null;
  issueDate: string;
  currency: string;
  status: CreditNoteStatus;
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  unappliedAmount: string;
  notes: string | null;
  reason: string | null;
  finalizedAt: string | null;
  journalEntryId: string | null;
  reversalJournalEntryId: string | null;
  customer?: { id: string; name: string; displayName: string | null; type?: ContactType; taxNumber?: string | null };
  originalInvoice?: { id: string; invoiceNumber: string; issueDate?: string; status: SalesInvoiceStatus; total: string; customerId?: string } | null;
  branch?: { id: string; name: string; displayName: string | null; taxNumber?: string | null } | null;
  journalEntry?: { id: string; entryNumber: string; status: JournalStatus; totalDebit?: string; totalCredit?: string } | null;
  reversalJournalEntry?: { id: string; entryNumber: string; status: JournalStatus } | null;
  lines?: CreditNoteLine[];
  allocations?: CreditNoteAllocation[];
}

export interface CustomerPayment {
  id: string;
  organizationId: string;
  paymentNumber: string;
  customerId: string;
  paymentDate: string;
  currency: string;
  status: CustomerPaymentStatus;
  amountReceived: string;
  unappliedAmount: string;
  description: string | null;
  accountId: string;
  journalEntryId: string | null;
  voidReversalJournalEntryId: string | null;
  postedAt: string | null;
  voidedAt: string | null;
  customer?: { id: string; name: string; displayName: string | null; type?: ContactType };
  account?: { id: string; code: string; name: string; type?: AccountType };
  journalEntry?: { id: string; entryNumber: string; status: JournalStatus; totalDebit?: string; totalCredit?: string } | null;
  voidReversalJournalEntry?: { id: string; entryNumber: string; status: JournalStatus } | null;
  allocations?: CustomerPaymentAllocation[];
  unappliedAllocations?: CustomerPaymentUnappliedAllocation[];
}

export interface PurchaseBillLine {
  id: string;
  organizationId: string;
  billId: string;
  itemId: string | null;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId: string | null;
  lineGrossAmount: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
  sortOrder: number;
  item?: { id: string; name: string; sku: string | null } | null;
  account?: { id: string; code: string; name: string; type: AccountType };
  taxRate?: { id: string; name: string; rate: string } | null;
}

export interface PurchaseOrderLine {
  id: string;
  organizationId: string;
  purchaseOrderId: string;
  itemId: string | null;
  description: string;
  accountId: string | null;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId: string | null;
  lineGrossAmount: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
  sortOrder: number;
  item?: { id: string; name: string; sku: string | null; expenseAccountId?: string | null } | null;
  account?: { id: string; code: string; name: string; type: AccountType } | null;
  taxRate?: { id: string; name: string; rate: string } | null;
}

export interface PurchaseOrder {
  id: string;
  organizationId: string;
  purchaseOrderNumber: string;
  supplierId: string;
  branchId: string | null;
  orderDate: string;
  expectedDeliveryDate: string | null;
  currency: string;
  status: PurchaseOrderStatus;
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  notes: string | null;
  terms: string | null;
  approvedAt: string | null;
  sentAt: string | null;
  closedAt: string | null;
  voidedAt: string | null;
  convertedBillId: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: { id: string; name: string; displayName: string | null; type?: ContactType; taxNumber?: string | null; isActive?: boolean };
  branch?: { id: string; name: string; displayName: string | null; taxNumber?: string | null } | null;
  convertedBill?: { id: string; billNumber: string; status: PurchaseBillStatus; billDate?: string; total: string } | null;
  lines?: PurchaseOrderLine[];
}

export interface PurchaseDebitNoteAllocation {
  id: string;
  organizationId: string;
  debitNoteId: string;
  billId: string;
  amountApplied: string;
  reversedAt: string | null;
  reversedById: string | null;
  reversalReason: string | null;
  createdAt: string;
  updatedAt: string;
  bill?: {
    id: string;
    billNumber: string;
    billDate: string;
    dueDate: string | null;
    total: string;
    balanceDue: string;
    status: PurchaseBillStatus;
  };
  debitNote?: {
    id: string;
    debitNoteNumber: string;
    issueDate: string;
    currency: string;
    status: PurchaseDebitNoteStatus;
    total: string;
    unappliedAmount: string;
  };
  reversedBy?: { id: string; name: string; email: string } | null;
}

export interface PurchaseDebitNoteLine {
  id: string;
  organizationId: string;
  debitNoteId: string;
  itemId: string | null;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId: string | null;
  lineGrossAmount: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
  sortOrder: number;
  item?: { id: string; name: string; sku: string | null } | null;
  account?: { id: string; code: string; name: string; type: AccountType };
  taxRate?: { id: string; name: string; rate: string } | null;
}

export interface PurchaseDebitNote {
  id: string;
  organizationId: string;
  debitNoteNumber: string;
  supplierId: string;
  originalBillId: string | null;
  branchId: string | null;
  issueDate: string;
  currency: string;
  status: PurchaseDebitNoteStatus;
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  unappliedAmount: string;
  notes: string | null;
  reason: string | null;
  finalizedAt: string | null;
  journalEntryId: string | null;
  reversalJournalEntryId: string | null;
  supplier?: { id: string; name: string; displayName: string | null; type?: ContactType; taxNumber?: string | null };
  originalBill?: { id: string; billNumber: string; billDate?: string; status: PurchaseBillStatus; total: string; supplierId?: string } | null;
  branch?: { id: string; name: string; displayName: string | null; taxNumber?: string | null } | null;
  journalEntry?: { id: string; entryNumber: string; status: JournalStatus; totalDebit?: string; totalCredit?: string } | null;
  reversalJournalEntry?: { id: string; entryNumber: string; status: JournalStatus } | null;
  lines?: PurchaseDebitNoteLine[];
  allocations?: PurchaseDebitNoteAllocation[];
}

export interface SupplierPaymentAllocation {
  id: string;
  organizationId: string;
  paymentId: string;
  billId: string;
  amountApplied: string;
  bill?: {
    id: string;
    billNumber: string;
    billDate: string;
    dueDate: string | null;
    total: string;
    balanceDue: string;
    status: PurchaseBillStatus;
  };
  payment?: {
    id: string;
    paymentNumber: string;
    paymentDate: string;
    status: SupplierPaymentStatus;
    amountPaid: string;
    unappliedAmount: string;
  };
}

export interface SupplierPaymentUnappliedAllocation {
  id: string;
  organizationId: string;
  paymentId: string;
  billId: string;
  amountApplied: string;
  reversedAt: string | null;
  reversedById: string | null;
  reversalReason: string | null;
  createdAt: string;
  updatedAt: string;
  bill?: {
    id: string;
    billNumber: string;
    billDate: string;
    dueDate: string | null;
    total: string;
    balanceDue: string;
    status: PurchaseBillStatus;
  };
  payment?: {
    id: string;
    paymentNumber: string;
    paymentDate: string;
    currency: string;
    status: SupplierPaymentStatus;
    amountPaid: string;
    unappliedAmount: string;
  };
  reversedBy?: { id: string; name: string; email: string } | null;
}

export interface PurchaseBill {
  id: string;
  organizationId: string;
  billNumber: string;
  supplierId: string;
  branchId: string | null;
  billDate: string;
  dueDate: string | null;
  currency: string;
  status: PurchaseBillStatus;
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  balanceDue: string;
  notes: string | null;
  terms: string | null;
  finalizedAt: string | null;
  journalEntryId: string | null;
  reversalJournalEntryId: string | null;
  supplier?: { id: string; name: string; displayName: string | null; type?: ContactType; taxNumber?: string | null };
  branch?: { id: string; name: string; displayName: string | null; taxNumber?: string | null } | null;
  purchaseOrderId?: string | null;
  purchaseOrder?: { id: string; purchaseOrderNumber: string; status: PurchaseOrderStatus; orderDate?: string; total: string } | null;
  journalEntry?: { id: string; entryNumber: string; status: JournalStatus; totalDebit?: string; totalCredit?: string } | null;
  reversalJournalEntry?: { id: string; entryNumber: string; status: JournalStatus } | null;
  lines?: PurchaseBillLine[];
  paymentAllocations?: SupplierPaymentAllocation[];
  supplierPaymentUnappliedAllocations?: SupplierPaymentUnappliedAllocation[];
  debitNotes?: PurchaseDebitNote[];
  debitNoteAllocations?: PurchaseDebitNoteAllocation[];
}

export interface CashExpenseLine {
  id: string;
  organizationId: string;
  cashExpenseId: string;
  itemId: string | null;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId: string | null;
  lineGrossAmount: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
  sortOrder: number;
  item?: { id: string; name: string; sku: string | null } | null;
  account?: { id: string; code: string; name: string; type: AccountType };
  taxRate?: { id: string; name: string; rate: string } | null;
}

export interface CashExpense {
  id: string;
  organizationId: string;
  expenseNumber: string;
  contactId: string | null;
  branchId: string | null;
  expenseDate: string;
  currency: string;
  status: CashExpenseStatus;
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  description: string | null;
  notes: string | null;
  paidThroughAccountId: string;
  createdById: string | null;
  postedAt: string | null;
  journalEntryId: string | null;
  voidReversalJournalEntryId: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: { id: string; name: string; displayName: string | null; type?: ContactType; taxNumber?: string | null } | null;
  branch?: { id: string; name: string; displayName: string | null; taxNumber?: string | null } | null;
  paidThroughAccount?: { id: string; code: string; name: string; type?: AccountType };
  journalEntry?: { id: string; entryNumber: string; status: JournalStatus; totalDebit?: string; totalCredit?: string } | null;
  voidReversalJournalEntry?: { id: string; entryNumber: string; status: JournalStatus } | null;
  lines?: CashExpenseLine[];
}

export interface SupplierPayment {
  id: string;
  organizationId: string;
  paymentNumber: string;
  supplierId: string;
  paymentDate: string;
  currency: string;
  status: SupplierPaymentStatus;
  amountPaid: string;
  unappliedAmount: string;
  description: string | null;
  accountId: string;
  journalEntryId: string | null;
  voidReversalJournalEntryId: string | null;
  postedAt: string | null;
  voidedAt: string | null;
  supplier?: { id: string; name: string; displayName: string | null; type?: ContactType };
  account?: { id: string; code: string; name: string; type?: AccountType };
  journalEntry?: { id: string; entryNumber: string; status: JournalStatus; totalDebit?: string; totalCredit?: string } | null;
  voidReversalJournalEntry?: { id: string; entryNumber: string; status: JournalStatus } | null;
  allocations?: SupplierPaymentAllocation[];
  unappliedAllocations?: SupplierPaymentUnappliedAllocation[];
}

export interface SupplierRefund {
  id: string;
  organizationId: string;
  refundNumber: string;
  supplierId: string;
  sourceType: SupplierRefundSourceType;
  sourcePaymentId: string | null;
  sourceDebitNoteId: string | null;
  refundDate: string;
  currency: string;
  status: SupplierRefundStatus;
  amountRefunded: string;
  accountId: string;
  description: string | null;
  journalEntryId: string | null;
  voidReversalJournalEntryId: string | null;
  postedAt: string | null;
  voidedAt: string | null;
  supplier?: { id: string; name: string; displayName: string | null; type?: ContactType };
  account?: { id: string; code: string; name: string; type?: AccountType };
  sourcePayment?: {
    id: string;
    paymentNumber: string;
    paymentDate: string;
    status: SupplierPaymentStatus;
    amountPaid: string;
    unappliedAmount: string;
    currency: string;
  } | null;
  sourceDebitNote?: {
    id: string;
    debitNoteNumber: string;
    issueDate: string;
    status: PurchaseDebitNoteStatus;
    total: string;
    unappliedAmount: string;
    currency: string;
  } | null;
  journalEntry?: { id: string; entryNumber: string; status: JournalStatus; totalDebit?: string; totalCredit?: string } | null;
  voidReversalJournalEntry?: { id: string; entryNumber: string; status: JournalStatus } | null;
}

export interface CustomerRefund {
  id: string;
  organizationId: string;
  refundNumber: string;
  customerId: string;
  sourceType: CustomerRefundSourceType;
  sourcePaymentId: string | null;
  sourceCreditNoteId: string | null;
  refundDate: string;
  currency: string;
  status: CustomerRefundStatus;
  amountRefunded: string;
  accountId: string;
  description: string | null;
  journalEntryId: string | null;
  voidReversalJournalEntryId: string | null;
  postedAt: string | null;
  voidedAt: string | null;
  customer?: { id: string; name: string; displayName: string | null; type?: ContactType };
  account?: { id: string; code: string; name: string; type?: AccountType };
  sourcePayment?: {
    id: string;
    paymentNumber: string;
    paymentDate: string;
    status: CustomerPaymentStatus;
    amountReceived: string;
    unappliedAmount: string;
    currency: string;
  } | null;
  sourceCreditNote?: {
    id: string;
    creditNoteNumber: string;
    issueDate: string;
    status: CreditNoteStatus;
    total: string;
    unappliedAmount: string;
    currency: string;
  } | null;
  journalEntry?: { id: string; entryNumber: string; status: JournalStatus; totalDebit?: string; totalCredit?: string } | null;
  voidReversalJournalEntry?: { id: string; entryNumber: string; status: JournalStatus } | null;
}

export interface CustomerRefundableSources {
  customer: { id: string; name: string; displayName: string | null };
  payments: Array<{
    id: string;
    paymentNumber: string;
    paymentDate: string;
    currency: string;
    status: CustomerPaymentStatus;
    amountReceived: string;
    unappliedAmount: string;
  }>;
  creditNotes: Array<{
    id: string;
    creditNoteNumber: string;
    issueDate: string;
    currency: string;
    status: CreditNoteStatus;
    total: string;
    unappliedAmount: string;
  }>;
}

export interface SupplierRefundableSources {
  supplier: { id: string; name: string; displayName: string | null };
  payments: Array<{
    id: string;
    paymentNumber: string;
    paymentDate: string;
    currency: string;
    status: SupplierPaymentStatus;
    amountPaid: string;
    unappliedAmount: string;
  }>;
  debitNotes: Array<{
    id: string;
    debitNoteNumber: string;
    issueDate: string;
    currency: string;
    status: PurchaseDebitNoteStatus;
    total: string;
    unappliedAmount: string;
  }>;
}

export interface CustomerLedgerRow {
  id: string;
  type: CustomerLedgerRowType;
  date: string;
  number: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
  sourceType:
    | "SalesInvoice"
    | "CreditNote"
    | "CreditNoteAllocation"
    | "CustomerPayment"
    | "CustomerPaymentAllocation"
    | "CustomerPaymentUnappliedAllocation"
    | "CustomerRefund";
  sourceId: string;
  status: string;
  metadata: Record<string, unknown>;
}

export interface CustomerLedger {
  contact: Pick<Contact, "id" | "name" | "displayName" | "type" | "email" | "phone" | "taxNumber">;
  openingBalance: string;
  closingBalance: string;
  rows: CustomerLedgerRow[];
}

export interface CustomerStatement extends CustomerLedger {
  periodFrom: string | null;
  periodTo: string | null;
}

export interface SupplierLedgerRow {
  id: string;
  type: SupplierLedgerRowType;
  date: string;
  number: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
  sourceType:
    | "PurchaseBill"
    | "PurchaseDebitNote"
    | "PurchaseDebitNoteAllocation"
    | "SupplierPayment"
    | "SupplierPaymentUnappliedAllocation"
    | "SupplierRefund"
    | "CashExpense";
  sourceId: string;
  status: string;
  metadata: Record<string, unknown>;
}

export interface SupplierLedger {
  contact: Pick<Contact, "id" | "name" | "displayName" | "type" | "email" | "phone" | "taxNumber">;
  openingBalance: string;
  closingBalance: string;
  rows: SupplierLedgerRow[];
}

export interface SupplierStatement extends SupplierLedger {
  periodFrom: string | null;
  periodTo: string | null;
}

export interface GeneralLedgerLine {
  date: string;
  journalEntryId: string;
  entryNumber: string;
  description: string;
  reference: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface ReportAccountBalance {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  openingDebit: string;
  openingCredit: string;
  periodDebit: string;
  periodCredit: string;
  closingDebit: string;
  closingCredit: string;
}

export interface GeneralLedgerAccount extends ReportAccountBalance {
  lines: GeneralLedgerLine[];
}

export interface GeneralLedgerReport {
  from: string | null;
  to: string | null;
  accounts: GeneralLedgerAccount[];
}

export interface TrialBalanceReport {
  from: string | null;
  to: string | null;
  accounts: ReportAccountBalance[];
  totals: ReportAccountBalanceTotals & { balanced: boolean };
}

export interface ReportAccountBalanceTotals {
  openingDebit: string;
  openingCredit: string;
  periodDebit: string;
  periodCredit: string;
  closingDebit: string;
  closingCredit: string;
}

export interface ProfitAndLossReport {
  from: string | null;
  to: string | null;
  revenue: string;
  costOfSales: string;
  grossProfit: string;
  expenses: string;
  netProfit: string;
  sections: Array<{
    type: "REVENUE" | "COST_OF_SALES" | "EXPENSE";
    total: string;
    accounts: Array<{ accountId: string; code: string; name: string; type: AccountType; amount: string }>;
  }>;
}

export interface BalanceSheetSection {
  total: string;
  accounts: Array<{ accountId: string; code: string; name: string; type: AccountType; amount: string }>;
}

export interface BalanceSheetReport {
  asOf: string | null;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  retainedEarnings: string;
  totalAssets: string;
  totalLiabilitiesAndEquity: string;
  difference: string;
  balanced: boolean;
}

export interface VatSummaryReport {
  from: string | null;
  to: string | null;
  salesVat: string;
  purchaseVat: string;
  netVatPayable: string;
  sections: Array<{ category: string; accountCode: string; amount: string; taxAmount: string }>;
  notes: string[];
}

export type AgingBucket = "CURRENT" | "1_30" | "31_60" | "61_90" | "90_PLUS";

export interface AgingReportRow {
  id: string;
  contact: { id: string; name: string; displayName: string | null };
  number: string;
  issueDate: string;
  dueDate: string | null;
  total: string;
  balanceDue: string;
  daysOverdue: number;
  bucket: AgingBucket;
}

export interface AgingReport {
  asOf: string | null;
  kind: "receivables" | "payables";
  rows: AgingReportRow[];
  bucketTotals: Record<AgingBucket, string>;
  grandTotal: string;
}

export interface CustomerPaymentReceiptData {
  receiptNumber: string;
  paymentDate: string;
  customer: Pick<Contact, "id" | "name" | "displayName" | "email" | "phone" | "taxNumber">;
  organization: Organization;
  amountReceived: string;
  unappliedAmount: string;
  currency: string;
  paidThroughAccount: { id: string; code: string; name: string; type: AccountType };
  allocations: Array<{
    invoiceId: string;
    invoiceNumber: string;
    invoiceDate: string;
    invoiceTotal: string;
    amountApplied: string;
    invoiceBalanceDue: string;
  }>;
  unappliedAllocations: Array<{
    id: string;
    invoiceId: string;
    invoiceNumber: string;
    invoiceDate: string;
    invoiceTotal: string;
    amountApplied: string;
    invoiceBalanceDue: string;
    status: string;
    reversedAt: string | null;
    reversalReason: string | null;
  }>;
  journalEntry: { id: string; entryNumber: string; status: JournalStatus; totalDebit: string; totalCredit: string } | null;
  status: CustomerPaymentStatus;
}

export interface SupplierPaymentReceiptData {
  receiptNumber: string;
  paymentDate: string;
  supplier: Pick<Contact, "id" | "name" | "displayName" | "email" | "phone" | "taxNumber">;
  organization: Organization;
  amountPaid: string;
  unappliedAmount: string;
  currency: string;
  paidThroughAccount: { id: string; code: string; name: string; type: AccountType };
  allocations: Array<{
    billId: string;
    billNumber: string;
    billDate: string;
    billDueDate: string | null;
    billTotal: string;
    amountApplied: string;
    billBalanceDue: string;
  }>;
  unappliedAllocations: Array<{
    billId: string;
    billNumber: string;
    billDate: string;
    billDueDate: string | null;
    billTotal: string;
    amountApplied: string;
    billBalanceDue: string;
    status: string;
    reversedAt: string | null;
    reversalReason: string | null;
  }>;
  journalEntry: { id: string; entryNumber: string; status: JournalStatus; totalDebit: string; totalCredit: string } | null;
  status: SupplierPaymentStatus;
}

export interface CustomerRefundPdfData {
  organization: Organization;
  customer: Pick<Contact, "id" | "name" | "displayName" | "email" | "phone" | "taxNumber">;
  refund: {
    id: string;
    refundNumber: string;
    refundDate: string;
    status: CustomerRefundStatus;
    currency: string;
    amountRefunded: string;
    description: string | null;
  };
  source: {
    type: CustomerRefundSourceType;
    id: string;
    number: string;
    date: string;
    status: string;
    originalAmount: string;
    remainingUnappliedAmount: string;
  };
  paidFromAccount: { id: string; code: string; name: string };
  journalEntry: { id: string; entryNumber: string; status: JournalStatus } | null;
  voidReversalJournalEntry: { id: string; entryNumber: string; status: JournalStatus } | null;
  generatedAt: string;
}

export interface SupplierRefundPdfData {
  organization: Organization;
  supplier: Pick<Contact, "id" | "name" | "displayName" | "email" | "phone" | "taxNumber">;
  refund: {
    id: string;
    refundNumber: string;
    refundDate: string;
    status: SupplierRefundStatus;
    currency: string;
    amountRefunded: string;
    description: string | null;
  };
  source: {
    type: SupplierRefundSourceType;
    id: string;
    number: string;
    date: string;
    status: string;
    originalAmount: string;
    remainingUnappliedAmount: string;
  };
  receivedIntoAccount: { id: string; code: string; name: string };
  journalEntry: { id: string; entryNumber: string; status: JournalStatus } | null;
  voidReversalJournalEntry: { id: string; entryNumber: string; status: JournalStatus } | null;
  generatedAt: string;
}

export interface CashExpensePdfData {
  organization: Organization;
  contact: Pick<Contact, "id" | "name" | "displayName" | "email" | "phone" | "taxNumber"> | null;
  expense: {
    id: string;
    expenseNumber: string;
    expenseDate: string;
    status: CashExpenseStatus;
    currency: string;
    description: string | null;
    notes: string | null;
    subtotal: string;
    discountTotal: string;
    taxableTotal: string;
    taxTotal: string;
    total: string;
  };
  paidThroughAccount: { id: string; code: string; name: string; type?: AccountType };
  lines: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    discountRate: string;
    lineGrossAmount: string;
    discountAmount: string;
    taxableAmount: string;
    taxAmount: string;
    lineTotal: string;
    taxRateName: string | null;
  }>;
  journalEntry: { id: string; entryNumber: string; status: JournalStatus } | null;
  voidReversalJournalEntry: { id: string; entryNumber: string; status: JournalStatus } | null;
  generatedAt: string;
}

export interface OpenSalesInvoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  total: string;
  balanceDue: string;
  customerId: string;
}

export interface OpenPurchaseBill {
  id: string;
  billNumber: string;
  billDate: string;
  dueDate: string | null;
  currency: string;
  total: string;
  balanceDue: string;
  supplierId: string;
}

export interface SalesInvoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  customerId: string;
  branchId: string | null;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  status: SalesInvoiceStatus;
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  balanceDue: string;
  notes: string | null;
  terms: string | null;
  finalizedAt: string | null;
  journalEntryId: string | null;
  reversalJournalEntryId: string | null;
  customer?: { id: string; name: string; displayName: string | null; type?: ContactType; taxNumber?: string | null };
  branch?: { id: string; name: string; displayName: string | null; taxNumber?: string | null } | null;
  journalEntry?: { id: string; entryNumber: string; status: JournalStatus; totalDebit: string; totalCredit: string } | null;
  reversalJournalEntry?: { id: string; entryNumber: string; status: JournalStatus } | null;
  paymentAllocations?: CustomerPaymentAllocation[];
  paymentUnappliedAllocations?: CustomerPaymentUnappliedAllocation[];
  creditNoteAllocations?: CreditNoteAllocation[];
  creditNotes?: CreditNote[];
  lines?: SalesInvoiceLine[];
}

export interface OrganizationDocumentSettings {
  id: string;
  organizationId: string;
  invoiceTitle: string;
  receiptTitle: string;
  statementTitle: string;
  footerText: string;
  primaryColor: string | null;
  accentColor: string | null;
  showTaxNumber: boolean;
  showPaymentSummary: boolean;
  showNotes: boolean;
  showTerms: boolean;
  defaultInvoiceTemplate: "standard" | "compact" | "detailed";
  defaultReceiptTemplate: "standard" | "compact" | "detailed";
  defaultStatementTemplate: "standard" | "compact" | "detailed";
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedDocument {
  id: string;
  organizationId: string;
  documentType: DocumentType;
  sourceType: string;
  sourceId: string;
  documentNumber: string;
  filename: string;
  mimeType: string;
  storageProvider: string;
  storageKey: string | null;
  contentHash: string;
  sizeBytes: number;
  status: GeneratedDocumentStatus;
  generatedById: string | null;
  generatedAt: string;
  createdAt: string;
}

export interface ZatcaOrganizationProfile {
  id: string;
  organizationId: string;
  environment: ZatcaEnvironment;
  registrationStatus: ZatcaRegistrationStatus;
  sellerName: string | null;
  vatNumber: string | null;
  companyIdType: string | null;
  companyIdNumber: string | null;
  buildingNumber: string | null;
  streetName: string | null;
  district: string | null;
  city: string | null;
  postalCode: string | null;
  countryCode: string;
  additionalAddressNumber: string | null;
  businessCategory: string | null;
  readiness?: {
    ready: boolean;
    missingFields: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface ZatcaEgsUnit {
  id: string;
  organizationId: string;
  profileId: string;
  name: string;
  environment: ZatcaEnvironment;
  status: ZatcaRegistrationStatus;
  deviceSerialNumber: string;
  solutionName: string;
  hasCsr: boolean;
  hasComplianceCsid: boolean;
  hasProductionCsid: boolean;
  certificateRequestId: string | null;
  lastInvoiceHash: string | null;
  lastIcv: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ZatcaInvoiceMetadata {
  id: string;
  organizationId: string;
  invoiceId: string;
  zatcaInvoiceType: ZatcaInvoiceType;
  zatcaStatus: ZatcaInvoiceStatus;
  invoiceUuid: string;
  icv: number | null;
  previousInvoiceHash: string | null;
  invoiceHash: string | null;
  qrCodeBase64: string | null;
  xmlBase64: string | null;
  xmlHash: string | null;
  egsUnitId: string | null;
  generatedAt: string | null;
  clearedAt: string | null;
  reportedAt: string | null;
  rejectedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  egsUnit?: Pick<ZatcaEgsUnit, "id" | "name" | "environment" | "isActive" | "lastIcv"> | null;
  submissionLogs?: ZatcaSubmissionLog[];
}

export interface ZatcaQrResponse {
  qrCodeBase64: string;
}

export interface ZatcaSubmissionLog {
  id: string;
  organizationId: string;
  invoiceMetadataId: string | null;
  egsUnitId: string | null;
  submissionType: ZatcaSubmissionType;
  status: ZatcaSubmissionStatus;
  requestUrl: string | null;
  responseCode: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  submittedAt: string;
  completedAt: string | null;
  createdAt: string;
  egsUnit?: { id: string; name: string; environment: ZatcaEnvironment } | null;
  invoiceMetadata?: { id: string; invoiceId: string; invoiceUuid: string; zatcaStatus: ZatcaInvoiceStatus } | null;
}

export interface ZatcaAdapterConfigSummary {
  mode: "mock" | "sandbox-disabled" | "sandbox";
  realNetworkEnabled: boolean;
  sandboxBaseUrlConfigured: boolean;
  simulationBaseUrlConfigured: boolean;
  productionBaseUrlConfigured: boolean;
  effectiveRealNetworkEnabled: boolean;
  invalidMode?: string;
}

export type ZatcaChecklistCategory = "PROFILE" | "CSR_CSID" | "XML" | "QR" | "HASH_CHAIN" | "API" | "PDF_A3" | "SECURITY" | "TESTING";
export type ZatcaChecklistStatus = "DONE_LOCAL" | "MOCK_ONLY" | "SKELETON" | "NOT_STARTED" | "NEEDS_OFFICIAL_VERIFICATION";
export type ZatcaChecklistRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ZatcaChecklistItem {
  id: string;
  category: ZatcaChecklistCategory;
  title: string;
  description: string;
  status: ZatcaChecklistStatus;
  codeReferences: string[];
  sourceReferences?: string[];
  manualDependency?: string;
  riskLevel: ZatcaChecklistRiskLevel;
}

export interface ZatcaComplianceChecklistResponse {
  warning: string;
  summary: {
    total: number;
    byStatus: Record<string, number>;
    byRisk: Record<string, number>;
  };
  groups: Record<ZatcaChecklistCategory, ZatcaChecklistItem[]>;
}

export type ZatcaXmlFieldMappingStatus = "IMPLEMENTED_LOCAL" | "PLACEHOLDER" | "NOT_STARTED" | "NEEDS_OFFICIAL_VERIFICATION";

export interface ZatcaXmlFieldMappingItem {
  id: string;
  category: string;
  ledgerByteSource: string;
  xmlTarget: string;
  status: ZatcaXmlFieldMappingStatus;
  requiredForProduction: boolean;
  notes: string;
  officialVerificationRequired: boolean;
}

export interface ZatcaXmlFieldMappingResponse {
  warning: string;
  summary: {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
  };
  items: ZatcaXmlFieldMappingItem[];
}

export interface ZatcaSdkReadinessResponse {
  referenceFolderFound: boolean;
  sdkJarFound: boolean;
  fatooraLauncherFound: boolean;
  jqFound: boolean;
  javaFound: boolean;
  javaVersion: string | null;
  javaMajorVersion: number | null;
  javaVersionSupported: boolean;
  projectPathHasSpaces: boolean;
  canAttemptSdkValidation: boolean;
  warnings: string[];
  suggestedFixes: string[];
}

export interface ZatcaSdkValidationCommandPlan {
  command: string | null;
  args: string[];
  displayCommand: string;
  envAdditions: Record<string, string>;
  workingDirectory: string;
  warnings: string[];
}

export interface ZatcaSdkDryRunResponse {
  dryRun: true;
  localOnly: true;
  officialSdkValidation: false;
  xmlSource: "invoice" | "request";
  temporaryXmlFilePath: string;
  readiness: Pick<
    ZatcaSdkReadinessResponse,
    | "referenceFolderFound"
    | "sdkJarFound"
    | "fatooraLauncherFound"
    | "jqFound"
    | "javaFound"
    | "javaVersion"
    | "javaVersionSupported"
    | "projectPathHasSpaces"
    | "canAttemptSdkValidation"
  >;
  commandPlan: ZatcaSdkValidationCommandPlan;
  warnings: string[];
}

export interface ZatcaReadinessSummary {
  warning: string;
  profileReady: boolean;
  profileMissingFields: string[];
  egsReady: boolean;
  activeEgsUnit: {
    id: string;
    name: string;
    status: ZatcaRegistrationStatus;
    isActive: boolean;
    hasCsr: boolean;
    hasComplianceCsid: boolean;
    lastIcv: number;
    lastInvoiceHash: string | null;
  } | null;
  localXmlReady: boolean;
  mockCsidReady: boolean;
  realNetworkEnabled: boolean;
  productionReady: false;
  blockingReasons: string[];
}

export interface ZatcaXmlValidationResult {
  localOnly: true;
  officialValidation: false;
  valid: boolean;
  errors: string[];
  warnings: string[];
}
