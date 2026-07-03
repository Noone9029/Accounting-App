import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import SalesInvoicesPage from "./page";
import type { SalesInvoice } from "@/lib/types";

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

describe("SalesInvoicesPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    canMock.mockReset();
    canMock.mockReturnValue(true);
    apiRequestMock.mockResolvedValue([invoiceFixture()]);
  });

  it("renders Arabic sales invoice list without changing routes", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <SalesInvoicesPage />
      </AppLocaleProvider>,
    );

    expect(await screen.findByText("INV-001")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "فواتير المبيعات" })).toBeInTheDocument();
    expect(screen.getByText("فواتير العملاء المسودة والنهائية من واجهة API الحية. راجع العميل والضريبة والرصيد وحالة الترحيل قبل اتخاذ إجراء.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "إنشاء فاتورة" })).toHaveAttribute("href", "/sales/invoices/new");
    expect(screen.getByText("عوامل تصفية الفواتير")).toBeInTheDocument();
    expect(screen.getByText("الرصيد المستحق")).toBeInTheDocument();
    expect(screen.getByText("منتهية/مرحلة")).toBeInTheDocument();
    expect(screen.getByText("مرحل")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "عرض" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
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
    dueDate: "2026-06-20T00:00:00.000Z",
    currency: "SAR",
    status: "FINALIZED",
    taxMode: "TAX_EXCLUSIVE",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    balanceDue: "115.0000",
    notes: null,
    terms: null,
    finalizedAt: "2026-05-21T10:00:00.000Z",
    journalEntryId: "journal-1",
    reversalJournalEntryId: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null },
    branch: null,
    journalEntry: { id: "journal-1", entryNumber: "JE-001", status: "POSTED", totalDebit: "115.0000", totalCredit: "115.0000" },
    reversalJournalEntry: null,
    lines: [],
    paymentAllocations: [],
    paymentUnappliedAllocations: [],
    creditNotes: [],
    creditNoteAllocations: [],
    ...overrides,
  };
}
