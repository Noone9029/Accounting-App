import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import BankRulesPage, { BankRulesGuidance } from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { Account, BankAccountSummary, BankRule, BankRuleDryRunResponse } from "@/lib/types";

const apiRequestMock = jest.fn();
let currentPermissions = new Set<Permission>();

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

describe("BankRulesPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentPermissions = new Set([PERMISSIONS.bankStatements.view, PERMISSIONS.bankStatements.manage]);
  });

  it("renders bank rules, manual-only safety wording, and action controls", async () => {
    mockInitialLoad([bankRule()]);

    render(<BankRulesPage />);

    expect(await screen.findByText("Bank rules")).toBeInTheDocument();
    expect(screen.getByText(/create review suggestions/i)).toBeInTheDocument();
    expect(screen.getByText(/does not add live bank feeds/i)).toBeInTheDocument();
    expect(await screen.findByText("Monthly bank fee")).toBeInTheDocument();
    expect(screen.getByText(/description: bank fee, currency SAR/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dry run" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument();
  });

  it("validates required fields and creates a categorize suggestion rule", async () => {
    apiRequestMock
      .mockResolvedValueOnce(bankProfile())
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(accounts())
      .mockResolvedValueOnce(bankRule());

    render(<BankRulesPage />);

    expect(await screen.findByRole("heading", { name: "Create rule" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create rule" }));
    expect(screen.getByText("Rule name is required.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Rule name"), { target: { value: "Monthly bank fee" } });
    fireEvent.change(screen.getByLabelText("Description contains"), { target: { value: "bank fee" } });
    fireEvent.click(screen.getByRole("button", { name: "Create rule" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/bank-rules",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            name: "Monthly bank fee",
            bankAccountProfileId: "bank-1",
            descriptionContains: "bank fee",
            actionType: "SUGGEST_CATEGORIZE",
            categorizeAccountId: "expense-1",
            autoApply: false,
          }),
        }),
      );
    });
  });

  it("toggles a rule and displays dry-run suggestions", async () => {
    apiRequestMock
      .mockResolvedValueOnce(bankProfile())
      .mockResolvedValueOnce([bankRule()])
      .mockResolvedValueOnce(accounts())
      .mockResolvedValueOnce(disabledRule())
      .mockResolvedValueOnce(bankProfile())
      .mockResolvedValueOnce([disabledRule()])
      .mockResolvedValueOnce(accounts())
      .mockResolvedValueOnce(dryRunResult());

    render(<BankRulesPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Disable" }));
    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith("/bank-rules/rule-1", { method: "DELETE" });
    });
    expect(await screen.findByRole("button", { name: "Enable" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dry run" }));
    expect(await screen.findByText("Dry-run results")).toBeInTheDocument();
    expect(screen.getByText("Monthly bank fee: 1 suggestions from 1 checked unmatched rows.")).toBeInTheDocument();
    expect(screen.getByText("Bank fee row")).toBeInTheDocument();
  });
});

describe("BankRulesGuidance", () => {
  it("does not contradict manual banking boundaries", () => {
    render(<BankRulesGuidance />);

    expect(screen.getByText(/create review suggestions/i)).toBeInTheDocument();
    expect(screen.getByText(/explicit operator action/i)).toBeInTheDocument();
    expect(screen.getByText(/does not add live bank feeds/i)).toBeInTheDocument();
    expect(screen.queryByText(/payment initiation enabled/i)).not.toBeInTheDocument();
  });
});

function mockInitialLoad(rules: BankRule[]) {
  apiRequestMock.mockResolvedValueOnce(bankProfile()).mockResolvedValueOnce(rules).mockResolvedValueOnce(accounts());
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

function bankRule(overrides: Partial<BankRule> = {}): BankRule {
  return {
    id: "rule-1",
    organizationId: "org-1",
    bankAccountProfileId: "bank-1",
    name: "Monthly bank fee",
    enabled: true,
    priority: 10,
    direction: "DEBIT",
    descriptionContains: "bank fee",
    descriptionRegex: null,
    referenceContains: null,
    bankReferenceContains: null,
    counterpartyContains: null,
    amountEquals: null,
    amountMin: null,
    amountMax: null,
    currencyEquals: "SAR",
    sourceFormat: null,
    startDate: null,
    endDate: null,
    actionType: "SUGGEST_CATEGORIZE",
    categorizeAccountId: "expense-1",
    ignoreReason: null,
    autoApply: false,
    lastDryRunAt: null,
    lastAppliedAt: null,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    categorizeAccount: { id: "expense-1", code: "6100", name: "Bank fees", type: "EXPENSE" },
    ...overrides,
  };
}

function disabledRule(): BankRule {
  return bankRule({ enabled: false });
}

function dryRunResult(): BankRuleDryRunResponse {
  return {
    rule: bankRule(),
    checkedCount: 1,
    suggestions: [
      {
        transaction: {
          id: "row-1",
          organizationId: "org-1",
          importId: "import-1",
          bankAccountProfileId: "bank-1",
          transactionDate: "2026-06-01T00:00:00.000Z",
          description: "Bank fee row",
          reference: "FEE-1",
          type: "DEBIT",
          amount: "25.0000",
          status: "UNMATCHED",
          matchedJournalLineId: null,
          matchedJournalEntryId: null,
          matchType: null,
          categorizedAccountId: null,
          createdJournalEntryId: null,
          ignoredReason: null,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
          reconciliationItems: [],
        },
        suggestion: {
          ruleId: "rule-1",
          ruleName: "Monthly bank fee",
          priority: 10,
          actionType: "SUGGEST_CATEGORIZE",
          score: 90,
          autoApply: false,
          categorizeAccountId: "expense-1",
          matchedReasons: ["Description contains bank fee."],
        },
      },
    ],
  };
}
