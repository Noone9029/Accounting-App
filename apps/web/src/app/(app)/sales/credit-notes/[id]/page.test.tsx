import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import CreditNoteDetailPage from "./page";
import type { CreditNote } from "@/lib/types";

const apiRequestMock = jest.fn();
let mockAllowedPermissions = new Set<string>();

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
  useParams: () => ({ id: "credit-1" }),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
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

describe("CreditNoteDetailPage UAE readiness", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    mockAllowedPermissions = new Set(["creditNotes.view", "compliance.view", "compliance.manage", "compliance.validate"]);
  });

  it("renders UAE Peppol/PINT-AE readiness panel for finalized credit notes", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/credit-notes/credit-1") {
        return Promise.resolve(creditNoteFixture());
      }
      if (path === "/compliance/credit-notes/credit-1/readiness") {
        return Promise.resolve(uaeReadinessFixture());
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<CreditNoteDetailPage />);

    expect(await screen.findByText("UAE credit-note eInvoicing/PINT-AE readiness")).toBeInTheDocument();
    expect(screen.getByText("Original invoice/reference readiness")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validate UAE eInvoice readiness" })).toBeEnabled();
    expect(screen.getByText(/No network, no ASP submission, no FTA reporting/i)).toBeInTheDocument();
    expect(screen.queryByText(/FTA certified|Peppol certified|official provider|accredited ASP/i)).not.toBeInTheDocument();
  });

  it("renders Arabic credit note detail copy without changing record routes", async () => {
    mockAllowedPermissions = new Set(["creditNotes.create", "creditNotes.finalize", "creditNotes.void", "compliance.view"]);
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/credit-notes/credit-1") {
        return Promise.resolve(creditNoteFixture({ unappliedAmount: "25.0000", lines: [creditNoteLineFixture()], allocations: [creditNoteAllocationFixture()] }));
      }
      if (path === "/compliance/credit-notes/credit-1/readiness") {
        return Promise.resolve(uaeReadinessFixture());
      }
      if (path === "/sales-invoices/open?customerId=customer-1") {
        return Promise.resolve([{ id: "invoice-2", invoiceNumber: "INV-002", customerId: "customer-1", issueDate: "2026-06-02T00:00:00.000Z", dueDate: "2026-06-30T00:00:00.000Z", currency: "AED", total: "210.0000", balanceDue: "100.0000", status: "FINALIZED" }]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(
      <AppLocaleProvider initialLocale="ar">
        <CreditNoteDetailPage />
      </AppLocaleProvider>,
    );

    expect(await screen.findByRole("heading", { name: "CN-001" })).toBeInTheDocument();
    expect(screen.getByText("تفاصيل الإشعار الدائن، وترحيل العكس، وتنزيل PDF.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "مساحة العميل" })).toHaveAttribute("href", "/customers/customer-1");
    expect(screen.getByRole("link", { name: "رد الرصيد الدائن" })).toHaveAttribute("href", "/sales/customer-refunds/new?customerId=customer-1&sourceType=CREDIT_NOTE&sourceCreditNoteId=credit-1");
    expect(screen.getByRole("button", { name: "تنزيل PDF الإشعار الدائن" })).toBeInTheDocument();
    expect(screen.getByText("تخصيصات الرصيد الدائن")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "عرض الفاتورة" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
    expect(screen.getByText("تطبيق الرصيد الدائن")).toBeInTheDocument();
    expect(await screen.findByText(/الرصيد الدائن المتاح/)).toBeInTheDocument();
    expect(screen.getByText("XML الإشعار الدائن لزاتكا والتوقيع وتضمين PDF/A-3 والتخليص/الإبلاغ غير منفذة عمدا في هذا الإصدار الأولي.")).toBeInTheDocument();
    expect(screen.queryByText(/production submission is connected/i)).not.toBeInTheDocument();
  });
});

function creditNoteFixture(overrides: Partial<CreditNote> = {}): CreditNote {
  return {
    id: "credit-1",
    organizationId: "org-1",
    creditNoteNumber: "CN-001",
    customerId: "customer-1",
    originalInvoiceId: "invoice-1",
    branchId: null,
    issueDate: "2026-06-05T00:00:00.000Z",
    currency: "AED",
    status: "FINALIZED",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "5.0000",
    total: "105.0000",
    unappliedAmount: "0.0000",
    reason: "Returned service",
    notes: null,
    finalizedAt: "2026-06-05T10:00:00.000Z",
    journalEntryId: "journal-1",
    reversalJournalEntryId: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null },
    originalInvoice: { id: "invoice-1", invoiceNumber: "INV-001", issueDate: "2026-06-01T00:00:00.000Z", status: "FINALIZED", total: "115.0000", customerId: "customer-1" },
    branch: null,
    journalEntry: { id: "journal-1", entryNumber: "JE-001", status: "POSTED", totalDebit: "105.0000", totalCredit: "105.0000" },
    reversalJournalEntry: null,
    lines: [],
    allocations: [],
    ...overrides,
  };
}

function creditNoteLineFixture() {
  return {
    id: "line-1",
    organizationId: "org-1",
    creditNoteId: "credit-1",
    itemId: "item-1",
    description: "Returned service",
    accountId: "revenue-1",
    quantity: "1.0000",
    unitPrice: "100.0000",
    discountRate: "0.0000",
    taxRateId: "tax-1",
    lineGrossAmount: "100.0000",
    discountAmount: "0.0000",
    taxableAmount: "100.0000",
    taxAmount: "5.0000",
    lineTotal: "105.0000",
    sortOrder: 0,
    item: null,
    account: { id: "revenue-1", code: "4010", name: "Sales", type: "REVENUE" as const, allowPosting: true, isActive: true },
  };
}

function creditNoteAllocationFixture() {
  return {
    id: "allocation-1",
    organizationId: "org-1",
    creditNoteId: "credit-1",
    invoiceId: "invoice-1",
    amountApplied: "80.0000",
    reversedAt: null,
    reversedById: null,
    reversalReason: null,
    createdAt: "2026-06-05T10:00:00.000Z",
    updatedAt: "2026-06-05T10:00:00.000Z",
    invoice: { id: "invoice-1", invoiceNumber: "INV-001", issueDate: "2026-06-01T00:00:00.000Z", dueDate: "2026-06-30T00:00:00.000Z", status: "FINALIZED" as const, total: "115.0000", balanceDue: "35.0000", customerId: "customer-1" },
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
    sourceType: "CREDIT_NOTE",
    sourceId: "credit-1",
    sourceStatus: "FINALIZED",
    localOnly: true,
    noNetwork: true,
    noAspSubmission: true,
    noFtaReporting: true,
    productionCompliance: false,
    canAttemptLocalXmlGeneration: true,
    readiness: {
      kind: "credit-note",
      status: "READY_FOR_VALIDATION",
      seller: section("Seller"),
      buyer: section("Buyer"),
      invoiceFields: section("Required invoice fields"),
      taxIdentity: section("Tax identity"),
      peppolParticipant: section("Peppol participant readiness"),
      originalReference: section("Original invoice/reference readiness"),
      canAttemptLocalXmlGeneration: true,
      validation: { valid: true, issues: [] },
      warnings: [],
    },
    complianceDocument: null,
  };
}
