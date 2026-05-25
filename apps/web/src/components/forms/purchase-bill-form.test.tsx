import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { PurchaseBillForm } from "./purchase-bill-form";

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

describe("PurchaseBillForm", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/purchases/bills/new");
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([
          contactFixture("supplier-1", "Beta Supplier"),
          contactFixture("supplier-2", "Second Supplier"),
        ]);
      }
      if (path === "/items") {
        return Promise.resolve([]);
      }
      if (path === "/accounts") {
        return Promise.resolve([
          {
            id: "expense-1",
            code: "501",
            name: "Office supplies",
            type: "EXPENSE",
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
  });

  it("prefills the supplier from the new-bill route query string", async () => {
    window.history.pushState({}, "", "/purchases/bills/new?supplierId=supplier-2&returnTo=/suppliers/supplier-2");

    render(<PurchaseBillForm />);

    await waitFor(() => expect(screen.getByLabelText("Supplier")).toHaveValue("supplier-2"));
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/suppliers/supplier-2");
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
