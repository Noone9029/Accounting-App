import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import NewCustomerPaymentPage from "./page";

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

describe("NewCustomerPaymentPage", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/sales/customer-payments/new");
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([contactFixture("customer-1", "Beta Customer")]);
      }
      if (path === "/accounts") {
        return Promise.resolve([
          {
            id: "cash-1",
            code: "111",
            name: "Cash on hand",
            type: "ASSET",
            isActive: true,
            allowPosting: true,
          },
        ]);
      }
      if (path === "/bank-accounts") {
        return Promise.resolve([]);
      }
      if (path === "/sales-invoices/open?customerId=customer-1") {
        return Promise.resolve([
          {
            id: "invoice-1",
            invoiceNumber: "INV-001",
            issueDate: "2026-05-21T00:00:00.000Z",
            dueDate: null,
            currency: "SAR",
            status: "FINALIZED",
            total: "115.0000",
            balanceDue: "115.0000",
            customerId: "customer-1",
          },
        ]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("prefills customer and invoice allocation from the route query string", async () => {
    window.history.pushState({}, "", "/sales/customer-payments/new?customerId=customer-1&invoiceId=invoice-1&returnTo=/customers/customer-1");

    render(<NewCustomerPaymentPage />);

    await waitFor(() => expect(screen.getByLabelText("Customer")).toHaveValue("customer-1"));
    await waitFor(() => expect(screen.getByLabelText("Amount received")).toHaveValue("115.0000"));
    expect(screen.getByText("INV-001")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/customers/customer-1");
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
