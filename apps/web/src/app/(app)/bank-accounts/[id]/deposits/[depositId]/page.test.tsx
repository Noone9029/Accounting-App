import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import BankDepositDetailPage from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { BankAccountSummary, BankDepositBatch, BankDepositSourceCandidate, BankStatementTransaction } from "@/lib/types";

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
  useParams: () => ({ id: "bank-1", depositId: "dep-1" }),
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

describe("BankDepositDetailPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentPermissions = new Set([PERMISSIONS.bankStatements.view, PERMISSIONS.bankStatements.manage, PERMISSIONS.bankStatements.reconcile]);
  });

  it("adds lines, shows explicit post, and keeps safety wording visible", async () => {
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/bank-deposits/dep-1/lines" && options?.method === "POST") {
        return Promise.resolve(deposit({ totalAmount: "300.0000", lines: [depositLine()] }));
      }
      if (path.includes("/source-candidates")) {
        return Promise.resolve([sourceCandidate()]);
      }
      if (path === "/banking-accounting/bank-deposits/dep-1/preflight") {
        return Promise.resolve(blockedPreflight("Only posted or matched deposit batches can be journal-posted."));
      }
      return Promise.resolve(deposit());
    });

    render(<BankDepositDetailPage />);

    expect(await screen.findByText("Deposit batch detail")).toBeInTheDocument();
    expect(screen.getByText(/no live bank feed is added/i)).toBeInTheDocument();
    expect(screen.getAllByText(/no bank payment is sent/i).length).toBeGreaterThan(0);
    expect(await screen.findByText("Posting blocked")).toBeInTheDocument();
    expect(screen.queryByText(/card settlement/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/payment initiation enabled/i)).not.toBeInTheDocument();

    fireEvent.change(await screen.findByLabelText("Source type"), { target: { value: "CUSTOMER_PAYMENT" } });
    fireEvent.change(await screen.findByLabelText("Customer payment"), { target: { value: "pay-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add line" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/bank-deposits/dep-1/lines",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            sourceType: "CUSTOMER_PAYMENT",
            sourceId: "pay-1",
            amount: "300.0000",
            currency: "SAR",
          }),
        }),
      );
    });
  });

  it("matches a posted deposit batch to an explicit statement credit row", async () => {
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/bank-deposits/dep-1/match-statement-transaction" && options?.method === "POST") {
        return Promise.resolve(
          deposit({
            status: "MATCHED",
            totalAmount: "300.0000",
            lines: [depositLine()],
            statementTransactionId: "stmt-1",
            statementTransaction: statementTransaction(),
          }),
        );
      }
      if (path === "/bank-deposits/dep-1/match-candidates") {
        return Promise.resolve([statementTransaction()]);
      }
      if (path === "/banking-accounting/bank-deposits/dep-1/preflight") {
        return Promise.resolve(readyPreflight());
      }
      return Promise.resolve(
        deposit({
          status: "POSTED",
          totalAmount: "300.0000",
          lines: [depositLine()],
        }),
      );
    });

    render(<BankDepositDetailPage />);

    expect(await screen.findByText("Match statement credit row")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Match deposit batch" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/bank-deposits/dep-1/match-statement-transaction",
        expect.objectContaining({
          method: "POST",
          body: { statementTransactionId: "stmt-1" },
        }),
      );
    });
  });
});

function blockedPreflight(reason: string) {
  return {
    status: "BLOCKED" as const,
    ready: false,
    reasons: [reason],
    warnings: ["Deposit journal posting is explicit and does not allocate invoices."],
  };
}

function readyPreflight() {
  return {
    status: "READY" as const,
    ready: true,
    reasons: [],
    warnings: ["Deposit journal posting is explicit and does not allocate invoices."],
    journalPreview: {
      entryDate: "2026-06-10T00:00:00.000Z",
      description: "Bank deposit clearing journal",
      reference: "BANK-DEPOSIT-dep-1",
      currency: "SAR",
      totalDebit: "300.0000",
      totalCredit: "300.0000",
      lines: [
        { side: "DEBIT" as const, accountId: "bank-account-1", accountCode: "1010", accountName: "Main Bank", amount: "300.0000", description: "Bank deposit" },
        { side: "CREDIT" as const, accountId: "undeposited", accountCode: "1090", accountName: "Undeposited funds", amount: "300.0000", description: "Clearing" },
      ],
    },
  };
}

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
    totalAmount: "0.0000",
    postedJournalEntryId: null,
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
    postedJournalEntry: null,
    lines: [],
    ...overrides,
  };
}

function depositLine() {
  return {
    id: "line-1",
    organizationId: "org-1",
    batchId: "dep-1",
    sourceType: "CUSTOMER_PAYMENT" as const,
    sourceId: "pay-1",
    counterpartyName: "Customer A",
    reference: "PAY-1",
    amount: "300.0000",
    currency: "SAR",
    memo: null,
    createdAt: "2026-06-10T00:00:00.000Z",
  };
}

function sourceCandidate(): BankDepositSourceCandidate {
  return {
    sourceType: "CUSTOMER_PAYMENT",
    sourceId: "pay-1",
    reference: "PAY-1",
    counterpartyName: "Customer A",
    amount: "300.0000",
    currency: "SAR",
    paymentDate: "2026-06-10T00:00:00.000Z",
    depositReadiness: "OPERATIONAL_GROUPING_ONLY_CLEARING_NOT_CONFIRMED",
    account: { id: "cash-1", code: "1020", name: "Cash drawer", type: "ASSET", bankAccountProfile: null },
  };
}

function statementTransaction(): BankStatementTransaction {
  return {
    id: "stmt-1",
    organizationId: "org-1",
    importId: "import-1",
    bankAccountProfileId: "bank-1",
    transactionDate: "2026-06-10T00:00:00.000Z",
    description: "Cash deposit",
    reference: "DEP",
    type: "CREDIT",
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
