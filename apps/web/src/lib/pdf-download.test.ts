import {
  creditNotePdfPath,
  customerRefundPdfPath,
  generatedDocumentDownloadPath,
  invoicePdfPath,
  pdfApiUrl,
  purchaseBillPdfPath,
  purchaseDebitNotePdfPath,
  receiptPdfPath,
  statementPdfPath,
  supplierPaymentReceiptPdfPath,
  supplierRefundPdfPath,
} from "./pdf-download";

describe("PDF download helpers", () => {
  it("builds invoice and receipt PDF paths", () => {
    expect(invoicePdfPath("invoice-1")).toBe("/sales-invoices/invoice-1/pdf");
    expect(creditNotePdfPath("credit note 1")).toBe("/credit-notes/credit%20note%201/pdf");
    expect(receiptPdfPath("payment-1")).toBe("/customer-payments/payment-1/receipt.pdf");
    expect(customerRefundPdfPath("refund 1")).toBe("/customer-refunds/refund%201/pdf");
    expect(purchaseBillPdfPath("bill 1")).toBe("/purchase-bills/bill%201/pdf");
    expect(purchaseDebitNotePdfPath("debit note 1")).toBe("/purchase-debit-notes/debit%20note%201/pdf");
    expect(supplierPaymentReceiptPdfPath("supplier payment 1")).toBe("/supplier-payments/supplier%20payment%201/receipt.pdf");
    expect(supplierRefundPdfPath("supplier refund 1")).toBe("/supplier-refunds/supplier%20refund%201/pdf");
  });

  it("builds statement PDF paths with optional date range", () => {
    expect(statementPdfPath("contact-1", "2026-01-01", "2026-01-31")).toBe(
      "/contacts/contact-1/statement.pdf?from=2026-01-01&to=2026-01-31",
    );
    expect(statementPdfPath("contact-1")).toBe("/contacts/contact-1/statement.pdf");
  });

  it("builds absolute API URLs", () => {
    expect(pdfApiUrl("/sales-invoices/invoice-1/pdf")).toBe("http://localhost:4000/sales-invoices/invoice-1/pdf");
  });

  it("builds generated document archive download paths", () => {
    expect(generatedDocumentDownloadPath("doc-1")).toBe("/generated-documents/doc-1/download");
  });
});
