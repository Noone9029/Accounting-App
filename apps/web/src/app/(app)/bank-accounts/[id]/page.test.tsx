import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { apiRequest } from "@/lib/api";
import BankAccountDetailPage, { BankAccountWorkflowGuidance } from "./page";
import type { BankAccountSummary } from "@/lib/types";

let mockOrganizationId = "org-1";

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
  useParams: () => ({ id: "bank-1" }),
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganization: () => ({ id: mockOrganizationId, baseCurrency: "AED" }),
  useActiveOrganizationId: () => mockOrganizationId,
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    activeMembership: { organization: { id: "org-1", baseCurrency: "AED" } },
    can: (permission: string) => permission === "bankAccounts.openingBalance.post",
  }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("bank account workflow guidance", () => {
  it("explains bank ledger movement and links to next actions", () => {
    render(
      <BankAccountWorkflowGuidance
        profile={bankAccountFixture()}
        canImportStatements
        canCreateTransfers
        canViewStatements
        canViewReconciliations
      />,
    );

    expect(screen.getByText("How to read this bank account")).toBeInTheDocument();
    expect(screen.getByText("Debits")).toBeInTheDocument();
    expect(screen.getByText(/increase the bank asset balance/)).toBeInTheDocument();
    expect(screen.getByText("Credits")).toBeInTheDocument();
    expect(screen.getByText(/reduce the bank asset balance/)).toBeInTheDocument();
    expect(screen.getByText(/not connected to live bank feeds or external banking APIs/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Import statement" })).toHaveAttribute("href", "/bank-accounts/bank-1/statement-imports");
    expect(screen.getByRole("link", { name: "Create transfer" })).toHaveAttribute("href", "/bank-transfers/new");
    expect(screen.getByRole("link", { name: "Review unmatched rows" })).toHaveAttribute(
      "href",
      "/bank-accounts/bank-1/statement-transactions?status=UNMATCHED",
    );
    expect(screen.getByRole("link", { name: "View bank ledger" })).toHaveAttribute("href", "/reports/general-ledger?accountId=account-1");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("hides transfer creation when permission is missing", () => {
    render(
      <BankAccountWorkflowGuidance
        profile={bankAccountFixture()}
        canImportStatements
        canCreateTransfers={false}
        canViewStatements
        canViewReconciliations
      />,
    );

    expect(screen.queryByRole("link", { name: "Create transfer" })).not.toBeInTheDocument();
  });

  it("renders Arabic workflow guidance while preserving bank action links", () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <BankAccountWorkflowGuidance
          profile={bankAccountFixture()}
          canImportStatements
          canCreateTransfers
          canViewStatements
          canViewReconciliations
        />
      </AppLocaleProvider>,
    );

    expect(screen.getByText("كيفية قراءة هذا الحساب البنكي")).toBeInTheDocument();
    expect(screen.getByText("المدين")).toBeInTheDocument();
    expect(screen.getByText(/يزيد رصيد أصل البنك/)).toBeInTheDocument();
    expect(screen.getByText(/ليست متصلة بتغذيات بنكية مباشرة أو واجهات API بنكية خارجية/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "استيراد كشف" })).toHaveAttribute("href", "/bank-accounts/bank-1/statement-imports");
    expect(screen.getByRole("link", { name: "إنشاء تحويل" })).toHaveAttribute("href", "/bank-transfers/new");
    expect(screen.getByRole("link", { name: "مراجعة الصفوف غير المطابقة" })).toHaveAttribute(
      "href",
      "/bank-accounts/bank-1/statement-transactions?status=UNMATCHED",
    );
    expect(screen.getByRole("link", { name: "عرض دفتر البنك" })).toHaveAttribute("href", "/reports/general-ledger?accountId=account-1");
    expect(screen.getByRole("link", { name: "لوحة التحكم" })).toHaveAttribute("href", "/dashboard");
  });
});

describe("bank account opening balance currency guard", () => {
  beforeEach(() => {
    mockOrganizationId = "org-1";
    mockApiRequest.mockReset();
  });

  it("blocks posting a foreign-currency opening balance from an AED-base organization", async () => {
    mockApiRequest.mockResolvedValue(
      bankAccountFixture({
        currency: "USD",
        openingBalanceJournalEntryId: null,
        openingBalancePostedAt: null,
        openingBalanceJournalEntry: null,
        transactionCount: 0,
      }),
    );

    render(<BankAccountDetailPage />);

    const postButton = await screen.findByRole("button", { name: "Post opening balance" });
    expect(postButton).toBeDisabled();
    expect(screen.getByText(/bank profile uses USD; the organization base currency is AED/i)).toBeInTheDocument();

    fireEvent.click(postButton);
    await waitFor(() => expect(mockApiRequest).toHaveBeenCalledTimes(1));
    expect(mockApiRequest).not.toHaveBeenCalledWith("/bank-accounts/bank-1/post-opening-balance", expect.anything());
  });

  it("blocks a stale same-base profile immediately after the active organization changes", async () => {
    mockApiRequest
      .mockResolvedValueOnce(
        bankAccountFixture({
          currency: "AED",
          openingBalanceJournalEntryId: null,
          openingBalancePostedAt: null,
          openingBalanceJournalEntry: null,
          transactionCount: 0,
        }),
      )
      .mockImplementation(() => new Promise(() => undefined));

    const { rerender } = render(<BankAccountDetailPage />);
    expect(await screen.findByRole("button", { name: "Post opening balance" })).toBeEnabled();

    mockOrganizationId = "org-2";
    rerender(<BankAccountDetailPage />);

    await waitFor(() => expect(mockApiRequest).toHaveBeenCalledTimes(2));
    const postButton = screen.queryByRole("button", { name: "Post opening balance" });
    if (postButton) {
      expect(postButton).toBeDisabled();
      fireEvent.click(postButton);
    }
    expect(mockApiRequest).not.toHaveBeenCalledWith("/bank-accounts/bank-1/post-opening-balance", expect.anything());
  });
});

export function bankAccountFixture(overrides: Partial<BankAccountSummary> = {}): BankAccountSummary {
  return {
    id: "bank-1",
    organizationId: "org-1",
    accountId: "account-1",
    type: "BANK",
    status: "ACTIVE",
    displayName: "Main Bank",
    bankName: "Beta Bank",
    accountNumberMasked: "**** 1234",
    ibanMasked: "SA**1234",
    currency: "SAR",
    openingBalance: "1000.0000",
    openingBalanceDate: "2026-05-01T00:00:00.000Z",
    openingBalanceJournalEntryId: "journal-opening",
    openingBalancePostedAt: "2026-05-01T00:00:00.000Z",
    notes: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    account: {
      id: "account-1",
      code: "1010",
      name: "Main Bank",
      type: "ASSET",
      allowPosting: true,
      isActive: true,
    },
    openingBalanceJournalEntry: { id: "journal-opening", entryNumber: "JE-OPEN", status: "POSTED" },
    ledgerBalance: "1250.0000",
    latestTransactionDate: "2026-05-21T00:00:00.000Z",
    transactionCount: 4,
    ...overrides,
  };
}
