import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import PurchaseDebitNotesPage from "./page";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import type { PurchaseDebitNote } from "@/lib/types";

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

describe("PurchaseDebitNotesPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    canMock.mockReset();
    canMock.mockReturnValue(true);
    apiRequestMock.mockResolvedValue([debitNoteFixture()]);
  });

  it("renders purchase debit note list links without changing routes", async () => {
    render(<PurchaseDebitNotesPage />);

    expect(await screen.findByText("PDN-001")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Debit notes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create debit note" })).toHaveAttribute("href", "/purchases/debit-notes/new");
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/purchases/debit-notes/debit-note-1");
  });

  it("renders purchase debit note list in Arabic without changing record routes", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <PurchaseDebitNotesPage />
      </AppLocaleProvider>,
    );

    expect(await screen.findByText("PDN-001")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "إشعارات مدينة" })).toBeInTheDocument();
    expect(screen.getByText("ائتمانات الموردين، ومرتجعات الشراء، وتتبع تعديلات الدائنين.")).toBeInTheDocument();
    expect(screen.getByText("الرقم")).toBeInTheDocument();
    expect(screen.getByText("تاريخ الإصدار")).toBeInTheDocument();
    expect(screen.getByText("الفاتورة الأصلية")).toBeInTheDocument();
    expect(screen.getByText("نهائية")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "إنشاء إشعار مدين" })).toHaveAttribute("href", "/purchases/debit-notes/new");
    expect(screen.getByRole("link", { name: "عرض" })).toHaveAttribute("href", "/purchases/debit-notes/debit-note-1");
  });
});

function debitNoteFixture(overrides: Partial<PurchaseDebitNote> = {}): PurchaseDebitNote {
  return {
    id: "debit-note-1",
    organizationId: "org-1",
    debitNoteNumber: "PDN-001",
    supplierId: "supplier-1",
    originalBillId: "bill-1",
    branchId: null,
    issueDate: "2026-05-21T00:00:00.000Z",
    currency: "SAR",
    status: "FINALIZED",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    unappliedAmount: "0.0000",
    notes: null,
    reason: "Supplier adjustment",
    finalizedAt: "2026-05-21T00:00:00.000Z",
    journalEntryId: "journal-1",
    reversalJournalEntryId: null,
    supplier: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER", taxNumber: null },
    originalBill: { id: "bill-1", billNumber: "BILL-001", billDate: "2026-05-21T00:00:00.000Z", status: "FINALIZED", total: "115.0000", supplierId: "supplier-1" },
    branch: null,
    journalEntry: { id: "journal-1", entryNumber: "JE-001", status: "POSTED" },
    reversalJournalEntry: null,
    lines: [],
    allocations: [],
    ...overrides,
  };
}
