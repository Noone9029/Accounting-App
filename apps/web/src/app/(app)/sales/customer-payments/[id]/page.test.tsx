import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { CustomerPaymentWorkflowGuidance } from "./page";
import type { CustomerPayment } from "@/lib/types";

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

describe("customer payment workflow guidance", () => {
  it("shows recorded-payment success guidance and next actions", () => {
    render(
      <CustomerPaymentWorkflowGuidance
        payment={paymentFixture()}
        recorded
        receiptData={null}
        actionLoading={false}
        onDownloadReceiptPdf={jest.fn()}
      />,
    );

    expect(screen.getByText(/Payment recorded/)).toBeInTheDocument();
    expect(screen.getByText("Posted")).toBeInTheDocument();
    expect(screen.getByText(/linked invoice balances were reduced/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View invoice" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
    expect(screen.getByRole("link", { name: "View customer ledger" })).toHaveAttribute("href", "/contacts/customer-1");
    expect(screen.getByRole("button", { name: "Download receipt" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "AR report" })).toHaveAttribute("href", "/reports/aged-receivables");
  });

  it("calls out unapplied customer credit without changing posting behavior", () => {
    render(
      <CustomerPaymentWorkflowGuidance
        payment={paymentFixture({ unappliedAmount: "25.0000", allocations: [] })}
        recorded={false}
        receiptData={null}
        actionLoading={false}
        onDownloadReceiptPdf={jest.fn()}
      />,
    );

    expect(screen.getByText("Unapplied credit")).toBeInTheDocument();
    expect(screen.getByText(/matched to a later invoice or refunded/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View invoice" })).not.toBeInTheDocument();
  });
});

function paymentFixture(overrides: Partial<CustomerPayment> = {}): CustomerPayment {
  return {
    id: "payment-1",
    organizationId: "org-1",
    paymentNumber: "CP-001",
    customerId: "customer-1",
    paymentDate: "2026-05-21T00:00:00.000Z",
    currency: "SAR",
    status: "POSTED",
    amountReceived: "115.0000",
    unappliedAmount: "0.0000",
    description: null,
    accountId: "account-1",
    journalEntryId: "je-1",
    voidReversalJournalEntryId: null,
    postedAt: "2026-05-21T00:00:00.000Z",
    voidedAt: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER" },
    account: { id: "account-1", code: "111", name: "Cash on hand", type: "ASSET" },
    journalEntry: { id: "je-1", entryNumber: "JE-001", status: "POSTED", totalDebit: "115.0000", totalCredit: "115.0000" },
    voidReversalJournalEntry: null,
    allocations: [
      {
        id: "allocation-1",
        organizationId: "org-1",
        paymentId: "payment-1",
        invoiceId: "invoice-1",
        amountApplied: "115.0000",
        invoice: {
          id: "invoice-1",
          invoiceNumber: "INV-001",
          issueDate: "2026-05-21T00:00:00.000Z",
          total: "115.0000",
          balanceDue: "0.0000",
          status: "FINALIZED",
        },
      },
    ],
    unappliedAllocations: [],
    ...overrides,
  };
}
