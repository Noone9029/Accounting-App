import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { CustomerLedgerGuidance, CustomerStatementDocumentGuidance, LedgerTable, SupplierLedgerGuidance, SupplierStatementDocumentGuidance } from "./page";
import type { CustomerLedgerRow, SupplierLedgerRow } from "@/lib/types";

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

  it("explains supplier ledger impact and links to AP actions", () => {
    render(<SupplierLedgerGuidance contactId="supplier-1" closingBalance="250.0000" rowCount={3} />);

    expect(screen.getByText("What changed after supplier payment?")).toBeInTheDocument();
    expect(screen.getByText(/Finalized purchase bills increase what you owe/)).toBeInTheDocument();
    expect(screen.getByText(/Supplier payments, debit notes, refunds, and reversals/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create bill" })).toHaveAttribute("href", "/purchases/bills/new?supplierId=supplier-1");
    expect(screen.getByRole("link", { name: "Record supplier payment" })).toHaveAttribute("href", "/purchases/supplier-payments/new?supplierId=supplier-1");
    expect(screen.getByRole("link", { name: "AP report" })).toHaveAttribute("href", "/reports/aged-payables");
  });

  it("renders supplier ledger empty state with AP next actions", () => {
    render(<LedgerTable rows={[]} emptyMessage="No supplier ledger activity found." ledgerKind="supplier" contactId="supplier-1" />);

    expect(screen.getByText("No supplier ledger activity found.")).toBeInTheDocument();
    expect(screen.getByText(/Post a supplier bill or supplier payment/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create bill" })).toHaveAttribute("href", "/purchases/bills/new?supplierId=supplier-1");
    expect(screen.getByRole("link", { name: "Record supplier payment" })).toHaveAttribute("href", "/purchases/supplier-payments/new?supplierId=supplier-1");
    expect(screen.getByRole("link", { name: "Open AP report" })).toHaveAttribute("href", "/reports/aged-payables");
  });

  it("uses supplier-safe debit and credit helper copy", () => {
    render(<LedgerTable rows={[supplierLedgerRow()]} emptyMessage="No supplier ledger activity found." ledgerKind="supplier" contactId="supplier-1" />);

    expect(screen.getByText(/posted supplier ledger rows exactly/)).toBeInTheDocument();
    expect(screen.getAllByText("Supplier payment").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "View payment" })).toHaveAttribute("href", "/purchases/supplier-payments/supplier-payment-1");
  });

  it("explains customer statement PDF archive behavior", () => {
    render(<CustomerStatementDocumentGuidance />);

    expect(screen.getByText(/PDF downloads from source records are archived automatically/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open archive" })).toHaveAttribute("href", "/documents");
  });

  it("keeps supplier statement export wording honest for beta", () => {
    render(<SupplierStatementDocumentGuidance />);

    expect(screen.getByText(/Supplier statement PDF export is not wired/)).toBeInTheDocument();
    expect(screen.getByText(/production compliance are not enabled/)).toBeInTheDocument();
    expect(screen.queryByText(/production submission is connected/i)).not.toBeInTheDocument();
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

function supplierLedgerRow(overrides: Partial<SupplierLedgerRow> = {}): SupplierLedgerRow {
  return {
    id: "supplier-ledger-row-1",
    type: "SUPPLIER_PAYMENT",
    date: "2026-05-21T00:00:00.000Z",
    number: "SP-001",
    description: "Supplier payment",
    debit: "115.0000",
    credit: "0.0000",
    balance: "0.0000",
    sourceType: "SupplierPayment",
    sourceId: "supplier-payment-1",
    status: "POSTED",
    metadata: {},
    ...overrides,
  };
}
