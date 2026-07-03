import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import SalesInvoiceDetailPage, { InvoiceWorkflowGuidance } from "./page";
import type { CollectionCase, DeliveryNote, SalesInvoice } from "@/lib/types";

const apiRequestMock = jest.fn();
let mockAllowedPermissions = new Set<string>();
let searchParamsMock = new URLSearchParams();
const refreshMock = jest.fn();
const originalLedgerByteMarket = process.env.NEXT_PUBLIC_LEDGERBYTE_MARKET;

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
  useParams: () => ({ id: "invoice-1" }),
  useRouter: () => ({ push: jest.fn(), refresh: refreshMock }),
  useSearchParams: () => searchParamsMock,
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: string) => mockAllowedPermissions.has(permission),
  }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

jest.mock("@/lib/pdf-download", () => {
  const actual = jest.requireActual("@/lib/pdf-download");
  return {
    ...actual,
    downloadPdf: jest.fn(),
  };
});

describe("invoice workflow guidance", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_LEDGERBYTE_MARKET = "GENERIC";
    apiRequestMock.mockReset();
    refreshMock.mockReset();
    mockAllowedPermissions = new Set(["salesInvoices.view", "salesInvoices.create", "salesInvoices.update", "generatedDocuments.view", "generatedDocuments.download"]);
    searchParamsMock = new URLSearchParams();
  });

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
      "/sales/customer-payments/new?customerId=customer-1&invoiceId=invoice-1&returnTo=%2Fsales%2Finvoices%2Finvoice-1",
    );
    expect(screen.getByRole("link", { name: "View customer ledger" })).toHaveAttribute("href", "/customers/customer-1");
    expect(screen.getByRole("link", { name: "View report" })).toHaveAttribute("href", "/reports/profit-and-loss");
    expect(screen.getByRole("button", { name: "Download invoice PDF" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open archive" })).toHaveAttribute("href", "/documents");
    expect(screen.getByText(/ZATCA status here is local\/readiness only/)).toBeInTheDocument();
    expect(screen.getByText(/production compliance are not enabled/)).toBeInTheDocument();
    expect(screen.queryByText(/production submission is connected/i)).not.toBeInTheDocument();
  });

  it("preserves statement return context when opening payment actions from invoice detail", () => {
    render(
      <InvoiceWorkflowGuidance
        invoice={invoiceFixture({ status: "FINALIZED", balanceDue: "115.0000" })}
        actionLoading={false}
        canFinalizeInvoice
        canCreateCustomerPayment
        returnTo="/contacts/contact-1?section=statement&returnTo=%2Fcustomers%2Fcontact-1"
        onFinalize={jest.fn()}
        onDownloadPdf={jest.fn()}
      />,
    );

    expect(screen.getByRole("link", { name: "Record payment" })).toHaveAttribute(
      "href",
      "/sales/customer-payments/new?customerId=customer-1&invoiceId=invoice-1&returnTo=%2Fsales%2Finvoices%2Finvoice-1%3FreturnTo%3D%252Fcontacts%252Fcontact-1%253Fsection%253Dstatement%2526returnTo%253D%25252Fcustomers%25252Fcontact-1",
    );
  });
});

describe("SalesInvoiceDetailPage delivery-note source visibility", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_LEDGERBYTE_MARKET = "GENERIC";
    apiRequestMock.mockReset();
    refreshMock.mockReset();
    mockAllowedPermissions = new Set(["salesInvoices.view", "salesInvoices.create", "salesInvoices.update", "generatedDocuments.view", "generatedDocuments.download"]);
  });

  afterAll(() => {
    if (originalLedgerByteMarket === undefined) {
      delete process.env.NEXT_PUBLIC_LEDGERBYTE_MARKET;
    } else {
      process.env.NEXT_PUBLIC_LEDGERBYTE_MARKET = originalLedgerByteMarket;
    }
  });

  it("shows linked delivery notes from the invoice without mutating the invoice", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/sales-invoices/invoice-1") {
        return Promise.resolve(invoiceFixture({ status: "FINALIZED", finalizedAt: "2026-06-04T10:00:00.000Z", journalEntry: { id: "journal-1", entryNumber: "JE-000001", status: "POSTED", totalDebit: "115.0000", totalCredit: "115.0000" } }));
      }
      if (path.startsWith("/delivery-notes")) {
        return Promise.resolve([deliveryNoteFixture()]);
      }
      if (path === "/collections/invoice/invoice-1") {
        return Promise.resolve([collectionCaseFixture()]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<SalesInvoiceDetailPage />);

    await waitFor(() => expect(screen.getByRole("link", { name: "DN-000042" })).toHaveAttribute("href", "/sales/delivery-notes/dn-1"));
    expect(screen.getByText("Related delivery notes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Customer workspace" })).toHaveAttribute("href", "/customers/customer-1");
    expect(screen.getByText(/fulfillment documents/i)).toBeInTheDocument();
    expect(screen.getByText(/do not post journals, create accounts receivable, file VAT, send email, call ZATCA, or move inventory/i)).toBeInTheDocument();
    expect(await screen.findByText("Related collection cases")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "COL-000042" })).toHaveAttribute("href", "/sales/collections/case-1");
    expect(screen.getByText(/do not post journals, allocate payments, send email or reminders, create payment links, file VAT, call ZATCA, or change invoice balances/i)).toBeInTheDocument();
    expect(screen.queryByText(/tax invoice/i)).not.toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalledWith(expect.stringMatching(/finalize|void/), expect.anything());
  });

  it("keeps ZATCA invoice actions framed as local readiness rather than production clearance or reporting", async () => {
    process.env.NEXT_PUBLIC_LEDGERBYTE_MARKET = "KSA";
    mockAllowedPermissions = new Set([
      "salesInvoices.view",
      "salesInvoices.create",
      "salesInvoices.update",
      "generatedDocuments.view",
      "generatedDocuments.download",
      "zatca.view",
      "zatca.generateXml",
      "zatca.runChecks",
      "zatca.manage",
    ]);
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/sales-invoices/invoice-1") {
        return Promise.resolve(invoiceFixture({ status: "FINALIZED", finalizedAt: "2026-06-04T10:00:00.000Z" }));
      }
      if (path.startsWith("/delivery-notes")) {
        return Promise.resolve([]);
      }
      if (path === "/collections/invoice/invoice-1") {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<SalesInvoiceDetailPage />);

    expect(await screen.findByText("Local ZATCA readiness groundwork")).toBeInTheDocument();
    expect(screen.getByText(/No production ZATCA submission, clearance, reporting, or compliance claim/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check clearance blocker" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check reporting blocker" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request clearance" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request reporting" })).not.toBeInTheDocument();
    expect(screen.queryByText(/production ZATCA clearance has been requested/i)).not.toBeInTheDocument();
  });

  it("renders UAE Peppol/PINT-AE readiness panel for finalized invoices", async () => {
    process.env.NEXT_PUBLIC_LEDGERBYTE_MARKET = "UAE";
    mockAllowedPermissions = new Set([
      "salesInvoices.view",
      "compliance.view",
      "compliance.manage",
      "compliance.validate",
    ]);
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/sales-invoices/invoice-1") {
        return Promise.resolve(invoiceFixture({ status: "FINALIZED", finalizedAt: "2026-06-04T10:00:00.000Z" }));
      }
      if (path === "/compliance/sales-invoices/invoice-1/readiness") {
        return Promise.resolve(uaeReadinessFixture());
      }
      if (path.startsWith("/delivery-notes")) {
        return Promise.resolve([]);
      }
      if (path === "/collections/invoice/invoice-1") {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<SalesInvoiceDetailPage />);

    expect(await screen.findByText("UAE eInvoicing/PINT-AE readiness")).toBeInTheDocument();
    expect(screen.getByText("Seller")).toBeInTheDocument();
    expect(screen.getByText("Buyer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validate UAE eInvoice readiness" })).toBeEnabled();
    expect(screen.getByText(/No network, no ASP submission, no FTA reporting/i)).toBeInTheDocument();
    expect(screen.queryByText(/FTA certified|Peppol certified|official provider|accredited ASP/i)).not.toBeInTheDocument();
  });

  it("uses the incoming shared statement return path for the back action", async () => {
    searchParamsMock = new URLSearchParams("returnTo=%2Fcontacts%2Fcontact-1%3Fsection%3Dstatement%26returnTo%3D%252Fcustomers%252Fcontact-1");
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/sales-invoices/invoice-1") {
        return Promise.resolve(invoiceFixture({ status: "FINALIZED", finalizedAt: "2026-06-04T10:00:00.000Z" }));
      }
      if (path.startsWith("/delivery-notes")) {
        return Promise.resolve([]);
      }
      if (path === "/collections/invoice/invoice-1") {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<SalesInvoiceDetailPage />);

    expect(await screen.findByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/contacts/contact-1?section=statement&returnTo=%2Fcustomers%2Fcontact-1",
    );
  });

  it("renders invoice detail core panels in Arabic RTL with invoice numbers unchanged", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/sales-invoices/invoice-1") {
        return Promise.resolve(invoiceFixture({ status: "FINALIZED", finalizedAt: "2026-06-04T10:00:00.000Z" }));
      }
      if (path === "/sales-invoices/invoice-1/stock-issue-status") {
        return Promise.resolve(null);
      }
      if (path.startsWith("/delivery-notes")) {
        return Promise.resolve([]);
      }
      if (path === "/collections/invoice/invoice-1") {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(
      <AppLocaleProvider initialLocale="ar">
        <SalesInvoiceDetailPage />
      </AppLocaleProvider>,
    );

    await waitFor(() => expect(screen.getByText("INV-001")).toBeInTheDocument());
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(screen.getByText("INV-001").closest("bdi")).toHaveAttribute("dir", "ltr");
    expect(screen.getByText("تفاصيل الفاتورة، والإجماليات المحسوبة، وقيد اليومية المرتبط.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ماذا حدث؟" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "الإجراءات التالية" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "تنزيل PDF الفاتورة" })).toHaveLength(2);
    expect(screen.getByText("ما زالت الدفعة مستحقة، لكن دورك لا يمكنه تسجيل دفعات العملاء.")).toBeInTheDocument();
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
    taxMode: "TAX_EXCLUSIVE",
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
    reference: "INV-001",
    relatedSalesInvoiceId: "invoice-1",
    relatedSalesQuoteId: null,
    relatedSalesStockIssueId: null,
    deliveryAddress: "Warehouse Dock 1",
    notes: null,
    instructions: null,
    issuedAt: "2026-06-04T10:00:00.000Z",
    deliveredAt: "2026-06-05T10:00:00.000Z",
    cancelledAt: null,
    voidedAt: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null },
    branch: null,
    relatedSalesInvoice: { id: "invoice-1", invoiceNumber: "INV-001", status: "FINALIZED" },
    relatedSalesQuote: null,
    relatedSalesStockIssue: null,
    lines: [],
    ...overrides,
  };
}

function collectionCaseFixture(overrides: Partial<CollectionCase> = {}): CollectionCase {
  return {
    id: "case-1",
    organizationId: "org-1",
    caseNumber: "COL-000042",
    customerId: "customer-1",
    salesInvoiceId: "invoice-1",
    status: "PROMISED_TO_PAY",
    priority: "HIGH",
    followUpDate: "2026-06-08T00:00:00.000Z",
    promisedPaymentDate: "2026-06-10T00:00:00.000Z",
    promisedAmount: "60.0000",
    assignedToUserId: null,
    lastActivityAt: "2026-06-04T00:00:00.000Z",
    nextActionAt: "2026-06-08T00:00:00.000Z",
    summary: "Customer promised payment",
    notes: null,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z",
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER" },
    salesInvoice: { id: "invoice-1", invoiceNumber: "INV-001", customerId: "customer-1", dueDate: "2026-06-01T00:00:00.000Z", currency: "SAR", status: "FINALIZED", total: "115.0000", balanceDue: "115.0000" },
    assignedTo: null,
    createdBy: null,
    updatedBy: null,
    activities: [{ id: "activity-1", organizationId: "org-1", collectionCaseId: "case-1", customerId: "customer-1", salesInvoiceId: "invoice-1", activityType: "PROMISE_TO_PAY", activityDate: "2026-06-04T00:00:00.000Z", note: "Promised payment", nextFollowUpDate: "2026-06-08T00:00:00.000Z", promisedPaymentDate: "2026-06-10T00:00:00.000Z", promisedAmount: "60.0000", createdById: "user-1", createdAt: "2026-06-04T00:00:00.000Z" }],
    ...overrides,
  };
}

function uaeReadinessFixture() {
  const section = (label: string) => ({
    label,
    status: "READY_FOR_VALIDATION",
    checks: [{ key: `${label}_CHECK`, label: `${label} check`, status: "PASS", detail: "Configured." }],
  });
  return {
    posture: "CONTROLLED_BETA_USER_TESTING_ONLY",
    sourceType: "SALES_INVOICE",
    sourceId: "invoice-1",
    sourceStatus: "FINALIZED",
    localOnly: true,
    noNetwork: true,
    noAspSubmission: true,
    noFtaReporting: true,
    productionCompliance: false,
    canAttemptLocalXmlGeneration: true,
    readiness: {
      kind: "invoice",
      status: "READY_FOR_VALIDATION",
      seller: section("Seller"),
      buyer: section("Buyer"),
      invoiceFields: section("Required invoice fields"),
      taxIdentity: section("Tax identity"),
      peppolParticipant: section("Peppol participant readiness"),
      canAttemptLocalXmlGeneration: true,
      validation: { valid: true, issues: [] },
      warnings: [],
    },
    complianceDocument: null,
  };
}
