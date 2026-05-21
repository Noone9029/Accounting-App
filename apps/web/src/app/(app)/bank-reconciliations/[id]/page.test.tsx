import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { BankReconciliationWorkflowGuidance } from "./page";
import type { BankReconciliation } from "@/lib/types";

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

describe("bank reconciliation workflow guidance", () => {
  it("explains closed reconciliation locks and links to review surfaces", () => {
    render(
      <BankReconciliationWorkflowGuidance
        reconciliation={reconciliationFixture({ status: "CLOSED", closedAt: "2026-05-21T00:00:00.000Z" })}
        blockedMessage={null}
        submitBlock={null}
      />,
    );

    expect(screen.getByText("Reconciliation status")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.getAllByText(/locked from match, categorize, ignore, and overlapping import changes/).length).toBeGreaterThan(0);
    expect(screen.getByText(/does not change ledger math/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review unmatched rows" })).toHaveAttribute(
      "href",
      "/bank-accounts/bank-1/statement-transactions?status=UNMATCHED",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
  });
});

function reconciliationFixture(overrides: Partial<BankReconciliation> = {}): BankReconciliation {
  return {
    id: "rec-1",
    organizationId: "org-1",
    bankAccountProfileId: "bank-1",
    reconciliationNumber: "REC-001",
    periodStart: "2026-05-01T00:00:00.000Z",
    periodEnd: "2026-05-31T00:00:00.000Z",
    statementOpeningBalance: "1000.0000",
    statementClosingBalance: "1250.0000",
    ledgerClosingBalance: "1250.0000",
    difference: "0.0000",
    status: "DRAFT",
    notes: null,
    createdById: null,
    submittedById: null,
    approvedById: null,
    reopenedById: null,
    closedById: null,
    voidedById: null,
    submittedAt: null,
    approvedAt: null,
    reopenedAt: null,
    closedAt: null,
    voidedAt: null,
    approvalNotes: null,
    reopenReason: null,
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    unmatchedTransactionCount: 0,
    bankAccountProfile: {
      id: "bank-1",
      displayName: "Operating Bank",
      accountId: "account-1",
      currency: "SAR",
      status: "ACTIVE",
      account: { id: "account-1", code: "1010", name: "Operating Bank", type: "ASSET", allowPosting: true, isActive: true },
    },
    _count: { items: 1 },
    ...overrides,
  };
}
