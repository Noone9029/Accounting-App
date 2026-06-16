import type { Page, Route } from "@playwright/test";
import { DEFAULT_ROLE_PERMISSIONS, type Permission } from "../../packages/shared/src/permissions";

export const visualApiUrl = process.env.LEDGERBYTE_VISUAL_API_URL ?? "http://127.0.0.1:4999";
export const fixedVisualDate = "2026-05-21T12:00:00.000Z";

export type VisualRoleProfileName = keyof typeof visualRoleProfiles;

interface VisualRoleProfile {
  id: string;
  name: string;
  permissions: readonly Permission[];
}

export const visualRoleProfiles = {
  Owner: { id: "role-owner", name: "Owner", permissions: DEFAULT_ROLE_PERMISSIONS.Owner },
  Accountant: { id: "role-accountant", name: "Accountant", permissions: DEFAULT_ROLE_PERMISSIONS.Accountant },
  Sales: { id: "role-sales", name: "Sales", permissions: DEFAULT_ROLE_PERMISSIONS.Sales },
  Purchases: { id: "role-purchases", name: "Purchases", permissions: DEFAULT_ROLE_PERMISSIONS.Purchases },
  Viewer: { id: "role-viewer", name: "Viewer", permissions: DEFAULT_ROLE_PERMISSIONS.Viewer },
} as const satisfies Record<string, VisualRoleProfile>;

export interface VisualFixtureOptions {
  roleProfile?: VisualRoleProfileName;
}

type CustomerDetailState = "open" | "empty" | "inactive" | "long";
type SupplierDetailState = "open" | "empty" | "inactive" | "long";

const org = {
  id: "org-visual",
  name: "LedgerByte Visual Co",
  legalName: "LedgerByte Visual Co LLC",
  taxNumber: "300000000000003",
  countryCode: "SA",
  baseCurrency: "SAR",
  timezone: "Asia/Riyadh",
};

const customer = {
  id: "customer-1",
  organizationId: org.id,
  name: "Visual Customer",
  displayName: "Visual Customer",
  type: "CUSTOMER",
  isActive: true,
  email: "customer@example.test",
  phone: null,
  taxNumber: "300000000000001",
  legalName: "Visual Customer LLC",
  uaeTrn: "100000000000001",
  uaeTin: "TIN-CUSTOMER-1",
  uaeVatRegistrationStatus: "REGISTERED",
  uaeAddressLine1: "King Fahd Road",
  uaeAddressLine2: "Al Olaya",
  uaeEmirate: null,
  peppolParticipantId: "0235:300000000000001",
  peppolEndpointStatus: "NOT_CONNECTED",
  preferredEinvoiceDeliveryMethod: "EMAIL",
  identificationType: "CRN",
  identificationNumber: "1010000001",
  addressLine1: "King Fahd Road",
  addressLine2: "Al Olaya",
  buildingNumber: "1234",
  city: "Riyadh",
  postalCode: "12211",
  countryCode: "SA",
  createdAt: fixedVisualDate,
  updatedAt: fixedVisualDate,
};

const supplier = {
  id: "supplier-1",
  organizationId: org.id,
  name: "Visual Supplier",
  displayName: "Visual Supplier",
  type: "SUPPLIER",
  isActive: true,
  email: "supplier@example.test",
  phone: null,
  taxNumber: "300000000000002",
  legalName: "Visual Supplier LLC",
  uaeTrn: "100000000000002",
  uaeTin: "TIN-SUPPLIER-1",
  uaeVatRegistrationStatus: "REGISTERED",
  uaeAddressLine1: "Prince Sultan Road",
  uaeAddressLine2: "Al Muhammadiyah",
  uaeEmirate: null,
  peppolParticipantId: "0235:300000000000002",
  peppolEndpointStatus: "NOT_CONNECTED",
  preferredEinvoiceDeliveryMethod: "EMAIL",
  identificationType: "CRN",
  identificationNumber: "1010000002",
  addressLine1: "Prince Sultan Road",
  addressLine2: "Al Muhammadiyah",
  buildingNumber: "4321",
  city: "Jeddah",
  postalCode: "23511",
  countryCode: "SA",
  createdAt: fixedVisualDate,
  updatedAt: fixedVisualDate,
};

const item = {
  id: "item-1",
  organizationId: org.id,
  sku: "VIS-ITEM",
  name: "Visual Stock Item",
  description: "Stable test item for visual regression.",
  type: "PRODUCT",
  status: "ACTIVE",
  sellingPrice: "125.0000",
  revenueAccountId: "sales-account-1",
  inventoryTracking: true,
  reorderPoint: "10.0000",
  reorderQuantity: "20.0000",
  salesAccountId: "sales-account-1",
  purchaseAccountId: "purchase-account-1",
  inventoryAccountId: "inventory-account-1",
  costOfSalesAccountId: "cogs-account-1",
  salesTaxRateId: "tax-1",
  purchaseTaxRateId: "tax-1",
  createdAt: fixedVisualDate,
  updatedAt: fixedVisualDate,
  revenueAccount: { id: "sales-account-1", code: "4010", name: "Sales", type: "REVENUE", allowPosting: true, isActive: true },
  salesTaxRate: { id: "tax-1", name: "VAT 15%", rate: "15.0000", scope: "BOTH", category: "STANDARD", isActive: true },
};

const warehouse = {
  id: "warehouse-1",
  organizationId: org.id,
  code: "MAIN",
  name: "Main Warehouse",
  status: "ACTIVE",
  addressLine1: "Warehouse District",
  addressLine2: null,
  city: "Riyadh",
  countryCode: "SA",
  phone: null,
  isDefault: true,
  createdAt: fixedVisualDate,
  updatedAt: fixedVisualDate,
};

const warehouseTwo = {
  ...warehouse,
  id: "warehouse-2",
  code: "SECOND",
  name: "Secondary Warehouse",
  isDefault: false,
};

const bankAccount = {
  id: "bank-1",
  organizationId: org.id,
  accountId: "bank-account-asset-1",
  type: "BANK",
  status: "ACTIVE",
  displayName: "Main Bank",
  bankName: "Visual Bank",
  accountNumberMasked: "**** 1234",
  ibanMasked: "SA**1234",
  currency: "SAR",
  openingBalance: "1000.0000",
  openingBalanceDate: "2026-05-01T00:00:00.000Z",
  openingBalanceJournalEntryId: "journal-opening",
  openingBalancePostedAt: "2026-05-01T00:00:00.000Z",
  notes: "Manual statement import testing only.",
  createdAt: fixedVisualDate,
  updatedAt: fixedVisualDate,
  account: {
    id: "bank-account-asset-1",
    code: "1010",
    name: "Main Bank",
    type: "ASSET",
    allowPosting: true,
    isActive: true,
  },
  openingBalanceJournalEntry: { id: "journal-opening", entryNumber: "JE-OPEN", status: "POSTED" },
  ledgerBalance: "1250.0000",
  latestTransactionDate: "2026-05-21T00:00:00.000Z",
  transactionCount: 4,
};

const secondBankAccount = {
  ...bankAccount,
  id: "bank-2",
  accountId: "bank-account-asset-2",
  displayName: "Savings Bank",
  account: { ...bankAccount.account, id: "bank-account-asset-2", code: "1020", name: "Savings Bank" },
  ledgerBalance: "400.0000",
};

const negativeBankAccount = {
  ...bankAccount,
  id: "bank-negative",
  accountId: "bank-account-asset-negative",
  displayName: "Operations overdraft account with long branch reference",
  accountNumberMasked: "**** 9001",
  ibanMasked: "SA**9001",
  notes: "Manual statement import testing only. Negative balance fixture.",
  account: { ...bankAccount.account, id: "bank-account-asset-negative", code: "1030", name: "Operations Overdraft" },
  ledgerBalance: "-2450.7500",
  latestTransactionDate: "2026-05-20T00:00:00.000Z",
  transactionCount: 3,
};

const inactiveBankAccount = {
  ...bankAccount,
  id: "bank-inactive",
  accountId: "bank-account-asset-inactive",
  status: "INACTIVE",
  displayName: "Archived manual bank profile",
  accountNumberMasked: "**** 0000",
  ibanMasked: "SA**0000",
  account: { ...bankAccount.account, id: "bank-account-asset-inactive", code: "1040", name: "Archived Bank", isActive: false },
  ledgerBalance: "0.0000",
  latestTransactionDate: null,
  transactionCount: 0,
};

const invoice = {
  id: "invoice-1",
  organizationId: org.id,
  invoiceNumber: "INV-VIS-001",
  customerId: customer.id,
  branchId: null,
  issueDate: "2026-05-15T00:00:00.000Z",
  dueDate: "2026-05-30T00:00:00.000Z",
  currency: "SAR",
  status: "FINALIZED",
  subtotal: "1000.0000",
  discountTotal: "0.0000",
  taxableTotal: "1000.0000",
  taxTotal: "150.0000",
  total: "1150.0000",
  balanceDue: "650.0000",
  notes: "Visual regression invoice note.",
  terms: "Due on receipt.",
  finalizedAt: "2026-05-15T10:00:00.000Z",
  journalEntryId: "journal-invoice-1",
  reversalJournalEntryId: null,
  customer,
  branch: null,
  journalEntry: { id: "journal-invoice-1", entryNumber: "JE-INV-001", status: "POSTED" },
  reversalJournalEntry: null,
  paymentAllocations: [
    {
      id: "invoice-payment-allocation-1",
      paymentId: "payment-1",
      invoiceId: "invoice-1",
      amountApplied: "500.0000",
      createdAt: fixedVisualDate,
      payment: { id: "payment-1", paymentNumber: "PAY-VIS-001", paymentDate: "2026-05-18T00:00:00.000Z", status: "POSTED" },
    },
  ],
  paymentUnappliedAllocations: [],
  creditNoteAllocations: [],
  creditNotes: [],
  lines: [
    {
      id: "invoice-line-1",
      invoiceId: "invoice-1",
      itemId: item.id,
      description: "Professional services",
      quantity: "1.0000",
      unitPrice: "1000.0000",
      discountAmount: "0.0000",
      taxRateId: "tax-1",
      accountId: "sales-account-1",
      lineSubtotal: "1000.0000",
      lineTax: "150.0000",
      lineGrossAmount: "1000.0000",
      taxableAmount: "1000.0000",
      taxAmount: "150.0000",
      lineTotal: "1150.0000",
      item,
      taxRate: { id: "tax-1", name: "VAT 15%", rate: "15.0000", scope: "BOTH", category: "STANDARD" },
      account: { id: "sales-account-1", code: "4010", name: "Sales", type: "REVENUE" },
    },
  ],
};

const customerPayment = {
  id: "payment-1",
  organizationId: org.id,
  paymentNumber: "PAY-VIS-001",
  customerId: customer.id,
  accountId: bankAccount.accountId,
  bankAccountProfileId: bankAccount.id,
  paymentDate: "2026-05-18T00:00:00.000Z",
  currency: "SAR",
  status: "POSTED",
  amount: "500.0000",
  amountReceived: "500.0000",
  unappliedAmount: "0.0000",
  memo: "Visual customer payment.",
  journalEntryId: "journal-payment-1",
  voidReversalJournalEntryId: null,
  postedAt: fixedVisualDate,
  voidedAt: null,
  createdAt: fixedVisualDate,
  updatedAt: fixedVisualDate,
  customer,
  account: bankAccount.account,
  bankAccountProfile: bankAccount,
  journalEntry: { id: "journal-payment-1", entryNumber: "JE-PAY-001", status: "POSTED" },
  voidReversalJournalEntry: null,
  allocations: [
    {
      id: "payment-allocation-1",
      paymentId: "payment-1",
      invoiceId: "invoice-1",
      amountApplied: "500.0000",
      createdAt: fixedVisualDate,
      invoice: { id: "invoice-1", invoiceNumber: invoice.invoiceNumber, issueDate: invoice.issueDate, total: invoice.total, balanceDue: invoice.balanceDue, status: "FINALIZED" },
    },
  ],
  unappliedAllocations: [],
};

const purchaseBill = {
  id: "bill-1",
  organizationId: org.id,
  billNumber: "BILL-VIS-001",
  supplierId: supplier.id,
  branchId: null,
  billDate: "2026-05-12T00:00:00.000Z",
  dueDate: "2026-05-28T00:00:00.000Z",
  currency: "SAR",
  status: "FINALIZED",
  inventoryPostingMode: "DIRECT_EXPENSE_OR_ASSET",
  subtotal: "800.0000",
  discountTotal: "0.0000",
  taxableTotal: "800.0000",
  taxTotal: "120.0000",
  total: "920.0000",
  balanceDue: "520.0000",
  notes: "Visual purchase bill.",
  terms: "Net 15.",
  finalizedAt: fixedVisualDate,
  journalEntryId: "journal-bill-1",
  reversalJournalEntryId: null,
  supplier,
  branch: null,
  purchaseOrderId: null,
  purchaseOrder: null,
  journalEntry: { id: "journal-bill-1", entryNumber: "JE-BILL-001", status: "POSTED" },
  reversalJournalEntry: null,
  lines: [
    {
      id: "bill-line-1",
      billId: "bill-1",
      itemId: item.id,
      description: "Inventory purchase",
      quantity: "2.0000",
      unitPrice: "400.0000",
      discountAmount: "0.0000",
      taxRateId: "tax-1",
      accountId: "purchase-account-1",
      lineSubtotal: "800.0000",
      lineTax: "120.0000",
      lineGrossAmount: "800.0000",
      taxableAmount: "800.0000",
      taxAmount: "120.0000",
      lineTotal: "920.0000",
      inventoryTreatment: "EXPENSE",
      item,
      taxRate: { id: "tax-1", name: "VAT 15%", rate: "15.0000", scope: "BOTH", category: "STANDARD" },
      account: { id: "purchase-account-1", code: "5010", name: "Purchases", type: "EXPENSE" },
    },
  ],
  paymentAllocations: [],
  supplierPaymentUnappliedAllocations: [],
  debitNotes: [],
  debitNoteAllocations: [],
};

const supplierPayment = {
  id: "supplier-payment-1",
  organizationId: org.id,
  paymentNumber: "SPAY-VIS-001",
  supplierId: supplier.id,
  accountId: bankAccount.accountId,
  bankAccountProfileId: bankAccount.id,
  paymentDate: "2026-05-19T00:00:00.000Z",
  currency: "SAR",
  status: "POSTED",
  amount: "400.0000",
  amountPaid: "400.0000",
  unappliedAmount: "0.0000",
  memo: "Visual supplier payment.",
  journalEntryId: "journal-spay-1",
  voidReversalJournalEntryId: null,
  postedAt: fixedVisualDate,
  voidedAt: null,
  createdAt: fixedVisualDate,
  updatedAt: fixedVisualDate,
  supplier,
  account: bankAccount.account,
  bankAccountProfile: bankAccount,
  journalEntry: { id: "journal-spay-1", entryNumber: "JE-SPAY-001", status: "POSTED" },
  voidReversalJournalEntry: null,
  allocations: [
    {
      id: "supplier-payment-allocation-1",
      paymentId: "supplier-payment-1",
      billId: "bill-1",
      amountApplied: "400.0000",
      createdAt: fixedVisualDate,
      bill: { id: "bill-1", billNumber: purchaseBill.billNumber, billDate: purchaseBill.billDate, total: purchaseBill.total, balanceDue: purchaseBill.balanceDue, status: "FINALIZED" },
    },
  ],
  unappliedAllocations: [],
};

const debitNote = {
  id: "debit-note-1",
  organizationId: org.id,
  debitNoteNumber: "DN-VIS-001",
  supplierId: supplier.id,
  billId: purchaseBill.id,
  issueDate: "2026-05-20T00:00:00.000Z",
  currency: "SAR",
  status: "FINALIZED",
  subtotal: "100.0000",
  discountTotal: "0.0000",
  taxableTotal: "100.0000",
  taxTotal: "15.0000",
  total: "115.0000",
  unappliedAmount: "0.0000",
  reason: "Supplier allowance",
  notes: "Visual debit note.",
  finalizedAt: fixedVisualDate,
  journalEntryId: "journal-debit-note-1",
  reversalJournalEntryId: null,
  supplier,
  bill: { id: purchaseBill.id, billNumber: purchaseBill.billNumber, billDate: purchaseBill.billDate, total: purchaseBill.total, balanceDue: purchaseBill.balanceDue, status: "FINALIZED" },
  originalBill: { id: purchaseBill.id, billNumber: purchaseBill.billNumber },
  journalEntry: { id: "journal-debit-note-1", entryNumber: "JE-DN-001", status: "POSTED" },
  reversalJournalEntry: null,
  lines: [
    {
      id: "debit-note-line-1",
      debitNoteId: "debit-note-1",
      itemId: item.id,
      description: "Supplier price adjustment",
      quantity: "1.0000",
      unitPrice: "100.0000",
      discountAmount: "0.0000",
      taxRateId: "tax-1",
      accountId: "purchase-account-1",
      lineSubtotal: "100.0000",
      lineTax: "15.0000",
      lineGrossAmount: "100.0000",
      taxableAmount: "100.0000",
      taxAmount: "15.0000",
      lineTotal: "115.0000",
      item,
      taxRate: { id: "tax-1", name: "VAT 15%", rate: "15.0000", scope: "BOTH", category: "STANDARD" },
      account: { id: "purchase-account-1", code: "5010", name: "Purchases", type: "EXPENSE" },
    },
  ],
  allocations: [
    {
      id: "debit-note-allocation-1",
      debitNoteId: "debit-note-1",
      billId: purchaseBill.id,
      amountApplied: "115.0000",
      status: "ACTIVE",
      createdAt: fixedVisualDate,
      bill: { id: purchaseBill.id, billNumber: purchaseBill.billNumber, billDate: purchaseBill.billDate, total: purchaseBill.total, balanceDue: purchaseBill.balanceDue, status: "FINALIZED" },
    },
  ],
};

const creditNote = {
  id: "credit-note-1",
  organizationId: org.id,
  creditNoteNumber: "CN-VIS-001",
  customerId: customer.id,
  originalInvoiceId: invoice.id,
  invoiceId: invoice.id,
  issueDate: "2026-05-20T00:00:00.000Z",
  currency: "SAR",
  status: "FINALIZED",
  subtotal: "100.0000",
  discountTotal: "0.0000",
  taxableTotal: "100.0000",
  taxTotal: "15.0000",
  total: "115.0000",
  unappliedAmount: "0.0000",
  reason: "Customer allowance",
  notes: "Visual credit note.",
  finalizedAt: fixedVisualDate,
  journalEntryId: "journal-credit-note-1",
  reversalJournalEntryId: null,
  customer,
  invoice: { id: invoice.id, invoiceNumber: invoice.invoiceNumber, issueDate: invoice.issueDate, total: invoice.total, balanceDue: invoice.balanceDue, status: invoice.status },
  originalInvoice: { id: invoice.id, invoiceNumber: invoice.invoiceNumber },
  journalEntry: { id: "journal-credit-note-1", entryNumber: "JE-CN-001", status: "POSTED" },
  reversalJournalEntry: null,
  lines: [
    {
      id: "credit-note-line-1",
      creditNoteId: "credit-note-1",
      itemId: item.id,
      description: "Customer price adjustment",
      quantity: "1.0000",
      unitPrice: "100.0000",
      discountAmount: "0.0000",
      taxRateId: "tax-1",
      accountId: "sales-account-1",
      lineSubtotal: "100.0000",
      lineTax: "15.0000",
      lineGrossAmount: "100.0000",
      taxableAmount: "100.0000",
      taxAmount: "15.0000",
      lineTotal: "115.0000",
      item,
      taxRate: { id: "tax-1", name: "VAT 15%", rate: "15.0000", scope: "BOTH", category: "STANDARD" },
      account: { id: "sales-account-1", code: "4010", name: "Sales", type: "REVENUE" },
    },
  ],
  allocations: [
    {
      id: "credit-note-allocation-1",
      creditNoteId: "credit-note-1",
      invoiceId: invoice.id,
      amountApplied: "115.0000",
      status: "ACTIVE",
      createdAt: fixedVisualDate,
      invoice: { id: invoice.id, invoiceNumber: invoice.invoiceNumber, issueDate: invoice.issueDate, total: invoice.total, balanceDue: invoice.balanceDue, status: invoice.status },
    },
  ],
};

const visualCustomers = {
  "customer-1": customer,
  "customer-empty": {
    ...customer,
    id: "customer-empty",
    name: "Visual Customer No Activity",
    displayName: "Visual Customer No Activity",
    email: "no-activity-customer@example.test",
    taxNumber: "300000000000011",
  },
  "customer-inactive": {
    ...customer,
    id: "customer-inactive",
    name: "Archived Visual Customer",
    displayName: "Archived Visual Customer",
    isActive: false,
    email: "archived-customer@example.test",
    taxNumber: "300000000000012",
  },
  "customer-long": {
    ...customer,
    id: "customer-long",
    name: "Visual Customer International Holdings and Construction Services Company Limited",
    displayName: "Visual Customer International Holdings and Construction Services Company Limited",
    legalName: "Visual Customer International Holdings and Construction Services Company Limited LLC",
    email: "accounts-receivable-team-with-long-mailbox@example.test",
    phone: "+966 11 555 0199 ext 2044",
    taxNumber: "300000000000013",
    addressLine1: "Tower 14, Financial District, King Fahd Road, Suite 2204",
    addressLine2: "Accounts receivable correspondence and billing operations floor",
    city: "Riyadh",
  },
} as const;

const visualSuppliers = {
  "supplier-1": supplier,
  "supplier-empty": {
    ...supplier,
    id: "supplier-empty",
    name: "Visual Supplier No Activity",
    displayName: "Visual Supplier No Activity",
    email: "no-activity-supplier@example.test",
    taxNumber: "300000000000021",
  },
  "supplier-inactive": {
    ...supplier,
    id: "supplier-inactive",
    name: "Archived Visual Supplier",
    displayName: "Archived Visual Supplier",
    isActive: false,
    email: "archived-supplier@example.test",
    taxNumber: "300000000000022",
  },
  "supplier-long": {
    ...supplier,
    id: "supplier-long",
    name: "Visual Supplier Regional Logistics Manufacturing and Maintenance Services Company",
    displayName: "Visual Supplier Regional Logistics Manufacturing and Maintenance Services Company",
    legalName: "Visual Supplier Regional Logistics Manufacturing and Maintenance Services Company LLC",
    email: "accounts-payable-regional-shared-services@example.test",
    phone: "+966 12 555 0198 ext 4410",
    taxNumber: "300000000000023",
    addressLine1: "Industrial Area Gate 5, Prince Sultan Road, Building 88",
    addressLine2: "Long supplier remittance address for mobile wrapping review",
    city: "Jeddah",
  },
} as const;

const salesInvoiceVariants = {
  "invoice-1": invoice,
  "invoice-draft": salesInvoiceVariant("invoice-draft", "INV-STATE-DRAFT", {
    status: "DRAFT",
    dueDate: "2026-06-15T00:00:00.000Z",
    balanceDue: "1150.0000",
    finalizedAt: null,
    journalEntryId: null,
    journalEntry: null,
    paymentAllocations: [],
  }),
  "invoice-awaiting-payment": salesInvoiceVariant("invoice-awaiting-payment", "INV-STATE-AWAIT", {
    status: "FINALIZED",
    dueDate: "2026-06-15T00:00:00.000Z",
    balanceDue: "1150.0000",
    paymentAllocations: [],
  }),
  "invoice-partially-paid": salesInvoiceVariant("invoice-partially-paid", "INV-STATE-PARTIAL", {
    status: "FINALIZED",
    balanceDue: "650.0000",
    paymentAllocations: [invoicePaymentAllocation("invoice-partial-allocation", "invoice-partially-paid", "500.0000", "650.0000")],
  }),
  "invoice-paid": salesInvoiceVariant("invoice-paid", "INV-STATE-PAID", {
    status: "FINALIZED",
    balanceDue: "0.0000",
    paymentAllocations: [invoicePaymentAllocation("invoice-paid-allocation", "invoice-paid", "1150.0000", "0.0000")],
  }),
  "invoice-overdue": salesInvoiceVariant("invoice-overdue", "INV-STATE-OVERDUE", {
    status: "FINALIZED",
    dueDate: "2026-04-15T00:00:00.000Z",
    balanceDue: "1150.0000",
    paymentAllocations: [],
  }),
  "invoice-voided": salesInvoiceVariant("invoice-voided", "INV-STATE-VOIDED", {
    status: "VOIDED",
    balanceDue: "1150.0000",
    reversalJournalEntryId: "journal-invoice-voided-reversal",
    reversalJournalEntry: { id: "journal-invoice-voided-reversal", entryNumber: "JE-INV-VOID", status: "POSTED" },
    paymentAllocations: [],
  }),
} as const;

const purchaseBillVariants = {
  "bill-1": purchaseBill,
  "bill-draft": purchaseBillVariant("bill-draft", "BILL-STATE-DRAFT", {
    status: "DRAFT",
    dueDate: "2026-06-15T00:00:00.000Z",
    balanceDue: "920.0000",
    finalizedAt: null,
    journalEntryId: null,
    journalEntry: null,
    paymentAllocations: [],
  }),
  "bill-awaiting-payment": purchaseBillVariant("bill-awaiting-payment", "BILL-STATE-AWAIT", {
    status: "FINALIZED",
    dueDate: "2026-06-15T00:00:00.000Z",
    balanceDue: "920.0000",
    paymentAllocations: [],
  }),
  "bill-partially-paid": purchaseBillVariant("bill-partially-paid", "BILL-STATE-PARTIAL", {
    status: "FINALIZED",
    balanceDue: "520.0000",
    paymentAllocations: [billPaymentAllocation("bill-partial-allocation", "bill-partially-paid", "400.0000", "520.0000")],
  }),
  "bill-paid": purchaseBillVariant("bill-paid", "BILL-STATE-PAID", {
    status: "FINALIZED",
    balanceDue: "0.0000",
    paymentAllocations: [billPaymentAllocation("bill-paid-allocation", "bill-paid", "920.0000", "0.0000")],
  }),
  "bill-overdue": purchaseBillVariant("bill-overdue", "BILL-STATE-OVERDUE", {
    status: "FINALIZED",
    dueDate: "2026-04-15T00:00:00.000Z",
    balanceDue: "920.0000",
    paymentAllocations: [],
  }),
  "bill-voided": purchaseBillVariant("bill-voided", "BILL-STATE-VOIDED", {
    status: "VOIDED",
    balanceDue: "920.0000",
    reversalJournalEntryId: "journal-bill-voided-reversal",
    reversalJournalEntry: { id: "journal-bill-voided-reversal", entryNumber: "JE-BILL-VOID", status: "POSTED" },
    paymentAllocations: [],
  }),
} as const;

const customerPaymentVariants = {
  "payment-1": customerPayment,
  "payment-allocated": customerPaymentVariant("payment-allocated", "PAY-VIS-001", {
    allocations: [customerPaymentAllocation("payment-allocated-direct", "payment-allocated", invoice.id, "500.0000", invoice.balanceDue)],
  }),
  "payment-partially-allocated": customerPaymentVariant("payment-partially-allocated", "PAY-STATE-PARTIAL", {
    amount: "900.0000",
    amountReceived: "900.0000",
    unappliedAmount: "400.0000",
    allocations: [customerPaymentAllocation("payment-partial-direct", "payment-partially-allocated", invoice.id, "500.0000", invoice.balanceDue)],
  }),
  "payment-unallocated": customerPaymentVariant("payment-unallocated", "PAY-STATE-UNAPPLIED", {
    amount: "300.0000",
    amountReceived: "300.0000",
    unappliedAmount: "300.0000",
    allocations: [],
  }),
} as const;

const supplierPaymentVariants = {
  "supplier-payment-1": supplierPayment,
  "supplier-payment-allocated": supplierPaymentVariant("supplier-payment-allocated", "SPAY-VIS-001", {
    allocations: [supplierPaymentAllocation("supplier-payment-allocated-direct", "supplier-payment-allocated", purchaseBill.id, "400.0000", purchaseBill.balanceDue)],
  }),
  "supplier-payment-partially-allocated": supplierPaymentVariant("supplier-payment-partially-allocated", "SPAY-STATE-PARTIAL", {
    amount: "700.0000",
    amountPaid: "700.0000",
    unappliedAmount: "300.0000",
    allocations: [supplierPaymentAllocation("supplier-payment-partial-direct", "supplier-payment-partially-allocated", purchaseBill.id, "400.0000", purchaseBill.balanceDue)],
  }),
  "supplier-payment-unallocated": supplierPaymentVariant("supplier-payment-unallocated", "SPAY-STATE-UNAPPLIED", {
    amount: "300.0000",
    amountPaid: "300.0000",
    unappliedAmount: "300.0000",
    allocations: [],
  }),
} as const;

const creditNoteVariants = {
  "credit-note-1": creditNote,
  "credit-note-draft": creditNoteVariant("credit-note-draft", "CN-STATE-DRAFT", {
    status: "DRAFT",
    unappliedAmount: "115.0000",
    finalizedAt: null,
    journalEntryId: null,
    journalEntry: null,
    allocations: [],
  }),
  "credit-note-finalized": creditNoteVariant("credit-note-finalized", "CN-STATE-FINAL", {
    status: "FINALIZED",
    unappliedAmount: "50.0000",
    allocations: [creditNoteAllocation("credit-note-final-partial-allocation", "credit-note-finalized", "65.0000", "585.0000")],
  }),
  "credit-note-partially-applied": creditNoteVariant("credit-note-partially-applied", "CN-STATE-PARTIAL", {
    status: "FINALIZED",
    unappliedAmount: "50.0000",
    allocations: [creditNoteAllocation("credit-note-partial-allocation", "credit-note-partially-applied", "65.0000", "585.0000")],
  }),
  "credit-note-applied": creditNoteVariant("credit-note-applied", "CN-STATE-APPLIED", {
    status: "FINALIZED",
    unappliedAmount: "0.0000",
    allocations: [creditNoteAllocation("credit-note-applied-allocation", "credit-note-applied", "115.0000", "535.0000")],
  }),
  "credit-note-unapplied": creditNoteVariant("credit-note-unapplied", "CN-STATE-UNAPPLIED", {
    status: "FINALIZED",
    unappliedAmount: "115.0000",
    allocations: [],
  }),
  "credit-note-voided": creditNoteVariant("credit-note-voided", "CN-STATE-VOIDED", {
    status: "VOIDED",
    unappliedAmount: "0.0000",
    allocations: [],
    reversalJournalEntryId: "journal-credit-note-voided-reversal",
    reversalJournalEntry: { id: "journal-credit-note-voided-reversal", entryNumber: "JE-CN-VOID", status: "POSTED" },
  }),
  "credit-note-long-large": creditNoteVariant("credit-note-long-large", "CN-STATE-LONG-LARGE", {
    customer: visualCustomers["customer-long"],
    customerId: "customer-long",
    subtotal: "987654.3200",
    taxableTotal: "987654.3200",
    taxTotal: "148148.1500",
    total: "1135802.4700",
    unappliedAmount: "1135802.4700",
    reason: "Extended commercial credit reason covering returned materials, disputed delivery windows, and board-approved customer allowance",
    notes: "Long local visual note for refund and collections layout review. This does not imply provider automation, bank sync, or production compliance.",
    allocations: [],
  }),
} as const;

const debitNoteVariants = {
  "debit-note-1": debitNote,
  "debit-note-draft": debitNoteVariant("debit-note-draft", "DN-STATE-DRAFT", {
    status: "DRAFT",
    unappliedAmount: "115.0000",
    finalizedAt: null,
    journalEntryId: null,
    journalEntry: null,
    allocations: [],
  }),
  "debit-note-finalized": debitNoteVariant("debit-note-finalized", "DN-STATE-FINAL", {
    status: "FINALIZED",
    unappliedAmount: "50.0000",
    allocations: [debitNoteAllocation("debit-note-final-partial-allocation", "debit-note-finalized", "65.0000", "455.0000")],
  }),
  "debit-note-partially-applied": debitNoteVariant("debit-note-partially-applied", "DN-STATE-PARTIAL", {
    status: "FINALIZED",
    unappliedAmount: "50.0000",
    allocations: [debitNoteAllocation("debit-note-partial-allocation", "debit-note-partially-applied", "65.0000", "455.0000")],
  }),
  "debit-note-applied": debitNoteVariant("debit-note-applied", "DN-STATE-APPLIED", {
    status: "FINALIZED",
    unappliedAmount: "0.0000",
    allocations: [debitNoteAllocation("debit-note-applied-allocation", "debit-note-applied", "115.0000", "405.0000")],
  }),
  "debit-note-unapplied": debitNoteVariant("debit-note-unapplied", "DN-STATE-UNAPPLIED", {
    status: "FINALIZED",
    unappliedAmount: "115.0000",
    allocations: [],
  }),
  "debit-note-voided": debitNoteVariant("debit-note-voided", "DN-STATE-VOIDED", {
    status: "VOIDED",
    unappliedAmount: "0.0000",
    allocations: [],
    reversalJournalEntryId: "journal-debit-note-voided-reversal",
    reversalJournalEntry: { id: "journal-debit-note-voided-reversal", entryNumber: "JE-DN-VOID", status: "POSTED" },
  }),
  "debit-note-long-large": debitNoteVariant("debit-note-long-large", "DN-STATE-LONG-LARGE", {
    supplier: visualSuppliers["supplier-long"],
    supplierId: "supplier-long",
    subtotal: "876543.2100",
    taxableTotal: "876543.2100",
    taxTotal: "131481.4800",
    total: "1008024.6900",
    unappliedAmount: "1008024.6900",
    reason: "Extended supplier debit reason covering price protection, returned stock, and manual AP adjustment review",
    notes: "Long local visual note for payables and refund layout review. This does not imply provider automation, bank sync, or production compliance.",
    allocations: [],
  }),
} as const;

function salesInvoiceVariant(id: string, invoiceNumber: string, overrides: Record<string, unknown>) {
  return {
    ...invoice,
    id,
    invoiceNumber,
    paymentAllocations: [],
    paymentUnappliedAllocations: [],
    creditNoteAllocations: [],
    creditNotes: [],
    lines: invoice.lines.map((line) => ({ ...line, id: `${id}-line-1`, invoiceId: id })),
    ...overrides,
  };
}

function invoicePaymentAllocation(id: string, invoiceId: string, amountApplied: string, balanceDue: string) {
  return {
    id,
    paymentId: customerPayment.id,
    invoiceId,
    amountApplied,
    createdAt: fixedVisualDate,
    payment: {
      id: customerPayment.id,
      paymentNumber: customerPayment.paymentNumber,
      paymentDate: customerPayment.paymentDate,
      status: customerPayment.status,
      amountReceived: amountApplied,
      unappliedAmount: "0.0000",
    },
    invoice: { id: invoiceId, invoiceNumber: `INV-${invoiceId.toUpperCase()}`, issueDate: invoice.issueDate, total: invoice.total, balanceDue, status: "FINALIZED" },
  };
}

function purchaseBillVariant(id: string, billNumber: string, overrides: Record<string, unknown>) {
  return {
    ...purchaseBill,
    id,
    billNumber,
    paymentAllocations: [],
    supplierPaymentUnappliedAllocations: [],
    debitNotes: [],
    debitNoteAllocations: [],
    lines: purchaseBill.lines.map((line) => ({ ...line, id: `${id}-line-1`, billId: id })),
    ...overrides,
  };
}

function billPaymentAllocation(id: string, billId: string, amountApplied: string, balanceDue: string) {
  return {
    id,
    paymentId: supplierPayment.id,
    billId,
    amountApplied,
    createdAt: fixedVisualDate,
    payment: {
      id: supplierPayment.id,
      paymentNumber: supplierPayment.paymentNumber,
      paymentDate: supplierPayment.paymentDate,
      status: supplierPayment.status,
      amountPaid: amountApplied,
      unappliedAmount: "0.0000",
    },
    bill: { id: billId, billNumber: `BILL-${billId.toUpperCase()}`, billDate: purchaseBill.billDate, total: purchaseBill.total, balanceDue, status: "FINALIZED" },
  };
}

function customerPaymentVariant(id: string, paymentNumber: string, overrides: Record<string, unknown>) {
  return {
    ...customerPayment,
    id,
    paymentNumber,
    allocations: [],
    unappliedAllocations: [],
    ...overrides,
  };
}

function customerPaymentAllocation(id: string, paymentId: string, invoiceId: string, amountApplied: string, balanceDue: string) {
  return {
    id,
    paymentId,
    invoiceId,
    amountApplied,
    createdAt: fixedVisualDate,
    invoice: { id: invoiceId, invoiceNumber: invoice.invoiceNumber, issueDate: invoice.issueDate, total: invoice.total, balanceDue, status: invoice.status },
  };
}

function supplierPaymentVariant(id: string, paymentNumber: string, overrides: Record<string, unknown>) {
  return {
    ...supplierPayment,
    id,
    paymentNumber,
    allocations: [],
    unappliedAllocations: [],
    ...overrides,
  };
}

function supplierPaymentAllocation(id: string, paymentId: string, billId: string, amountApplied: string, balanceDue: string) {
  return {
    id,
    paymentId,
    billId,
    amountApplied,
    createdAt: fixedVisualDate,
    bill: { id: billId, billNumber: purchaseBill.billNumber, billDate: purchaseBill.billDate, total: purchaseBill.total, balanceDue, status: purchaseBill.status },
  };
}

function creditNoteVariant(id: string, creditNoteNumber: string, overrides: Record<string, unknown>) {
  return {
    ...creditNote,
    id,
    creditNoteNumber,
    lines: creditNote.lines.map((line) => ({ ...line, id: `${id}-line-1`, creditNoteId: id })),
    allocations: [],
    ...overrides,
  };
}

function creditNoteAllocation(id: string, creditNoteId: string, amountApplied: string, invoiceBalanceDue: string) {
  return {
    id,
    creditNoteId,
    invoiceId: invoice.id,
    amountApplied,
    status: "ACTIVE",
    reversedAt: null,
    reversedById: null,
    reversalReason: null,
    createdAt: fixedVisualDate,
    updatedAt: fixedVisualDate,
    invoice: { id: invoice.id, invoiceNumber: invoice.invoiceNumber, issueDate: invoice.issueDate, total: invoice.total, balanceDue: invoiceBalanceDue, status: invoice.status },
  };
}

function debitNoteVariant(id: string, debitNoteNumber: string, overrides: Record<string, unknown>) {
  return {
    ...debitNote,
    id,
    debitNoteNumber,
    lines: debitNote.lines.map((line) => ({ ...line, id: `${id}-line-1`, debitNoteId: id })),
    allocations: [],
    ...overrides,
  };
}

function debitNoteAllocation(id: string, debitNoteId: string, amountApplied: string, billBalanceDue: string) {
  return {
    id,
    debitNoteId,
    billId: purchaseBill.id,
    amountApplied,
    status: "ACTIVE",
    reversedAt: null,
    reversedById: null,
    reversalReason: null,
    createdAt: fixedVisualDate,
    updatedAt: fixedVisualDate,
    bill: { id: purchaseBill.id, billNumber: purchaseBill.billNumber, billDate: purchaseBill.billDate, total: purchaseBill.total, balanceDue: billBalanceDue, status: purchaseBill.status },
  };
}

const stockMovement = {
  id: "stock-movement-1",
  organizationId: org.id,
  itemId: item.id,
  warehouseId: warehouse.id,
  movementDate: "2026-05-14T00:00:00.000Z",
  type: "PURCHASE_RECEIPT_PLACEHOLDER",
  quantity: "12.0000",
  unitCost: "40.0000",
  totalCost: "480.0000",
  referenceType: "PURCHASE_RECEIPT",
  referenceId: "receipt-1",
  description: "Posted purchase receipt",
  createdById: "user-1",
  createdAt: fixedVisualDate,
  updatedAt: fixedVisualDate,
  item,
  warehouse,
  createdBy: { id: "user-1", name: "Visual User", email: "visual@example.test" },
};

const purchaseReceipt = {
  id: "receipt-1",
  organizationId: org.id,
  receiptNumber: "REC-VIS-001",
  purchaseOrderId: null,
  purchaseBillId: purchaseBill.id,
  supplierId: supplier.id,
  warehouseId: warehouse.id,
  receiptDate: "2026-05-14T00:00:00.000Z",
  status: "POSTED",
  notes: "Visual receipt.",
  postedInventoryAssetJournalEntryId: null,
  reverseInventoryAssetJournalEntryId: null,
  voidedAt: null,
  createdById: "user-1",
  createdAt: fixedVisualDate,
  updatedAt: fixedVisualDate,
  supplier,
  warehouse,
  purchaseBill: { id: purchaseBill.id, billNumber: purchaseBill.billNumber, status: purchaseBill.status },
  lines: [
    {
      id: "receipt-line-1",
      organizationId: org.id,
      receiptId: "receipt-1",
      itemId: item.id,
      purchaseOrderLineId: null,
      purchaseBillLineId: "bill-line-1",
      quantity: "12.0000",
      unitCost: "40.0000",
      stockMovementId: stockMovement.id,
      voidStockMovementId: null,
      createdAt: fixedVisualDate,
      updatedAt: fixedVisualDate,
      item,
      purchaseOrderLine: null,
      purchaseBillLine: { id: "bill-line-1", description: "Inventory purchase", quantity: "12.0000", unitPrice: "40.0000" },
      stockMovement,
      voidStockMovement: null,
    },
  ],
};

const adjustment = {
  id: "adjustment-1",
  organizationId: org.id,
  adjustmentNumber: "ADJ-VIS-001",
  itemId: item.id,
  warehouseId: warehouse.id,
  type: "INCREASE",
  status: "APPROVED",
  adjustmentDate: "2026-05-16T00:00:00.000Z",
  quantity: "3.0000",
  unitCost: "40.0000",
  totalCost: "120.0000",
  reason: "Cycle count correction",
  createdById: "user-1",
  approvedById: "user-1",
  voidedById: null,
  approvedAt: fixedVisualDate,
  voidedAt: null,
  stockMovementId: "stock-movement-adjustment-1",
  voidStockMovementId: null,
  createdAt: fixedVisualDate,
  updatedAt: fixedVisualDate,
  item,
  warehouse,
  stockMovement: { id: "stock-movement-adjustment-1", type: "ADJUSTMENT_IN", movementDate: "2026-05-16T00:00:00.000Z", quantity: "3.0000", referenceType: "INVENTORY_ADJUSTMENT", referenceId: "adjustment-1" },
  voidStockMovement: null,
  createdBy: { id: "user-1", name: "Visual User", email: "visual@example.test" },
  approvedBy: { id: "user-1", name: "Visual User", email: "visual@example.test" },
  voidedBy: null,
};

const warehouseTransfer = {
  id: "transfer-1",
  organizationId: org.id,
  transferNumber: "WTR-VIS-001",
  itemId: item.id,
  fromWarehouseId: warehouse.id,
  toWarehouseId: warehouseTwo.id,
  status: "POSTED",
  transferDate: "2026-05-17T00:00:00.000Z",
  quantity: "2.0000",
  unitCost: "40.0000",
  totalCost: "80.0000",
  description: "Move stock for visual QA.",
  createdById: "user-1",
  postedAt: fixedVisualDate,
  voidedAt: null,
  fromStockMovementId: "movement-transfer-out",
  toStockMovementId: "movement-transfer-in",
  voidFromStockMovementId: null,
  voidToStockMovementId: null,
  createdAt: fixedVisualDate,
  updatedAt: fixedVisualDate,
  item,
  fromWarehouse: warehouse,
  toWarehouse: warehouseTwo,
  fromStockMovement: { id: "movement-transfer-out", type: "TRANSFER_OUT", movementDate: "2026-05-17T00:00:00.000Z", quantity: "-2.0000", referenceType: "WAREHOUSE_TRANSFER", referenceId: "transfer-1" },
  toStockMovement: { id: "movement-transfer-in", type: "TRANSFER_IN", movementDate: "2026-05-17T00:00:00.000Z", quantity: "2.0000", referenceType: "WAREHOUSE_TRANSFER", referenceId: "transfer-1" },
  voidFromStockMovement: null,
  voidToStockMovement: null,
  createdBy: { id: "user-1", name: "Visual User", email: "visual@example.test" },
};

const bankTransfer = {
  id: "transfer-1",
  organizationId: org.id,
  transferNumber: "BTR-VIS-001",
  fromBankAccountProfileId: bankAccount.id,
  toBankAccountProfileId: secondBankAccount.id,
  fromAccountId: bankAccount.accountId,
  toAccountId: secondBankAccount.accountId,
  transferDate: "2026-05-20T00:00:00.000Z",
  currency: "SAR",
  status: "POSTED",
  amount: "250.0000",
  description: "Visual bank transfer.",
  journalEntryId: "journal-bank-transfer-1",
  voidReversalJournalEntryId: null,
  postedAt: fixedVisualDate,
  voidedAt: null,
  createdAt: fixedVisualDate,
  updatedAt: fixedVisualDate,
  fromBankAccountProfile: bankAccount,
  toBankAccountProfile: secondBankAccount,
  fromAccount: bankAccount.account,
  toAccount: secondBankAccount.account,
  journalEntry: { id: "journal-bank-transfer-1", entryNumber: "JE-BTR-001", status: "POSTED", totalDebit: "250.0000", totalCredit: "250.0000" },
  voidReversalJournalEntry: null,
};

const customerRefund = {
  id: "customer-refund-1",
  organizationId: org.id,
  refundNumber: "CRF-VIS-001",
  customerId: customer.id,
  sourceType: "CREDIT_NOTE",
  sourcePaymentId: null,
  sourceCreditNoteId: "credit-note-unapplied",
  refundDate: "2026-05-21T00:00:00.000Z",
  currency: "SAR",
  status: "POSTED",
  amountRefunded: "75.0000",
  accountId: bankAccount.accountId,
  description: "Manual customer refund against unapplied credit note. Local visual fixture only.",
  journalEntryId: "journal-customer-refund-1",
  voidReversalJournalEntryId: null,
  postedAt: fixedVisualDate,
  voidedAt: null,
  customer,
  account: bankAccount.account,
  sourcePayment: null,
  sourceCreditNote: {
    id: "credit-note-unapplied",
    creditNoteNumber: "CN-STATE-UNAPPLIED",
    issueDate: creditNote.issueDate,
    status: "FINALIZED",
    total: "115.0000",
    unappliedAmount: "40.0000",
    currency: "SAR",
  },
  journalEntry: { id: "journal-customer-refund-1", entryNumber: "JE-CRF-001", status: "POSTED", totalDebit: "75.0000", totalCredit: "75.0000" },
  voidReversalJournalEntry: null,
};

const supplierRefund = {
  id: "supplier-refund-1",
  organizationId: org.id,
  refundNumber: "SRF-VIS-001",
  supplierId: supplier.id,
  sourceType: "PURCHASE_DEBIT_NOTE",
  sourcePaymentId: null,
  sourceDebitNoteId: "debit-note-unapplied",
  refundDate: "2026-05-21T00:00:00.000Z",
  currency: "SAR",
  status: "POSTED",
  amountRefunded: "85.0000",
  accountId: bankAccount.accountId,
  description: "Manual supplier refund against unapplied debit note. Local visual fixture only.",
  journalEntryId: "journal-supplier-refund-1",
  voidReversalJournalEntryId: null,
  postedAt: fixedVisualDate,
  voidedAt: null,
  supplier,
  account: bankAccount.account,
  sourcePayment: null,
  sourceDebitNote: {
    id: "debit-note-unapplied",
    debitNoteNumber: "DN-STATE-UNAPPLIED",
    issueDate: debitNote.issueDate,
    status: "FINALIZED",
    total: "115.0000",
    unappliedAmount: "30.0000",
    currency: "SAR",
  },
  journalEntry: { id: "journal-supplier-refund-1", entryNumber: "JE-SRF-001", status: "POSTED", totalDebit: "85.0000", totalCredit: "85.0000" },
  voidReversalJournalEntry: null,
};

const customerRefundVoided = {
  ...customerRefund,
  id: "customer-refund-voided",
  refundNumber: "CRF-VIS-VOID",
  status: "VOIDED",
  voidReversalJournalEntryId: "journal-customer-refund-void",
  voidedAt: fixedVisualDate,
  voidReversalJournalEntry: { id: "journal-customer-refund-void", entryNumber: "JE-CRF-VOID", status: "POSTED" },
};

const supplierRefundVoided = {
  ...supplierRefund,
  id: "supplier-refund-voided",
  refundNumber: "SRF-VIS-VOID",
  status: "VOIDED",
  voidReversalJournalEntryId: "journal-supplier-refund-void",
  voidedAt: fixedVisualDate,
  voidReversalJournalEntry: { id: "journal-supplier-refund-void", entryNumber: "JE-SRF-VOID", status: "POSTED" },
};

const collectionCase = {
  id: "collection-case-visual",
  organizationId: org.id,
  caseNumber: "COL-VIS-001",
  customerId: "customer-long",
  salesInvoiceId: "invoice-overdue",
  status: "PROMISED_TO_PAY",
  priority: "HIGH",
  followUpDate: "2026-05-22T00:00:00.000Z",
  promisedPaymentDate: "2026-05-27T00:00:00.000Z",
  promisedAmount: "500.0000",
  assignedToUserId: null,
  lastActivityAt: fixedVisualDate,
  nextActionAt: "2026-05-22T00:00:00.000Z",
  summary: "Follow up on overdue invoice across multiple aging buckets with customer finance team.",
  notes: "Local collection case fixture. It tracks follow-up only and does not send email, create payment links, allocate payments, or post journals.",
  createdById: "user-1",
  updatedById: "user-1",
  createdAt: fixedVisualDate,
  updatedAt: fixedVisualDate,
  customer: visualCustomers["customer-long"],
  salesInvoice: {
    id: "invoice-overdue",
    invoiceNumber: "INV-STATE-OVERDUE",
    customerId: "customer-long",
    issueDate: "2026-04-01T00:00:00.000Z",
    dueDate: "2026-04-15T00:00:00.000Z",
    currency: "SAR",
    status: "FINALIZED",
    total: "1150.0000",
    balanceDue: "1150.0000",
  },
  assignedTo: null,
  createdBy: { id: "user-1", name: "Visual User", email: "visual@example.test" },
  updatedBy: { id: "user-1", name: "Visual User", email: "visual@example.test" },
  activities: [
    {
      id: "collection-activity-1",
      organizationId: org.id,
      collectionCaseId: "collection-case-visual",
      customerId: "customer-long",
      salesInvoiceId: "invoice-overdue",
      activityType: "PROMISE_TO_PAY",
      activityDate: fixedVisualDate,
      note: "Customer promised partial payment after internal approval.",
      nextFollowUpDate: "2026-05-22T00:00:00.000Z",
      promisedPaymentDate: "2026-05-27T00:00:00.000Z",
      promisedAmount: "500.0000",
      createdById: "user-1",
      createdAt: fixedVisualDate,
      createdBy: { id: "user-1", name: "Visual User", email: "visual@example.test" },
    },
  ],
  invoiceSettled: false,
  nonPostingNotice: "Collections records help track follow-up work. They do not post journals, allocate payments, send emails, create payment links, file VAT, call ZATCA, or change invoice balances.",
};

const statementTransactions = [
  {
    id: "statement-row-unmatched",
    organizationId: org.id,
    importId: "statement-import-1",
    bankAccountProfileId: bankAccount.id,
    transactionDate: "2026-05-21T00:00:00.000Z",
    description: "Manual imported customer receipt with long remittance description for visual QA",
    reference: "STM-LONG-001",
    type: "CREDIT",
    amount: "1250.0000",
    status: "UNMATCHED",
    matchedJournalLineId: null,
    matchedJournalEntryId: null,
    matchType: null,
    categorizedAccountId: null,
    createdJournalEntryId: null,
    ignoredReason: null,
    rawData: { bankReference: "BNK-REF-LONG-001", counterparty: "Visual Customer International Holdings and Construction Services Company Limited", currency: "SAR" },
    createdAt: fixedVisualDate,
    updatedAt: fixedVisualDate,
    import: { id: "statement-import-1", filename: "manual-statement.csv", status: "IMPORTED", importedAt: fixedVisualDate },
    bankAccountProfile: bankAccount,
    reconciliationItems: [],
  },
  {
    id: "statement-row-matched",
    organizationId: org.id,
    importId: "statement-import-1",
    bankAccountProfileId: bankAccount.id,
    transactionDate: "2026-05-20T00:00:00.000Z",
    description: "Matched supplier payment clearing row",
    reference: "STM-MATCH-001",
    type: "DEBIT",
    amount: "250.0000",
    status: "MATCHED",
    matchedJournalLineId: "journal-line-bank-transfer",
    matchedJournalEntryId: "journal-bank-transfer-1",
    matchType: "MANUAL",
    categorizedAccountId: null,
    createdJournalEntryId: null,
    ignoredReason: null,
    rawData: { bankReference: "BNK-REF-MATCH-001", counterparty: "Visual Supplier", currency: "SAR" },
    createdAt: fixedVisualDate,
    updatedAt: fixedVisualDate,
    import: { id: "statement-import-1", filename: "manual-statement.csv", status: "IMPORTED", importedAt: fixedVisualDate },
    bankAccountProfile: bankAccount,
    matchedJournalEntry: { id: "journal-bank-transfer-1", entryNumber: "JE-BTR-001", entryDate: bankTransfer.transferDate, description: bankTransfer.description, reference: bankTransfer.transferNumber },
    reconciliationItems: [],
  },
  {
    id: "statement-row-ignored",
    organizationId: org.id,
    importId: "statement-import-1",
    bankAccountProfileId: bankAccount.id,
    transactionDate: "2026-05-19T00:00:00.000Z",
    description: "Duplicate manual statement export row",
    reference: "STM-IGNORE-001",
    type: "DEBIT",
    amount: "25.0000",
    status: "IGNORED",
    matchedJournalLineId: null,
    matchedJournalEntryId: null,
    matchType: null,
    categorizedAccountId: null,
    createdJournalEntryId: null,
    ignoredReason: "Duplicate row from manual CSV export.",
    rawData: { bankReference: "BNK-REF-IGNORE-001", counterparty: "Visual Bank", currency: "SAR" },
    createdAt: fixedVisualDate,
    updatedAt: fixedVisualDate,
    import: { id: "statement-import-1", filename: "manual-statement.csv", status: "IMPORTED", importedAt: fixedVisualDate },
    bankAccountProfile: bankAccount,
    reconciliationItems: [],
  },
];

const reconciliation = {
  id: "rec-1",
  organizationId: org.id,
  bankAccountProfileId: bankAccount.id,
  reconciliationNumber: "REC-VIS-001",
  periodStart: "2026-05-01T00:00:00.000Z",
  periodEnd: "2026-05-21T00:00:00.000Z",
  statementOpeningBalance: "1000.0000",
  statementClosingBalance: "1250.0000",
  ledgerClosingBalance: "1250.0000",
  difference: "0.0000",
  status: "DRAFT",
  notes: "Manual reconciliation review fixture. No automatic reconciliation is enabled.",
  createdById: "user-1",
  submittedById: null,
  approvedById: null,
  reopenedById: null,
  closedById: null,
  voidedById: null,
  submittedAt: null,
  approvedAt: null,
  reopenedAt: null,
  closedAt: null,
  voidedAt: null,
  approvalNotes: null,
  reopenReason: null,
  createdAt: fixedVisualDate,
  updatedAt: fixedVisualDate,
  unmatchedTransactionCount: 1,
  bankAccountProfile: bankAccount,
  createdBy: { id: "user-1", name: "Visual User", email: "visual@example.test" },
  submittedBy: null,
  approvedBy: null,
  reopenedBy: null,
  closedBy: null,
  voidedBy: null,
  _count: { items: 2 },
};

const cheques = [
  {
    id: "cheque-received",
    organizationId: org.id,
    chequeType: "RECEIVED",
    status: "RECEIVED",
    bankAccountProfileId: bankAccount.id,
    depositBatchId: null,
    statementTransactionId: null,
    counterpartyType: "CUSTOMER",
    counterpartyId: "customer-long",
    counterpartyName: "Visual Customer International Holdings and Construction Services Company Limited",
    chequeNumber: "CHQ-REC-LONG-001",
    drawerBankName: "Visual Drawer Bank",
    payeeName: "LedgerByte Visual Co LLC",
    issueDate: "2026-05-18T00:00:00.000Z",
    receivedDate: "2026-05-19T00:00:00.000Z",
    dueDate: "2026-05-25T00:00:00.000Z",
    depositDate: null,
    clearedDate: null,
    bouncedDate: null,
    voidedDate: null,
    amount: "120000.0000",
    currency: "SAR",
    reference: "Manual cheque fixture",
    memo: "Long payee and amount layout check. Operational-only fixture.",
    bounceReason: null,
    voidReason: null,
    postedJournalEntryId: null,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: fixedVisualDate,
    updatedAt: fixedVisualDate,
    bankAccountProfile: bankAccount,
    depositBatch: null,
    statementTransaction: null,
    createdBy: { id: "user-1", name: "Visual User", email: "visual@example.test" },
    updatedBy: { id: "user-1", name: "Visual User", email: "visual@example.test" },
    postedJournalEntry: null,
  },
  {
    id: "cheque-cleared",
    organizationId: org.id,
    chequeType: "ISSUED",
    status: "CLEARED",
    bankAccountProfileId: bankAccount.id,
    depositBatchId: null,
    statementTransactionId: "statement-row-matched",
    counterpartyType: "SUPPLIER",
    counterpartyId: supplier.id,
    counterpartyName: supplier.displayName,
    chequeNumber: "CHQ-ISS-001",
    drawerBankName: "Visual Bank",
    payeeName: supplier.displayName,
    issueDate: "2026-05-10T00:00:00.000Z",
    receivedDate: null,
    dueDate: "2026-05-20T00:00:00.000Z",
    depositDate: null,
    clearedDate: "2026-05-20T00:00:00.000Z",
    bouncedDate: null,
    voidedDate: null,
    amount: "250.0000",
    currency: "SAR",
    reference: "Cleared manual cheque",
    memo: "Matched to manual statement row.",
    bounceReason: null,
    voidReason: null,
    postedJournalEntryId: null,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: fixedVisualDate,
    updatedAt: fixedVisualDate,
    bankAccountProfile: bankAccount,
    depositBatch: null,
    statementTransaction: statementTransactions[1],
    createdBy: { id: "user-1", name: "Visual User", email: "visual@example.test" },
    updatedBy: { id: "user-1", name: "Visual User", email: "visual@example.test" },
    postedJournalEntry: null,
  },
  {
    id: "cheque-voided",
    organizationId: org.id,
    chequeType: "ISSUED",
    status: "VOIDED",
    bankAccountProfileId: bankAccount.id,
    depositBatchId: null,
    statementTransactionId: null,
    counterpartyType: "OTHER",
    counterpartyId: null,
    counterpartyName: "Voided Payee",
    chequeNumber: "CHQ-VOID-001",
    drawerBankName: "Visual Bank",
    payeeName: "Voided Payee",
    issueDate: "2026-05-08T00:00:00.000Z",
    receivedDate: null,
    dueDate: "2026-05-18T00:00:00.000Z",
    depositDate: null,
    clearedDate: null,
    bouncedDate: null,
    voidedDate: "2026-05-19T00:00:00.000Z",
    amount: "300.0000",
    currency: "SAR",
    reference: "Voided manual cheque",
    memo: "Voided status visual fixture.",
    bounceReason: null,
    voidReason: "Incorrect payee.",
    postedJournalEntryId: null,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: fixedVisualDate,
    updatedAt: fixedVisualDate,
    bankAccountProfile: bankAccount,
    depositBatch: null,
    statementTransaction: null,
    createdBy: { id: "user-1", name: "Visual User", email: "visual@example.test" },
    updatedBy: { id: "user-1", name: "Visual User", email: "visual@example.test" },
    postedJournalEntry: null,
  },
];

const generatedDocuments = [
  {
    id: "generated-document-1",
    organizationId: org.id,
    documentType: "CUSTOMER_STATEMENT",
    sourceType: "CustomerStatement",
    sourceId: customer.id,
    documentNumber: "STMT-CUST-001",
    filename: "customer-statement-visual.pdf",
    mimeType: "application/pdf",
    sizeBytes: 3584,
    status: "GENERATED",
    storageProvider: "DATABASE",
    generatedAt: fixedVisualDate,
    createdById: "user-1",
    createdAt: fixedVisualDate,
    updatedAt: fixedVisualDate,
  },
  {
    id: "generated-document-2",
    organizationId: org.id,
    documentType: "SUPPLIER_STATEMENT",
    sourceType: "SupplierStatement",
    sourceId: supplier.id,
    documentNumber: "STMT-SUP-001",
    filename: "supplier-statement-visual.pdf",
    mimeType: "application/pdf",
    sizeBytes: 3712,
    status: "GENERATED",
    storageProvider: "DATABASE",
    generatedAt: fixedVisualDate,
    createdById: "user-1",
    createdAt: fixedVisualDate,
    updatedAt: fixedVisualDate,
  },
];

export async function installVisualApiMocks(page: Page, options: VisualFixtureOptions = {}) {
  const roleProfile = options.roleProfile ?? "Owner";
  await page.route(`${visualApiUrl}/**`, (route) => fulfillApiRoute(route, roleProfile));
  await page.route("**/favicon.ico", (route) => route.fulfill({ status: 204, body: "" }));
}

export async function primeVisualSession(page: Page, options: VisualFixtureOptions = {}) {
  const roleProfile = options.roleProfile ?? "Owner";
  await page.addInitScript(
    ({ fixedNow, roleName }) => {
      const fixedTimestamp = Date.parse(fixedNow);
      const OriginalDate = Date;
      class FixedDate extends OriginalDate {
        constructor(...args: ConstructorParameters<DateConstructor>) {
          super(...(args.length ? args : [fixedTimestamp]));
        }

        static now() {
          return fixedTimestamp;
        }
      }
      window.Date = FixedDate as DateConstructor;
      window.localStorage.setItem("ledgerbyte.accessToken", "visual-token");
      window.localStorage.setItem("ledgerbyte.activeOrganizationId", "org-visual");
      window.localStorage.setItem("ledgerbyte.visualRoleProfile", roleName);
    },
    { fixedNow: fixedVisualDate, roleName: roleProfile },
  );
}

function fulfillApiRoute(route: Route, roleProfile: VisualRoleProfileName) {
  const url = new URL(route.request().url());
  const response = visualApiResponse(url.pathname, url.searchParams, roleProfile);
  if (!response) {
    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: `No visual fixture for ${url.pathname}` }),
    });
  }

  return route.fulfill({
    status: response.status ?? 200,
    contentType: response.contentType ?? "application/json",
    body: response.body ?? JSON.stringify(response.payload),
  });
}

function visualApiResponse(pathname: string, searchParams: URLSearchParams, roleProfile: VisualRoleProfileName): MockResponse | null {
  if (pathname === "/auth/me") {
    const role = visualRoleProfiles[roleProfile];
    return json({
      id: "user-1",
      email: `${role.name.toLowerCase()}-visual@example.test`,
      name: `${role.name} Visual Tester`,
      memberships: [
        {
          id: "membership-1",
          status: "ACTIVE",
          organization: org,
          role: { id: role.id, name: role.name, permissions: role.permissions },
        },
      ],
    });
  }

  if (pathname === "/dashboard/onboarding-checklist") {
    return json(checklist());
  }
  if (pathname === "/dashboard/summary") {
    return json(dashboardSummary());
  }
  if (pathname === "/organizations/org-visual") {
    return json(organizationProfile());
  }
  if (pathname === "/organization-members") {
    return json(organizationMembers());
  }
  if (pathname === "/roles") {
    return json(roles());
  }
  if (pathname === "/contacts") {
    return json([customer, supplier]);
  }
  if (pathname === "/contacts/customers") {
    return json([customerPartySummary()]);
  }
  const customerDetailMatch = pathname.match(/^\/contacts\/customers\/([^/]+)$/);
  if (customerDetailMatch) {
    return json(customerPartyDetail(customerDetailMatch[1] as keyof typeof visualCustomers));
  }
  if (pathname === "/contacts/suppliers") {
    return json([supplierPartySummary()]);
  }
  const supplierDetailMatch = pathname.match(/^\/contacts\/suppliers\/([^/]+)$/);
  if (supplierDetailMatch) {
    return json(supplierPartyDetail(supplierDetailMatch[1] as keyof typeof visualSuppliers));
  }
  if (pathname.match(/^\/contacts\/suppliers\/supplier-[^/]+\/ap-summary$/)) {
    return json(supplierApSummary());
  }
  const contactCustomerMatch = pathname.match(/^\/contacts\/(customer-[^/]+)$/);
  if (contactCustomerMatch) {
    return json(visualCustomers[contactCustomerMatch[1] as keyof typeof visualCustomers] ?? customer);
  }
  const contactSupplierMatch = pathname.match(/^\/contacts\/(supplier-[^/]+)$/);
  if (contactSupplierMatch) {
    return json(visualSuppliers[contactSupplierMatch[1] as keyof typeof visualSuppliers] ?? supplier);
  }
  const customerLedgerMatch = pathname.match(/^\/contacts\/(customer-[^/]+)\/ledger$/);
  if (customerLedgerMatch) {
    return json(customerLedger(customerLedgerMatch[1] as keyof typeof visualCustomers));
  }
  const supplierLedgerMatch = pathname.match(/^\/contacts\/(supplier-[^/]+)\/supplier-ledger$/);
  if (supplierLedgerMatch) {
    return json(supplierLedger(supplierLedgerMatch[1] as keyof typeof visualSuppliers));
  }
  const customerStatementMatch = pathname.match(/^\/contacts\/(customer-[^/]+)\/statement$/);
  if (customerStatementMatch) {
    return json({ ...customerLedger(customerStatementMatch[1] as keyof typeof visualCustomers), periodFrom: searchParams.get("from"), periodTo: searchParams.get("to") });
  }
  const supplierStatementMatch = pathname.match(/^\/contacts\/(supplier-[^/]+)\/supplier-statement$/);
  if (supplierStatementMatch) {
    return json({ ...supplierLedger(supplierStatementMatch[1] as keyof typeof visualSuppliers), periodFrom: searchParams.get("from"), periodTo: searchParams.get("to") });
  }
  if (pathname === "/sales-invoices") {
    return json(Object.values(salesInvoiceVariants));
  }
  if (pathname === "/sales-invoices/next-number") {
    return json({
      invoiceNumber: "INV-VIS-002",
      editable: false,
      overrideAllowed: false,
      helperText: "Preview only. The invoice number is assigned from the local visual sequence when the draft is saved.",
    });
  }
  if (pathname === "/sales-invoices/open") {
    return json(Object.values(salesInvoiceVariants).filter((candidate) => candidate.status === "FINALIZED" && Number(candidate.balanceDue) > 0).map(openInvoiceSummary));
  }
  const salesInvoiceStockMatch = pathname.match(/^\/sales-invoices\/([^/]+)\/stock-issue-status$/);
  if (salesInvoiceStockMatch) {
    const detail = salesInvoiceById(salesInvoiceStockMatch[1]);
    return json({ sourceId: detail.id, sourceNumber: detail.invoiceNumber, sourceStatus: detail.status, issueStatus: "PARTIAL", issuedQuantity: "1.0000", remainingQuantity: "0.0000", lines: [] });
  }
  if (pathname.match(/^\/sales-invoices\/[^/]+\/zatca/)) {
    return json(zatcaSafeFixture(pathname));
  }
  const salesInvoiceDetailMatch = pathname.match(/^\/sales-invoices\/([^/]+)$/);
  if (salesInvoiceDetailMatch) {
    return json(salesInvoiceById(salesInvoiceDetailMatch[1]));
  }
  if (pathname === "/customer-payments") {
    return json(Object.values(customerPaymentVariants));
  }
  const customerPaymentReceiptMatch = pathname.match(/^\/customer-payments\/([^/]+)\/receipt-data$/);
  if (customerPaymentReceiptMatch) {
    return json(customerPaymentReceiptData(customerPaymentById(customerPaymentReceiptMatch[1])));
  }
  const customerPaymentDetailMatch = pathname.match(/^\/customer-payments\/([^/]+)$/);
  if (customerPaymentDetailMatch) {
    return json(customerPaymentById(customerPaymentDetailMatch[1]));
  }
  if (pathname === "/reports/aged-receivables") {
    return json(agingReport("receivables"));
  }
  if (pathname === "/reports/aged-payables") {
    return json(agingReport("payables"));
  }
  if (pathname === "/reports/general-ledger") {
    return json(generalLedgerReport());
  }
  if (pathname === "/reports/trial-balance") {
    return json(trialBalanceReport());
  }
  if (pathname === "/credit-notes") {
    return json(Object.values(creditNoteVariants));
  }
  const creditNoteDetailMatch = pathname.match(/^\/credit-notes\/([^/]+)$/);
  if (creditNoteDetailMatch) {
    return json(creditNoteById(creditNoteDetailMatch[1]));
  }
  if (pathname === "/customer-refunds") {
    return json(customerRefunds());
  }
  if (pathname === "/customer-refunds/refundable-sources") {
    return json({
      customer: visualCustomers["customer-long"],
      payments: [
        {
          id: "payment-unallocated",
          paymentNumber: "PAY-STATE-UNAPPLIED",
          paymentDate: customerPayment.paymentDate,
          currency: "SAR",
          status: "POSTED",
          amountReceived: "300.0000",
          unappliedAmount: "300.0000",
        },
      ],
      creditNotes: [
        {
          id: "credit-note-unapplied",
          creditNoteNumber: "CN-STATE-UNAPPLIED",
          issueDate: creditNote.issueDate,
          currency: "SAR",
          status: "FINALIZED",
          total: "115.0000",
          unappliedAmount: "115.0000",
        },
      ],
    });
  }
  const customerRefundPdfMatch = pathname.match(/^\/customer-refunds\/([^/]+)\/pdf-data$/);
  if (customerRefundPdfMatch) {
    return json(customerRefundPdfData(customerRefundById(customerRefundPdfMatch[1])));
  }
  const customerRefundDetailMatch = pathname.match(/^\/customer-refunds\/([^/]+)$/);
  if (customerRefundDetailMatch) {
    return json(customerRefundById(customerRefundDetailMatch[1]));
  }
  if (pathname === "/purchase-bills") {
    return json(Object.values(purchaseBillVariants));
  }
  if (pathname === "/purchase-bills/open") {
    return json(Object.values(purchaseBillVariants).filter((candidate) => candidate.status === "FINALIZED" && Number(candidate.balanceDue) > 0).map(openBillSummary));
  }
  const purchaseBillReceivingMatch = pathname.match(/^\/purchase-bills\/([^/]+)\/receiving-status$/);
  if (purchaseBillReceivingMatch) {
    const detail = purchaseBillById(purchaseBillReceivingMatch[1]);
    return json({
      sourceId: detail.id,
      sourceNumber: detail.billNumber,
      sourceStatus: detail.status,
      status: "PARTIALLY_RECEIVED",
      receivedQuantity: "12.0000",
      remainingQuantity: "0.0000",
      lines: [],
    });
  }
  const purchaseBillMatchingMatch = pathname.match(/^\/purchase-bills\/([^/]+)\/receipt-matching-status$/);
  if (purchaseBillMatchingMatch) {
    const detail = purchaseBillById(purchaseBillMatchingMatch[1]);
    return json({
      sourceId: detail.id,
      sourceNumber: detail.billNumber,
      status: "PARTIALLY_RECEIVED",
      bill: { status: detail.status, inventoryPostingMode: detail.inventoryPostingMode },
      receiptCount: 1,
      receiptValue: "480.0000",
      billTotal: detail.total,
      warnings: [],
      lines: [],
    });
  }
  if (pathname.match(/^\/purchase-bills\/[^/]+\/accounting-preview$/)) {
    return json(accountingPreview("PurchaseBill"));
  }
  const purchaseBillDetailMatch = pathname.match(/^\/purchase-bills\/([^/]+)$/);
  if (purchaseBillDetailMatch) {
    return json(purchaseBillById(purchaseBillDetailMatch[1]));
  }
  if (pathname === "/supplier-payments") {
    return json(Object.values(supplierPaymentVariants));
  }
  const supplierPaymentReceiptMatch = pathname.match(/^\/supplier-payments\/([^/]+)\/receipt-data$/);
  if (supplierPaymentReceiptMatch) {
    return json(supplierPaymentReceiptData(supplierPaymentById(supplierPaymentReceiptMatch[1])));
  }
  const supplierPaymentDetailMatch = pathname.match(/^\/supplier-payments\/([^/]+)$/);
  if (supplierPaymentDetailMatch) {
    return json(supplierPaymentById(supplierPaymentDetailMatch[1]));
  }
  if (pathname === "/purchase-debit-notes") {
    return json(Object.values(debitNoteVariants));
  }
  const debitNoteDetailMatch = pathname.match(/^\/purchase-debit-notes\/([^/]+)$/);
  if (debitNoteDetailMatch) {
    return json(debitNoteById(debitNoteDetailMatch[1]));
  }
  if (pathname === "/supplier-refunds") {
    return json(supplierRefunds());
  }
  if (pathname === "/supplier-refunds/refundable-sources") {
    return json({
      supplier: visualSuppliers["supplier-long"],
      payments: [
        {
          id: "supplier-payment-unallocated",
          paymentNumber: "SPAY-STATE-UNAPPLIED",
          paymentDate: supplierPayment.paymentDate,
          currency: "SAR",
          status: "POSTED",
          amountPaid: "300.0000",
          unappliedAmount: "300.0000",
        },
      ],
      debitNotes: [
        {
          id: "debit-note-unapplied",
          debitNoteNumber: "DN-STATE-UNAPPLIED",
          issueDate: debitNote.issueDate,
          currency: "SAR",
          status: "FINALIZED",
          total: "115.0000",
          unappliedAmount: "115.0000",
        },
      ],
    });
  }
  const supplierRefundPdfMatch = pathname.match(/^\/supplier-refunds\/([^/]+)\/pdf-data$/);
  if (supplierRefundPdfMatch) {
    return json(supplierRefundPdfData(supplierRefundById(supplierRefundPdfMatch[1])));
  }
  const supplierRefundDetailMatch = pathname.match(/^\/supplier-refunds\/([^/]+)$/);
  if (supplierRefundDetailMatch) {
    return json(supplierRefundById(supplierRefundDetailMatch[1]));
  }
  if (pathname === "/collections/summary") {
    return json(collectionSummary());
  }
  if (pathname === "/collections") {
    return json([collectionCase]);
  }
  const collectionDetailMatch = pathname.match(/^\/collections\/([^/]+)$/);
  if (collectionDetailMatch) {
    return json(collectionCase);
  }
  if (pathname.match(/^\/collections\/customer\/[^/]+$/)) {
    return json([collectionCase]);
  }
  if (pathname === "/bank-accounts") {
    return json([bankAccount, secondBankAccount, negativeBankAccount, inactiveBankAccount]);
  }
  const bankAccountDetailMatch = pathname.match(/^\/bank-accounts\/([^/]+)$/);
  if (bankAccountDetailMatch) {
    return json(bankAccountById(bankAccountDetailMatch[1]));
  }
  if (pathname === "/bank-accounts/bank-1/transactions") {
    return json(bankAccountTransactions());
  }
  if (pathname === "/bank-accounts/bank-1/statement-transactions") {
    return json(statementTransactions);
  }
  if (pathname === "/bank-accounts/bank-1/statement-imports") {
    return json([statementImport()]);
  }
  if (pathname === "/bank-accounts/bank-1/reconciliation-summary") {
    return json(reconciliationSummary());
  }
  if (pathname === "/bank-accounts/bank-1/reconciliations") {
    return json([reconciliation, { ...reconciliation, id: "rec-closed", reconciliationNumber: "REC-VIS-CLOSED", status: "CLOSED", closedAt: fixedVisualDate, unmatchedTransactionCount: 0 }]);
  }
  const bankReconciliationItemsMatch = pathname.match(/^\/bank-reconciliations\/([^/]+)\/items$/);
  if (bankReconciliationItemsMatch) {
    return json(reconciliationItems());
  }
  const bankReconciliationEventsMatch = pathname.match(/^\/bank-reconciliations\/([^/]+)\/review-events$/);
  if (bankReconciliationEventsMatch) {
    return json(reconciliationReviewEvents());
  }
  const bankReconciliationReportMatch = pathname.match(/^\/bank-reconciliations\/([^/]+)\/report-data$/);
  if (bankReconciliationReportMatch) {
    return json(reconciliationReportData());
  }
  const bankReconciliationDetailMatch = pathname.match(/^\/bank-reconciliations\/([^/]+)$/);
  if (bankReconciliationDetailMatch) {
    return json(reconciliation);
  }
  const statementTransactionCandidatesMatch = pathname.match(/^\/bank-statement-transactions\/([^/]+)\/match-candidates$/);
  if (statementTransactionCandidatesMatch) {
    return json(statementMatchCandidates());
  }
  const statementTransactionDetailMatch = pathname.match(/^\/bank-statement-transactions\/([^/]+)$/);
  if (statementTransactionDetailMatch) {
    return json(statementTransactionById(statementTransactionDetailMatch[1]));
  }
  if (pathname === "/cheques") {
    return json(cheques);
  }
  if (pathname === "/bank-transfers/transfer-1") {
    return json(bankTransfer);
  }
  if (pathname === "/attachments") {
    return json([]);
  }
  if (pathname === "/items") {
    return json([item]);
  }
  if (pathname === "/accounts") {
    return json([
      bankAccount.account,
      { id: "sales-account-1", code: "4010", name: "Sales", type: "REVENUE", allowPosting: true, isActive: true },
      { id: "purchase-account-1", code: "5010", name: "Purchases", type: "EXPENSE", allowPosting: true, isActive: true },
      { id: "ap-account-1", code: "2010", name: "Accounts payable", type: "LIABILITY", allowPosting: true, isActive: true },
      { id: "vat-receivable-1", code: "1410", name: "VAT receivable", type: "ASSET", allowPosting: true, isActive: true },
    ]);
  }
  if (pathname === "/tax-rates") {
    return json([{ id: "tax-1", name: "VAT 15%", rate: "15.0000", scope: "BOTH", category: "STANDARD", isActive: true }]);
  }
  if (pathname === "/branches") {
    return json([]);
  }
  if (pathname === "/inventory/balances") {
    return json([inventoryBalance()]);
  }
  if (pathname === "/warehouses") {
    return json([warehouse, warehouseTwo]);
  }
  if (pathname === "/warehouses/warehouse-1") {
    return json(warehouse);
  }
  if (pathname === "/warehouses/warehouse-1/stock-movements") {
    return json([stockMovement]);
  }
  if (pathname === "/stock-movements") {
    return json([stockMovement]);
  }
  if (pathname === "/purchase-receipts/receipt-1") {
    return json(purchaseReceipt);
  }
  if (pathname === "/purchase-receipts/receipt-1/accounting-preview") {
    return json(purchaseReceiptAccountingPreview());
  }
  if (pathname === "/inventory/reports/clearing-reconciliation") {
    return json({ generatedAt: fixedVisualDate, rows: [], totals: { receiptCount: 0, billCount: 0, varianceAmount: "0.0000" }, warnings: [] });
  }
  if (pathname === "/inventory-adjustments/adjustment-1") {
    return json(adjustment);
  }
  if (pathname === "/inventory-adjustments") {
    return json([adjustment]);
  }
  if (pathname === "/warehouse-transfers/transfer-1") {
    return json(warehouseTransfer);
  }
  if (pathname === "/warehouse-transfers") {
    return json([warehouseTransfer]);
  }
  if (pathname === "/inventory/reports/stock-valuation") {
    return json(stockValuationReport());
  }
  if (pathname === "/generated-documents") {
    return json(generatedDocuments);
  }
  if (pathname === "/organization-document-settings") {
    return json(documentSettings());
  }
  if (pathname === "/number-sequences") {
    return json(numberSequences());
  }
  if (pathname === "/compliance/readiness") {
    return json(complianceReadiness());
  }
  if (pathname === "/storage/readiness") {
    return json(storageReadiness());
  }
  if (pathname === "/storage/migration-plan") {
    return json(storageMigrationPlan());
  }
  if (pathname === "/system/backup-readiness") {
    return json(backupReadiness());
  }
  if (pathname === "/system/restore-drill-plan") {
    return json(restoreDrillPlan());
  }
  if (pathname === "/system/backup-evidence") {
    return json({
      metadataOnly: true,
      noBackupExecuted: true,
      noRestoreExecuted: true,
      noSecretsReturned: true,
      evidence: [],
    });
  }

  return null;
}

function salesInvoiceById(id: string) {
  return salesInvoiceVariants[id as keyof typeof salesInvoiceVariants] ?? invoice;
}

function purchaseBillById(id: string) {
  return purchaseBillVariants[id as keyof typeof purchaseBillVariants] ?? purchaseBill;
}

function customerPaymentById(id: string) {
  return customerPaymentVariants[id as keyof typeof customerPaymentVariants] ?? customerPayment;
}

function supplierPaymentById(id: string) {
  return supplierPaymentVariants[id as keyof typeof supplierPaymentVariants] ?? supplierPayment;
}

function creditNoteById(id: string) {
  return creditNoteVariants[id as keyof typeof creditNoteVariants] ?? creditNote;
}

function debitNoteById(id: string) {
  return debitNoteVariants[id as keyof typeof debitNoteVariants] ?? debitNote;
}

function customerRefunds() {
  return [customerRefund, customerRefundVoided];
}

function customerRefundById(id: string) {
  return customerRefunds().find((refund) => refund.id === id) ?? customerRefund;
}

function supplierRefunds() {
  return [supplierRefund, supplierRefundVoided];
}

function supplierRefundById(id: string) {
  return supplierRefunds().find((refund) => refund.id === id) ?? supplierRefund;
}

function bankAccountById(id: string) {
  return [bankAccount, secondBankAccount, negativeBankAccount, inactiveBankAccount].find((profile) => profile.id === id) ?? bankAccount;
}

function openInvoiceSummary(candidate: (typeof salesInvoiceVariants)[keyof typeof salesInvoiceVariants]) {
  return {
    id: candidate.id,
    invoiceNumber: candidate.invoiceNumber,
    customerId: candidate.customerId,
    issueDate: candidate.issueDate,
    dueDate: candidate.dueDate,
    currency: candidate.currency,
    total: candidate.total,
    balanceDue: candidate.balanceDue,
    status: candidate.status,
  };
}

function openBillSummary(candidate: (typeof purchaseBillVariants)[keyof typeof purchaseBillVariants]) {
  return {
    id: candidate.id,
    billNumber: candidate.billNumber,
    supplierId: candidate.supplierId,
    billDate: candidate.billDate,
    dueDate: candidate.dueDate,
    currency: candidate.currency,
    total: candidate.total,
    balanceDue: candidate.balanceDue,
    status: candidate.status,
  };
}

function organizationProfile() {
  return {
    ...org,
    tradeLicenseNumber: "VISUAL-LICENSE-1",
    uaeTrn: "100000000000003",
    uaeTin: "TIN-ORG-1",
    uaeVatRegistrationStatus: "REGISTERED",
    uaeAddressLine1: "Visual local readiness office",
    uaeAddressLine2: "Local fixture district",
    uaeEmirate: "Dubai",
    uaeBusinessActivity: "Accounting software testing",
    peppolParticipantId: "0235:300000000000003",
    uaeAspSelected: "Not selected",
    uaeAspOnboardingStatus: "ASP validation not connected",
    createdAt: fixedVisualDate,
    updatedAt: fixedVisualDate,
  };
}

function roles() {
  return Object.values(visualRoleProfiles).map((role) => ({
    id: role.id,
    organizationId: org.id,
    name: role.name,
    permissions: role.permissions,
    isSystem: true,
    memberCount: role.name === "Owner" ? 1 : 0,
    createdAt: fixedVisualDate,
    updatedAt: fixedVisualDate,
  }));
}

function organizationMembers() {
  const ownerRole = visualRoleProfiles.Owner;
  return [
    {
      id: "membership-1",
      organizationId: org.id,
      userId: "user-1",
      roleId: ownerRole.id,
      status: "ACTIVE",
      createdAt: fixedVisualDate,
      updatedAt: fixedVisualDate,
      user: {
        id: "user-1",
        email: "owner-visual@example.test",
        name: "Owner Visual Tester",
      },
      role: {
        id: ownerRole.id,
        name: ownerRole.name,
        permissions: ownerRole.permissions,
        isSystem: true,
      },
    },
  ];
}

function customerPartySummary() {
  return {
    contact: customer,
    openReceivableBalance: "650.0000",
    overdueReceivableBalance: "0.0000",
    lastTransactionDate: customerPayment.paymentDate,
  };
}

function supplierPartySummary() {
  return {
    contact: supplier,
    openPayableBalance: "405.0000",
    overduePayableBalance: "0.0000",
    lastTransactionDate: supplierPayment.paymentDate,
  };
}

function customerPartyDetail(id: keyof typeof visualCustomers = "customer-1") {
  const detailCustomer = visualCustomers[id] ?? customer;
  const state = contactStateFromId(id);
  const transactions =
    state === "empty" || state === "inactive"
      ? []
      : [
          partyTransaction("party-invoice-1", "SalesInvoice", invoice.id, invoice.issueDate, invoice.dueDate, "Sales invoice", invoice.invoiceNumber, invoice.subtotal, invoice.taxTotal, invoice.total, invoice.balanceDue, invoice.status),
          partyTransaction("party-payment-1", "CustomerPayment", customerPayment.id, customerPayment.paymentDate, null, "Customer payment", customerPayment.paymentNumber, "0.0000", "0.0000", customerPayment.amountReceived, "0.0000", customerPayment.status),
          partyTransaction("party-credit-note-1", "CreditNote", creditNote.id, creditNote.issueDate, null, "Credit note", creditNote.creditNoteNumber, creditNote.subtotal, creditNote.taxTotal, creditNote.total, creditNote.unappliedAmount, creditNote.status),
        ];

  return {
    contact: detailCustomer,
    openReceivableBalance: transactions.length > 0 ? "650.0000" : "0.0000",
    overdueReceivableBalance: "0.0000",
    lastTransactionDate: transactions.length > 0 ? customerPayment.paymentDate : null,
    notes: "Local authenticated visual fixture. No hosted/customer data is used.",
    transactions,
  };
}

function supplierPartyDetail(id: keyof typeof visualSuppliers = "supplier-1") {
  const detailSupplier = visualSuppliers[id] ?? supplier;
  const state = contactStateFromId(id);
  const transactions =
    state === "empty" || state === "inactive"
      ? []
      : [
          partyTransaction("party-bill-1", "PurchaseBill", purchaseBill.id, purchaseBill.billDate, purchaseBill.dueDate, "Purchase bill", purchaseBill.billNumber, purchaseBill.subtotal, purchaseBill.taxTotal, purchaseBill.total, purchaseBill.balanceDue, purchaseBill.status),
          partyTransaction("party-supplier-payment-1", "SupplierPayment", supplierPayment.id, supplierPayment.paymentDate, null, "Supplier payment", supplierPayment.paymentNumber, "0.0000", "0.0000", supplierPayment.amountPaid, "0.0000", supplierPayment.status),
          partyTransaction("party-debit-note-1", "PurchaseDebitNote", debitNote.id, debitNote.issueDate, null, "Debit note", debitNote.debitNoteNumber, debitNote.subtotal, debitNote.taxTotal, debitNote.total, debitNote.unappliedAmount, debitNote.status),
        ];

  return {
    contact: detailSupplier,
    openPayableBalance: transactions.length > 0 ? "405.0000" : "0.0000",
    overduePayableBalance: "0.0000",
    lastTransactionDate: transactions.length > 0 ? supplierPayment.paymentDate : null,
    paymentNotes: "Local authenticated visual fixture. Supplier payment details are mocked read-only.",
    transactions,
  };
}

function contactStateFromId(id: string): CustomerDetailState | SupplierDetailState {
  if (id.includes("empty")) {
    return "empty";
  }
  if (id.includes("inactive")) {
    return "inactive";
  }
  if (id.includes("long")) {
    return "long";
  }
  return "open";
}

function partyTransaction(
  id: string,
  sourceType: string,
  sourceId: string,
  date: string,
  dueDate: string | null,
  type: string,
  transactionNumber: string,
  subtotal: string,
  taxAmount: string,
  total: string,
  balanceDue: string,
  status: string,
) {
  return {
    id,
    sourceType,
    sourceId,
    date,
    dueDate,
    type,
    transactionNumber,
    currency: "SAR",
    subtotal,
    taxAmount,
    total,
    balanceDue,
    status,
  };
}

function supplierApSummary() {
  return {
    supplier,
    outstandingPayableBalance: "405.0000",
    overdueBillsTotal: "0.0000",
    overdueBillCount: 0,
    openPurchaseOrders: 0,
    purchaseReceiptsPendingBill: 0,
    purchaseBillsPendingReceipt: 0,
    openPurchaseReturns: 0,
    openMatchingReviews: 0,
    valuationVariancePreviews: 0,
    recentApActivity: [
      {
        id: "supplier-ap-bill-1",
        label: "Purchase bill finalized",
        sourceType: "PurchaseBill",
        sourceId: purchaseBill.id,
        sourceNumber: purchaseBill.billNumber,
        href: `/purchases/bills/${purchaseBill.id}`,
        date: purchaseBill.billDate,
        amount: purchaseBill.total,
        status: purchaseBill.status,
        nonPosting: false,
      },
      {
        id: "supplier-ap-payment-1",
        label: "Supplier payment posted",
        sourceType: "SupplierPayment",
        sourceId: supplierPayment.id,
        sourceNumber: supplierPayment.paymentNumber,
        href: `/purchases/supplier-payments/${supplierPayment.id}`,
        date: supplierPayment.paymentDate,
        amount: supplierPayment.amountPaid,
        status: supplierPayment.status,
        nonPosting: false,
      },
    ],
  };
}

function checklist() {
  const items = [
    ["business_profile", "Complete business profile", "COMPLETE", "/setup"],
    ["vat_tax", "Add VAT/tax details", "COMPLETE", "/settings/zatca"],
    ["first_customer", "Add first customer", "COMPLETE", "/contacts"],
    ["first_invoice", "Create first invoice", "COMPLETE", "/sales/invoices/invoice-1"],
    ["first_payment", "Record payment", "COMPLETE", "/sales/customer-payments/payment-1"],
    ["first_report", "View first report", "INCOMPLETE", "/reports/profit-and-loss"],
  ].map(([id, label, status, href]) => ({
    id,
    label,
    status,
    href,
    description: `${label} for the visual beta workflow.`,
    evidence: status === "COMPLETE" ? ["Stable visual fixture present."] : [],
    blockers: [],
    warnings: [],
  }));

  return {
    readOnly: true,
    noMutation: true,
    tenantScoped: true,
    organizationId: org.id,
    generatedAt: fixedVisualDate,
    status: "IN_PROGRESS",
    readinessScore: 83,
    completedCount: 5,
    totalCount: 6,
    items,
    blockers: [],
    warnings: ["Production ZATCA submission is not connected."],
    recommendedNextSteps: ["Open the Profit & Loss report after the first payment."],
    zatcaProductionCompliance: false,
    realZatcaNetworkEnabled: false,
    signedXmlBodyPersistenceAllowed: false,
    qrPayloadBodyPersistenceAllowed: false,
    productionCompliance: false,
  };
}

function dashboardSummary() {
  return {
    asOf: fixedVisualDate,
    currency: "SAR",
    sales: {
      unpaidInvoiceCount: 1,
      unpaidInvoiceBalance: "650.0000",
      overdueInvoiceCount: 0,
      overdueInvoiceBalance: "0.0000",
      salesThisMonth: "1150.0000",
      customerPaymentThisMonth: "500.0000",
    },
    salesAttention: {
      readOnly: true,
      noMutation: true,
      helperText:
        "Dashboard attention items are read-only workflow signals. They do not send emails, collect payments, post journals, file VAT, call ZATCA, or move inventory.",
      overdueInvoices: {
        count: 1,
        total: "650.0000",
        topItems: [
          {
            id: invoice.id,
            number: invoice.invoiceNumber,
            customerName: customer.displayName,
            amount: invoice.balanceDue,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            status: invoice.status,
            href: `/sales/invoices/${invoice.id}`,
          },
        ],
      },
      collections: {
        openCount: 0,
        dueTodayCount: 0,
        overdueFollowUpCount: 0,
        promisedToPayTotal: "0.0000",
        disputedCount: 0,
        topItems: [],
      },
      quotes: {
        awaitingAcceptanceCount: 0,
        expiringSoonCount: 0,
        acceptedNotConvertedCount: 0,
        topItems: [],
      },
      recurringInvoices: {
        activeCount: 0,
        dueSoonCount: 0,
        overdueForGenerationCount: 0,
        recentlyGeneratedDraftInvoiceCount: 0,
        topItems: [],
        recentDraftInvoices: [],
      },
      deliveryNotes: {
        draftCount: 0,
        issuedNotDeliveredCount: 0,
        overdueDeliveryCount: 0,
        topItems: [],
      },
      customers: {
        topOutstanding: [
          {
            id: customer.id,
            customerName: customer.displayName,
            outstandingBalance: invoice.balanceDue,
            overdueAmount: "0.0000",
            openCollectionCaseCount: 0,
            href: `/customers/${customer.id}`,
          },
        ],
      },
    },
    purchases: {
      unpaidBillCount: 1,
      unpaidBillBalance: "520.0000",
      overdueBillCount: 0,
      overdueBillBalance: "0.0000",
      purchasesThisMonth: "920.0000",
      supplierPaymentThisMonth: "400.0000",
    },
    banking: {
      bankAccountCount: 2,
      totalBankBalance: "1650.0000",
      unreconciledTransactionCount: 1,
      latestReconciliationDate: "2026-05-20T00:00:00.000Z",
    },
    inventory: {
      trackedItemCount: 1,
      lowStockCount: 0,
      negativeStockCount: 0,
      inventoryEstimatedValue: "600.0000",
      clearingVarianceCount: 0,
      lowStockItems: [],
    },
    reports: {
      trialBalanceBalanced: true,
      profitAndLossNetProfit: "230.0000",
      balanceSheetBalanced: true,
    },
    trends: {
      monthlySales: [{ month: "2026-05", amount: "1150.0000" }],
      monthlyPurchases: [{ month: "2026-05", amount: "920.0000" }],
      monthlyNetProfit: [{ month: "2026-05", amount: "230.0000" }],
      cashBalanceTrend: [{ date: "2026-05-21", balance: "1650.0000" }],
    },
    aging: {
      receivablesBuckets: [{ bucket: "current", amount: "650.0000", count: 1 }],
      payablesBuckets: [{ bucket: "current", amount: "520.0000", count: 1 }],
    },
    compliance: {
      zatcaProductionReady: false,
      zatcaBlockingReasonCount: 2,
      fiscalPeriodsLockedCount: 0,
      auditLogCountThisMonth: 24,
    },
    attentionItems: [
      {
        type: "ZATCA_NOT_READY",
        severity: "warning",
        title: "ZATCA readiness",
        description: "Local readiness only; production submission is not enabled.",
        href: "/settings/zatca",
      },
    ],
  };
}

function customerLedger(id: keyof typeof visualCustomers = "customer-1") {
  const detailCustomer = visualCustomers[id] ?? customer;
  const state = contactStateFromId(id);
  const rows =
    state === "empty" || state === "inactive"
      ? []
      : [
          ledgerRow("ledger-customer-invoice", "INVOICE", "2026-05-15T00:00:00.000Z", "Invoice finalized", invoice.invoiceNumber, invoice.id, "1150.0000", "0.0000", "1150.0000"),
          ledgerRow("ledger-customer-payment", "PAYMENT", "2026-05-18T00:00:00.000Z", "Customer payment allocated", customerPayment.paymentNumber, customerPayment.id, "0.0000", "500.0000", "650.0000"),
        ];

  return {
    contact: detailCustomer,
    openingBalance: "0.0000",
    closingBalance: rows.length > 0 ? "650.0000" : "0.0000",
    rows,
  };
}

function supplierLedger(id: keyof typeof visualSuppliers = "supplier-1") {
  const detailSupplier = visualSuppliers[id] ?? supplier;
  const state = contactStateFromId(id);
  const rows =
    state === "empty" || state === "inactive"
      ? []
      : [
          ledgerRow("ledger-supplier-bill", "PURCHASE_BILL", "2026-05-12T00:00:00.000Z", "Purchase bill finalized", purchaseBill.billNumber, purchaseBill.id, "0.0000", "920.0000", "920.0000"),
          ledgerRow("ledger-supplier-payment", "SUPPLIER_PAYMENT", "2026-05-19T00:00:00.000Z", "Supplier payment allocated", supplierPayment.paymentNumber, supplierPayment.id, "400.0000", "0.0000", "520.0000"),
          ledgerRow("ledger-supplier-debit-note", "PURCHASE_DEBIT_NOTE", "2026-05-20T00:00:00.000Z", "Debit note applied", debitNote.debitNoteNumber, debitNote.id, "115.0000", "0.0000", "405.0000"),
        ];

  return {
    contact: detailSupplier,
    openingBalance: "0.0000",
    closingBalance: rows.length > 0 ? "405.0000" : "0.0000",
    rows,
  };
}

function ledgerRow(id: string, type: string, date: string, description: string, referenceNumber: string, sourceId: string, debit: string, credit: string, balance: string) {
  const sourceTypeByLedgerType: Record<string, string> = {
    INVOICE: "SalesInvoice",
    PAYMENT: "CustomerPayment",
    PURCHASE_BILL: "PurchaseBill",
    SUPPLIER_PAYMENT: "SupplierPayment",
    PURCHASE_DEBIT_NOTE: "PurchaseDebitNote",
  };

  return {
    id,
    date,
    type,
    description,
    number: referenceNumber,
    referenceNumber,
    sourceType: sourceTypeByLedgerType[type] ?? type,
    sourceId,
    metadata: {},
    debit,
    credit,
    balance,
    amount: debit !== "0.0000" ? debit : credit,
    status: "POSTED",
  };
}

function zatcaSafeFixture(pathname: string) {
  if (pathname.includes("readiness")) {
    return zatcaInvoiceReadiness();
  }
  if (pathname.includes("signing-plan")) {
    return {
      available: false,
      canRunLocalDryRun: false,
      executionEnabled: false,
      dryRun: true,
      noMutation: true,
      productionCompliance: false,
      commandPlan: { displayCommand: null },
      blockers: ["Visual fixture keeps signing disabled."],
      steps: [],
    };
  }
  if (pathname.includes("signed-artifacts")) {
    return { drafts: [], productionCompliance: false };
  }
  if (pathname.includes("storage-plan")) {
    return {
      storageCapabilityStatus: "BLOCKED",
      draftCount: 0,
      latestDraft: null,
      objectStorageCapability: { objectStorageConfigured: false, provider: null, bucket: null },
      storageProbePlan: { executionFlagEnabled: false, status: "DISABLED_BY_DEFAULT" },
      immutablePolicyStatus: { policyApproved: false, retentionDurationApproved: false },
      bodyPersistenceAllowed: false,
      metadataOnlyDraftAllowed: true,
      productionCompliance: false,
    };
  }
  if (pathname.includes("xml-validation")) {
    return { valid: false, warnings: ["Local validation only."], errors: [], productionCompliance: false };
  }
  return { id: "zatca-meta-1", invoiceId: "invoice-1", status: "NOT_SUBMITTED", productionCompliance: false };
}

function zatcaInvoiceReadiness() {
  const sellerProfile = zatcaReadinessSection("SELLER_PROFILE", "Visual seller profile is present.");
  const buyerContact = zatcaReadinessSection("BUYER_CONTACT", "Visual buyer profile is present.");
  const invoiceSection = zatcaReadinessSection("INVOICE", "Visual invoice data is readable.");
  const egs = zatcaReadinessSection("EGS", "EGS unit is not connected in visual fixtures.", "ERROR");
  const xml = zatcaReadinessSection("XML", "XML mapping remains local/readiness only.");
  const signing = zatcaReadinessSection("SIGNING", "Signing is disabled in visual fixtures.", "ERROR");
  const complianceCsidOnboarding = zatcaReadinessSection("COMPLIANCE_CSID_ONBOARDING", "Real CSID onboarding is not executed.", "ERROR");
  const complianceCsidCustody = zatcaReadinessSection("COMPLIANCE_CSID_CUSTODY", "Real CSID custody is not configured.", "ERROR");
  const signedArtifactPromotion = zatcaReadinessSection("SIGNED_ARTIFACT_PROMOTION", "Signed artifact promotion is blocked.");
  const signedArtifactStorage = zatcaReadinessSection("SIGNED_ARTIFACT_STORAGE", "Signed XML and QR payload bodies are not stored.");
  const phase2Qr = zatcaReadinessSection("PHASE_2_QR", "Phase 2 QR remains readiness-only.");
  const pdfA3 = zatcaReadinessSection("PDF_A3", "PDF/A-3 output is not implemented.", "ERROR");
  const sections = [
    sellerProfile,
    buyerContact,
    invoiceSection,
    egs,
    xml,
    signing,
    complianceCsidOnboarding,
    complianceCsidCustody,
    signedArtifactPromotion,
    signedArtifactStorage,
    phase2Qr,
    pdfA3,
  ];

  return {
    status: "BLOCKED",
    localOnly: true,
    noMutation: true,
    productionCompliance: false,
    invoiceSummary: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      zatcaInvoiceType: "STANDARD",
      transactionCodeFlags: "0100000",
      customerId: customer.id,
      customerName: customer.displayName,
    },
    sellerProfile,
    buyerContact,
    invoice: invoiceSection,
    egs,
    xml,
    signing,
    complianceCsidOnboarding,
    complianceCsidCustody,
    signedArtifactPromotion,
    signedArtifactStorage,
    phase2Qr,
    pdfA3,
    checks: sections.flatMap((section) => section.checks),
    warnings: ["Visual fixture keeps ZATCA local/readiness only."],
  };
}

function zatcaReadinessSection(scope: string, message: string, severity: "ERROR" | "WARNING" = "WARNING") {
  return {
    scope,
    status: severity === "ERROR" ? "BLOCKED" : "WARNINGS",
    checks: [
      {
        code: `VISUAL_${scope}`,
        severity,
        field: scope.replaceAll("_", " ").toLowerCase(),
        message,
        sourceRule: "Visual fixture",
        fixHint: "Use real tenant configuration outside visual regression tests.",
      },
    ],
  };
}

function customerRefundPdfData(refund = customerRefund) {
  return {
    organization: org,
    customer,
    refund: {
      id: refund.id,
      refundNumber: refund.refundNumber,
      refundDate: refund.refundDate,
      status: refund.status,
      currency: refund.currency,
      amountRefunded: refund.amountRefunded,
      description: refund.description,
    },
    source: {
      type: refund.sourceType,
      id: refund.sourceCreditNoteId ?? "refund-source",
      number: refund.sourceCreditNote?.creditNoteNumber ?? "Refund source",
      date: refund.sourceCreditNote?.issueDate ?? refund.refundDate,
      status: refund.sourceCreditNote?.status ?? "FINALIZED",
      originalAmount: refund.sourceCreditNote?.total ?? refund.amountRefunded,
      remainingUnappliedAmount: refund.sourceCreditNote?.unappliedAmount ?? "0.0000",
    },
    paidFromAccount: bankAccount.account,
    journalEntry: refund.journalEntry,
    voidReversalJournalEntry: refund.voidReversalJournalEntry,
    generatedAt: fixedVisualDate,
  };
}

function supplierRefundPdfData(refund = supplierRefund) {
  return {
    organization: org,
    supplier,
    refund: {
      id: refund.id,
      refundNumber: refund.refundNumber,
      refundDate: refund.refundDate,
      status: refund.status,
      currency: refund.currency,
      amountRefunded: refund.amountRefunded,
      description: refund.description,
    },
    source: {
      type: refund.sourceType,
      id: refund.sourceDebitNoteId ?? "refund-source",
      number: refund.sourceDebitNote?.debitNoteNumber ?? "Refund source",
      date: refund.sourceDebitNote?.issueDate ?? refund.refundDate,
      status: refund.sourceDebitNote?.status ?? "FINALIZED",
      originalAmount: refund.sourceDebitNote?.total ?? refund.amountRefunded,
      remainingUnappliedAmount: refund.sourceDebitNote?.unappliedAmount ?? "0.0000",
    },
    receivedIntoAccount: bankAccount.account,
    journalEntry: refund.journalEntry,
    voidReversalJournalEntry: refund.voidReversalJournalEntry,
    generatedAt: fixedVisualDate,
  };
}

function collectionSummary() {
  return {
    totalOverdueAmount: "2750.0000",
    overdueInvoiceCount: 4,
    openCollectionCaseCount: 1,
    casesDueToday: 1,
    casesOverdueForFollowUp: 1,
    promisedToPayTotal: "500.0000",
    disputedTotal: "250.0000",
    topCustomersByOverdueAmount: [
      { customerId: "customer-long", customerName: visualCustomers["customer-long"].displayName, overdueAmount: "1600.0000", overdueInvoiceCount: 2 },
      { customerId: customer.id, customerName: customer.displayName, overdueAmount: "1150.0000", overdueInvoiceCount: 2 },
    ],
    agingBuckets: [
      { bucket: "CURRENT", amount: "0.0000" },
      { bucket: "1_30", amount: "650.0000" },
      { bucket: "31_60", amount: "850.0000" },
      { bucket: "61_90", amount: "500.0000" },
      { bucket: "90_PLUS", amount: "750.0000" },
    ],
    safeWording: "Collections records track follow-up work only.",
  };
}

function statementTransactionById(id: string) {
  return statementTransactions.find((transaction) => transaction.id === id) ?? statementTransactions[0];
}

function statementMatchCandidates() {
  return [
    {
      journalLineId: "journal-line-candidate-1",
      journalEntryId: "journal-payment-1",
      date: customerPayment.paymentDate,
      entryNumber: "JE-PAY-001",
      description: "Customer payment received",
      reference: customerPayment.paymentNumber,
      debit: "1250.0000",
      credit: "0.0000",
      score: 91,
      reason: "Same direction and amount, nearby date. Manual review required.",
    },
  ];
}

function reconciliationItems() {
  return statementTransactions.slice(0, 2).map((transaction, index) => ({
    id: `rec-item-${index + 1}`,
    organizationId: org.id,
    reconciliationId: reconciliation.id,
    statementTransactionId: transaction.id,
    statusAtClose: transaction.status,
    amount: transaction.amount,
    type: transaction.type,
    createdAt: fixedVisualDate,
    statementTransaction: transaction,
  }));
}

function reconciliationReviewEvents() {
  return [
    {
      id: "rec-event-1",
      organizationId: org.id,
      reconciliationId: reconciliation.id,
      actorUserId: "user-1",
      action: "CREATED",
      fromStatus: null,
      toStatus: "DRAFT",
      notes: "Draft created for local visual review.",
      createdAt: fixedVisualDate,
      actorUser: { id: "user-1", name: "Visual User", email: "visual@example.test" },
    },
  ];
}

function reconciliationReportData() {
  return {
    organization: org,
    currency: "SAR",
    reconciliation,
    bankAccount: { id: bankAccount.id, displayName: bankAccount.displayName, currency: bankAccount.currency, account: bankAccount.account },
    items: reconciliationItems().map((item) => ({
      id: item.id,
      statementTransactionId: item.statementTransactionId,
      transactionDate: item.statementTransaction.transactionDate,
      description: item.statementTransaction.description,
      reference: item.statementTransaction.reference,
      type: item.type,
      amount: item.amount,
      statusAtClose: item.statusAtClose,
    })),
    summary: {
      itemCount: 2,
      debitTotal: "250.0000",
      creditTotal: "1250.0000",
      matchedCount: 1,
      categorizedCount: 0,
      ignoredCount: 0,
      totalRowsCount: 3,
      matchedRowsCount: 1,
      categorizedRowsCount: 0,
      ignoredRowsCount: 1,
      unmatchedRowsCount: 1,
      unreconciledRowsCount: 1,
      ruleAppliedRowsCount: 0,
      creditRowsCount: 1,
      debitRowsCount: 2,
      creditRowsTotal: "1250.0000",
      debitRowsTotal: "275.0000",
      exceptionRowsCount: 1,
    },
    linkedTreasurySummary: {
      depositBatches: { count: 1, matchedCount: 1, journalPostedCount: 1, operationalOnlyCount: 0, totalAmount: "1250.0000" },
      cardSettlements: { count: 0, matchedCount: 0, journalPostedCount: 0, operationalOnlyCount: 0, totalAmount: "0.0000" },
      cheques: { count: 2, matchedCount: 1, journalPostedCount: 0, operationalOnlyCount: 2, totalAmount: "120250.0000" },
    },
    accountingStatusSummary: {
      clearingConfigEnabled: false,
      configuredAccountCount: 0,
      journalPostedCount: 1,
      operationalOnlyCount: 2,
      missingClearingConfig: true,
    },
    auditTimeline: [
      {
        id: "audit-rec-1",
        occurredAt: fixedVisualDate,
        type: "RECONCILIATION_EVENT",
        label: "Statement row matched",
        entityType: "BANK_STATEMENT_TRANSACTION",
        entityId: "statement-row-matched",
        status: "MATCHED",
        actor: { id: "user-1", name: "Visual User", email: "visual@example.test" },
        amount: "250.0000",
        reference: "STM-MATCH-001",
      },
    ],
    generatedAt: fixedVisualDate,
  };
}

function customerPaymentReceiptData(payment = customerPayment) {
  return {
    receiptNumber: payment.paymentNumber,
    paymentDate: payment.paymentDate,
    customer,
    organization: org,
    amountReceived: payment.amountReceived,
    unappliedAmount: payment.unappliedAmount,
    currency: payment.currency,
    paidThroughAccount: payment.account,
    allocations: payment.allocations.map((allocation) => ({
      invoiceId: allocation.invoiceId,
      invoiceNumber: allocation.invoice.invoiceNumber,
      invoiceDate: allocation.invoice.issueDate,
      invoiceTotal: allocation.invoice.total,
      amountApplied: allocation.amountApplied,
      invoiceBalanceDue: allocation.invoice.balanceDue,
    })),
    unappliedAllocations: [],
    journalEntry: payment.journalEntry,
    status: payment.status,
  };
}

function supplierPaymentReceiptData(payment = supplierPayment) {
  return {
    receiptNumber: payment.paymentNumber,
    paymentDate: payment.paymentDate,
    supplier,
    organization: org,
    amountPaid: payment.amountPaid,
    unappliedAmount: payment.unappliedAmount,
    currency: payment.currency,
    paidThroughAccount: payment.account,
    allocations: payment.allocations.map((allocation) => ({
      billId: allocation.billId,
      billNumber: allocation.bill.billNumber,
      billDate: allocation.bill.billDate,
      billDueDate: purchaseBill.dueDate,
      billTotal: allocation.bill.total,
      amountApplied: allocation.amountApplied,
      billBalanceDue: allocation.bill.balanceDue,
    })),
    unappliedAllocations: [],
    journalEntry: payment.journalEntry,
    status: payment.status,
  };
}

function agingReport(kind: "receivables" | "payables") {
  const isReceivables = kind === "receivables";
  const row = isReceivables ? salesInvoiceById("invoice-overdue") : purchaseBillById("bill-overdue");
  return {
    asOf: "2026-05-21",
    bucketTotals: {
      CURRENT: "0.0000",
      "1_30": "0.0000",
      "31_60": isReceivables ? row.balanceDue : row.balanceDue,
      "61_90": "0.0000",
      "90_PLUS": "0.0000",
    },
    grandTotal: row.balanceDue,
    rows: [
      {
        id: row.id,
        contact: isReceivables ? customer : supplier,
        number: isReceivables ? row.invoiceNumber : row.billNumber,
        issueDate: isReceivables ? row.issueDate : row.billDate,
        dueDate: row.dueDate,
        total: row.total,
        balanceDue: row.balanceDue,
        daysOverdue: 36,
        bucket: "31_60",
      },
    ],
  };
}

function generalLedgerReport() {
  return {
    from: "2026-05-01",
    to: "2026-05-21",
    accounts: [
      reportAccount("1010", "Main Bank", "ASSET", "0.0000", "0.0000", "500.0000", "250.0000", "250.0000", "0.0000", [
        {
          date: customerPayment.paymentDate,
          journalEntryId: customerPayment.journalEntryId,
          entryNumber: customerPayment.journalEntry.entryNumber,
          description: "Customer payment received",
          reference: customerPayment.paymentNumber,
          debit: "500.0000",
          credit: "0.0000",
          runningBalance: "500.0000",
        },
        {
          date: "2026-05-20T00:00:00.000Z",
          journalEntryId: "journal-bank-transfer-1",
          entryNumber: "JE-BTR-001",
          description: "Transfer to savings bank",
          reference: bankTransfer.transferNumber,
          debit: "0.0000",
          credit: "250.0000",
          runningBalance: "250.0000",
        },
      ]),
      reportAccount("4010", "Sales", "REVENUE", "0.0000", "0.0000", "0.0000", "1000.0000", "0.0000", "1000.0000", [
        {
          date: invoice.issueDate,
          journalEntryId: invoice.journalEntryId,
          entryNumber: invoice.journalEntry.entryNumber,
          description: "Sales invoice finalized",
          reference: invoice.invoiceNumber,
          debit: "0.0000",
          credit: "1000.0000",
          runningBalance: "1000.0000",
        },
      ]),
    ],
  };
}

function trialBalanceReport() {
  const accounts = generalLedgerReport().accounts.map(({ lines: _lines, ...account }) => account);
  return {
    from: "2026-05-01",
    to: "2026-05-21",
    accounts,
    totals: {
      accountId: "totals",
      code: "",
      name: "Totals",
      type: "ASSET",
      openingDebit: "0.0000",
      openingCredit: "0.0000",
      periodDebit: "1250.0000",
      periodCredit: "1250.0000",
      closingDebit: "250.0000",
      closingCredit: "1000.0000",
      balanced: true,
    },
  };
}

function reportAccount(
  code: string,
  name: string,
  type: string,
  openingDebit: string,
  openingCredit: string,
  periodDebit: string,
  periodCredit: string,
  closingDebit: string,
  closingCredit: string,
  lines: unknown[],
) {
  return {
    accountId: `account-${code}`,
    code,
    name,
    type,
    openingDebit,
    openingCredit,
    periodDebit,
    periodCredit,
    closingDebit,
    closingCredit,
    lines,
  };
}

function bankAccountTransactions() {
  return {
    profile: bankAccount,
    account: bankAccount.account,
    from: "2026-05-01",
    to: "2026-05-21",
    openingBalance: "1000.0000",
    closingBalance: "1250.0000",
    transactions: [
      {
        id: "bank-row-1",
        date: "2026-05-18T00:00:00.000Z",
        entryNumber: "JE-PAY-001",
        journalEntryId: "journal-payment-1",
        description: "Customer payment",
        reference: customerPayment.paymentNumber,
        debit: "500.0000",
        credit: "0.0000",
        runningBalance: "1500.0000",
        sourceType: "CUSTOMER_PAYMENT",
        sourceId: customerPayment.id,
        sourceNumber: customerPayment.paymentNumber,
      },
      {
        id: "bank-row-2",
        date: "2026-05-20T00:00:00.000Z",
        entryNumber: "JE-BTR-001",
        journalEntryId: "journal-bank-transfer-1",
        description: "Transfer to savings",
        reference: bankTransfer.transferNumber,
        debit: "0.0000",
        credit: "250.0000",
        runningBalance: "1250.0000",
        sourceType: "BANK_TRANSFER",
        sourceId: bankTransfer.id,
        sourceNumber: bankTransfer.transferNumber,
      },
    ],
  };
}

function statementImport() {
  return {
    id: "statement-import-1",
    organizationId: org.id,
    bankAccountProfileId: bankAccount.id,
    importedById: "user-1",
    filename: "manual-statement.csv",
    sourceType: "CSV",
    status: "IMPORTED",
    statementStartDate: "2026-05-01T00:00:00.000Z",
    statementEndDate: "2026-05-21T00:00:00.000Z",
    openingStatementBalance: "1000.0000",
    closingStatementBalance: "1250.0000",
    rowCount: 2,
    importedAt: fixedVisualDate,
    createdAt: fixedVisualDate,
    updatedAt: fixedVisualDate,
    bankAccountProfile: bankAccount,
    importedBy: { id: "user-1", name: "Visual User", email: "visual@example.test" },
    _count: { transactions: 2 },
    importSummary: { totalRows: 2, validRows: 2, invalidRows: 0, duplicateCandidateRows: 0 },
  };
}

function reconciliationSummary() {
  return {
    profile: bankAccount,
    from: "2026-05-01",
    to: "2026-05-21",
    imports: [statementImport()],
    totals: {
      credits: { count: 1, total: "1250.0000" },
      debits: { count: 2, total: "275.0000" },
      unmatched: { count: 1, total: "1250.0000" },
      matched: { count: 1, total: "250.0000" },
      categorized: { count: 0, total: "0.0000" },
      ignored: { count: 1, total: "25.0000" },
    },
    ledgerBalance: "1250.0000",
    statementClosingBalance: "1250.0000",
    difference: "0.0000",
    statusSuggestion: "NEEDS_REVIEW",
    latestClosedReconciliation: { ...reconciliation, status: "CLOSED", closedAt: "2026-05-20T00:00:00.000Z", unmatchedTransactionCount: 0 },
    hasOpenDraftReconciliation: true,
    unreconciledTransactionCount: 1,
    closedThroughDate: "2026-05-20T00:00:00.000Z",
  };
}

function stockValuationReport() {
  return {
    generatedAt: fixedVisualDate,
    valuationMethod: "MOVING_AVERAGE",
    calculationMethod: "MOVING_AVERAGE",
    accountingWarning: "Operational valuation estimate only; no automatic accounting policy change is implied.",
    warnings: [],
    rows: [
      {
        item,
        warehouse,
        quantityOnHand: "15.0000",
        averageUnitCost: "40.0000",
        estimatedValue: "600.0000",
        warnings: [],
      },
    ],
    totalsByItem: [{ item, quantityOnHand: "15.0000", estimatedValue: "600.0000", warnings: [] }],
    grandTotalEstimatedValue: "600.0000",
  };
}

function inventoryBalance() {
  return {
    item,
    warehouse,
    quantityOnHand: "15.0000",
    averageUnitCost: "40.0000",
    inventoryValue: "600.0000",
    warehouses: [{ warehouse, quantityOnHand: "15.0000", averageUnitCost: "40.0000", inventoryValue: "600.0000" }],
    totalQuantityOnHand: "15.0000",
  };
}

function purchaseReceiptAccountingPreview() {
  const receiptLine = purchaseReceipt.lines[0];

  return {
    sourceType: "PurchaseReceipt",
    sourceId: purchaseReceipt.id,
    sourceNumber: purchaseReceipt.receiptNumber,
    previewOnly: true,
    postingStatus: "DESIGN_ONLY",
    canPost: false,
    canPostReason: "Visual fixture keeps receipt asset posting disabled.",
    valuationMethod: "MOVING_AVERAGE",
    blockingReasons: ["Manual asset posting is disabled in visual regression fixtures."],
    warnings: ["Operational preview only; no journal is posted by this test."],
    alreadyPosted: false,
    alreadyReversed: false,
    journalEntryId: null,
    reversalJournalEntryId: null,
    linkedBill: {
      id: purchaseBill.id,
      billNumber: purchaseBill.billNumber,
      status: purchaseBill.status,
      inventoryPostingMode: "DIRECT_EXPENSE_OR_ASSET",
    },
    postingMode: "PREVIEW_ONLY",
    receiptValue: "480.0000",
    matchedBillValue: "480.0000",
    unmatchedReceiptValue: "0.0000",
    valueDifference: "0.0000",
    journal: {
      description: "PurchaseReceipt visual asset preview",
      totalDebit: "480.0000",
      totalCredit: "480.0000",
      lines: [
        { lineNumber: 1, side: "DEBIT", accountId: "inventory-account-1", accountCode: "1510", accountName: "Inventory", amount: "480.0000", description: "Visual receipt asset preview" },
        { lineNumber: 2, side: "CREDIT", accountId: "ap-account-1", accountCode: "2010", accountName: "Payables", amount: "480.0000", description: "Visual receipt asset preview" },
      ],
    },
    journalPreview: [
      { lineNumber: 1, side: "DEBIT", accountId: "inventory-account-1", accountCode: "1510", accountName: "Inventory", amount: "480.0000", description: "Visual receipt asset preview" },
      { lineNumber: 2, side: "CREDIT", accountId: "ap-account-1", accountCode: "2010", accountName: "Payables", amount: "480.0000", description: "Visual receipt asset preview" },
    ],
    matchingSummary: {
      sourceType: "purchaseBill",
      sourceId: purchaseBill.id,
      receiptLines: [],
      billLines: [
        {
          lineId: "bill-line-1",
          description: "Inventory purchase",
          account: { id: "purchase-account-1", code: "5010", name: "Purchases", type: "EXPENSE" },
          billedQuantity: "12.0000",
          unitPrice: "40.0000",
          matchedQuantity: "12.0000",
          matchedValue: "480.0000",
        },
      ],
      matchedQuantity: "12.0000",
      unmatchedQuantity: "0.0000",
      valueDifference: "0.0000",
    },
    lines: [
      {
        lineId: receiptLine.id,
        item,
        quantity: receiptLine.quantity,
        unitCost: receiptLine.unitCost,
        lineValue: "480.0000",
        matchedQuantity: "12.0000",
        unmatchedQuantity: "0.0000",
        matchedBillValue: "480.0000",
        valueDifference: "0.0000",
        sourceBillLineId: "bill-line-1",
        warnings: [],
      },
    ],
  };
}

function accountingPreview(sourceType: string) {
  return {
    sourceType,
    ready: true,
    canFinalize: true,
    inventoryPostingMode: "DIRECT_EXPENSE_OR_ASSET",
    inventoryTrackedLineCount: 1,
    directLineCount: 1,
    clearingAccount: null,
    vatReceivableAccount: { id: "vat-receivable-1", code: "1410", name: "VAT receivable" },
    accountsPayableAccount: { id: "ap-account-1", code: "2010", name: "Accounts payable" },
    warnings: [],
    blockingReasons: [],
    journal: {
      description: `${sourceType} visual accounting preview`,
      totalDebit: "480.0000",
      totalCredit: "480.0000",
      lines: [
        { lineNumber: 1, side: "DEBIT", accountId: "inventory-account-1", accountCode: "1510", accountName: "Inventory", amount: "480.0000", description: "Visual preview" },
        { lineNumber: 2, side: "CREDIT", accountId: "ap-account-1", accountCode: "2010", accountName: "Payables", amount: "480.0000", description: "Visual preview" },
      ],
    },
    lines: [],
  };
}

function documentSettings() {
  return {
    id: "settings-1",
    organizationId: org.id,
    invoiceTitle: "Tax Invoice",
    creditNoteTitle: "Credit Note",
    debitNoteTitle: "Debit Note",
    receiptTitle: "Payment Receipt",
    purchaseBillTitle: "Purchase Bill",
    statementTitle: "Statement",
    footerText: "Generated from LedgerByte beta records.",
    defaultPaymentTerms: "Due on receipt.",
    logoUrl: "",
    accentColor: "#0f766e",
    showVatBreakdown: true,
    showQrPlaceholder: true,
    createdAt: fixedVisualDate,
    updatedAt: fixedVisualDate,
  };
}

function complianceReadiness() {
  return {
    posture: "CONTROLLED_BETA_USER_TESTING_ONLY",
    claim: "Controlled beta. Local readiness validation only; ASP validation is not connected and FTA reporting is not enabled.",
    prohibitedClaims: [
      "Do not claim tax authority certification.",
      "Do not claim Peppol certification.",
      "Do not claim ASP accreditation.",
      "Do not claim official provider status.",
      "Do not claim production compliance.",
      "Do not claim connected ASP validation.",
      "Do not claim enabled FTA reporting.",
    ],
    noNetworkByDefault: true,
    countries: [
      { code: "AE", module: "UAE Peppol/PINT-AE", status: "LOCAL_READINESS_ONLY" },
      { code: "SA", module: "ZATCA", status: "LOCAL_READINESS_ONLY" },
    ],
    uae: {
      framework: "UAE Peppol/PINT-AE local readiness validation. ASP validation not connected.",
      deadlines: [{ segment: "Controlled beta tenants", appointAspBy: "Not scheduled", implementBy: "Not scheduled" }],
      sources: [
        "https://mof.gov.ae/einvoicing/",
        "https://docs.peppol.eu/poac/ae/pint-ae/",
      ],
      expectedParticipantId: org.taxNumber,
      readiness: {
        status: "WARNING",
        checks: [
          { key: "controlled-beta", label: "Controlled beta", status: "PASS", detail: "Local readiness validation is available for visual QA only." },
          { key: "asp-not-connected", label: "ASP validation not connected", status: "WARNING", detail: "No ASP sandbox credentials, endpoint, or provider response is configured." },
          { key: "fta-reporting-disabled", label: "No FTA reporting yet", status: "WARNING", detail: "FTA reporting remains disabled in this local fixture." },
        ],
        warnings: ["Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms."],
      },
      buyerEndpointCoverage: {
        activeBuyerCount: 1,
        buyerPeppolParticipantCount: 0,
      },
    },
    documentStatusCounts: {
      DRAFT: 0,
      READY: 0,
      BLOCKED: 1,
    },
  };
}

function storageReadiness() {
  return {
    attachmentStorage: {
      activeProvider: "database",
      ready: false,
      maxSizeMb: 10,
      blockingReasons: ["Object storage proof is not connected in the local visual fixture."],
      warnings: ["Local readiness validation only; no content migration or backup action runs."],
    },
    generatedDocumentStorage: {
      activeProvider: "database",
      ready: false,
      blockingReasons: ["Generated documents remain in database storage for the local fixture."],
      warnings: ["No hosted storage provider validation is performed."],
    },
    s3Config: {
      endpointConfigured: false,
      regionConfigured: false,
      bucketConfigured: false,
      accessKeyConfigured: false,
      secretConfigured: false,
      forcePathStyle: false,
      publicBaseUrlConfigured: false,
    },
    warnings: ["Read-only local visual QA fixture. No storage, backup, restore, or provider operation is executed."],
  };
}

function storageMigrationPlan() {
  return {
    attachmentCount: 0,
    attachmentTotalBytes: 0,
    generatedDocumentCount: generatedDocuments.length,
    generatedDocumentTotalBytes: generatedDocuments.reduce((sum, document) => sum + document.sizeBytes, 0),
    databaseStorageCount: generatedDocuments.length,
    s3StorageCount: 0,
    migrationRequired: false,
    targetProvider: "database",
    estimatedMigrationRequired: false,
    dryRunOnly: true,
    notes: ["Local visual fixture only. No migration command or content move is available."],
  };
}

function backupReadiness() {
  return {
    readOnly: true,
    noMutation: true,
    noBackupExecuted: true,
    noRestoreExecuted: true,
    noSecretsReturned: true,
    productionReady: false,
    databaseBackupConfigured: false,
    pointInTimeRecoveryConfigured: false,
    migrationHistoryAvailable: true,
    objectStorageBackupConfigured: false,
    generatedDocumentBackupConfigured: false,
    attachmentBackupConfigured: false,
    restoreDrillVerified: false,
    restoreVerificationVerified: false,
    rpoRtoReviewed: false,
    evidenceRequired: true,
    requiredEvidenceTypes: ["DATABASE_BACKUP", "POINT_IN_TIME_RECOVERY", "RESTORE_DRILL", "RPO_RTO_REVIEW"],
    verifiedEvidenceTypes: [],
    missingEvidenceTypes: ["DATABASE_BACKUP", "POINT_IN_TIME_RECOVERY", "RESTORE_DRILL", "RPO_RTO_REVIEW"],
    blockers: ["No hosted backup provider evidence is available in the local visual fixture."],
    warnings: ["Metadata-only display. No backup or restore command is executed."],
    recommendedNextSteps: ["Collect non-production backup and restore evidence in a separate approved proof lane."],
    redactionGuarantees: ["No secrets, URLs, keys, document bodies, or attachment contents are returned."],
  };
}

function restoreDrillPlan() {
  return {
    readOnly: true,
    noMutation: true,
    noRestoreExecuted: true,
    noCustomerDataExported: true,
    noSecretsReturned: true,
    productionReady: false,
    plannedSteps: ["Plan restore drill in an isolated non-production environment."],
    blockers: ["No restore-drill evidence is attached to the local visual fixture."],
    warnings: ["Visual QA does not execute restore commands."],
    recommendedNextSteps: ["Run an approved metadata-only restore proof later."],
  };
}

function numberSequences() {
  return [
    { id: "seq-invoice", scope: "INVOICE", prefix: "INV-", nextNumber: 42, padding: 4, exampleNextNumber: "INV-0042", updatedAt: fixedVisualDate },
    { id: "seq-bill", scope: "BILL", prefix: "BILL-", nextNumber: 18, padding: 4, exampleNextNumber: "BILL-0018", updatedAt: fixedVisualDate },
    { id: "seq-supplier-statement", scope: "SUPPLIER_STATEMENT", prefix: "SSTMT-", nextNumber: 3, padding: 4, exampleNextNumber: "SSTMT-0003", updatedAt: fixedVisualDate },
  ];
}

interface MockResponse {
  status?: number;
  contentType?: string;
  payload?: unknown;
  body?: string;
}

function json(payload: unknown, status = 200): MockResponse {
  return { status, payload };
}
