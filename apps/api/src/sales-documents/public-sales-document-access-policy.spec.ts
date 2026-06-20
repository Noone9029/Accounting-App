import {
  PUBLIC_SALES_DOCUMENT_ACCESS_BOUNDARY,
  buildPublicSalesDocumentAccessPolicy,
} from "./public-sales-document-access-policy";

describe("public sales document access policy", () => {
  it("marks finalized invoices as eligible for future read-only access planning", () => {
    const policy = buildPublicSalesDocumentAccessPolicy({
      documentType: "sales-invoice",
      documentId: "invoice-1",
      organizationId: "org-1",
      customerId: "customer-1",
      documentNumber: "INV-000001",
      status: "FINALIZED",
      requestedByUserId: "user-1",
    });

    expect(policy).toEqual({
      status: "PLANNING_ONLY",
      eligible: true,
      document: {
        documentType: "sales-invoice",
        documentId: "invoice-1",
        organizationId: "org-1",
        customerId: "customer-1",
        documentNumber: "INV-000001",
        status: "FINALIZED",
      },
      requestedByUserId: "user-1",
      boundary: PUBLIC_SALES_DOCUMENT_ACCESS_BOUNDARY,
      blockers: [],
    });
    expect(policy.boundary.tokenIssuanceEnabled).toBe(false);
    expect(policy.boundary.publicRouteEnabled).toBe(false);
    expect(policy.boundary.paymentCollectionEnabled).toBe(false);
  });

  it("allows only sent or accepted quotes for future read-only access planning", () => {
    expect(
      buildPublicSalesDocumentAccessPolicy({
        documentType: "sales-quote",
        documentId: "quote-1",
        organizationId: "org-1",
        customerId: "customer-1",
        documentNumber: "QUO-000001",
        status: "SENT",
        requestedByUserId: "user-1",
      }),
    ).toMatchObject({ eligible: true, blockers: [] });

    expect(
      buildPublicSalesDocumentAccessPolicy({
        documentType: "sales-quote",
        documentId: "quote-2",
        organizationId: "org-1",
        customerId: "customer-1",
        documentNumber: "QUO-000002",
        status: "ACCEPTED",
        requestedByUserId: "user-1",
      }),
    ).toMatchObject({ eligible: true, blockers: [] });

    expect(
      buildPublicSalesDocumentAccessPolicy({
        documentType: "sales-quote",
        documentId: "quote-draft",
        organizationId: "org-1",
        customerId: "customer-1",
        documentNumber: "QUO-DRAFT",
        status: "DRAFT",
        requestedByUserId: "user-1",
      }),
    ).toMatchObject({
      eligible: false,
      blockers: ["Sales quote public access requires SENT or ACCEPTED status."],
    });
  });

  it("blocks draft invoices, unsupported types, and blank identifiers", () => {
    expect(
      buildPublicSalesDocumentAccessPolicy({
        documentType: "sales-invoice",
        documentId: "invoice-draft",
        organizationId: "org-1",
        customerId: "customer-1",
        documentNumber: "INV-DRAFT",
        status: "DRAFT",
        requestedByUserId: "user-1",
      }),
    ).toMatchObject({
      eligible: false,
      blockers: ["Sales invoice public access requires FINALIZED status."],
    });

    expect(() =>
      buildPublicSalesDocumentAccessPolicy({
        documentType: "delivery-note" as never,
        documentId: "delivery-1",
        organizationId: "org-1",
        customerId: "customer-1",
        documentNumber: "DN-000001",
        status: "DELIVERED",
        requestedByUserId: "user-1",
      }),
    ).toThrow("Unsupported public sales document access type: delivery-note.");

    expect(() =>
      buildPublicSalesDocumentAccessPolicy({
        documentType: "sales-invoice",
        documentId: " ",
        organizationId: "org-1",
        customerId: "customer-1",
        documentNumber: "INV-000001",
        status: "FINALIZED",
        requestedByUserId: "user-1",
      }),
    ).toThrow("Public sales document access policy requires documentId.");
  });
});
