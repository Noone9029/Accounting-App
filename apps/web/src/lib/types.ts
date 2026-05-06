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
