import {
  CashExpensePdfData,
  InvoicePdfData,
  PaymentReceiptPdfData,
  PurchaseOrderPdfData,
  renderAccountingCloseEvidencePdf,
  renderCashExpensePdf,
  renderCustomerStatementPdf,
  renderInvoicePdf,
  renderPaymentReceiptPdf,
  renderPurchaseOrderPdf,
  statementPresentationLabels,
} from "@ledgerbyte/pdf-core";

const organization = {
  id: "org-1",
  name: "LedgerByte Demo",
  legalName: "LedgerByte Demo LLC",
  taxNumber: "300000000000003",
  countryCode: "SA",
};

const customer = {
  id: "customer-1",
  name: "Customer",
  displayName: "Customer",
  taxNumber: "300000000000004",
  email: "customer@example.com",
  phone: null,
  countryCode: "SA",
};

describe("PDF rendering", () => {
  it("renders invoice PDFs as buffers", async () => {
    const buffer = await renderInvoicePdf(invoicePdfData());

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it("renders receipt PDFs as buffers", async () => {
    const buffer = await renderPaymentReceiptPdf(receiptPdfData());

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it("renders statement PDFs as buffers", async () => {
    const buffer = await renderCustomerStatementPdf({
      organization,
      contact: customer,
      currency: "SAR",
      periodFrom: "2026-05-01",
      periodTo: "2026-05-31",
      openingBalance: "0.0000",
      closingBalance: "0.0000",
      rows: [
        {
          date: "2026-05-06T00:00:00.000Z",
          type: "INVOICE",
          number: "INV-000001",
          description: "Invoice INV-000001",
          debit: "115.0000",
          credit: "0.0000",
          balance: "115.0000",
          status: "FINALIZED",
        },
        {
          date: "2026-05-06T00:00:00.000Z",
          type: "PAYMENT",
          number: "PAY-000001",
          description: "Customer payment PAY-000001",
          debit: "0.0000",
          credit: "115.0000",
          balance: "0.0000",
          status: "POSTED",
        },
      ],
      generatedAt: "2026-05-06T12:00:00.000Z",
    });

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it("uses readable customer-specific statement labels", () => {
    const labels = statementPresentationLabels("Customer");

    expect(labels.title).toBe("Customer Statement");
    expect(labels.summaryTitle).toBe("Customer statement period");
    expect(labels.openingBalanceLabel).toBe("Opening customer balance");
    expect(labels.closingBalanceLabel).toBe("Closing customer balance");
    expect(labels.activityTitle).toBe("Customer ledger activity");
    expect(labels.balanceColumnLabel).toBe("Balance due");
    expect(labels.explanation).toContain("invoices increase the amount owed");
    expect(labels.debitCreditHelp).toContain("Debit adds to the customer balance");
    expect(labels.emptyMessage).toContain("No customer statement activity");
  });

  it("uses readable supplier-specific statement labels", () => {
    const labels = statementPresentationLabels("Supplier");

    expect(labels.title).toBe("Supplier Statement");
    expect(labels.summaryTitle).toBe("Supplier statement period");
    expect(labels.openingBalanceLabel).toBe("Opening supplier payable");
    expect(labels.closingBalanceLabel).toBe("Closing supplier payable");
    expect(labels.activityTitle).toBe("Supplier ledger activity");
    expect(labels.balanceColumnLabel).toBe("Payable balance");
    expect(labels.explanation).toContain("purchase bills increase what you owe");
    expect(labels.debitCreditHelp).toContain("Credit adds to the supplier payable");
    expect(labels.emptyMessage).toContain("No supplier statement activity");
  });

  it("renders cash expense PDFs as buffers", async () => {
    const buffer = await renderCashExpensePdf(cashExpensePdfData());

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it("renders purchase order PDFs as buffers", async () => {
    const buffer = await renderPurchaseOrderPdf(purchaseOrderPdfData());

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it("renders a safe accountant close evidence PDF as a buffer", async () => {
    const buffer = await renderAccountingCloseEvidencePdf({
      schemaVersion: 1, organization: { name: "LedgerByte Demo" }, baseCurrency: "AED", generatedAt: "2026-07-14T00:00:00.000Z",
      fiscalPeriod: { id: "period-1", name: "June 2026", startsOn: "2026-06-01", endsOn: "2026-06-30", status: "OPEN" },
      cycle: { id: "cycle-1", status: "REVIEWED", version: 7, signoffMode: "DISTINCT_USERS", readinessHash: "safe-hash", closedByUserId: "user-closer", lockedByUserId: "user-locker" },
      tasks: [{ id: "task-1", title: "Review trial balance", status: "COMPLETED", severity: "WARNING" }],
      checks: [{ checkKey: "reports.trialBalance", status: "READY", severity: "INFORMATION", safeMessage: "Trial balance is balanced." }],
      evidence: [{ id: "evidence-1", evidenceType: "REPORT", reportType: "TRIAL_BALANCE", generatedDocumentId: "document-1", safeLabel: "June trial balance", addedAt: "2026-07-02T00:00:00.000Z" }],
    });

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});

function invoicePdfData(): InvoicePdfData {
  return {
    organization,
    customer,
    invoice: {
      id: "invoice-1",
      invoiceNumber: "INV-000001",
      status: "FINALIZED",
      issueDate: "2026-05-06T00:00:00.000Z",
      dueDate: null,
      currency: "SAR",
      notes: "Thanks",
      terms: "Due on receipt",
      subtotal: "100.0000",
      discountTotal: "0.0000",
      taxableTotal: "100.0000",
      taxTotal: "15.0000",
      total: "115.0000",
      balanceDue: "0.0000",
    },
    lines: [
      {
        description: "Professional services",
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        lineGrossAmount: "100.0000",
        discountAmount: "0.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineTotal: "115.0000",
        taxRateName: "VAT on Sales 15%",
      },
    ],
    payments: [{ paymentNumber: "PAY-000001", paymentDate: "2026-05-06T00:00:00.000Z", amountApplied: "115.0000", status: "POSTED" }],
    generatedAt: "2026-05-06T12:00:00.000Z",
  };
}

function receiptPdfData(): PaymentReceiptPdfData {
  return {
    organization,
    customer,
    payment: {
      id: "payment-1",
      paymentNumber: "PAY-000001",
      paymentDate: "2026-05-06T00:00:00.000Z",
      status: "POSTED",
      currency: "SAR",
      amountReceived: "115.0000",
      unappliedAmount: "0.0000",
      description: "Payment received",
    },
    paidThroughAccount: { id: "bank-1", code: "112", name: "Bank Account" },
    allocations: [
      {
        invoiceId: "invoice-1",
        invoiceNumber: "INV-000001",
        invoiceDate: "2026-05-06T00:00:00.000Z",
        invoiceTotal: "115.0000",
        amountApplied: "115.0000",
        invoiceBalanceDue: "0.0000",
      },
    ],
    unappliedAllocations: [],
    journalEntry: { id: "journal-1", entryNumber: "JE-000001", status: "POSTED" },
    generatedAt: "2026-05-06T12:00:00.000Z",
  };
}

function cashExpensePdfData(): CashExpensePdfData {
  return {
    organization,
    contact: null,
    expense: {
      id: "expense-1",
      expenseNumber: "EXP-000001",
      status: "POSTED",
      expenseDate: "2026-05-06T00:00:00.000Z",
      currency: "SAR",
      description: "Office supplies",
      notes: "Paid by bank",
      subtotal: "100.0000",
      discountTotal: "0.0000",
      taxableTotal: "100.0000",
      taxTotal: "15.0000",
      total: "115.0000",
    },
    paidThroughAccount: { id: "bank-1", code: "112", name: "Bank Account" },
    lines: [
      {
        description: "Office supplies",
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        lineGrossAmount: "100.0000",
        discountAmount: "0.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineTotal: "115.0000",
        taxRateName: "VAT on Purchases 15%",
      },
    ],
    journalEntry: { id: "journal-1", entryNumber: "JE-000001", status: "POSTED" },
    generatedAt: "2026-05-06T12:00:00.000Z",
  };
}

function purchaseOrderPdfData(): PurchaseOrderPdfData {
  return {
    organization,
    supplier: customer,
    purchaseOrder: {
      id: "po-1",
      purchaseOrderNumber: "PO-000001",
      status: "APPROVED",
      orderDate: "2026-05-06T00:00:00.000Z",
      expectedDeliveryDate: "2026-05-13T00:00:00.000Z",
      currency: "SAR",
      notes: "Please confirm availability.",
      terms: "Net 30",
      subtotal: "100.0000",
      discountTotal: "0.0000",
      taxableTotal: "100.0000",
      taxTotal: "15.0000",
      total: "115.0000",
    },
    lines: [
      {
        description: "Office supplies",
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        lineGrossAmount: "100.0000",
        discountAmount: "0.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineTotal: "115.0000",
        taxRateName: "VAT on Purchases 15%",
      },
    ],
    convertedBill: null,
    generatedAt: "2026-05-06T12:00:00.000Z",
  };
}
