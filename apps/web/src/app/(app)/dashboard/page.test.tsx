import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "./page";
import type { DashboardSummary } from "@/lib/types";

const apiRequestMock = jest.fn();
let mockActiveMembership: { role: { permissions: string[] } } = {
  role: { permissions: ["dashboard.view", "salesInvoices.view", "contacts.view"] },
};

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({ activeMembership: mockActiveMembership }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("DashboardPage Sales/AR attention", () => {
  beforeEach(() => {
    mockActiveMembership = { role: { permissions: ["dashboard.view", "salesInvoices.view", "contacts.view"] } };
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/dashboard/summary") {
        return Promise.resolve(summaryFixture());
      }
      if (path === "/dashboard/onboarding-checklist") {
        return Promise.resolve(null);
      }
      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });
  });

  it("renders Sales/AR attention panels with safe read-only workflow links", async () => {
    const { container } = render(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: "Sales/AR attention" })).toBeInTheDocument();
    expect(screen.getByText(/Dashboard attention items are read-only workflow signals/)).toBeInTheDocument();
    expect(screen.getByText("Overdue invoices")).toBeInTheDocument();
    expect(screen.getByText("Collection follow-ups")).toBeInTheDocument();
    expect(screen.getByText("Quotes awaiting action")).toBeInTheDocument();
    expect(screen.getByText("Recurring templates due for manual generation")).toBeInTheDocument();
    expect(screen.getByText("Delivery notes awaiting delivery")).toBeInTheDocument();
    expect(screen.getByText("Top customers by outstanding balance")).toBeInTheDocument();
    expect(screen.getByText("Draft invoices generated from recurring templates")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /INV-000001/ })).toHaveAttribute("href", "/sales/invoices/invoice-1");
    expect(screen.getByRole("link", { name: /COL-000001/ })).toHaveAttribute("href", "/sales/collections/case-1");
    expect(screen.getByRole("link", { name: /SQ-000001/ })).toHaveAttribute("href", "/sales/quotes/quote-1");
    expect(screen.getByRole("link", { name: /REC-000001/ })).toHaveAttribute("href", "/sales/recurring-invoices/rec-1");
    expect(screen.getByRole("link", { name: /DN-000001/ })).toHaveAttribute("href", "/sales/delivery-notes/dn-1");
    expect(screen.getByRole("link", { name: /Acme/ })).toHaveAttribute("href", "/customers/customer-1");
    expect(screen.getByRole("link", { name: /INV-DRAFT-REC/ })).toHaveAttribute("href", "/sales/invoices/invoice-rec-1");

    expect(container).not.toHaveTextContent(/email sent/i);
    expect(container).not.toHaveTextContent(/reminder sent/i);
    expect(container).not.toHaveTextContent(/payment link/i);
    expect(container).not.toHaveTextContent(/payment collected/i);
    expect(container).not.toHaveTextContent(/automatic scheduler/i);
    expect(container).not.toHaveTextContent(/VAT filed/i);
    expect(container).not.toHaveTextContent(/ZATCA cleared|ZATCA reported/i);
    expect(container).not.toHaveTextContent(/stock moved/i);
  });

  it("renders conservative Sales/AR attention empty states", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/dashboard/summary") {
        return Promise.resolve({
          ...summaryFixture(),
          salesAttention: emptySalesAttentionFixture(),
        });
      }
      if (path === "/dashboard/onboarding-checklist") {
        return Promise.resolve(null);
      }
      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    const { container } = render(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: "Sales/AR attention" })).toBeInTheDocument();
    expect(screen.getByText("No overdue invoices requiring attention.")).toBeInTheDocument();
    expect(screen.getByText("No collection follow-ups due.")).toBeInTheDocument();
    expect(screen.getByText("No quotes needing action.")).toBeInTheDocument();
    expect(screen.getByText("No recurring templates due for manual generation.")).toBeInTheDocument();
    expect(screen.getByText("No delivery notes awaiting action.")).toBeInTheDocument();
    expect(screen.getByText("No outstanding customer balances to show.")).toBeInTheDocument();

    expect(container).not.toHaveTextContent(/everything is compliant/i);
    expect(container).not.toHaveTextContent(/all taxes filed/i);
    expect(container).not.toHaveTextContent(/all customers paid/i);
    expect(container).not.toHaveTextContent(/ZATCA cleared|ZATCA reported/i);
  });

  it("keeps top customer rows read-only when contacts view permission is unavailable", async () => {
    mockActiveMembership = { role: { permissions: ["dashboard.view", "salesInvoices.view"] } };

    const { container } = render(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: "Sales/AR attention" })).toBeInTheDocument();
    expect(screen.getAllByText("Acme").length).toBeGreaterThan(0);
    expect(container.querySelector('a[href="/customers/customer-1"]')).toBeNull();
  });

  it("hides Sales/AR attention rows from users without Sales/AR view permission", async () => {
    mockActiveMembership = { role: { permissions: ["dashboard.view"] } };

    render(<DashboardPage />);

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/dashboard/summary"));
    expect(screen.queryByRole("heading", { name: "Sales/AR attention" })).not.toBeInTheDocument();
    expect(screen.queryByText("INV-000001")).not.toBeInTheDocument();
    expect(screen.queryByText("COL-000001")).not.toBeInTheDocument();
  });
});

function summaryFixture(): DashboardSummary {
  return {
    asOf: "2026-06-04T00:00:00.000Z",
    currency: "SAR",
    sales: {
      unpaidInvoiceCount: 1,
      unpaidInvoiceBalance: "75.0000",
      overdueInvoiceCount: 1,
      overdueInvoiceBalance: "75.0000",
      salesThisMonth: "100.0000",
      customerPaymentThisMonth: "25.0000",
    },
    salesAttention: {
      readOnly: true,
      noMutation: true,
      helperText:
        "Dashboard attention items are read-only workflow signals. They do not send emails, collect payments, post journals, file VAT, call ZATCA, or move inventory.",
      overdueInvoices: {
        count: 1,
        total: "75.0000",
        topItems: [
          {
            id: "invoice-1",
            number: "INV-000001",
            customerName: "Acme",
            amount: "75.0000",
            issueDate: "2026-05-02T00:00:00.000Z",
            dueDate: "2026-05-03T00:00:00.000Z",
            status: "FINALIZED",
            href: "/sales/invoices/invoice-1",
          },
        ],
      },
      collections: {
        openCount: 2,
        dueTodayCount: 1,
        overdueFollowUpCount: 1,
        promisedToPayTotal: "60.0000",
        disputedCount: 1,
        topItems: [
          {
            id: "case-1",
            number: "COL-000001",
            customerName: "Acme",
            amount: "75.0000",
            status: "PROMISED_TO_PAY",
            followUpDate: "2026-06-04T00:00:00.000Z",
            promisedPaymentDate: "2026-06-10T00:00:00.000Z",
            promisedAmount: "60.0000",
            href: "/sales/collections/case-1",
          },
        ],
      },
      quotes: {
        awaitingAcceptanceCount: 1,
        expiringSoonCount: 1,
        acceptedNotConvertedCount: 1,
        topItems: [
          {
            id: "quote-1",
            number: "SQ-000001",
            customerName: "Acme",
            amount: "120.0000",
            status: "SENT",
            issueDate: "2026-05-01T00:00:00.000Z",
            expiryDate: "2026-06-08T00:00:00.000Z",
            href: "/sales/quotes/quote-1",
          },
        ],
      },
      recurringInvoices: {
        activeCount: 2,
        dueSoonCount: 1,
        overdueForGenerationCount: 1,
        recentlyGeneratedDraftInvoiceCount: 1,
        topItems: [
          {
            id: "rec-1",
            number: "REC-000001",
            customerName: "Acme",
            amount: "44.0000",
            status: "ACTIVE",
            nextRunDate: "2026-06-03T00:00:00.000Z",
            templateName: "Monthly support",
            href: "/sales/recurring-invoices/rec-1",
          },
        ],
        recentDraftInvoices: [
          {
            id: "invoice-rec-1",
            number: "INV-DRAFT-REC",
            customerName: "Acme",
            amount: "44.0000",
            status: "DRAFT",
            issueDate: "2026-06-04T00:00:00.000Z",
            dueDate: "2026-06-18T00:00:00.000Z",
            templateNumber: "REC-000001",
            templateName: "Monthly support",
            href: "/sales/invoices/invoice-rec-1",
            sourceHref: "/sales/recurring-invoices/rec-1",
          },
        ],
      },
      deliveryNotes: {
        draftCount: 1,
        issuedNotDeliveredCount: 1,
        overdueDeliveryCount: 1,
        topItems: [
          {
            id: "dn-1",
            number: "DN-000001",
            customerName: "Acme",
            status: "ISSUED",
            issueDate: "2026-06-01T00:00:00.000Z",
            deliveryDate: "2026-06-03T00:00:00.000Z",
            href: "/sales/delivery-notes/dn-1",
          },
        ],
      },
      customers: {
        topOutstanding: [
          {
            id: "customer-1",
            customerName: "Acme",
            outstandingBalance: "75.0000",
            overdueAmount: "75.0000",
            openCollectionCaseCount: 1,
            href: "/customers/customer-1",
          },
        ],
      },
    },
    purchases: {
      unpaidBillCount: 0,
      unpaidBillBalance: "0.0000",
      overdueBillCount: 0,
      overdueBillBalance: "0.0000",
      purchasesThisMonth: "0.0000",
      supplierPaymentThisMonth: "0.0000",
    },
    banking: {
      bankAccountCount: 1,
      totalBankBalance: "100.0000",
      unreconciledTransactionCount: 0,
      latestReconciliationDate: null,
    },
    inventory: {
      trackedItemCount: 0,
      lowStockCount: 0,
      negativeStockCount: 0,
      inventoryEstimatedValue: "0.0000",
      clearingVarianceCount: 0,
      lowStockItems: [],
    },
    reports: {
      trialBalanceBalanced: true,
      profitAndLossNetProfit: "0.0000",
      balanceSheetBalanced: true,
    },
    trends: {
      monthlySales: [],
      monthlyPurchases: [],
      monthlyNetProfit: [],
      cashBalanceTrend: [],
    },
    aging: {
      receivablesBuckets: [],
      payablesBuckets: [],
    },
    compliance: {
      zatcaProductionReady: false,
      zatcaBlockingReasonCount: 0,
      fiscalPeriodsLockedCount: 0,
      auditLogCountThisMonth: 0,
    },
    attentionItems: [],
  };
}

function emptySalesAttentionFixture(): DashboardSummary["salesAttention"] {
  return {
    readOnly: true,
    noMutation: true,
    helperText:
      "Dashboard attention items are read-only workflow signals. They do not send emails, collect payments, post journals, file VAT, call ZATCA, or move inventory.",
    overdueInvoices: {
      count: 0,
      total: "0.0000",
      topItems: [],
    },
    collections: {
      openCount: 0,
      dueTodayCount: 0,
      overdueFollowUpCount: 0,
      promisedToPayTotal: "0.0000",
      disputedCount: 0,
      topItems: [],
    },
    quotes: {
      awaitingAcceptanceCount: 0,
      expiringSoonCount: 0,
      acceptedNotConvertedCount: 0,
      topItems: [],
    },
    recurringInvoices: {
      activeCount: 0,
      dueSoonCount: 0,
      overdueForGenerationCount: 0,
      recentlyGeneratedDraftInvoiceCount: 0,
      topItems: [],
      recentDraftInvoices: [],
    },
    deliveryNotes: {
      draftCount: 0,
      issuedNotDeliveredCount: 0,
      overdueDeliveryCount: 0,
      topItems: [],
    },
    customers: {
      topOutstanding: [],
    },
  };
}
