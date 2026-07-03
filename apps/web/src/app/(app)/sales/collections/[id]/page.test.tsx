import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import CollectionCaseDetailPage from "./page";
import type { CollectionCase } from "@/lib/types";

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
  useParams: () => ({ id: "case-1" }),
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

describe("CollectionCaseDetailPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    mockAllowedPermissions = new Set(["salesInvoices.view", "salesInvoices.create", "salesInvoices.update"]);
  });

  it("shows source invoice/customer visibility and safe accounting boundary wording", async () => {
    apiRequestMock.mockResolvedValue(collectionCaseFixture());

    render(<CollectionCaseDetailPage />);

    await waitFor(() => expect(screen.getByText("COL-000001")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Beta Customer" })).toHaveAttribute("href", "/customers/customer-1");
    expect(screen.getByRole("link", { name: "INV-000010" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
    expect(screen.getByText(/does not post journals, allocate payments, create credit notes or refunds, send email or reminders, create payment links, file VAT, call ZATCA, or change invoice balances/i)).toBeInTheDocument();
    expect(screen.getByText(/Planned email and planned reminder entries are internal planning records only/i)).toBeInTheDocument();
    expect(screen.queryByText(/tax invoice/i)).not.toBeInTheDocument();
  });

  it("renders Arabic detail copy while preserving customer and invoice links", async () => {
    apiRequestMock.mockResolvedValue(collectionCaseFixture());

    render(
      <AppLocaleProvider initialLocale="ar">
        <CollectionCaseDetailPage />
      </AppLocaleProvider>,
    );

    await waitFor(() => expect(screen.getByText("COL-000001")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Beta Customer" })).toHaveAttribute("href", "/customers/customer-1");
    expect(screen.getByRole("link", { name: "INV-000010" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
    expect(screen.getByText("حدود المحاسبة")).toBeInTheDocument();
    expect(screen.getByText("إجراءات التحصيل")).toBeInTheDocument();
    expect(screen.getByText("الخط الزمني للنشاط")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "العودة إلى التحصيل" })).toHaveAttribute("href", "/sales/collections");
    expect(screen.getByRole("button", { name: "إضافة نشاط" })).toBeInTheDocument();
  });

  it("hides mutation actions for view-only users", async () => {
    mockAllowedPermissions = new Set(["salesInvoices.view"]);
    apiRequestMock.mockResolvedValue(collectionCaseFixture());

    render(<CollectionCaseDetailPage />);

    await waitFor(() => expect(screen.getByText("COL-000001")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark promised" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add activity" })).not.toBeInTheDocument();
  });

  it("adds planned reminder activity without calling payment or email routes", async () => {
    apiRequestMock.mockImplementation((path: string, options?: { method?: string; body?: unknown }) => {
      if (path === "/collections/case-1" && !options) {
        return Promise.resolve(collectionCaseFixture());
      }
      if (path === "/collections/case-1/activities" && options?.method === "POST") {
        expect(options.body).toEqual(expect.objectContaining({ activityType: "REMINDER_PLANNED", note: "Plan internal follow-up." }));
        return Promise.resolve(collectionCaseFixture({ activities: [] }));
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<CollectionCaseDetailPage />);

    await waitFor(() => expect(screen.getByText("COL-000001")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Activity type"), { target: { value: "REMINDER_PLANNED" } });
    fireEvent.change(screen.getByLabelText("Activity note"), { target: { value: "Plan internal follow-up." } });
    fireEvent.click(screen.getByRole("button", { name: "Add activity" }));

    await waitFor(() => expect(screen.getByText("Collection activity added.")).toBeInTheDocument());
    expect(apiRequestMock).not.toHaveBeenCalledWith(expect.stringMatching(/customer-payments|email|payment-links|zatca/i), expect.anything());
  });
});

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
    lastActivityAt: "2026-06-04T00:00:00.000Z",
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
    activities: [
      {
        id: "activity-1",
        organizationId: "org-1",
        collectionCaseId: "case-1",
        customerId: "customer-1",
        salesInvoiceId: "invoice-1",
        activityType: "PROMISE_TO_PAY",
        activityDate: "2026-06-04T00:00:00.000Z",
        note: "Customer promised payment.",
        nextFollowUpDate: "2026-06-08T00:00:00.000Z",
        promisedPaymentDate: "2026-06-10T00:00:00.000Z",
        promisedAmount: "60.0000",
        createdById: "user-1",
        createdAt: "2026-06-04T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}
