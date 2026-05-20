import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { InvoiceWorkflowGuidance } from "./page";
import type { SalesInvoice } from "@/lib/types";

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

describe("invoice workflow guidance", () => {
  it("explains draft invoice state and shows the finalize action", () => {
    render(
      <InvoiceWorkflowGuidance
        invoice={invoiceFixture({ status: "DRAFT" })}
        actionLoading={false}
        canFinalizeInvoice
        canCreateCustomerPayment
        onFinalize={jest.fn()}
        onDownloadPdf={jest.fn()}
      />,
    );

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText(/saved and editable/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize invoice" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Record payment" })).not.toBeInTheDocument();
  });

  it("shows payment, ledger, report, and safe ZATCA guidance after posting", () => {
    render(
      <InvoiceWorkflowGuidance
        invoice={invoiceFixture({ status: "FINALIZED", balanceDue: "115.0000" })}
        actionLoading={false}
        canFinalizeInvoice
        canCreateCustomerPayment
        onFinalize={jest.fn()}
        onDownloadPdf={jest.fn()}
      />,
    );

    expect(screen.getByText("Finalized/posted")).toBeInTheDocument();
    expect(screen.getByText("Unpaid")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Record payment" })).toHaveAttribute(
      "href",
      "/sales/customer-payments/new?customerId=customer-1&invoiceId=invoice-1",
    );
    expect(screen.getByRole("link", { name: "View customer ledger" })).toHaveAttribute("href", "/contacts/customer-1");
    expect(screen.getByRole("link", { name: "View report" })).toHaveAttribute("href", "/reports/profit-and-loss");
    expect(screen.getByText(/ZATCA status here is local\/readiness only/)).toBeInTheDocument();
    expect(screen.getByText(/production compliance are not enabled/)).toBeInTheDocument();
    expect(screen.queryByText(/production submission is connected/i)).not.toBeInTheDocument();
  });
});

function invoiceFixture(overrides: Partial<SalesInvoice> = {}): SalesInvoice {
  return {
    id: "invoice-1",
    organizationId: "org-1",
    invoiceNumber: "INV-001",
    customerId: "customer-1",
    branchId: null,
    issueDate: "2026-05-21T00:00:00.000Z",
    dueDate: null,
    currency: "SAR",
    status: "DRAFT",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    balanceDue: "115.0000",
    notes: null,
    terms: null,
    finalizedAt: null,
    journalEntryId: null,
    reversalJournalEntryId: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null },
    journalEntry: null,
    reversalJournalEntry: null,
    paymentAllocations: [],
    paymentUnappliedAllocations: [],
    creditNoteAllocations: [],
    creditNotes: [],
    lines: [],
    ...overrides,
  };
}
