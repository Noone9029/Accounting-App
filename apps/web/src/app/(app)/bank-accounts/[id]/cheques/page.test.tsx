import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import ChequesPage, { ChequeGuidance } from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { BankAccountSummary, ChequeInstrument } from "@/lib/types";

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

describe("ChequesPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentPermissions = new Set([PERMISSIONS.bankStatements.view, PERMISSIONS.bankStatements.manage]);
  });

  it("renders cheque register, create form, and manual-only wording", async () => {
    apiRequestMock.mockResolvedValueOnce(bankProfile()).mockResolvedValueOnce([cheque()]);

    render(<ChequesPage />);

    expect(await screen.findByRole("heading", { name: "Cheques" })).toBeInTheDocument();
    expect(screen.getByText(/manual cheque lifecycle/i)).toBeInTheDocument();
    expect(screen.getByText(/no live bank feed/i)).toBeInTheDocument();
    expect(screen.getByText(/no bank payment is sent/i)).toBeInTheDocument();
    expect(await screen.findByText("CHQ-100")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create draft" })).toBeInTheDocument();
  });

  it("validates required fields before creating a draft cheque", async () => {
    apiRequestMock.mockResolvedValueOnce(bankProfile()).mockResolvedValueOnce([]);

    render(<ChequesPage />);

    expect(await screen.findByText("Create draft cheque")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "150.0000" } });
    fireEvent.click(screen.getByRole("button", { name: "Create draft" }));

    expect(await screen.findByText("Cheque number is required.")).toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenCalledTimes(2);
  });

  it("creates a draft issued cheque explicitly", async () => {
    apiRequestMock.mockResolvedValueOnce(bankProfile()).mockResolvedValueOnce([]).mockResolvedValueOnce(cheque({ chequeType: "ISSUED" }));

    render(<ChequesPage />);

    expect(await screen.findByText("Create draft cheque")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "ISSUED" } });
    fireEvent.change(screen.getByLabelText("Cheque number"), { target: { value: "OUT-100" } });
    fireEvent.change(screen.getByLabelText("Counterparty"), { target: { value: "Supplier A" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "90.0000" } });
    fireEvent.click(screen.getByRole("button", { name: "Create draft" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/cheques",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            chequeType: "ISSUED",
            bankAccountProfileId: "bank-1",
            chequeNumber: "OUT-100",
            counterpartyName: "Supplier A",
            amount: "90.0000",
          }),
        }),
      );
    });
  });
});

describe("ChequeGuidance", () => {
  it("keeps safety boundaries explicit", () => {
    render(<ChequeGuidance />);

    expect(screen.getByText(/manual cheque lifecycle/i)).toBeInTheDocument();
    expect(screen.getByText(/no bank api is called/i)).toBeInTheDocument();
    expect(screen.getByText(/no bank credentials are collected/i)).toBeInTheDocument();
    expect(screen.getByText(/clearing-account posting is deferred/i)).toBeInTheDocument();
  });
});

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
    postedJournalEntryId: null,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    bankAccountProfile: bankProfile(),
    depositBatch: null,
    statementTransaction: null,
    createdBy: null,
    updatedBy: null,
    postedJournalEntry: null,
    ...overrides,
  };
}
