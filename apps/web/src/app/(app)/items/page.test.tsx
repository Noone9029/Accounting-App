import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import ItemsPage from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { Account, InventoryBalance, Item, TaxRate } from "@/lib/types";

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

describe("ItemsPage traceability settings", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentPermissions = new Set([PERMISSIONS.items.manage, PERMISSIONS.inventory.view]);
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/items") return Promise.resolve([item()]);
      if (path === "/accounts") return Promise.resolve([account()]);
      if (path === "/tax-rates") return Promise.resolve([taxRate()]);
      if (path === "/inventory/balances") return Promise.resolve([balance()]);
      return Promise.resolve([]);
    });
  });

  it("renders item tracking settings UI, helper text, and item traceability link", async () => {
    render(<ItemsPage />);

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith("/items");
    });

    expect(await screen.findByText("Tracked Item")).toBeInTheDocument();
    expect(screen.getByText(/Tracking settings add operational traceability/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Expiry tracking" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Bin tracking" })).toBeInTheDocument();
    expect(screen.getAllByText("Serial and batch").length).toBeGreaterThan(0);
    expect(screen.getByText("Expiry, Bin")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Traceability" })).toHaveAttribute("href", "/inventory/traceability/items/item-1");
  });
});

function item(): Item {
  return {
    id: "item-1",
    organizationId: "org-1",
    name: "Tracked Item",
    description: null,
    sku: "TRK",
    type: "PRODUCT",
    status: "ACTIVE",
    sellingPrice: "10.0000",
    revenueAccountId: "account-1",
    salesTaxRateId: "tax-1",
    purchaseCost: null,
    expenseAccountId: null,
    purchaseTaxRateId: null,
    inventoryTracking: true,
    trackingMode: "SERIAL_AND_BATCH",
    expiryTrackingEnabled: true,
    binTrackingEnabled: true,
    reorderPoint: null,
    reorderQuantity: null,
    revenueAccount: { id: "account-1", code: "4000", name: "Sales", type: "REVENUE" },
    salesTaxRate: { id: "tax-1", name: "VAT 15%", rate: "15.0000", scope: "SALES" },
  };
}

function account(): Account {
  return {
    id: "account-1",
    organizationId: "org-1",
    code: "4000",
    name: "Sales",
    type: "REVENUE",
    parentId: null,
    description: null,
    isActive: true,
    isSystem: false,
    allowPosting: true,
  };
}

function taxRate(): TaxRate {
  return {
    id: "tax-1",
    organizationId: "org-1",
    name: "VAT 15%",
    scope: "SALES",
    category: "STANDARD",
    rate: "15.0000",
    description: null,
    isActive: true,
    isSystem: false,
  };
}

function balance(): InventoryBalance {
  return {
    item: item(),
    warehouse: { id: "warehouse-1", code: "MAIN", name: "Main", status: "ACTIVE", isDefault: true },
    quantityOnHand: "1.0000",
    averageUnitCost: null,
    inventoryValue: null,
  };
}
