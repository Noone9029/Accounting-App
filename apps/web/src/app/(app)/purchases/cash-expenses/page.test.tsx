import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import CashExpensesPage from "./page";
import type { CashExpense } from "@/lib/types";

const apiRequestMock = jest.fn();
const canMock = jest.fn((_: string) => true);

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

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: string) => canMock(permission),
  }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("CashExpensesPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    canMock.mockReset();
    canMock.mockReturnValue(true);
    apiRequestMock.mockResolvedValue([cashExpenseFixture()]);
  });

  it("renders direct-spend boundaries and row actions", async () => {
    render(<CashExpensesPage />);

    expect(await screen.findByText("CE-000001")).toBeInTheDocument();
    expect(screen.getByText(/do not create accounts payable, supplier payment runs, bank transfers, or tax authority submissions/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Post cash expense" })).toHaveAttribute("href", "/purchases/cash-expenses/new");
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/purchases/cash-expenses/cash-expense-1");
    expect(screen.getByRole("button", { name: "Void" })).toBeInTheDocument();
    expect(screen.queryByText(/auto.?match|auto.?reconcile|autopay|bank feed|payment provider|ZATCA cleared|VAT filed/i)).not.toBeInTheDocument();
  });

  it("hides create and void actions without permissions", async () => {
    canMock.mockReturnValue(false);

    render(<CashExpensesPage />);

    expect(await screen.findByText("CE-000001")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Post cash expense" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Void" })).not.toBeInTheDocument();
  });
});

function cashExpenseFixture(overrides: Partial<CashExpense> = {}): CashExpense {
  return {
    id: "cash-expense-1",
    organizationId: "org-1",
    expenseNumber: "CE-000001",
    contactId: "supplier-1",
    branchId: null,
    expenseDate: "2026-06-15T00:00:00.000Z",
    currency: "SAR",
    status: "POSTED",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    description: "Cash stationery purchase",
    notes: null,
    paidThroughAccountId: "cash-1",
    createdById: "user-1",
    postedAt: "2026-06-15T00:00:00.000Z",
    journalEntryId: "journal-1",
    voidReversalJournalEntryId: null,
    voidedAt: null,
    createdAt: "2026-06-15T00:00:00.000Z",
    updatedAt: "2026-06-15T00:00:00.000Z",
    contact: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER" },
    branch: null,
    paidThroughAccount: { id: "cash-1", code: "1110", name: "Cash on hand", type: "ASSET" },
    journalEntry: { id: "journal-1", entryNumber: "JE-000001", status: "POSTED", totalDebit: "115.0000", totalCredit: "115.0000" },
    voidReversalJournalEntry: null,
    lines: [],
    ...overrides,
  };
}
