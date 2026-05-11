export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE" | "COST_OF_SALES";
export type ContactType = "CUSTOMER" | "SUPPLIER" | "BOTH";
export type TaxRateScope = "SALES" | "PURCHASES" | "BOTH";
export type TaxRateCategory = "STANDARD" | "ZERO_RATED" | "EXEMPT" | "OUT_OF_SCOPE" | "REVERSE_CHARGE";
export type JournalStatus = "DRAFT" | "POSTED" | "VOIDED" | "REVERSED";
export type ItemType = "SERVICE" | "PRODUCT";
export type ItemStatus = "ACTIVE" | "DISABLED";
export type SalesInvoiceStatus = "DRAFT" | "FINALIZED" | "VOIDED";
export type CustomerPaymentStatus = "DRAFT" | "POSTED" | "VOIDED";
export type CustomerLedgerRowType = "INVOICE" | "PAYMENT" | "PAYMENT_ALLOCATION" | "VOID_PAYMENT" | "VOID_INVOICE";
export type DocumentType = "SALES_INVOICE" | "CUSTOMER_PAYMENT_RECEIPT" | "CUSTOMER_STATEMENT";
export type GeneratedDocumentStatus = "GENERATED" | "FAILED" | "SUPERSEDED";
export type ZatcaEnvironment = "SANDBOX" | "SIMULATION" | "PRODUCTION";
export type ZatcaRegistrationStatus = "NOT_CONFIGURED" | "DRAFT" | "READY_FOR_CSR" | "OTP_REQUIRED" | "CERTIFICATE_ISSUED" | "ACTIVE" | "SUSPENDED";
export type ZatcaInvoiceType = "STANDARD_TAX_INVOICE" | "SIMPLIFIED_TAX_INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE";
export type ZatcaInvoiceStatus = "NOT_SUBMITTED" | "XML_GENERATED" | "READY_FOR_SUBMISSION" | "SUBMISSION_PENDING" | "CLEARED" | "REPORTED" | "REJECTED" | "FAILED";
export type ZatcaSubmissionType = "COMPLIANCE_CHECK" | "CLEARANCE" | "REPORTING";
export type ZatcaSubmissionStatus = "PENDING" | "SUCCESS" | "REJECTED" | "FAILED";

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
    status: string;
    organization: Organization;
    role: { id: string; name: string; permissions: unknown };
  }>;
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
  revenueAccount?: { id: string; code: string; name: string; type: AccountType };
  salesTaxRate?: { id: string; name: string; rate: string; scope: TaxRateScope } | null;
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
  sourceType: "SalesInvoice" | "CustomerPayment" | "CustomerPaymentAllocation";
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
  journalEntry: { id: string; entryNumber: string; status: JournalStatus; totalDebit: string; totalCredit: string } | null;
  status: CustomerPaymentStatus;
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
