import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import BankStatementTransactionsPage, { StatementTransactionsGuidance } from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { Account, BankAccountSummary, BankStatementMatchCandidate, BankStatementTransaction } from "@/lib/types";

const apiRequestMock = jest.fn();
let currentPermissions = new Set<Permission>();
let currentSearchParams = new URLSearchParams();

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
  useSearchParams: () => currentSearchParams,
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

describe("BankStatementTransactionsPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentPermissions = new Set([PERMISSIONS.bankStatements.view, PERMISSIONS.bankStatements.reconcile]);
    currentSearchParams = new URLSearchParams();
  });

  it("renders imported statement rows, filter tabs, search, detail links, and manual-only guidance", async () => {
    mockInitialLoad(statementRows());

    render(<BankStatementTransactionsPage />);

    expect(await screen.findByText("Statement transaction review")).toBeInTheDocument();
    expect(screen.getByText(/manual banking only/i)).toBeInTheDocument();
    expect(screen.getByText(/does not connect to live bank feeds/i)).toBeInTheDocument();
    expect(await screen.findByText("Customer receipt")).toBeInTheDocument();
    expect(screen.getByText("Vendor payment")).toBeInTheDocument();
    expect(screen.getByText("Acme Trading")).toBeInTheDocument();
    expect(screen.getByText("BANK-REF-001")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Detail" })[0]).toHaveAttribute("href", "/bank-statement-transactions/row-1");

    fireEvent.click(screen.getByRole("button", { name: "Debit" }));
    expect(screen.queryByText("Customer receipt")).not.toBeInTheDocument();
    expect(screen.getByText("Vendor payment")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "acme" } });
    expect(screen.getByText("Customer receipt")).toBeInTheDocument();
    expect(screen.queryByText("Vendor payment")).not.toBeInTheDocument();
  });

  it("loads row candidates and matches the selected candidate through the existing row API", async () => {
    apiRequestMock
      .mockResolvedValueOnce(bankProfile())
      .mockResolvedValueOnce(statementRows())
      .mockResolvedValueOnce(accounts())
      .mockResolvedValueOnce(matchCandidates())
      .mockResolvedValueOnce(statementRow({ status: "MATCHED", matchedJournalEntryId: "journal-1", matchedJournalEntry: { id: "journal-1", entryNumber: "JE-0001", entryDate: "2026-05-21T00:00:00.000Z", description: "Customer receipt", reference: "RCPT-001" } }));

    render(<BankStatementTransactionsPage />);

    const candidateButtons = await screen.findAllByRole("button", { name: "View candidates" });
    fireEvent.click(candidateButtons[0]!);
    expect(await screen.findByText("Match candidates")).toBeInTheDocument();
    expect(screen.getByText("JE-0001")).toBeInTheDocument();
    expect(screen.getByText("Strong match")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Match selected candidate" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/bank-statement-transactions/row-1/match",
        expect.objectContaining({
          method: "POST",
          body: { journalLineId: "line-1" },
        }),
      );
    });
    expect(await screen.findByText("Row matched.")).toBeInTheDocument();
  });

  it("categorizes a single row and requires a reason before ignoring a row", async () => {
    apiRequestMock
      .mockResolvedValueOnce(bankProfile())
      .mockResolvedValueOnce(statementRows())
      .mockResolvedValueOnce(accounts())
      .mockResolvedValueOnce(statementRow({ status: "CATEGORIZED", categorizedAccountId: "expense-1" }));

    const { unmount } = render(<BankStatementTransactionsPage />);

    const categorizeButtons = await screen.findAllByRole("button", { name: "Categorize" });
    fireEvent.click(categorizeButtons[0]!);
    fireEvent.change(screen.getByLabelText("Memo"), { target: { value: "Bank fee coding" } });
    fireEvent.click(screen.getByRole("button", { name: "Post categorization journal" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/bank-statement-transactions/row-1/categorize",
        expect.objectContaining({
          method: "POST",
          body: { accountId: "expense-1", description: "Bank fee coding" },
        }),
      );
    });

    unmount();
    apiRequestMock.mockReset();
    apiRequestMock
      .mockResolvedValueOnce(bankProfile())
      .mockResolvedValueOnce(statementRows())
      .mockResolvedValueOnce(accounts())
      .mockResolvedValueOnce(statementRow({ status: "IGNORED", ignoredReason: "Duplicate import row" }));

    render(<BankStatementTransactionsPage />);
    const ignoreButtons = await screen.findAllByRole("button", { name: "Ignore" });
    fireEvent.click(ignoreButtons[0]!);
    expect(screen.getByRole("button", { name: "Ignore row" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Duplicate import row" } });
    fireEvent.click(screen.getByRole("button", { name: "Ignore row" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/bank-statement-transactions/row-1/ignore",
        expect.objectContaining({
          method: "POST",
          body: { reason: "Duplicate import row" },
        }),
      );
    });
  });

  it("bulk ignores selected rows with required reason and keeps failed rows visible", async () => {
    const rows = [statementRow(), statementRow({ id: "row-2", description: "Second unmatched", reference: "REF-002" })];
    apiRequestMock
      .mockResolvedValueOnce(bankProfile())
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce(accounts())
      .mockResolvedValueOnce(statementRow({ status: "IGNORED", ignoredReason: "Duplicate batch" }))
      .mockRejectedValueOnce(new Error("Statement transaction belongs to a closed reconciliation period."));

    render(<BankStatementTransactionsPage />);

    fireEvent.click(await screen.findByLabelText("Select Customer receipt"));
    fireEvent.click(screen.getByLabelText("Select Second unmatched"));
    fireEvent.click(screen.getByRole("button", { name: "Bulk ignore" }));
    expect(screen.getByText("Bulk ignore requires one reason.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Ignore reason"), { target: { value: "Duplicate batch" } });
    fireEvent.click(screen.getByRole("button", { name: "Bulk ignore" }));

    expect(await screen.findByText("1 rows updated, 1 rows failed. Failed rows remain visible.")).toBeInTheDocument();
    expect(screen.getByText("Statement transaction belongs to a closed reconciliation period.")).toBeInTheDocument();
    expect(screen.getByText("Second unmatched")).toBeInTheDocument();
  });

  it("bulk categorizes selected rows through single-row categorize calls", async () => {
    apiRequestMock
      .mockResolvedValueOnce(bankProfile())
      .mockResolvedValueOnce([statementRow()])
      .mockResolvedValueOnce(accounts())
      .mockResolvedValueOnce(statementRow({ status: "CATEGORIZED", categorizedAccountId: "expense-1" }));

    render(<BankStatementTransactionsPage />);

    fireEvent.click(await screen.findByLabelText("Select Customer receipt"));
    fireEvent.change(screen.getByLabelText("Bulk categorize memo"), { target: { value: "Batch coding" } });
    fireEvent.click(screen.getByRole("button", { name: "Bulk categorize" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/bank-statement-transactions/row-1/categorize",
        expect.objectContaining({
          method: "POST",
          body: { accountId: "expense-1", description: "Batch coding" },
        }),
      );
    });
  });
});

describe("StatementTransactionsGuidance", () => {
  it("links to import and reconciliation surfaces without contradicting manual banking posture", () => {
    render(<StatementTransactionsGuidance profileId="bank-1" />);

    expect(screen.getByText("Inline statement review")).toBeInTheDocument();
    expect(screen.getByText(/Every row-changing action is explicit/)).toBeInTheDocument();
    expect(screen.getByText(/manual banking only/)).toBeInTheDocument();
    expect(screen.queryByText(/live bank sync/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Import statement" })).toHaveAttribute("href", "/bank-accounts/bank-1/statement-imports");
    expect(screen.getByRole("link", { name: "Reconciliation summary" })).toHaveAttribute("href", "/bank-accounts/bank-1/reconciliation");
  });
});

function mockInitialLoad(rows: BankStatementTransaction[]) {
  apiRequestMock.mockResolvedValueOnce(bankProfile()).mockResolvedValueOnce(rows).mockResolvedValueOnce(accounts());
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
    openingBalanceDate: "2026-05-01T00:00:00.000Z",
    openingBalanceJournalEntryId: "journal-opening",
    openingBalancePostedAt: "2026-05-01T00:00:00.000Z",
    notes: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    account: { id: "bank-account-1", code: "1010", name: "Main Bank", type: "ASSET", allowPosting: true, isActive: true },
    openingBalanceJournalEntry: { id: "journal-opening", entryNumber: "JE-OPEN", status: "POSTED" },
    ledgerBalance: "1250.0000",
    latestTransactionDate: "2026-05-21T00:00:00.000Z",
    transactionCount: 4,
  };
}

function accounts(): Account[] {
  return [
    {
      id: "expense-1",
      organizationId: "org-1",
      parentId: null,
      code: "6100",
      name: "Bank fees",
      type: "EXPENSE",
      description: null,
      allowPosting: true,
      isSystem: false,
      isActive: true,
    },
  ];
}

function statementRows(): BankStatementTransaction[] {
  return [
    statementRow(),
    statementRow({
      id: "row-debit",
      description: "Vendor payment",
      reference: "PAY-001",
      type: "DEBIT",
      amount: "75.0000",
      rawData: { normalized: { bankReference: "BANK-REF-002", counterparty: "Example Supplier", currency: "SAR" } },
    }),
  ];
}

function statementRow(overrides: Partial<BankStatementTransaction> = {}): BankStatementTransaction {
  return {
    id: "row-1",
    organizationId: "org-1",
    importId: "import-1",
    bankAccountProfileId: "bank-1",
    transactionDate: "2026-05-21T00:00:00.000Z",
    description: "Customer receipt",
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
    rawData: { normalized: { bankReference: "BANK-REF-001", counterparty: "Acme Trading", currency: "SAR" } },
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    bankAccountProfile: {
      id: "bank-1",
      displayName: "Main Bank",
      accountId: "bank-account-1",
      currency: "SAR",
      account: { id: "bank-account-1", code: "1010", name: "Main Bank", type: "ASSET", allowPosting: true, isActive: true },
    },
    import: {
      id: "import-1",
      filename: "statement.csv",
      status: "IMPORTED",
      importedAt: "2026-05-21T00:00:00.000Z",
    },
    reconciliationItems: [],
    ...overrides,
  };
}

function matchCandidates(): BankStatementMatchCandidate[] {
  return [
    {
      journalLineId: "line-1",
      journalEntryId: "journal-1",
      date: "2026-05-21T00:00:00.000Z",
      entryNumber: "JE-0001",
      description: "Customer receipt",
      reference: "RCPT-001",
      debit: "250.0000",
      credit: "0.0000",
      score: 95,
      reason: "amount and direction match, same date, reference match",
    },
  ];
}
