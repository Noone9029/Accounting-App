import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import EditCreditNotePage from "./page";
import type { CreditNote } from "@/lib/types";

const apiRequestMock = jest.fn();

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
  useParams: () => ({ id: "credit-note-1" }),
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/components/forms/credit-note-form", () => ({
  CreditNoteForm: ({ initialCreditNote }: { initialCreditNote: CreditNote }) => <div data-testid="credit-note-form">{initialCreditNote.creditNoteNumber}</div>,
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("EditCreditNotePage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue(creditNoteFixture());
  });

  it("renders Arabic edit copy and preserves the credit note detail route", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <EditCreditNotePage />
      </AppLocaleProvider>,
    );

    expect(screen.getByRole("heading", { name: "تعديل الإشعار الدائن" })).toBeInTheDocument();
    expect(screen.getByText("يمكن تعديل الإشعارات الدائنة المسودة قبل إنهائها.")).toBeInTheDocument();
    expect(await screen.findByTestId("credit-note-form")).toHaveTextContent("CN-001");
    expect(screen.getByRole("link", { name: "رجوع" })).toHaveAttribute("href", "/sales/credit-notes/credit-note-1");
  });
});

function creditNoteFixture(overrides: Partial<CreditNote> = {}): CreditNote {
  return {
    id: "credit-note-1",
    organizationId: "org-1",
    creditNoteNumber: "CN-001",
    customerId: "customer-1",
    originalInvoiceId: "invoice-1",
    branchId: null,
    issueDate: "2026-05-21T00:00:00.000Z",
    currency: "SAR",
    status: "DRAFT",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    unappliedAmount: "115.0000",
    notes: null,
    reason: null,
    finalizedAt: null,
    journalEntryId: null,
    reversalJournalEntryId: null,
    customer: { id: "customer-1", name: "Visual Customer", displayName: "Visual Customer", type: "CUSTOMER", taxNumber: null },
    originalInvoice: { id: "invoice-1", invoiceNumber: "INV-001", issueDate: "2026-05-21T00:00:00.000Z", status: "FINALIZED", total: "115.0000", customerId: "customer-1" },
    branch: null,
    journalEntry: null,
    reversalJournalEntry: null,
    lines: [],
    allocations: [],
    ...overrides,
  };
}
