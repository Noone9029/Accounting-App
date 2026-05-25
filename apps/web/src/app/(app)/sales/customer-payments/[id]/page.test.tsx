import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import CustomerPaymentDetailPage, { CustomerPaymentStateDisplay, CustomerPaymentWorkflowGuidance } from "./page";
import type { CustomerPayment, OpenSalesInvoice } from "@/lib/types";

const mockApiRequest = jest.fn();
const mockPermissionCan = jest.fn();

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
  useParams: () => ({ id: "payment-1" }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: mockPermissionCan,
  }),
}));

jest.mock("@/components/attachments/attachment-panel", () => ({
  AttachmentPanel: () => null,
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

describe("customer payment workflow guidance", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockPermissionCan.mockReset();
    mockPermissionCan.mockReturnValue(true);
  });

  it("submits a guarded unapplied payment application and refreshes the payment detail", async () => {
    const initialPayment = paymentFixture({ amountReceived: "150.0000", unappliedAmount: "50.0000", allocations: [] });
    const updatedPayment = paymentFixture({ amountReceived: "150.0000", unappliedAmount: "20.0000", allocations: [] });
    const refreshedPayment = paymentFixture({
      amountReceived: "150.0000",
      unappliedAmount: "20.0000",
      allocations: [],
      unappliedAllocations: [
        {
          id: "unapplied-1",
          organizationId: "org-1",
          paymentId: "payment-1",
          invoiceId: "invoice-open",
          amountApplied: "30.0000",
          reversedAt: null,
          reversedById: null,
          reversalReason: null,
          createdAt: "2026-05-21T00:00:00.000Z",
          updatedAt: "2026-05-21T00:00:00.000Z",
          invoice: {
            id: "invoice-open",
            invoiceNumber: "INV-OPEN",
            issueDate: "2026-05-21T00:00:00.000Z",
            total: "40.0000",
            balanceDue: "10.0000",
            status: "FINALIZED",
          },
        },
      ],
    });
    const paymentLoads = [initialPayment, refreshedPayment];
    const openInvoices: OpenSalesInvoice[] = [
      {
        id: "invoice-open",
        invoiceNumber: "INV-OPEN",
        issueDate: "2026-05-21T00:00:00.000Z",
        dueDate: null,
        currency: "SAR",
        total: "40.0000",
        balanceDue: "40.0000",
        customerId: "customer-1",
      },
    ];

    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/customer-payments/payment-1") {
        return Promise.resolve(paymentLoads.shift() ?? refreshedPayment);
      }
      if (path === "/sales-invoices/open?customerId=customer-1") {
        return Promise.resolve(openInvoices);
      }
      if (path === "/customer-payments/payment-1/apply-unapplied") {
        return Promise.resolve(updatedPayment);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<CustomerPaymentDetailPage />);

    await screen.findByText(/INV-OPEN/);
    const amountInput = screen.getByLabelText("Amount to apply");
    expect(amountInput).toHaveAttribute("max", "40.0000");

    fireEvent.change(amountInput, { target: { value: "30.0000" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/customer-payments/payment-1/apply-unapplied", {
        method: "POST",
        body: {
          invoiceId: "invoice-open",
          amountApplied: "30.0000",
        },
      }),
    );
    await waitFor(() => expect(mockApiRequest.mock.calls.filter(([path]) => path === "/customer-payments/payment-1")).toHaveLength(2));
    expect(screen.getByText((content) => content.includes("Applied") && content.includes("from CP-001"))).toBeInTheDocument();
    expect(mockApiRequest.mock.calls.map(([path]) => String(path)).some((path) => path.includes("receipt"))).toBe(false);
  });

  it("shows payment state, allocation totals, and journal status from the payment response", () => {
    render(
      <CustomerPaymentStateDisplay
        payment={paymentFixture({
          amountReceived: "200.0000",
          unappliedAmount: "25.0000",
          allocations: [
            {
              id: "allocation-1",
              organizationId: "org-1",
              paymentId: "payment-1",
              invoiceId: "invoice-1",
              amountApplied: "60.0000",
            },
            {
              id: "allocation-2",
              organizationId: "org-1",
              paymentId: "payment-1",
              invoiceId: "invoice-2",
              amountApplied: "40.0000",
            },
          ],
          unappliedAllocations: [
            {
              id: "unapplied-1",
              organizationId: "org-1",
              paymentId: "payment-1",
              invoiceId: "invoice-3",
              amountApplied: "20.0000",
              reversedAt: null,
              reversedById: null,
              reversalReason: null,
              createdAt: "2026-05-21T00:00:00.000Z",
              updatedAt: "2026-05-21T00:00:00.000Z",
            },
            {
              id: "unapplied-2",
              organizationId: "org-1",
              paymentId: "payment-1",
              invoiceId: "invoice-4",
              amountApplied: "5.0000",
              reversedAt: "2026-05-22T00:00:00.000Z",
              reversedById: "user-1",
              reversalReason: "Wrong invoice",
              createdAt: "2026-05-21T00:00:00.000Z",
              updatedAt: "2026-05-22T00:00:00.000Z",
            },
          ],
          voidReversalJournalEntry: { id: "journal-2", entryNumber: "JE-002", status: "POSTED" },
        })}
      />,
    );

    expect(screen.getByText("Payment state")).toBeInTheDocument();
    expect(screen.getAllByText("Posted").length).toBeGreaterThan(0);
    expect(screen.getByText("Posted with payment accounting returned.")).toBeInTheDocument();
    expect(screen.getByText(/200\.00/)).toBeInTheDocument();
    expect(screen.getByText(/25\.00/)).toBeInTheDocument();
    expect(screen.getByText(/100\.00/)).toBeInTheDocument();
    expect(screen.getByText("2 invoices")).toBeInTheDocument();
    expect(screen.getByText("1 active, 1 reversed")).toBeInTheDocument();
    expect(screen.getByText("111 Cash on hand")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "JE-001" })).toHaveAttribute("href", "/journal-entries");
    expect(screen.getByRole("link", { name: "JE-002" })).toHaveAttribute("href", "/journal-entries");
  });

  it("shows clear empty states when accounting details are not returned", () => {
    render(
      <CustomerPaymentStateDisplay
        payment={paymentFixture({
          status: "DRAFT",
          account: undefined,
          journalEntry: null,
          allocations: undefined,
          unappliedAllocations: undefined,
          postedAt: null,
        })}
      />,
    );

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Draft payment with no posted accounting output.")).toBeInTheDocument();
    expect(screen.getByText("0 invoices")).toBeInTheDocument();
    expect(screen.getByText("0 active, 0 reversed")).toBeInTheDocument();
    expect(screen.getByText("Not returned")).toBeInTheDocument();
    expect(screen.getByText("No payment journal returned")).toBeInTheDocument();
  });

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
    expect(screen.getByRole("button", { name: "Download receipt PDF" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open archive" })).toHaveAttribute("href", "/documents");
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
