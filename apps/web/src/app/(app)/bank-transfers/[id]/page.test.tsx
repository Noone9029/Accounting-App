import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { BankTransferWorkflowGuidance } from "./page";
import type { BankTransfer } from "@/lib/types";

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

describe("bank transfer workflow guidance", () => {
  it("shows success guidance and account drill-down links after creation", () => {
    render(
      <BankTransferWorkflowGuidance
        transfer={bankTransferFixture()}
        wasJustCreated
        canVoidTransfer
        onVoid={jest.fn()}
        voiding={false}
      />,
    );

    expect(screen.getByText(/Transfer posted/)).toBeInTheDocument();
    expect(screen.getByText(/source account decreased/)).toBeInTheDocument();
    expect(screen.getByText(/destination account increased/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Source account" })).toHaveAttribute("href", "/bank-accounts/source-bank");
    expect(screen.getByRole("link", { name: "Destination account" })).toHaveAttribute("href", "/bank-accounts/destination-bank");
    expect(screen.getByRole("link", { name: "View bank ledger" })).toHaveAttribute("href", "/reports/general-ledger?accountId=source-account");
    expect(screen.getByRole("button", { name: "Void transfer" })).toBeInTheDocument();
  });

  it("explains voided transfers without offering another void action", () => {
    render(
      <BankTransferWorkflowGuidance
        transfer={bankTransferFixture({ status: "VOIDED", voidReversalJournalEntryId: "journal-void" })}
        wasJustCreated={false}
        canVoidTransfer={false}
        onVoid={jest.fn()}
        voiding={false}
      />,
    );

    expect(screen.getByText("Voided")).toBeInTheDocument();
    expect(screen.getByText(/keeps the original transfer and shows the reversal journal/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Void transfer" })).not.toBeInTheDocument();
  });
});

function bankTransferFixture(overrides: Partial<BankTransfer> = {}): BankTransfer {
  return {
    id: "transfer-1",
    organizationId: "org-1",
    transferNumber: "TRF-001",
    fromBankAccountProfileId: "source-bank",
    toBankAccountProfileId: "destination-bank",
    fromAccountId: "source-account",
    toAccountId: "destination-account",
    transferDate: "2026-05-21T00:00:00.000Z",
    currency: "SAR",
    status: "POSTED",
    amount: "250.0000",
    description: null,
    journalEntryId: "journal-1",
    voidReversalJournalEntryId: null,
    postedAt: "2026-05-21T00:00:00.000Z",
    voidedAt: null,
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    fromBankAccountProfile: {
      id: "source-bank",
      displayName: "Operating Bank",
      type: "BANK",
      status: "ACTIVE",
      currency: "SAR",
      accountId: "source-account",
      account: { id: "source-account", code: "1010", name: "Operating Bank", type: "ASSET", allowPosting: true, isActive: true },
    },
    toBankAccountProfile: {
      id: "destination-bank",
      displayName: "Savings Bank",
      type: "BANK",
      status: "ACTIVE",
      currency: "SAR",
      accountId: "destination-account",
      account: { id: "destination-account", code: "1020", name: "Savings Bank", type: "ASSET", allowPosting: true, isActive: true },
    },
    fromAccount: { id: "source-account", code: "1010", name: "Operating Bank", type: "ASSET" },
    toAccount: { id: "destination-account", code: "1020", name: "Savings Bank", type: "ASSET" },
    journalEntry: { id: "journal-1", entryNumber: "JE-001", status: "POSTED" },
    voidReversalJournalEntry: null,
    ...overrides,
  };
}
