import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import CustomerPaymentDetailPage, { CustomerPaymentAuditStatus, CustomerPaymentReceiptArchiveState, CustomerPaymentStateDisplay, CustomerPaymentWorkflowGuidance } from "./page";
import type { AuditLogEntry, AuditLogListResponse, CustomerPayment, CustomerPaymentReceiptData, GeneratedDocument, OpenSalesInvoice } from "@/lib/types";

const mockApiRequest = jest.fn();
const mockDownloadPdf = jest.fn();
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

jest.mock("@/lib/pdf-download", () => ({
  downloadPdf: (...args: unknown[]) => mockDownloadPdf(...args),
}));

describe("customer payment workflow guidance", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockDownloadPdf.mockReset();
    mockPermissionCan.mockReset();
    mockPermissionCan.mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      if (path === "/generated-documents?documentType=CUSTOMER_PAYMENT_RECEIPT&sourceType=CustomerPayment&sourceId=payment-1") {
        return Promise.resolve([]);
      }
      if (path.startsWith("/audit-logs?")) {
        return Promise.resolve(auditLogListFixture());
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

  it("reverses an active unapplied allocation with confirmation, reason, and detail refresh", async () => {
    const activeAllocation = unappliedAllocationFixture({
      id: "unapplied-active",
      invoiceId: "invoice-active",
      amountApplied: "30.0000",
      invoice: invoiceSummaryFixture({ id: "invoice-active", invoiceNumber: "INV-ACTIVE", balanceDue: "10.0000" }),
    });
    const reversedAllocation = unappliedAllocationFixture({
      id: "unapplied-reversed",
      invoiceId: "invoice-reversed",
      amountApplied: "12.0000",
      reversedAt: "2026-05-22T00:00:00.000Z",
      reversedById: "user-1",
      reversalReason: "Already reversed",
      invoice: invoiceSummaryFixture({ id: "invoice-reversed", invoiceNumber: "INV-REVERSED", balanceDue: "12.0000" }),
    });
    const initialPayment = paymentFixture({ unappliedAllocations: [activeAllocation, reversedAllocation] });
    const updatedPayment = paymentFixture({
      unappliedAllocations: [
        { ...activeAllocation, reversedAt: "2026-05-23T00:00:00.000Z", reversedById: "user-1", reversalReason: "Wrong invoice" },
        reversedAllocation,
      ],
    });
    const refreshedPayment = paymentFixture({ unappliedAllocations: updatedPayment.unappliedAllocations });
    const paymentLoads = [initialPayment, refreshedPayment];

    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/customer-payments/payment-1") {
        return Promise.resolve(paymentLoads.shift() ?? refreshedPayment);
      }
      if (path === "/sales-invoices/open?customerId=customer-1") {
        return Promise.resolve([]);
      }
      if (path === "/generated-documents?documentType=CUSTOMER_PAYMENT_RECEIPT&sourceType=CustomerPayment&sourceId=payment-1") {
        return Promise.resolve([]);
      }
      if (path.startsWith("/audit-logs?")) {
        return Promise.resolve(auditLogListFixture());
      }
      if (path === "/customer-payments/payment-1/unapplied-allocations/unapplied-active/reverse") {
        return Promise.resolve(updatedPayment);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<CustomerPaymentDetailPage />);

    await screen.findByText("INV-ACTIVE");
    expect(screen.getAllByRole("button", { name: "Reverse" })).toHaveLength(1);
    expect(screen.getByText("INV-REVERSED")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reverse" }));
    expect(await screen.findByRole("dialog", { name: "Reverse unapplied allocation" })).toBeInTheDocument();
    expect(screen.getByText(/restores payment credit/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Reason (optional)"), { target: { value: "Wrong invoice" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm reversal" }));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/customer-payments/payment-1/unapplied-allocations/unapplied-active/reverse", {
        method: "POST",
        body: { reason: "Wrong invoice" },
      }),
    );
    await waitFor(() => expect(mockApiRequest.mock.calls.filter(([path]) => path === "/customer-payments/payment-1")).toHaveLength(2));
    expect(screen.getByText("Unapplied payment allocation reversed.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Reverse unapplied allocation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reverse" })).not.toBeInTheDocument();
  });

  it("previews and downloads customer payment receipts only through explicit actions", async () => {
    const payment = paymentFixture();
    const receiptData = customerPaymentReceiptDataFixture();
    mockDownloadPdf.mockResolvedValue(undefined);
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/customer-payments/payment-1") {
        return Promise.resolve(payment);
      }
      if (path === "/customer-payments/payment-1/receipt-data") {
        return Promise.resolve(receiptData);
      }
      if (path === "/generated-documents?documentType=CUSTOMER_PAYMENT_RECEIPT&sourceType=CustomerPayment&sourceId=payment-1") {
        return Promise.resolve([]);
      }
      if (path.startsWith("/audit-logs?")) {
        return Promise.resolve(auditLogListFixture());
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<CustomerPaymentDetailPage />);

    await screen.findByRole("button", { name: "Preview receipt" });
    expect(mockApiRequest.mock.calls.map(([path]) => String(path)).some((path) => path === "/customer-payments/payment-1/receipt-data")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Preview receipt" }));

    await waitFor(() => expect(mockApiRequest).toHaveBeenCalledWith("/customer-payments/payment-1/receipt-data"));
    expect(await screen.findByText("Receipt preview")).toBeInTheDocument();
    expect(screen.getByText("Beta Customer")).toBeInTheDocument();
    expect(screen.getByText("Receipt preview loaded. PDF generation remains an explicit download action.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Download receipt PDF" }));

    await waitFor(() => expect(mockDownloadPdf).toHaveBeenCalledWith("/customer-payments/payment-1/receipt.pdf", "receipt-CP-001.pdf"));
    expect(await screen.findByText("Receipt PDF generated and downloaded.")).toBeInTheDocument();
  });

  it("displays backend validation errors from unapplied allocation reversal", async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/customer-payments/payment-1") {
        return Promise.resolve(paymentFixture({ unappliedAllocations: [unappliedAllocationFixture()] }));
      }
      if (path === "/sales-invoices/open?customerId=customer-1") {
        return Promise.resolve([]);
      }
      if (path === "/generated-documents?documentType=CUSTOMER_PAYMENT_RECEIPT&sourceType=CustomerPayment&sourceId=payment-1") {
        return Promise.resolve([]);
      }
      if (path.startsWith("/audit-logs?")) {
        return Promise.resolve(auditLogListFixture());
      }
      if (path === "/customer-payments/payment-1/unapplied-allocations/unapplied-1/reverse") {
        return Promise.reject(new Error("Cannot reverse an already reversed allocation."));
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<CustomerPaymentDetailPage />);

    await screen.findByText("INV-UNAPPLIED");
    fireEvent.click(screen.getByRole("button", { name: "Reverse" }));
    fireEvent.change(await screen.findByLabelText("Reason (optional)"), { target: { value: "Wrong invoice" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm reversal" }));

    expect(await screen.findByText("Cannot reverse an already reversed allocation.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Reverse unapplied allocation" })).toBeInTheDocument();
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
    expect(screen.getAllByText("Partially unapplied").length).toBeGreaterThan(0);
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
    expect(screen.getAllByText("No allocations").length).toBeGreaterThan(0);
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
        loadingReceiptData={false}
        onPreviewReceiptData={jest.fn()}
        onDownloadReceiptPdf={jest.fn()}
      />,
    );

    expect(screen.getByText(/Payment recorded/)).toBeInTheDocument();
    expect(screen.getByText("Posted")).toBeInTheDocument();
    expect(screen.getByText(/linked invoice balances were reduced/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View invoice" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
    expect(screen.getByRole("link", { name: "Open customer workspace" })).toHaveAttribute("href", "/customers/customer-1");
    expect(screen.getByRole("button", { name: "Preview receipt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download receipt PDF" })).toBeInTheDocument();
    expect(screen.getByText(/explicit receipt PDF route/)).toBeInTheDocument();
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
        loadingReceiptData={false}
        onPreviewReceiptData={jest.fn()}
        onDownloadReceiptPdf={jest.fn()}
      />,
    );

    expect(screen.getByText("Unapplied credit")).toBeInTheDocument();
    expect(screen.getByText(/matched to a later invoice or refunded/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View invoice" })).not.toBeInTheDocument();
  });

  it("shows receipt output archive state and a clear empty state", () => {
    const receiptDocument = generatedDocumentFixture();

    const { rerender } = render(
      <CustomerPaymentReceiptArchiveState
        documents={[]}
        loading={false}
        error=""
        canViewGeneratedDocuments
      />,
    );

    expect(screen.getByText("No archived receipt")).toBeInTheDocument();
    expect(screen.getByText("No receipt PDF has been generated or archived for this payment.")).toBeInTheDocument();

    rerender(
      <CustomerPaymentReceiptArchiveState
        documents={[receiptDocument]}
        loading={false}
        error=""
        canViewGeneratedDocuments
      />,
    );

    expect(screen.getByText("1 archived")).toBeInTheDocument();
    expect(screen.getByText("receipt-CP-001.pdf")).toBeInTheDocument();
    expect(screen.getAllByText("Generated").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Open archive" })).toHaveAttribute("href", "/documents");
  });

  it("shows read-only audit status for payment and unapplied allocation events", () => {
    render(
      <CustomerPaymentAuditStatus
        payment={paymentFixture()}
        logs={[
          auditLogFixture({
            id: "audit-reverse",
            action: "CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED",
            entityType: "CustomerPaymentUnappliedAllocation",
            entityId: "unapplied-1",
            createdAt: "2026-05-23T00:00:00.000Z",
          }),
          auditLogFixture({
            id: "audit-create",
            action: "CUSTOMER_PAYMENT_CREATED",
            entityType: "CustomerPayment",
            entityId: "payment-1",
            createdAt: "2026-05-21T00:00:00.000Z",
          }),
        ]}
        loading={false}
        error=""
        canViewAuditLogs
      />,
    );

    expect(screen.getByText("Audit status")).toBeInTheDocument();
    expect(screen.getByText("2 events")).toBeInTheDocument();
    expect(screen.getAllByText("Unapplied payment allocation reversed").length).toBeGreaterThan(0);
    expect(screen.getByText((content) => content.includes("Customer Payment Unapplied Allocation"))).toBeInTheDocument();
    expect(screen.getByText("Customer payment created")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open audit logs" })).toHaveAttribute(
      "href",
      "/settings/audit-logs",
    );
  });

  it("shows audit empty and permission states without payment mutations", () => {
    const { rerender } = render(
      <CustomerPaymentAuditStatus
        payment={paymentFixture()}
        logs={[]}
        loading={false}
        error=""
        canViewAuditLogs
      />,
    );

    expect(screen.getByText("No events")).toBeInTheDocument();
    expect(screen.getByText("No customer payment audit entries were returned for this payment.")).toBeInTheDocument();

    rerender(
      <CustomerPaymentAuditStatus
        payment={paymentFixture()}
        logs={[]}
        loading={false}
        error=""
        canViewAuditLogs={false}
      />,
    );

    expect(screen.getByText("Permission required")).toBeInTheDocument();
    expect(screen.getByText("Audit log permission is required to view customer payment audit events.")).toBeInTheDocument();
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

function customerPaymentReceiptDataFixture(overrides: Partial<CustomerPaymentReceiptData> = {}): CustomerPaymentReceiptData {
  return {
    receiptNumber: "CP-001",
    paymentDate: "2026-05-21T00:00:00.000Z",
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", email: "beta@example.com", phone: null, taxNumber: null },
    organization: {
      id: "org-1",
      name: "LedgerByte Test Org",
      legalName: null,
      taxNumber: null,
      countryCode: "SA",
      baseCurrency: "SAR",
      timezone: "Asia/Riyadh",
    },
    amountReceived: "115.0000",
    unappliedAmount: "0.0000",
    currency: "SAR",
    paidThroughAccount: { id: "account-1", code: "111", name: "Cash on hand", type: "ASSET" },
    allocations: [
      {
        invoiceId: "invoice-1",
        invoiceNumber: "INV-001",
        invoiceDate: "2026-05-21T00:00:00.000Z",
        invoiceTotal: "115.0000",
        amountApplied: "115.0000",
        invoiceBalanceDue: "0.0000",
      },
    ],
    unappliedAllocations: [],
    journalEntry: { id: "je-1", entryNumber: "JE-001", status: "POSTED", totalDebit: "115.0000", totalCredit: "115.0000" },
    status: "POSTED",
    ...overrides,
  };
}

function unappliedAllocationFixture(
  overrides: Partial<NonNullable<CustomerPayment["unappliedAllocations"]>[number]> = {},
): NonNullable<CustomerPayment["unappliedAllocations"]>[number] {
  return {
    id: "unapplied-1",
    organizationId: "org-1",
    paymentId: "payment-1",
    invoiceId: "invoice-unapplied",
    amountApplied: "25.0000",
    reversedAt: null,
    reversedById: null,
    reversalReason: null,
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    invoice: invoiceSummaryFixture(),
    ...overrides,
  };
}

function invoiceSummaryFixture(
  overrides: Partial<NonNullable<NonNullable<CustomerPayment["unappliedAllocations"]>[number]["invoice"]>> = {},
): NonNullable<NonNullable<CustomerPayment["unappliedAllocations"]>[number]["invoice"]> {
  return {
    id: "invoice-unapplied",
    invoiceNumber: "INV-UNAPPLIED",
    issueDate: "2026-05-21T00:00:00.000Z",
    total: "25.0000",
    balanceDue: "0.0000",
    status: "FINALIZED",
    ...overrides,
  };
}

function generatedDocumentFixture(overrides: Partial<GeneratedDocument> = {}): GeneratedDocument {
  return {
    id: "document-1",
    organizationId: "org-1",
    documentType: "CUSTOMER_PAYMENT_RECEIPT",
    sourceType: "CustomerPayment",
    sourceId: "payment-1",
    documentNumber: "CP-001",
    filename: "receipt-CP-001.pdf",
    mimeType: "application/pdf",
    storageProvider: "database",
    storageKey: null,
    contentHash: "hash",
    sizeBytes: 1200,
    status: "GENERATED",
    generatedById: "user-1",
    generatedAt: "2026-05-21T00:00:00.000Z",
    createdAt: "2026-05-21T00:00:00.000Z",
    ...overrides,
  };
}

function auditLogListFixture(logs: AuditLogEntry[] = [auditLogFixture()]): AuditLogListResponse {
  return {
    data: logs,
    pagination: {
      page: 1,
      limit: 8,
      total: logs.length,
      hasMore: false,
    },
  };
}

function auditLogFixture(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: "audit-1",
    organizationId: "org-1",
    actorUserId: "user-1",
    actorUser: { id: "user-1", name: "Accountant", email: "accountant@example.com" },
    action: "CUSTOMER_PAYMENT_CREATED",
    entityType: "CustomerPayment",
    entityId: "payment-1",
    before: null,
    after: { paymentNumber: "CP-001" },
    ipAddress: null,
    userAgent: null,
    createdAt: "2026-05-21T00:00:00.000Z",
    ...overrides,
  };
}
