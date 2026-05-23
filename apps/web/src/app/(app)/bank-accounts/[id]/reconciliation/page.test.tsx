import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { ReconciliationSummaryGuidance } from "./page";
import type { BankReconciliationSummary } from "@/lib/types";

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

describe("reconciliation summary guidance", () => {
  it("explains zero-difference and unmatched row requirements", () => {
    render(
      <ReconciliationSummaryGuidance
        summary={summaryFixture()}
        profileId="bank-1"
        canImportStatements
        canCreateReconciliation
        canViewBankAccount
      />,
    );

    expect(screen.getByText("How reconciliation works")).toBeInTheDocument();
    expect(screen.getByText(/difference is zero and no statement rows are unmatched/)).toBeInTheDocument();
    expect(screen.getByText(/lock statement rows in that period/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review unmatched rows" })).toHaveAttribute(
      "href",
      "/bank-accounts/bank-1/statement-transactions?status=UNMATCHED",
    );
    expect(screen.getByRole("link", { name: "Create close draft" })).toHaveAttribute("href", "/bank-accounts/bank-1/reconciliations/new");
  });

  it("hides import and draft links when action permissions are missing", () => {
    render(
      <ReconciliationSummaryGuidance
        summary={summaryFixture()}
        profileId="bank-1"
        canImportStatements={false}
        canCreateReconciliation={false}
        canViewBankAccount={false}
      />,
    );

    expect(screen.queryByRole("link", { name: "Import statement" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create close draft" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Bank account" })).not.toBeInTheDocument();
  });
});

function summaryFixture(overrides: Partial<BankReconciliationSummary> = {}): BankReconciliationSummary {
  return {
    profile: bankAccountFixture(),
    from: "2026-05-01",
    to: "2026-05-31",
    imports: [],
    totals: {
      credits: { count: 1, total: "250.0000" },
      debits: { count: 0, total: "0.0000" },
      unmatched: { count: 0, total: "0.0000" },
      matched: { count: 1, total: "250.0000" },
      categorized: { count: 0, total: "0.0000" },
      ignored: { count: 0, total: "0.0000" },
    },
    ledgerBalance: "1250.0000",
    statementClosingBalance: "1250.0000",
    difference: "0.0000",
    statusSuggestion: "RECONCILED",
    latestClosedReconciliation: null,
    hasOpenDraftReconciliation: false,
    unreconciledTransactionCount: 0,
    closedThroughDate: null,
    ...overrides,
  };
}

function bankAccountFixture(): BankReconciliationSummary["profile"] {
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
  };
}
