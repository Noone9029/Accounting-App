import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import RecurringInvoiceDetailPage from "./page";
import type { RecurringInvoicePreview, RecurringInvoiceTemplate } from "@/lib/types";

const apiRequestMock = jest.fn();
let permissionSet = new Set<string>();

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
  useParams: () => ({ id: "rec-1" }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: string) => permissionSet.has(permission),
  }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("RecurringInvoiceDetailPage", () => {
  beforeEach(() => {
    permissionSet = new Set(["salesInvoices.view", "salesInvoices.update", "salesInvoices.create"]);
    apiRequestMock.mockReset();
  });

  it("shows safe non-posting wording and manually generates a draft invoice", async () => {
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/recurring-invoices/rec-1" && !options) {
        return Promise.resolve(templateFixture({ status: "ACTIVE" }));
      }
      if (path === "/recurring-invoices/rec-1/preview") {
        return Promise.resolve(previewFixture());
      }
      if (path === "/recurring-invoices/rec-1/generate-now") {
        return Promise.resolve({
          template: templateFixture({
            status: "ACTIVE",
            lastRunDate: "2026-06-15T00:00:00.000Z",
            nextRunDate: "2026-07-15T00:00:00.000Z",
            runs: [
              {
                id: "run-1",
                organizationId: "org-1",
                templateId: "rec-1",
                runDate: "2026-06-15T00:00:00.000Z",
                invoiceDate: "2026-06-15T00:00:00.000Z",
                dueDate: "2026-06-30T00:00:00.000Z",
                periodStart: "2026-06-15T00:00:00.000Z",
                periodEnd: "2026-07-14T00:00:00.000Z",
                generatedInvoiceId: "invoice-1",
                generatedById: "user-1",
                createdAt: "2026-06-15T01:00:00.000Z",
                generatedInvoice: { id: "invoice-1", invoiceNumber: "INV-000010", status: "DRAFT", total: "115.0000" },
              },
            ],
          }),
          invoice: { id: "invoice-1", invoiceNumber: "INV-000010", status: "DRAFT" },
          run: { id: "run-1" },
        });
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<RecurringInvoiceDetailPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Generate invoice now" })).toBeInTheDocument());
    expect(screen.getByText(/Recurring templates do not post accounting entries/i)).toBeInTheDocument();
    expect(screen.getByText(/No automatic scheduler, email, payment, posting, VAT filing, or ZATCA submission/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Generate invoice now" }));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/recurring-invoices/rec-1/generate-now", { method: "POST" }));
    expect(await screen.findByText(/Generated draft invoice INV-000010/i)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Open draft invoice INV-000010/i })).toHaveAttribute("href", "/sales/invoices/invoice-1");
    expect((await screen.findAllByText("6/15/2026")).length).toBeGreaterThan(0);
  });

  it("hides mutation actions for users without create or update permission", async () => {
    permissionSet = new Set(["salesInvoices.view"]);
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/recurring-invoices/rec-1") {
        return Promise.resolve(templateFixture({ status: "ACTIVE" }));
      }
      if (path === "/recurring-invoices/rec-1/preview") {
        return Promise.resolve(previewFixture());
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<RecurringInvoiceDetailPage />);

    await waitFor(() => expect(screen.getByText("Monthly support")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Generate invoice now" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
  });
});

function templateFixture(overrides: Partial<RecurringInvoiceTemplate> = {}): RecurringInvoiceTemplate {
  return {
    id: "rec-1",
    organizationId: "org-1",
    templateNumber: "REC-000001",
    name: "Monthly support",
    customerId: "customer-1",
    branchId: null,
    status: "ACTIVE",
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
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", isActive: true },
    branch: null,
    lines: [
      {
        id: "line-1",
        organizationId: "org-1",
        templateId: "rec-1",
        itemId: null,
        description: "Managed service",
        accountId: "revenue-1",
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        taxRateId: "tax-15",
        lineGrossAmount: "100.0000",
        discountAmount: "0.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineSubtotal: "100.0000",
        lineTotal: "115.0000",
        sortOrder: 0,
        account: { id: "revenue-1", code: "401", name: "Sales revenue", type: "REVENUE" },
        taxRate: { id: "tax-15", name: "VAT on Sales 15%", rate: "15.0000" },
      },
    ],
    runs: [],
    ...overrides,
  };
}

function previewFixture(overrides: Partial<RecurringInvoicePreview> = {}): RecurringInvoicePreview {
  return {
    templateId: "rec-1",
    templateNumber: "REC-000001",
    status: "ACTIVE",
    nextInvoiceDate: "2026-06-15T00:00:00.000Z",
    dueDate: "2026-06-30T00:00:00.000Z",
    periodCovered: { startDate: "2026-06-15T00:00:00.000Z", endDate: "2026-07-14T00:00:00.000Z" },
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", isActive: true },
    taxMode: "TAX_EXCLUSIVE",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    lines: templateFixture().lines ?? [],
    nextOccurrences: ["2026-06-15T00:00:00.000Z", "2026-07-15T00:00:00.000Z", "2026-08-15T00:00:00.000Z"],
    blockers: [],
    previewOnly: true,
    ...overrides,
  };
}
