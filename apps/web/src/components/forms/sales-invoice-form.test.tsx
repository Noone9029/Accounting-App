import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { SalesInvoiceForm } from "./sales-invoice-form";

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

describe("SalesInvoiceForm", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/sales/invoices/new");
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([
          contactFixture("customer-1", "Beta Customer"),
          contactFixture("customer-2", "Second Customer"),
        ]);
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
      if (path === "/sales-invoices/next-number") {
        return Promise.resolve({
          invoiceNumber: "INV-000042",
          editable: false,
          overrideAllowed: false,
          helperText: "Preview only. The invoice number is assigned from the invoice number sequence when the draft is saved.",
        });
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("prefills the customer from the new-invoice route query string", async () => {
    window.history.pushState({}, "", "/sales/invoices/new?customerId=customer-2&returnTo=/customers/customer-2");

    render(<SalesInvoiceForm />);

    await waitFor(() => expect(screen.getByLabelText("Customer")).toHaveValue("customer-2"));
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/customers/customer-2");
  });

  it("shows a read-only invoice number sequence preview on new invoices", async () => {
    render(<SalesInvoiceForm />);

    await waitFor(() => expect(screen.getByLabelText("Invoice number")).toHaveValue("INV-000042"));
    expect(screen.getByLabelText("Invoice number")).toHaveAttribute("readonly");
    expect(screen.getByText(/assigned from the invoice number sequence/i)).toBeInTheDocument();
  });

  it("renders the transaction workflow sections without fake automation or compliance claims", async () => {
    render(<SalesInvoiceForm />);

    await waitFor(() => expect(screen.getByLabelText("Customer")).toBeInTheDocument());
    expect(screen.getByText("Invoice details")).toBeInTheDocument();
    expect(screen.getByText("Invoice line items")).toBeInTheDocument();
    expect(screen.getByText("Transaction summary")).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getAllByText("Total").length).toBeGreaterThan(0);
    expect(screen.queryByText(/auto-post|auto-finalize|certified|ZATCA cleared|VAT filed/i)).not.toBeInTheDocument();
  });

  it("points the first invoice empty state to the dedicated customers page", async () => {
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
      if (path === "/sales-invoices/next-number") {
        return Promise.resolve({
          invoiceNumber: "INV-000042",
          editable: false,
          overrideAllowed: false,
          helperText: "Preview only. The invoice number is assigned from the invoice number sequence when the draft is saved.",
        });
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<SalesInvoiceForm />);

    expect(await screen.findByRole("link", { name: "Open customers" })).toHaveAttribute("href", "/customers");
  });

  it("uses returnTo from the edit route query string for cancel and post-save redirect", async () => {
    window.history.pushState({}, "", "/sales/invoices/invoice-1/edit?returnTo=/customers/customer-1");
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/sales-invoices/invoice-1" && options?.method === "PATCH") {
        return Promise.resolve({
          id: "invoice-1",
          invoiceNumber: "INV-000042",
          status: "DRAFT",
        });
      }
      if (path === "/contacts") {
        return Promise.resolve([
          contactFixture("customer-1", "Beta Customer"),
          contactFixture("customer-2", "Second Customer"),
        ]);
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
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(
      <SalesInvoiceForm
        initialInvoice={
          {
            id: "invoice-1",
            organizationId: "org-1",
            invoiceNumber: "INV-000042",
            customerId: "customer-1",
            branchId: null,
            issueDate: "2026-06-11T00:00:00.000Z",
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
            customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null },
            journalEntry: null,
            reversalJournalEntry: null,
            paymentAllocations: [],
            paymentUnappliedAllocations: [],
            creditNoteAllocations: [],
            creditNotes: [],
            lines: [
              {
                id: "line-1",
                itemId: null,
                description: "Consulting",
                accountId: "revenue-1",
                quantity: "1.0000",
                unitPrice: "100.0000",
                discountRate: "0.0000",
                taxRateId: null,
              },
            ],
          } as any
        }
      />,
    );

    await waitFor(() => expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/customers/customer-1"));

    fireEvent.submit(screen.getByRole("button", { name: "Save changes" }).closest("form")!);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/customers/customer-1"));
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
