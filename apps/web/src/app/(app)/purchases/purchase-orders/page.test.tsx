import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import PurchaseOrdersPage from "./page";
import type { PurchaseOrder } from "@/lib/types";

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

describe("PurchaseOrdersPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    canMock.mockReset();
    canMock.mockReturnValue(true);
    apiRequestMock.mockResolvedValue([purchaseOrderFixture()]);
  });

  it("renders purchase order operations without posting or automation claims", async () => {
    render(<PurchaseOrdersPage />);

    expect(await screen.findByText("PO-000001")).toBeInTheDocument();
    expect(screen.getByText(/do not post AP, move inventory, send supplier payments, or file tax authority submissions/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create PO" })).toHaveAttribute("href", "/purchases/purchase-orders/new");
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/purchases/purchase-orders/po-1");
    expect(screen.queryByText(/auto.?approve|auto.?send|supplier paid|payment scheduled|journal posted|VAT filed|ZATCA cleared/i)).not.toBeInTheDocument();
  });

  it("hides purchase order creation without create permission", async () => {
    canMock.mockReturnValue(false);

    render(<PurchaseOrdersPage />);

    expect(await screen.findByText("PO-000001")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create PO" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toBeInTheDocument();
  });
});

function purchaseOrderFixture(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
    id: "po-1",
    organizationId: "org-1",
    purchaseOrderNumber: "PO-000001",
    supplierId: "supplier-1",
    branchId: null,
    orderDate: "2026-06-01T00:00:00.000Z",
    expectedDeliveryDate: "2026-06-10T00:00:00.000Z",
    currency: "SAR",
    status: "APPROVED",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    notes: null,
    terms: null,
    approvedAt: "2026-06-02T00:00:00.000Z",
    sentAt: null,
    closedAt: null,
    voidedAt: null,
    convertedBillId: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    supplier: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER", isActive: true },
    branch: null,
    convertedBill: null,
    lines: [],
    ...overrides,
  };
}
