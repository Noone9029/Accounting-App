import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import SalesQuoteDetailPage from "./page";
import type { DeliveryNote, SalesInvoice, SalesQuote } from "@/lib/types";

const apiRequestMock = jest.fn();
const mockDownloadPdf = jest.fn();
let mockAllowedPermissions = new Set<string>();

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
  useParams: () => ({ id: "quote-1" }),
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

describe("SalesQuoteDetailPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    mockDownloadPdf.mockReset();
    mockDownloadPdf.mockResolvedValue(undefined);
    mockAllowedPermissions = new Set(["salesInvoices.view", "salesInvoices.create", "salesInvoices.update", "generatedDocuments.view", "generatedDocuments.download"]);
  });

  it("shows convert action for accepted quotes and converts to a draft invoice", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/sales-quotes/quote-1") {
        return Promise.resolve(quoteFixture({ status: "ACCEPTED" }));
      }
      if (path.startsWith("/generated-documents")) {
        return Promise.resolve([]);
      }
      if (path.startsWith("/delivery-notes")) {
        return Promise.resolve([]);
      }
      if (path === "/sales-quotes/quote-1/convert-to-invoice") {
        return Promise.resolve({
          quote: quoteFixture({ status: "CONVERTED", convertedSalesInvoiceId: "invoice-1", convertedSalesInvoice: { id: "invoice-1", invoiceNumber: "INV-000010", status: "DRAFT", total: "115.0000" } }),
          invoice: invoiceFixture(),
        });
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<SalesQuoteDetailPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Convert to invoice" })).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Convert to invoice" }));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/sales-quotes/quote-1/convert-to-invoice", { method: "POST" }));
    expect(screen.getByText(/Converted to draft invoice INV-000010/i)).toBeInTheDocument();
  });

  it("shows a safe sales quote PDF action and refreshes archive metadata after download", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/sales-quotes/quote-1") {
        return Promise.resolve(quoteFixture({ status: "SENT" }));
      }
      if (path.startsWith("/generated-documents")) {
        return Promise.resolve([
          {
            id: "doc-1",
            organizationId: "org-1",
            documentType: "SALES_QUOTE",
            sourceType: "SalesQuote",
            sourceId: "quote-1",
            documentNumber: "QUO-000001",
            filename: "sales-quote-QUO-000001.pdf",
            mimeType: "application/pdf",
            storageProvider: "database",
            storageKey: null,
            contentHash: "hash",
            sizeBytes: 2048,
            status: "GENERATED",
            generatedById: "user-1",
            generatedAt: "2026-06-04T00:00:00.000Z",
            createdAt: "2026-06-04T00:00:00.000Z",
          },
        ]);
      }
      if (path.startsWith("/delivery-notes")) {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<SalesQuoteDetailPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Download sales quote PDF" })).toBeInTheDocument());
    expect(screen.getByText(/not tax invoices/i)).toBeInTheDocument();
    expect(screen.getByText(/do not create journals, AR balances, VAT filing, ZATCA submission, email delivery, or payment collection/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Download sales quote PDF" }));

    await waitFor(() => expect(mockDownloadPdf).toHaveBeenCalledWith("/sales-quotes/quote-1/pdf", "sales-quote-QUO-000001.pdf"));
    expect(screen.getByText("sales-quote-QUO-000001.pdf")).toBeInTheDocument();
  });

  it("hides sales quote PDF actions when generated-document download permission is missing", async () => {
    mockAllowedPermissions = new Set(["salesInvoices.view", "generatedDocuments.view"]);
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/sales-quotes/quote-1") {
        return Promise.resolve(quoteFixture({ status: "SENT" }));
      }
      if (path.startsWith("/generated-documents")) {
        return Promise.resolve([]);
      }
      if (path.startsWith("/delivery-notes")) {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<SalesQuoteDetailPage />);

    await waitFor(() => expect(screen.getByText("Sales quote PDF archive")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Download sales quote PDF" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download archived PDF" })).not.toBeInTheDocument();
  });

  it("shows linked delivery notes from accepted quotes without converting or posting", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/sales-quotes/quote-1") {
        return Promise.resolve(quoteFixture({ status: "ACCEPTED" }));
      }
      if (path.startsWith("/generated-documents")) {
        return Promise.resolve([]);
      }
      if (path.startsWith("/delivery-notes")) {
        return Promise.resolve([deliveryNoteFixture()]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<SalesQuoteDetailPage />);

    await waitFor(() => expect(screen.getByRole("link", { name: "DN-000043" })).toHaveAttribute("href", "/sales/delivery-notes/dn-quote"));
    expect(screen.getByText("Related delivery notes")).toBeInTheDocument();
    expect(screen.getByText(/Delivery notes linked to quotes remain operational and non-posting/i)).toBeInTheDocument();
    expect(screen.getByText(/do not convert the quote, create an invoice, post revenue, file VAT, send email, call ZATCA, or move inventory/i)).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalledWith("/sales-quotes/quote-1/convert-to-invoice", expect.anything());
    expect(screen.queryByText(/posted delivery note/i)).not.toBeInTheDocument();
  });
});

function quoteFixture(overrides: Partial<SalesQuote> = {}): SalesQuote {
  return {
    id: "quote-1",
    organizationId: "org-1",
    quoteNumber: "QUO-000001",
    customerId: "customer-1",
    branchId: null,
    status: "DRAFT",
    issueDate: "2026-06-03T00:00:00.000Z",
    expiryDate: "2026-06-30T00:00:00.000Z",
    reference: "RFQ-1",
    currency: "SAR",
    taxMode: "TAX_EXCLUSIVE",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    notes: null,
    terms: null,
    convertedSalesInvoiceId: null,
    convertedAt: null,
    sentAt: null,
    acceptedAt: null,
    rejectedAt: null,
    expiredAt: null,
    cancelledAt: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null },
    branch: null,
    convertedSalesInvoice: null,
    lines: [
      {
        id: "line-1",
        organizationId: "org-1",
        quoteId: "quote-1",
        itemId: null,
        description: "Consulting",
        accountId: "revenue-1",
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        taxRateId: "tax-15",
        lineGrossAmount: "100.0000",
        discountAmount: "0.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineSubtotal: "100.0000",
        lineTotal: "115.0000",
        sortOrder: 0,
        account: { id: "revenue-1", code: "401", name: "Sales revenue", type: "REVENUE" },
      },
    ],
    ...overrides,
  };
}

function invoiceFixture(overrides: Partial<SalesInvoice> = {}): SalesInvoice {
  return {
    id: "invoice-1",
    organizationId: "org-1",
    invoiceNumber: "INV-000010",
    customerId: "customer-1",
    branchId: null,
    issueDate: "2026-06-03T00:00:00.000Z",
    dueDate: null,
    currency: "SAR",
    status: "DRAFT",
    taxMode: "TAX_EXCLUSIVE",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    balanceDue: "115.0000",
    notes: null,
    terms: null,
    finalizedAt: null,
    journalEntryId: null,
    reversalJournalEntryId: null,
    lines: [],
    ...overrides,
  };
}

function deliveryNoteFixture(overrides: Partial<DeliveryNote> = {}): DeliveryNote {
  return {
    id: "dn-quote",
    organizationId: "org-1",
    deliveryNoteNumber: "DN-000043",
    customerId: "customer-1",
    branchId: null,
    status: "ISSUED",
    issueDate: "2026-06-04T00:00:00.000Z",
    deliveryDate: "2026-06-06T00:00:00.000Z",
    reference: "QUO-000001",
    relatedSalesInvoiceId: null,
    relatedSalesQuoteId: "quote-1",
    relatedSalesStockIssueId: null,
    deliveryAddress: "Quote delivery dock",
    notes: null,
    instructions: null,
    issuedAt: "2026-06-04T10:00:00.000Z",
    deliveredAt: null,
    cancelledAt: null,
    voidedAt: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null },
    branch: null,
    relatedSalesInvoice: null,
    relatedSalesQuote: { id: "quote-1", quoteNumber: "QUO-000001", status: "ACCEPTED" },
    relatedSalesStockIssue: null,
    lines: [],
    ...overrides,
  };
}
