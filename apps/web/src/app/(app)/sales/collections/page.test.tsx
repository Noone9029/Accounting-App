import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import CollectionsPage from "./page";
import type { CollectionCase, CollectionSummary } from "@/lib/types";

const apiRequestMock = jest.fn();
let mockAllowedPermissions = new Set<string>();

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
  useRouter: () => ({ refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: string) => mockAllowedPermissions.has(permission),
  }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("CollectionsPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    mockAllowedPermissions = new Set(["salesInvoices.view", "salesInvoices.create"]);
  });

  it("shows collection summary, cases, create action, and safe non-posting wording", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/collections/summary") {
        return Promise.resolve(summaryFixture());
      }
      if (path === "/collections") {
        return Promise.resolve([collectionCaseFixture()]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<CollectionsPage />);

    await waitFor(() => expect(screen.getByText("COL-000001")).toBeInTheDocument());
    expect(screen.getByText("Collections")).toBeInTheDocument();
    expect(screen.getByText(/do not post journals, allocate payments, send email or reminders, create payment links, file VAT, call ZATCA, or change invoice balances/i)).toBeInTheDocument();
    expect(screen.getByText("Overdue amount")).toBeInTheDocument();
    expect(screen.getByText("Overdue invoices")).toBeInTheDocument();
    expect(screen.getByText("Overdue follow-ups")).toBeInTheDocument();
    expect(screen.getByText("Top overdue customers")).toBeInTheDocument();
    expect(screen.getByText("Aging buckets")).toBeInTheDocument();
    expect(screen.getAllByText("Beta Customer").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("1-30 days")).toBeInTheDocument();
    expect(screen.getByText("INV-000010")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New collection case" })).toHaveAttribute("href", "/sales/collections/new");
    expect(screen.queryByText(/tax invoice/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/payment link sent/i)).not.toBeInTheDocument();
  });

  it("renders Arabic collections copy with unchanged route links and record numbers", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/collections/summary") {
        return Promise.resolve(summaryFixture());
      }
      if (path === "/collections") {
        return Promise.resolve([collectionCaseFixture()]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(
      <AppLocaleProvider initialLocale="ar">
        <CollectionsPage />
      </AppLocaleProvider>,
    );

    await waitFor(() => expect(screen.getByText("COL-000001")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "التحصيل" })).toBeInTheDocument();
    expect(screen.getByText("المبلغ المتأخر")).toBeInTheDocument();
    expect(screen.getByText("أبرز العملاء المتأخرين")).toBeInTheDocument();
    expect(screen.getAllByText("وعد بالدفع").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "حالة تحصيل جديدة" })).toHaveAttribute("href", "/sales/collections/new");
    expect(screen.getByRole("link", { name: "فتح" })).toHaveAttribute("href", "/sales/collections/case-1");
  });

  it("hides create action for view-only users", async () => {
    mockAllowedPermissions = new Set(["salesInvoices.view"]);
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/collections/summary") {
        return Promise.resolve(summaryFixture());
      }
      if (path === "/collections") {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<CollectionsPage />);

    await waitFor(() => expect(screen.getByText("No collection cases yet.")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "New collection case" })).not.toBeInTheDocument();
  });
});

function summaryFixture(overrides: Partial<CollectionSummary> = {}): CollectionSummary {
  return {
    totalOverdueAmount: "125.0000",
    overdueInvoiceCount: 1,
    openCollectionCaseCount: 1,
    casesDueToday: 0,
    casesOverdueForFollowUp: 1,
    promisedToPayTotal: "60.0000",
    disputedTotal: "0.0000",
    topCustomersByOverdueAmount: [{ customerId: "customer-1", customerName: "Beta Customer", overdueAmount: "125.0000", overdueInvoiceCount: 1 }],
    agingBuckets: [{ bucket: "1_30", amount: "125.0000" }],
    safeWording: "Collections records track follow-up work only.",
    ...overrides,
  };
}

function collectionCaseFixture(overrides: Partial<CollectionCase> = {}): CollectionCase {
  return {
    id: "case-1",
    organizationId: "org-1",
    caseNumber: "COL-000001",
    customerId: "customer-1",
    salesInvoiceId: "invoice-1",
    status: "PROMISED_TO_PAY",
    priority: "HIGH",
    followUpDate: "2026-06-08T00:00:00.000Z",
    promisedPaymentDate: "2026-06-10T00:00:00.000Z",
    promisedAmount: "60.0000",
    assignedToUserId: null,
    lastActivityAt: null,
    nextActionAt: "2026-06-08T00:00:00.000Z",
    summary: "Customer promised payment",
    notes: null,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z",
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER" },
    salesInvoice: { id: "invoice-1", invoiceNumber: "INV-000010", customerId: "customer-1", dueDate: "2026-06-01T00:00:00.000Z", currency: "SAR", status: "FINALIZED", total: "125.0000", balanceDue: "125.0000" },
    assignedTo: null,
    createdBy: null,
    updatedBy: null,
    activities: [],
    ...overrides,
  };
}
