import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { AgedReceivablesReportPage, AgingReportGuide, AgingTable, ReportsIndexPage, VatReturnReportPage, VatSummaryReportPage } from "./report-pages";
import type { AgingReportRow } from "@/lib/types";

const apiRequestMock = jest.fn();
const downloadAuthenticatedFileMock = jest.fn();
let searchParams = new URLSearchParams();

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
  useSearchParams: () => searchParams,
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    canAny: () => true,
  }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

jest.mock("@/lib/pdf-download", () => ({
  downloadAuthenticatedFile: (...args: unknown[]) => downloadAuthenticatedFileMock(...args),
}));

describe("reports index first-workflow guidance", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    apiRequestMock.mockReset();
    downloadAuthenticatedFileMock.mockReset();
    downloadAuthenticatedFileMock.mockResolvedValue(undefined);
    apiRequestMock.mockImplementation((path: string) => {
      if (path.startsWith("/reports/vat-return")) {
        return Promise.resolve(vatReturnReport());
      }
      if (path.startsWith("/reports/vat-summary")) {
        return Promise.resolve(vatSummaryReport());
      }
      return Promise.resolve({
        rows: [],
        bucketTotals: {
          CURRENT: "0.0000",
          "1_30": "0.0000",
          "31_60": "0.0000",
          "61_90": "0.0000",
          "90_PLUS": "0.0000",
        },
        grandTotal: "0.0000",
      });
    });
  });

  it("points new users to the first report and back to setup guidance", () => {
    render(<ReportsIndexPage />);

    expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByText("First report path")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Profit & Loss" })).toHaveAttribute("href", "/reports/profit-and-loss");
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Guided setup" })).toHaveAttribute("href", "/setup");
    expect(screen.getByText(/VAT Return stays a draft accountant-review view with internal export only/i)).toBeInTheDocument();
    expect(screen.getByText(/Outstanding sales invoice balances after posted payments and credits/i)).toBeInTheDocument();
    expect(screen.getByText(/Account-basis VAT review/i)).toBeInTheDocument();
  });

  it("renders the report index navigation in Arabic while preserving routes", () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <ReportsIndexPage />
      </AppLocaleProvider>,
    );

    expect(screen.getByRole("heading", { name: "التقارير" })).toBeInTheDocument();
    expect(screen.getByText("مسار أول تقرير")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "فتح الأرباح والخسائر" })).toHaveAttribute("href", "/reports/profit-and-loss");
    expect(screen.getByRole("link", { name: "العودة إلى لوحة التحكم" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText("القوائم المالية")).toBeInTheDocument();
  });

  it("explains aged receivables after payment without changing report math", () => {
    render(<AgingReportGuide kind="receivables" />);

    expect(screen.getByText("How to read this report")).toBeInTheDocument();
    expect(screen.getByText(/AR Aging is based on outstanding sales invoices only/i)).toBeInTheDocument();
    expect(screen.getByText(/balance due after posted payments, credit notes, and refunds/)).toBeInTheDocument();
    expect(screen.getByText(/customer ledger keeps the row-by-row payment allocation trail/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View customers" })).toHaveAttribute("href", "/customers");
    expect(screen.getByRole("link", { name: "Create invoice" })).toHaveAttribute("href", "/sales/invoices/new?returnTo=%2Freports%2Faged-receivables");
    expect(screen.getByRole("link", { name: "Record payment" })).toHaveAttribute("href", "/sales/customer-payments/new?returnTo=%2Freports%2Faged-receivables");
  });

  it("links aged receivables rows back to the customer and invoice", () => {
    render(<AgingTable rows={[agingRow()]} kind="receivables" />);

    expect(screen.getByRole("link", { name: "Beta Customer" })).toHaveAttribute("href", "/customers/customer-1");
    expect(screen.getByRole("link", { name: "INV-001" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
    expect(screen.getByRole("link", { name: "Open invoice" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
    expect(screen.getByText("1-30")).toBeInTheDocument();
  });

  it("renders aging table headers and actions in Arabic while preserving record links", () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <AgingTable rows={[agingRow()]} kind="receivables" />
      </AppLocaleProvider>,
    );

    expect(screen.getByText("جهة الاتصال")).toBeInTheDocument();
    expect(screen.getByText("الرصيد المستحق")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "INV-001" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
    expect(screen.getByRole("link", { name: "فتح الفاتورة" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
  });

  it("explains aged payables after supplier payments and debit notes", () => {
    render(<AgingReportGuide kind="payables" />);

    expect(screen.getByText(/Supplier bills that still have a balance due/)).toBeInTheDocument();
    expect(screen.getByText(/supplier ledger keeps the row-by-row payment allocation trail/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View suppliers" })).toHaveAttribute("href", "/suppliers");
    expect(screen.getByRole("link", { name: "Create bill" })).toHaveAttribute("href", "/purchases/bills/new?returnTo=%2Freports%2Faged-payables");
    expect(screen.getByRole("link", { name: "Record supplier payment" })).toHaveAttribute("href", "/purchases/supplier-payments/new?returnTo=%2Freports%2Faged-payables");
  });

  it("links aged payables rows back to the supplier and bill", () => {
    render(
      <AgingTable
        rows={[agingRow({ id: "bill-1", number: "BILL-001", contact: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier" } })]}
        kind="payables"
      />,
    );

    expect(screen.getByRole("link", { name: "Beta Supplier" })).toHaveAttribute("href", "/suppliers/supplier-1");
    expect(screen.getByRole("link", { name: "BILL-001" })).toHaveAttribute("href", "/purchases/bills/bill-1");
    expect(screen.getByRole("link", { name: "Open bill" })).toHaveAttribute("href", "/purchases/bills/bill-1");
  });

  it("does not claim production ZATCA connectivity from report guidance", () => {
    const { container } = render(<ReportsIndexPage />);

    expect(container.textContent).not.toMatch(/production submission is connected/i);
    expect(container.textContent).not.toMatch(/production compliance is enabled/i);
  });

  it("surfaces a workspace return link when aging reports are opened from a workspace", async () => {
    searchParams = new URLSearchParams("returnTo=/customers/customer-1");

    render(<AgedReceivablesReportPage />);

    expect(screen.getByRole("link", { name: "Back to workspace" })).toHaveAttribute("href", "/customers/customer-1");
  });

  it("preserves dedicated statement return context through aging action links", () => {
    render(<AgingReportGuide kind="receivables" returnToHref="/reports/aged-receivables?asOf=2026-06-12&returnTo=%2Fcustomers%2Fcustomer-1%2Fstatement%3FreturnTo%3D%252Fcustomers%252Fcustomer-1" />);

    expect(screen.getByRole("link", { name: "Create invoice" })).toHaveAttribute(
      "href",
      "/sales/invoices/new?returnTo=%2Freports%2Faged-receivables%3FasOf%3D2026-06-12%26returnTo%3D%252Fcustomers%252Fcustomer-1%252Fstatement%253FreturnTo%253D%25252Fcustomers%25252Fcustomer-1",
    );
    expect(screen.getByRole("link", { name: "Record payment" })).toHaveAttribute(
      "href",
      "/sales/customer-payments/new?returnTo=%2Freports%2Faged-receivables%3FasOf%3D2026-06-12%26returnTo%3D%252Fcustomers%252Fcustomer-1%252Fstatement%253FreturnTo%253D%25252Fcustomers%25252Fcustomer-1",
    );
  });

  it("preserves dedicated statement return context on aging row drill-down links", () => {
    render(
      <AgingTable
        rows={[agingRow()]}
        kind="receivables"
        returnToHref="/reports/aged-receivables?asOf=2026-06-12&returnTo=%2Fcustomers%2Fcustomer-1%2Fstatement%3FreturnTo%3D%252Fcustomers%252Fcustomer-1"
      />,
    );

    expect(screen.getByRole("link", { name: "INV-001" })).toHaveAttribute(
      "href",
      "/sales/invoices/invoice-1?returnTo=%2Freports%2Faged-receivables%3FasOf%3D2026-06-12%26returnTo%3D%252Fcustomers%252Fcustomer-1%252Fstatement%253FreturnTo%253D%25252Fcustomers%25252Fcustomer-1",
    );
    expect(screen.getByRole("link", { name: "Open invoice" })).toHaveAttribute(
      "href",
      "/sales/invoices/invoice-1?returnTo=%2Freports%2Faged-receivables%3FasOf%3D2026-06-12%26returnTo%3D%252Fcustomers%252Fcustomer-1%252Fstatement%253FreturnTo%253D%25252Fcustomers%25252Fcustomer-1",
    );
  });

  it("renders VAT Summary and VAT Return with aligned output and input VAT labels", async () => {
    const { rerender } = render(<VatSummaryReportPage />);

    expect(await screen.findAllByText("Output VAT (sales)")).toHaveLength(1);
    expect(screen.getAllByText("Input VAT (purchases)")).toHaveLength(1);

    rerender(<VatReturnReportPage />);

    expect(await screen.findAllByText("Output VAT (sales)")).toHaveLength(1);
    expect(screen.getAllByText("Input VAT (purchases)")).toHaveLength(1);
  });

  it("keeps VAT Return in draft internal-review posture and hides unsupported PDF export", async () => {
    const { container } = render(<VatReturnReportPage />);

    expect(await screen.findByText(/This draft view is for accountant or tax-advisor review/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download draft review CSV" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download PDF" })).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/submitted to a tax authority/i);
    expect(container.textContent).not.toMatch(/zATCA compliant/i);
    expect(container.textContent).not.toMatch(/certified VAT return/i);
  });

  it("downloads VAT Return as an internal draft review CSV", async () => {
    render(<VatReturnReportPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Download draft review CSV" }));

    await waitFor(() =>
      expect(downloadAuthenticatedFileMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/reports\/vat-return\?from=.*&to=.*&format=csv$/),
        expect.stringMatching(/^vat-return-draft-review-\d{4}-\d{2}-\d{2}\.csv$/),
      ),
    );
  });

  it("shows an honest empty state when no finalized VAT source documents exist", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path.startsWith("/reports/vat-return")) {
        return Promise.resolve(vatReturnReport({ sales: { documentCount: 0, taxableAmount: "0.0000", taxAmount: "0.0000", grossAmount: "0.0000", documents: [] }, purchases: { documentCount: 0, taxableAmount: "0.0000", taxAmount: "0.0000", grossAmount: "0.0000", documents: [] }, outputVat: "0.0000", inputVat: "0.0000", netVat: "0.0000", netVatPayable: "0.0000", netVatRefundable: "0.0000" }));
      }
      return Promise.resolve({
        rows: [],
        bucketTotals: { CURRENT: "0.0000", "1_30": "0.0000", "31_60": "0.0000", "61_90": "0.0000", "90_PLUS": "0.0000" },
        grandTotal: "0.0000",
      });
    });

    render(<VatReturnReportPage />);

    expect(await screen.findByText("No finalized VAT source documents found for this period.")).toBeInTheDocument();
    expect(screen.getByText(/Draft and voided documents are excluded/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create invoice" })).toHaveAttribute("href", "/sales/invoices/new?returnTo=%2Freports%2Fvat-return");
    expect(screen.getByRole("link", { name: "Create bill" })).toHaveAttribute("href", "/purchases/bills/new?returnTo=%2Freports%2Fvat-return");
  });
});

function agingRow(overrides: Partial<AgingReportRow> = {}): AgingReportRow {
  return {
    id: "invoice-1",
    contact: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer" },
    number: "INV-001",
    issueDate: "2026-05-21T00:00:00.000Z",
    dueDate: "2026-05-31T00:00:00.000Z",
    total: "115.0000",
    balanceDue: "115.0000",
    daysOverdue: 12,
    bucket: "1_30",
    ...overrides,
  };
}

function vatReturnReport(overrides: Record<string, unknown> = {}) {
  return {
    from: "2026-06-01",
    to: "2026-06-12",
    basis: "FINALIZED_SOURCE_DOCUMENTS",
    outputVat: "15.0000",
    inputVat: "5.0000",
    netVat: "10.0000",
    netVatPayable: "10.0000",
    netVatRefundable: "0.0000",
    sales: {
      documentCount: 1,
      taxableAmount: "100.0000",
      taxAmount: "15.0000",
      grossAmount: "115.0000",
      documents: [{ id: "invoice-1", number: "INV-001", documentDate: "2026-06-01", taxableAmount: "100.0000", taxAmount: "15.0000", grossAmount: "115.0000" }],
    },
    purchases: {
      documentCount: 1,
      taxableAmount: "33.3333",
      taxAmount: "5.0000",
      grossAmount: "38.3333",
      documents: [{ id: "bill-1", number: "BILL-001", documentDate: "2026-06-02", taxableAmount: "33.3333", taxAmount: "5.0000", grossAmount: "38.3333" }],
    },
    notes: [
      "VAT return foundation is calculated from finalized sales invoices and finalized purchase bills in the selected date range.",
      "Draft and voided documents are excluded; this report does not submit a tax return.",
    ],
    ...overrides,
  };
}

function vatSummaryReport(overrides: Record<string, unknown> = {}) {
  return {
    from: "2026-06-01",
    to: "2026-06-12",
    salesVat: "15.0000",
    purchaseVat: "5.0000",
    netVatPayable: "10.0000",
    sections: [
      { category: "SALES_VAT_PAYABLE", accountCode: "220", amount: "0.0000", taxAmount: "15.0000" },
      { category: "PURCHASE_VAT_RECEIVABLE", accountCode: "230", amount: "0.0000", taxAmount: "5.0000" },
    ],
    notes: [
      "This is not an official VAT return filing report yet.",
      "VAT summary is derived from posted journal activity in VAT Payable 220 and VAT Receivable 230.",
    ],
    ...overrides,
  };
}
