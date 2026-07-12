import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RecurringTransactionDetailPage from "./page";

const apiRequestMock = jest.fn();
const allowed = new Set(["recurringTransactions.read", "recurringTransactions.manage", "recurringTransactions.run"]);

jest.mock("next/navigation", () => ({ useParams: () => ({ id: "template-1" }) }));
jest.mock("@/hooks/use-active-organization", () => ({ useActiveOrganizationId: () => "org-1" }));
jest.mock("@/components/permissions/permission-provider", () => ({ usePermissions: () => ({ can: (permission: string) => allowed.has(permission) }) }));
jest.mock("@/lib/api", () => ({ apiRequest: (...args: unknown[]) => apiRequestMock(...args) }));

describe("RecurringTransactionDetailPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/recurring-transactions/template-1" && !options) return Promise.resolve(templateFixture());
      if (path === "/recurring-transactions/template-1/runs?page=1&limit=25") return Promise.resolve({ items: [runFixture()], page: 1, limit: 25, total: 1, totalPages: 1 });
      if (path === "/recurring-transactions/template-1/run" && options?.method === "POST") return Promise.resolve({ ...runFixture(), id: "run-2", status: "GENERATED" });
      if (path === "/recurring-transactions/template-1/pause" && options?.method === "POST") return Promise.resolve({ ...templateFixture(), status: "PAUSED" });
      return Promise.reject(new Error(`Unexpected ${path}`));
    });
  });

  it("shows schedule, dimensions, failure evidence, and generated draft targets", async () => {
    render(<RecurringTransactionDetailPage />);
    expect(await screen.findByRole("heading", { name: "Monthly support" })).toBeInTheDocument();
    expect(screen.getByText("Asia/Dubai")).toBeInTheDocument();
    expect(screen.getByText("Operations")).toBeInTheDocument();
    expect(screen.getByText("Project Falcon")).toBeInTheDocument();
    expect(screen.getByText("FISCAL_PERIOD_BLOCKED")).toBeInTheDocument();
    expect(screen.getByText(/generated records remain drafts/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /INV-000041/ })).toHaveAttribute("href", "/sales/invoices/invoice-41");
  });

  it("runs with an idempotency key and supports an explicit pause", async () => {
    render(<RecurringTransactionDetailPage />);
    await screen.findByRole("heading", { name: "Monthly support" });
    fireEvent.click(screen.getByRole("button", { name: "Run now" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(
      "/recurring-transactions/template-1/run",
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "Idempotency-Key": expect.any(String) }) }),
    ));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/recurring-transactions/template-1/pause", { method: "POST", body: {} }));
  });
});

function templateFixture() {
  return {
    id: "template-1", templateCode: "REC-000001", transactionType: "SALES_INVOICE", name: "Monthly support", status: "ACTIVE",
    timezone: "Asia/Dubai", frequency: "MONTHLY", interval: 1, startDate: "2026-07-01T00:00:00.000Z", nextRunAt: "2026-07-31T20:00:00.000Z",
    catchUpPolicy: "RUN_LATEST_ONLY", currencyCode: "AED", exchangeRatePolicy: "BASE_CURRENCY_ONLY", total: "115.0000", templateVersion: 2,
    paymentTermsDays: 30, party: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer" }, runs: [],
    lines: [{ id: "line-1", accountId: "revenue-1", description: "Support retainer", quantity: "1", unitPrice: "100", discountRate: "0", debit: "0", credit: "0", sortOrder: 0,
      account: { id: "revenue-1", code: "4100", name: "Service revenue" }, costCenter: { id: "cc-1", code: "OPS", name: "Operations" }, project: { id: "project-1", code: "FALCON", name: "Project Falcon" } }],
  };
}

function runFixture() {
  return {
    id: "run-1", templateId: "template-1", templateVersion: 2, scheduledFor: "2026-06-30T20:00:00.000Z", scheduledLocalDate: "2026-07-01T00:00:00.000Z",
    trigger: "SCHEDULED", status: "BLOCKED", attemptCount: 1, failureCode: "FISCAL_PERIOD_BLOCKED", failureMessageSafe: "The posting date is in a locked fiscal period.",
    generatedSalesInvoice: { id: "invoice-41", invoiceNumber: "INV-000041", status: "DRAFT" },
  };
}
