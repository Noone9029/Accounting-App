import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { CustomerCollectionsPanel } from "./party-pages";
import type { CollectionCase } from "@/lib/types";

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

describe("CustomerCollectionsPanel", () => {
  it("shows collection cases as non-posting customer follow-up without changing receivables", () => {
    render(
      <CustomerCollectionsPanel
        customerId="customer-1"
        collectionCases={[collectionCaseFixture()]}
        loading={false}
        canCreateCollectionCase
        openReceivableBalance="125.0000"
      />,
    );

    expect(screen.getByText("Customer collections")).toBeInTheDocument();
    expect(screen.getByText(/Collection cases are operational follow-up records/i)).toBeInTheDocument();
    expect(screen.getByText(/do not post journals, allocate payments, send email or reminders/i)).toBeInTheDocument();
    expect(screen.getByText("Open receivable")).toBeInTheDocument();
    expect(screen.getByText("Collection amount effect")).toBeInTheDocument();
    expect(screen.getByText("0.0000")).toBeInTheDocument();
    expect(screen.getByText("COL-000001")).toBeInTheDocument();
    expect(screen.getByText("INV-000010")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/sales/collections/case-1");
    expect(screen.queryByText(/payment sent|email sent|tax invoice|ZATCA cleared/i)).not.toBeInTheDocument();
  });
});

function collectionCaseFixture(overrides: Partial<CollectionCase> = {}): CollectionCase {
  return {
    id: "case-1",
    organizationId: "org-1",
    caseNumber: "COL-000001",
    customerId: "customer-1",
    salesInvoiceId: "invoice-1",
    status: "IN_PROGRESS",
    priority: "NORMAL",
    followUpDate: "2026-06-08T00:00:00.000Z",
    promisedPaymentDate: null,
    promisedAmount: null,
    assignedToUserId: null,
    lastActivityAt: "2026-06-04T00:00:00.000Z",
    nextActionAt: "2026-06-08T00:00:00.000Z",
    summary: "Internal follow-up",
    notes: null,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z",
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER" },
    salesInvoice: { id: "invoice-1", invoiceNumber: "INV-000010", customerId: "customer-1", dueDate: "2026-06-01T00:00:00.000Z", currency: "SAR", status: "FINALIZED", total: "125.0000", balanceDue: "125.0000" },
    assignedTo: null,
    createdBy: null,
    updatedBy: null,
    activities: [],
    ...overrides,
  };
}
