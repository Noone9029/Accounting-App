import {
  GENERATED_DOCUMENT_TYPES,
  canDownloadGeneratedDocument,
  canCreateApGeneratedDocumentEmail,
  documentSourceTypeLabel,
  documentTypeLabel,
  generatedDocumentStatusBadgeClass,
  generatedDocumentStatusLabel,
} from "./documents";
import { PERMISSIONS, type Permission } from "./permissions";
import type { GeneratedDocument } from "./types";

describe("document helpers", () => {
  it("keeps every supported generated document type available to archive filters", () => {
    expect(GENERATED_DOCUMENT_TYPES).toContain("SALES_QUOTE");
    expect(GENERATED_DOCUMENT_TYPES).toContain("BANK_RECONCILIATION_REPORT");
  });

  it("labels report document types clearly", () => {
    expect(documentTypeLabel("REPORT_GENERAL_LEDGER")).toBe("General Ledger Report");
    expect(documentTypeLabel("REPORT_TRIAL_BALANCE")).toBe("Trial Balance Report");
    expect(documentTypeLabel("REPORT_PROFIT_AND_LOSS")).toBe("Profit & Loss Report");
    expect(documentTypeLabel("BANK_RECONCILIATION_REPORT")).toBe("Bank Reconciliation Report");
  });

  it("labels supplier statement archives clearly", () => {
    expect(documentTypeLabel("SUPPLIER_STATEMENT")).toBe("Supplier Statement");
    expect(documentSourceTypeLabel("SupplierStatement")).toBe("Supplier Statement");
  });

  it("labels sales quote and delivery note archives without invoice wording", () => {
    expect(documentTypeLabel("SALES_INVOICE")).toBe("Sales Invoice");
    expect(documentTypeLabel("SALES_QUOTE")).toBe("Sales Quote");
    expect(documentTypeLabel("DELIVERY_NOTE")).toBe("Delivery Note");
    expect(documentSourceTypeLabel("DeliveryNote")).toBe("Delivery Note");
    expect(documentTypeLabel("SALES_QUOTE")).not.toMatch(/tax invoice/i);
    expect(documentTypeLabel("DELIVERY_NOTE")).not.toMatch(/invoice/i);
  });

  it("labels generated document statuses", () => {
    expect(generatedDocumentStatusLabel("GENERATED")).toBe("Generated");
    expect(generatedDocumentStatusLabel("SUPERSEDED")).toBe("Superseded");
    expect(generatedDocumentStatusBadgeClass("FAILED")).toContain("rose");
  });

  it("formats source type labels for archive rows", () => {
    expect(documentSourceTypeLabel("CustomerStatement")).toBe("Customer Statement");
    expect(documentSourceTypeLabel("PURCHASE_DEBIT_NOTE")).toBe("Purchase Debit Note");
  });

  it("allows AP generated-document email only with every required permission", () => {
    const permissions = new Set<Permission>([PERMISSIONS.generatedDocuments.download, PERMISSIONS.emailOutbox.view, PERMISSIONS.purchaseBills.view]);

    expect(canCreateApGeneratedDocumentEmail(generatedDocumentFixture(), (permission) => permissions.has(permission))).toBe(true);
    expect(canCreateApGeneratedDocumentEmail(generatedDocumentFixture(), (permission) => permission !== PERMISSIONS.generatedDocuments.download && permissions.has(permission))).toBe(false);
    expect(canCreateApGeneratedDocumentEmail(generatedDocumentFixture(), (permission) => permission !== PERMISSIONS.emailOutbox.view && permissions.has(permission))).toBe(false);
    expect(canCreateApGeneratedDocumentEmail(generatedDocumentFixture(), (permission) => permission !== PERMISSIONS.purchaseBills.view && permissions.has(permission))).toBe(false);
  });

  it("blocks unsupported or non-generated documents from AP email UI creation", () => {
    const allowAll = () => true;

    expect(canCreateApGeneratedDocumentEmail(generatedDocumentFixture({ status: "FAILED" }), allowAll)).toBe(false);
    expect(canCreateApGeneratedDocumentEmail(generatedDocumentFixture({ sourceType: "SalesInvoice", documentType: "SALES_INVOICE" }), allowAll)).toBe(false);
    expect(canCreateApGeneratedDocumentEmail(generatedDocumentFixture({ sourceType: "PurchaseBill", documentType: "PURCHASE_ORDER" }), allowAll)).toBe(false);
  });

  it("blocks failed archive rows from offering PDF download", () => {
    expect(canDownloadGeneratedDocument(generatedDocumentFixture())).toBe(true);
    expect(canDownloadGeneratedDocument(generatedDocumentFixture({ status: "SUPERSEDED" }))).toBe(true);
    expect(canDownloadGeneratedDocument(generatedDocumentFixture({ status: "FAILED" }))).toBe(false);
  });
});

function generatedDocumentFixture(overrides: Partial<GeneratedDocument> = {}): GeneratedDocument {
  return {
    id: "generated-document-1",
    organizationId: "org-1",
    documentType: "PURCHASE_BILL",
    sourceType: "PurchaseBill",
    sourceId: "bill-1",
    documentNumber: "BILL-001",
    filename: "purchase-bill-BILL-001.pdf",
    mimeType: "application/pdf",
    storageProvider: "database",
    storageKey: null,
    contentHash: "hash-value",
    sizeBytes: 3417,
    status: "GENERATED",
    generatedById: "user-1",
    generatedAt: "2026-05-29T00:00:00.000Z",
    createdAt: "2026-05-29T00:00:00.000Z",
    ...overrides,
  };
}
