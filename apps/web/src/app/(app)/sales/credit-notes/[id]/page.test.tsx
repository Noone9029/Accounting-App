import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
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
  useRouter: () => ({ push: jest.fn() }),
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
