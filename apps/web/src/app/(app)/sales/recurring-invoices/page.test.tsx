import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import type { RecurringInvoiceTemplate } from "@/lib/types";
import RecurringInvoicesPage from "./page";

const apiRequestMock = jest.fn();
const refreshMock = jest.fn();
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
  useRouter: () => ({
    refresh: refreshMock,
  }),
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

describe("RecurringInvoicesPage", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/sales/recurring-invoices");
    apiRequestMock.mockReset();
    refreshMock.mockReset();
    mockAllowedPermissions = new Set(["salesInvoices.view", "salesInvoices.create", "salesInvoices.update"]);
  });

  it("lists recurring invoice templates with safe non-posting wording", async () => {
    apiRequestMock.mockResolvedValue([recurringTemplateFixture()]);

    renderRecurringInvoicesPage();

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/recurring-invoices"));
    expect(screen.getByRole("heading", { name: "Recurring invoices" })).toBeInTheDocument();
    expect(screen.getByText(/No automatic scheduler runs from this workspace/i)).toBeInTheDocument();
    expect(screen.getByText("REC-000001")).toBeInTheDocument();
    expect(screen.getByText("Monthly support")).toBeInTheDocument();
    expect(screen.getByText("Beta Customer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create template" })).toHaveAttribute("href", "/sales/recurring-invoices/new");
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/sales/recurring-invoices/rec-1");
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/sales/recurring-invoices/rec-1/edit");
  });

  it("renders recurring invoice templates in Arabic RTL with record numbers unchanged", async () => {
    apiRequestMock.mockResolvedValue([recurringTemplateFixture()]);

    renderRecurringInvoicesPage("ar");

    await waitFor(() => expect(screen.getByText("REC-000001")).toBeInTheDocument());
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { name: "فواتير متكررة" })).toBeInTheDocument();
    expect(screen.getByText(/لا يعمل أي مجدول تلقائي/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "إنشاء قالب" })).toHaveAttribute("href", "/sales/recurring-invoices/new");
    expect(screen.getByText("REC-000001").closest("bdi")).toHaveAttribute("dir", "ltr");
  });
});

function renderRecurringInvoicesPage(locale: "en" | "ar" = "en") {
  return render(
    <AppLocaleProvider initialLocale={locale}>
      <RecurringInvoicesPage />
    </AppLocaleProvider>,
  );
}

function recurringTemplateFixture(overrides: Partial<RecurringInvoiceTemplate> = {}): RecurringInvoiceTemplate {
  return {
    id: "rec-1",
    organizationId: "org-1",
    templateNumber: "REC-000001",
    name: "Monthly support",
    customerId: "customer-1",
    branchId: null,
    status: "DRAFT",
    startDate: "2026-06-15T00:00:00.000Z",
    endDate: null,
    nextRunDate: "2026-06-15T00:00:00.000Z",
    lastRunDate: null,
    frequency: "MONTHLY",
    interval: 1,
    dayOfMonth: 15,
    dayOfWeek: null,
    monthOfYear: null,
    invoiceDateMode: "RUN_DATE",
    paymentTermsDays: 15,
    reference: "MSA-1",
    currency: "SAR",
    taxMode: "TAX_EXCLUSIVE",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    notes: null,
    terms: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null, isActive: true },
    branch: null,
    lines: [],
    runs: [],
    ...overrides,
  };
}
