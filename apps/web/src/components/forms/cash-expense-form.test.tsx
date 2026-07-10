import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { CashExpenseForm } from "./cash-expense-form";

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
  useActiveOrganization: () => ({ id: "org-1", baseCurrency: "SAR" }),
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("CashExpenseForm", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/purchases/cash-expenses/new");
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([contactFixture("supplier-1", "Beta Supplier"), contactFixture("supplier-2", "Second Supplier")]);
      }
      if (path === "/items") {
        return Promise.resolve([]);
      }
      if (path === "/accounts") {
        return Promise.resolve([
          { id: "cash-1", organizationId: "org-1", code: "1110", name: "Cash on hand", type: "ASSET", isActive: true, allowPosting: true },
          { id: "expense-1", organizationId: "org-1", code: "5100", name: "Office expenses", type: "EXPENSE", isActive: true, allowPosting: true },
        ]);
      }
      if (path === "/tax-rates") {
        return Promise.resolve([{ id: "tax-1", name: "VAT 15%", rate: "15.0000", scope: "PURCHASES", category: "STANDARD", isActive: true }]);
      }
      if (path === "/branches") {
        return Promise.resolve([{ id: "branch-1", organizationId: "org-1", name: "Riyadh Demo Branch", displayName: "Riyadh Demo Branch", countryCode: "SA", isDefault: true }]);
      }
      if (path === "/bank-accounts") {
        return Promise.resolve([{ id: "bank-profile-1", organizationId: "org-1", accountId: "cash-1", displayName: "Main cash", currency: "SAR" }]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("prefills supplier return context and keeps immediate-posting boundaries visible", async () => {
    window.history.pushState({}, "", "/purchases/cash-expenses/new?supplierId=supplier-2&returnTo=/suppliers/supplier-2");

    render(<CashExpenseForm />);

    await waitFor(() => expect(screen.getByLabelText("Supplier/contact")).toHaveValue("supplier-2"));
    await waitFor(() => expect(screen.getByLabelText(/Paid through/)).toHaveValue("cash-1"));
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/suppliers/supplier-2");
    expect(screen.getByText(/Posting debits expense\/VAT and credits the selected paid-through account immediately/i)).toBeInTheDocument();
    expect(screen.getByText(/No accounts payable, supplier payment run, bank transfer, reconciliation match, or tax-authority submission is created here/i)).toBeInTheDocument();
    expect(screen.queryByText(/auto.?match|auto.?reconcile|autopay|bank feed|payment provider|ZATCA cleared|VAT filed/i)).not.toBeInTheDocument();
  });

  it("rejects a stale supplier query id that is not in the active organization setup data", async () => {
    window.history.pushState({}, "", "/purchases/cash-expenses/new?supplierId=prior-org-supplier");
    const { container } = render(<CashExpenseForm />);

    await waitFor(() => expect(screen.getByLabelText(/Paid through/)).toHaveValue("cash-1"));
    const tableInputs = container.querySelectorAll<HTMLInputElement>("tbody input");
    fireEvent.change(tableInputs[0]!, { target: { value: "Office supplies" } });
    fireEvent.change(tableInputs[2]!, { target: { value: "100.0000" } });
    const expenseAccountOption = screen.getByRole("option", { name: "5100 Office expenses" });
    fireEvent.change(expenseAccountOption.parentElement!, { target: { value: "expense-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Post cash expense" }));

    expect(await screen.findByText(/supplier\/contact does not belong to the active organization/i)).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalledWith("/cash-expenses", expect.objectContaining({ method: "POST" }));
  });
});

function contactFixture(id: string, name: string) {
  return {
    id,
    organizationId: "org-1",
    name,
    displayName: name,
    type: "SUPPLIER",
    email: null,
    phone: null,
    taxNumber: null,
    isActive: true,
  };
}
