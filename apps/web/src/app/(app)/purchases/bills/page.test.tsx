import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import PurchaseBillsPage from "./page";
import { AppLocaleProvider } from "@/components/app-locale-provider";

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

describe("PurchaseBillsPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    canMock.mockReset();
    canMock.mockReturnValue(true);
    apiRequestMock.mockResolvedValue([billFixture()]);
  });

  it("renders purchase bill list links without changing routes", async () => {
    render(<PurchaseBillsPage />);

    expect(await screen.findByText("BILL-001")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Purchase bills" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create bill" })).toHaveAttribute("href", "/purchases/bills/new");
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/purchases/bills/bill-1");
  });

  it("renders purchase bill list in Arabic without changing record routes", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <PurchaseBillsPage />
      </AppLocaleProvider>,
    );

    expect(await screen.findByText("BILL-001")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "فواتير الشراء" })).toBeInTheDocument();
    expect(screen.getByText("فواتير الموردين، وحالة الدائنين، وتتبع الرصيد المستحق.")).toBeInTheDocument();
    expect(screen.getByText("الرقم")).toBeInTheDocument();
    expect(screen.getByText("تاريخ الفاتورة المستلمة")).toBeInTheDocument();
    expect(screen.getByText("منتهية/مرحلة")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "إنشاء فاتورة شراء" })).toHaveAttribute("href", "/purchases/bills/new");
    expect(screen.getByRole("link", { name: "عرض" })).toHaveAttribute("href", "/purchases/bills/bill-1");
  });
});

function billFixture() {
  return {
    id: "bill-1",
    organizationId: "org-1",
    billNumber: "BILL-001",
    supplierId: "supplier-1",
    branchId: null,
    billDate: "2026-05-21T00:00:00.000Z",
    dueDate: "2026-06-05T00:00:00.000Z",
    currency: "SAR",
    status: "FINALIZED",
    inventoryPostingMode: "DIRECT_EXPENSE_OR_ASSET",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    balanceDue: "75.0000",
    notes: null,
    terms: null,
    finalizedAt: "2026-05-21T00:00:00.000Z",
    journalEntryId: "journal-1",
    reversalJournalEntryId: null,
    supplier: {
      id: "supplier-1",
      name: "Beta Supplier",
      displayName: "Beta Supplier",
      type: "SUPPLIER",
      taxNumber: null,
    },
    branch: null,
    purchaseOrderId: null,
    purchaseOrder: null,
    journalEntry: { id: "journal-1", entryNumber: "JE-001" },
    reversalJournalEntry: null,
    lines: [],
    paymentAllocations: [],
    supplierPaymentUnappliedAllocations: [],
    debitNotes: [],
    debitNoteAllocations: [],
  };
}
