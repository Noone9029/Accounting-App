import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import CustomerRefundsPage from "./page";
import type { CustomerRefund } from "@/lib/types";

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

describe("CustomerRefundsPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    canMock.mockReset();
    canMock.mockReturnValue(true);
    apiRequestMock.mockResolvedValue([refundFixture()]);
  });

  it("renders Arabic customer refund list without changing record routes", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <CustomerRefundsPage />
      </AppLocaleProvider>,
    );

    expect(await screen.findByText("CREF-001")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ردود العملاء" })).toBeInTheDocument();
    expect(screen.getByText("ردود يدوية لدفعات العملاء غير المخصصة والإشعارات الدائنة.")).toBeInTheDocument();
    expect(screen.getByText("مدفوع من")).toBeInTheDocument();
    expect(screen.getByText("دفعة عميل")).toBeInTheDocument();
    expect(screen.getByText("مرحلة")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "تسجيل رد" })).toHaveAttribute("href", "/sales/customer-refunds/new");
    expect(screen.getByRole("link", { name: "عرض" })).toHaveAttribute("href", "/sales/customer-refunds/customer-refund-1");
  });
});

function refundFixture(overrides: Partial<CustomerRefund> = {}): CustomerRefund {
  return {
    id: "customer-refund-1",
    organizationId: "org-1",
    refundNumber: "CREF-001",
    customerId: "customer-1",
    sourceType: "CUSTOMER_PAYMENT",
    sourcePaymentId: "payment-1",
    sourceCreditNoteId: null,
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
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER" },
    account: { id: "account-1", code: "111", name: "Cash on hand", type: "ASSET" },
    sourcePayment: {
      id: "payment-1",
      paymentNumber: "PAY-001",
      paymentDate: "2026-05-21T00:00:00.000Z",
      status: "POSTED",
      amountReceived: "115.0000",
      unappliedAmount: "0.0000",
      currency: "SAR",
    },
    sourceCreditNote: null,
    journalEntry: { id: "journal-1", entryNumber: "JE-001", status: "POSTED" },
    voidReversalJournalEntry: null,
    ...overrides,
  };
}
