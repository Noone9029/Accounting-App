import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { PurchaseBillWorkflowGuidance } from "./page";
import type { PurchaseBill } from "@/lib/types";

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

describe("purchase bill workflow guidance", () => {
  it("explains draft bill state and shows the finalize action", () => {
    render(
      <PurchaseBillWorkflowGuidance
        bill={billFixture({ status: "DRAFT" })}
        actionLoading={false}
        canFinalizeBill
        canCreateSupplierPayment
        canCreateDebitNote
        onFinalize={jest.fn()}
        onDownloadPdf={jest.fn()}
      />,
    );

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText(/draft bill is saved and editable/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize bill" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Record supplier payment" })).not.toBeInTheDocument();
  });

  it("shows supplier payment, debit note, ledger, and AP report actions after posting", () => {
    render(
      <PurchaseBillWorkflowGuidance
        bill={billFixture({ status: "FINALIZED", balanceDue: "115.0000" })}
        actionLoading={false}
        canFinalizeBill
        canCreateSupplierPayment
        canCreateDebitNote
        onFinalize={jest.fn()}
        onDownloadPdf={jest.fn()}
      />,
    );

    expect(screen.getByText("Finalized/posted")).toBeInTheDocument();
    expect(screen.getByText("Unpaid")).toBeInTheDocument();
    expect(screen.getByText(/supplier payable is open/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Record supplier payment" })).toHaveAttribute(
      "href",
      "/purchases/supplier-payments/new?supplierId=supplier-1&billId=bill-1",
    );
    expect(screen.getByRole("link", { name: "Create debit note" })).toHaveAttribute(
      "href",
      "/purchases/debit-notes/new?billId=bill-1&supplierId=supplier-1",
    );
    expect(screen.getByRole("button", { name: "Download purchase bill PDF" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open archive" })).toHaveAttribute("href", "/documents");
    expect(screen.getByRole("link", { name: "View supplier ledger" })).toHaveAttribute("href", "/contacts/supplier-1");
    expect(screen.getByRole("link", { name: "AP report" })).toHaveAttribute("href", "/reports/aged-payables");
  });
});

function billFixture(overrides: Partial<PurchaseBill> = {}): PurchaseBill {
  return {
    id: "bill-1",
    organizationId: "org-1",
    billNumber: "BILL-001",
    supplierId: "supplier-1",
    branchId: null,
    billDate: "2026-05-21T00:00:00.000Z",
    dueDate: null,
    currency: "SAR",
    status: "DRAFT",
    inventoryPostingMode: "DIRECT_EXPENSE_OR_ASSET",
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
    supplier: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER", taxNumber: null },
    branch: null,
    purchaseOrderId: null,
    purchaseOrder: null,
    journalEntry: null,
    reversalJournalEntry: null,
    lines: [],
    paymentAllocations: [],
    supplierPaymentUnappliedAllocations: [],
    debitNotes: [],
    debitNoteAllocations: [],
    ...overrides,
  };
}
