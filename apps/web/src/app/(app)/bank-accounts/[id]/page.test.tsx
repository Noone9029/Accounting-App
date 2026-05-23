import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { BankAccountWorkflowGuidance } from "./page";
import type { BankAccountSummary } from "@/lib/types";

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
