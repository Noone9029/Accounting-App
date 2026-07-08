import type { ZatcaReadinessCheck, ZatcaReadinessSection, ZatcaReadinessStatus } from "@ledgerbyte/shared";

export type { ZatcaReadinessCheck, ZatcaReadinessSection, ZatcaReadinessStatus } from "@ledgerbyte/shared";

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE" | "COST_OF_SALES";
export type ContactType = "CUSTOMER" | "SUPPLIER" | "BOTH";
export type ContactIdentificationType = "CRN" | "MOM" | "MLS" | "SAG" | "NAT" | "IQA" | "PAS" | "GCC" | "700" | "OTH";
export type ZatcaSignedArtifactStorageControlEvidenceStatus = "DRAFT" | "VERIFIED" | "REVOKED" | "SUPERSEDED";
export type ZatcaSignedArtifactStorageControlEvidenceType =
  | "OBJECT_VERSIONING"
  | "IMMUTABLE_RETENTION"
  | "ENCRYPTION_AT_REST"
  | "ACCESS_CONTROL"
  | "BACKUP_RESTORE"
  | "RESTORE_TEST"
  | "TENANT_KEY_SCOPING"
  | "DELETION_SUPERSESSION"
  | "STORAGE_PROBE"
  | "OTHER";
export type ZatcaSignedArtifactStorageTechnicalControlsStatus = "BLOCKED" | "READY_FOR_METADATA_ONLY";
export type ZatcaSignedArtifactStorageEvidenceCompletenessStatus = "BLOCKED" | "COMPLETE_FOR_REVIEW";
export type TaxRateScope = "SALES" | "PURCHASES" | "BOTH";
export type TaxRateCategory = "STANDARD" | "ZERO_RATED" | "EXEMPT" | "OUT_OF_SCOPE" | "REVERSE_CHARGE";
export type JournalStatus = "DRAFT" | "POSTED" | "VOIDED" | "REVERSED";
export type FiscalPeriodStatus = "OPEN" | "CLOSED" | "LOCKED";
export type ItemType = "SERVICE" | "PRODUCT";
export type ItemStatus = "ACTIVE" | "DISABLED";
export type ItemTrackingMode = "NONE" | "SERIAL" | "BATCH" | "SERIAL_AND_BATCH";
export type ImportEntityType = "CUSTOMERS" | "SUPPLIERS" | "PRODUCTS_SERVICES" | "CHART_OF_ACCOUNTS";
export type ImportJobStatus = "UPLOADED" | "VALIDATING" | "READY_FOR_REVIEW" | "COMMITTED_LOCAL" | "FAILED" | "CANCELLED";
export type ImportJobRowStatus = "VALID" | "INVALID" | "DUPLICATE" | "COMMIT_BLOCKED" | "COMMITTED";
export interface MigrationToolkitTemplate {
  entityType: ImportEntityType;
  label: string;
  headers: string[];
  requiredHeaders: string[];
  notes: string[];
}
export interface MigrationToolkitTemplatesResponse {
  supportedImports: MigrationToolkitTemplate[];
  unsupportedImports: string[];
  limitations: string[];
}
export interface ImportValidationIssue {
  id: string;
  rowNumber: number | null;
  field: string | null;
  code: string;
  message: string;
  severity: "ERROR" | "WARNING";
}
export interface ImportJobRow {
  id: string;
  rowNumber: number;
  status: ImportJobRowStatus;
  duplicate: boolean;
  rawJson: Record<string, unknown>;
  normalizedJson: Record<string, unknown>;
  createdRecordId: string | null;
}
export interface ImportJob {
  id: string;
  entityType: ImportEntityType;
  status: ImportJobStatus;
  filename: string;
  previewOnly: boolean;
  summaryJson: Record<string, unknown>;
  requestId: string | null;
  createdAt: string;
  committedAt: string | null;
  rows: ImportJobRow[];
  validationIssues: ImportValidationIssue[];
}
export type WarehouseStatus = "ACTIVE" | "ARCHIVED";
export type InventoryBinLocationType = "BIN" | "SHELF" | "ZONE" | "STAGING" | "RECEIVING" | "SHIPPING" | "IN_TRANSIT" | "RETURNS" | "QUARANTINE" | "OTHER";
export type InventoryBinLocationStatus = "ACTIVE" | "INACTIVE";
export type InventoryBatchStatus = "ACTIVE" | "EXPIRED" | "QUARANTINED" | "CLOSED";
export type InventorySerialNumberStatus = "AVAILABLE" | "RESERVED" | "ISSUED" | "RETURNED" | "QUARANTINED" | "LOST" | "SCRAPPED";
export type StockMovementType =
  | "OPENING_BALANCE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "PURCHASE_RECEIPT_PLACEHOLDER"
  | "SALES_ISSUE_PLACEHOLDER"
  | "PURCHASE_RETURN_OUT"
  | "SALES_RETURN_IN";
export type InventoryAdjustmentStatus = "DRAFT" | "APPROVED" | "VOIDED";
export type InventoryAdjustmentType = "INCREASE" | "DECREASE";
export type WarehouseTransferStatus = "POSTED" | "VOIDED";
export type PurchaseReceiptStatus = "POSTED" | "VOIDED";
export type SalesStockIssueStatus = "POSTED" | "VOIDED";
export type InventorySourceProgressStatus = "NOT_STARTED" | "PARTIAL" | "COMPLETE";
export type PurchaseReceiptMatchingStatus = "NOT_RECEIVED" | "PARTIALLY_RECEIVED" | "FULLY_RECEIVED" | "OVER_RECEIVED_WARNING";
export type InventoryValuationMethod = "MOVING_AVERAGE" | "FIFO_PLACEHOLDER";
export type InventoryPurchasePostingMode = "DISABLED" | "PREVIEW_ONLY";
export type PurchaseBillInventoryPostingMode = "DIRECT_EXPENSE_OR_ASSET" | "INVENTORY_CLEARING";
export type InventoryVarianceProposalStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "POSTED" | "REVERSED" | "VOIDED";
export type InventoryVarianceProposalSourceType = "CLEARING_VARIANCE" | "MANUAL";
export type InventoryValuationVarianceType =
  | "PRICE_VARIANCE"
  | "QUANTITY_VARIANCE"
  | "RECEIPT_WITHOUT_BILL"
  | "BILL_WITHOUT_RECEIPT"
  | "OVER_RECEIVED_VALUE"
  | "OVER_BILLED_VALUE"
  | "RETURN_PENDING_CREDIT"
  | "REVIEW_REQUIRED";
export type InventoryValuationVarianceSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type InventoryValuationVarianceStatus =
  | "PREVIEW_ONLY"
  | "NEEDS_ACCOUNTANT_REVIEW"
  | "NEEDS_MATCHING_REVIEW"
  | "NEEDS_RETURN_REVIEW"
  | "READY_FOR_POLICY_DECISION";
export type InventoryValuationVarianceSourceType = "purchaseOrder" | "purchaseBill" | "purchaseReceipt" | "purchaseReturn" | "matchingReview";
export type LandedCostCategory = "FREIGHT" | "CUSTOMS_DUTY" | "INSURANCE" | "HANDLING" | "BROKERAGE" | "STORAGE" | "OTHER";
export type LandedCostAllocationMethod = "BY_VALUE" | "BY_QUANTITY" | "EQUAL" | "MANUAL";
export type LandedCostSourceType = "PURCHASE_RECEIPT" | "PURCHASE_BILL" | "PURCHASE_ORDER";
export type InventoryVarianceReason =
  | "PRICE_DIFFERENCE"
  | "QUANTITY_DIFFERENCE"
  | "RECEIPT_WITHOUT_CLEARING_BILL"
  | "CLEARING_BILL_WITHOUT_RECEIPT"
  | "REVERSED_RECEIPT_POSTING"
  | "MANUAL_ADJUSTMENT";
export type InventoryVarianceProposalAction = "CREATE" | "SUBMIT" | "APPROVE" | "POST" | "REVERSE" | "VOID";
export type SalesInvoiceStatus = "DRAFT" | "FINALIZED" | "VOIDED";
export type SalesInvoiceTaxMode = "TAX_EXCLUSIVE" | "TAX_INCLUSIVE" | "NO_TAX";
export type SalesQuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED" | "CONVERTED";
export type RecurringInvoiceTemplateStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED" | "CANCELLED";
export type RecurringInvoiceFrequency = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
export type RecurringInvoiceDateMode = "RUN_DATE";
export type DeliveryNoteStatus = "DRAFT" | "ISSUED" | "DELIVERED" | "CANCELLED" | "VOIDED";
export type SalesInventoryReturnStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "RECEIVED" | "VOIDED" | "CANCELLED";
export type CollectionCaseStatus = "OPEN" | "IN_PROGRESS" | "PROMISED_TO_PAY" | "PAID" | "ON_HOLD" | "DISPUTED" | "CLOSED" | "CANCELLED";
export type CollectionPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type CollectionActivityType =
  | "NOTE"
  | "CALL"
  | "EMAIL_PLANNED"
  | "REMINDER_PLANNED"
  | "PROMISE_TO_PAY"
  | "DISPUTE"
  | "ESCALATION"
  | "PAYMENT_RECEIVED_NOTE"
  | "CLOSED_NOTE";
export type CreditNoteStatus = "DRAFT" | "FINALIZED" | "VOIDED";
export type PurchaseOrderStatus = "DRAFT" | "APPROVED" | "SENT" | "PARTIALLY_BILLED" | "BILLED" | "CLOSED" | "VOIDED";
export type PurchaseBillStatus = "DRAFT" | "FINALIZED" | "VOIDED";
export type PurchaseDebitNoteStatus = "DRAFT" | "FINALIZED" | "VOIDED";
export type PurchaseReturnStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "COMPLETED" | "VOIDED" | "CANCELLED";
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
export type BankDepositBatchStatus = "DRAFT" | "POSTED" | "MATCHED" | "VOIDED";
export type BankDepositBatchLineSourceType =
  | "CUSTOMER_PAYMENT"
  | "RECEIPT"
  | "MANUAL_CASH_RECEIPT"
  | "CHEQUE_PLACEHOLDER"
  | "OTHER_CLEARING_ITEM";
export type CardSettlementType = "CREDIT_CARD_PAYDOWN" | "CREDIT_CARD_CREDIT" | "PREPAID_CARD_TOP_UP";
export type CardSettlementStatus = "DRAFT" | "POSTED" | "MATCHED" | "VOIDED";
export type ChequeInstrumentType = "RECEIVED" | "ISSUED";
export type ChequeInstrumentStatus = "DRAFT" | "RECEIVED" | "ISSUED" | "DEPOSITED" | "CLEARED" | "BOUNCED" | "VOIDED";
export type ChequeCounterpartyType = "CUSTOMER" | "SUPPLIER" | "OTHER";
export type BankStatementImportStatus = "IMPORTED" | "PARTIALLY_RECONCILED" | "RECONCILED" | "VOIDED";
export type BankStatementTransactionStatus = "UNMATCHED" | "MATCHED" | "CATEGORIZED" | "IGNORED" | "VOIDED";
export type BankStatementTransactionType = "DEBIT" | "CREDIT";
export type BankRuleDirection = "ANY" | "DEBIT" | "CREDIT";
export type BankRuleActionType = "SUGGEST_CATEGORIZE" | "SUGGEST_IGNORE" | "SUGGEST_MATCH_CANDIDATES" | "CATEGORIZE" | "IGNORE";
export type BankRuleApplicationStatus = "SUGGESTED" | "APPLIED" | "FAILED";
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
export type BankIntegrationProvider = "NONE" | "MOCK_WIO" | "WIO_DISABLED_PLACEHOLDER";
export type BankIntegrationStatus = "NOT_CONFIGURED" | "DISABLED" | "READY_FOR_MOCK" | "SYNCED" | "FAILED" | "BLOCKED";
export type BankBeneficiaryMappingStatus = "UNMAPPED" | "MAPPED" | "NEEDS_REVIEW" | "BLOCKED" | "ARCHIVED";
export type BankPaymentRequestStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "RELEASE_BLOCKED"
  | "RELEASED_EXTERNALLY"
  | "RECONCILED"
  | "CANCELLED";
export interface BankIntegrationReadinessSurface {
  provider: BankIntegrationProvider;
  status: BankIntegrationStatus | BankBeneficiaryMappingStatus | BankPaymentRequestStatus;
  stateLabel: "Disabled" | "Local Mock Only" | "Blocked" | "Needs Configuration" | "Future Provider";
  blockers: string[];
  count?: number;
  accountCount?: number;
  syncRunCount?: number;
  canCreateLocalMockConnection?: boolean;
  canRecordMockSync?: boolean;
  safeReferencesOnly?: boolean;
  releaseBlocked?: boolean;
}
export interface BankIntegrationReadinessResponse {
  provider: BankIntegrationProvider;
  providerStateLabel: "Disabled" | "Local Mock Only" | "Blocked" | "Needs Configuration" | "Future Provider";
  noSecretsReturned: true;
  noBankCredentialsStored: true;
  noRealWioApiCalls: true;
  noMoneyMovement: true;
  manualImportStillSupported: true;
  counts: {
    connections: number;
    feedAccounts: number;
    paymentRequests: number;
  };
  surfaces: {
    bankConnection: BankIntegrationReadinessSurface;
    bankFeed: BankIntegrationReadinessSurface;
    beneficiaryMapping: BankIntegrationReadinessSurface;
    vendorPayment: BankIntegrationReadinessSurface;
  };
  warnings: string[];
}
export type BankPaymentRequestReconciliationState = "ANY" | "UNRECONCILED" | "RECONCILED" | "FEED" | "STATEMENT";
export interface BankPaymentRequestAuditTimelineItem {
  id: string;
  action: string;
  actorUserId: string | null;
  requestId: string | null;
  createdAt: string;
}
export interface BankPaymentRequestSafeDetail {
  id: string;
  organizationId: string;
  supplierId: string | null;
  purchaseBillId: string | null;
  bankConnectionId: string | null;
  beneficiaryMappingId: string | null;
  bankFeedTransactionId: string | null;
  bankStatementTransactionId: string | null;
  status: BankPaymentRequestStatus;
  amount: string;
  currency: string;
  memo: string | null;
  externalReleaseReferenceMasked: string | null;
  releaseBlockedReason: string | null;
  approvedAt: string | null;
  manuallyReleasedAt: string | null;
  reconciledAt: string | null;
  cancelledAt: string | null;
  requestId: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: { id: string; name: string; displayName: string | null } | null;
  purchaseBill: {
    id: string;
    billNumber: string;
    billDate: string;
    dueDate: string | null;
    status: PurchaseBillStatus;
    total: string;
    balanceDue: string;
    currency: string;
  } | null;
  bankConnection: {
    id: string;
    provider: BankIntegrationProvider;
    status: BankIntegrationStatus;
    displayName: string;
    externalConnectionRefMasked: string | null;
    externalInstitutionName: string | null;
  } | null;
  beneficiaryMapping: {
    id: string;
    provider: BankIntegrationProvider;
    status: BankBeneficiaryMappingStatus;
    beneficiaryDisplayName: string;
    beneficiaryRefMasked: string | null;
    externalBeneficiaryRefMasked: string | null;
  } | null;
  reconciliation: {
    state: "UNRECONCILED" | "RECONCILED";
    bankFeedTransaction: {
      id: string;
      transactionDate: string;
      description: string;
      reference: string | null;
      type: BankStatementTransactionType;
      amount: string;
      currency: string;
      externalTransactionRefMasked: string | null;
    } | null;
    bankStatementTransaction: {
      id: string;
      transactionDate: string;
      description: string;
      reference: string | null;
      type: BankStatementTransactionType;
      amount: string;
      status: BankStatementTransactionStatus;
    } | null;
  };
  auditTimeline?: BankPaymentRequestAuditTimelineItem[];
  noSecretsReturned: true;
  noBankCredentialsStored: true;
  noMoneyMovement: true;
}
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
  | "PURCHASE_RETURN"
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
  | "SALES_QUOTE"
  | "DELIVERY_NOTE"
  | "CREDIT_NOTE"
  | "CUSTOMER_PAYMENT_RECEIPT"
  | "CUSTOMER_REFUND"
  | "CUSTOMER_STATEMENT"
  | "SUPPLIER_STATEMENT"
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
export type ComplianceDocumentStatus =
  | "DRAFT"
  | "READY_FOR_VALIDATION"
  | "VALIDATION_FAILED"
  | "READY_FOR_ASP"
  | "SUBMITTED_TO_ASP"
  | "ACCEPTED_BY_ASP"
  | "REJECTED_BY_ASP"
  | "REPORTED_TO_FTA"
  | "DELIVERED_TO_BUYER"
  | "FAILED"
  | "CANCELLED"
  | "ARCHIVED";
export type ComplianceReadinessStatus = "READY_FOR_VALIDATION" | "NEEDS_DATA" | "BLOCKED";
export type ComplianceCheckStatus = "PASS" | "WARNING" | "FAIL";
export interface ComplianceReadinessCheck {
  key: string;
  label: string;
  status: ComplianceCheckStatus;
  detail: string;
}
export interface ComplianceReadinessResponse {
  posture: "CONTROLLED_BETA_USER_TESTING_ONLY";
  claim: string;
  prohibitedClaims: string[];
  noNetworkByDefault: boolean;
  countries: Array<{ code: "AE" | "SA"; module: string; status: string }>;
  uae: {
    framework: string;
    deadlines: Array<{ segment: string; appointAspBy: string; implementBy: string }>;
    sources: string[];
    expectedParticipantId: string | null;
    readiness: {
      status: ComplianceReadinessStatus;
      checks: ComplianceReadinessCheck[];
      warnings: string[];
    };
    buyerEndpointCoverage: {
      activeBuyerCount: number;
      buyerPeppolParticipantCount: number;
    };
  };
  documentStatusCounts: Partial<Record<ComplianceDocumentStatus, number>>;
}
export type ComplianceSourceType = "SALES_INVOICE" | "CREDIT_NOTE";
export type ComplianceValidationStatus = "PENDING" | "PASSED" | "FAILED" | "WARNING";
export interface UaePartyReadinessReport {
  label: string;
  status: ComplianceReadinessStatus;
  checks: ComplianceReadinessCheck[];
}
export interface UaeDocumentReadinessReport {
  kind: "invoice" | "credit-note";
  status: ComplianceReadinessStatus;
  seller: UaePartyReadinessReport;
  buyer: UaePartyReadinessReport;
  invoiceFields: UaePartyReadinessReport;
  taxIdentity: UaePartyReadinessReport;
  peppolParticipant: UaePartyReadinessReport;
  originalReference?: UaePartyReadinessReport;
  canAttemptLocalXmlGeneration: boolean;
  validation: {
    valid: boolean;
    issues: Array<{ code: string; severity: "ERROR" | "WARNING" | "error" | "warning" | "info"; message: string; fieldPath?: string; source?: string }>;
  };
  warnings: string[];
}
export interface ComplianceValidationResultSummary {
  id: string;
  status: ComplianceValidationStatus;
  summary: string;
  issuesJson?: unknown;
  metadataJson?: unknown;
  createdAt?: string;
}
export interface ComplianceArchiveRecordSummary {
  id: string;
  artifactType: string;
  filename: string | null;
  mimeType: string | null;
  storageProvider: string;
  contentHash: string | null;
  sizeBytes: number | null;
  archivedAt?: string;
}
export interface ComplianceDocumentSummary {
  id: string;
  sourceType: ComplianceSourceType;
  sourceId: string;
  documentType: string;
  status: ComplianceDocumentStatus;
  documentNumber: string;
  latestValidationStatus: ComplianceValidationStatus | null;
  validationSummaryJson?: unknown;
  validationResults?: ComplianceValidationResultSummary[];
  archiveRecords?: ComplianceArchiveRecordSummary[];
}
export interface ComplianceSourceReadinessResponse {
  posture: "CONTROLLED_BETA_USER_TESTING_ONLY";
  sourceType: ComplianceSourceType;
  sourceId: string;
  sourceStatus: string;
  localOnly: true;
  noNetwork: true;
  noAspSubmission: true;
  noFtaReporting: true;
  productionCompliance: false;
  canAttemptLocalXmlGeneration: boolean;
  readiness: UaeDocumentReadinessReport;
  complianceDocument: ComplianceDocumentSummary | null;
}
export type AttachmentStorageProvider = "DATABASE" | "LOCAL_PLACEHOLDER" | "S3_PLACEHOLDER" | "S3";
export type EmailDeliveryStatus = "QUEUED" | "SENT_MOCK" | "SENT_PROVIDER" | "FAILED";
export type EmailTemplateType =
  | "ORGANIZATION_INVITE"
  | "PASSWORD_RESET"
  | "TEST_EMAIL"
  | "AP_GENERATED_DOCUMENT"
  | "SALES_INVOICE"
  | "INVOICE_PAYMENT_LINK"
  | "PAYMENT_RECEIPT"
  | "FAILED_DELIVERY_NOTIFICATION";
export type EmailProviderName = "mock" | "smtp-disabled" | "smtp" | "invalid" | string;
export type InvoicePaymentEmailProviderState = "NONE" | "MOCK_EMAIL" | "DISABLED_PROVIDER_PLACEHOLDER" | "FUTURE_SMTP_OR_PROVIDER" | string;
export type EmailDeliveryTargetType = "SALES_INVOICE" | "INVOICE_PAYMENT_LINK" | "CUSTOMER_PAYMENT" | "SYSTEM_NOTIFICATION";
export type EmailDeliveryEventStatus = "PREVIEWED" | "BLOCKED";
export type EmailSenderDomainEvidenceStatus = "DRAFT" | "VERIFIED" | "REVOKED" | "SUPERSEDED";
export type EmailSenderDomainEvidenceType = "SPF" | "DKIM" | "DMARC" | "MX" | "RETURN_PATH" | "PROVIDER_VERIFICATION" | "OTHER";
export type EmailSenderDomainReadinessStatus = "BLOCKED" | "PARTIAL" | "READY_FOR_REVIEW";
export type EmailProviderEventType = "DELIVERED" | "BOUNCED" | "COMPLAINED" | "FAILED" | "OPENED" | "CLICKED" | "UNKNOWN";
export type EmailSuppressionReason = "BOUNCE" | "COMPLAINT" | "MANUAL" | "PROVIDER_EVENT";
export type EmailDeliveryMonitoringEvidenceStatus = "DRAFT" | "VERIFIED" | "REVOKED" | "SUPERSEDED";
export type EmailDeliveryMonitoringEvidenceType =
  | "RETRY_WORKER"
  | "BOUNCE_ALERTS"
  | "COMPLAINT_ALERTS"
  | "SUPPRESSION_TRENDS"
  | "DELIVERY_DASHBOARD"
  | "PROVIDER_WEBHOOK_HEALTH"
  | "OTHER";
export type EmailMonitoringEvidenceReadinessStatus = "BLOCKED" | "PARTIAL" | "READY_FOR_REVIEW";

export type BackupRestoreEvidenceScope = "GLOBAL" | "ORGANIZATION";
export type BackupRestoreEvidenceStatus = "DRAFT" | "VERIFIED" | "REVOKED" | "SUPERSEDED";
export type BackupRestoreEvidenceType =
  | "DATABASE_BACKUP"
  | "POINT_IN_TIME_RECOVERY"
  | "MIGRATION_HISTORY"
  | "OBJECT_STORAGE_BACKUP"
  | "GENERATED_DOCUMENT_BACKUP"
  | "ATTACHMENT_BACKUP"
  | "RESTORE_DRILL"
  | "RESTORE_VERIFICATION"
  | "RPO_RTO_REVIEW"
  | "OTHER";
export type EmailRelayDiagnosticsStatus =
  | "NOT_RUN"
  | "SKIPPED_DISABLED"
  | "READY_FOR_NON_PRODUCTION_TEST"
  | "ATTEMPTED"
  | "FAILED"
  | string;
export type AttachmentLinkedEntityType =
  | "SALES_INVOICE"
  | "CUSTOMER_PAYMENT"
  | "CREDIT_NOTE"
  | "CUSTOMER_REFUND"
  | "PURCHASE_BILL"
  | "SUPPLIER_PAYMENT"
  | "PURCHASE_DEBIT_NOTE"
  | "SUPPLIER_REFUND"
  | "PURCHASE_ORDER"
  | "CASH_EXPENSE"
  | "BANK_STATEMENT_IMPORT"
  | "BANK_STATEMENT_TRANSACTION"
  | "BANK_RECONCILIATION"
  | "PURCHASE_RECEIPT"
  | "SALES_STOCK_ISSUE"
  | "INVENTORY_ADJUSTMENT"
  | "WAREHOUSE_TRANSFER"
  | "INVENTORY_VARIANCE_PROPOSAL"
  | "CONTACT"
  | "ITEM"
  | "MANUAL_JOURNAL"
  | "OTHER";
export type AttachmentStatus = "ACTIVE" | "DELETED";
export type ZatcaEnvironment = "SANDBOX" | "SIMULATION" | "PRODUCTION";
export type ZatcaRegistrationStatus = "NOT_CONFIGURED" | "DRAFT" | "READY_FOR_CSR" | "OTP_REQUIRED" | "CERTIFICATE_ISSUED" | "ACTIVE" | "SUSPENDED";
export type ZatcaInvoiceType = "STANDARD_TAX_INVOICE" | "SIMPLIFIED_TAX_INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE";
export type ZatcaInvoiceStatus = "NOT_SUBMITTED" | "XML_GENERATED" | "READY_FOR_SUBMISSION" | "SUBMISSION_PENDING" | "CLEARED" | "REPORTED" | "REJECTED" | "FAILED";
export type ZatcaSubmissionType = "COMPLIANCE_CHECK" | "CLEARANCE" | "REPORTING";
export type ZatcaSubmissionStatus = "PENDING" | "SUCCESS" | "REJECTED" | "FAILED";
export type ZatcaHashMode = "LOCAL_DETERMINISTIC" | "SDK_GENERATED";
export type ZatcaCsrConfigReviewStatus = "DRAFT" | "APPROVED" | "SUPERSEDED" | "REVOKED";
export type MembershipStatus = "ACTIVE" | "INVITED" | "SUSPENDED";

export interface Organization {
  id: string;
  name: string;
  legalName: string | null;
  taxNumber: string | null;
  countryCode: string;
  baseCurrency: string;
  timezone: string;
  tradeLicenseNumber?: string | null;
  uaeTrn?: string | null;
  uaeTin?: string | null;
  uaeVatRegistrationStatus?: string | null;
  uaeAddressLine1?: string | null;
  uaeAddressLine2?: string | null;
  uaeEmirate?: string | null;
  uaeBusinessActivity?: string | null;
  peppolParticipantId?: string | null;
  uaeAspSelected?: string | null;
  uaeAspOnboardingStatus?: string | null;
}

export type GlobalSearchCategory = "Contacts" | "Transactions" | "Products / Services" | "Reports" | "Pages / Navigation";

export interface GlobalSearchResult {
  id: string;
  category: GlobalSearchCategory;
  label: string;
  href: string;
  resultType: string;
  detail: string;
  amount: string | null;
  date: string | null;
  status: string | null;
  keywords: string[];
}

export interface GlobalSearchResponse {
  query: string;
  results: GlobalSearchResult[];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken?: string;
  organization?: Organization;
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
  emailOutboxId?: string;
  invitePreviewUrl?: string;
}

export type DashboardAttentionSeverity = "info" | "warning" | "critical";

export interface DashboardAttentionItem {
  type: string;
  severity: DashboardAttentionSeverity;
  title: string;
  description: string;
  href: string;
}

export interface DashboardTrendPoint {
  month: string;
  amount: string;
}

export interface DashboardCashTrendPoint {
  date: string;
  balance: string;
}

export interface DashboardAgingBucket {
  bucket: string;
  amount: string;
}

export interface DashboardLowStockItem {
  itemId: string;
  name: string;
  quantityOnHand: string;
  reorderPoint: string;
}

export interface DashboardSalesAttentionTopItem {
  id: string;
  number: string;
  customerName: string;
  status: string;
  href: string;
  amount?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  expiryDate?: string | null;
  nextRunDate?: string | null;
  followUpDate?: string | null;
  deliveryDate?: string | null;
  promisedPaymentDate?: string | null;
  promisedAmount?: string | null;
  templateNumber?: string | null;
  templateName?: string | null;
  sourceHref?: string | null;
}

export interface DashboardSalesAttentionCustomerItem {
  id: string;
  customerName: string;
  outstandingBalance: string;
  overdueAmount: string;
  openCollectionCaseCount: number;
  href: string;
}

export interface DashboardSalesAttentionSummary {
  readOnly: true;
  noMutation: true;
  helperText: string;
  overdueInvoices: {
    count: number;
    total: string;
    topItems: DashboardSalesAttentionTopItem[];
  };
  collections: {
    openCount: number;
    dueTodayCount: number;
    overdueFollowUpCount: number;
    promisedToPayTotal: string;
    disputedCount: number;
    topItems: DashboardSalesAttentionTopItem[];
  };
  quotes: {
    awaitingAcceptanceCount: number;
    expiringSoonCount: number;
    acceptedNotConvertedCount: number;
    topItems: DashboardSalesAttentionTopItem[];
  };
  recurringInvoices: {
    activeCount: number;
    dueSoonCount: number;
    overdueForGenerationCount: number;
    recentlyGeneratedDraftInvoiceCount: number;
    topItems: DashboardSalesAttentionTopItem[];
    recentDraftInvoices: DashboardSalesAttentionTopItem[];
  };
  deliveryNotes: {
    draftCount: number;
    issuedNotDeliveredCount: number;
    overdueDeliveryCount: number;
    topItems: DashboardSalesAttentionTopItem[];
  };
  customers: {
    topOutstanding: DashboardSalesAttentionCustomerItem[];
  };
}

export type DashboardSectionName =
  | "sales"
  | "salesAttention"
  | "purchases"
  | "banking"
  | "inventory"
  | "reports"
  | "trends"
  | "aging"
  | "compliance"
  | "storage";

export type DashboardSectionStatus =
  | { status: "READY" }
  | {
      status: "UNAVAILABLE";
      code: string;
      message: string;
    };

export interface DashboardSectionWarning {
  section: DashboardSectionName;
  code: string;
  message: string;
}

export type DashboardOnboardingChecklistItemStatus = "COMPLETE" | "INCOMPLETE" | "WARNING";
export type DashboardOnboardingChecklistStatus = "BLOCKED" | "IN_PROGRESS" | "READY_FOR_SELLABLE_V1_REVIEW";

export interface DashboardOnboardingChecklistItem {
  id: string;
  label: string;
  status: DashboardOnboardingChecklistItemStatus;
  description: string;
  href: string;
  evidence: string[];
  blockers: string[];
  warnings: string[];
}

export interface DashboardOnboardingChecklist {
  readOnly: true;
  noMutation: true;
  tenantScoped: true;
  organizationId: string;
  generatedAt: string;
  status: DashboardOnboardingChecklistStatus;
  readinessScore: number;
  completedCount: number;
  totalCount: number;
  items: DashboardOnboardingChecklistItem[];
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
  zatcaProductionCompliance: false;
  realZatcaNetworkEnabled: false;
  signedXmlBodyPersistenceAllowed: false;
  qrPayloadBodyPersistenceAllowed: false;
  productionCompliance: false;
}

export interface DashboardSummary {
  sectionStatus?: Record<DashboardSectionName, DashboardSectionStatus>;
  warnings?: DashboardSectionWarning[];
  asOf: string;
  currency: string;
  sales: {
    unpaidInvoiceCount: number;
    unpaidInvoiceBalance: string;
    overdueInvoiceCount: number;
    overdueInvoiceBalance: string;
    salesThisMonth: string;
    customerPaymentThisMonth: string;
  };
  salesAttention: DashboardSalesAttentionSummary;
  purchases: {
    unpaidBillCount: number;
    unpaidBillBalance: string;
    overdueBillCount: number;
    overdueBillBalance: string;
    purchasesThisMonth: string;
    supplierPaymentThisMonth: string;
  };
  banking: {
    bankAccountCount: number;
    totalBankBalance: string;
    unreconciledTransactionCount: number;
    latestReconciliationDate: string | null;
  };
  inventory: {
    trackedItemCount: number;
    lowStockCount: number;
    negativeStockCount: number;
    inventoryEstimatedValue: string;
    clearingVarianceCount: number;
    lowStockItems: DashboardLowStockItem[];
  };
  reports: {
    trialBalanceBalanced: boolean;
    profitAndLossNetProfit: string;
    balanceSheetBalanced: boolean;
  };
  trends: {
    monthlySales: DashboardTrendPoint[];
    monthlyPurchases: DashboardTrendPoint[];
    monthlyNetProfit: DashboardTrendPoint[];
    cashBalanceTrend: DashboardCashTrendPoint[];
  };
  aging: {
    receivablesBuckets: DashboardAgingBucket[];
    payablesBuckets: DashboardAgingBucket[];
  };
  compliance: {
    zatcaProductionReady: boolean;
    zatcaBlockingReasonCount: number;
    fiscalPeriodsLockedCount: number;
    auditLogCountThisMonth: number;
  };
  attentionItems: DashboardAttentionItem[];
}

export interface AuditLogActor {
  id: string;
  name: string;
  email: string;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  actorUser?: AuditLogActor | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogListResponse {
  data: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface AuditLogRetentionSettings {
  id: string;
  organizationId: string;
  retentionDays: number;
  autoPurgeEnabled: boolean;
  exportBeforePurgeRequired: boolean;
  updatedById: string | null;
  updatedBy?: AuditLogActor | null;
  createdAt: string;
  updatedAt: string;
  warnings: string[];
}

export interface AuditLogRetentionPreview {
  retentionDays: number;
  cutoffDate: string;
  totalAuditLogs: number;
  logsOlderThanCutoff: number;
  oldestLogDate: string | null;
  newestLogDate: string | null;
  autoPurgeEnabled: boolean;
  exportBeforePurgeRequired: boolean;
  dryRunOnly: boolean;
  warnings: string[];
}

export interface NumberSequenceSetting {
  id: string;
  scope: string;
  prefix: string;
  nextNumber: number;
  padding: number;
  exampleNextNumber: string;
  updatedAt: string;
}

export interface InvitationPreviewResponse {
  valid: boolean;
  reason?: string | null;
  email?: string;
  organization?: { id: string; name: string } | null;
  role?: { id: string; name: string } | null;
  expiresAt?: string;
  consumed?: boolean;
}

export interface EmailOutboxEntry {
  id: string;
  organizationId: string | null;
  toEmail: string;
  fromEmail: string;
  subject: string;
  templateType: EmailTemplateType;
  status: EmailDeliveryStatus;
  provider: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: string | null;
  lastAttemptAt: string | null;
  lastErrorRedacted: string | null;
  providerEventStatus: string | null;
  generatedDocumentId: string | null;
  sourceType: string | null;
  sourceId: string | null;
  attachmentFilename: string | null;
  attachmentMimeType: string | null;
  attachmentSizeBytes: number | null;
  attachmentContentHash: string | null;
  bouncedAt: string | null;
  complainedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailOutboxDetail extends EmailOutboxEntry {
  bodyText: string;
  bodyHtml: string | null;
}

export interface InvoicePaymentEmailReadinessResponse {
  providerState: InvoicePaymentEmailProviderState;
  status: "Disabled" | "Local Mock Only" | "Needs Configuration" | "Future Provider";
  configured: boolean;
  localMockOnly: boolean;
  sendEnabled: false;
  actualSendBlocked: boolean;
  noProviderCalls: boolean;
  noCredentialsStored: boolean;
  noCustomerEmailSent: boolean;
  previewEnabled: boolean;
  supportedTemplates: Array<{
    templateType: EmailTemplateType;
    label: string;
    previewAvailable: boolean;
    deliveryStatus: "Blocked";
  }>;
  recentEventCount: number;
  blockers: string[];
  warnings: string[];
  redactionGuarantees: string[];
}

export interface InvoicePaymentEmailPreviewResponse {
  localOnly: true;
  noEmailSent: true;
  providerCalled: false;
  fakeDataOnly: true;
  redactedRecipient: string;
  templateType: EmailTemplateType;
  targetType: EmailDeliveryTargetType;
  requestId: string | null;
  preview: {
    subject: string;
    bodyText: string;
    bodyHtml?: string | null;
  };
  event: {
    id: string;
    status: EmailDeliveryEventStatus;
    templateType: EmailTemplateType;
    targetType: EmailDeliveryTargetType;
    redactedRecipient: string;
    providerState: string;
    requestId: string | null;
  };
}

export interface EmailSenderDomainEvidence {
  id: string;
  organizationId: string;
  domain: string;
  status: EmailSenderDomainEvidenceStatus;
  evidenceType: EmailSenderDomainEvidenceType;
  provider: string | null;
  evidenceSummaryJson: Record<string, unknown>;
  verifiedById: string | null;
  verifiedAt: string | null;
  revokedById: string | null;
  revokedAt: string | null;
  note: string | null;
  productionReadyContribution: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSenderDomainEvidenceListResponse {
  metadataOnly: true;
  noCustomerEmail: true;
  noEmailSent: true;
  noOutboxRecord: true;
  redactionGuarantees: string[];
  evidence: EmailSenderDomainEvidence[];
}

export interface EmailSenderDomainEvidenceResponse {
  metadataOnly: true;
  noCustomerEmail: true;
  noEmailSent: true;
  noOutboxRecord: true;
  redactionGuarantees: string[];
  evidence: EmailSenderDomainEvidence;
}

export interface EmailDiagnosticsPlan {
  executionEnabled: boolean;
  allowedRecipientsConfigured: boolean;
  allowedDomainsConfigured: boolean;
  provider: string;
  smtpConfigured: boolean;
  wouldSendToRedactedRecipient: string | null;
  noCustomerEmailSentByDefault: true;
  noMutationByDefault: true;
  productionReady: false;
}

export interface EmailRetryPlan {
  readOnly: true;
  noMutation: true;
  noCustomerEmailSent: true;
  executionEnabled: boolean;
  retryWorkerConfigured: boolean;
  retryProcessorEnabled: boolean;
  pendingCount: number;
  failedRetryableCount: number;
  blockedCount: number;
  nextAttemptCount: number;
  suppressedOutboxCount: number;
  activeSuppressionCount: number;
  maxAttemptsPolicy: {
    defaultMaxAttempts: number;
    maxBatchLimit: number;
  };
  productionReadyContribution: boolean;
  blockers: string[];
  warnings: string[];
}

export interface EmailRetryWorkerPlan {
  readOnly: true;
  noMutation: true;
  noCustomerEmailSent: true;
  workerConfigured: boolean;
  workerEnabled: boolean;
  schedulerProvider: "NONE" | "FUTURE_CRON" | "FUTURE_QUEUE" | "FUTURE_SERVERLESS_CRON" | string;
  retryProcessorEnabled: boolean;
  pendingCount: number;
  dueRetryCount: number;
  suppressedCount: number;
  activeSuppressionCount: number;
  blockedCount: number;
  maxAttemptsPolicy: {
    defaultMaxAttempts: number;
    maxBatchLimit: number;
  };
  recommendedSchedule: string;
  productionReadyContribution: boolean;
  blockers: string[];
  warnings: string[];
}

export interface EmailRetryWorkerRunResponse {
  status: "SKIPPED_DISABLED" | "SKIPPED_PROCESSOR_DISABLED" | "ATTEMPTED" | string;
  executionEnabled: boolean;
  executionAttempted: boolean;
  noEmailSent?: boolean;
  noCustomerEmailSent?: boolean;
  noMutation?: boolean;
  noCustomerEmailSentByDefault?: boolean;
  noOutboxRecordCreated?: boolean;
  provider: string;
  plan: EmailRetryWorkerPlan;
  redactionGuarantees: string[];
}

export interface EmailDeliveryMonitoringEvidence {
  id: string;
  organizationId: string;
  status: EmailDeliveryMonitoringEvidenceStatus;
  evidenceType: EmailDeliveryMonitoringEvidenceType;
  provider: string | null;
  evidenceSummaryJson: Record<string, unknown>;
  verifiedById: string | null;
  verifiedAt: string | null;
  revokedById: string | null;
  revokedAt: string | null;
  note: string | null;
  productionReadyContribution: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailDeliveryMonitoringEvidenceListResponse {
  metadataOnly: true;
  noCustomerEmail: true;
  noEmailSent: true;
  noOutboxRecord: true;
  redactionGuarantees: string[];
  evidence: EmailDeliveryMonitoringEvidence[];
}

export interface EmailDeliveryMonitoringEvidenceResponse {
  metadataOnly: true;
  noCustomerEmail: true;
  noEmailSent: true;
  noOutboxRecord: true;
  redactionGuarantees: string[];
  evidence: EmailDeliveryMonitoringEvidence;
}

export interface EmailMonitoringPlan {
  readOnly: true;
  noMutation: true;
  noCustomerEmailSent: true;
  metadataOnly: true;
  monitoringConfigured: boolean;
  alertingConfigured: boolean;
  retryThroughputMonitoringConfigured: boolean;
  bounceAlertThresholdConfigured: boolean;
  complaintAlertThresholdConfigured: boolean;
  suppressionTrendMonitoringConfigured: boolean;
  deliveryDashboardConfigured: boolean;
  providerWebhookHealthMonitoringConfigured: boolean;
  evidenceStatus: EmailMonitoringEvidenceReadinessStatus;
  productionReadyContribution: boolean;
  requiredEvidenceTypes: EmailDeliveryMonitoringEvidenceType[];
  verifiedEvidenceTypes: EmailDeliveryMonitoringEvidenceType[];
  missingEvidenceTypes: EmailDeliveryMonitoringEvidenceType[];
  blockers: string[];
  warnings: string[];
}

export interface EmailProviderEventsPlan {
  readOnly: true;
  noMutation: true;
  noCustomerEmailSent: true;
  metadataOnly: true;
  mockIngestionAvailable: boolean;
  providerEventIngestionReady: boolean;
  bounceWebhookConfigured: boolean;
  bounceWebhookSignatureVerified: boolean;
  webhookVerificationConfigured: boolean;
  webhookVerificationEnabled: boolean;
  webhookSecretConfigured: boolean;
  monitoringConfigured: boolean;
  alertingConfigured: boolean;
  bounceAlertThresholdConfigured: boolean;
  complaintAlertThresholdConfigured: boolean;
  providerWebhookAlertsReady: boolean;
  productionReadyContribution: boolean;
  blockers: string[];
  warnings: string[];
}

export interface EmailProviderWebhookPlan {
  readOnly: true;
  noMutation: true;
  noCustomerEmailSent: true;
  metadataOnly: true;
  webhookVerificationConfigured: boolean;
  webhookVerificationEnabled: boolean;
  webhookSecretConfigured: boolean;
  allowedProvidersConfigured: boolean;
  allowedProviders: string[];
  signatureVerificationMode: string;
  rawHeadersReturned: false;
  rawProviderPayloadReturned: false;
  webhookSecretReturned: false;
  providerWebhookSignatureVerified: boolean;
  verifiedEventCount: number;
  productionReadyContribution: boolean;
  blockers: string[];
  warnings: string[];
}

export interface EmailSuppression {
  id: string;
  organizationId: string;
  emailHash: string;
  emailMasked: string;
  reason: EmailSuppressionReason;
  sourceProvider: string | null;
  providerEventId: string | null;
  active: boolean;
  createdById: string | null;
  revokedById: string | null;
  revokedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSuppressionListResponse {
  metadataOnly: true;
  noCustomerEmail: true;
  noEmailSent: true;
  noOutboxRecord: true;
  redactionGuarantees: string[];
  suppressions: EmailSuppression[];
}

export interface EmailSuppressionResponse {
  metadataOnly: true;
  noCustomerEmail: true;
  noEmailSent: true;
  noOutboxRecord: true;
  redactionGuarantees: string[];
  suppression: EmailSuppression;
}

export interface EmailReadinessResponse {
  provider: EmailProviderName;
  ready: boolean;
  blockingReasons: string[];
  blockers: string[];
  warnings: string[];
  fromEmail: string;
  localOnly: boolean;
  noCustomerEmailSent: true;
  readOnly: true;
  noMutation: true;
  providerConfigured: boolean;
  fromAddressConfigured: boolean;
  replyToConfigured: boolean;
  smtpHostConfigured: boolean;
  smtpPortConfigured: boolean;
  smtpSecureModeConfigured: boolean;
  credentialsConfigured: boolean;
  productionReady: boolean;
  redactionGuarantees: string[];
  diagnostics: EmailDiagnosticsPlan;
  senderDomain: {
    fromDomain: string | null;
    replyToDomain: string | null;
    evidenceRequired: true;
    requiredEvidenceTypes: EmailSenderDomainEvidenceType[];
    verifiedEvidenceTypes: EmailSenderDomainEvidenceType[];
    missingEvidenceTypes: EmailSenderDomainEvidenceType[];
    evidenceStatus: EmailSenderDomainReadinessStatus;
    productionReadyContribution: boolean;
    blockers: string[];
    warnings: string[];
  };
  relayDiagnosticsStatus: EmailRelayDiagnosticsStatus;
  relayDiagnosticsRequired: true;
  bounceWebhookConfigured: boolean;
  bounceWebhookSignatureVerified: boolean;
  webhookVerificationConfigured: boolean;
  webhookVerificationEnabled: boolean;
  webhookSecretConfigured: boolean;
  providerWebhookSignatureVerified: boolean;
  suppressionListConfigured: boolean;
  activeSuppressionCount: number;
  providerEventIngestionReady: boolean;
  retryPolicyConfigured: boolean;
  retryProcessorEnabled: boolean;
  retryWorkerConfigured: boolean;
  retryWorkerEnabled: boolean;
  retryPendingCount: number;
  retryBlockedCount: number;
  retrySuppressedCount: number;
  monitoringEvidenceStatus: EmailMonitoringEvidenceReadinessStatus;
  retryThroughputMonitoringConfigured: boolean;
  suppressionTrendMonitoringConfigured: boolean;
  providerWebhookHealthMonitoringConfigured: boolean;
  monitoringConfigured: boolean;
  alertingConfigured: boolean;
  bounceAlertThresholdConfigured: boolean;
  complaintAlertThresholdConfigured: boolean;
  providerWebhookAlertsReady: boolean;
  smtp: {
    hostConfigured: boolean;
    portConfigured: boolean;
    userConfigured: boolean;
    passwordConfigured: boolean;
    secureModeConfigured: boolean;
    secure: boolean;
  };
  mockMode: boolean;
  realSendingEnabled: boolean;
}

export type EmailDiagnosticsStatus = "SKIPPED_DISABLED" | "ATTEMPTED" | string;

export interface EmailDiagnosticsResponse {
  status: EmailDiagnosticsStatus;
  executionEnabled: boolean;
  executionAttempted: boolean;
  noEmailSent: boolean;
  noCustomerEmailSent: true;
  noMutation: true;
  provider: string;
  message?: string;
  recipient?: string;
  delivery?: {
    provider: string;
    status: EmailDeliveryStatus | string;
    providerMessageId: string | null;
    errorMessage: string | null;
    sentAt: string | null;
  };
  redactionGuarantees: string[];
  plan?: EmailDiagnosticsPlan;
}

export interface AuthTokenCleanupResponse {
  deletedCount: number;
  olderThanDays: number;
  cutoff: string;
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

export interface AccountCodeSuggestion {
  type: AccountType;
  code: string;
  rangeStart: string;
  rangeEnd: string;
  manualOverrideAllowed: boolean;
  helperText: string;
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

export interface BankDepositBatchLine {
  id: string;
  organizationId: string;
  batchId: string;
  sourceType: BankDepositBatchLineSourceType;
  sourceId: string | null;
  counterpartyName: string | null;
  reference: string | null;
  amount: string;
  currency: string;
  memo: string | null;
  createdAt: string;
}

export interface BankDepositBatch {
  id: string;
  organizationId: string;
  bankAccountProfileId: string;
  depositDate: string;
  currency: string;
  status: BankDepositBatchStatus;
  memo: string | null;
  totalAmount: string;
  postedJournalEntryId: string | null;
  statementTransactionId: string | null;
  createdById: string | null;
  updatedById: string | null;
  postedAt: string | null;
  matchedAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  bankAccountProfile?: Pick<BankAccountProfile, "id" | "displayName" | "currency" | "status" | "accountId" | "account">;
  statementTransaction?: Pick<
    BankStatementTransaction,
    "id" | "transactionDate" | "description" | "reference" | "type" | "amount" | "status" | "matchType"
  > | null;
  createdBy?: { id: string; name: string; email: string } | null;
  updatedBy?: { id: string; name: string; email: string } | null;
  postedJournalEntry?: { id: string; entryNumber: string; status: JournalStatus } | null;
  lines: BankDepositBatchLine[];
}

export interface CardSettlement {
  id: string;
  organizationId: string;
  settlementType: CardSettlementType;
  fundingBankAccountProfileId: string | null;
  cardAccountProfileId: string;
  settlementDate: string;
  currency: string;
  amount: string;
  status: CardSettlementStatus;
  memo: string | null;
  reference: string | null;
  postedJournalEntryId: string | null;
  statementTransactionId: string | null;
  createdById: string | null;
  updatedById: string | null;
  postedAt: string | null;
  matchedAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fundingBankAccountProfile?: Pick<BankAccountProfile, "id" | "displayName" | "type" | "status" | "currency" | "accountId" | "account"> | null;
  cardAccountProfile?: Pick<BankAccountProfile, "id" | "displayName" | "type" | "status" | "currency" | "accountId" | "account">;
  statementTransaction?: Pick<
    BankStatementTransaction,
    "id" | "bankAccountProfileId" | "transactionDate" | "description" | "reference" | "type" | "amount" | "status" | "matchType"
  > | null;
  createdBy?: { id: string; name: string; email: string } | null;
  updatedBy?: { id: string; name: string; email: string } | null;
  postedJournalEntry?: { id: string; entryNumber: string; status: JournalStatus } | null;
}

export interface ChequeInstrument {
  id: string;
  organizationId: string;
  chequeType: ChequeInstrumentType;
  status: ChequeInstrumentStatus;
  bankAccountProfileId: string | null;
  depositBatchId: string | null;
  statementTransactionId: string | null;
  counterpartyType: ChequeCounterpartyType | null;
  counterpartyId: string | null;
  counterpartyName: string;
  chequeNumber: string;
  drawerBankName: string | null;
  payeeName: string | null;
  issueDate: string | null;
  receivedDate: string | null;
  dueDate: string | null;
  depositDate: string | null;
  clearedDate: string | null;
  bouncedDate: string | null;
  voidedDate: string | null;
  amount: string;
  currency: string;
  reference: string | null;
  memo: string | null;
  bounceReason: string | null;
  voidReason: string | null;
  postedJournalEntryId: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  bankAccountProfile?: Pick<BankAccountProfile, "id" | "displayName" | "type" | "status" | "currency" | "accountId" | "account"> | null;
  depositBatch?: Pick<BankDepositBatch, "id" | "depositDate" | "status" | "totalAmount" | "bankAccountProfileId"> | null;
  statementTransaction?: Pick<
    BankStatementTransaction,
    "id" | "bankAccountProfileId" | "transactionDate" | "description" | "reference" | "type" | "amount" | "status" | "matchType"
  > | null;
  createdBy?: { id: string; name: string; email: string } | null;
  updatedBy?: { id: string; name: string; email: string } | null;
  postedJournalEntry?: { id: string; entryNumber: string; status: JournalStatus } | null;
}

export interface BankingClearingAccountConfigAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  allowPosting: boolean;
  isActive: boolean;
}

export interface BankingClearingAccountConfig {
  id: string;
  organizationId: string;
  undepositedFundsAccountId: string | null;
  chequeInHandAccountId: string | null;
  outstandingChequesAccountId: string | null;
  cardClearingAccountId: string | null;
  creditCardLiabilityAccountId: string | null;
  prepaidCardAssetAccountId: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  undepositedFundsAccount?: BankingClearingAccountConfigAccount | null;
  chequeInHandAccount?: BankingClearingAccountConfigAccount | null;
  outstandingChequesAccount?: BankingClearingAccountConfigAccount | null;
  cardClearingAccount?: BankingClearingAccountConfigAccount | null;
  creditCardLiabilityAccount?: BankingClearingAccountConfigAccount | null;
  prepaidCardAssetAccount?: BankingClearingAccountConfigAccount | null;
  updatedBy?: { id: string; name: string; email: string } | null;
}

export interface BankingClearingAccountConfigInput {
  undepositedFundsAccountId?: string | null;
  chequeInHandAccountId?: string | null;
  outstandingChequesAccountId?: string | null;
  cardClearingAccountId?: string | null;
  creditCardLiabilityAccountId?: string | null;
  prepaidCardAssetAccountId?: string | null;
  enabled?: boolean;
}

export interface BankingClearingAccountConfigValidation {
  valid: boolean;
  enabled?: boolean;
  reasons: string[];
  warnings?: string[];
  accounts?: Array<{
    field: keyof BankingClearingAccountConfigInput;
    accountId: string | null;
    valid: boolean;
    reason: string;
    account?: BankingClearingAccountConfigAccount;
  }>;
}

export interface BankingClearingAccountConfigResponse {
  config: BankingClearingAccountConfig | null;
  validation: BankingClearingAccountConfigValidation;
  warnings: string[];
}

export interface BankingAccountingPreflight {
  status: "READY" | "BLOCKED" | "POSTED" | "OPERATIONAL_ONLY";
  ready: boolean;
  reasons: string[];
  warnings: string[];
  journalEntryId?: string | null;
  journalEntryNumber?: string | null;
  journalPreview?: {
    entryDate: string;
    description: string;
    reference: string;
    currency: string;
    totalDebit: string;
    totalCredit: string;
    lines: Array<{
      side: "DEBIT" | "CREDIT";
      accountId: string;
      accountCode: string;
      accountName: string;
      amount: string;
      description: string;
    }>;
  };
}

export interface BankDepositSourceCandidate {
  sourceType: "CUSTOMER_PAYMENT";
  sourceId: string;
  reference: string;
  counterpartyName: string;
  amount: string;
  currency: string;
  paymentDate: string;
  depositReadiness: "ALREADY_POSTED_TO_THIS_BANK_ACCOUNT" | "OPERATIONAL_GROUPING_ONLY_CLEARING_NOT_CONFIRMED";
  account: Pick<Account, "id" | "code" | "name" | "type"> & {
    bankAccountProfile?: Pick<BankAccountProfile, "id" | "type" | "displayName"> | null;
  };
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
  invalidRows?: BankStatementImportInvalidRow[];
  importSummary?: {
    sourceRowCount: number;
    importedRowCount: number;
    skippedRowCount?: number;
    invalidRowCount: number;
    duplicateInFileCount?: number;
    duplicateExistingCount?: number;
    blockedByClosedReconciliationCount?: number;
    openReconciliationOverlapCount?: number;
    currencyMismatchCount?: number;
    totalCredits: string;
    totalDebits: string;
    sourceFormat?: string;
    sourceSheetName?: string | null;
    warnings: string[];
    rowWarnings?: BankStatementImportRowWarning[];
  };
}

export type BankStatementImportWarningCode =
  | "DUPLICATE_IN_FILE"
  | "DUPLICATE_EXISTING_HIGH_CONFIDENCE"
  | "DUPLICATE_EXISTING_POSSIBLE"
  | "CLOSED_RECONCILIATION_OVERLAP"
  | "OPEN_RECONCILIATION_OVERLAP"
  | "CURRENCY_MISMATCH"
  | "PARTIAL_IMPORT_REQUIRED";

export interface BankStatementImportRowWarning {
  rowNumber: number;
  code: BankStatementImportWarningCode;
  severity: "warning" | "blocking";
  message: string;
  action: string;
}

export interface BankStatementImportSafetySummary {
  sourceRowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  importableRowCount: number;
  duplicateInFileCount: number;
  duplicateExistingHighConfidenceCount: number;
  duplicateExistingPossibleCount: number;
  duplicateExistingCount: number;
  closedReconciliationOverlapCount: number;
  openReconciliationOverlapCount: number;
  currencyMismatchCount: number;
  blockedRowCount: number;
}

export interface BankStatementImportPreviewRow {
  rowNumber: number;
  date: string;
  description: string;
  reference: string | null;
  bankReference?: string | null;
  counterparty?: string | null;
  currency?: string | null;
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
  sourceFormat?: string;
  sourceSheetName?: string | null;
  warnings: string[];
  rowWarnings?: BankStatementImportRowWarning[];
  summary?: BankStatementImportSafetySummary;
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

export interface BankRule {
  id: string;
  organizationId: string;
  bankAccountProfileId: string | null;
  name: string;
  enabled: boolean;
  priority: number;
  direction: BankRuleDirection;
  descriptionContains: string | null;
  descriptionRegex: string | null;
  referenceContains: string | null;
  bankReferenceContains: string | null;
  counterpartyContains: string | null;
  amountEquals: string | null;
  amountMin: string | null;
  amountMax: string | null;
  currencyEquals: string | null;
  sourceFormat: string | null;
  startDate: string | null;
  endDate: string | null;
  actionType: BankRuleActionType;
  categorizeAccountId: string | null;
  ignoreReason: string | null;
  autoApply: boolean;
  lastDryRunAt: string | null;
  lastAppliedAt: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  bankAccountProfile?: Pick<BankAccountProfile, "id" | "displayName" | "currency"> | null;
  categorizeAccount?: Pick<Account, "id" | "code" | "name" | "type"> | null;
}

export interface BankRuleSuggestion {
  ruleId: string;
  ruleName: string;
  priority: number;
  actionType: BankRuleActionType;
  score: number;
  autoApply: boolean;
  categorizeAccountId?: string | null;
  ignoreReason?: string | null;
  matchedReasons: string[];
}

export interface BankRuleSuggestionsResponse {
  transaction: BankStatementTransaction;
  suggestions: BankRuleSuggestion[];
}

export interface BankRuleDryRunResponse {
  rule: BankRule;
  checkedCount: number;
  suggestions: Array<{
    transaction: BankStatementTransaction;
    suggestion: BankRuleSuggestion;
  }>;
}

export interface BankRuleApplyResponse {
  transaction: BankStatementTransaction;
  suggestion: BankRuleSuggestion;
  applied: boolean;
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

export interface BankReconciliationReportCountSummary {
  count: number;
  matchedCount: number;
  journalPostedCount: number;
  operationalOnlyCount: number;
  totalAmount: string;
}

export interface BankReconciliationReportData {
  organization: {
    id: string;
    name: string;
    legalName: string | null;
    taxNumber: string | null;
    countryCode: string | null;
    baseCurrency: string;
  };
  currency: string;
  reconciliation: Pick<
    BankReconciliation,
    | "id"
    | "reconciliationNumber"
    | "status"
    | "periodStart"
    | "periodEnd"
    | "statementOpeningBalance"
    | "statementClosingBalance"
    | "ledgerClosingBalance"
    | "difference"
    | "submittedAt"
    | "approvedAt"
    | "approvalNotes"
    | "closedAt"
    | "voidedAt"
  > & {
    submittedBy?: { id: string; name: string; email: string } | null;
    approvedBy?: { id: string; name: string; email: string } | null;
    closedBy?: { id: string; name: string; email: string } | null;
    voidedBy?: { id: string; name: string; email: string } | null;
  };
  bankAccount: {
    id: string;
    displayName: string;
    currency: string;
    account: Pick<Account, "id" | "code" | "name"> | null;
  };
  items: Array<{
    id: string;
    statementTransactionId: string;
    transactionDate: string;
    description: string;
    reference: string | null;
    type: BankStatementTransactionType;
    amount: string;
    statusAtClose: BankStatementTransactionStatus;
  }>;
  summary: {
    itemCount: number;
    debitTotal: string;
    creditTotal: string;
    matchedCount: number;
    categorizedCount: number;
    ignoredCount: number;
    totalRowsCount: number;
    matchedRowsCount: number;
    categorizedRowsCount: number;
    ignoredRowsCount: number;
    unmatchedRowsCount: number;
    unreconciledRowsCount: number;
    ruleAppliedRowsCount: number;
    creditRowsCount: number;
    debitRowsCount: number;
    creditRowsTotal: string;
    debitRowsTotal: string;
    exceptionRowsCount: number;
  };
  linkedTreasurySummary: {
    depositBatches: BankReconciliationReportCountSummary;
    cardSettlements: BankReconciliationReportCountSummary;
    cheques: BankReconciliationReportCountSummary;
  };
  accountingStatusSummary: {
    clearingConfigEnabled: boolean;
    configuredAccountCount: number;
    journalPostedCount: number;
    operationalOnlyCount: number;
    missingClearingConfig: boolean;
  };
  auditTimeline: Array<{
    id: string;
    occurredAt: string;
    type: string;
    label: string;
    entityType: string;
    entityId: string;
    status?: string | null;
    actor?: { id: string; name: string | null; email: string | null } | null;
    amount?: string | null;
    reference?: string | null;
  }>;
  generatedAt: string;
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
  trackingMode?: ItemTrackingMode;
  expiryTrackingEnabled?: boolean;
  binTrackingEnabled?: boolean;
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
  batchId: string | null;
  serialNumberId: string | null;
  binLocationId: string | null;
  fromBinLocationId: string | null;
  toBinLocationId: string | null;
  description: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  item?: Pick<Item, "id" | "name" | "sku" | "type" | "status" | "inventoryTracking" | "trackingMode" | "expiryTrackingEnabled" | "binTrackingEnabled">;
  warehouse?: Pick<Warehouse, "id" | "code" | "name" | "status" | "isDefault">;
  batch?: Pick<InventoryBatch, "id" | "batchNumber" | "lotNumber" | "expiryDate" | "status"> | null;
  serialNumber?: Pick<InventorySerialNumber, "id" | "serialNumber" | "status"> | null;
  binLocation?: Pick<InventoryBinLocation, "id" | "code" | "name" | "type" | "status"> | null;
  fromBinLocation?: Pick<InventoryBinLocation, "id" | "code" | "name" | "type" | "status"> | null;
  toBinLocation?: Pick<InventoryBinLocation, "id" | "code" | "name" | "type" | "status"> | null;
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
  inventoryAssetJournalEntryId: string | null;
  inventoryAssetReversalJournalEntryId: string | null;
  inventoryAssetPostedAt: string | null;
  inventoryAssetPostedById: string | null;
  inventoryAssetReversedAt: string | null;
  inventoryAssetReversedById: string | null;
  postedAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: Pick<Contact, "id" | "name" | "displayName" | "type" | "taxNumber">;
  warehouse?: Pick<Warehouse, "id" | "code" | "name" | "status" | "isDefault">;
  purchaseOrder?: { id: string; purchaseOrderNumber: string; status: PurchaseOrderStatus; orderDate: string; total: string } | null;
  purchaseBill?: { id: string; billNumber: string; status: PurchaseBillStatus; billDate: string; total: string; inventoryPostingMode: PurchaseBillInventoryPostingMode } | null;
  lines?: PurchaseReceiptLine[];
  createdBy?: { id: string; name: string; email: string } | null;
  inventoryAssetJournalEntry?: { id: string; entryNumber: string; entryDate: string; status: string } | null;
  inventoryAssetReversalJournalEntry?: { id: string; entryNumber: string; entryDate: string; status: string } | null;
  inventoryAssetPostedBy?: { id: string; name: string; email: string } | null;
  inventoryAssetReversedBy?: { id: string; name: string; email: string } | null;
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
  cogsJournalEntry?: { id: string; entryNumber: string; entryDate: string; status: string } | null;
  cogsReversalJournalEntry?: { id: string; entryNumber: string; entryDate: string; status: string } | null;
  cogsPostedBy?: { id: string; name: string; email: string } | null;
  cogsReversedBy?: { id: string; name: string; email: string } | null;
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

export interface PurchaseReceiptMatchingStatusLine {
  lineId: string;
  item: Pick<Item, "id" | "name" | "sku" | "type" | "status" | "inventoryTracking"> | null;
  description: string;
  account?: Pick<Account, "id" | "code" | "name" | "type"> | null;
  inventoryTracking: boolean;
  sourceQuantity: string;
  orderedQuantity?: string;
  billedQuantity?: string;
  receivedQuantity: string;
  remainingQuantity: string;
  overReceivedQuantity: string;
  unitPrice: string;
  receivedValue: string;
  matchedBillValue: string;
  valueDifference: string;
  receipts: Array<{
    id: string;
    receiptNumber: string;
    receiptDate: string;
    quantity: string;
    unitCost: string | null;
    value: string | null;
    inventoryAssetJournalEntryId?: string | null;
    inventoryAssetReversalJournalEntryId?: string | null;
  }>;
}

export interface PurchaseBillReceiptMatchingStatus {
  sourceId: string;
  sourceType: "purchaseBill";
  bill: { id: string; billNumber: string; status: PurchaseBillStatus; inventoryPostingMode: PurchaseBillInventoryPostingMode };
  supplier: Pick<Contact, "id" | "name" | "displayName">;
  billTotal: string;
  receiptCount: number;
  receiptValue: string;
  status: PurchaseReceiptMatchingStatus;
  warnings: string[];
  lines: PurchaseReceiptMatchingStatusLine[];
}

export interface PurchaseOrderReceiptMatchingStatus {
  sourceId: string;
  sourceType: "purchaseOrder";
  purchaseOrder: { id: string; purchaseOrderNumber: string; status: PurchaseOrderStatus; total: string };
  supplier: Pick<Contact, "id" | "name" | "displayName">;
  convertedBill: { id: string; billNumber: string; status: PurchaseBillStatus; billDate: string; total: string } | null;
  linkedBills: Array<{ id: string; billNumber: string; status: PurchaseBillStatus; billDate: string; total: string }>;
  receiptCount: number;
  receiptValueEstimate: string;
  status: PurchaseReceiptMatchingStatus;
  warnings: string[];
  lines: PurchaseReceiptMatchingStatusLine[];
}

export type PurchaseMatchingContext = "purchaseOrder" | "purchaseBill" | "purchaseReceipt";
export type PurchaseMatchingStatusLabel =
  | "Matched"
  | "Partially matched"
  | "Not received"
  | "Not billed"
  | "Over received"
  | "Over billed"
  | "Receipt pending bill"
  | "Bill pending receipt"
  | "Review required";

export interface PurchaseMatchingDocumentRef {
  id: string;
  purchaseOrderNumber?: string;
  billNumber?: string;
  receiptNumber?: string;
  status: PurchaseOrderStatus | PurchaseBillStatus | PurchaseReceiptStatus;
  orderDate?: string;
  billDate?: string;
  receiptDate?: string;
  total?: string;
  inventoryPostingMode?: PurchaseBillInventoryPostingMode;
  purchaseOrderId?: string | null;
  purchaseBillId?: string | null;
  inventoryAssetJournalEntryId?: string | null;
  inventoryAssetReversalJournalEntryId?: string | null;
}

export interface PurchaseMatchingLineRef {
  id: string;
  billNumber?: string;
  billLineId?: string;
  receiptNumber?: string;
  receiptLineId?: string;
  status: PurchaseBillStatus | PurchaseReceiptStatus;
  quantity: string;
  unitCost?: string | null;
  href: string;
  inventoryAssetJournalEntryId?: string | null;
  inventoryAssetReversalJournalEntryId?: string | null;
}

export interface PurchaseMatchingLine {
  lineId: string;
  description: string;
  item: Pick<Item, "id" | "name" | "sku" | "inventoryTracking"> | null;
  orderedQuantity: string | null;
  billedQuantity: string;
  receivedQuantity: string;
  remainingToBill: string | null;
  remainingToReceive: string;
  overBilledQuantity: string;
  overReceivedQuantity: string;
  status: PurchaseMatchingStatusLabel;
  warnings: string[];
  bills: PurchaseMatchingLineRef[];
  receipts: PurchaseMatchingLineRef[];
}

export interface PurchaseMatchingSummary {
  readOnly: true;
  noMutation: true;
  sourceType: PurchaseMatchingContext;
  sourceId: string;
  sourceNumber: string;
  focusReceiptId?: string;
  status: PurchaseMatchingStatusLabel;
  supplier: Pick<Contact, "id" | "name" | "displayName">;
  reviewSummary: PurchaseMatchingReviewSummary | null;
  purchaseOrder: PurchaseMatchingDocumentRef | null;
  purchaseBill: PurchaseMatchingDocumentRef | null;
  purchaseReceipt: PurchaseMatchingDocumentRef | null;
  relatedBills: PurchaseMatchingDocumentRef[];
  relatedReceipts: PurchaseMatchingDocumentRef[];
  totals: {
    orderedQuantity: string;
    billedQuantity: string;
    receivedQuantity: string;
    remainingToBill: string;
    remainingToReceive: string;
    overBilledQuantity: string;
    overReceivedQuantity: string;
  };
  warnings: string[];
  lines: PurchaseMatchingLine[];
}

export type PurchaseMatchingExceptionType =
  | "OVER_BILLED"
  | "OVER_RECEIVED"
  | "NOT_RECEIVED"
  | "NOT_BILLED"
  | "PARTIALLY_MATCHED"
  | "RECEIPT_PENDING_BILL"
  | "BILL_PENDING_RECEIPT"
  | "REVIEW_REQUIRED";

export type PurchaseMatchingExceptionSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type PurchaseMatchingReviewStatus =
  | "OPEN"
  | "IN_REVIEW"
  | "WAITING_FOR_SUPPLIER"
  | "WAITING_FOR_RECEIPT"
  | "WAITING_FOR_BILL"
  | "ACCEPTED_AS_TIMING_DIFFERENCE"
  | "NEEDS_VARIANCE_REVIEW"
  | "NEEDS_RETURN_REVIEW"
  | "RESOLVED"
  | "CANCELLED";
export type PurchaseMatchingReviewReason =
  | "QUANTITY_MISMATCH"
  | "PRICE_MISMATCH"
  | "RECEIPT_MISSING"
  | "BILL_MISSING"
  | "OVER_RECEIVED"
  | "OVER_BILLED"
  | "SUPPLIER_DISPUTE"
  | "TIMING_DIFFERENCE"
  | "DATA_ENTRY_REVIEW"
  | "OTHER";

export interface PurchaseMatchingReviewSummary {
  reviewId: string;
  reviewStatus: PurchaseMatchingReviewStatus;
  reasonCode: PurchaseMatchingReviewReason | null;
  assignedTo: { id: string; name: string; email: string } | null;
  nextReviewDate: string | null;
  reviewedAt: string | null;
  reviewNoteSummary: string | null;
  purchaseReturnId: string | null;
  purchaseReturnNumber: string | null;
  purchaseReturnStatus: PurchaseReturnStatus | null;
  purchaseReturnHref: string | null;
}

export interface PurchaseMatchingReview {
  id: string;
  organizationId: string;
  supplierId: string | null;
  supplier: Pick<Contact, "id" | "name" | "displayName"> | null;
  sourceType: PurchaseMatchingContext;
  sourceId: string;
  sourceHref: string;
  exceptionType: PurchaseMatchingExceptionType;
  severity: PurchaseMatchingExceptionSeverity;
  status: PurchaseMatchingReviewStatus;
  reasonCode: PurchaseMatchingReviewReason | null;
  assignedTo: { id: string; name: string; email: string } | null;
  reviewedBy: { id: string; name: string; email: string } | null;
  reviewedAt: string | null;
  nextReviewDate: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  purchaseReturn?: { id: string; purchaseReturnNumber: string; status: PurchaseReturnStatus } | null;
  reviewOnly: true;
  noPostingEffect: true;
}

export interface PurchaseMatchingExceptionLink {
  id: string;
  number: string;
  href: string;
}

export interface PurchaseMatchingExceptionItem {
  id: string;
  supplierId: string;
  supplierName: string;
  sourceType: PurchaseMatchingContext;
  sourceId: string;
  sourceNumber: string;
  sourceHref: string;
  purchaseOrderId: string | null;
  purchaseOrderNumber: string | null;
  purchaseOrderHref: string | null;
  purchaseBillId: string | null;
  purchaseBillNumber: string | null;
  purchaseBillHref: string | null;
  purchaseReceiptId: string | null;
  purchaseReceiptNumber: string | null;
  purchaseReceiptHref: string | null;
  relatedBills: PurchaseMatchingExceptionLink[];
  relatedReceipts: PurchaseMatchingExceptionLink[];
  itemName: string | null;
  lineDescription: string;
  orderedQuantity: string | null;
  billedQuantity: string;
  receivedQuantity: string;
  remainingToBill: string | null;
  remainingToReceive: string;
  overBilledQuantity: string;
  overReceivedQuantity: string;
  exceptionType: PurchaseMatchingExceptionType;
  exceptionLabel: PurchaseMatchingStatusLabel;
  severity: PurchaseMatchingExceptionSeverity;
  reviewId: string | null;
  reviewStatus: PurchaseMatchingReviewStatus | null;
  reasonCode: PurchaseMatchingReviewReason | null;
  assignedTo: { id: string; name: string; email: string } | null;
  nextReviewDate: string | null;
  reviewedAt: string | null;
  reviewNoteSummary: string | null;
  purchaseReturnId?: string | null;
  purchaseReturnNumber?: string | null;
  purchaseReturnStatus?: PurchaseReturnStatus | null;
  purchaseReturnHref?: string | null;
  latestRelevantDate: string | null;
  warnings: string[];
}

export interface PurchaseMatchingExceptionSupplierGroup {
  supplierId: string;
  supplierName: string;
  totalExceptionCount: number;
  highestSeverity: PurchaseMatchingExceptionSeverity;
  outstandingReviewCount: number;
  items: PurchaseMatchingExceptionItem[];
}

export interface PurchaseMatchingExceptionSummaryCounts {
  totalExceptionCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  suppliersWithExceptions: number;
  overBilledCount: number;
  overReceivedCount: number;
  billPendingReceiptCount: number;
  receiptPendingBillCount: number;
  partiallyMatchedCount: number;
  notReceivedCount: number;
  notBilledCount: number;
  reviewRequiredCount: number;
}

export interface PurchaseMatchingExceptionsResponse {
  readOnly: true;
  noMutation: true;
  filters: {
    supplierId?: string;
    severity?: PurchaseMatchingExceptionSeverity;
    exceptionType?: PurchaseMatchingExceptionType;
    sourceType?: PurchaseMatchingContext;
    reviewStatus?: PurchaseMatchingReviewStatus | "NONE";
    reasonCode?: PurchaseMatchingReviewReason;
    search?: string;
    limit: number;
  };
  summary: PurchaseMatchingExceptionSummaryCounts;
  groups: PurchaseMatchingExceptionSupplierGroup[];
  items: PurchaseMatchingExceptionItem[];
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
  enableInventoryAccounting: boolean;
  inventoryAssetAccountId: string | null;
  cogsAccountId: string | null;
  inventoryClearingAccountId: string | null;
  inventoryAdjustmentGainAccountId: string | null;
  inventoryAdjustmentLossAccountId: string | null;
  purchaseReceiptPostingMode: InventoryPurchasePostingMode;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryAccountingSettings extends InventorySettings {
  accounts: {
    inventoryAsset: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive"> | null;
    cogs: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive"> | null;
    inventoryClearing: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive"> | null;
    adjustmentGain: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive"> | null;
    adjustmentLoss: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive"> | null;
  };
  canEnableInventoryAccounting: boolean;
  previewOnly: true;
  noAutomaticPosting: true;
  blockingReasons: string[];
}

export interface PurchaseReceiptPostingReadiness {
  ready: boolean;
  canEnablePosting: boolean;
  blockingReasons: string[];
  warnings: string[];
  requiredAccounts: {
    inventoryAssetAccount: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive"> | null;
    inventoryClearingAccount: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive"> | null;
  };
  compatibleBillPostingModeExists: boolean;
  existingBillsInDirectModeCount: number;
  billsUsingInventoryClearingCount: number;
  recommendedNextStep: string;
}

export interface InventoryAccountingPreviewJournalLine {
  lineNumber: number;
  side: "DEBIT" | "CREDIT";
  accountId: string | null;
  accountCode: string | null;
  accountName: string;
  amount: string;
  description: string;
}

export interface InventoryAccountingPreviewJournal {
  description: string;
  entryDate: string;
  totalDebit: string;
  totalCredit: string;
  lines: InventoryAccountingPreviewJournalLine[];
}

export interface InventoryAccountingPreviewBase {
  sourceType: "PurchaseReceipt" | "SalesStockIssue";
  sourceId: string;
  sourceNumber: string;
  previewOnly: true;
  postingStatus: "DESIGN_ONLY" | "POSTABLE" | "POSTED" | "REVERSED";
  canPost: boolean;
  canPostReason: string;
  valuationMethod: InventoryValuationMethod;
  blockingReasons: string[];
  warnings: string[];
  journal: InventoryAccountingPreviewJournal;
}

export interface PurchaseBillAccountingPreview {
  sourceType: "PurchaseBill";
  sourceId: string;
  sourceNumber: string;
  previewOnly: true;
  inventoryPostingMode: PurchaseBillInventoryPostingMode;
  canFinalize: boolean;
  canUseInventoryClearingMode: boolean;
  blockingReasons: string[];
  warnings: string[];
  inventoryTrackedLineCount: number;
  directLineCount: number;
  clearingAccount: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive"> | null;
  vatReceivableAccount: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive"> | null;
  accountsPayableAccount: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive"> | null;
  journal: InventoryAccountingPreviewJournal;
  journalPreview: InventoryAccountingPreviewJournalLine[];
}

export interface PurchaseReceiptAccountingPreviewLine {
  lineId: string;
  item: Pick<Item, "id" | "name" | "sku" | "type" | "status" | "inventoryTracking"> | null;
  quantity: string;
  unitCost: string | null;
  lineValue: string | null;
  matchedQuantity: string;
  unmatchedQuantity: string;
  matchedBillValue: string | null;
  valueDifference: string | null;
  sourceBillLineId: string | null;
  warnings: string[];
}

export interface PurchaseReceiptAccountingPreview extends InventoryAccountingPreviewBase {
  sourceType: "PurchaseReceipt";
  alreadyPosted: boolean;
  alreadyReversed: boolean;
  journalEntryId: string | null;
  reversalJournalEntryId: string | null;
  linkedBill: {
    id: string;
    billNumber: string;
    status: PurchaseBillStatus;
    inventoryPostingMode: PurchaseBillInventoryPostingMode;
  } | null;
  postingMode: InventoryPurchasePostingMode;
  receiptValue: string;
  matchedBillValue: string;
  unmatchedReceiptValue: string;
  valueDifference: string;
  journalPreview: InventoryAccountingPreviewJournalLine[];
  matchingSummary: {
    sourceType: "purchaseOrder" | "purchaseBill" | "standalone";
    sourceId: string | null;
    receiptLines: PurchaseReceiptAccountingPreviewLine[];
    billLines: Array<{
      lineId: string;
      description: string;
      account: Pick<Account, "id" | "code" | "name" | "type">;
      billedQuantity: string;
      unitPrice: string;
      matchedQuantity: string;
      matchedValue: string;
    }>;
    matchedQuantity: string;
    unmatchedQuantity: string;
    valueDifference: string;
  };
  lines: PurchaseReceiptAccountingPreviewLine[];
}

export interface SalesStockIssueAccountingPreviewLine {
  lineId: string;
  item: Pick<Item, "id" | "name" | "sku" | "type" | "status" | "inventoryTracking"> | null;
  quantity: string;
  estimatedUnitCost: string | null;
  estimatedCOGS: string | null;
  warnings: string[];
}

export interface SalesStockIssueAccountingPreview extends InventoryAccountingPreviewBase {
  sourceType: "SalesStockIssue";
  alreadyPosted: boolean;
  alreadyReversed: boolean;
  journalEntryId: string | null;
  reversalJournalEntryId: string | null;
  lines: SalesStockIssueAccountingPreviewLine[];
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

export type InventoryFifoPreviewWarningType =
  | "MISSING_UNIT_COST"
  | "NEGATIVE_LAYER_QUANTITY"
  | "INSUFFICIENT_LAYER_QUANTITY"
  | "UNSUPPORTED_TRANSFER_SHAPE"
  | "UNTRACEABLE_PURCHASE_RETURN_COST"
  | "UNTRACEABLE_SALES_RETURN_COST"
  | "MIXED_WAREHOUSE_SCOPE"
  | "NO_MOVEMENTS"
  | "PREVIEW_ONLY_NOT_ACCOUNTING_METHOD";

export interface InventoryFifoPreviewWarning {
  type: InventoryFifoPreviewWarningType;
  severity: "WARNING" | "BLOCKER";
  message: string;
  movementId: string | null;
  itemId: string | null;
  warehouseId: string | null;
}

export interface InventoryFifoPreviewMovementSummary {
  movementId: string;
  movementDate: string;
  type: StockMovementType;
  quantity: string;
  unitCost: string | null;
  totalCost: string | null;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
}

export interface InventoryFifoPreviewSourceDocument {
  type: string;
  id: string;
  href: string | null;
}

export interface InventoryFifoPreviewLayer {
  layerId: string;
  sourceMovementId: string;
  layerDate: string;
  sourceMovement: InventoryFifoPreviewMovementSummary;
  sourceDocument: InventoryFifoPreviewSourceDocument | null;
  originalQuantity: string;
  consumedQuantity: string;
  remainingQuantity: string;
  unitCost: string | null;
  layerValue: string | null;
  warnings: InventoryFifoPreviewWarning[];
}

export interface InventoryFifoPreviewConsumedLayer {
  layerId: string;
  sourceMovementId: string;
  consumedQuantity: string;
  unitCost: string | null;
  cost: string | null;
}

export interface InventoryFifoPreviewConsumedMovement {
  movementId: string;
  movementDate: string;
  type: StockMovementType;
  sourceMovement: InventoryFifoPreviewMovementSummary;
  sourceDocument: InventoryFifoPreviewSourceDocument | null;
  consumedQuantity: string;
  consumedLayers: InventoryFifoPreviewConsumedLayer[];
  estimatedCost: string | null;
  warnings: InventoryFifoPreviewWarning[];
  blockers: InventoryFifoPreviewWarning[];
}

export interface InventoryFifoPreviewRow {
  item: InventoryReportItem;
  warehouse: Pick<Warehouse, "id" | "code" | "name" | "status" | "isDefault">;
  layers: InventoryFifoPreviewLayer[];
  consumedMovements: InventoryFifoPreviewConsumedMovement[];
  warnings: InventoryFifoPreviewWarning[];
  blockers: InventoryFifoPreviewWarning[];
  totalOnHandQuantity: string;
  fifoPreviewValue: string | null;
  currentOperationalValuationValue: string | null;
  differenceFromCurrentOperationalValuation: string | null;
}

export interface InventoryFifoPreviewResponse {
  readOnly: true;
  previewOnly: true;
  noMutation: true;
  noPostingEffect: true;
  noInventoryEffect: true;
  noApEffect: true;
  noArEffect: true;
  noVatEffect: true;
  noZatcaEffect: true;
  noFinancialStatementEffect: true;
  generatedAt: string;
  asOfDate: string;
  activeValuationMethod: {
    method: InventoryValuationMethod;
    note: string;
  };
  previewValuationMethod: "FIFO_PREVIEW";
  filters: {
    itemId: string | null;
    warehouseId: string | null;
  };
  rows: InventoryFifoPreviewRow[];
  warnings: InventoryFifoPreviewWarning[];
  blockers: InventoryFifoPreviewWarning[];
  totals: {
    totalOnHandQuantity: string;
    fifoPreviewValue: string | null;
    currentOperationalValuationValue: string | null;
    differenceFromCurrentOperationalValuation: string | null;
    warningCount: number;
    blockerCount: number;
  };
}

export interface InventoryBinLocation {
  id: string;
  organizationId: string;
  warehouseId: string;
  code: string;
  name: string;
  type: InventoryBinLocationType;
  status: InventoryBinLocationStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  warehouse?: Pick<Warehouse, "id" | "code" | "name" | "status"> | null;
}

export interface InventoryBatch {
  id: string;
  organizationId: string;
  itemId: string;
  batchNumber: string;
  lotNumber: string | null;
  manufactureDate: string | null;
  expiryDate: string | null;
  status: InventoryBatchStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  item?: Pick<Item, "id" | "name" | "sku" | "inventoryTracking" | "trackingMode" | "expiryTrackingEnabled" | "binTrackingEnabled"> | null;
}

export interface InventorySerialNumber {
  id: string;
  organizationId: string;
  itemId: string;
  serialNumber: string;
  batchId: string | null;
  status: InventorySerialNumberStatus;
  currentWarehouseId: string | null;
  currentBinLocationId: string | null;
  lastMovementId: string | null;
  createdAt: string;
  updatedAt: string;
  item?: Pick<Item, "id" | "name" | "sku" | "inventoryTracking" | "trackingMode" | "expiryTrackingEnabled" | "binTrackingEnabled"> | null;
  batch?: Pick<InventoryBatch, "id" | "batchNumber" | "lotNumber" | "expiryDate" | "status"> | null;
  currentWarehouse?: Pick<Warehouse, "id" | "code" | "name" | "status"> | null;
  currentBinLocation?: Pick<InventoryBinLocation, "id" | "code" | "name" | "type" | "status" | "warehouseId"> | null;
  lastMovement?: Pick<StockMovement, "id" | "type" | "movementDate" | "quantity" | "warehouseId"> | null;
}

export interface InventoryTraceabilityMovement {
  id: string;
  movementDate: string;
  type: StockMovementType;
  quantity: string;
  warehouseId: string;
  batchId: string | null;
  serialNumberId: string | null;
  binLocationId: string | null;
  fromBinLocationId: string | null;
  toBinLocationId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  warehouse?: Pick<Warehouse, "id" | "code" | "name"> | null;
  batch?: Pick<InventoryBatch, "id" | "batchNumber" | "lotNumber" | "expiryDate" | "status"> | null;
  serialNumber?: Pick<InventorySerialNumber, "id" | "serialNumber" | "status"> | null;
  binLocation?: Pick<InventoryBinLocation, "id" | "code" | "name" | "type"> | null;
  fromBinLocation?: Pick<InventoryBinLocation, "id" | "code" | "name" | "type"> | null;
  toBinLocation?: Pick<InventoryBinLocation, "id" | "code" | "name" | "type"> | null;
}

export interface InventoryTraceabilityResponse {
  item: Pick<Item, "id" | "name" | "sku" | "type" | "status" | "inventoryTracking" | "trackingMode" | "expiryTrackingEnabled" | "binTrackingEnabled">;
  trackingMode: ItemTrackingMode;
  expiryTrackingEnabled: boolean;
  binTrackingEnabled: boolean;
  hasStockMovements: boolean;
  movementCount: number;
  batches: InventoryBatch[];
  serialNumbers: InventorySerialNumber[];
  warehouses: Array<Pick<Warehouse, "id" | "code" | "name" | "status">>;
  binLocations: InventoryBinLocation[];
  movements: InventoryTraceabilityMovement[];
  warnings: string[];
  readOnly: true;
  noMutation: true;
  noPostingEffect: true;
  noInventoryValuationEffect: true;
  noFifoActivation: true;
  noCogsEffect: true;
  noApEffect: true;
  noArEffect: true;
  noVatEffect: true;
  noZatcaEffect: true;
  noFinancialStatementEffect: true;
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

export type InventoryClearingReportStatus =
  | "MATCHED"
  | "PARTIAL"
  | "VARIANCE"
  | "BILL_WITHOUT_RECEIPT_POSTING"
  | "RECEIPT_WITHOUT_CLEARING_BILL"
  | "DIRECT_MODE_EXCLUDED";

export interface InventoryClearingReceiptSummary {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  status: PurchaseReceiptStatus;
  receiptValue: string;
  activeClearingCredit: string;
  inventoryAssetJournalEntryId: string | null;
  inventoryAssetReversalJournalEntryId: string | null;
  assetPostingStatus: "NOT_POSTED" | "POSTED" | "REVERSED";
  warnings: string[];
}

export interface InventoryClearingReconciliationRow {
  status: InventoryClearingReportStatus;
  purchaseBill: {
    id: string;
    billNumber: string;
    status: PurchaseBillStatus;
    inventoryPostingMode: PurchaseBillInventoryPostingMode;
    billDate: string;
    total: string;
    currency: string;
    journalEntryId: string | null;
  } | null;
  supplier: Pick<Contact, "id" | "name" | "displayName"> | null;
  billDate: string | null;
  billClearingDebit: string;
  receiptClearingCredit: string;
  netClearingDifference: string;
  billedQuantity: string;
  receivedQuantity: string;
  matchedQuantity: string;
  unmatchedQuantity: string;
  vatAmount: string;
  apAmount: string;
  journalEntryId: string | null;
  receipts: InventoryClearingReceiptSummary[];
  lines: Array<{
    lineId: string;
    item: Pick<Item, "id" | "name" | "sku" | "type" | "status" | "inventoryTracking"> | null;
    description: string;
    billedQuantity: string;
    unitPrice: string;
    billClearingDebit: string;
    receivedQuantity: string;
    postedReceiptValue: string;
    valueDifference: string;
  }>;
  warnings: string[];
}

export interface InventoryClearingReconciliationReport {
  generatedAt: string;
  from: string | null;
  to: string | null;
  supplierId: string | null;
  purchaseBillId: string | null;
  purchaseReceiptId: string | null;
  status: InventoryClearingReportStatus | null;
  clearingAccount: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive"> | null;
  clearingAccountPeriodDebit: string;
  clearingAccountPeriodCredit: string;
  clearingAccountBalance: string;
  reportComputedOpenDifference: string;
  differenceBetweenGLAndReport: string;
  warnings: string[];
  summary: {
    rowCount: number;
    matchedCount: number;
    partialCount: number;
    varianceCount: number;
    billWithoutReceiptPostingCount: number;
    receiptWithoutClearingBillCount: number;
    directModeExcludedCount: number;
    billClearingDebit: string;
    receiptClearingCredit: string;
    netClearingDifference: string;
  };
  rows: InventoryClearingReconciliationRow[];
}

export interface InventoryClearingVarianceRow {
  status: InventoryClearingReportStatus;
  purchaseBill: InventoryClearingReconciliationRow["purchaseBill"];
  receipt: InventoryClearingReceiptSummary | null;
  supplier: Pick<Contact, "id" | "name" | "displayName"> | null;
  varianceAmount: string;
  varianceReason: string;
  recommendedAction: string;
  warnings: string[];
}

export interface InventoryClearingVarianceReport {
  generatedAt: string;
  from: string | null;
  to: string | null;
  supplierId: string | null;
  purchaseBillId: string | null;
  purchaseReceiptId: string | null;
  status: InventoryClearingReportStatus | null;
  clearingAccount: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive"> | null;
  clearingAccountBalance: string;
  summary: {
    rowCount: number;
    totalVarianceAmount: string;
  };
  warnings: string[];
  rows: InventoryClearingVarianceRow[];
}

export interface InventoryValuationVarianceSourceLink {
  type: InventoryValuationVarianceSourceType;
  id: string;
  number: string;
  href: string;
}

export interface InventoryValuationVarianceDocument {
  id: string;
  number: string;
  status: string;
  date: string | null;
  href: string;
  inventoryPostingMode?: PurchaseBillInventoryPostingMode;
}

export interface InventoryValuationVariancePreviewItem {
  id: string;
  supplier: Pick<Contact, "id" | "name" | "displayName">;
  item: Pick<Item, "id" | "name" | "sku" | "inventoryTracking"> | null;
  lineDescription: string;
  purchaseOrder: InventoryValuationVarianceDocument | null;
  purchaseBill: InventoryValuationVarianceDocument | null;
  purchaseReceipt: InventoryValuationVarianceDocument | null;
  purchaseReturn: {
    id: string;
    purchaseReturnNumber: string;
    status: PurchaseReturnStatus;
    returnDate: string;
    href: string;
  } | null;
  matchingReview: {
    id: string;
    sourceType: string;
    sourceId: string;
    exceptionType: string;
    severity: string;
    status: PurchaseMatchingReviewStatus;
    reasonCode: PurchaseMatchingReviewReason | null;
    href: string;
  } | null;
  sourceType: InventoryValuationVarianceSourceType;
  sourceId: string;
  sourceNumber: string;
  sourceHref: string;
  sourceDocumentLinks: InventoryValuationVarianceSourceLink[];
  orderedQuantity: string | null;
  receivedQuantity: string;
  billedQuantity: string;
  returnedQuantity: string;
  receiptUnitCost: string | null;
  billUnitCost: string | null;
  expectedValue: string;
  receivedValue: string;
  billedValue: string;
  returnedValue: string;
  varianceQuantity: string;
  varianceAmount: string;
  varianceType: InventoryValuationVarianceType;
  severity: InventoryValuationVarianceSeverity;
  status: InventoryValuationVarianceStatus;
  suggestedReviewAction: string;
  warnings: string[];
  returnRelated: boolean;
  matchingReviewRelated: boolean;
  latestRelevantDate: string | null;
}

export interface InventoryValuationVariancePreviewSummary {
  totalVarianceCount: number;
  totalAbsoluteVarianceAmount: string;
  positiveVarianceAmount: string;
  negativeVarianceAmount: string;
  criticalCount: number;
  highCount: number;
  suppliersAffected: number;
  itemsAffected: number;
  returnRelatedVarianceCount: number;
  matchingReviewRelatedVarianceCount: number;
}

export interface InventoryValuationVarianceSupplierGroup {
  supplierId: string;
  supplierName: string;
  totalVarianceAmount: string;
  varianceCount: number;
  highestSeverity: InventoryValuationVarianceSeverity;
  itemsAffected: number;
  sourceDocumentLinks: InventoryValuationVarianceSourceLink[];
  items: InventoryValuationVariancePreviewItem[];
}

export interface InventoryValuationVariancePreviewResponse {
  readOnly: true;
  previewOnly: true;
  noMutation: true;
  noPostingEffect: true;
  noInventoryEffect: true;
  generatedAt: string;
  filters: {
    supplierId?: string;
    itemId?: string;
    varianceType?: InventoryValuationVarianceType;
    severity?: InventoryValuationVarianceSeverity;
    sourceType?: InventoryValuationVarianceSourceType;
    from?: string;
    to?: string;
    search?: string;
    purchaseReceiptId?: string;
    purchaseBillId?: string;
    matchingReviewId?: string;
    limit: number;
  };
  summary: InventoryValuationVariancePreviewSummary;
  supplierGroups: InventoryValuationVarianceSupplierGroup[];
  items: InventoryValuationVariancePreviewItem[];
  warnings: string[];
}

export interface LandedCostSourceSummary {
  sourceType: LandedCostSourceType;
  sourceId: string;
  sourceNumber: string;
  supplier: Pick<Contact, "id" | "name" | "displayName">;
  date: string;
  currency: string;
}

export interface LandedCostBaseLine {
  sourceLineId: string;
  itemId: string;
  itemName: string;
  itemSku: string | null;
  quantity: string;
  returnedQuantity: string;
  baseUnitCost: string;
  baseLineValue: string;
  warnings: string[];
}

export interface LandedCostPreviewCostLine {
  category: LandedCostCategory;
  description: string | null;
  amount: string;
  currency: string | null;
  supplierId: string | null;
}

export interface LandedCostLineAllocation {
  sourceLineId: string;
  allocatedLandedCost: string;
  landedUnitCostIncrease: string;
  previewLandedUnitCost: string;
  previewLandedLineValue: string;
  allocationPercent: string;
}

export interface LandedCostPreviewResponse {
  readOnly: true;
  previewOnly: true;
  noMutation: true;
  noPostingEffect: true;
  noInventoryEffect: true;
  noApEffect: true;
  noVatEffect: true;
  noZatcaEffect: true;
  noEmailEffect: true;
  generatedAt: string;
  source: LandedCostSourceSummary | null;
  allocationMethod: LandedCostAllocationMethod;
  baseLines: LandedCostBaseLine[];
  costLines: LandedCostPreviewCostLine[];
  allocation: LandedCostLineAllocation[];
  totals: {
    baseInventoryValue: string;
    totalLandedCosts: string;
    previewLandedInventoryValue: string;
  };
  blockers: string[];
  warnings: string[];
}

export interface InventoryVarianceProposal {
  id: string;
  organizationId: string;
  proposalNumber: string;
  sourceType: InventoryVarianceProposalSourceType;
  reason: InventoryVarianceReason;
  status: InventoryVarianceProposalStatus;
  purchaseBillId: string | null;
  purchaseReceiptId: string | null;
  supplierId: string | null;
  proposalDate: string;
  amount: string;
  description: string | null;
  debitAccountId: string;
  creditAccountId: string;
  createdById: string | null;
  submittedById: string | null;
  approvedById: string | null;
  postedById: string | null;
  reversedById: string | null;
  voidedById: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  postedAt: string | null;
  reversedAt: string | null;
  voidedAt: string | null;
  journalEntryId: string | null;
  reversalJournalEntryId: string | null;
  approvalNotes: string | null;
  reversalReason: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
  purchaseBill?: Pick<PurchaseBill, "id" | "billNumber" | "billDate" | "status" | "inventoryPostingMode" | "total" | "currency"> | null;
  purchaseReceipt?: Pick<PurchaseReceipt, "id" | "receiptNumber" | "receiptDate" | "status" | "inventoryAssetJournalEntryId" | "inventoryAssetReversalJournalEntryId"> | null;
  supplier?: Pick<Contact, "id" | "name" | "displayName"> | null;
  debitAccount?: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive">;
  creditAccount?: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive">;
  journalEntry?: { id: string; entryNumber: string; entryDate: string; status: JournalStatus } | null;
  reversalJournalEntry?: { id: string; entryNumber: string; entryDate: string; status: JournalStatus } | null;
  createdBy?: { id: string; name: string; email: string } | null;
  submittedBy?: { id: string; name: string; email: string } | null;
  approvedBy?: { id: string; name: string; email: string } | null;
  postedBy?: { id: string; name: string; email: string } | null;
  reversedBy?: { id: string; name: string; email: string } | null;
  voidedBy?: { id: string; name: string; email: string } | null;
}

export interface InventoryVarianceProposalEvent {
  id: string;
  organizationId: string;
  proposalId: string;
  actorUserId: string | null;
  action: InventoryVarianceProposalAction;
  fromStatus: InventoryVarianceProposalStatus | null;
  toStatus: InventoryVarianceProposalStatus;
  notes: string | null;
  createdAt: string;
  actorUser?: { id: string; name: string; email: string } | null;
}

export interface InventoryVarianceProposalAccountingPreview {
  sourceType: "InventoryVarianceProposal";
  sourceId: string;
  sourceNumber: string;
  previewOnly: true;
  status: InventoryVarianceProposalStatus;
  canPost: boolean;
  blockingReasons: string[];
  warnings: string[];
  amount: string;
  debitAccount: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive">;
  creditAccount: Pick<Account, "id" | "code" | "name" | "type" | "allowPosting" | "isActive">;
  purchaseBill: InventoryVarianceProposal["purchaseBill"];
  purchaseReceipt: InventoryVarianceProposal["purchaseReceipt"];
  journalEntryId: string | null;
  reversalJournalEntryId: string | null;
  journal: InventoryAccountingPreviewJournal;
  journalLines: InventoryAccountingPreviewJournalLine[];
}

export interface Contact {
  id: string;
  organizationId?: string;
  type: ContactType;
  name: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  taxNumber: string | null;
  legalName?: string | null;
  uaeTrn?: string | null;
  uaeTin?: string | null;
  uaeVatRegistrationStatus?: string | null;
  uaeAddressLine1?: string | null;
  uaeAddressLine2?: string | null;
  uaeEmirate?: string | null;
  peppolParticipantId?: string | null;
  peppolEndpointStatus?: string | null;
  preferredEinvoiceDeliveryMethod?: string | null;
  identificationType: ContactIdentificationType | null;
  identificationNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  buildingNumber: string | null;
  district: string | null;
  city: string | null;
  postalCode: string | null;
  countryCode: string;
  isActive: boolean;
}

export type PartyTransactionSourceType =
  | "SalesInvoice"
  | "SalesQuote"
  | "RecurringInvoiceTemplate"
  | "DeliveryNote"
  | "SalesInventoryReturn"
  | "CreditNote"
  | "CustomerPayment"
  | "CustomerRefund"
  | "PurchaseBill"
  | "PurchaseOrder"
  | "PurchaseDebitNote"
  | "PurchaseReturn"
  | "SupplierPayment"
  | "SupplierRefund"
  | "CashExpense";

export interface PartyTransaction {
  id: string;
  sourceType: PartyTransactionSourceType;
  sourceId: string;
  date: string;
  dueDate: string | null;
  type: string;
  transactionNumber: string;
  currency: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  balanceDue: string;
  status: string;
}

export interface SupplierApDashboardPermissionSnapshot {
  canViewSuppliers: boolean;
  canViewPurchaseBills: boolean;
  canViewPurchaseOrders: boolean;
  canViewPurchaseReceiving: boolean;
  canViewPurchaseMatching: boolean;
  canViewInventoryValuation: boolean;
  canViewSupplierPayments: boolean;
  canViewPurchaseDebitNotes: boolean;
  canViewSupplierRefunds: boolean;
}

export interface SupplierApTopSupplier {
  supplierId: string;
  supplierName: string;
  href: string | null;
  amount?: string;
  overdueAmount?: string;
  openBillCount?: number;
  exceptionCount?: number;
  highestSeverity?: string;
  openReturnCount?: number;
  variancePreviewCount?: number;
  variancePreviewTotal?: string;
}

export interface SupplierApBillAttentionItem {
  id: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  supplierHref: string | null;
  href: string | null;
  dueDate: string | null;
  balanceDue: string;
  currency: string;
  dueStatus: "OVERDUE" | "DUE_SOON";
  attentionCategory: "Bills overdue" | "Bills due soon";
}

export interface SupplierApMatchingAttentionItem {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierHref: string | null;
  sourceType: string;
  sourceId: string;
  sourceNumber: string;
  sourceHref: string | null;
  exceptionType: string;
  severity: string;
  reviewStatus: string | null;
  attentionCategory: "Matching exceptions critical/high" | "Matching reviews open or waiting";
}

export interface SupplierApReturnAttentionItem {
  id: string;
  purchaseReturnNumber: string;
  supplierId: string;
  supplierName: string;
  supplierHref: string | null;
  href: string | null;
  status: string;
  returnDate: string;
  reason: string | null;
  inventoryMovementStatus: "NOT_POSTED" | "POSTED";
  inventoryReturnPostedAt: string | null;
  attentionCategory: "Purchase returns awaiting approval/completion" | "Purchase returns awaiting inventory movement";
  nonPosting: true;
}

export interface SupplierApVarianceAttentionItem {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierHref: string | null;
  sourceType: string;
  sourceId: string;
  sourceNumber: string;
  sourceHref: string | null;
  varianceType: string;
  severity: string;
  varianceAmount: string;
  attentionCategory: "Valuation variance previews needing review";
  nonPosting: true;
}

export interface SupplierApRecentActivityItem {
  id: string;
  sourceType: string;
  sourceId: string;
  sourceNumber: string;
  supplierId: string;
  supplierName: string;
  supplierHref: string | null;
  href: string | null;
  date: string;
  status: string;
  amount: string | null;
  label: string;
  category: "financialPosting" | "operationalNonPosting";
  nonPosting: boolean;
}

export interface SupplierApAttentionPolicy {
  dueSoonDays: number;
  topRowLimit: number;
  ordering: string;
  categories: string[];
}

export interface SupplierApDashboardSummary {
  openPayablesTotal: string;
  overdueBillsTotal: string;
  openBillCount: number;
  overdueBillCount: number;
  purchaseOrdersOpenCount: number;
  purchaseReceiptsPendingBillCount: number;
  purchaseBillsPendingReceiptCount: number;
  matchingExceptionCount: number;
  matchingCriticalCount: number;
  matchingReviewOpenCount: number;
  returnsOpenCount: number;
  returnsCompletedCount: number;
  returnsAwaitingInventoryMovementCount: number;
  returnsInventoryMovementPostedCount: number;
  variancePreviewCount: number;
  variancePreviewTotal: string;
  suppliersWithOpenPayables: number;
  suppliersWithExceptions: number;
  topSuppliersByPayable: SupplierApTopSupplier[];
  topSuppliersByExceptionSeverity: SupplierApTopSupplier[];
  suppliersWithOpenReturns: SupplierApTopSupplier[];
  suppliersWithVariancePreviews: SupplierApTopSupplier[];
  upcomingDueBills: SupplierApBillAttentionItem[];
  matchingExceptionsNeedingReview: SupplierApMatchingAttentionItem[];
  purchaseReturnsAwaitingAction: SupplierApReturnAttentionItem[];
  variancePreviewsNeedingReview: SupplierApVarianceAttentionItem[];
  recentSupplierActivity: SupplierApRecentActivityItem[];
}

export interface SupplierApDashboardResponse {
  readOnly: true;
  noMutation: true;
  noPostingEffect: true;
  noInventoryEffect: true;
  generatedAt: string;
  permissions: SupplierApDashboardPermissionSnapshot;
  attentionPolicy: SupplierApAttentionPolicy;
  apSummary: SupplierApDashboardSummary;
  warnings: string[];
}

export interface SupplierApDetailSummary {
  readOnly: true;
  noMutation: true;
  noPostingEffect: true;
  noInventoryEffect: true;
  supplierId: string;
  outstandingPayableBalance: string;
  overdueBillsTotal: string;
  overdueBillCount: number;
  openPurchaseOrders: number;
  purchaseReceiptsPendingBill: number;
  purchaseBillsPendingReceipt: number;
  openPurchaseReturns: number;
  openMatchingReviews: number;
  valuationVariancePreviews: number;
  recentApActivity: SupplierApRecentActivityItem[];
  helperText: string;
}

export interface CustomerPartySummary {
  contact: Contact;
  openReceivableBalance: string;
  overdueReceivableBalance: string;
  lastTransactionDate: string | null;
}

export interface SupplierPartySummary {
  contact: Contact;
  openPayableBalance: string;
  overduePayableBalance: string;
  lastTransactionDate: string | null;
}

export interface CustomerPartyDetail extends CustomerPartySummary {
  notes: string | null;
  transactions: PartyTransaction[];
}

export interface SupplierPartyDetail extends SupplierPartySummary {
  paymentNotes: string | null;
  transactions: PartyTransaction[];
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
  item?: { id: string; name: string; sku: string | null; inventoryTracking?: boolean } | null;
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

export interface PurchaseReturnLine {
  id: string;
  organizationId: string;
  purchaseReturnId: string;
  itemId: string | null;
  description: string;
  quantity: string;
  unitCost: string | null;
  sourcePurchaseBillLineId: string | null;
  sourcePurchaseReceiptLineId: string | null;
  sourcePurchaseOrderLineId: string | null;
  stockMovementId?: string | null;
  reason: string | null;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  item?: { id: string; name: string; sku: string | null; status?: ItemStatus; inventoryTracking?: boolean } | null;
  sourcePurchaseBillLine?: { id: string; billId: string; description: string; quantity: string; unitPrice: string } | null;
  sourcePurchaseReceiptLine?: { id: string; receiptId: string; quantity: string; unitCost: string | null } | null;
  sourcePurchaseOrderLine?: { id: string; purchaseOrderId: string; description: string; quantity: string; unitPrice: string } | null;
  stockMovement?: StockMovementLink | null;
}

export interface PurchaseReturn {
  id: string;
  organizationId: string;
  supplierId: string;
  purchaseReturnNumber: string;
  status: PurchaseReturnStatus;
  returnDate: string;
  reason: string | null;
  reference: string | null;
  sourcePurchaseBillId: string | null;
  sourcePurchaseOrderId: string | null;
  sourcePurchaseReceiptId: string | null;
  sourceMatchingReviewId: string | null;
  relatedPurchaseDebitNoteId: string | null;
  relatedSupplierRefundId: string | null;
  notes: string | null;
  createdByUserId: string | null;
  approvedByUserId: string | null;
  inventoryReturnPostedByUserId?: string | null;
  approvedAt: string | null;
  completedAt: string | null;
  voidedAt: string | null;
  inventoryReturnPostedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  noPostingEffect?: true;
  noInventoryEffect?: true;
  noAutomaticInventoryEffect?: true;
  lineCount?: number;
  inventoryReturnMovementStatus?: "NOT_POSTED" | "POSTED";
  inventoryReturnMovementIds?: string[];
  inventoryReturnReversalSupported?: false;
  supplier?: { id: string; name: string; displayName: string | null; type?: ContactType; taxNumber?: string | null };
  sourcePurchaseBill?: { id: string; billNumber: string; status: PurchaseBillStatus; billDate?: string; total?: string; supplierId?: string } | null;
  sourcePurchaseOrder?: { id: string; purchaseOrderNumber: string; status: PurchaseOrderStatus; orderDate?: string; total?: string; supplierId?: string } | null;
  sourcePurchaseReceipt?: { id: string; receiptNumber: string; status: PurchaseReceiptStatus; receiptDate?: string; supplierId?: string; purchaseOrderId?: string | null; purchaseBillId?: string | null } | null;
  sourceMatchingReview?: { id: string; sourceType: string; sourceId: string; exceptionType: string; severity: string; status: PurchaseMatchingReviewStatus; reasonCode: PurchaseMatchingReviewReason | null } | null;
  relatedPurchaseDebitNote?: { id: string; debitNoteNumber: string; status: PurchaseDebitNoteStatus; total?: string; unappliedAmount?: string } | null;
  relatedSupplierRefund?: { id: string; refundNumber: string; status: SupplierRefundStatus; amountRefunded?: string } | null;
  createdBy?: { id: string; name: string; email: string } | null;
  approvedBy?: { id: string; name: string; email: string } | null;
  inventoryReturnPostedBy?: { id: string; name: string; email: string } | null;
  lines?: PurchaseReturnLine[];
}

export type PurchaseReturnInventoryMovementStatus = "NOT_POSTED" | "POSTED" | "BLOCKED";
export type PurchaseReturnInventoryMovementLineStatus = "POSTABLE" | "POSTED" | "BLOCKED" | "SKIPPED_NON_TRACKED";

export interface PurchaseReturnInventoryMovementPreviewLine {
  lineId: string;
  description: string;
  item: { id: string; name: string; sku: string | null; inventoryTracking: boolean } | null;
  warehouse: { id: string; code: string; name: string } | null;
  returnQuantity: string;
  currentOnHand: string | null;
  projectedOnHandAfterReturn: string | null;
  movementType: "PURCHASE_RETURN_OUT";
  movementRequired: boolean;
  status: PurchaseReturnInventoryMovementLineStatus;
  stockMovementId: string | null;
  sourcePurchaseReceiptLineId: string | null;
  sourcePurchaseReceiptNumber: string | null;
  blockingReasons: string[];
  warnings: string[];
}

export interface PurchaseReturnInventoryMovementPreview {
  readOnly: true;
  previewOnly: true;
  noPostingEffect: true;
  noAccountingEffect: true;
  noApEffect: true;
  noVatEffect: true;
  noValuationPosting: true;
  sourceType: "PurchaseReturn";
  sourcePurchaseReturn: { id: string; purchaseReturnNumber: string; status: PurchaseReturnStatus };
  inventoryMovementStatus: PurchaseReturnInventoryMovementStatus;
  canPost: boolean;
  alreadyPosted: boolean;
  reversalSupported: false;
  postedAt: string | null;
  movementIds: string[];
  blockingReasons: string[];
  warnings: string[];
  safeHelperText: string;
  lines: PurchaseReturnInventoryMovementPreviewLine[];
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
  inventoryPostingMode: PurchaseBillInventoryPostingMode;
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
    | "PurchaseReturn"
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

export interface CashFlowReport {
  from: string | null;
  to: string | null;
  basis: string;
  granularity: string;
  rows: Array<{
    period: string;
    inflows: string;
    outflows: string;
    netCashFlow: string;
    lineCount: number;
  }>;
  totals: {
    openingCash: string;
    inflows: string;
    outflows: string;
    netCashFlow: string;
    closingCash: string;
    accountCount: number;
    lineCount: number;
  };
  notes: string[];
}

export interface RevenueTrendReport {
  from: string | null;
  to: string | null;
  basis: string;
  granularity: string;
  rows: Array<{
    period: string;
    revenue: string;
    lineCount: number;
  }>;
  totals: {
    revenue: string;
    lineCount: number;
  };
  notes: string[];
}

export interface TopCustomersReport {
  from: string | null;
  to: string | null;
  basis: string;
  limit: number;
  rows: Array<{
    customer: { id: string; name: string; displayName: string | null };
    invoiceCount: number;
    taxableAmount: string;
    taxAmount: string;
    grossAmount: string;
    latestInvoiceDate: string | null;
  }>;
  totals: {
    customerCount: number;
    invoiceCount: number;
    taxableAmount: string;
    taxAmount: string;
    grossAmount: string;
  };
  notes: string[];
}

export interface TopProductsServicesReport {
  from: string | null;
  to: string | null;
  basis: string;
  limit: number;
  rows: Array<{
    kind: "CATALOG_ITEM" | "UNCATALOGED_LINE";
    label: string;
    item: { id: string; name: string; sku: string | null; type: string } | null;
    lineCount: number;
    quantity: string;
    taxableAmount: string;
    taxAmount: string;
    grossAmount: string;
    latestInvoiceDate: string | null;
  }>;
  totals: {
    lineCount: number;
    catalogItemCount: number;
    uncatalogedLineGroupCount: number;
    quantity: string;
    taxableAmount: string;
    taxAmount: string;
    grossAmount: string;
  };
  notes: string[];
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

export interface SalesQuoteLine {
  id: string;
  organizationId: string;
  quoteId: string;
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
  item?: { id: string; name: string; sku: string | null; revenueAccountId?: string } | null;
  account?: { id: string; code: string; name: string; type: AccountType };
  taxRate?: { id: string; name: string; rate: string } | null;
}

export interface SalesQuote {
  id: string;
  organizationId: string;
  quoteNumber: string;
  customerId: string;
  branchId: string | null;
  status: SalesQuoteStatus;
  issueDate: string;
  expiryDate: string | null;
  reference: string | null;
  currency: string;
  taxMode: SalesInvoiceTaxMode;
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  notes: string | null;
  terms: string | null;
  convertedSalesInvoiceId: string | null;
  convertedAt: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  expiredAt: string | null;
  cancelledAt: string | null;
  customer?: { id: string; name: string; displayName: string | null; type?: ContactType; taxNumber?: string | null; isActive?: boolean };
  branch?: { id: string; name: string; displayName: string | null; taxNumber?: string | null } | null;
  convertedSalesInvoice?: { id: string; invoiceNumber: string; status: SalesInvoiceStatus; issueDate?: string; total: string } | null;
  lines?: SalesQuoteLine[];
}

export interface SalesQuoteConversionResponse {
  quote: SalesQuote;
  invoice: SalesInvoice;
}

export interface RecurringInvoiceTemplateLine {
  id: string;
  organizationId: string;
  templateId: string;
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
  item?: { id: string; name: string; sku: string | null; revenueAccountId?: string } | null;
  account?: { id: string; code: string; name: string; type: AccountType };
  taxRate?: { id: string; name: string; rate: string } | null;
}

export interface RecurringInvoiceRun {
  id: string;
  organizationId: string;
  templateId: string;
  runDate: string;
  invoiceDate: string;
  dueDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  generatedInvoiceId: string | null;
  generatedById: string | null;
  createdAt: string;
  generatedInvoice?: { id: string; invoiceNumber: string; status: SalesInvoiceStatus; issueDate?: string; total: string } | null;
}

export interface RecurringInvoiceTemplate {
  id: string;
  organizationId: string;
  templateNumber: string;
  name: string;
  customerId: string;
  branchId: string | null;
  status: RecurringInvoiceTemplateStatus;
  startDate: string;
  endDate: string | null;
  nextRunDate: string;
  lastRunDate: string | null;
  frequency: RecurringInvoiceFrequency;
  interval: number;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  monthOfYear: number | null;
  invoiceDateMode: RecurringInvoiceDateMode;
  paymentTermsDays: number;
  reference: string | null;
  currency: string;
  taxMode: SalesInvoiceTaxMode;
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  notes: string | null;
  terms: string | null;
  customer?: { id: string; name: string; displayName: string | null; type?: ContactType; isActive?: boolean; taxNumber?: string | null };
  branch?: { id: string; name: string; displayName: string | null; taxNumber?: string | null } | null;
  lines?: RecurringInvoiceTemplateLine[];
  runs?: RecurringInvoiceRun[];
}

export interface RecurringInvoicePreview {
  templateId: string;
  templateNumber: string;
  status: RecurringInvoiceTemplateStatus;
  nextInvoiceDate: string;
  dueDate: string;
  periodCovered: { startDate: string; endDate: string };
  customer: RecurringInvoiceTemplate["customer"];
  taxMode: SalesInvoiceTaxMode;
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  lines: RecurringInvoiceTemplateLine[];
  nextOccurrences: string[];
  blockers: string[];
  previewOnly: true;
}

export interface RecurringInvoiceGenerationResponse {
  template: RecurringInvoiceTemplate;
  invoice: SalesInvoice;
  run: RecurringInvoiceRun;
}

export interface DeliveryNoteLine {
  id: string;
  organizationId: string;
  deliveryNoteId: string;
  itemId: string | null;
  description: string;
  quantity: string;
  unitOfMeasure: string | null;
  sourceSalesInvoiceLineId: string | null;
  sourceSalesQuoteLineId: string | null;
  sourceSalesStockIssueLineId: string | null;
  sortOrder: number;
  item?: { id: string; name: string; sku: string | null; status?: ItemStatus } | null;
  sourceSalesInvoiceLine?: { id: string; description: string; quantity: string; itemId: string | null } | null;
  sourceSalesQuoteLine?: { id: string; description: string; quantity: string; itemId: string | null } | null;
  sourceSalesStockIssueLine?: { id: string; quantity: string; itemId: string | null } | null;
}

export interface DeliveryNote {
  id: string;
  organizationId: string;
  deliveryNoteNumber: string;
  customerId: string;
  branchId: string | null;
  status: DeliveryNoteStatus;
  issueDate: string;
  deliveryDate: string | null;
  reference: string | null;
  relatedSalesInvoiceId: string | null;
  relatedSalesQuoteId: string | null;
  relatedSalesStockIssueId: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  instructions: string | null;
  issuedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  voidedAt: string | null;
  customer?: { id: string; name: string; displayName: string | null; type?: ContactType; taxNumber?: string | null; isActive?: boolean };
  branch?: { id: string; name: string; displayName: string | null; taxNumber?: string | null } | null;
  relatedSalesInvoice?: { id: string; invoiceNumber: string; status: SalesInvoiceStatus; issueDate?: string; total?: string } | null;
  relatedSalesQuote?: { id: string; quoteNumber: string; status: SalesQuoteStatus; issueDate?: string; total?: string } | null;
  relatedSalesStockIssue?: { id: string; issueNumber: string; status: SalesStockIssueStatus; issueDate?: string } | null;
  lines?: DeliveryNoteLine[];
  _count?: { lines: number };
}

export interface SalesInventoryReturnLine {
  id: string;
  organizationId: string;
  salesInventoryReturnId: string;
  itemId: string | null;
  description: string;
  quantity: string;
  sourceSalesInvoiceLineId: string | null;
  sourceCreditNoteLineId: string | null;
  sourceDeliveryNoteLineId: string | null;
  sourceSalesStockIssueLineId: string | null;
  warehouseId: string | null;
  stockMovementId: string | null;
  reason: string | null;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  item?: { id: string; name: string; sku: string | null; status?: ItemStatus; inventoryTracking?: boolean } | null;
  warehouse?: { id: string; code: string; name: string; status?: WarehouseStatus; isDefault?: boolean } | null;
  sourceSalesInvoiceLine?: { id: string; invoiceId: string; itemId: string | null; description: string; quantity: string } | null;
  sourceCreditNoteLine?: { id: string; creditNoteId: string; itemId: string | null; description: string; quantity: string } | null;
  sourceDeliveryNoteLine?: { id: string; deliveryNoteId: string; itemId: string | null; description: string; quantity: string } | null;
  sourceSalesStockIssueLine?: {
    id: string;
    issueId: string;
    itemId: string;
    quantity: string;
    unitCost: string | null;
    stockMovementId: string | null;
    issue?: { id: string; issueNumber?: string; customerId: string; status: SalesStockIssueStatus; warehouseId: string; warehouse?: { id: string; code: string; name: string; status: WarehouseStatus; isDefault?: boolean } | null };
    stockMovement?: StockMovementLink | null;
  } | null;
  stockMovement?: StockMovementLink | null;
}

export interface SalesInventoryReturn {
  id: string;
  organizationId: string;
  customerId: string;
  salesReturnNumber: string;
  status: SalesInventoryReturnStatus;
  returnDate: string;
  reason: string | null;
  reference: string | null;
  sourceSalesInvoiceId: string | null;
  sourceCreditNoteId: string | null;
  sourceDeliveryNoteId: string | null;
  sourceSalesStockIssueId: string | null;
  notes: string | null;
  createdByUserId: string | null;
  approvedByUserId: string | null;
  inventoryReturnPostedByUserId: string | null;
  approvedAt: string | null;
  receivedAt: string | null;
  cancelledAt: string | null;
  voidedAt: string | null;
  inventoryReturnPostedAt: string | null;
  createdAt: string;
  updatedAt: string;
  noPostingEffect?: true;
  noAccountingEffect?: true;
  noArEffect?: true;
  noVatEffect?: true;
  noZatcaEffect?: true;
  noCreditNoteEffect?: true;
  noRefundEffect?: true;
  noAutomaticInventoryEffect?: true;
  lineCount?: number;
  inventoryReturnMovementStatus?: SalesInventoryReturnInventoryMovementStatus;
  inventoryReturnMovementIds?: string[];
  inventoryReturnReversalSupported?: false;
  safeHelperText?: string;
  customer?: { id: string; name: string; displayName: string | null; type?: ContactType; taxNumber?: string | null; isActive?: boolean };
  sourceSalesInvoice?: { id: string; invoiceNumber: string; status: SalesInvoiceStatus; issueDate?: string; total?: string; customerId?: string } | null;
  sourceCreditNote?: { id: string; creditNoteNumber: string; status: CreditNoteStatus; issueDate?: string; total?: string; customerId?: string } | null;
  sourceDeliveryNote?: { id: string; deliveryNoteNumber: string; status: DeliveryNoteStatus; issueDate?: string; deliveryDate?: string | null; customerId?: string } | null;
  sourceSalesStockIssue?: { id: string; issueNumber: string; status: SalesStockIssueStatus; issueDate?: string; customerId?: string; warehouseId?: string; warehouse?: { id: string; code: string; name: string; status: WarehouseStatus; isDefault?: boolean } | null } | null;
  createdBy?: { id: string; name: string; email: string } | null;
  approvedBy?: { id: string; name: string; email: string } | null;
  inventoryReturnPostedBy?: { id: string; name: string; email: string } | null;
  lines?: SalesInventoryReturnLine[];
}

export type SalesInventoryReturnInventoryMovementStatus = "NOT_POSTED" | "POSTED" | "BLOCKED";
export type SalesInventoryReturnInventoryLineStatus = "POSTABLE" | "POSTED" | "BLOCKED" | "SKIPPED_NON_TRACKED";

export interface SalesInventoryReturnInventoryMovementPreviewLine {
  lineId: string;
  description: string;
  item: { id: string; name: string; sku: string | null; inventoryTracking: boolean } | null;
  warehouse: { id: string; code: string; name: string } | null;
  returnQuantity: string;
  currentOnHand: string | null;
  projectedOnHandAfterReturn: string | null;
  movementType: "SALES_RETURN_IN";
  movementRequired: boolean;
  status: SalesInventoryReturnInventoryLineStatus;
  stockMovementId: string | null;
  sourceType: "salesInvoice" | "creditNote" | "deliveryNote" | "salesStockIssue" | "direct";
  sourceLineId: string | null;
  sourceDocumentNumber: string | null;
  blockingReasons: string[];
  warnings: string[];
}

export interface SalesInventoryReturnInventoryMovementPreview {
  readOnly: true;
  previewOnly: true;
  noPostingEffect: true;
  noAccountingEffect: true;
  noArEffect: true;
  noVatEffect: true;
  noZatcaEffect: true;
  sourceType: "SalesInventoryReturn";
  sourceSalesInventoryReturn: { id: string; salesReturnNumber: string; status: SalesInventoryReturnStatus };
  inventoryMovementStatus: SalesInventoryReturnInventoryMovementStatus;
  canPost: boolean;
  alreadyPosted: boolean;
  reversalSupported: false;
  postedAt: string | null;
  movementIds: string[];
  blockingReasons: string[];
  warnings: string[];
  safeHelperText: string;
  lines: SalesInventoryReturnInventoryMovementPreviewLine[];
}

export interface CollectionActivity {
  id: string;
  organizationId: string;
  collectionCaseId: string;
  customerId: string;
  salesInvoiceId: string | null;
  activityType: CollectionActivityType;
  activityDate: string;
  note: string;
  nextFollowUpDate: string | null;
  promisedPaymentDate: string | null;
  promisedAmount: string | null;
  createdById: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string; email: string } | null;
}

export interface CollectionCase {
  id: string;
  organizationId: string;
  caseNumber: string;
  customerId: string;
  salesInvoiceId: string | null;
  status: CollectionCaseStatus;
  priority: CollectionPriority;
  followUpDate: string | null;
  promisedPaymentDate: string | null;
  promisedAmount: string | null;
  assignedToUserId: string | null;
  lastActivityAt: string | null;
  nextActionAt: string | null;
  summary: string | null;
  notes: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; displayName: string | null; email?: string | null; phone?: string | null; type?: ContactType };
  salesInvoice?: {
    id: string;
    invoiceNumber: string;
    customerId?: string;
    issueDate?: string;
    dueDate: string | null;
    currency: string;
    status: SalesInvoiceStatus;
    total: string;
    balanceDue: string;
  } | null;
  assignedTo?: { id: string; name: string; email: string } | null;
  createdBy?: { id: string; name: string; email: string } | null;
  updatedBy?: { id: string; name: string; email: string } | null;
  activities?: CollectionActivity[];
  invoiceSettled?: boolean;
  nonPostingNotice?: string;
}

export interface CollectionSummary {
  totalOverdueAmount: string;
  overdueInvoiceCount: number;
  openCollectionCaseCount: number;
  casesDueToday: number;
  casesOverdueForFollowUp: number;
  promisedToPayTotal: string;
  disputedTotal: string;
  topCustomersByOverdueAmount: Array<{
    customerId: string;
    customerName: string;
    overdueAmount: string;
    overdueInvoiceCount: number;
  }>;
  agingBuckets: Array<{ bucket: string; amount: string }>;
  safeWording: string;
}

export interface VatReturnReport {
  from: string | null;
  to: string | null;
  basis: "FINALIZED_SOURCE_DOCUMENTS" | string;
  outputVat: string;
  inputVat: string;
  netVat: string;
  netVatPayable: string;
  netVatRefundable: string;
  sales: VatReturnDocumentSummary;
  purchases: VatReturnDocumentSummary;
  notes: string[];
}

export interface VatReturnDocumentSummary {
  documentCount: number;
  taxableAmount: string;
  taxAmount: string;
  grossAmount: string;
  documents: Array<{
    id: string;
    number: string;
    documentDate: string;
    taxableAmount: string;
    taxAmount: string;
    grossAmount: string;
  }>;
}

export interface CustomerPaymentReceiptPdfData {
  organization: Pick<Organization, "id" | "name" | "legalName" | "taxNumber" | "countryCode">;
  customer: Pick<Contact, "id" | "name" | "displayName" | "email" | "phone" | "taxNumber" | "addressLine1" | "addressLine2" | "city" | "postalCode" | "countryCode">;
  payment: {
    id: string;
    paymentNumber: string;
    paymentDate: string;
    status: CustomerPaymentStatus | string;
    currency: string;
    amountReceived: string;
    unappliedAmount: string;
    description: string | null;
  };
  paidThroughAccount: Pick<Account, "id" | "code" | "name">;
  allocations: Array<{
    invoiceId: string;
    invoiceNumber: string;
    invoiceDate: string;
    invoiceTotal: string;
    amountApplied: string;
    invoiceBalanceDue: string;
  }>;
  unappliedAllocations: Array<{
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
  journalEntry: { id: string; entryNumber: string; status: JournalStatus | string } | null;
  generatedAt: string;
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
  status?: SalesInvoiceStatus;
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
  taxMode: SalesInvoiceTaxMode;
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

export interface Attachment {
  id: string;
  organizationId: string;
  linkedEntityType: AttachmentLinkedEntityType;
  linkedEntityId: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: AttachmentStorageProvider;
  storageKey: string | null;
  contentHash: string;
  status: AttachmentStatus;
  uploadedById: string | null;
  uploadedAt: string;
  deletedById: string | null;
  deletedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: { id: string; name: string; email: string } | null;
  deletedBy?: { id: string; name: string; email: string } | null;
}

export type ObjectStorageProviderName = "database" | "s3";

export interface StorageReadinessSection {
  activeProvider: ObjectStorageProviderName;
  ready: boolean;
  blockingReasons: string[];
  warnings: string[];
}

export interface AttachmentStorageReadinessSection extends StorageReadinessSection {
  maxSizeMb: number;
}

export interface S3ConfigReadiness {
  endpointConfigured: boolean;
  regionConfigured: boolean;
  bucketConfigured: boolean;
  accessKeyConfigured: boolean;
  secretConfigured: boolean;
  forcePathStyle: boolean;
  publicBaseUrlConfigured: boolean;
}

export interface StorageReadinessResponse {
  attachmentStorage: AttachmentStorageReadinessSection;
  generatedDocumentStorage: StorageReadinessSection;
  s3Config: S3ConfigReadiness;
  warnings: string[];
}

export interface StorageMigrationPlanResponse {
  attachmentCount: number;
  attachmentTotalBytes: number;
  generatedDocumentCount: number;
  generatedDocumentTotalBytes: number;
  databaseStorageCount: number;
  s3StorageCount: number;
  migrationRequired?: boolean;
  targetProvider?: ObjectStorageProviderName;
  estimatedMigrationRequired: boolean;
  dryRunOnly: boolean;
  notes: string[];
}

export interface BackupRestoreEvidence {
  id: string;
  organizationId: string | null;
  scope: BackupRestoreEvidenceScope;
  status: BackupRestoreEvidenceStatus;
  evidenceType: BackupRestoreEvidenceType;
  provider: string | null;
  evidenceSummaryJson: unknown;
  verifiedById: string | null;
  verifiedAt: string | null;
  revokedById: string | null;
  revokedAt: string | null;
  note: string | null;
  productionReadyContribution: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackupReadinessResponse {
  readOnly: boolean;
  noMutation: boolean;
  noBackupExecuted: boolean;
  noRestoreExecuted: boolean;
  noSecretsReturned: boolean;
  productionReady: boolean;
  databaseBackupConfigured: boolean;
  pointInTimeRecoveryConfigured: boolean;
  migrationHistoryAvailable: boolean;
  objectStorageBackupConfigured: boolean;
  generatedDocumentBackupConfigured: boolean;
  attachmentBackupConfigured: boolean;
  restoreDrillVerified: boolean;
  restoreVerificationVerified: boolean;
  rpoRtoReviewed: boolean;
  evidenceRequired: boolean;
  requiredEvidenceTypes: BackupRestoreEvidenceType[];
  verifiedEvidenceTypes: BackupRestoreEvidenceType[];
  missingEvidenceTypes: BackupRestoreEvidenceType[];
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
  redactionGuarantees?: string[];
}

export interface BackupRestoreEvidenceListResponse {
  metadataOnly: boolean;
  noBackupExecuted: boolean;
  noRestoreExecuted: boolean;
  noSecretsReturned: boolean;
  evidence: BackupRestoreEvidence[];
}

export interface BackupRestoreEvidenceResponse {
  metadataOnly: boolean;
  noBackupExecuted: boolean;
  noRestoreExecuted: boolean;
  noSecretsReturned: boolean;
  evidence: BackupRestoreEvidence;
}

export interface RestoreDrillPlanResponse {
  readOnly: boolean;
  noMutation: boolean;
  noRestoreExecuted: boolean;
  noCustomerDataExported: boolean;
  noSecretsReturned: boolean;
  productionReady: boolean;
  plannedSteps: string[];
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
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
  csrCommonName?: string | null;
  csrSerialNumber?: string | null;
  csrOrganizationUnitName?: string | null;
  csrInvoiceType?: string | null;
  csrLocationAddress?: string | null;
  hasCsr: boolean;
  hasComplianceCsid: boolean;
  hasProductionCsid: boolean;
  hasPrivateKey?: boolean;
  keyCustodyMode?: "MISSING" | "RAW_DATABASE_PEM";
  certificateExpiryKnown?: boolean;
  certificateExpiresAt?: string | null;
  renewalStatus?: string;
  certificateRequestId: string | null;
  lastInvoiceHash: string | null;
  lastIcv: number;
  hashMode: ZatcaHashMode;
  hashModeEnabledAt: string | null;
  hashModeEnabledById: string | null;
  hashModeResetReason: string | null;
  sdkHashChainStartedAt: string | null;
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
  hashModeSnapshot: ZatcaHashMode;
  generatedAt: string | null;
  clearedAt: string | null;
  reportedAt: string | null;
  rejectedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  egsUnit?: Pick<ZatcaEgsUnit, "id" | "name" | "environment" | "isActive" | "lastIcv" | "hashMode"> | null;
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

export type ZatcaHashComparisonStatus = "MATCH" | "MISMATCH" | "NOT_AVAILABLE" | "BLOCKED";

export interface ZatcaHashModeConfig {
  mode: ZatcaHashMode;
  envValue: "local" | "sdk";
  sdkModeRequested: boolean;
  blockingReasons: string[];
  warnings: string[];
}

export interface ZatcaSdkReadinessResponse {
  enabled: boolean;
  referenceFolderFound: boolean;
  sdkJarFound: boolean;
  fatooraLauncherFound: boolean;
  jqFound: boolean;
  configDirFound: boolean;
  workingDirectoryWritable: boolean;
  supportedCommandsKnown: boolean;
  javaFound: boolean;
  javaVersion: string | null;
  javaMajorVersion: number | null;
  javaVersionSupported: boolean;
  detectedJavaVersion?: string | null;
  javaSupported?: boolean;
  requiredJavaRange?: string;
  javaBinUsed?: string;
  javaBlockerMessage?: string | null;
  sdkCommand?: string;
  projectPathHasSpaces: boolean;
  canAttemptSdkValidation: boolean;
  canRunLocalValidation: boolean;
  blockingReasons: string[];
  warnings: string[];
  suggestedFixes: string[];
  timeoutMs: number;
  hashMode?: ZatcaHashModeConfig;
  sdkHashModeBlocked?: boolean;
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
    | "detectedJavaVersion"
    | "javaSupported"
    | "requiredJavaRange"
    | "javaBinUsed"
    | "javaBlockerMessage"
    | "sdkCommand"
    | "projectPathHasSpaces"
    | "canAttemptSdkValidation"
  >;
  commandPlan: ZatcaSdkValidationCommandPlan;
  warnings: string[];
}

export interface ZatcaSdkValidationResponse {
  success: boolean;
  disabled: boolean;
  localOnly: true;
  officialValidationAttempted: boolean;
  sdkExitCode: number | null;
  sdkHash: string | null;
  appHash: string | null;
  hashMatches: boolean | null;
  hashComparisonStatus: ZatcaHashComparisonStatus;
  stdoutSummary: string;
  stderrSummary: string;
  validationMessages: string[];
  blockingReasons: string[];
  warnings: string[];
  xmlSource: "generated" | "fixture" | "uploaded" | "invoice" | "request";
  invoiceType?: "standard" | "simplified";
}

export interface ZatcaInvoiceHashCompareResponse {
  disabled: boolean;
  localOnly: true;
  noMutation: true;
  officialHashAttempted: boolean;
  sdkExitCode: number | null;
  sdkHash: string | null;
  appHash: string | null;
  hashMatches: boolean | null;
  hashComparisonStatus: ZatcaHashComparisonStatus;
  stdoutSummary: string;
  stderrSummary: string;
  blockingReasons: string[];
  warnings: string[];
  hashMode: ZatcaHashModeConfig;
  invoiceId: string;
  metadataId: string;
  previousInvoiceHash: string | null;
  icv: number | null;
  egsUnitId: string | null;
  egsHashMode: ZatcaHashMode | null;
  metadataHashModeSnapshot: ZatcaHashMode | null;
}

export interface ZatcaHashChainResetPlan {
  dryRunOnly: true;
  localOnly: true;
  noMutation: true;
  hashMode: ZatcaHashModeConfig;
  summary: {
    activeEgsUnitCount: number;
    totalEgsUnitCount: number;
    invoicesWithMetadataCount: number;
    sdkModeEgsUnitCount: number;
    currentIcv: number | null;
    currentLastInvoiceHash: string | null;
  };
  sdkReadiness: {
    enabled: boolean;
    javaSupported: boolean;
    sdkJarFound: boolean;
    configDirFound: boolean;
    canRunLocalValidation: boolean;
    blockingReasons: string[];
    warnings: string[];
  } | null;
  egsUnits: Array<
    Pick<
      ZatcaEgsUnit,
      | "id"
      | "name"
      | "environment"
      | "status"
      | "isActive"
      | "lastIcv"
      | "lastInvoiceHash"
      | "hashMode"
      | "hashModeEnabledAt"
      | "hashModeEnabledById"
      | "hashModeResetReason"
      | "sdkHashChainStartedAt"
      | "updatedAt"
    > & {
      metadataCount: number;
      canEnableSdkHashMode: boolean;
      enableSdkHashModeBlockers: string[];
      recommendedAction: string;
    }
  >;
  invoicesWithMetadata: Array<{
    id: string;
    invoiceId: string;
    invoiceNumber: string;
    invoiceStatus: string | null;
    invoiceUuid: string;
    zatcaStatus: ZatcaInvoiceStatus;
    icv: number | null;
    previousInvoiceHash: string | null;
    invoiceHash: string | null;
    xmlHash: string | null;
    egsUnitId: string | null;
    hashModeSnapshot?: ZatcaHashMode;
    generatedAt: string | null;
  }>;
  resetRisks: string[];
  recommendedNextSteps: string[];
  warning: string;
}

export interface ZatcaReadinessSummary {
  warning: string;
  status: ZatcaReadinessStatus;
  localOnly: true;
  productionCompliance: false;
  environmentPolicyDocumented: boolean;
  keyCustodyDecisionDocumented: boolean;
  invoiceEligibilityDocumented: boolean;
  auditEvidenceStandardDocumented: boolean;
  sandboxOnboardingRunbookDocumented: boolean;
  sdkValidationReadinessDocumented: boolean;
  sdkValidationPipelineDocumented: boolean;
  sdkValidationCommandAvailable: boolean;
  sdkValidationEvidenceFormatDocumented: boolean;
  officialFixtureRegistryDocumented: boolean;
  latestSdkValidationEvidenceStatus: string;
  sdkValidationNoNetworkOnly: boolean;
  generatedStandardInvoiceFixtureStatus: string;
  generatedCreditNoteFixtureStatus: string;
  lastGeneratedFixtureEvidenceStatus: string;
  generatedFixtureJavaBlocker: string | null;
  generatedFixtureNoNetworkOnly: true;
  generatedFixtureProductionCompliance: false;
  productionComplianceEnabled: false;
  realNetworkCallsEnabled: false;
  signingEnabled: false;
  clearanceReportingEnabled: false;
  pdfA3Enabled: false;
  sellerProfile: ZatcaReadinessSection;
  egs: ZatcaReadinessSection;
  xml: ZatcaReadinessSection;
  sdk: ZatcaReadinessSection;
  signing: ZatcaReadinessSection;
  keyCustody: ZatcaReadinessSection;
  csr: ZatcaReadinessSection;
  complianceCsidOnboarding: ZatcaReadinessSection;
  complianceCsidCustody: ZatcaReadinessSection;
  signedArtifactPromotion: ZatcaReadinessSection;
  signedArtifactStorage: ZatcaReadinessSection;
  phase2Qr: ZatcaReadinessSection;
  pdfA3: ZatcaReadinessSection;
  checks: ZatcaReadinessCheck[];
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
    hasProductionCsid: boolean;
    hasPrivateKey?: boolean;
    keyCustodyMode?: "MISSING" | "RAW_DATABASE_PEM";
    certificateRequestId?: string | null;
    certificateExpiryKnown?: boolean;
    certificateExpiresAt?: string | null;
    renewalStatus?: string;
    lastIcv: number;
    lastInvoiceHash: string | null;
    hashMode: ZatcaHashMode;
  } | null;
  localXmlReady: boolean;
  mockCsidReady: boolean;
  realNetworkEnabled: boolean;
  productionReady: false;
  blockingReasons: string[];
}

export interface ZatcaInvoiceReadinessResponse {
  status: ZatcaReadinessStatus;
  localOnly: true;
  noMutation: true;
  productionCompliance: false;
  invoiceSummary: {
    id: string;
    invoiceNumber: string;
    status: SalesInvoiceStatus;
    zatcaInvoiceType: string;
    transactionCodeFlags: string;
    customerId: string | null;
    customerName: string | null;
  };
  sellerProfile: ZatcaReadinessSection;
  buyerContact: ZatcaReadinessSection;
  invoice: ZatcaReadinessSection;
  egs: ZatcaReadinessSection;
  xml: ZatcaReadinessSection;
  signing: ZatcaReadinessSection;
  complianceCsidOnboarding: ZatcaReadinessSection;
  complianceCsidCustody: ZatcaReadinessSection;
  signedArtifactPromotion: ZatcaReadinessSection;
  signedArtifactStorage: ZatcaReadinessSection;
  phase2Qr: ZatcaReadinessSection;
  pdfA3: ZatcaReadinessSection;
  checks: ZatcaReadinessCheck[];
  warnings: string[];
}

export interface ZatcaInvoiceSigningPlanResponse {
  localOnly: true;
  dryRun: true;
  noMutation: true;
  productionCompliance: false;
  executionEnabled: boolean;
  sdkCommand: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: SalesInvoiceStatus;
    zatcaInvoiceType: string;
  };
  metadata: {
    id: string;
    hasXml: boolean;
    hasInvoiceHash: boolean;
    icv: number | null;
    previousInvoiceHash: string | null;
    egsUnitId: string | null;
  } | null;
  egs: {
    id: string;
    name: string;
    environment: ZatcaEnvironment;
    status: ZatcaRegistrationStatus;
    isActive: boolean;
    hasCsr: boolean;
    hasComplianceCsid: boolean;
    hasProductionCsid: boolean;
    hashMode: ZatcaHashMode;
  } | null;
  requiredInputs: Array<{
    id: string;
    label: string;
    required: boolean;
    available: boolean;
    path: string | null;
    note?: string;
  }>;
  commandPlan: ZatcaSdkValidationCommandPlan;
  blockers: string[];
  warnings: string[];
}

export interface ZatcaInvoiceLocalSigningDryRunResponse {
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
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: string;
  executionEnabled: boolean;
  executionAttempted: boolean;
  executionSkipped: boolean;
  executionSkipReason: string | null;
  executionStatus: "SKIPPED" | "FAILED" | "SUCCEEDED_LOCALLY";
  signingExecuted: boolean;
  qrExecuted: boolean;
  sdkCommand: string;
  qrSdkCommand: string;
  sdkMaterial: {
    source: "SDK_DUMMY_TEST_MATERIAL";
    certificateFileName: string;
    privateKeyFileName: string;
    certificateReady: boolean;
    privateKeyReady: boolean;
    productionCredentialsUsed: false;
    contentReturned: false;
  };
  commandPlan: ZatcaSdkValidationCommandPlan;
  qrCommandPlan: ZatcaSdkValidationCommandPlan;
  phase2Qr: {
    currentBasicQrExists: boolean;
    sdkCommand: string;
    commandPlan: ZatcaSdkValidationCommandPlan;
    dependencyChain: string[];
    blockers: string[];
    warnings: string[];
  };
  tempFilesWritten: {
    unsignedXml: boolean;
    sdkConfig: boolean;
    sdkRuntime: boolean;
    signedXml: boolean;
    tempDirectory: string | null;
    filesRetained: boolean;
  };
  cleanup: {
    performed: boolean;
    success: boolean;
    filesRetained: boolean;
    tempDirectory: string | null;
  };
  signedXmlDetected: boolean;
  qrDetected: boolean;
  sdkExitCode: number | null;
  qrSdkExitCode: number | null;
  timedOut: boolean;
  stdoutSummary: string;
  stderrSummary: string;
  blockers: string[];
  warnings: string[];
}

export interface ZatcaInvoiceSignedXmlPromotionPlanResponse {
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
  invoice: {
    id: string;
    invoiceNumber: string;
    status: SalesInvoiceStatus;
    zatcaInvoiceType: string;
  };
  currentMetadataState: {
    id: string;
    zatcaStatus: string;
    invoiceUuid: string | null;
    icv: number | null;
    previousInvoiceHash: string | null;
    invoiceHash: string | null;
    xmlHash: string | null;
    hashModeSnapshot: ZatcaHashMode | null;
    egsUnitId: string | null;
    generatedAt: string | null;
    hasUnsignedXml: boolean;
    hasInvoiceHash: boolean;
    signedXmlPersisted: false;
    signedXmlStorageKey: null;
  } | null;
  latestLocalSignedValidationStatus: "NOT_PERSISTED";
  latestLocalSignedValidationSource: string;
  promotionDefinition: string;
  promotionBlocked: true;
  signedXmlPersisted: false;
  signedXmlStorageKey: null;
  qrPersisted: false;
  requiresRealCertificate: true;
  requiresProductionKeyCustody: true;
  validationSuccessIsPreconditionOnly: true;
  requiredFutureArtifacts: Array<{ id: string; label: string; required: boolean; available: boolean }>;
  promotionReadiness: ZatcaReadinessSection;
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
}

export interface ZatcaComplianceCsidRequestPlanResponse {
  localOnly: true;
  dryRun: true;
  noMutation: true;
  noNetwork: true;
  noCsidRequest: true;
  noProductionCredentials: true;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
  noClearanceReporting: true;
  noPdfA3: true;
  productionCompliance: false;
  executionEnabled: boolean;
    executionAttempted: false;
    executionStatus?: string;
    requestMapperReady?: boolean;
    responseMapperReady?: boolean;
    mockAdapterContractAvailable?: boolean;
    realSandboxAdapterImplemented?: boolean;
  tokenReturned?: false;
  secretReturned?: false;
  certificateBodyReturned?: false;
  otpReturned?: false;
  csrReturned?: false;
  egsUnit: {
    id: string;
    name: string;
    environment: ZatcaEnvironment;
    status: ZatcaRegistrationStatus;
    isActive: boolean;
    hasCsr: boolean;
    hasComplianceCsid: boolean;
    hasProductionCsid: boolean;
    hasPrivateKey: boolean;
    certificateRequestId: string | null;
  };
  csrStatus: {
    configHash: string;
    requiredFieldCount: number;
    missingFieldKeys: string[];
    reviewFieldKeys: string[];
    latestReviewId: string | null;
    latestReviewStatus: string;
    latestApprovedReviewId: string | null;
    latestApprovedReviewStatus: string;
    approvedReviewHashMatches: boolean;
    generatedCsrAvailable: boolean;
    generatedCsrReturned: false;
  };
  otpStatus: {
    required: true;
    provided: false;
    stored: false;
    returned: false;
    redacted: true;
  };
    plannedEndpointEnvironment: string;
    plannedEndpoint: {
      source: string;
      urlConfigured: boolean;
      urlReturned: false;
      networkCallPlannedByDefault: false;
      method?: string;
      endpointPath?: string;
      contentType?: string;
    };
    requestContract?: {
      localOnly: true;
      noNetwork: true;
      productionCompliance: false;
      method: string;
      endpointPath: string;
      environment: string;
      contentType: string;
      acceptVersion: string;
      redactedHeaders: Array<{ name: string; required: boolean; value: string; source: string }>;
      redactedBody: Array<{ name: string; required: boolean; value: string; source: string }>;
      sensitiveFieldNames: string[];
      needsOfficialVerification: string[];
    };
    responseContract?: {
      localOnly: true;
      noNetwork: true;
      productionCompliance: false;
      requestId: string | null;
      certificateRequestId: string | null;
      hasBinarySecurityToken: boolean;
      hasSecret: boolean;
      hasCertificate: boolean;
      tokenReturned: false;
      secretReturned: false;
      certificateBodyReturned: false;
      otpReturned: false;
      csrReturned: false;
      sensitiveFieldNames: string[];
      warnings: string[];
    } | null;
  plannedHeadersRedacted: Array<{ name: string; required: boolean; value: string; source: string }>;
  plannedBodyFieldsRedacted: Array<{ name: string; required: boolean; value: string; source: string }>;
  sensitiveResponseFields: string[];
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
}

export type ZatcaCredentialLifecycleStatus =
  | "NOT_CONFIGURED"
  | "CSR_PENDING"
  | "OTP_REQUIRED"
  | "COMPLIANCE_CSID_PENDING"
  | "COMPLIANCE_CSID_ACTIVE"
  | "PRODUCTION_CSID_PENDING"
  | "PRODUCTION_CSID_ACTIVE"
  | "ROTATION_REQUIRED"
  | "REVOKED"
  | "DISABLED"
  | "ERROR";

export type ZatcaCredentialCustodyProviderType = "NONE" | "EXTERNAL_KMS" | "EXTERNAL_HSM" | "MANAGED_SECRET_REFERENCE" | "DUMMY_LOCAL";

export interface ZatcaCredentialLifecycleMetadata {
  id: string | null;
  organizationId: string;
  egsUnitId: string;
  environment: ZatcaEnvironment;
  lifecycleStatus: ZatcaCredentialLifecycleStatus;
  custodyProviderType: ZatcaCredentialCustodyProviderType;
  custodyReferenceAlias: string | null;
  certificateFingerprint: string | null;
  certificateSerialNumber: string | null;
  certificateIssuer: string | null;
  certificateSubject: string | null;
  certificateNotBefore: string | null;
  certificateExpiresAt: string | null;
  certificateRequestId: string | null;
  complianceCsidStatus: ZatcaCredentialLifecycleStatus;
  productionCsidStatus: ZatcaCredentialLifecycleStatus;
  lastReadinessCheckAt: string | null;
  disabledAt: string | null;
  revokedAt: string | null;
  statusReason: string | null;
  errorCode: string | null;
  productionCompliance: false;
  metadataOnly: true;
  createdById: string | null;
  updatedById: string | null;
  disabledById: string | null;
  revokedById: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  egsUnit?: { id: string; name: string; environment: ZatcaEnvironment; isActive?: boolean } | null;
  secretMaterialPersisted: false;
  privateKeyReturned: false;
  certificateBodyReturned: false;
  csrBodyReturned: false;
  otpReturned: false;
  tokenReturned: false;
  secretReturned: false;
  signedArtifactBodyReturned: false;
  qrBodyReturned: false;
  providerRequestPayloadReturned: false;
  providerResponsePayloadReturned: false;
}

export interface ZatcaCredentialLifecycleSafetyEnvelope {
  localOnly: true;
  metadataOnly: true;
  readOnly: boolean;
  noEgsMutation: true;
  noNetwork: true;
  noCsidRequest: true;
  noSigning: true;
  noClearanceReporting: true;
  noPdfA3: true;
  noProductionCredentials: true;
  noPrivateKey: true;
  noRawCertificate: true;
  noRawCsr: true;
  noOtp: true;
  noTokenBody: true;
  noSecretBody: true;
  noSignedArtifactBody: true;
  noQrBody: true;
  noProviderPayloadBodies: true;
  noSubmissionLogs: true;
  productionCompliance: false;
}

export interface ZatcaCredentialLifecycleResponse extends ZatcaCredentialLifecycleSafetyEnvelope {
  lifecycle: ZatcaCredentialLifecycleMetadata;
}

export interface ZatcaCredentialLifecycleFoundationResponse extends ZatcaCredentialLifecycleSafetyEnvelope {
  modelAvailable: boolean;
  schemaMigrationRequired: boolean;
  activeEgsUnit: {
    id: string;
    name: string;
    environment: ZatcaEnvironment;
    status: ZatcaRegistrationStatus;
    isActive: boolean;
    hasCsr: boolean;
    hasComplianceCsid: boolean;
    hasProductionCsid: boolean;
    hasPrivateKey: boolean;
    keyCustodyMode: "MISSING" | "RAW_DATABASE_PEM";
  } | null;
  activeCredentialLifecycle: ZatcaCredentialLifecycleMetadata | null;
  credentialLifecycles: ZatcaCredentialLifecycleMetadata[];
  lifecycleStates: ZatcaCredentialLifecycleStatus[];
  custodyProviderTypes: ZatcaCredentialCustodyProviderType[];
  blockedCapabilities: string[];
  recommendedNextSteps: string[];
}

export interface ZatcaComplianceCsidCustodyProviderReadiness {
  localOnly?: true;
  dryRun?: true;
  noMutation?: true;
  noNetwork?: true;
  noCsidRequest?: true;
  noProductionCredentials?: true;
  provider: "DISABLED" | "FUTURE_SECRETS_MANAGER" | "FUTURE_KMS" | "FUTURE_ENCRYPTED_DB";
  enabled: boolean;
  configuredProvider: "DISABLED" | "FUTURE_SECRETS_MANAGER" | "FUTURE_KMS" | "FUTURE_ENCRYPTED_DB";
  providerConfigPresent: boolean;
  providerEnabled: false;
  providerConfigurationReady: false;
  mockProviderContractsAvailable: boolean;
  realProviderImplementationReady: false;
  defaultProvider: "DISABLED";
  configurationPlanSummary: {
    configuredProvider: "DISABLED" | "FUTURE_SECRETS_MANAGER" | "FUTURE_KMS" | "FUTURE_ENCRYPTED_DB";
    providerEnabled: false;
    providerConfigPresent: boolean;
    providerConfigurationReady: false;
    mockProviderContractsAvailable: boolean;
    realProviderImplementationReady: false;
    defaultProvider: "DISABLED";
    redactedConfigurationSummary: {
      provider: "DISABLED" | "FUTURE_SECRETS_MANAGER" | "FUTURE_KMS" | "FUTURE_ENCRYPTED_DB";
      kmsKeyId: string;
      secretPrefix: string;
      region: string;
      encryptedDbApproved: boolean;
      allowBodyStorageRequested: boolean;
    };
    bodyStorageAllowed: false;
  };
  tokenStorageReady: boolean;
  secretStorageReady: boolean;
  certificateStorageReady: boolean;
  kmsConfigured: boolean;
  secretsManagerConfigured: boolean;
  encryptedDbApproved: boolean;
  productionCompliance: false;
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
}

export interface ZatcaComplianceCsidProviderConfigurationPlan {
  localOnly: true;
  dryRun: true;
  noMutation: true;
  noNetwork: true;
  noCsidRequest: true;
  noProductionCredentials: true;
  noSecretBodyStorage: true;
  productionCompliance: false;
  configuredProvider: "DISABLED" | "FUTURE_SECRETS_MANAGER" | "FUTURE_KMS" | "FUTURE_ENCRYPTED_DB";
  providerEnabled: false;
  providerConfigPresent: boolean;
  providerConfigurationReady: false;
  mockProviderContractsAvailable: boolean;
  realProviderImplementationReady: false;
  defaultProvider: "DISABLED";
  configurationPresent: {
    provider: boolean;
    kmsKeyId: boolean;
    secretPrefix: boolean;
    region: boolean;
    encryptedDbApproval: boolean;
    allowBodyStorage: boolean;
  };
  redactedConfigurationSummary: {
    provider: "DISABLED" | "FUTURE_SECRETS_MANAGER" | "FUTURE_KMS" | "FUTURE_ENCRYPTED_DB";
    kmsKeyId: string;
    secretPrefix: string;
    region: string;
    encryptedDbApproved: boolean;
    allowBodyStorageRequested: boolean;
  };
  tokenStorageReady: false;
  secretStorageReady: false;
  certificateStorageReady: false;
  kmsConfigured: boolean;
  secretsManagerConfigured: boolean;
  encryptedDbApproved: boolean;
  bodyStorageAllowed: false;
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
}

export interface ZatcaComplianceCsidCustodyGate {
  allowed: false;
  tokenStorageReady: false;
  secretStorageReady: false;
  certificateStorageReady: false;
  kmsConfigured: false;
  secretsManagerConfigured: false;
  encryptedDbApproved: false;
  bodyPersistenceAllowed: false;
  productionCompliance: false;
  providerConfiguration?: ZatcaComplianceCsidProviderConfigurationPlan;
  providerReadiness?: ZatcaComplianceCsidCustodyProviderReadiness;
  reasons: string[];
}

export interface ZatcaComplianceCsidCustodyRecord {
  id: string;
  organizationId: string;
  egsUnitId: string;
  source: "MOCK" | "FUTURE_SANDBOX";
  status: "PLANNED" | "BLOCKED" | "FUTURE_READY" | "REVOKED";
  requestId: string | null;
  certificateRequestId: string | null;
  hasBinarySecurityToken: boolean;
  hasSecret: boolean;
  hasCertificate: boolean;
  tokenStorageMode: "NOT_STORED" | "FUTURE_SECRETS_MANAGER" | "FUTURE_ENCRYPTED_DB" | "FUTURE_KMS";
  secretStorageMode: "NOT_STORED" | "FUTURE_SECRETS_MANAGER" | "FUTURE_ENCRYPTED_DB" | "FUTURE_KMS";
  certificateStorageMode: "NOT_STORED" | "FUTURE_SECRETS_MANAGER" | "FUTURE_ENCRYPTED_DB" | "FUTURE_OBJECT_STORAGE";
  expiryKnown: boolean;
  expiresAt: string | null;
  renewalRequired: boolean;
  signedWithProductionMaterial: false;
  productionCompliance: false;
  custodyBlockedReason: string | null;
  createdById: string | null;
  revokedById: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tokenReturned: false;
  secretReturned: false;
  certificateBodyReturned: false;
  otpReturned: false;
  csrReturned: false;
  egsUnit?: { id: string; name: string; environment: ZatcaEnvironment } | null;
}

export interface ZatcaComplianceCsidCustodyRecordResponse {
  localOnly: true;
  metadataOnly: true;
  readOnly: boolean;
  noEgsMutation: true;
  noNetwork: true;
  noCsidRequest: true;
  noTokenBody: true;
  noSecretBody: true;
  noCertificateBody: true;
  noPrivateKey: true;
  noOtp: true;
  noCsrBody: true;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
  noSubmissionLogs: true;
  tokenPersisted: false;
  secretPersisted: false;
  certificatePersisted: false;
  productionCompliance: false;
  custodyRecord: ZatcaComplianceCsidCustodyRecord;
}

export interface ZatcaComplianceCsidCustodyRecordListResponse {
  localOnly: true;
  readOnly: true;
  metadataOnly: true;
  noNetwork: true;
  noCsidRequest: true;
  noTokenBody: true;
  noSecretBody: true;
  noCertificateBody: true;
  noPrivateKey: true;
  noOtp: true;
  noCsrBody: true;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
  noSubmissionLogs: true;
  productionCompliance: false;
  custodyRecords: ZatcaComplianceCsidCustodyRecord[];
}

export interface ZatcaComplianceCsidCustodyPlanResponse {
  localOnly: true;
  dryRun: true;
  noMutation: true;
  noNetwork: true;
  noCsidRequest: true;
  noProductionCredentials: true;
  noClearanceReporting: true;
  noPdfA3: true;
  noSignedXmlBodyPersistence: true;
  noQrPayloadBodyPersistence: true;
  productionCompliance: false;
  bodyPersistenceAllowed: false;
  latestCustodyRecord?: ZatcaComplianceCsidCustodyRecord | null;
  custodyRecordCount?: number;
  configuredProvider?: "DISABLED" | "FUTURE_SECRETS_MANAGER" | "FUTURE_KMS" | "FUTURE_ENCRYPTED_DB";
  providerConfiguration?: ZatcaComplianceCsidProviderConfigurationPlan;
  providerConfigurationReady?: false;
  providerConfigPresent?: boolean;
  futureReferenceModeOnly?: true;
  providerReadiness?: ZatcaComplianceCsidCustodyProviderReadiness;
  custodyGate?: ZatcaComplianceCsidCustodyGate;
  tokenStorageReady?: false;
  secretStorageReady?: false;
  certificateStorageReady?: false;
  recommendedStorageMode?: { token: string; secret: string; certificate: string };
  egsUnit: {
    id: string;
    name: string;
    environment: ZatcaEnvironment;
    status: ZatcaRegistrationStatus;
    isActive: boolean;
    hasCsr: boolean;
    hasComplianceCsid: boolean;
    hasProductionCsid: boolean;
    hasPrivateKey: boolean;
    certificateRequestId: string | null;
  };
  hasMockResponse: boolean;
  hasComplianceCsid: boolean;
  hasProductionCsid: boolean;
  tokenCustodyStatus: { status: "BLOCKED"; implemented: false; persisted: false; bodyReturned: false; storageMode: "NOT_STORED"; recommendedMode: string };
  secretCustodyStatus: { status: "BLOCKED"; implemented: false; persisted: false; bodyReturned: false; storageMode: "NOT_STORED"; recommendedMode: string };
  certificateCustodyStatus: { status: "BLOCKED"; implemented: false; persisted: false; bodyReturned: false; storageMode: "NOT_STORED"; recommendedMode: string };
  certificateExpiryKnown: boolean;
  certificateExpiresAt: string | null;
  renewalMetadataModeled: boolean;
  renewalRequired: boolean;
  recommendedCustodyMode: string;
  sensitiveFields: string[];
  redactionGuarantees: string[];
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
}

export type ZatcaSignedArtifactDraftStatus = "PLANNED" | "BLOCKED" | "SUPERSEDED";
export type ZatcaSignedArtifactDraftSource = "LOCAL_DRY_RUN" | "FUTURE_PRODUCTION_SIGNING";
export type ZatcaSignedArtifactStorageCapabilityStatus = "BLOCKED" | "WARNINGS" | "READY_FOR_METADATA_ONLY";

export interface ZatcaSignedArtifactDraft {
  id: string;
  organizationId: string;
  invoiceId: string;
  metadataId: string;
  status: ZatcaSignedArtifactDraftStatus;
  source: ZatcaSignedArtifactDraftSource;
  signedXmlStorageKey: string | null;
  signedXmlSha256: string | null;
  signedXmlSizeBytes: number | null;
  qrPayloadStorageKey: string | null;
  qrPayloadSha256: string | null;
  validationGlobalResult: string | null;
  validationResultsJson: unknown;
  signedWithDummyMaterial: boolean;
  productionCompliance: false;
  promotionBlockedReason: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string | null; email: string } | null;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
}

export interface ZatcaSignedArtifactObjectStorageCapability {
  provider: "database" | "s3";
  providerConfigured: boolean;
  objectStorageConfigured: boolean;
  bucketConfigured: boolean;
  configuredProviders: {
    attachmentStorageProvider: string;
    generatedDocumentStorageProvider: string;
  };
  requiredSettings: Record<string, boolean>;
  missingSettings: string[];
  writeCapability: "UNKNOWN_NOT_TESTED";
  writeCapabilityTested: false;
  retentionConfigured: false;
  immutableRetentionConfigured: false;
  policyApproved: false;
  retentionDurationApproved: false;
  immutablePolicyStatus: ZatcaSignedArtifactImmutablePolicyStatus;
  objectVersioningConfigured: false;
  tenantScopedKeyPrefixPlanned: true;
  generatedDocumentStorageDistinct: true;
  encryptionAtRestExpected: true;
  signedArtifactBodyStorageAllowed: false;
  bodyPersistenceBlocked: true;
  bodyPersistenceAllowed: false;
  storageCapabilityStatus: ZatcaSignedArtifactStorageCapabilityStatus;
  probeExecutionFlagEnabled: boolean;
  recommendedNextStep: string;
  warnings: string[];
}

export type ZatcaSignedArtifactStoragePolicyApprovalStatus = "DRAFT" | "APPROVED" | "REVOKED" | "SUPERSEDED";
export type ZatcaSignedArtifactStoragePolicyRetentionStatus =
  | "NOT_REVIEWED"
  | "APPROVED"
  | "REQUIRES_LEGAL_REVIEW";

export interface ZatcaSignedArtifactStoragePolicyApprovalActor {
  id: string;
  name: string | null;
  email: string | null;
}

export interface ZatcaSignedArtifactStoragePolicyApproval {
  id: string;
  organizationId: string;
  status: ZatcaSignedArtifactStoragePolicyApprovalStatus;
  policyVersion: string;
  policyHash: string;
  policySummaryJson: Record<string, unknown>;
  retentionDurationStatus: ZatcaSignedArtifactStoragePolicyRetentionStatus;
  retentionDurationValue: string | null;
  objectVersioningApproved: boolean;
  immutableArchiveApproved: boolean;
  deletionPolicyApproved: boolean;
  supersessionPolicyApproved: boolean;
  accessControlApproved: boolean;
  encryptionAtRestApproved: boolean;
  backupRestoreApproved: boolean;
  archiveRestoreTested: boolean;
  signedXmlBodyPersistenceAllowed: false;
  qrPayloadBodyPersistenceAllowed: false;
  productionCompliance: false;
  approvedById: string | null;
  approvedAt: string | null;
  revokedById: string | null;
  revokedAt: string | null;
  createdById: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: ZatcaSignedArtifactStoragePolicyApprovalActor | null;
  approvedBy: ZatcaSignedArtifactStoragePolicyApprovalActor | null;
  revokedBy: ZatcaSignedArtifactStoragePolicyApprovalActor | null;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
}

export interface ZatcaSignedArtifactStoragePolicyApprovalListResponse {
  localOnly: true;
  metadataOnly: true;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
  noCsidRequest: true;
  noNetworkToZatca: true;
  noClearanceReporting: true;
  noPdfA3: true;
  productionCompliance: false;
  policyApprovals: ZatcaSignedArtifactStoragePolicyApproval[];
}

export interface ZatcaSignedArtifactStoragePolicyApprovalResponse {
  localOnly: true;
  metadataOnly: true;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
  noCsidRequest: true;
  noNetworkToZatca: true;
  noClearanceReporting: true;
  noPdfA3: true;
  productionCompliance: false;
  signedXmlBodyPersistenceAllowed: false;
  qrPayloadBodyPersistenceAllowed: false;
  policyApproval: ZatcaSignedArtifactStoragePolicyApproval;
  warnings: string[];
}

export interface ZatcaSignedArtifactStorageControlEvidence {
  id: string;
  organizationId: string;
  policyApprovalId: string | null;
  status: ZatcaSignedArtifactStorageControlEvidenceStatus;
  evidenceType: ZatcaSignedArtifactStorageControlEvidenceType;
  provider: string | null;
  bucketNameRedacted: string | null;
  evidenceSummaryJson: Record<string, unknown>;
  evidenceHash: string | null;
  evidenceDocumentStorageKey: string | null;
  verifiedById: string | null;
  verifiedAt: string | null;
  revokedById: string | null;
  revokedAt: string | null;
  createdById: string | null;
  note: string | null;
  productionCompliance: false;
  signedXmlBodyPersistenceAllowed: false;
  qrPayloadBodyPersistenceAllowed: false;
  createdAt: string;
  updatedAt: string;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
}

export interface ZatcaSignedArtifactStorageControlEvidenceState {
  evidenceRequired: true;
  requiredEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  evidenceSummary: Array<{
    evidenceType: ZatcaSignedArtifactStorageControlEvidenceType;
    latestStatus: ZatcaSignedArtifactStorageControlEvidenceStatus | "MISSING";
    latestEvidenceId: string | null;
    verified: boolean;
  }>;
  verifiedEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  missingEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  draftEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  revokedEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  supersededEvidenceTypes?: ZatcaSignedArtifactStorageControlEvidenceType[];
  latestEvidenceByType: Partial<Record<ZatcaSignedArtifactStorageControlEvidenceType, ZatcaSignedArtifactStorageControlEvidence>>;
  completenessStatus: ZatcaSignedArtifactStorageEvidenceCompletenessStatus;
  evidenceCompletenessStatus: ZatcaSignedArtifactStorageEvidenceCompletenessStatus;
  bodyPersistenceAllowed: false;
  signedXmlBodyPersistenceAllowed: false;
  qrPayloadBodyPersistenceAllowed: false;
  objectStorageTechnicalControlsStatus: ZatcaSignedArtifactStorageTechnicalControlsStatus;
}

export interface ZatcaSignedArtifactBodyPersistenceGate {
  allowed: false;
  bodyPersistenceAllowed: false;
  signedXmlBodyPersistenceAllowed: false;
  qrPayloadBodyPersistenceAllowed: false;
  productionCompliance: false;
  reasons: string[];
}

export interface ZatcaSignedArtifactStorageEvidenceCompletenessResponse extends ZatcaSignedArtifactStorageControlEvidenceState {
  localOnly: true;
  readOnly: true;
  noMutation: true;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
  noCsidRequest: true;
  noNetworkToZatca: true;
  noClearanceReporting: true;
  noPdfA3: true;
  noProductionCredentials: true;
  productionCompliance: false;
  bodyPersistenceGate: ZatcaSignedArtifactBodyPersistenceGate;
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
}

export interface ZatcaSignedArtifactStorageControlEvidenceListResponse {
  localOnly: true;
  metadataOnly: true;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
  noCsidRequest: true;
  noNetworkToZatca: true;
  noClearanceReporting: true;
  noPdfA3: true;
  noProductionCredentials: true;
  productionCompliance: false;
  controlEvidence: ZatcaSignedArtifactStorageControlEvidence[];
}

export interface ZatcaSignedArtifactStorageControlEvidenceResponse {
  localOnly: true;
  metadataOnly: true;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
  noCsidRequest: true;
  noNetworkToZatca: true;
  noClearanceReporting: true;
  noPdfA3: true;
  noProductionCredentials: true;
  productionCompliance: false;
  bodyPersistenceAllowed: false;
  signedXmlBodyPersistenceAllowed: false;
  qrPayloadBodyPersistenceAllowed: false;
  controlEvidence: ZatcaSignedArtifactStorageControlEvidence;
  warnings: string[];
}

export interface ZatcaSignedArtifactImmutablePolicyStatus {
  status: "BLOCKED" | "WARNINGS";
  latestApprovalId: string | null;
  latestApprovalStatus: ZatcaSignedArtifactStoragePolicyApprovalStatus | "NONE";
  approvalRequired: true;
  policyApproved: boolean;
  retentionDurationApproved: boolean;
  objectVersioningRequired: true;
  objectVersioningConfirmed: boolean;
  immutableArchiveRequired: true;
  deletionPolicyApproved: boolean;
  supersessionPolicyApproved: boolean;
  archiveRestoreTested: boolean;
  accessControlReviewed: boolean;
  encryptionAtRestReviewed: boolean;
  backupRestoreReviewed: boolean;
  bodyPersistenceAllowed: false;
  signedArtifactBodyStorageAllowed: false;
  qrPayloadBodyStorageAllowed: false;
  recommendedNextStep: string;
}

export interface ZatcaSignedArtifactImmutablePolicyPlanResponse {
  localOnly: true;
  dryRun: true;
  noMutation: true;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
  noCsidRequest: true;
  noNetworkToZatca: true;
  noClearanceReporting: true;
  noPdfA3: true;
  noProductionCredentials: true;
  productionCompliance: false;
  latestApprovalId: string | null;
  latestApprovalStatus: ZatcaSignedArtifactStoragePolicyApprovalStatus | "NONE";
  latestApproval: ZatcaSignedArtifactStoragePolicyApproval | null;
  approvalRequired: true;
  approvalBlockedReasons: string[];
  policyApproved: boolean;
  retentionDurationApproved: boolean;
  objectVersioningRequired: true;
  immutableArchiveRequired: true;
  deletionPolicyApproved: boolean;
  supersessionPolicyApproved: boolean;
  accessControlReviewed: boolean;
  encryptionAtRestReviewed: boolean;
  backupRestoreReviewed: boolean;
  bodyPersistenceAllowed: false;
  signedXmlBodyPersistenceAllowed: false;
  signedArtifactBodyStorageAllowed: false;
  qrPayloadBodyPersistenceAllowed: false;
  qrPayloadBodyStorageAllowed: false;
  bodyPersistenceGate: ZatcaSignedArtifactBodyPersistenceGate;
  immutablePolicyStatus: ZatcaSignedArtifactImmutablePolicyStatus;
  evidenceRequired: true;
  evidenceCompletenessStatus: ZatcaSignedArtifactStorageEvidenceCompletenessStatus;
  requiredEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  evidenceSummary: ZatcaSignedArtifactStorageControlEvidenceState["evidenceSummary"];
  verifiedEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  missingEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  draftEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  revokedEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  latestEvidenceByType: ZatcaSignedArtifactStorageControlEvidenceState["latestEvidenceByType"];
  objectStorageTechnicalControlsStatus: ZatcaSignedArtifactStorageTechnicalControlsStatus;
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
}

export interface ZatcaSignedArtifactStorageProbePlanResponse {
  localOnly: true;
  dryRun: true;
  noMutation: true;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
  noCsidRequest: true;
  noNetworkToZatca: true;
  noClearanceReporting: true;
  noPdfA3: true;
  noProductionCredentials: true;
  productionCompliance: false;
  objectStorageConfigured: boolean;
  provider: "database" | "s3";
  bucketConfigured: boolean;
  testPrefix: string;
  plannedTestObjectKey: string;
  writeProbeEnabled: false;
  executionFlagEnabled: boolean;
  retentionConfigured: false;
  immutabilityConfigured: false;
  immutablePolicyStatus: ZatcaSignedArtifactImmutablePolicyStatus;
  latestImmutablePolicyApprovalStatus: ZatcaSignedArtifactStoragePolicyApprovalStatus | "NONE";
  policyApprovalRequired: true;
  policyApproved: boolean;
  retentionDurationApproved: boolean;
  bodyPersistenceAllowed: false;
  signedArtifactBodyStorageAllowed: false;
  signedXmlBodyPersistenceAllowed: false;
  qrPayloadBodyPersistenceAllowed: false;
  bodyPersistenceGate: ZatcaSignedArtifactBodyPersistenceGate;
  evidenceRequired: true;
  evidenceCompletenessStatus: ZatcaSignedArtifactStorageEvidenceCompletenessStatus;
  requiredEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  evidenceSummary: ZatcaSignedArtifactStorageControlEvidenceState["evidenceSummary"];
  verifiedEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  missingEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  draftEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  revokedEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  latestEvidenceByType: ZatcaSignedArtifactStorageControlEvidenceState["latestEvidenceByType"];
  objectStorageTechnicalControlsStatus: ZatcaSignedArtifactStorageTechnicalControlsStatus;
  recommendedNextStep: string;
  blockers: string[];
  warnings: string[];
}

export interface ZatcaSignedArtifactStorageProbeResponse {
  localOnly: true;
  probe: true;
  noMutation: true;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
  noCsidRequest: true;
  noNetworkToZatca: true;
  noClearanceReporting: true;
  noPdfA3: true;
  noProductionCredentials: true;
  productionCompliance: false;
  executionEnabled: boolean;
  executionAttempted: boolean;
  testObjectWritten: boolean;
  testObjectRead: boolean;
  testObjectDeleted: boolean;
  cleanupSuccess: boolean;
  immutablePolicyStatus: ZatcaSignedArtifactImmutablePolicyStatus;
  latestImmutablePolicyApprovalStatus: ZatcaSignedArtifactStoragePolicyApprovalStatus | "NONE";
  policyApprovalRequired: true;
  policyApproved: boolean;
  retentionDurationApproved: boolean;
  bodyPersistenceAllowed: false;
  signedArtifactBodyStorageAllowed: false;
  signedXmlBodyPersistenceAllowed: false;
  qrPayloadBodyPersistenceAllowed: false;
  bodyPersistenceGate: ZatcaSignedArtifactBodyPersistenceGate;
  evidenceRequired: true;
  evidenceCompletenessStatus: ZatcaSignedArtifactStorageEvidenceCompletenessStatus;
  requiredEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  evidenceSummary: ZatcaSignedArtifactStorageControlEvidenceState["evidenceSummary"];
  verifiedEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  missingEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  draftEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  revokedEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  latestEvidenceByType: ZatcaSignedArtifactStorageControlEvidenceState["latestEvidenceByType"];
  objectStorageTechnicalControlsStatus: ZatcaSignedArtifactStorageTechnicalControlsStatus;
  recommendedNextStep: string;
  blockers: string[];
  warnings: string[];
}

export interface ZatcaSignedArtifactDraftListResponse {
  localOnly: true;
  metadataOnly: true;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
  noCsidRequest: true;
  noNetwork: true;
  noClearanceReporting: true;
  noPdfA3: true;
  productionCompliance: false;
  count: number;
  drafts: ZatcaSignedArtifactDraft[];
}

export interface ZatcaSignedArtifactDraftCreateResponse {
  localOnly: true;
  metadataOnly: true;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
  noCsidRequest: true;
  noNetwork: true;
  noClearanceReporting: true;
  noPdfA3: true;
  productionCompliance: false;
  draft: ZatcaSignedArtifactDraft;
  warnings: string[];
}

export interface ZatcaInvoiceSignedArtifactStoragePlanResponse {
  localOnly: true;
  dryRun: true;
  noMutation: true;
  noSignedXmlBody: true;
  noQrPayloadBody: true;
  noCsidRequest: true;
  noNetwork: true;
  noClearanceReporting: true;
  noPdfA3: true;
  noProductionCredentials: true;
  noPersistence: true;
  productionCompliance: false;
  metadataOnly: true;
  futureObjectStorageRequired: true;
  storageBlocked: true;
  storageProbeRequired: true;
  latestStorageProbeStatus: "NOT_RUN";
  storageProbePlan: ZatcaSignedArtifactStorageProbePlanResponse;
  immutablePolicyStatus: ZatcaSignedArtifactImmutablePolicyStatus;
  latestImmutablePolicyApprovalStatus: ZatcaSignedArtifactStoragePolicyApprovalStatus | "NONE";
  policyApprovalRequired: true;
  policyApproved: boolean;
  retentionDurationApproved: boolean;
  evidenceRequired: true;
  evidenceCompletenessStatus: ZatcaSignedArtifactStorageEvidenceCompletenessStatus;
  requiredEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  evidenceSummary: ZatcaSignedArtifactStorageControlEvidenceState["evidenceSummary"];
  verifiedEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  missingEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  draftEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  revokedEvidenceTypes: ZatcaSignedArtifactStorageControlEvidenceType[];
  latestEvidenceByType: ZatcaSignedArtifactStorageControlEvidenceState["latestEvidenceByType"];
  objectStorageTechnicalControlsStatus: ZatcaSignedArtifactStorageTechnicalControlsStatus;
  recommendedNextStep: string;
  metadataOnlyDraftAllowed: boolean;
  bodyPersistenceAllowed: false;
  signedArtifactBodyStorageAllowed: false;
  signedXmlBodyPersistenceAllowed: false;
  qrPayloadBodyPersistenceAllowed: false;
  bodyPersistenceGate: ZatcaSignedArtifactBodyPersistenceGate;
  signedXmlStorageKey: null;
  qrPayloadStorageKey: null;
  latestDraft: ZatcaSignedArtifactDraft | null;
  draftCount: number;
  objectStorageCapability: ZatcaSignedArtifactObjectStorageCapability;
  storageCapabilityStatus: ZatcaSignedArtifactStorageCapabilityStatus;
  schemaDecision: { schemaAdded: true; model: string; reason: string };
  proposedStorageKeys: {
    keyPrefix: string;
    signedXmlObjectKey: string;
    qrPayloadObjectKey: string;
    validationSummaryObjectKey: string;
    note: string;
  };
  proposedMetadataFields: Array<{ name: string; safeNow: boolean; value: string | boolean | null; notes: string }>;
  retentionPolicyPlan: {
    currentPhase: string;
    futureObjectStorageRequired: boolean;
    immutableArchiveRequired: boolean;
    encryptionAtRestRequired: boolean;
    tenantScopedKeysRequired: boolean;
    retentionRule: string;
    deletionRule: string;
  };
  redactionRules: string[];
  storageReadiness: ZatcaReadinessSection;
  blockers: string[];
  warnings: string[];
}

export interface ZatcaEgsCsrPlanResponse {
  localOnly: true;
  dryRun: true;
  noMutation: true;
  productionCompliance: false;
  noCsidRequest: true;
  warning: string;
  sdkCommand: string;
  egsUnit: {
    id: string;
    name: string;
    status: ZatcaRegistrationStatus;
    environment: ZatcaEnvironment;
    isActive: boolean;
    hasCsr: boolean;
    hasComplianceCsid: boolean;
    hasProductionCsid: boolean;
    hasPrivateKey: boolean;
    certificateRequestId: string | null;
    keyCustodyMode: "MISSING" | "RAW_DATABASE_PEM";
    certificateExpiryKnown: boolean;
    certificateExpiresAt: string | null;
    renewalStatus: string;
  };
  requiredFields: Array<{
    sdkConfigKey: string;
    label: string;
    officialSource: string;
    currentValue: string | null;
    status: "AVAILABLE" | "MISSING" | "NEEDS_REVIEW";
    source: "ZATCA_PROFILE" | "EGS_UNIT" | "NOT_MODELED";
    notes: string;
  }>;
  availableValues: ZatcaEgsCsrPlanResponse["requiredFields"];
  missingValues: ZatcaEgsCsrPlanResponse["requiredFields"];
  plannedSdkConfigFields: Array<{
    key: string;
    currentValue: string | null;
    status: "AVAILABLE" | "MISSING" | "NEEDS_REVIEW";
    source: "ZATCA_PROFILE" | "EGS_UNIT" | "NOT_MODELED";
  }>;
  plannedFiles: {
    csrConfig: string;
    privateKey: string;
    generatedCsr: string;
  };
  keyCustody: {
    mode: "MISSING" | "RAW_DATABASE_PEM";
    privateKeyConfigured: boolean;
    privateKeyReturned: false;
    redaction: string;
  };
  certificateState: {
    complianceCsid: "present-redacted" | "missing";
    productionCsid: "present-redacted" | "missing";
    certificateRequestId: string | null;
    certificateExpiryKnown: boolean;
    certificateExpiresAt: string | null;
    renewalStatus: string;
  };
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
}

export interface ZatcaEgsCsrConfigPreviewResponse {
  localOnly: true;
  dryRun: true;
  noMutation: true;
  noCsidRequest: true;
  noNetwork: true;
  productionCompliance: false;
  canPrepareConfig: boolean;
  sanitizedConfigPreview: string;
  configEntries: Array<{
    key: string;
    valuePreview: string | null;
    status: "AVAILABLE" | "MISSING" | "NEEDS_REVIEW";
    source: "ZATCA_PROFILE" | "EGS_UNIT" | "NOT_MODELED";
    officialSource: string;
    notes: string;
  }>;
  missingFields: ZatcaEgsCsrConfigPreviewResponse["configEntries"];
  reviewFields: ZatcaEgsCsrConfigPreviewResponse["configEntries"];
  blockers: string[];
  warnings: string[];
  officialSources: string[];
}

export interface ZatcaCsrConfigReview {
  id: string;
  organizationId: string;
  egsUnitId: string;
  status: ZatcaCsrConfigReviewStatus;
  configHash: string;
  configPreviewRedacted: string;
  configKeyOrder: string[];
  missingFieldsJson: unknown;
  reviewFieldsJson: unknown;
  blockersJson: unknown;
  warningsJson: unknown;
  approvedById: string | null;
  approvedAt: string | null;
  approvedBy?: { id: string; name: string; email: string } | null;
  revokedById: string | null;
  revokedAt: string | null;
  revokedBy?: { id: string; name: string; email: string } | null;
  note: string | null;
  localOnly: true;
  noCsidRequest: true;
  noNetwork: true;
  sdkExecution: false;
  productionCompliance: false;
  createdAt: string;
  updatedAt: string;
}

export interface ZatcaEgsCsrLocalGenerateResponse {
  localOnly: true;
  dryRun: false;
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
  latestReviewStatus: ZatcaCsrConfigReviewStatus | null;
  configHash: string;
  sdkCommand: string;
  commandPlan: ZatcaSdkValidationCommandPlan;
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
  timedOut: boolean;
  generatedCsrDetected: boolean;
  privateKeyDetected: boolean;
  blockers: string[];
  warnings: string[];
}

export interface ZatcaXmlValidationResult {
  localOnly: true;
  officialValidation: false;
  valid: boolean;
  errors: string[];
  warnings: string[];
}
