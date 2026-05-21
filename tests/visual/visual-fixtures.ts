import type { Page, Route } from "@playwright/test";

export const visualApiUrl = process.env.LEDGERBYTE_VISUAL_API_URL ?? "http://127.0.0.1:4999";
export const fixedVisualDate = "2026-05-21T12:00:00.000Z";

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
  email: "customer@example.test",
  phone: null,
  taxNumber: "300000000000001",
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
  email: "supplier@example.test",
  phone: null,
  taxNumber: "300000000000002",
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

export async function installVisualApiMocks(page: Page) {
  await page.route(`${visualApiUrl}/**`, (route) => fulfillApiRoute(route));
  await page.route("**/favicon.ico", (route) => route.fulfill({ status: 204, body: "" }));
}

export async function primeVisualSession(page: Page) {
  await page.addInitScript(
    ({ fixedNow }) => {
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
    },
    { fixedNow: fixedVisualDate },
  );
}

function fulfillApiRoute(route: Route) {
  const url = new URL(route.request().url());
  const response = visualApiResponse(url.pathname, url.searchParams);
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

function visualApiResponse(pathname: string, searchParams: URLSearchParams): MockResponse | null {
  if (pathname === "/auth/me") {
    return json({
      id: "user-1",
      email: "visual@example.test",
      name: "Visual Tester",
      memberships: [
        {
          id: "membership-1",
          status: "ACTIVE",
          organization: org,
          role: { id: "role-owner", name: "Owner", permissions: ["admin.fullAccess"] },
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
  if (pathname === "/contacts/customer-1") {
    return json(customer);
  }
  if (pathname === "/contacts/supplier-1") {
    return json(supplier);
  }
  if (pathname === "/contacts/customer-1/ledger") {
    return json(customerLedger());
  }
  if (pathname === "/contacts/supplier-1/supplier-ledger") {
    return json(supplierLedger());
  }
  if (pathname === "/contacts/customer-1/statement") {
    return json({ ...customerLedger(), periodFrom: searchParams.get("from"), periodTo: searchParams.get("to") });
  }
  if (pathname === "/contacts/supplier-1/supplier-statement") {
    return json({ ...supplierLedger(), periodFrom: searchParams.get("from"), periodTo: searchParams.get("to") });
  }
  if (pathname === "/sales-invoices/invoice-1") {
    return json(invoice);
  }
  if (pathname === "/sales-invoices/invoice-1/stock-issue-status") {
    return json({ sourceId: "invoice-1", sourceNumber: invoice.invoiceNumber, sourceStatus: "FINALIZED", issueStatus: "PARTIAL", issuedQuantity: "1.0000", remainingQuantity: "0.0000", lines: [] });
  }
  if (pathname.startsWith("/sales-invoices/invoice-1/zatca")) {
    return json(zatcaSafeFixture(pathname));
  }
  if (pathname === "/customer-payments/payment-1") {
    return json(customerPayment);
  }
  if (pathname === "/customer-payments/payment-1/receipt-data") {
    return json(customerPaymentReceiptData());
  }
  if (pathname === "/sales-invoices/open") {
    return json([{ id: invoice.id, invoiceNumber: invoice.invoiceNumber, customerId: customer.id, issueDate: invoice.issueDate, dueDate: invoice.dueDate, currency: invoice.currency, total: invoice.total, balanceDue: invoice.balanceDue, status: invoice.status }]);
  }
  if (pathname === "/reports/aged-receivables") {
    return json(agingReport("receivables"));
  }
  if (pathname === "/reports/aged-payables") {
    return json(agingReport("payables"));
  }
  if (pathname === "/purchase-bills/bill-1") {
    return json(purchaseBill);
  }
  if (pathname === "/purchase-bills/bill-1/receiving-status") {
    return json({
      sourceId: "bill-1",
      sourceNumber: purchaseBill.billNumber,
      sourceStatus: "FINALIZED",
      status: "PARTIALLY_RECEIVED",
      receivedQuantity: "12.0000",
      remainingQuantity: "0.0000",
      lines: [],
    });
  }
  if (pathname === "/purchase-bills/bill-1/receipt-matching-status") {
    return json({
      sourceId: "bill-1",
      sourceNumber: purchaseBill.billNumber,
      status: "PARTIALLY_RECEIVED",
      bill: { status: purchaseBill.status, inventoryPostingMode: purchaseBill.inventoryPostingMode },
      receiptCount: 1,
      receiptValue: "480.0000",
      billTotal: purchaseBill.total,
      warnings: [],
      lines: [],
    });
  }
  if (pathname === "/purchase-bills/bill-1/accounting-preview") {
    return json(accountingPreview("PurchaseBill"));
  }
  if (pathname === "/purchase-bills/open") {
    return json([{ id: purchaseBill.id, billNumber: purchaseBill.billNumber, supplierId: supplier.id, billDate: purchaseBill.billDate, dueDate: purchaseBill.dueDate, currency: purchaseBill.currency, total: purchaseBill.total, balanceDue: purchaseBill.balanceDue, status: purchaseBill.status }]);
  }
  if (pathname === "/supplier-payments/supplier-payment-1") {
    return json(supplierPayment);
  }
  if (pathname === "/supplier-payments/supplier-payment-1/receipt-data") {
    return json(supplierPaymentReceiptData());
  }
  if (pathname === "/purchase-debit-notes/debit-note-1") {
    return json(debitNote);
  }
  if (pathname === "/bank-accounts") {
    return json([bankAccount, secondBankAccount]);
  }
  if (pathname === "/bank-accounts/bank-1") {
    return json(bankAccount);
  }
  if (pathname === "/bank-accounts/bank-1/transactions") {
    return json(bankAccountTransactions());
  }
  if (pathname === "/bank-accounts/bank-1/statement-imports") {
    return json([statementImport()]);
  }
  if (pathname === "/bank-accounts/bank-1/reconciliation") {
    return json(reconciliationSummary());
  }
  if (pathname === "/bank-transfers/transfer-1") {
    return json(bankTransfer);
  }
  if (pathname === "/items") {
    return json([item]);
  }
  if (pathname === "/accounts") {
    return json([bankAccount.account, { id: "sales-account-1", code: "4010", name: "Sales", type: "REVENUE", allowPosting: true, isActive: true }]);
  }
  if (pathname === "/tax-rates") {
    return json([{ id: "tax-1", name: "VAT 15%", rate: "15.0000", scope: "BOTH", category: "STANDARD", isActive: true }]);
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

  return null;
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
      monthlySales: [{ period: "2026-05", amount: "1150.0000" }],
      monthlyPurchases: [{ period: "2026-05", amount: "920.0000" }],
      monthlyNetProfit: [{ period: "2026-05", amount: "230.0000" }],
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
      { id: "zatca-readiness", severity: "warning", label: "ZATCA readiness", message: "Local readiness only; production submission is not enabled.", href: "/settings/zatca" },
    ],
  };
}

function customerLedger() {
  return {
    contact: customer,
    openingBalance: "0.0000",
    closingBalance: "650.0000",
    rows: [
      ledgerRow("ledger-customer-invoice", "INVOICE", "2026-05-15T00:00:00.000Z", "Invoice finalized", invoice.invoiceNumber, invoice.id, "1150.0000", "0.0000", "1150.0000"),
      ledgerRow("ledger-customer-payment", "PAYMENT", "2026-05-18T00:00:00.000Z", "Customer payment allocated", customerPayment.paymentNumber, customerPayment.id, "0.0000", "500.0000", "650.0000"),
    ],
  };
}

function supplierLedger() {
  return {
    contact: supplier,
    openingBalance: "0.0000",
    closingBalance: "405.0000",
    rows: [
      ledgerRow("ledger-supplier-bill", "PURCHASE_BILL", "2026-05-12T00:00:00.000Z", "Purchase bill finalized", purchaseBill.billNumber, purchaseBill.id, "0.0000", "920.0000", "920.0000"),
      ledgerRow("ledger-supplier-payment", "SUPPLIER_PAYMENT", "2026-05-19T00:00:00.000Z", "Supplier payment allocated", supplierPayment.paymentNumber, supplierPayment.id, "400.0000", "0.0000", "520.0000"),
      ledgerRow("ledger-supplier-debit-note", "PURCHASE_DEBIT_NOTE", "2026-05-20T00:00:00.000Z", "Debit note applied", debitNote.debitNoteNumber, debitNote.id, "115.0000", "0.0000", "405.0000"),
    ],
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

function customerPaymentReceiptData() {
  return {
    receiptNumber: customerPayment.paymentNumber,
    paymentDate: customerPayment.paymentDate,
    customer,
    organization: org,
    amountReceived: customerPayment.amountReceived,
    unappliedAmount: customerPayment.unappliedAmount,
    currency: customerPayment.currency,
    paidThroughAccount: customerPayment.account,
    allocations: customerPayment.allocations.map((allocation) => ({
      invoiceId: allocation.invoiceId,
      invoiceNumber: allocation.invoice.invoiceNumber,
      invoiceDate: allocation.invoice.issueDate,
      invoiceTotal: allocation.invoice.total,
      amountApplied: allocation.amountApplied,
      invoiceBalanceDue: allocation.invoice.balanceDue,
    })),
    unappliedAllocations: [],
    journalEntry: customerPayment.journalEntry,
    status: customerPayment.status,
  };
}

function supplierPaymentReceiptData() {
  return {
    receiptNumber: supplierPayment.paymentNumber,
    paymentDate: supplierPayment.paymentDate,
    supplier,
    organization: org,
    amountPaid: supplierPayment.amountPaid,
    unappliedAmount: supplierPayment.unappliedAmount,
    currency: supplierPayment.currency,
    paidThroughAccount: supplierPayment.account,
    allocations: supplierPayment.allocations.map((allocation) => ({
      billId: allocation.billId,
      billNumber: allocation.bill.billNumber,
      billDate: allocation.bill.billDate,
      billDueDate: purchaseBill.dueDate,
      billTotal: allocation.bill.total,
      amountApplied: allocation.amountApplied,
      billBalanceDue: allocation.bill.balanceDue,
    })),
    unappliedAllocations: [],
    journalEntry: supplierPayment.journalEntry,
    status: supplierPayment.status,
  };
}

function agingReport(kind: "receivables" | "payables") {
  const isReceivables = kind === "receivables";
  return {
    asOf: "2026-05-21",
    bucketTotals: {
      current: isReceivables ? "650.0000" : "405.0000",
      "1_30": "0.0000",
      "31_60": "0.0000",
      "61_90": "0.0000",
      "90_plus": "0.0000",
    },
    grandTotal: isReceivables ? "650.0000" : "405.0000",
    rows: [
      {
        id: isReceivables ? invoice.id : purchaseBill.id,
        contact: isReceivables ? customer : supplier,
        number: isReceivables ? invoice.invoiceNumber : purchaseBill.billNumber,
        issueDate: isReceivables ? invoice.issueDate : purchaseBill.billDate,
        dueDate: isReceivables ? invoice.dueDate : purchaseBill.dueDate,
        total: isReceivables ? invoice.total : purchaseBill.total,
        balanceDue: isReceivables ? invoice.balanceDue : "405.0000",
        daysOverdue: 0,
        bucket: "current",
      },
    ],
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
    bankAccount,
    asOf: "2026-05-21",
    unreconciledStatementBalance: "1250.0000",
    unmatchedTransactionCount: 1,
    matchedTransactionCount: 1,
    latestReconciliation: {
      id: "rec-1",
      reconciliationNumber: "REC-VIS-001",
      status: "DRAFT",
      statementDate: "2026-05-21T00:00:00.000Z",
      statementClosingBalance: "1250.0000",
      ledgerClosingBalance: "1250.0000",
      difference: "0.0000",
    },
    importedTransactionSummary: {
      unmatched: 1,
      matched: 1,
      categorized: 0,
      ignored: 0,
    },
    lockedPeriodWarning: null,
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
