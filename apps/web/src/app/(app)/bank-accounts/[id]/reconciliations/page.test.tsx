import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import BankReconciliationsPage from "./page";
import { apiRequest } from "@/lib/api";
import type { BankAccountSummary, BankReconciliation } from "@/lib/types";

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
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({ can: () => true }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("bank reconciliations page", () => {
  beforeEach(() => {
    mockedApiRequest.mockImplementation((path) => {
      if (path === "/bank-accounts/bank-1") {
        return Promise.resolve(bankAccountFixture()) as ReturnType<typeof apiRequest>;
      }
      if (path === "/bank-accounts/bank-1/reconciliations") {
        return Promise.resolve([reconciliationFixture()]) as ReturnType<typeof apiRequest>;
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders Arabic reconciliation history without changing action routes", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <BankReconciliationsPage />
      </AppLocaleProvider>,
    );

    expect(await screen.findByRole("heading", { name: "التسويات البنكية" })).toBeInTheDocument();
    expect(screen.getByText("سجل الفترات المغلقة")).toBeInTheDocument();
    expect(screen.getByText(/قفل فترة حركات الكشف/)).toBeInTheDocument();
    expect(await screen.findByText("مغلقة")).toBeInTheDocument();
    expect(await screen.findByText("REC-001")).toBeInTheDocument();

    await waitFor(() => expect(mockedApiRequest).toHaveBeenCalledWith("/bank-accounts/bank-1/reconciliations"));
    expect(screen.getByRole("link", { name: "تسوية جديدة" })).toHaveAttribute("href", "/bank-accounts/bank-1/reconciliations/new");
    expect(screen.getByRole("link", { name: "ملخص التسوية" })).toHaveAttribute("href", "/bank-accounts/bank-1/reconciliation");
    expect(screen.getByRole("link", { name: "عرض" })).toHaveAttribute("href", "/bank-reconciliations/reconciliation-1");
  });
});

function bankAccountFixture(): BankAccountSummary {
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
    ledgerBalance: "1250.0000",
    latestTransactionDate: "2026-05-21T00:00:00.000Z",
    transactionCount: 4,
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

function reconciliationFixture(): BankReconciliation {
  return {
    id: "reconciliation-1",
    organizationId: "org-1",
    bankAccountProfileId: "bank-1",
    reconciliationNumber: "REC-001",
    periodStart: "2026-05-01T00:00:00.000Z",
    periodEnd: "2026-05-31T23:59:59.999Z",
    statementOpeningBalance: "1000.0000",
    statementClosingBalance: "1250.0000",
    ledgerClosingBalance: "1250.0000",
    difference: "0.0000",
    status: "CLOSED",
    notes: null,
    submittedAt: "2026-06-01T00:00:00.000Z",
    approvedAt: "2026-06-01T01:00:00.000Z",
    closedAt: "2026-06-01T02:00:00.000Z",
    reopenedAt: null,
    voidedAt: null,
    createdById: "user-1",
    submittedById: "user-1",
    approvedById: "user-2",
    closedById: "user-3",
    reopenedById: null,
    voidedById: null,
    approvalNotes: null,
    reopenReason: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T02:00:00.000Z",
    bankAccountProfile: bankAccountFixture(),
    submittedBy: { id: "user-1", name: "Preparer", email: "preparer@example.com" },
    approvedBy: { id: "user-2", name: "Approver", email: "approver@example.com" },
    closedBy: { id: "user-3", name: "Closer", email: "closer@example.com" },
    reopenedBy: null,
    voidedBy: null,
    createdBy: { id: "user-1", name: "Preparer", email: "preparer@example.com" },
    _count: { items: 3 },
  };
}
