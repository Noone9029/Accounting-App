import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import CashExpenseDetailPage from "./page";
import type { CashExpense } from "@/lib/types";

const apiRequestMock = jest.fn();
let searchParamsMock = new URLSearchParams();

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
  useParams: () => ({ id: "cash-expense-1" }),
  useSearchParams: () => searchParamsMock,
}));

jest.mock("@/components/attachments/attachment-panel", () => ({
  AttachmentPanel: () => <div>Attachment panel</div>,
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: () => true,
  }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

jest.mock("@/lib/pdf-download", () => ({
  downloadPdf: jest.fn(),
  cashExpensePdfPath: (id: string) => `/generated-documents/cash-expenses/${id}/pdf`,
}));

describe("CashExpenseDetailPage", () => {
  beforeEach(() => {
    searchParamsMock = new URLSearchParams("returnTo=%2Fsuppliers%2Fsupplier-1%3Ftab%3Dactivity");
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/cash-expenses/cash-expense-1") {
        return Promise.resolve(cashExpenseFixture());
      }
      if (path === "/cash-expenses/cash-expense-1/pdf-data") {
        return Promise.resolve(cashExpensePdfDataFixture());
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("preserves return context and direct-posting boundaries on detail handoffs", async () => {
    render(<CashExpenseDetailPage />);

    await waitFor(() => expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/suppliers/supplier-1?tab=activity"));
    expect(await screen.findByRole("heading", { name: "CE-000001" })).toBeInTheDocument();

    const detailHref = "/purchases/cash-expenses/cash-expense-1?returnTo=%2Fsuppliers%2Fsupplier-1%3Ftab%3Dactivity";
    expect(screen.getByRole("link", { name: "Supplier ledger" })).toHaveAttribute(
      "href",
      `/contacts/supplier-1?returnTo=${encodeURIComponent(detailHref)}`,
    );
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Void" })).toBeInTheDocument();
    expect(screen.getByText(/does not send supplier payments or bank transfers/i)).toBeInTheDocument();
    expect(screen.getByText("PDF data preview")).toBeInTheDocument();
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
    notes: "Counter receipt",
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
    lines: [
      {
        id: "line-1",
        organizationId: "org-1",
        cashExpenseId: "cash-expense-1",
        itemId: null,
        description: "Office supplies",
        accountId: "expense-1",
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        taxRateId: "tax-1",
        lineGrossAmount: "100.0000",
        discountAmount: "0.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineTotal: "115.0000",
        sortOrder: 0,
        account: { id: "expense-1", code: "5100", name: "Office expenses", type: "EXPENSE" },
        taxRate: { id: "tax-1", name: "VAT 15%", rate: "15.0000" },
        item: null,
      },
    ],
    ...overrides,
  };
}

function cashExpensePdfDataFixture() {
  return {
    organization: { id: "org-1", name: "Demo Org" },
    contact: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", email: null, phone: null, taxNumber: null },
    expense: {
      id: "cash-expense-1",
      expenseNumber: "CE-000001",
      expenseDate: "2026-06-15T00:00:00.000Z",
      status: "POSTED",
      currency: "SAR",
      description: "Cash stationery purchase",
      notes: "Counter receipt",
      subtotal: "100.0000",
      discountTotal: "0.0000",
      taxableTotal: "100.0000",
      taxTotal: "15.0000",
      total: "115.0000",
    },
    paidThroughAccount: { id: "cash-1", code: "1110", name: "Cash on hand", type: "ASSET" },
    lines: [
      {
        description: "Office supplies",
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        lineGrossAmount: "100.0000",
        discountAmount: "0.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineTotal: "115.0000",
        taxRateName: "VAT 15%",
      },
    ],
    journalEntry: { id: "journal-1", entryNumber: "JE-000001", status: "POSTED" },
    voidReversalJournalEntry: null,
    generatedAt: "2026-06-15T12:00:00.000Z",
  };
}
