import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import RecurringTransactionsPage from "./page";

const apiRequestMock = jest.fn();
let organizationId: string | null = "org-1";
const allowed = new Set(["recurringTransactions.read", "recurringTransactions.manage", "recurringTransactions.run"]);

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>,
}));
jest.mock("@/hooks/use-active-organization", () => ({ useActiveOrganizationId: () => organizationId }));
jest.mock("@/components/permissions/permission-provider", () => ({ usePermissions: () => ({ can: (permission: string) => allowed.has(permission) }) }));
jest.mock("@/lib/api", () => ({ apiRequest: (...args: unknown[]) => apiRequestMock(...args) }));

describe("RecurringTransactionsPage", () => {
  beforeEach(() => {
    organizationId = "org-1";
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/recurring-transactions/readiness") return Promise.resolve({
        status: "NEEDS_ATTENTION", templateCount: 2, activeTemplates: 1, dueTemplates: 1, failedRuns: 0, blockedRuns: 1,
        generatedDraftsAwaitingReview: 2, schedulesMissingReferences: 0, foreignTemplatesMissingRateEvidence: 0,
        runsScheduledInsideLockedPeriods: 0, blocksFiscalClose: false, asOf: "2026-07-12T10:00:00.000Z",
      });
      if (path.startsWith("/recurring-transactions?")) return Promise.resolve({ items: [templateFixture()], page: 1, limit: 25, total: 1, totalPages: 1 });
      return Promise.reject(new Error(`Unexpected ${path}`));
    });
  });

  it("renders an exception-first recurring workspace with draft-only wording", async () => {
    render(<RecurringTransactionsPage />);
    expect(await screen.findByRole("heading", { name: "Recurring transactions" })).toBeInTheDocument();
    expect(screen.getByText(/Generated records stay in draft/i)).toBeInTheDocument();
    expect(await screen.findByText("1 due")).toBeInTheDocument();
    expect(screen.getByText("1 blocked")).toBeInTheDocument();
    expect(screen.getByText("REC-000001")).toBeInTheDocument();
    expect(screen.getByText("Monthly support")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New template" })).toHaveAttribute("href", "/recurring-transactions/new");
    expect(screen.getByRole("link", { name: "Review" })).toHaveAttribute("href", "/recurring-transactions/template-1");
  });

  it("applies type and status filters without stale tenant data", async () => {
    render(<RecurringTransactionsPage />);
    await screen.findByText("REC-000001");
    fireEvent.change(screen.getByLabelText("Transaction type"), { target: { value: "PURCHASE_BILL" } });
    fireEvent.change(screen.getByLabelText("Template status"), { target: { value: "ACTIVE" } });
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(expect.stringContaining("transactionType=PURCHASE_BILL")));
    expect(apiRequestMock).toHaveBeenCalledWith(expect.stringContaining("status=ACTIVE"));
  });

  it("does not fetch without an active organization", () => {
    organizationId = null;
    render(<RecurringTransactionsPage />);
    expect(screen.getByText(/select an organization/i)).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });
});

function templateFixture() {
  return {
    id: "template-1", templateCode: "REC-000001", transactionType: "SALES_INVOICE", name: "Monthly support", status: "ACTIVE",
    timezone: "Asia/Dubai", frequency: "MONTHLY", interval: 1, nextRunAt: "2026-07-31T20:00:00.000Z", currencyCode: "AED",
    exchangeRatePolicy: "BASE_CURRENCY_ONLY", total: "115.0000", templateVersion: 2,
    party: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer" }, lines: [], runs: [{ status: "BLOCKED", failureCode: "FISCAL_PERIOD_BLOCKED" }],
  };
}
