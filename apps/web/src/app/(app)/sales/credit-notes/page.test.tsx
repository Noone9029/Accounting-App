import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import CreditNotesPage from "./page";
import type { CreditNote } from "@/lib/types";

const apiRequestMock = jest.fn();
const canMock = jest.fn((_: string) => true);

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
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: string) => canMock(permission),
  }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("CreditNotesPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    canMock.mockReset();
    canMock.mockReturnValue(true);
    apiRequestMock.mockResolvedValue([creditNoteFixture()]);
  });

  it("renders Arabic credit note list without changing routes", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <CreditNotesPage />
      </AppLocaleProvider>,
    );

    expect(await screen.findByText("CN-001")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "إشعارات دائنة للمبيعات" })).toBeInTheDocument();
    expect(screen.getByText("إشعارات العملاء الدائنة، وترحيل عكس الإيراد، وتنزيلات PDF.")).toBeInTheDocument();
    expect(screen.getByText("الفاتورة الأصلية")).toBeInTheDocument();
    expect(screen.getByText("غير مخصص")).toBeInTheDocument();
    expect(screen.getAllByText("نهائية").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "إنشاء إشعار دائن" })).toHaveAttribute("href", "/sales/credit-notes/new");
    expect(screen.getByRole("link", { name: "عرض" })).toHaveAttribute("href", "/sales/credit-notes/credit-note-1");
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
    status: "FINALIZED",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    unappliedAmount: "115.0000",
    notes: null,
    reason: "Adjustment",
    finalizedAt: "2026-05-21T00:00:00.000Z",
    journalEntryId: "journal-1",
    reversalJournalEntryId: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER" },
    originalInvoice: { id: "invoice-1", invoiceNumber: "INV-001", issueDate: "2026-05-20T00:00:00.000Z", status: "FINALIZED", total: "115.0000", customerId: "customer-1" },
    branch: null,
    journalEntry: { id: "journal-1", entryNumber: "JE-001", status: "POSTED" },
    reversalJournalEntry: null,
    lines: [],
    allocations: [],
    ...overrides,
  };
}
