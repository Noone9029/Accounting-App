import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import SupplierRefundsPage from "./page";

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

describe("SupplierRefundsPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    canMock.mockReset();
    canMock.mockReturnValue(true);
    apiRequestMock.mockResolvedValue([refundFixture()]);
  });

  it("renders supplier refunds as manual AP settlement records", async () => {
    render(<SupplierRefundsPage />);

    expect(await screen.findByText("SRF-001")).toBeInTheDocument();
    expect(screen.getByText("Purchase debit note")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Record refund" })).toHaveAttribute("href", "/purchases/supplier-refunds/new");
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/purchases/supplier-refunds/supplier-refund-1");
    expect(screen.queryByText(/auto.?reconcile|payment gateway|live bank feed|ZATCA submitted/i)).not.toBeInTheDocument();
  });

  it("filters create and void actions by permissions", async () => {
    canMock.mockReturnValue(false);

    render(<SupplierRefundsPage />);

    expect(await screen.findByText("SRF-001")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Record refund" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Void" })).not.toBeInTheDocument();
  });
});

function refundFixture() {
  return {
    id: "supplier-refund-1",
    organizationId: "org-1",
    refundNumber: "SRF-001",
    supplierId: "supplier-1",
    refundDate: "2026-05-22T00:00:00.000Z",
    sourceType: "PURCHASE_DEBIT_NOTE",
    sourcePaymentId: null,
    sourceDebitNoteId: "debit-note-1",
    currency: "SAR",
    amountRefunded: "25.0000",
    accountId: "cash-1",
    status: "POSTED",
    description: null,
    journalEntryId: "je-1",
    voidReversalJournalEntryId: null,
    postedAt: "2026-05-22T00:00:00.000Z",
    voidedAt: null,
    supplier: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER" },
    account: { id: "cash-1", code: "111", name: "Cash on hand", type: "ASSET" },
    journalEntry: { id: "je-1", entryNumber: "JE-001" },
    voidReversalJournalEntry: null,
  };
}
