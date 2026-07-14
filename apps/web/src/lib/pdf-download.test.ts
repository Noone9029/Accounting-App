import {
  accountingCloseEvidenceExportPath,
  bankReconciliationReportCsvPath,
  bankReconciliationReportPdfPath,
  cashExpensePdfPath,
  creditNotePdfPath,
  customerRefundPdfPath,
  deliveryNotePdfPath,
  generatedDocumentDownloadPath,
  invoicePdfPath,
  pdfApiUrl,
  purchaseBillPdfPath,
  purchaseOrderPdfPath,
  purchaseDebitNotePdfPath,
  receiptPdfPath,
  salesQuotePdfPath,
  statementPdfPath,
  supplierStatementPdfPath,
  supplierPaymentReceiptPdfPath,
  supplierRefundPdfPath,
  downloadAuthenticatedFile,
} from "./pdf-download";

jest.mock("./api", () => ({
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly details?: unknown,
    ) {
      super(message);
    }
  },
  apiBaseUrl: "http://localhost:4000",
  getActiveOrganizationId: jest.fn(() => "org-1"),
}));

describe("PDF download helpers", () => {
  it("builds invoice and receipt PDF paths", () => {
    expect(invoicePdfPath("invoice-1")).toBe("/sales-invoices/invoice-1/pdf");
    expect(salesQuotePdfPath("quote 1")).toBe("/sales-quotes/quote%201/pdf");
    expect(deliveryNotePdfPath("delivery note 1")).toBe("/delivery-notes/delivery%20note%201/pdf");
    expect(creditNotePdfPath("credit note 1")).toBe("/credit-notes/credit%20note%201/pdf");
    expect(receiptPdfPath("payment-1")).toBe("/customer-payments/payment-1/receipt.pdf");
    expect(customerRefundPdfPath("refund 1")).toBe("/customer-refunds/refund%201/pdf");
    expect(purchaseOrderPdfPath("po 1")).toBe("/purchase-orders/po%201/pdf");
    expect(purchaseBillPdfPath("bill 1")).toBe("/purchase-bills/bill%201/pdf");
    expect(purchaseDebitNotePdfPath("debit note 1")).toBe("/purchase-debit-notes/debit%20note%201/pdf");
    expect(supplierPaymentReceiptPdfPath("supplier payment 1")).toBe("/supplier-payments/supplier%20payment%201/receipt.pdf");
    expect(supplierRefundPdfPath("supplier refund 1")).toBe("/supplier-refunds/supplier%20refund%201/pdf");
    expect(cashExpensePdfPath("expense 1")).toBe("/cash-expenses/expense%201/pdf");
  });

  it("builds statement PDF paths with optional date range", () => {
    expect(statementPdfPath("contact-1", "2026-01-01", "2026-01-31")).toBe(
      "/contacts/contact-1/statement.pdf?from=2026-01-01&to=2026-01-31",
    );
    expect(statementPdfPath("contact-1")).toBe("/contacts/contact-1/statement.pdf");
    expect(supplierStatementPdfPath("supplier-1", "2026-01-01", "2026-01-31")).toBe(
      "/contacts/supplier-1/supplier-statement.pdf?from=2026-01-01&to=2026-01-31",
    );
    expect(supplierStatementPdfPath("supplier-1")).toBe("/contacts/supplier-1/supplier-statement.pdf");
  });

  it("builds absolute API URLs", () => {
    expect(pdfApiUrl("/sales-invoices/invoice-1/pdf")).toBe("http://localhost:4000/sales-invoices/invoice-1/pdf");
  });

  it("builds generated document archive download paths", () => {
    expect(generatedDocumentDownloadPath("doc-1")).toBe("/generated-documents/doc-1/download");
  });

  it("builds bank reconciliation report download paths", () => {
    expect(bankReconciliationReportPdfPath("rec 1")).toBe("/bank-reconciliations/rec%201/report.pdf");
    expect(bankReconciliationReportCsvPath("rec 1")).toBe("/bank-reconciliations/rec%201/report.csv");
  });

  it("builds encoded close evidence JSON, CSV, and PDF download paths", () => {
    expect(accountingCloseEvidenceExportPath("cycle / 1", "json")).toBe("/accounting-close/cycles/cycle%20%2F%201/export?format=json");
    expect(accountingCloseEvidenceExportPath("cycle / 1", "csv")).toBe("/accounting-close/cycles/cycle%20%2F%201/export?format=csv");
    expect(accountingCloseEvidenceExportPath("cycle / 1", "pdf")).toBe("/accounting-close/cycles/cycle%20%2F%201/export?format=pdf");
  });

  it("downloads authenticated files with cookie credentials and no bearer authorization", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob(["pdf"], { type: "application/pdf" }),
    } as Response);
    URL.createObjectURL = jest.fn(() => "blob:test");
    URL.revokeObjectURL = jest.fn();
    jest.spyOn(document.body, "appendChild").mockImplementation((node: Node) => node);
    const click = jest.fn();
    const remove = jest.fn();
    jest.spyOn(document, "createElement").mockReturnValue({
      click,
      remove,
      set href(_value: string) {},
      set target(_value: string) {},
      set rel(_value: string) {},
      set download(_value: string) {},
    } as unknown as HTMLAnchorElement);

    await downloadAuthenticatedFile("/reports/trial-balance.csv", "trial-balance.csv");

    const init = jest.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);

    expect(init.credentials).toBe("include");
    expect(headers.get("x-organization-id")).toBe("org-1");
    expect(headers.has("authorization")).toBe(false);
    expect(click).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
  });
});
