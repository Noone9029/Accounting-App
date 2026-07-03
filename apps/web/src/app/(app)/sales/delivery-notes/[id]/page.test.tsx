import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import type { DeliveryNote, GeneratedDocument } from "@/lib/types";
import DeliveryNoteDetailPage from "./page";

const apiRequestMock = jest.fn();
const mockDownloadPdf = jest.fn();
let mockAllowedPermissions = new Set<string>();
const refreshMock = jest.fn();

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "dn-1" }),
  useRouter: () => ({ refresh: refreshMock }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: string) => mockAllowedPermissions.has(permission),
  }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

jest.mock("@/lib/pdf-download", () => {
  const actual = jest.requireActual("@/lib/pdf-download");
  return {
    ...actual,
    downloadPdf: (...args: unknown[]) => mockDownloadPdf(...args),
  };
});

describe("DeliveryNoteDetailPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    mockDownloadPdf.mockReset();
    refreshMock.mockReset();
    mockDownloadPdf.mockResolvedValue(undefined);
    mockAllowedPermissions = new Set(["salesInvoices.view", "salesInvoices.update", "generatedDocuments.view", "generatedDocuments.download"]);
  });

  it("shows draft lifecycle actions and issues a delivery note without invoice wording", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/delivery-notes/dn-1") {
        return Promise.resolve(deliveryNoteFixture({ status: "DRAFT" }));
      }
      if (path.startsWith("/generated-documents")) {
        return Promise.resolve([]);
      }
      if (path === "/delivery-notes/dn-1/issue") {
        return Promise.resolve(deliveryNoteFixture({ status: "ISSUED", issuedAt: "2026-06-04T10:00:00.000Z" }));
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<DeliveryNoteDetailPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Issue" })).toBeInTheDocument());
    expect(screen.getByText(/This is not a tax invoice, payment, posting, or stock movement/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark delivered" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Issue" }));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/delivery-notes/dn-1/issue", { method: "POST" }));
    expect(screen.getByText(/DN-000042 is now issued/i)).toBeInTheDocument();
  });

  it("shows safe delivery note PDF actions and refreshes archive metadata after download", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/delivery-notes/dn-1") {
        return Promise.resolve(deliveryNoteFixture({ status: "ISSUED" }));
      }
      if (path.startsWith("/generated-documents")) {
        return Promise.resolve([generatedDocumentFixture()]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<DeliveryNoteDetailPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Download delivery note PDF" })).toBeInTheDocument());
    expect(screen.getByText("Delivery note PDF archive")).toBeInTheDocument();
    expect(screen.getByText(/not tax invoices/i)).toBeInTheDocument();
    expect(screen.getByText(/do not create journals, AR balances, VAT filing, ZATCA submission, email delivery, payment collection, or inventory movement/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Download delivery note PDF" }));

    await waitFor(() => expect(mockDownloadPdf).toHaveBeenCalledWith("/delivery-notes/dn-1/pdf", "delivery-note-DN-000042.pdf"));
    expect(screen.getByText("delivery-note-DN-000042.pdf")).toBeInTheDocument();
  });

  it("renders issued delivery note detail in Arabic with RTL direction and stable document numbers", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/delivery-notes/dn-1") {
        return Promise.resolve(deliveryNoteFixture({ status: "ISSUED" }));
      }
      if (path.startsWith("/generated-documents")) {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(
      <AppLocaleProvider initialLocale="ar">
        <DeliveryNoteDetailPage />
      </AppLocaleProvider>,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "تعليم كمسلم" })).toBeInTheDocument());
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(screen.getByText("DN-000042")).toBeInTheDocument();
    expect(screen.getByText("أرشيف PDF إشعار التسليم")).toBeInTheDocument();
    expect(screen.getByText(/إشعار التسليم هذا مستند تنفيذ غير مرحل/)).toBeInTheDocument();
  });

  it("hides delivery note PDF actions when generated-document download permission is missing", async () => {
    mockAllowedPermissions = new Set(["salesInvoices.view", "generatedDocuments.view"]);
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/delivery-notes/dn-1") {
        return Promise.resolve(deliveryNoteFixture({ status: "ISSUED" }));
      }
      if (path.startsWith("/generated-documents")) {
        return Promise.resolve([generatedDocumentFixture()]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<DeliveryNoteDetailPage />);

    await waitFor(() => expect(screen.getByText("Delivery note PDF archive")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Download delivery note PDF" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download archived PDF" })).not.toBeInTheDocument();
  });

  it("shows source invoice, source quote, and reference-only stock issue wording", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/delivery-notes/dn-1") {
        return Promise.resolve(
          deliveryNoteFixture({
            relatedSalesInvoiceId: "invoice-1",
            relatedSalesQuoteId: "quote-1",
            relatedSalesStockIssueId: "stock-issue-1",
            relatedSalesInvoice: { id: "invoice-1", invoiceNumber: "INV-000010", status: "FINALIZED", issueDate: "2026-06-03T00:00:00.000Z", total: "115.0000" },
            relatedSalesQuote: { id: "quote-1", quoteNumber: "QUO-000001", status: "ACCEPTED", issueDate: "2026-06-02T00:00:00.000Z", total: "115.0000" },
            relatedSalesStockIssue: { id: "stock-issue-1", issueNumber: "SSI-000001", status: "POSTED", issueDate: "2026-06-04T00:00:00.000Z" },
          }),
        );
      }
      if (path.startsWith("/generated-documents")) {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<DeliveryNoteDetailPage />);

    await waitFor(() => expect(screen.getByText("Source documents")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "INV-000010" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
    expect(screen.getByRole("link", { name: "QUO-000001" })).toHaveAttribute("href", "/sales/quotes/quote-1");
    expect(screen.getByRole("link", { name: "SSI-000001" })).toHaveAttribute("href", "/inventory/sales-stock-issues/stock-issue-1");
    expect(screen.getByText(/reference only/i)).toBeInTheDocument();
    expect(screen.getByText(/does not create, approve, void, or reverse inventory movement/i)).toBeInTheDocument();
    expect(screen.getByText(/no accounting journals/i)).toBeInTheDocument();
    expect(screen.getByText(/no accounts receivable/i)).toBeInTheDocument();
    expect(screen.getByText(/no VAT filing/i)).toBeInTheDocument();
    expect(screen.getByText(/no ZATCA/i)).toBeInTheDocument();
    expect(screen.getByText(/no payment/i)).toBeInTheDocument();
    expect(screen.getByText(/no email/i)).toBeInTheDocument();
    expect(screen.getByText(/no automatic stock movement/i)).toBeInTheDocument();
  });
});

function deliveryNoteFixture(overrides: Partial<DeliveryNote> = {}): DeliveryNote {
  return {
    id: "dn-1",
    organizationId: "org-1",
    deliveryNoteNumber: "DN-000042",
    customerId: "customer-1",
    branchId: null,
    status: "DRAFT",
    issueDate: "2026-06-04T00:00:00.000Z",
    deliveryDate: "2026-06-05T00:00:00.000Z",
    reference: "INV-000010",
    relatedSalesInvoiceId: "invoice-1",
    relatedSalesQuoteId: null,
    relatedSalesStockIssueId: null,
    deliveryAddress: "Warehouse Dock 1",
    notes: "Handle carefully",
    instructions: "Deliver during business hours",
    issuedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    voidedAt: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null, isActive: true },
    branch: null,
    relatedSalesInvoice: { id: "invoice-1", invoiceNumber: "INV-000010", status: "FINALIZED" },
    relatedSalesQuote: null,
    relatedSalesStockIssue: null,
    lines: [
      {
        id: "dn-line-1",
        organizationId: "org-1",
        deliveryNoteId: "dn-1",
        itemId: "item-1",
        description: "Delivered consulting",
        quantity: "3.0000",
        unitOfMeasure: "each",
        sourceSalesInvoiceLineId: "invoice-line-1",
        sourceSalesQuoteLineId: null,
        sourceSalesStockIssueLineId: null,
        sortOrder: 0,
        item: { id: "item-1", name: "Consulting", sku: "SVC", status: "ACTIVE" },
      },
    ],
    ...overrides,
  };
}

function generatedDocumentFixture(overrides: Partial<GeneratedDocument> = {}): GeneratedDocument {
  return {
    id: "doc-1",
    organizationId: "org-1",
    documentType: "DELIVERY_NOTE",
    sourceType: "DeliveryNote",
    sourceId: "dn-1",
    documentNumber: "DN-000042",
    filename: "delivery-note-DN-000042.pdf",
    mimeType: "application/pdf",
    storageProvider: "database",
    storageKey: null,
    contentHash: "hash",
    sizeBytes: 2048,
    status: "GENERATED",
    generatedById: "user-1",
    generatedAt: "2026-06-04T00:00:00.000Z",
    createdAt: "2026-06-04T00:00:00.000Z",
    ...overrides,
  };
}
