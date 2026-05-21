import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { CustomerLedgerGuidance, LedgerTable } from "./page";
import type { CustomerLedgerRow } from "@/lib/types";

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

describe("customer ledger drill-down guidance", () => {
  it("explains payment impact and links to the next customer workflow steps", () => {
    render(<CustomerLedgerGuidance contactId="customer-1" closingBalance="0.0000" rowCount={2} />);

    expect(screen.getByText("What changed after payment?")).toBeInTheDocument();
    expect(screen.getByText(/Finalized invoices increase the amount owed/)).toBeInTheDocument();
    expect(screen.getByText(/payments, credit notes, and refunds reduce or reverse it/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create invoice" })).toHaveAttribute("href", "/sales/invoices/new?customerId=customer-1");
    expect(screen.getByRole("link", { name: "Record payment" })).toHaveAttribute("href", "/sales/customer-payments/new?customerId=customer-1");
    expect(screen.getByRole("link", { name: "AR report" })).toHaveAttribute("href", "/reports/aged-receivables");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("renders a helpful empty state for a customer without ledger rows", () => {
    render(<LedgerTable rows={[]} emptyMessage="No customer ledger activity yet." ledgerKind="customer" contactId="customer-1" />);

    expect(screen.getByText("No customer ledger activity yet.")).toBeInTheDocument();
    expect(screen.getByText(/Create and finalize an invoice/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create invoice" })).toHaveAttribute("href", "/sales/invoices/new?customerId=customer-1");
    expect(screen.getByRole("link", { name: "Record payment" })).toHaveAttribute("href", "/sales/customer-payments/new?customerId=customer-1");
    expect(screen.getByRole("link", { name: "Open AR report" })).toHaveAttribute("href", "/reports/aged-receivables");
  });

  it("uses readable row labels and status badges instead of raw ledger enums", () => {
    render(<LedgerTable rows={[ledgerRow()]} emptyMessage="No customer ledger activity yet." ledgerKind="customer" contactId="customer-1" />);

    expect(screen.getByText(/Debit adds to the customer balance/)).toBeInTheDocument();
    expect(screen.getByText("Payment allocation")).toBeInTheDocument();
    expect(screen.getByText("Posted")).toBeInTheDocument();
    expect(screen.queryByText("PAYMENT_ALLOCATION")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View invoice" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
  });
});

function ledgerRow(overrides: Partial<CustomerLedgerRow> = {}): CustomerLedgerRow {
  return {
    id: "ledger-row-1",
    type: "PAYMENT_ALLOCATION",
    date: "2026-05-21T00:00:00.000Z",
    number: "CP-001",
    description: "Payment allocation to INV-001",
    debit: "0.0000",
    credit: "115.0000",
    balance: "0.0000",
    sourceType: "CustomerPaymentAllocation",
    sourceId: "allocation-1",
    status: "POSTED",
    metadata: { invoiceId: "invoice-1" },
    ...overrides,
  };
}
