import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EditRecurringTransactionPage from "./page";

const apiRequestMock = jest.fn();
const pushMock = jest.fn();

jest.mock("next/navigation", () => ({ useParams: () => ({ id: "template-1" }), useRouter: () => ({ push: pushMock }) }));
jest.mock("@/hooks/use-active-organization", () => ({ useActiveOrganization: () => ({ id: "org-1", baseCurrency: "AED", timezone: "Asia/Dubai" }), useActiveOrganizationId: () => "org-1" }));
jest.mock("@/components/permissions/permission-provider", () => ({ usePermissions: () => ({ can: () => true }) }));
jest.mock("@/lib/api", () => ({ apiRequest: (...args: unknown[]) => apiRequestMock(...args) }));

describe("EditRecurringTransactionPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset(); pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/recurring-transactions/template-1" && !options) return Promise.resolve(templateFixture());
      if (path === "/recurring-transactions/catalogs") return Promise.resolve({ contacts: [{ id: "customer-1", name: "Beta Customer", type: "CUSTOMER", isActive: true }], accounts: [{ id: "revenue-1", code: "4100", name: "Service revenue", isActive: true, allowPosting: true }], items: [], taxRates: [], branches: [], costCenters: [], projects: [] });
      if (path === "/contacts") return Promise.resolve([{ id: "customer-1", name: "Beta Customer", type: "CUSTOMER", isActive: true }]);
      if (["/items", "/tax-rates", "/branches", "/cost-centers", "/projects"].includes(path)) return Promise.resolve([]);
      if (path === "/accounts") return Promise.resolve([{ id: "revenue-1", code: "4100", name: "Service revenue", isActive: true, allowPosting: true }]);
      if (path === "/recurring-transactions/template-1" && options?.method === "PATCH") return Promise.resolve({ ...templateFixture(), name: "Updated support", templateVersion: 4 });
      return Promise.reject(new Error(`Unexpected ${path}`));
    });
  });

  it("updates with optimistic template version evidence", async () => {
    render(<EditRecurringTransactionPage />);
    expect(await screen.findByRole("heading", { name: "Edit Monthly support" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Updated support" } });
    fireEvent.click(screen.getByRole("button", { name: "Save template changes" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/recurring-transactions/template-1", expect.objectContaining({ method: "PATCH", body: expect.objectContaining({ expectedVersion: 3, name: "Updated support", description: "Future invoice policy", terms: "Net 30", taxMode: "TAX_INCLUSIVE" }) })));
    expect(pushMock).toHaveBeenCalledWith("/recurring-transactions/template-1");
  });
});

function templateFixture() {
  return { id: "template-1", templateCode: "REC-000001", transactionType: "SALES_INVOICE", name: "Monthly support", description: "Future invoice policy", terms: "Net 30", taxMode: "TAX_INCLUSIVE", status: "DRAFT", timezone: "Asia/Dubai", frequency: "MONTHLY", interval: 1, startDate: "2026-07-01T00:00:00.000Z", nextRunAt: "2026-08-01T00:00:00.000Z", catchUpPolicy: "SKIP_MISSED", currencyCode: "AED", exchangeRatePolicy: "BASE_CURRENCY_ONLY", paymentTermsDays: 0, total: "100", templateVersion: 3, partyId: "customer-1", branchId: null, paidThroughAccountId: null, reference: null, notes: null, lines: [{ id: "line-1", accountId: "revenue-1", description: "Support", quantity: "1", unitPrice: "100", discountRate: "0", debit: "0", credit: "0", sortOrder: 0 }], runs: [] };
}
