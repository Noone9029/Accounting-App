import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { RelatedDeliveryNotesPanel } from "./related-delivery-notes-panel";
import type { DeliveryNote } from "@/lib/types";

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

describe("RelatedDeliveryNotesPanel", () => {
  it("shows invoice-linked delivery notes with accountant-safe wording", () => {
    render(<RelatedDeliveryNotesPanel sourceKind="invoice" deliveryNotes={[deliveryNoteFixture()]} loading={false} />);

    expect(screen.getByText("Related delivery notes")).toBeInTheDocument();
    expect(screen.getByText(/fulfillment documents/i)).toBeInTheDocument();
    expect(screen.getByText(/do not post journals, create accounts receivable, file VAT, send email, call ZATCA, or move inventory/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "DN-000042" })).toHaveAttribute("href", "/sales/delivery-notes/dn-1");
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(screen.getByText("Beta Customer")).toBeInTheDocument();
    expect(screen.getByText(/Warehouse Dock 1/)).toBeInTheDocument();
    expect(screen.queryByText(/tax invoice/i)).not.toBeInTheDocument();
  });

  it("shows quote-linked delivery notes without implying quote conversion or posting", () => {
    render(<RelatedDeliveryNotesPanel sourceKind="quote" deliveryNotes={[deliveryNoteFixture({ relatedSalesInvoiceId: null, relatedSalesQuoteId: "quote-1" })]} loading={false} />);

    expect(screen.getByText(/Delivery notes linked to quotes remain operational and non-posting/i)).toBeInTheDocument();
    expect(screen.getByText(/do not convert the quote, create an invoice, post revenue, file VAT, send email, call ZATCA, or move inventory/i)).toBeInTheDocument();
    expect(screen.queryByText(/posted delivery note/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/VAT filed/i)).not.toBeInTheDocument();
  });
});

function deliveryNoteFixture(overrides: Partial<DeliveryNote> = {}): DeliveryNote {
  return {
    id: "dn-1",
    organizationId: "org-1",
    deliveryNoteNumber: "DN-000042",
    customerId: "customer-1",
    branchId: null,
    status: "DELIVERED",
    issueDate: "2026-06-04T00:00:00.000Z",
    deliveryDate: "2026-06-05T00:00:00.000Z",
    reference: "INV-000010",
    relatedSalesInvoiceId: "invoice-1",
    relatedSalesQuoteId: null,
    relatedSalesStockIssueId: null,
    deliveryAddress: "Warehouse Dock 1\nRiyadh",
    notes: null,
    instructions: null,
    issuedAt: "2026-06-04T10:00:00.000Z",
    deliveredAt: "2026-06-05T10:00:00.000Z",
    cancelledAt: null,
    voidedAt: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null },
    branch: null,
    relatedSalesInvoice: { id: "invoice-1", invoiceNumber: "INV-000010", status: "FINALIZED" },
    relatedSalesQuote: null,
    relatedSalesStockIssue: null,
    lines: [],
    ...overrides,
  };
}
