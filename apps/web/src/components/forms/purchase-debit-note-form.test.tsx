import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { PurchaseDebitNoteForm } from "./purchase-debit-note-form";
import type { PurchaseDebitNote } from "@/lib/types";

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
  useRouter: () => ({ push: pushMock, refresh: jest.fn() }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("PurchaseDebitNoteForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      switch (path) {
        case "/contacts":
          return Promise.resolve([{ id: "supplier-1", name: "Visual Supplier", displayName: "Visual Supplier", type: "SUPPLIER", isActive: true }]);
        case "/purchase-bills":
          return Promise.resolve([{ id: "bill-1", billNumber: "BILL-001", supplierId: "supplier-1", status: "FINALIZED", total: "115.0000", currency: "SAR" }]);
        case "/items":
          return Promise.resolve([{ id: "item-1", name: "Visual Item", description: "Visual item", status: "ACTIVE", purchaseCost: "100.0000", expenseAccountId: "expense-1", purchaseTaxRateId: "tax-1" }]);
        case "/accounts":
          return Promise.resolve([{ id: "expense-1", code: "5010", name: "Purchases", type: "EXPENSE", allowPosting: true, isActive: true }]);
        case "/tax-rates":
          return Promise.resolve([{ id: "tax-1", name: "VAT 15%", rate: "15.0000", scope: "BOTH", isActive: true }]);
        case "/branches":
          return Promise.resolve([]);
        default:
          return Promise.resolve({});
      }
    });
  });

  it("renders the create debit note form in Arabic", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <PurchaseDebitNoteForm />
      </AppLocaleProvider>,
    );

    expect(await screen.findByText("Visual Supplier")).toBeInTheDocument();
    expect(screen.getByText("المورد")).toBeInTheDocument();
    expect(screen.getByText("تاريخ الإصدار")).toBeInTheDocument();
    expect(screen.getByText("الفاتورة الأصلية")).toBeInTheDocument();
    expect(screen.getByText("حساب الشراء")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "إشعار مدين مستقل" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "إضافة سطر" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "إنشاء إشعار مدين مسودة" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "إلغاء" })).toHaveAttribute("href", "/purchases/debit-notes");
  });

  it("renders the non-draft edit guard in Arabic without changing the detail route", () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <PurchaseDebitNoteForm initialDebitNote={debitNoteFixture({ status: "FINALIZED" })} />
      </AppLocaleProvider>,
    );

    expect(screen.getByText("يمكن تعديل الإشعارات المدينة المسودة فقط.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "العودة إلى الإشعار المدين" })).toHaveAttribute("href", "/purchases/debit-notes/debit-note-1");
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
    supplier: { id: "supplier-1", name: "Visual Supplier", displayName: "Visual Supplier", type: "SUPPLIER", taxNumber: null },
    originalBill: { id: "bill-1", billNumber: "BILL-001", billDate: "2026-05-21T00:00:00.000Z", status: "FINALIZED", total: "115.0000", supplierId: "supplier-1" },
    branch: null,
    journalEntry: null,
    reversalJournalEntry: null,
    lines: [],
    allocations: [],
    ...overrides,
  };
}
