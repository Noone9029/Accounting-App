import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import NewSupplierPaymentPage from "./page";

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

describe("NewSupplierPaymentPage", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/purchases/supplier-payments/new");
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([contactFixture("supplier-1", "Beta Supplier")]);
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
      if (path === "/purchase-bills/open?supplierId=supplier-1") {
        return Promise.resolve([
          {
            id: "bill-1",
            billNumber: "BILL-001",
            billDate: "2026-05-21T00:00:00.000Z",
            dueDate: null,
            currency: "SAR",
            status: "FINALIZED",
            total: "115.0000",
            balanceDue: "115.0000",
            supplierId: "supplier-1",
          },
        ]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("prefills supplier and bill allocation from the route query string", async () => {
    window.history.pushState({}, "", "/purchases/supplier-payments/new?supplierId=supplier-1&billId=bill-1");

    render(<NewSupplierPaymentPage />);

    await waitFor(() => expect(screen.getByLabelText("Supplier")).toHaveValue("supplier-1"));
    await waitFor(() => expect(screen.getByLabelText("Amount paid")).toHaveValue("115.0000"));
    expect(screen.getByText("BILL-001")).toBeInTheDocument();
  });
});

function contactFixture(id: string, name: string) {
  return {
    id,
    name,
    displayName: name,
    type: "SUPPLIER",
    email: null,
    phone: null,
    taxNumber: null,
    isActive: true,
  };
}
