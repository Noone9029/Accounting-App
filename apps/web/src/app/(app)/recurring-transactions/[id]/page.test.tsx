import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RecurringTransactionDetailPage from "./page";

const apiRequestMock = jest.fn();
const allowed = new Set(["recurringTransactions.read", "recurringTransactions.manage", "recurringTransactions.run", "recurringTransactions.review"]);
let activeOrganizationId = "org-1";

jest.mock("next/navigation", () => ({ useParams: () => ({ id: "template-1" }) }));
jest.mock("@/hooks/use-active-organization", () => ({ useActiveOrganizationId: () => activeOrganizationId }));
jest.mock("@/components/permissions/permission-provider", () => ({ usePermissions: () => ({ can: (permission: string) => allowed.has(permission) }) }));
jest.mock("@/lib/api", () => ({ apiRequest: (...args: unknown[]) => apiRequestMock(...args) }));

describe("RecurringTransactionDetailPage", () => {
  beforeEach(() => {
    activeOrganizationId = "org-1";
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/recurring-transactions/template-1" && !options) return Promise.resolve(templateFixture());
      if (path === "/recurring-transactions/template-1/runs?page=1&limit=25") return Promise.resolve({ items: [runFixture()], page: 1, limit: 25, total: 1, totalPages: 1 });
      if (path === "/recurring-transactions/template-1/run" && options?.method === "POST") return Promise.resolve({ ...runFixture(), id: "run-2", status: "GENERATED" });
      if (path === "/recurring-transactions/template-1/pause" && options?.method === "POST") return Promise.resolve({ ...templateFixture(), status: "PAUSED" });
      if (path === "/recurring-transactions/template-1/archive" && options?.method === "POST") return Promise.resolve({ ...templateFixture(), status: "ARCHIVED" });
      if (path === "/recurring-transactions/expense-proposals/proposal-1/review" && options?.method === "POST") return Promise.resolve({ ...proposalFixture(), status: "REVIEWED", reviewedCashExpense: { id: "expense-1", expenseNumber: "EXP-000001", status: "POSTED" } });
      return Promise.reject(new Error(`Unexpected ${path}`));
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it("shows schedule, dimensions, failure evidence, and generated draft targets", async () => {
    render(<RecurringTransactionDetailPage />);
    expect(await screen.findByRole("heading", { name: "Monthly support" })).toBeInTheDocument();
    expect(screen.getByText("Asia/Dubai")).toBeInTheDocument();
    expect(screen.getByText("Operations")).toBeInTheDocument();
    expect(screen.getByText("Project Falcon")).toBeInTheDocument();
    expect(screen.getByText("FISCAL_PERIOD_BLOCKED")).toBeInTheDocument();
    expect(screen.getByText(/generated records remain drafts/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /INV-000041/ })).toHaveAttribute("href", "/sales/invoices/invoice-41");
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/recurring-transactions/template-1/edit");
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

  it("archives explicitly and reviews draft expense proposals with idempotency", async () => {
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/recurring-transactions/template-1" && !options) return Promise.resolve({ ...templateFixture(), transactionType: "EXPENSE" });
      if (path === "/recurring-transactions/template-1/runs?page=1&limit=25") return Promise.resolve({
        items: [{ ...runFixture(), generatedSalesInvoice: undefined, generatedExpenseProposal: proposalFixture() }],
        page: 1, limit: 25, total: 1, totalPages: 1,
      });
      if (path === "/recurring-transactions/expense-proposals/proposal-1/review" && options?.method === "POST") return Promise.resolve({ ...proposalFixture(), status: "REVIEWED", reviewedCashExpense: { id: "expense-1", expenseNumber: "EXP-000001", status: "POSTED" } });
      if (path === "/recurring-transactions/template-1/archive" && options?.method === "POST") return Promise.resolve({ ...templateFixture(), status: "ARCHIVED" });
      return Promise.reject(new Error(`Unexpected ${path}`));
    });
    render(<RecurringTransactionDetailPage />);

    expect((await screen.findAllByText("94.5000 USD", { exact: false })).length).toBeGreaterThan(0);
    expect(screen.getByText(/Subtotal 100.0000 · discount 10.0000 · taxable 90.0000 · tax 4.5000/)).toBeInTheDocument();
    expect(screen.getByText(/Paid through/)).toHaveTextContent("1010 · Bank account");
    expect(screen.getByText(/USD\/AED @ 3.67250000 · 2026-07-12 · SNAPSHOT · snapshot-1/)).toBeInTheDocument();
    expect(screen.getByText("Immutable proposal lines (1)")).toBeInTheDocument();
    expect(screen.getByText(/gross 100.0000 - discount 10.0000 = taxable 90.0000 \+ tax 4.5000 = 94.5000 USD/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review and post expense" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review and post" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(
      "/recurring-transactions/expense-proposals/proposal-1/review",
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "Idempotency-Key": expect.any(String) }) }),
    ));
    expect(await screen.findByText("Expense proposal · REVIEWED")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /EXP-000001/ })).toHaveAttribute("href", "/purchases/cash-expenses/expense-1");

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/recurring-transactions/template-1/archive", { method: "POST", body: {} }));
  });

  it("loads bounded run-history pages", async () => {
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/recurring-transactions/template-1" && !options) return Promise.resolve(templateFixture());
      if (path === "/recurring-transactions/template-1/runs?page=1&limit=25") return Promise.resolve({ items: [runFixture()], page: 1, limit: 25, total: 26, totalPages: 2 });
      if (path === "/recurring-transactions/template-1/runs?page=2&limit=25") return Promise.resolve({ items: [{ ...runFixture(), id: "run-page-2", failureCode: "SECOND_PAGE_BLOCKER" }], page: 2, limit: 25, total: 26, totalPages: 2 });
      return Promise.reject(new Error(`Unexpected ${path}`));
    });
    render(<RecurringTransactionDetailPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Next runs" }));
    expect(await screen.findByText("SECOND_PAGE_BLOCKER")).toBeInTheDocument();
    expect(screen.getByText("Run page 2 of 2")).toBeInTheDocument();
  });

  it("keeps the review dialog open when posting the expense proposal fails", async () => {
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/recurring-transactions/template-1" && !options) return Promise.resolve({ ...templateFixture(), transactionType: "EXPENSE" });
      if (path === "/recurring-transactions/template-1/runs?page=1&limit=25") return Promise.resolve({ items: [{ ...runFixture(), generatedSalesInvoice: undefined, generatedExpenseProposal: proposalFixture() }], page: 1, limit: 25, total: 1, totalPages: 1 });
      if (path === "/recurring-transactions/expense-proposals/proposal-1/review" && options?.method === "POST") return Promise.reject(new Error("Review service unavailable."));
      return Promise.reject(new Error(`Unexpected ${path}`));
    });

    render(<RecurringTransactionDetailPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Review and post expense" }));
    fireEvent.click(screen.getByRole("button", { name: "Review and post" }));
    expect(await screen.findByText("Review service unavailable.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not render a late response from the previously active organization", async () => {
    let resolveOldTemplate!: (value: ReturnType<typeof templateFixture>) => void;
    let resolveOldRuns!: (value: unknown) => void;
    const oldTemplate = new Promise<ReturnType<typeof templateFixture>>((resolve) => { resolveOldTemplate = resolve; });
    const oldRuns = new Promise((resolve) => { resolveOldRuns = resolve; });
    let request = 0;
    apiRequestMock.mockImplementation(() => {
      request += 1;
      if (request === 1) return oldTemplate;
      if (request === 2) return oldRuns;
      if (request === 3) return Promise.resolve({ ...templateFixture(), name: "New organization template" });
      return Promise.resolve({ items: [], page: 1, limit: 25, total: 0, totalPages: 1 });
    });
    const view = render(<RecurringTransactionDetailPage />);
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledTimes(2));

    activeOrganizationId = "org-2";
    view.rerender(<RecurringTransactionDetailPage />);
    expect(await screen.findByRole("heading", { name: "New organization template" })).toBeInTheDocument();
    resolveOldTemplate({ ...templateFixture(), name: "Old organization template" });
    resolveOldRuns({ items: [runFixture()], page: 1, limit: 25, total: 1, totalPages: 1 });
    await Promise.resolve();
    expect(screen.queryByRole("heading", { name: "Old organization template" })).not.toBeInTheDocument();
  });
});

function templateFixture() {
  return {
    id: "template-1", templateCode: "REC-000001", transactionType: "SALES_INVOICE", name: "Monthly support", status: "ACTIVE",
    timezone: "Asia/Dubai", frequency: "MONTHLY", interval: 1, startDate: "2026-07-01T00:00:00.000Z", nextRunAt: "2026-07-31T20:00:00.000Z",
    catchUpPolicy: "GENERATE_LATEST_ONLY", currencyCode: "AED", exchangeRatePolicy: "BASE_CURRENCY_ONLY", total: "115.0000", templateVersion: 2,
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

function proposalFixture() {
  return {
    id: "proposal-1", status: "DRAFT", proposedDate: "2026-07-12T00:00:00.000Z", currency: "USD", baseCurrency: "AED", exchangeRate: "3.67250000",
    rateDate: "2026-07-12T00:00:00.000Z", rateSource: "SNAPSHOT", rateSnapshotId: "snapshot-1", subtotal: "100.0000", discountTotal: "10.0000", taxableTotal: "90.0000", taxTotal: "4.5000", total: "94.5000",
    paidThroughAccount: { id: "bank-1", code: "1010", name: "Bank account" }, reviewedCashExpense: null,
    lines: [{ id: "proposal-line-1", description: "Software", quantity: "1.0000", unitPrice: "100.0000", discountRate: "10.0000", lineGrossAmount: "100.0000", discountAmount: "10.0000", taxableAmount: "90.0000", taxAmount: "4.5000", lineTotal: "94.5000", sortOrder: 0, account: { id: "expense-1", code: "6100", name: "Software expense" }, costCenter: { id: "cc-1", code: "OPS", name: "Operations" }, project: { id: "project-1", code: "FALCON", name: "Project Falcon" } }],
  };
}
