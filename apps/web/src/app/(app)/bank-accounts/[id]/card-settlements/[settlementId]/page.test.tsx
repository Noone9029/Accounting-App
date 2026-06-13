import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import CardSettlementDetailPage from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { BankAccountSummary, BankStatementTransaction, CardSettlement } from "@/lib/types";

const apiRequestMock = jest.fn();
let currentPermissions = new Set<Permission>();

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "card-1", settlementId: "set-1" }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: Permission) => currentPermissions.has(permission),
  }),
}));

describe("CardSettlementDetailPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentPermissions = new Set([PERMISSIONS.bankStatements.view, PERMISSIONS.bankStatements.reconcile]);
  });

  it("posts an operational card settlement and shows safety wording", async () => {
    apiRequestMock
      .mockResolvedValueOnce(settlement())
      .mockResolvedValueOnce(settlement({ status: "POSTED", postedAt: "2026-06-10T10:00:00.000Z" }))
      .mockResolvedValueOnce(settlement({ status: "POSTED", postedAt: "2026-06-10T10:00:00.000Z" }))
      .mockResolvedValueOnce([]);

    render(<CardSettlementDetailPage />);

    expect(await screen.findByText("Card settlement detail")).toBeInTheDocument();
    expect(screen.getByText(/no live bank feed is added/i)).toBeInTheDocument();
    expect(screen.getByText(/no bank payment is sent/i)).toBeInTheDocument();
    expect(screen.getByText(/journal-backed card liability or prepaid asset posting is deferred/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Post settlement" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith("/card-settlements/set-1/post", { method: "POST" });
    });
  });

  it("matches a posted card settlement by explicit click", async () => {
    apiRequestMock
      .mockResolvedValueOnce(settlement({ status: "POSTED" }))
      .mockResolvedValueOnce([statementTransaction()])
      .mockResolvedValueOnce(settlement({ status: "MATCHED", statementTransactionId: "stmt-1", statementTransaction: statementTransaction() }))
      .mockResolvedValueOnce(settlement({ status: "MATCHED", statementTransactionId: "stmt-1", statementTransaction: statementTransaction() }));

    render(<CardSettlementDetailPage />);

    expect(await screen.findByText("Match statement row")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Match card settlement" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/card-settlements/set-1/match-statement-transaction",
        expect.objectContaining({
          method: "POST",
          body: { statementTransactionId: "stmt-1" },
        }),
      );
    });
  });
});

function fundingProfile(): BankAccountSummary {
  return bankProfile({ id: "bank-1", accountId: "bank-account-1", displayName: "Main Bank", type: "BANK" });
}

function cardProfile(): BankAccountSummary {
  return bankProfile({ id: "card-1", accountId: "card-account-1", displayName: "Corporate Card", type: "CARD" });
}

function bankProfile(overrides: Partial<BankAccountSummary>): BankAccountSummary {
  return {
    id: "bank-1",
    organizationId: "org-1",
    accountId: "bank-account-1",
    type: "BANK",
    status: "ACTIVE",
    displayName: "Main Bank",
    bankName: "Beta Bank",
    accountNumberMasked: "**** 1234",
    ibanMasked: "SA**1234",
    currency: "SAR",
    openingBalance: "1000.0000",
    openingBalanceDate: null,
    openingBalanceJournalEntryId: null,
    openingBalancePostedAt: null,
    notes: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    account: { id: overrides.accountId ?? "bank-account-1", code: "1010", name: "Main Bank", type: "ASSET", allowPosting: true, isActive: true },
    openingBalanceJournalEntry: null,
    ledgerBalance: "1000.0000",
    latestTransactionDate: null,
    transactionCount: 0,
    ...overrides,
  };
}

function settlement(overrides: Partial<CardSettlement> = {}): CardSettlement {
  return {
    id: "set-1",
    organizationId: "org-1",
    settlementType: "CREDIT_CARD_PAYDOWN",
    fundingBankAccountProfileId: "bank-1",
    cardAccountProfileId: "card-1",
    settlementDate: "2026-06-10T00:00:00.000Z",
    currency: "SAR",
    amount: "300.0000",
    status: "DRAFT",
    memo: "June card paydown",
    reference: "CARD-PAY",
    statementTransactionId: null,
    createdById: "user-1",
    updatedById: "user-1",
    postedAt: null,
    matchedAt: null,
    voidedAt: null,
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
    fundingBankAccountProfile: fundingProfile(),
    cardAccountProfile: cardProfile(),
    statementTransaction: null,
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

function statementTransaction(): BankStatementTransaction {
  return {
    id: "stmt-1",
    organizationId: "org-1",
    importId: "import-1",
    bankAccountProfileId: "bank-1",
    transactionDate: "2026-06-10T00:00:00.000Z",
    description: "Card payment",
    reference: "CARD-PAY",
    type: "DEBIT",
    amount: "300.0000",
    status: "UNMATCHED",
    matchedJournalLineId: null,
    matchedJournalEntryId: null,
    matchType: null,
    categorizedAccountId: null,
    createdJournalEntryId: null,
    ignoredReason: null,
    rawData: { normalized: { currency: "SAR" } },
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
  };
}
