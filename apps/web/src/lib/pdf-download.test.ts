import { generatedDocumentDownloadPath, invoicePdfPath, pdfApiUrl, receiptPdfPath, statementPdfPath } from "./pdf-download";

describe("PDF download helpers", () => {
  it("builds invoice and receipt PDF paths", () => {
    expect(invoicePdfPath("invoice-1")).toBe("/sales-invoices/invoice-1/pdf");
    expect(receiptPdfPath("payment-1")).toBe("/customer-payments/payment-1/receipt.pdf");
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
