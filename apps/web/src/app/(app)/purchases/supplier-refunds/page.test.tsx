import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import SupplierRefundsPage from "./page";
import type { SupplierRefund } from "@/lib/types";

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

describe("SupplierRefundsPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    canMock.mockReset();
    canMock.mockReturnValue(true);
    apiRequestMock.mockResolvedValue([refundFixture()]);
  });

  it("renders supplier refund list links without changing routes", async () => {
    render(<SupplierRefundsPage />);

    expect(await screen.findByText("SREF-001")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Supplier refunds" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Record refund" })).toHaveAttribute("href", "/purchases/supplier-refunds/new");
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/purchases/supplier-refunds/supplier-refund-1");
  });

  it("renders supplier refund list in Arabic without changing record routes", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <SupplierRefundsPage />
      </AppLocaleProvider>,
    );

    expect(await screen.findByText("SREF-001")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ردود الموردين" })).toBeInTheDocument();
    expect(screen.getByText("ردود يدوية مستلمة من الموردين مقابل دفعات موردين غير مخصصة وإشعارات مدينة للشراء.")).toBeInTheDocument();
    expect(screen.getByText("مستلم في")).toBeInTheDocument();
    expect(screen.getByText("إشعار مدين للشراء")).toBeInTheDocument();
    expect(screen.getByText("مرحلة")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "تسجيل رد" })).toHaveAttribute("href", "/purchases/supplier-refunds/new");
    expect(screen.getByRole("link", { name: "عرض" })).toHaveAttribute("href", "/purchases/supplier-refunds/supplier-refund-1");
  });
});

function refundFixture(overrides: Partial<SupplierRefund> = {}): SupplierRefund {
  return {
    id: "supplier-refund-1",
    organizationId: "org-1",
    refundNumber: "SREF-001",
    supplierId: "supplier-1",
    sourceType: "PURCHASE_DEBIT_NOTE",
    sourcePaymentId: null,
    sourceDebitNoteId: "debit-note-1",
    refundDate: "2026-05-21T00:00:00.000Z",
    currency: "SAR",
    status: "POSTED",
    amountRefunded: "115.0000",
    accountId: "account-1",
    description: null,
    journalEntryId: "journal-1",
    voidReversalJournalEntryId: null,
    postedAt: "2026-05-21T00:00:00.000Z",
    voidedAt: null,
    supplier: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER" },
    account: { id: "account-1", code: "111", name: "Cash on hand", type: "ASSET" },
    sourcePayment: null,
    sourceDebitNote: {
      id: "debit-note-1",
      debitNoteNumber: "PDN-001",
      issueDate: "2026-05-21T00:00:00.000Z",
      status: "FINALIZED",
      total: "115.0000",
      unappliedAmount: "0.0000",
      currency: "SAR",
    },
    journalEntry: { id: "journal-1", entryNumber: "JE-001", status: "POSTED" },
    voidReversalJournalEntry: null,
    ...overrides,
  };
}
