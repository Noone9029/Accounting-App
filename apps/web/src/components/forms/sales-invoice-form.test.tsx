import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
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
