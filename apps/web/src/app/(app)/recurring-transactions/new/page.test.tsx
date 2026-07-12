import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NewRecurringTransactionPage from "./page";

const apiRequestMock = jest.fn();
const pushMock = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
jest.mock("@/hooks/use-active-organization", () => ({ useActiveOrganization: () => ({ id: "org-1", baseCurrency: "AED", timezone: "Asia/Dubai" }) }));
jest.mock("@/components/permissions/permission-provider", () => ({ usePermissions: () => ({ can: () => true }) }));
jest.mock("@/lib/api", () => ({ apiRequest: (...args: unknown[]) => apiRequestMock(...args) }));

describe("NewRecurringTransactionPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset(); pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string, options?: { method?: string; body?: unknown }) => {
      if (path === "/contacts") return Promise.resolve([{ id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", isActive: true }]);
      if (path === "/accounts") return Promise.resolve([{ id: "revenue-1", code: "4100", name: "Service revenue", isActive: true, allowPosting: true, type: "REVENUE" }]);
      if (path === "/items") return Promise.resolve([]);
      if (path === "/tax-rates") return Promise.resolve([]);
      if (path === "/branches") return Promise.resolve([]);
      if (path === "/cost-centers") return Promise.resolve([{ id: "cc-1", code: "OPS", name: "Operations", status: "ACTIVE" }]);
      if (path === "/projects") return Promise.resolve([{ id: "project-1", code: "FALCON", name: "Project Falcon", status: "ACTIVE" }]);
      if (path === "/recurring-transactions" && options?.method === "POST") return Promise.resolve({ id: "template-1" });
      return Promise.reject(new Error(`Unexpected ${path}`));
    });
  });

  it("creates a dimension-aware draft template and redirects to review", async () => {
    render(<NewRecurringTransactionPage />);
    expect(await screen.findByRole("heading", { name: "New recurring template" })).toBeInTheDocument();
    expect(screen.getByText("Next occurrence preview")).toBeInTheDocument();
    expect(screen.getByLabelText("Catch-up policy")).toHaveValue("SKIP_MISSED");
    await screen.findByRole("option", { name: "Beta Customer" });
    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Monthly support" } });
    fireEvent.change(screen.getByLabelText("Party"), { target: { value: "customer-1" } });
    fireEvent.change(screen.getByLabelText("Description for line 1"), { target: { value: "Support retainer" } });
    fireEvent.change(screen.getByLabelText("Account for line 1"), { target: { value: "revenue-1" } });
    fireEvent.change(screen.getByLabelText("Unit price for line 1"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Cost center for line 1"), { target: { value: "cc-1" } });
    fireEvent.change(screen.getByLabelText("Project for line 1"), { target: { value: "project-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft template" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/recurring-transactions", expect.objectContaining({
      method: "POST",
      body: expect.objectContaining({
        transactionType: "SALES_INVOICE", currencyCode: "AED", exchangeRatePolicy: "BASE_CURRENCY_ONLY", partyId: "customer-1",
        lines: [expect.objectContaining({ accountId: "revenue-1", costCenterId: "cc-1", projectId: "project-1" })],
      }),
    })));
    expect(pushMock).toHaveBeenCalledWith("/recurring-transactions/template-1");
  });

  it("switches to balanced debit and credit inputs for manual journals", async () => {
    render(<NewRecurringTransactionPage />);
    await screen.findByRole("option", { name: "Beta Customer" });
    fireEvent.change(screen.getByLabelText("Transaction type"), { target: { value: "MANUAL_JOURNAL" } });
    expect(screen.getByLabelText("Debit for line 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Credit for line 1")).toBeInTheDocument();
    expect(screen.queryByLabelText("Party")).not.toBeInTheDocument();
    expect(screen.getByText(/debits must equal credits/i)).toBeInTheDocument();
  });
});
