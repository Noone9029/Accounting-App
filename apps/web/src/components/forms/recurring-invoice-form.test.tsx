import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { RecurringInvoiceTemplate, SalesInvoiceTaxMode } from "@/lib/types";
import { RecurringInvoiceForm } from "./recurring-invoice-form";

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
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("RecurringInvoiceForm", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/sales/recurring-invoices/new");
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string, options?: { method?: string; body?: unknown }) => {
      if (path === "/contacts") {
        return Promise.resolve([contactFixture("customer-1", "Beta Customer"), contactFixture("customer-2", "Second Customer")]);
      }
      if (path === "/items") {
        return Promise.resolve([
          {
            id: "item-1",
            name: "Managed service",
            description: "Managed service monthly",
            sku: "MSA",
            status: "ACTIVE",
            sellingPrice: "250.0000",
            revenueAccountId: "revenue-1",
            salesTaxRateId: "tax-15",
          },
        ]);
      }
      if (path === "/accounts") {
        return Promise.resolve([
          {
            id: "revenue-1",
            code: "401",
            name: "Sales revenue",
            type: "REVENUE",
            isActive: true,
            allowPosting: true,
          },
        ]);
      }
      if (path === "/tax-rates") {
        return Promise.resolve([
          {
            id: "tax-15",
            name: "VAT on Sales 15%",
            scope: "SALES",
            category: "STANDARD",
            rate: "15.0000",
            isActive: true,
          },
        ]);
      }
      if (path === "/branches") {
        return Promise.resolve([]);
      }
      if (path === "/recurring-invoices/next-number") {
        return Promise.resolve({
          templateNumber: "REC-000042",
          editable: false,
          overrideAllowed: false,
          helperText: "Preview only. The recurring template number is assigned from the recurring invoice sequence when the draft template is saved.",
        });
      }
      if (path === "/recurring-invoices" && options?.method === "POST") {
        return Promise.resolve({ id: "rec-1", templateNumber: "REC-000042" });
      }
      if (path === "/recurring-invoices/rec-1" && options?.method === "PATCH") {
        return Promise.resolve(recurringTemplateFixture());
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("shows a read-only recurring template number preview", async () => {
    render(<RecurringInvoiceForm />);

    await waitFor(() => expect(screen.getByLabelText("Template number")).toHaveValue("REC-000042"));
    expect(screen.getByLabelText("Template number")).toHaveAttribute("readonly");
    expect(screen.getByText(/assigned from the recurring invoice sequence/i)).toBeInTheDocument();
  });

  it("renders account-coded lines, tax-exclusive totals, and schedule fields", async () => {
    render(<RecurringInvoiceForm initialTemplate={recurringTemplateFixture()} />);

    await waitFor(() => expect(screen.getByLabelText("Posting account for recurring invoice line 1")).toHaveValue("revenue-1"));
    expect(screen.getByLabelText("Template number")).toHaveValue("REC-000042");
    expect(screen.getByLabelText("Tax mode")).toHaveValue("TAX_EXCLUSIVE");
    expect(screen.getByLabelText("Template name")).toHaveValue("Monthly support");
    expect(screen.getByLabelText("Frequency")).toHaveValue("MONTHLY");
    expect(screen.getByText(/401\s+Sales revenue/)).toBeInTheDocument();
    expect(screen.getAllByText(/SAR\s*230\.00/).length).toBeGreaterThan(0);
    expect(screen.getByText("Schedule preview")).toBeInTheDocument();
    expect(screen.getByText("2026-06-15 to 2026-07-14")).toBeInTheDocument();
    expect(screen.getByText("2026-06-30")).toBeInTheDocument();
    expect(screen.getByText("2026-07-15")).toBeInTheDocument();
  });

  it("updates the schedule preview for supported recurring frequencies and payment terms", async () => {
    render(<RecurringInvoiceForm initialTemplate={recurringTemplateFixture()} />);

    await waitFor(() => expect(screen.getByText("Schedule preview")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Payment terms days"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("Frequency"), { target: { value: "WEEKLY" } });
    expect(screen.getByText("2026-06-15 to 2026-06-21")).toBeInTheDocument();
    expect(screen.getAllByText("2026-06-22").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Frequency"), { target: { value: "QUARTERLY" } });
    expect(screen.getByText("2026-06-15 to 2026-09-14")).toBeInTheDocument();
    expect(screen.getByText("2026-09-15")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Frequency"), { target: { value: "YEARLY" } });
    expect(screen.getByText("2026-06-15 to 2027-06-14")).toBeInTheDocument();
    expect(screen.getByText("2027-06-15")).toBeInTheDocument();
  });

  it("renders no-tax mode with line tax rates disabled", async () => {
    render(<RecurringInvoiceForm initialTemplate={recurringTemplateFixture({ taxMode: "NO_TAX", taxTotal: "0.0000", total: "200.0000" })} />);

    await waitFor(() => expect(screen.getByLabelText("Tax mode")).toHaveValue("NO_TAX"));
    expect(screen.getByLabelText("Tax rate for recurring invoice line 1")).toHaveValue("");
    expect(screen.getByLabelText("Tax rate for recurring invoice line 1")).toBeDisabled();
    expect(screen.getAllByText(/SAR\s*200\.00/).length).toBeGreaterThan(0);
  });

  it("submits a draft recurring template to the API and redirects to detail", async () => {
    render(<RecurringInvoiceForm initialTemplate={recurringTemplateFixture()} />);

    await waitFor(() => expect(screen.getByLabelText("Posting account for recurring invoice line 1")).toHaveValue("revenue-1"));
    fireEvent.submit(screen.getByRole("button", { name: "Save draft template" }).closest("form")!);

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/recurring-invoices/rec-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            customerId: "customer-1",
            frequency: "MONTHLY",
            interval: 1,
            paymentTermsDays: 15,
            taxMode: "TAX_EXCLUSIVE",
            lines: [expect.objectContaining({ accountId: "revenue-1", taxRateId: "tax-15" })],
          }),
        }),
      ),
    );
    expect(pushMock).toHaveBeenCalledWith("/sales/recurring-invoices/rec-1");
  });
});

function contactFixture(id: string, name: string) {
  return {
    id,
    name,
    displayName: name,
    type: "CUSTOMER",
    email: null,
    phone: null,
    taxNumber: null,
    isActive: true,
  };
}

function recurringTemplateFixture(overrides: Partial<RecurringInvoiceTemplate> & { taxMode?: SalesInvoiceTaxMode } = {}): RecurringInvoiceTemplate {
  return {
    id: "rec-1",
    organizationId: "org-1",
    templateNumber: "REC-000042",
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
    subtotal: "200.0000",
    discountTotal: "0.0000",
    taxableTotal: "200.0000",
    taxTotal: "30.0000",
    total: "230.0000",
    notes: null,
    terms: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null, isActive: true },
    branch: null,
    lines: [
      {
        id: "line-1",
        organizationId: "org-1",
        templateId: "rec-1",
        itemId: "item-1",
        description: "Managed service monthly",
        accountId: "revenue-1",
        quantity: "2.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        taxRateId: overrides.taxMode === "NO_TAX" ? null : "tax-15",
        lineGrossAmount: "200.0000",
        discountAmount: "0.0000",
        taxableAmount: "200.0000",
        taxAmount: overrides.taxMode === "NO_TAX" ? "0.0000" : "30.0000",
        lineSubtotal: "200.0000",
        lineTotal: overrides.taxMode === "NO_TAX" ? "200.0000" : "230.0000",
        sortOrder: 0,
        item: { id: "item-1", name: "Managed service", sku: "MSA", revenueAccountId: "revenue-1" },
        account: { id: "revenue-1", code: "401", name: "Sales revenue", type: "REVENUE" },
        taxRate: overrides.taxMode === "NO_TAX" ? null : { id: "tax-15", name: "VAT on Sales 15%", rate: "15.0000" },
      },
    ],
    runs: [],
    ...overrides,
  };
}
