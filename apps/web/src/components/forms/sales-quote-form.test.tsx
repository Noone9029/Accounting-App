import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { SalesInvoiceTaxMode, SalesQuote } from "@/lib/types";
import { SalesQuoteForm } from "./sales-quote-form";

const apiRequestMock = jest.fn();
const pushMock = jest.fn();

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
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("SalesQuoteForm", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/sales/quotes/new");
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string, options?: { method?: string; body?: unknown }) => {
      if (path === "/contacts") {
        return Promise.resolve([contactFixture("customer-1", "Beta Customer"), contactFixture("customer-2", "Second Customer")]);
      }
      if (path === "/items") {
        return Promise.resolve([
          {
            id: "item-1",
            name: "Consulting",
            description: "Consulting service",
            sku: "SVC",
            status: "ACTIVE",
            sellingPrice: "250.0000",
            revenueAccountId: "revenue-1",
            salesTaxRateId: "tax-15",
          },
        ]);
      }
      if (path === "/accounts") {
        return Promise.resolve([
          {
            id: "revenue-1",
            code: "401",
            name: "Sales revenue",
            type: "REVENUE",
            isActive: true,
            allowPosting: true,
          },
        ]);
      }
      if (path === "/tax-rates") {
        return Promise.resolve([
          {
            id: "tax-15",
            name: "VAT on Sales 15%",
            scope: "SALES",
            category: "STANDARD",
            rate: "15.0000",
            isActive: true,
          },
        ]);
      }
      if (path === "/branches") {
        return Promise.resolve([]);
      }
      if (path === "/sales-quotes/next-number") {
        return Promise.resolve({
          quoteNumber: "QUO-000042",
          editable: false,
          overrideAllowed: false,
          helperText: "Preview only. The quote number is assigned from the sales quote sequence when the draft is saved.",
        });
      }
      if (path === "/sales-quotes" && options?.method === "POST") {
        return Promise.resolve({ id: "quote-1", quoteNumber: "QUO-000042" });
      }
      if (path === "/sales-quotes/quote-1" && options?.method === "PATCH") {
        return Promise.resolve(salesQuoteFixture());
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("prefills the customer from the new quote route query string", async () => {
    window.history.pushState({}, "", "/sales/quotes/new?customerId=customer-2&returnTo=/customers/customer-2");

    render(<SalesQuoteForm />);

    await waitFor(() => expect(screen.getByLabelText("Customer")).toHaveValue("customer-2"));
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/customers/customer-2");
  });

  it("shows a read-only quote number sequence preview", async () => {
    render(<SalesQuoteForm />);

    await waitFor(() => expect(screen.getByLabelText("Quote number")).toHaveValue("QUO-000042"));
    expect(screen.getByLabelText("Quote number")).toHaveAttribute("readonly");
    expect(screen.getByText(/assigned from the sales quote sequence/i)).toBeInTheDocument();
  });

  it("renders account-coded draft lines and tax-exclusive totals", async () => {
    render(<SalesQuoteForm initialQuote={salesQuoteFixture()} />);

    await waitFor(() => expect(screen.getByLabelText("Posting account for quote line 1")).toHaveValue("revenue-1"));
    expect(screen.getByLabelText("Quote number")).toHaveValue("QUO-000042");
    expect(screen.getByLabelText("Tax mode")).toHaveValue("TAX_EXCLUSIVE");
    expect(screen.getByLabelText("Description for quote line 1")).toHaveValue("Consulting service");
    expect(screen.getByLabelText("Price for quote line 1")).toHaveValue("100.0000");
    expect(screen.getByText(/401\s+Sales revenue/)).toBeInTheDocument();
    expect(screen.getAllByText(/SAR\s*230\.00/).length).toBeGreaterThan(0);
  });

  it("renders no-tax mode with line tax rates disabled", async () => {
    render(<SalesQuoteForm initialQuote={salesQuoteFixture({ taxMode: "NO_TAX", taxTotal: "0.0000", total: "200.0000" })} />);

    await waitFor(() => expect(screen.getByLabelText("Tax mode")).toHaveValue("NO_TAX"));
    expect(screen.getByLabelText("Tax rate for quote line 1")).toHaveValue("");
    expect(screen.getByLabelText("Tax rate for quote line 1")).toBeDisabled();
    expect(screen.getAllByText(/SAR\s*200\.00/).length).toBeGreaterThan(0);
  });

  it("submits edited draft quote lines to the sales quote API and redirects to the quote detail", async () => {
    render(<SalesQuoteForm initialQuote={salesQuoteFixture()} />);

    await waitFor(() => expect(screen.getByLabelText("Posting account for quote line 1")).toHaveValue("revenue-1"));
    fireEvent.submit(screen.getByRole("button", { name: "Save draft quote" }).closest("form")!);

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/sales-quotes/quote-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            customerId: "customer-1",
            taxMode: "TAX_EXCLUSIVE",
            lines: [expect.objectContaining({ accountId: "revenue-1", taxRateId: "tax-15" })],
          }),
        }),
      ),
    );
    expect(pushMock).toHaveBeenCalledWith("/sales/quotes/quote-1");
  });

  it("uses returnTo from edit routes for cancel and post-save redirect", async () => {
    window.history.pushState({}, "", "/sales/quotes/quote-1/edit?returnTo=/customers/customer-1");

    render(<SalesQuoteForm initialQuote={salesQuoteFixture()} />);

    await waitFor(() => expect(screen.getByLabelText("Posting account for quote line 1")).toHaveValue("revenue-1"));
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/customers/customer-1");

    fireEvent.submit(screen.getByRole("button", { name: "Save draft quote" }).closest("form")!);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/customers/customer-1"));
  });

  it("shows a customer empty state before saving quotes", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([]);
      }
      if (path === "/items") {
        return Promise.resolve([]);
      }
      if (path === "/accounts") {
        return Promise.resolve([
          {
            id: "revenue-1",
            code: "401",
            name: "Sales revenue",
            type: "REVENUE",
            isActive: true,
            allowPosting: true,
          },
        ]);
      }
      if (path === "/tax-rates") {
        return Promise.resolve([]);
      }
      if (path === "/branches") {
        return Promise.resolve([]);
      }
      if (path === "/sales-quotes/next-number") {
        return Promise.resolve({
          quoteNumber: "QUO-000043",
          editable: false,
          overrideAllowed: false,
          helperText: "Assigned from the sales quote sequence when saved.",
        });
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<SalesQuoteForm />);

    expect(await screen.findByText(/Add a customer before creating the first quote/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open customers" })).toHaveAttribute("href", "/customers");
  });
});

function contactFixture(id: string, name: string) {
  return {
    id,
    name,
    displayName: name,
    type: "CUSTOMER",
    email: null,
    phone: null,
    taxNumber: null,
    isActive: true,
  };
}

function salesQuoteFixture(overrides: Partial<SalesQuote> & { taxMode?: SalesInvoiceTaxMode } = {}): SalesQuote {
  return {
    id: "quote-1",
    organizationId: "org-1",
    quoteNumber: "QUO-000042",
    customerId: "customer-1",
    branchId: null,
    status: "DRAFT",
    issueDate: "2026-06-03T00:00:00.000Z",
    expiryDate: "2026-06-30T00:00:00.000Z",
    reference: "REF-42",
    currency: "SAR",
    taxMode: "TAX_EXCLUSIVE",
    subtotal: "200.0000",
    discountTotal: "0.0000",
    taxableTotal: "200.0000",
    taxTotal: "30.0000",
    total: "230.0000",
    notes: null,
    terms: null,
    convertedSalesInvoiceId: null,
    convertedAt: null,
    sentAt: null,
    acceptedAt: null,
    rejectedAt: null,
    expiredAt: null,
    cancelledAt: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null, isActive: true },
    branch: null,
    convertedSalesInvoice: null,
    lines: [
      {
        id: "line-1",
        organizationId: "org-1",
        quoteId: "quote-1",
        itemId: "item-1",
        description: "Consulting service",
        accountId: "revenue-1",
        quantity: "2.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        taxRateId: overrides.taxMode === "NO_TAX" ? null : "tax-15",
        lineGrossAmount: "200.0000",
        discountAmount: "0.0000",
        taxableAmount: "200.0000",
        taxAmount: overrides.taxMode === "NO_TAX" ? "0.0000" : "30.0000",
        lineSubtotal: "200.0000",
        lineTotal: overrides.taxMode === "NO_TAX" ? "200.0000" : "230.0000",
        sortOrder: 0,
        item: { id: "item-1", name: "Consulting", sku: "SVC", revenueAccountId: "revenue-1" },
        account: { id: "revenue-1", code: "401", name: "Sales revenue", type: "REVENUE" },
        taxRate: overrides.taxMode === "NO_TAX" ? null : { id: "tax-15", name: "VAT on Sales 15%", rate: "15.0000" },
      },
    ],
    ...overrides,
  };
}
