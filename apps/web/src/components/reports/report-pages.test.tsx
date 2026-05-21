import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AgingReportGuide, AgingTable, ReportsIndexPage } from "./report-pages";
import type { AgingReportRow } from "@/lib/types";

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

describe("reports index first-workflow guidance", () => {
  it("points new users to the first report and back to setup guidance", () => {
    render(<ReportsIndexPage />);

    expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByText("First report path")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Profit & Loss" })).toHaveAttribute("href", "/reports/profit-and-loss");
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Guided setup" })).toHaveAttribute("href", "/setup");
    expect(screen.getByText("See customer invoice balances after payments and credits.")).toBeInTheDocument();
  });

  it("explains aged receivables after payment without changing report math", () => {
    render(<AgingReportGuide kind="receivables" />);

    expect(screen.getByText("How to read this report")).toBeInTheDocument();
    expect(screen.getByText(/balance due after posted payments, credit notes, and refunds/)).toBeInTheDocument();
    expect(screen.getByText(/customer ledger keeps the row-by-row payment allocation trail/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create invoice" })).toHaveAttribute("href", "/sales/invoices/new");
    expect(screen.getByRole("link", { name: "Record payment" })).toHaveAttribute("href", "/sales/customer-payments/new");
  });

  it("links aged receivables rows back to the customer and invoice", () => {
    render(<AgingTable rows={[agingRow()]} kind="receivables" />);

    expect(screen.getByRole("link", { name: "Beta Customer" })).toHaveAttribute("href", "/contacts/customer-1");
    expect(screen.getByRole("link", { name: "INV-001" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
    expect(screen.getByRole("link", { name: "Open invoice" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
    expect(screen.getByText("1-30")).toBeInTheDocument();
  });

  it("does not claim production ZATCA connectivity from report guidance", () => {
    const { container } = render(<ReportsIndexPage />);

    expect(container.textContent).not.toMatch(/production submission is connected/i);
    expect(container.textContent).not.toMatch(/production compliance is enabled/i);
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
