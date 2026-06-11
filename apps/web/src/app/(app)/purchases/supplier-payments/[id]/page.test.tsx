import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { SupplierPaymentWorkflowGuidance } from "./page";
import type { SupplierPayment } from "@/lib/types";

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

describe("supplier payment workflow guidance", () => {
  it("shows recorded-payment success guidance and AP next actions", () => {
    render(
      <SupplierPaymentWorkflowGuidance
        payment={paymentFixture()}
        recorded
        receiptData={null}
        actionLoading={false}
        canDownloadGeneratedDocuments
        onDownloadReceiptPdf={jest.fn()}
      />,
    );

    expect(screen.getByText(/Supplier payment recorded/)).toBeInTheDocument();
    expect(screen.getByText("Posted")).toBeInTheDocument();
    expect(screen.getByText(/linked purchase bill balances were reduced/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View bill" })).toHaveAttribute("href", "/purchases/bills/bill-1");
    expect(screen.getByRole("link", { name: "Open supplier workspace" })).toHaveAttribute("href", "/suppliers/supplier-1");
    expect(screen.getByRole("button", { name: "Download receipt PDF" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open archive" })).toHaveAttribute("href", "/documents");
    expect(screen.getByRole("link", { name: "AP report" })).toHaveAttribute("href", "/reports/aged-payables");
  });

  it("calls out unapplied supplier credit without changing posting behavior", () => {
    render(
      <SupplierPaymentWorkflowGuidance
        payment={paymentFixture({ unappliedAmount: "25.0000", allocations: [] })}
        recorded={false}
        receiptData={null}
        actionLoading={false}
        canDownloadGeneratedDocuments
        onDownloadReceiptPdf={jest.fn()}
      />,
    );

    expect(screen.getByText("Unapplied supplier credit")).toBeInTheDocument();
    expect(screen.getByText(/matched to a later bill or refunded/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View bill" })).not.toBeInTheDocument();
  });

  it("hides source PDF action without generated document download permission", () => {
    render(
      <SupplierPaymentWorkflowGuidance
        payment={paymentFixture()}
        recorded={false}
        receiptData={null}
        actionLoading={false}
        canDownloadGeneratedDocuments={false}
        onDownloadReceiptPdf={jest.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Download receipt PDF" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open archive" })).toHaveAttribute("href", "/documents");
  });
});

function paymentFixture(overrides: Partial<SupplierPayment> = {}): SupplierPayment {
  return {
    id: "supplier-payment-1",
    organizationId: "org-1",
    paymentNumber: "SP-001",
    supplierId: "supplier-1",
    paymentDate: "2026-05-21T00:00:00.000Z",
    currency: "SAR",
    status: "POSTED",
    amountPaid: "115.0000",
    unappliedAmount: "0.0000",
    description: null,
    accountId: "account-1",
    journalEntryId: "je-1",
    voidReversalJournalEntryId: null,
    postedAt: "2026-05-21T00:00:00.000Z",
    voidedAt: null,
    supplier: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER" },
    account: { id: "account-1", code: "111", name: "Cash on hand", type: "ASSET" },
    journalEntry: { id: "je-1", entryNumber: "JE-001", status: "POSTED", totalDebit: "115.0000", totalCredit: "115.0000" },
    voidReversalJournalEntry: null,
    allocations: [
      {
        id: "allocation-1",
        organizationId: "org-1",
        paymentId: "supplier-payment-1",
        billId: "bill-1",
        amountApplied: "115.0000",
        bill: {
          id: "bill-1",
          billNumber: "BILL-001",
          billDate: "2026-05-21T00:00:00.000Z",
          dueDate: null,
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
