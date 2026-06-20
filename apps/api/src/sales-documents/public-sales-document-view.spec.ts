import {
  PUBLIC_SALES_DOCUMENT_ACTION_BOUNDARY,
  buildPublicSalesDocumentView,
} from "./public-sales-document-view";

describe("public sales document view contract", () => {
  it("builds a read-only sales invoice view without internal ids or payment actions", () => {
    const view = buildPublicSalesDocumentView({
      documentType: "sales-invoice",
      documentNumber: "INV-000001",
      status: "FINALIZED",
      issueDate: "2026-06-21",
      dueOrExpiryDate: "2026-07-21",
      currency: "SAR",
      seller: { displayName: "LedgerByte Demo LLC", taxNumber: "300000000000003" },
      customer: { displayName: "Alpha Customer", taxNumber: "300000000000004" },
      totals: {
        subtotal: "100.0000",
        discountTotal: "0.0000",
        taxableTotal: "100.0000",
        taxTotal: "15.0000",
        total: "115.0000",
        balanceDue: "115.0000",
      },
      lines: [
        {
          itemName: "Consulting",
          description: "Implementation support",
          quantity: "1.0000",
          unitPrice: "100.0000",
          discountRate: "0.0000",
          taxRateName: "VAT 15%",
          taxableAmount: "100.0000",
          taxAmount: "15.0000",
          lineTotal: "115.0000",
        },
      ],
      notes: "Thank you.",
      terms: "Due on receipt.",
    });

    expect(view).toEqual({
      documentType: "sales-invoice",
      title: "Sales Invoice",
      documentNumber: "INV-000001",
      status: "FINALIZED",
      issueDate: "2026-06-21",
      dueOrExpiryDate: "2026-07-21",
      currency: "SAR",
      seller: { displayName: "LedgerByte Demo LLC", taxNumber: "300000000000003" },
      customer: { displayName: "Alpha Customer", taxNumber: "300000000000004" },
      totals: {
        subtotal: "100.0000",
        discountTotal: "0.0000",
        taxableTotal: "100.0000",
        taxTotal: "15.0000",
        total: "115.0000",
        balanceDue: "115.0000",
      },
      lines: [
        {
          itemName: "Consulting",
          description: "Implementation support",
          quantity: "1.0000",
          unitPrice: "100.0000",
          discountRate: "0.0000",
          taxRateName: "VAT 15%",
          taxableAmount: "100.0000",
          taxAmount: "15.0000",
          lineTotal: "115.0000",
        },
      ],
      notes: "Thank you.",
      terms: "Due on receipt.",
      actionBoundary: PUBLIC_SALES_DOCUMENT_ACTION_BOUNDARY,
    });
    expect(JSON.stringify(view)).not.toMatch(/invoice-1|customer-1|allocation|journal|sourceId/i);
    expect(view.actionBoundary.paymentCollectionEnabled).toBe(false);
  });

  it("builds a quote view with quote-specific title and no balance due", () => {
    const view = buildPublicSalesDocumentView({
      documentType: "sales-quote",
      documentNumber: "QUO-000001",
      status: "SENT",
      issueDate: "2026-06-21",
      dueOrExpiryDate: "2026-07-21",
      currency: "SAR",
      seller: { displayName: "LedgerByte Demo LLC" },
      customer: { displayName: "Alpha Customer" },
      totals: {
        subtotal: "200.0000",
        discountTotal: "0.0000",
        taxableTotal: "200.0000",
        taxTotal: "30.0000",
        total: "230.0000",
      },
      lines: [
        {
          description: "Advisory package",
          quantity: "1.0000",
          unitPrice: "200.0000",
          discountRate: "0.0000",
          taxableAmount: "200.0000",
          taxAmount: "30.0000",
          lineTotal: "230.0000",
        },
      ],
    });

    expect(view.title).toBe("Sales Quote");
    expect(view.totals.balanceDue).toBeUndefined();
    expect(view.actionBoundary).toEqual(PUBLIC_SALES_DOCUMENT_ACTION_BOUNDARY);
  });

  it("rejects unsupported document types and empty line sets", () => {
    const base = {
      documentNumber: "DOC-000001",
      status: "DRAFT",
      issueDate: "2026-06-21",
      currency: "SAR",
      seller: { displayName: "LedgerByte Demo LLC" },
      customer: { displayName: "Alpha Customer" },
      totals: {
        subtotal: "0.0000",
        discountTotal: "0.0000",
        taxableTotal: "0.0000",
        taxTotal: "0.0000",
        total: "0.0000",
      },
      lines: [
        {
          description: "Line",
          quantity: "1.0000",
          unitPrice: "0.0000",
          discountRate: "0.0000",
          taxableAmount: "0.0000",
          taxAmount: "0.0000",
          lineTotal: "0.0000",
        },
      ],
    };

    expect(() => buildPublicSalesDocumentView({ ...base, documentType: "delivery-note" as never })).toThrow(
      "Unsupported public sales document type: delivery-note.",
    );
    expect(() => buildPublicSalesDocumentView({ ...base, documentType: "sales-invoice", lines: [] })).toThrow(
      "Public sales document views require at least one line.",
    );
  });
});
