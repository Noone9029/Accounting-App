import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import BankReconciliationDetailPage, { BankReconciliationWorkflowGuidance, ReconciliationReportReviewPanels } from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { BankReconciliation, BankReconciliationItem, BankReconciliationReportData } from "@/lib/types";

const mockApiRequest = jest.fn();
let mockPermissions = new Set<Permission>();

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
  useParams: () => ({ id: "rec-1" }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: Permission) => mockPermissions.has(permission),
  }),
}));

jest.mock("@/components/attachments/attachment-panel", () => ({
  AttachmentPanel: () => <div data-testid="attachment-panel" />,
}));

describe("bank reconciliation workflow guidance", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockPermissions = new Set([PERMISSIONS.bankReconciliations.close, PERMISSIONS.reports.export]);
  });

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

  it("renders report summary, exceptions, treasury activity, accounting status, and audit timeline", () => {
    render(<ReconciliationReportReviewPanels report={reportFixture()} currency="SAR" />);

    expect(screen.getByText("Accountant review summary")).toBeInTheDocument();
    expect(screen.getByText(/Manual banking only/)).toBeInTheDocument();
    expect(screen.getByText(/No live bank feed, bank API, bank credentials, or payment initiation/)).toBeInTheDocument();
    expect(screen.getByText("Exceptions")).toBeInTheDocument();
    expect(screen.getByText("Linked treasury activity")).toBeInTheDocument();
    expect(screen.getByText("Accounting status")).toBeInTheDocument();
    expect(screen.getByText(/Clearing-account configuration is missing or disabled/)).toBeInTheDocument();
    expect(screen.getByText(/Operational-only records are visible for review/)).toBeInTheDocument();
    expect(screen.getByText("Audit timeline")).toBeInTheDocument();
    expect(screen.getByText("Statement row matched")).toBeInTheDocument();
    expect(screen.getByText("Export CSV for the full timeline.")).toBeInTheDocument();
  });

  it("labels captured statement row drilldowns with a specific action", async () => {
    mockApiRequest
      .mockResolvedValueOnce(reconciliationFixture({ status: "CLOSED", closedAt: "2026-05-31T00:00:00.000Z" }))
      .mockResolvedValueOnce([reconciliationItemFixture()])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(reportFixture());

    render(<BankReconciliationDetailPage />);

    expect(await screen.findByRole("link", { name: "Open statement row" })).toHaveAttribute(
      "href",
      "/bank-statement-transactions/statement-1",
    );
    expect(screen.queryByRole("link", { name: "Row" })).not.toBeInTheDocument();
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

function reconciliationItemFixture(overrides: Partial<BankReconciliationItem> = {}): BankReconciliationItem {
  return {
    id: "item-1",
    reconciliationId: "rec-1",
    statementTransactionId: "statement-1",
    type: "CREDIT",
    amount: "100.0000",
    statusAtClose: "MATCHED",
    createdAt: "2026-05-31T00:00:00.000Z",
    statementTransaction: {
      id: "statement-1",
      transactionDate: "2026-05-10T00:00:00.000Z",
      description: "Customer receipt",
      reference: "REF-1",
      matchedJournalEntry: { id: "journal-1", entryNumber: "JE-0001" },
      createdJournalEntry: null,
    },
    ...overrides,
  } as BankReconciliationItem;
}

function reportFixture(): BankReconciliationReportData {
  return {
    organization: {
      id: "org-1",
      name: "LedgerByte Demo",
      legalName: null,
      taxNumber: null,
      countryCode: "SA",
      baseCurrency: "SAR",
    },
    currency: "SAR",
    reconciliation: {
      id: "rec-1",
      reconciliationNumber: "REC-001",
      periodStart: "2026-05-01T00:00:00.000Z",
      periodEnd: "2026-05-31T00:00:00.000Z",
      statementOpeningBalance: "1000.0000",
      statementClosingBalance: "1250.0000",
      ledgerClosingBalance: "1250.0000",
      difference: "0.0000",
      status: "CLOSED",
      submittedAt: null,
      submittedBy: null,
      approvedAt: null,
      approvedBy: null,
      approvalNotes: null,
      closedAt: "2026-05-31T00:00:00.000Z",
      closedBy: { id: "user-1", name: "Owner", email: "owner@example.com" },
      voidedAt: null,
      voidedBy: null,
    },
    bankAccount: {
      id: "bank-1",
      displayName: "Main Bank",
      currency: "SAR",
      account: { id: "account-1", code: "1010", name: "Main Bank" },
    },
    items: [],
    summary: {
      itemCount: 1,
      debitTotal: "25.0000",
      creditTotal: "100.0000",
      matchedCount: 1,
      categorizedCount: 0,
      ignoredCount: 0,
      totalRowsCount: 2,
      matchedRowsCount: 1,
      categorizedRowsCount: 0,
      ignoredRowsCount: 0,
      unmatchedRowsCount: 1,
      unreconciledRowsCount: 1,
      ruleAppliedRowsCount: 1,
      creditRowsCount: 1,
      debitRowsCount: 1,
      creditRowsTotal: "100.0000",
      debitRowsTotal: "25.0000",
      exceptionRowsCount: 1,
    },
    linkedTreasurySummary: {
      depositBatches: { count: 1, matchedCount: 1, journalPostedCount: 1, operationalOnlyCount: 0, totalAmount: "100.0000" },
      cardSettlements: { count: 1, matchedCount: 0, journalPostedCount: 0, operationalOnlyCount: 1, totalAmount: "50.0000" },
      cheques: { count: 1, matchedCount: 1, journalPostedCount: 0, operationalOnlyCount: 1, totalAmount: "30.0000" },
    },
    accountingStatusSummary: {
      clearingConfigEnabled: false,
      configuredAccountCount: 0,
      journalPostedCount: 1,
      operationalOnlyCount: 2,
      missingClearingConfig: true,
    },
    auditTimeline: [
      {
        id: "event-1",
        occurredAt: "2026-05-10T00:00:00.000Z",
        type: "STATEMENT_ROW_REVIEW",
        label: "Statement row matched",
        entityType: "BankStatementTransaction",
        entityId: "statement-1",
        status: "MATCHED",
        actor: { id: "user-1", name: "Owner", email: "owner@example.com" },
        amount: "100.0000",
        reference: "REF-1",
      },
    ],
    generatedAt: "2026-05-31T00:00:00.000Z",
  };
}
