import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import CardSettlementsPage, { CardSettlementGuidance } from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { BankAccountSummary, CardSettlement } from "@/lib/types";

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
  useParams: () => ({ id: "card-1" }),
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

describe("CardSettlementsPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentPermissions = new Set([PERMISSIONS.bankStatements.view, PERMISSIONS.bankStatements.manage]);
  });

  it("renders settlements list, create form, and manual-only wording", async () => {
    apiRequestMock.mockResolvedValueOnce(cardProfile()).mockResolvedValueOnce([fundingProfile(), cardProfile()]).mockResolvedValueOnce([settlement()]);

    render(<CardSettlementsPage />);

    expect(await screen.findByText("Card settlements")).toBeInTheDocument();
    expect(screen.getByText(/manual card settlement workflow/i)).toBeInTheDocument();
    expect(screen.getByText(/no live bank feed/i)).toBeInTheDocument();
    expect(screen.getByText(/no bank payment is sent/i)).toBeInTheDocument();
    expect(screen.queryByText(/cheque lifecycle/i)).not.toBeInTheDocument();
    expect(await screen.findByText("Credit card paydown")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create draft" })).toBeInTheDocument();
  });

  it("creates a draft card settlement explicitly", async () => {
    apiRequestMock.mockResolvedValueOnce(cardProfile()).mockResolvedValueOnce([fundingProfile(), cardProfile()]).mockResolvedValueOnce([]).mockResolvedValueOnce(settlement());

    render(<CardSettlementsPage />);

    expect(await screen.findByText("Create draft settlement")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Funding bank account"), { target: { value: "bank-1" } });
    fireEvent.change(screen.getByLabelText("Card/prepaid account"), { target: { value: "card-1" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "300.0000" } });
    fireEvent.click(screen.getByRole("button", { name: "Create draft" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/card-settlements",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            settlementType: "CREDIT_CARD_PAYDOWN",
            fundingBankAccountProfileId: "bank-1",
            cardAccountProfileId: "card-1",
            amount: "300.0000",
            currency: "SAR",
          }),
        }),
      );
    });
  });
});

describe("CardSettlementGuidance", () => {
  it("keeps safety boundaries explicit", () => {
    render(<CardSettlementGuidance />);

    expect(screen.getByText(/manual banking only/i)).toBeInTheDocument();
    expect(screen.getByText(/no bank api call/i)).toBeInTheDocument();
    expect(screen.getByText(/no card credentials are collected/i)).toBeInTheDocument();
    expect(screen.getByText(/journal-backed card settlement posting is deferred/i)).toBeInTheDocument();
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
