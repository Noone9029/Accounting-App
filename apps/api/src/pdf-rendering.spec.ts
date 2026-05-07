import {
  InvoicePdfData,
  PaymentReceiptPdfData,
  renderCustomerStatementPdf,
  renderInvoicePdf,
  renderPaymentReceiptPdf,
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
    journalEntry: { id: "journal-1", entryNumber: "JE-000001", status: "POSTED" },
    generatedAt: "2026-05-06T12:00:00.000Z",
  };
}
