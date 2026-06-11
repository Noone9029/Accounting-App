import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import SupplierPaymentsPage from "./page";

const apiRequestMock = jest.fn();
const canMock = jest.fn((_: string) => true);
let searchParams = new URLSearchParams();

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
  useSearchParams: () => searchParams,
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

describe("SupplierPaymentsPage", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams("supplierId=supplier-1&returnTo=/suppliers/supplier-1");
    apiRequestMock.mockReset();
    canMock.mockReset();
    canMock.mockReturnValue(true);
    apiRequestMock.mockResolvedValue([
      paymentFixture("payment-1", "SP-001", "supplier-1", "Beta Supplier"),
      paymentFixture("payment-2", "SP-002", "supplier-2", "Other Supplier"),
    ]);
  });

  it("keeps the supplier workspace context on filtered payment lists", async () => {
    render(<SupplierPaymentsPage />);

    expect(await screen.findByText("SP-001")).toBeInTheDocument();
    expect(screen.queryByText("SP-002")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to workspace" })).toHaveAttribute("href", "/suppliers/supplier-1");
    expect(screen.getByRole("link", { name: "Record payment" })).toHaveAttribute(
      "href",
      "/purchases/supplier-payments/new?supplierId=supplier-1&returnTo=%2Fsuppliers%2Fsupplier-1",
    );
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/purchases/supplier-payments/payment-1?returnTo=%2Fpurchases%2Fsupplier-payments%3FsupplierId%3Dsupplier-1%26returnTo%3D%252Fsuppliers%252Fsupplier-1",
    );
  });
});

function paymentFixture(id: string, paymentNumber: string, supplierId: string, supplierName: string) {
  return {
    id,
    organizationId: "org-1",
    paymentNumber,
    supplierId,
    paymentDate: "2026-05-21T00:00:00.000Z",
    currency: "SAR",
    status: "POSTED",
    amountPaid: "115.0000",
    unappliedAmount: "0.0000",
    description: null,
    accountId: "account-1",
    journalEntryId: "je-1",
    postedAt: "2026-05-21T00:00:00.000Z",
    voidedAt: null,
    supplier: { id: supplierId, name: supplierName, displayName: supplierName, type: "SUPPLIER" },
    account: { id: "account-1", code: "111", name: "Cash on hand", type: "ASSET" },
    journalEntry: { id: "je-1", entryNumber: "JE-001" },
    allocations: [],
    unappliedAllocations: [],
  };
}
