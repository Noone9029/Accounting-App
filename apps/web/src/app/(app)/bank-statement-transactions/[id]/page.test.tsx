import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { StatementTransactionWorkflowGuidance } from "./page";
import type { BankStatementTransaction } from "@/lib/types";

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

describe("statement transaction workflow guidance", () => {
  it("explains unmatched rows and manual matching actions", () => {
    render(<StatementTransactionWorkflowGuidance transaction={statementRowFixture()} canReconcile lockedWarning={null} />);

    expect(screen.getByText("What this statement row means")).toBeInTheDocument();
    expect(screen.getByText(/waiting for review/)).toBeInTheDocument();
    expect(screen.getByText(/does not use live bank feeds/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bank account" })).toHaveAttribute("href", "/bank-accounts/bank-1");
    expect(screen.getByRole("link", { name: "Reconciliation summary" })).toHaveAttribute("href", "/bank-accounts/bank-1/reconciliation");
  });

  it("shows locked-period warning copy", () => {
    render(
      <StatementTransactionWorkflowGuidance
        transaction={statementRowFixture()}
        canReconcile
        lockedWarning="Statement transaction belongs to closed reconciliation REC-001."
      />,
    );

    expect(screen.getByText(/closed period blocks match, categorize, and ignore changes/)).toBeInTheDocument();
  });
});

function statementRowFixture(overrides: Partial<BankStatementTransaction> = {}): BankStatementTransaction {
  return {
    id: "statement-row-1",
    organizationId: "org-1",
    importId: "import-1",
    bankAccountProfileId: "bank-1",
    transactionDate: "2026-05-21T00:00:00.000Z",
    description: "Customer deposit",
    reference: "REF-001",
    type: "CREDIT",
    amount: "250.0000",
    status: "UNMATCHED",
    matchedJournalLineId: null,
    matchedJournalEntryId: null,
    matchType: null,
    categorizedAccountId: null,
    createdJournalEntryId: null,
    ignoredReason: null,
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    bankAccountProfile: {
      id: "bank-1",
      displayName: "Operating Bank",
      accountId: "account-1",
      currency: "SAR",
      account: { id: "account-1", code: "1010", name: "Operating Bank", type: "ASSET", allowPosting: true, isActive: true },
    },
    reconciliationItems: [],
    ...overrides,
  };
}
