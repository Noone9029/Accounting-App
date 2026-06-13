import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import BankDepositsPage, { BankDepositGuidance } from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { BankAccountSummary, BankDepositBatch } from "@/lib/types";

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
  useParams: () => ({ id: "bank-1" }),
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

describe("BankDepositsPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentPermissions = new Set([PERMISSIONS.bankStatements.view, PERMISSIONS.bankStatements.manage]);
  });

  it("renders deposits list, manual-only wording, and create draft form", async () => {
    apiRequestMock.mockResolvedValueOnce(bankProfile()).mockResolvedValueOnce([deposit()]);

    render(<BankDepositsPage />);

    expect(await screen.findByText("Bank deposit batches")).toBeInTheDocument();
    expect(screen.getByText(/manual treasury grouping/i)).toBeInTheDocument();
    expect(screen.getByText(/no live bank feed/i)).toBeInTheDocument();
    expect(screen.getByText(/no bank payment is sent/i)).toBeInTheDocument();
    expect(await screen.findByText("Cash drawer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create draft" })).toBeInTheDocument();
  });

  it("creates a draft deposit batch explicitly", async () => {
    apiRequestMock.mockResolvedValueOnce(bankProfile()).mockResolvedValueOnce([]).mockResolvedValueOnce(deposit());

    render(<BankDepositsPage />);

    expect(await screen.findByText("Create draft deposit")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Memo"), { target: { value: "Friday receipts" } });
    fireEvent.click(screen.getByRole("button", { name: "Create draft" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/bank-deposits",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            bankAccountProfileId: "bank-1",
            currency: "SAR",
            memo: "Friday receipts",
          }),
        }),
      );
    });
  });
});

describe("BankDepositGuidance", () => {
  it("keeps banking boundaries explicit", () => {
    render(<BankDepositGuidance />);

    expect(screen.getByText(/manual banking only/i)).toBeInTheDocument();
    expect(screen.getByText(/no bank api call/i)).toBeInTheDocument();
    expect(screen.getByText(/no payment initiation is enabled/i)).toBeInTheDocument();
    expect(screen.getByText(/does not duplicate revenue/i)).toBeInTheDocument();
  });
});

function bankProfile(): BankAccountSummary {
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
    account: { id: "bank-account-1", code: "1010", name: "Main Bank", type: "ASSET", allowPosting: true, isActive: true },
    openingBalanceJournalEntry: null,
    ledgerBalance: "1000.0000",
    latestTransactionDate: null,
    transactionCount: 0,
  };
}

function deposit(overrides: Partial<BankDepositBatch> = {}): BankDepositBatch {
  return {
    id: "dep-1",
    organizationId: "org-1",
    bankAccountProfileId: "bank-1",
    depositDate: "2026-06-10T00:00:00.000Z",
    currency: "SAR",
    status: "DRAFT",
    memo: "Cash drawer",
    totalAmount: "300.0000",
    statementTransactionId: null,
    createdById: "user-1",
    updatedById: "user-1",
    postedAt: null,
    matchedAt: null,
    voidedAt: null,
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
    bankAccountProfile: bankProfile(),
    statementTransaction: null,
    createdBy: null,
    updatedBy: null,
    lines: [],
    ...overrides,
  };
}
