import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AgedReceivablesReportPage, AgingReportGuide, AgingTable, ReportsIndexPage } from "./report-pages";
import type { AgingReportRow } from "@/lib/types";

const apiRequestMock = jest.fn();
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
  downloadAuthenticatedFile: jest.fn(),
}));

describe("reports index first-workflow guidance", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({
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

  it("points new users to the first report and back to setup guidance", () => {
    render(<ReportsIndexPage />);

    expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByText("First report path")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Profit & Loss" })).toHaveAttribute("href", "/reports/profit-and-loss");
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Guided setup" })).toHaveAttribute("href", "/setup");
    expect(screen.getByText(/VAT Return stays a draft accountant-review view only/i)).toBeInTheDocument();
    expect(screen.getByText(/Outstanding sales invoice balances after posted payments and credits/i)).toBeInTheDocument();
    expect(screen.getByText(/Operational VAT summary/i)).toBeInTheDocument();
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
