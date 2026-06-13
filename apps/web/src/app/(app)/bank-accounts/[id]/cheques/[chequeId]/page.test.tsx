import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import ChequeDetailPage from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { BankDepositBatch, BankStatementTransaction, ChequeInstrument } from "@/lib/types";

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
  useParams: () => ({ id: "bank-1", chequeId: "chq-1" }),
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

describe("ChequeDetailPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentPermissions = new Set([PERMISSIONS.bankStatements.view, PERMISSIONS.bankStatements.manage, PERMISSIONS.bankStatements.reconcile]);
  });

  it("renders lifecycle details and manual-only wording", async () => {
    apiRequestMock.mockResolvedValueOnce(cheque()).mockResolvedValueOnce([depositBatch()]).mockResolvedValueOnce([statementRow()]);

    render(<ChequeDetailPage />);

    expect(await screen.findByText("Cheque detail")).toBeInTheDocument();
    expect(screen.getByText("Received")).toBeInTheDocument();
    expect(screen.getByText(/no live bank feed is added/i)).toBeInTheDocument();
    expect(screen.getByText(/no bank payment is sent/i)).toBeInTheDocument();
    expect(screen.getByText(/clearing-account journal posting is deferred/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Deposit cheque" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Match cheque" })).toBeInTheDocument();
  });

  it("deposits a received cheque into a selected draft deposit batch", async () => {
    apiRequestMock
      .mockResolvedValueOnce(cheque())
      .mockResolvedValueOnce([depositBatch()])
      .mockResolvedValueOnce([statementRow()])
      .mockResolvedValueOnce(cheque({ status: "DEPOSITED", depositBatchId: "dep-1", depositBatch: depositBatch() }))
      .mockResolvedValueOnce(cheque({ status: "DEPOSITED", depositBatchId: "dep-1", depositBatch: depositBatch() }));

    render(<ChequeDetailPage />);

    expect(await screen.findByRole("button", { name: "Deposit cheque" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Deposit cheque" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/cheques/chq-1/deposit",
        expect.objectContaining({ method: "POST", body: { depositBatchId: "dep-1" } }),
      );
    });
  });

  it("requires reasons for bounce and void before calling the API", async () => {
    apiRequestMock.mockResolvedValueOnce(cheque()).mockResolvedValueOnce([depositBatch()]).mockResolvedValueOnce([statementRow()]);

    render(<ChequeDetailPage />);

    expect(await screen.findByRole("button", { name: "Bounce/stop cheque" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Bounce/stop cheque" }));
    expect(await screen.findByText("Bounce reason is required.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Void cheque" }));
    expect(await screen.findByText("Void reason is required.")).toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenCalledTimes(3);
  });

  it("matches a cheque through explicit statement action", async () => {
    apiRequestMock
      .mockResolvedValueOnce(cheque())
      .mockResolvedValueOnce([depositBatch()])
      .mockResolvedValueOnce([statementRow()])
      .mockResolvedValueOnce(cheque({ status: "CLEARED", statementTransactionId: "stmt-1", statementTransaction: statementRow() }))
      .mockResolvedValueOnce(cheque({ status: "CLEARED", statementTransactionId: "stmt-1", statementTransaction: statementRow() }));

    render(<ChequeDetailPage />);

    expect(await screen.findByRole("button", { name: "Match cheque" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Match cheque" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/cheques/chq-1/match-statement-transaction",
        expect.objectContaining({ method: "POST", body: { statementTransactionId: "stmt-1" } }),
      );
    });
  });
});

function cheque(overrides: Partial<ChequeInstrument> = {}): ChequeInstrument {
  return {
    id: "chq-1",
    organizationId: "org-1",
    chequeType: "RECEIVED",
    status: "RECEIVED",
    bankAccountProfileId: "bank-1",
    depositBatchId: null,
    statementTransactionId: null,
    counterpartyType: "CUSTOMER",
    counterpartyId: null,
    counterpartyName: "Acme Trading",
    chequeNumber: "CHQ-100",
    drawerBankName: "Drawer Bank",
    payeeName: null,
    issueDate: "2026-06-01T00:00:00.000Z",
    receivedDate: "2026-06-02T00:00:00.000Z",
    dueDate: "2026-06-05T00:00:00.000Z",
    depositDate: null,
    clearedDate: null,
    bouncedDate: null,
    voidedDate: null,
    amount: "150.0000",
    currency: "SAR",
    reference: "REF-1",
    memo: null,
    bounceReason: null,
    voidReason: null,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    bankAccountProfile: null,
    depositBatch: null,
    statementTransaction: null,
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

function depositBatch(): BankDepositBatch {
  return {
    id: "dep-1",
    organizationId: "org-1",
    bankAccountProfileId: "bank-1",
    depositDate: "2026-06-03T00:00:00.000Z",
    currency: "SAR",
    status: "DRAFT",
    memo: null,
    totalAmount: "0.0000",
    statementTransactionId: null,
    createdById: "user-1",
    updatedById: "user-1",
    postedAt: null,
    matchedAt: null,
    voidedAt: null,
    createdAt: "2026-06-03T00:00:00.000Z",
    updatedAt: "2026-06-03T00:00:00.000Z",
    lines: [],
  };
}

function statementRow(): BankStatementTransaction {
  return {
    id: "stmt-1",
    organizationId: "org-1",
    importId: "import-1",
    bankAccountProfileId: "bank-1",
    transactionDate: "2026-06-04T00:00:00.000Z",
    description: "Cheque deposit",
    reference: "CHQ-100",
    type: "CREDIT",
    amount: "150.0000",
    status: "UNMATCHED",
    matchedJournalLineId: null,
    matchedJournalEntryId: null,
    matchType: null,
    categorizedAccountId: null,
    createdJournalEntryId: null,
    ignoredReason: null,
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z",
  };
}
