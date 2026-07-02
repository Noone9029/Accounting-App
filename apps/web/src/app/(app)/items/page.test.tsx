import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      if (path === "/items") {
        return Promise.resolve([
          item(),
          item({
            id: "item-2",
            name: "Implementation Package",
            description: "Fixed-fee setup service",
            sku: "SERV-SETUP",
            type: "SERVICE",
            status: "ACTIVE",
            sellingPrice: "750.0000",
            inventoryTracking: false,
            trackingMode: "NONE",
            expiryTrackingEnabled: false,
            binTrackingEnabled: false,
          }),
          item({
            id: "item-3",
            name: "Legacy Support Retainer",
            description: "Disabled support service",
            sku: "SUP-LEGACY",
            type: "SERVICE",
            status: "DISABLED",
            sellingPrice: "125.0000",
            inventoryTracking: false,
            trackingMode: "NONE",
            expiryTrackingEnabled: false,
            binTrackingEnabled: false,
          }),
        ]);
      }
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
    expect(screen.getByRole("link", { name: "Open traceability for Tracked Item" })).toHaveAttribute("href", "/inventory/traceability/items/item-1");
    expect(screen.getByRole("button", { name: "Edit Tracked Item" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disable Tracked Item" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Tracked Item" })).toBeInTheDocument();
  });

  it("filters the catalog by SKU, description, type, and status without reloading items", async () => {
    render(<ItemsPage />);

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith("/items");
    });
    await screen.findByText("Tracked Item");

    const search = screen.getByRole("searchbox", { name: "Search products and services" });

    fireEvent.change(search, { target: { value: "SERV-SETUP" } });
    expect(screen.getByText("Implementation Package")).toBeInTheDocument();
    expect(screen.queryByText("Tracked Item")).not.toBeInTheDocument();
    expect(screen.queryByText("Legacy Support Retainer")).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "disabled" } });
    expect(screen.getByText("Legacy Support Retainer")).toBeInTheDocument();
    expect(screen.queryByText("Implementation Package")).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "product" } });
    expect(screen.getByText("Tracked Item")).toBeInTheDocument();
    expect(screen.queryByText("Implementation Package")).not.toBeInTheDocument();

    expect(apiRequestMock).toHaveBeenCalledWith("/items");
    expect(apiRequestMock.mock.calls.filter(([path]) => path === "/items")).toHaveLength(1);
  });

  it("shows an empty filtered state while preserving the loaded catalog", async () => {
    render(<ItemsPage />);

    await screen.findByText("Tracked Item");

    fireEvent.change(screen.getByRole("searchbox", { name: "Search products and services" }), { target: { value: "does-not-exist" } });

    expect(screen.getByText("No matching products or services.")).toBeInTheDocument();
    expect(screen.getByText("Clear the search or try a name, SKU, description, type, or status.")).toBeInTheDocument();
    expect(screen.queryByText("Tracked Item")).not.toBeInTheDocument();
  });
});

function item(overrides: Partial<Item> = {}): Item {
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
    ...overrides,
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
