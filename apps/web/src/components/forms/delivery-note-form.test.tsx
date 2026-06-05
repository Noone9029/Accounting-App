import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { DeliveryNote, SalesInvoice, SalesQuote } from "@/lib/types";
import { DeliveryNoteForm } from "./delivery-note-form";

const apiRequestMock = jest.fn();
const pushMock = jest.fn();

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
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("DeliveryNoteForm", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/sales/delivery-notes/new");
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string, options?: { method?: string; body?: unknown }) => {
      if (path === "/contacts") {
        return Promise.resolve([contactFixture("customer-1", "Beta Customer"), contactFixture("customer-2", "Second Customer")]);
      }
      if (path === "/items") {
        return Promise.resolve([
          {
            id: "item-1",
            name: "Consulting",
            description: "Consulting service",
            sku: "SVC",
            status: "ACTIVE",
            sellingPrice: "250.0000",
          },
        ]);
      }
      if (path === "/branches") {
        return Promise.resolve([]);
      }
      if (path === "/sales-invoices") {
        return Promise.resolve([
          salesInvoiceFixture(),
          salesInvoiceFixture({ id: "invoice-voided", invoiceNumber: "INV-000099", status: "VOIDED" }),
        ]);
      }
      if (path === "/sales-quotes") {
        return Promise.resolve([salesQuoteFixture(), salesQuoteFixture({ id: "quote-draft", status: "DRAFT", quoteNumber: "QUO-000002" })]);
      }
      if (path === "/sales-invoices/invoice-1") {
        return Promise.resolve(salesInvoiceFixture({ lines: [sourceLineFixture("invoice-line-1", "Delivered consulting", "3.0000")] }));
      }
      if (path === "/sales-quotes/quote-1") {
        return Promise.resolve(salesQuoteFixture({ lines: [sourceLineFixture("quote-line-1", "Quoted implementation", "2.0000")] }));
      }
      if (path === "/delivery-notes/next-number") {
        return Promise.resolve({
          deliveryNoteNumber: "DN-000042",
          editable: false,
          overrideAllowed: false,
          helperText: "Preview only. The delivery note number is assigned from the delivery note sequence when saved.",
        });
      }
      if (path === "/delivery-notes" && options?.method === "POST") {
        return Promise.resolve(deliveryNoteFixture());
      }
      if (path === "/delivery-notes/dn-1" && options?.method === "PATCH") {
        return Promise.resolve(deliveryNoteFixture());
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("prefills the customer from the route query string and keeps the return target", async () => {
    window.history.pushState({}, "", "/sales/delivery-notes/new?customerId=customer-2&returnTo=/customers/customer-2");

    render(<DeliveryNoteForm />);

    await waitFor(() => expect(screen.getByLabelText("Customer")).toHaveValue("customer-2"));
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/customers/customer-2");
  });

  it("shows a read-only delivery note number preview with non-posting wording", async () => {
    render(<DeliveryNoteForm />);

    await waitFor(() => expect(screen.getByLabelText("Delivery note number")).toHaveValue("DN-000042"));
    expect(screen.getByLabelText("Delivery note number")).toHaveAttribute("readonly");
    expect(screen.getByText(/assigned from the delivery note sequence/i)).toBeInTheDocument();
    expect(screen.getByText(/do not create journals, AR balances, VAT filing, ZATCA submission, payment, email, or inventory movement/i)).toBeInTheDocument();
  });

  it("copies source invoice lines into a draft delivery note and saves them without financial posting data", async () => {
    render(<DeliveryNoteForm />);

    await waitFor(() => expect(screen.getByLabelText("Delivery note number")).toHaveValue("DN-000042"));
    fireEvent.change(screen.getByLabelText("Source invoice"), { target: { value: "invoice-1" } });

    await waitFor(() => expect(screen.getByLabelText("Description for delivery note line 1")).toHaveValue("Delivered consulting"));
    expect(screen.getByLabelText("Customer")).toHaveValue("customer-1");
    expect(screen.getByLabelText("Quantity for delivery note line 1")).toHaveValue("3.0000");

    fireEvent.submit(screen.getByRole("button", { name: "Create draft delivery note" }).closest("form")!);

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/delivery-notes",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            customerId: "customer-1",
            relatedSalesInvoiceId: "invoice-1",
            lines: [
              expect.objectContaining({
                description: "Delivered consulting",
                quantity: "3.0000",
                sourceSalesInvoiceLineId: "invoice-line-1",
              }),
            ],
          }),
        }),
      ),
    );
    expect(pushMock).toHaveBeenCalledWith("/sales/delivery-notes/dn-1");
  });

  it("hides invalid invoice and quote source options", async () => {
    render(<DeliveryNoteForm />);

    await waitFor(() => expect(screen.getByLabelText("Accepted quote source")).toBeInTheDocument());
    expect(screen.getByRole("option", { name: /INV-000010/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /INV-000099/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /QUO-000001/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /QUO-000002/ })).not.toBeInTheDocument();
  });

  it("blocks editing non-draft delivery notes", () => {
    render(<DeliveryNoteForm initialDeliveryNote={deliveryNoteFixture({ status: "DELIVERED" })} />);

    expect(screen.getByText("Only draft delivery notes can be edited.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to delivery note" })).toHaveAttribute("href", "/sales/delivery-notes/dn-1");
  });
});

function contactFixture(id: string, name: string) {
  return {
    id,
    name,
    displayName: name,
    type: "CUSTOMER",
    email: null,
    phone: null,
    taxNumber: null,
    isActive: true,
  };
}

function sourceLineFixture(id: string, description: string, quantity: string): any {
  return {
    id,
    organizationId: "org-1",
    itemId: "item-1",
    description,
    quantity,
    item: { id: "item-1", name: "Consulting", sku: "SVC", status: "ACTIVE" },
  };
}

function salesInvoiceFixture(overrides: Partial<SalesInvoice> = {}): SalesInvoice {
  return {
    id: "invoice-1",
    organizationId: "org-1",
    invoiceNumber: "INV-000010",
    customerId: "customer-1",
    branchId: null,
    status: "FINALIZED",
    issueDate: "2026-06-03T00:00:00.000Z",
    dueDate: null,
    currency: "SAR",
    taxMode: "TAX_EXCLUSIVE",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    balanceDue: "115.0000",
    notes: null,
    terms: null,
    finalizedAt: "2026-06-03T00:00:00.000Z",
    journalEntryId: "journal-1",
    reversalJournalEntryId: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null },
    lines: [],
    ...overrides,
  } as SalesInvoice;
}

function salesQuoteFixture(overrides: Partial<SalesQuote> = {}): SalesQuote {
  return {
    id: "quote-1",
    organizationId: "org-1",
    quoteNumber: "QUO-000001",
    customerId: "customer-1",
    branchId: null,
    status: "ACCEPTED",
    issueDate: "2026-06-03T00:00:00.000Z",
    expiryDate: "2026-06-30T00:00:00.000Z",
    reference: "RFQ-1",
    currency: "SAR",
    taxMode: "TAX_EXCLUSIVE",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    notes: null,
    terms: null,
    convertedSalesInvoiceId: null,
    convertedAt: null,
    sentAt: null,
    acceptedAt: "2026-06-04T00:00:00.000Z",
    rejectedAt: null,
    expiredAt: null,
    cancelledAt: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null },
    branch: null,
    convertedSalesInvoice: null,
    lines: [],
    ...overrides,
  } as SalesQuote;
}

function deliveryNoteFixture(overrides: Partial<DeliveryNote> = {}): DeliveryNote {
  return {
    id: "dn-1",
    organizationId: "org-1",
    deliveryNoteNumber: "DN-000042",
    customerId: "customer-1",
    branchId: null,
    status: "DRAFT",
    issueDate: "2026-06-04T00:00:00.000Z",
    deliveryDate: null,
    reference: "INV-000010",
    relatedSalesInvoiceId: "invoice-1",
    relatedSalesQuoteId: null,
    relatedSalesStockIssueId: null,
    deliveryAddress: null,
    notes: null,
    instructions: null,
    issuedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    voidedAt: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null, isActive: true },
    branch: null,
    relatedSalesInvoice: { id: "invoice-1", invoiceNumber: "INV-000010", status: "FINALIZED" },
    relatedSalesQuote: null,
    relatedSalesStockIssue: null,
    lines: [
      {
        id: "dn-line-1",
        organizationId: "org-1",
        deliveryNoteId: "dn-1",
        itemId: "item-1",
        description: "Delivered consulting",
        quantity: "3.0000",
        unitOfMeasure: null,
        sourceSalesInvoiceLineId: "invoice-line-1",
        sourceSalesQuoteLineId: null,
        sourceSalesStockIssueLineId: null,
        sortOrder: 0,
        item: { id: "item-1", name: "Consulting", sku: "SVC", status: "ACTIVE" },
      },
    ],
    ...overrides,
  };
}
