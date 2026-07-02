import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import InventoryAdjustmentsPage from "./adjustments/page";
import InventoryBalancesPage from "./balances/page";
import PurchaseReceiptsPage from "./purchase-receipts/page";
import SalesStockIssuesPage from "./sales-stock-issues/page";
import StockMovementsPage from "./stock-movements/page";
import NewStockMovementPage from "./stock-movements/new/page";
import WarehouseTransfersPage from "./transfers/page";
import WarehousesPage from "./warehouses/page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type {
  InventoryAdjustment,
  InventoryBalance,
  Item,
  PurchaseReceipt,
  SalesStockIssue,
  StockMovement,
  Warehouse,
  WarehouseTransfer,
} from "@/lib/types";

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

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: Permission) => currentPermissions.has(permission),
  }),
}));

describe("inventory list workflow actions", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentPermissions = new Set([
      PERMISSIONS.inventory.view,
      PERMISSIONS.inventoryAdjustments.create,
      PERMISSIONS.purchaseReceiving.create,
      PERMISSIONS.salesStockIssue.create,
      PERMISSIONS.warehouseTransfers.create,
      PERMISSIONS.warehouses.manage,
    ]);
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/warehouses") return Promise.resolve([warehouseFixture(), warehouseFixture({ id: "warehouse-2", code: "OLD", name: "Archived Warehouse", status: "ARCHIVED", isDefault: false })]);
      if (path === "/inventory-adjustments") return Promise.resolve([adjustmentFixture()]);
      if (path === "/purchase-receipts") return Promise.resolve([purchaseReceiptFixture()]);
      if (path === "/sales-stock-issues") return Promise.resolve([salesStockIssueFixture()]);
      if (path === "/warehouse-transfers") return Promise.resolve([warehouseTransferFixture()]);
      if (path === "/stock-movements") return Promise.resolve([stockMovementFixture()]);
      if (path === "/inventory/balances") return Promise.resolve([balanceFixture()]);
      if (path === "/items") return Promise.resolve([itemFixture()]);
      return Promise.resolve([]);
    });
  });

  it("labels warehouse row actions with the selected warehouse", async () => {
    render(<WarehousesPage />);

    expect(await screen.findByRole("link", { name: "View warehouse WH Main Warehouse" })).toHaveAttribute("href", "/inventory/warehouses/warehouse-1");
    expect(screen.getByRole("button", { name: "Archive warehouse WH Main Warehouse" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reactivate warehouse OLD Archived Warehouse" })).toBeInTheDocument();
  });

  it("labels inventory document drilldowns with their document numbers", async () => {
    const { rerender } = render(<InventoryAdjustmentsPage />);

    expect(await screen.findByRole("link", { name: "View adjustment ADJ-001" })).toHaveAttribute("href", "/inventory/adjustments/adjustment-1");

    rerender(<PurchaseReceiptsPage />);
    expect(await screen.findByRole("link", { name: "View purchase receipt PR-001" })).toHaveAttribute("href", "/inventory/purchase-receipts/receipt-1");

    rerender(<SalesStockIssuesPage />);
    expect(await screen.findByRole("link", { name: "View stock issue SSI-001" })).toHaveAttribute("href", "/inventory/sales-stock-issues/issue-1");

    rerender(<WarehouseTransfersPage />);
    expect(await screen.findByRole("link", { name: "View transfer TR-001" })).toHaveAttribute("href", "/inventory/transfers/transfer-1");
  });

  it("uses shared inventory action buttons and row-specific FIFO links on balances", async () => {
    render(<InventoryBalancesPage />);

    expect(await screen.findByRole("link", { name: "Open FIFO preview for Tracked Item in WH Main Warehouse" })).toHaveAttribute(
      "href",
      "/inventory/fifo-preview?itemId=item-1&warehouseId=warehouse-1",
    );
    expect(screen.getByRole("link", { name: "Create adjustment" })).toHaveAttribute("href", "/inventory/adjustments/new");
    expect(screen.getByRole("link", { name: "Create transfer" })).toHaveAttribute("href", "/inventory/transfers/new");
  });

  it("labels stock movement FIFO and traceability row actions with movement context", async () => {
    render(<StockMovementsPage />);

    expect(await screen.findByRole("link", { name: "Open FIFO preview for Tracked Item in WH" })).toHaveAttribute(
      "href",
      "/inventory/fifo-preview?itemId=item-1&warehouseId=warehouse-1",
    );
    expect(screen.getByRole("link", { name: "Open traceability for Tracked Item" })).toHaveAttribute("href", "/inventory/traceability/items/item-1");
  });

  it("uses explicit stock movement back navigation", async () => {
    render(<NewStockMovementPage />);

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith("/items");
    });

    expect(screen.getByRole("link", { name: "Back to stock movements" })).toHaveAttribute("href", "/inventory/stock-movements");
  });
});

function warehouseFixture(overrides: Partial<Warehouse> = {}): Warehouse {
  return {
    id: "warehouse-1",
    organizationId: "org-1",
    code: "WH",
    name: "Main Warehouse",
    status: "ACTIVE",
    addressLine1: null,
    addressLine2: null,
    city: "Riyadh",
    countryCode: "SA",
    phone: null,
    isDefault: true,
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    ...overrides,
  };
}

function itemFixture(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    organizationId: "org-1",
    name: "Tracked Item",
    description: null,
    sku: "SKU-1",
    type: "PRODUCT",
    status: "ACTIVE",
    sellingPrice: "10.0000",
    revenueAccountId: "account-1",
    salesTaxRateId: null,
    purchaseCost: null,
    expenseAccountId: null,
    purchaseTaxRateId: null,
    inventoryTracking: true,
    trackingMode: "NONE",
    expiryTrackingEnabled: false,
    binTrackingEnabled: false,
    reorderPoint: null,
    reorderQuantity: null,
    salesTaxRate: null,
    ...overrides,
  };
}

function balanceFixture(): InventoryBalance {
  return {
    item: itemFixture(),
    warehouse: warehouseFixture(),
    quantityOnHand: "3.0000",
    averageUnitCost: "5.0000",
    inventoryValue: "15.0000",
  };
}

function adjustmentFixture(): InventoryAdjustment {
  return {
    id: "adjustment-1",
    organizationId: "org-1",
    adjustmentNumber: "ADJ-001",
    itemId: "item-1",
    warehouseId: "warehouse-1",
    type: "INCREASE",
    status: "DRAFT",
    adjustmentDate: "2026-06-01T00:00:00.000Z",
    quantity: "3.0000",
    unitCost: null,
    totalCost: null,
    reason: null,
    createdById: null,
    approvedById: null,
    voidedById: null,
    approvedAt: null,
    voidedAt: null,
    stockMovementId: null,
    voidStockMovementId: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    item: itemFixture(),
    warehouse: warehouseFixture(),
    stockMovement: null,
    voidStockMovement: null,
    createdBy: null,
    approvedBy: null,
    voidedBy: null,
  };
}

function purchaseReceiptFixture(): PurchaseReceipt {
  return {
    id: "receipt-1",
    organizationId: "org-1",
    receiptNumber: "PR-001",
    purchaseOrderId: null,
    purchaseBillId: null,
    supplierId: "supplier-1",
    warehouseId: "warehouse-1",
    receiptDate: "2026-06-01T00:00:00.000Z",
    status: "POSTED",
    notes: null,
    createdById: null,
    inventoryAssetJournalEntryId: null,
    inventoryAssetReversalJournalEntryId: null,
    inventoryAssetPostedAt: null,
    inventoryAssetPostedById: null,
    inventoryAssetReversedAt: null,
    inventoryAssetReversedById: null,
    postedAt: "2026-06-01T00:00:00.000Z",
    voidedAt: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    supplier: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER", taxNumber: null },
    warehouse: warehouseFixture(),
    purchaseOrder: null,
    purchaseBill: null,
    lines: [],
    createdBy: null,
    inventoryAssetJournalEntry: null,
    inventoryAssetReversalJournalEntry: null,
    inventoryAssetPostedBy: null,
    inventoryAssetReversedBy: null,
  };
}

function salesStockIssueFixture(): SalesStockIssue {
  return {
    id: "issue-1",
    organizationId: "org-1",
    issueNumber: "SSI-001",
    salesInvoiceId: "invoice-1",
    customerId: "customer-1",
    warehouseId: "warehouse-1",
    issueDate: "2026-06-01T00:00:00.000Z",
    status: "POSTED",
    notes: null,
    createdById: null,
    postedAt: "2026-06-01T00:00:00.000Z",
    voidedAt: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null },
    warehouse: warehouseFixture(),
    salesInvoice: { id: "invoice-1", invoiceNumber: "INV-001", status: "FINALIZED", issueDate: "2026-06-01T00:00:00.000Z", total: "100.0000" },
    lines: [],
    createdBy: null,
    cogsJournalEntry: null,
    cogsReversalJournalEntry: null,
    cogsPostedBy: null,
    cogsReversedBy: null,
  };
}

function warehouseTransferFixture(): WarehouseTransfer {
  return {
    id: "transfer-1",
    organizationId: "org-1",
    transferNumber: "TR-001",
    itemId: "item-1",
    fromWarehouseId: "warehouse-1",
    toWarehouseId: "warehouse-2",
    status: "POSTED",
    transferDate: "2026-06-01T00:00:00.000Z",
    quantity: "3.0000",
    unitCost: null,
    totalCost: null,
    description: null,
    createdById: null,
    postedAt: "2026-06-01T00:00:00.000Z",
    voidedAt: null,
    fromStockMovementId: null,
    toStockMovementId: null,
    voidFromStockMovementId: null,
    voidToStockMovementId: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    item: itemFixture(),
    fromWarehouse: warehouseFixture(),
    toWarehouse: warehouseFixture({ id: "warehouse-2", code: "DST", name: "Destination Warehouse", isDefault: false }),
    fromStockMovement: null,
    toStockMovement: null,
    voidFromStockMovement: null,
    voidToStockMovement: null,
    createdBy: null,
  };
}

function stockMovementFixture(): StockMovement {
  return {
    id: "movement-1",
    organizationId: "org-1",
    itemId: "item-1",
    warehouseId: "warehouse-1",
    movementDate: "2026-06-01T00:00:00.000Z",
    type: "OPENING_BALANCE",
    quantity: "3.0000",
    unitCost: "5.0000",
    totalCost: "15.0000",
    referenceType: "manual",
    referenceId: null,
    batchId: null,
    serialNumberId: null,
    binLocationId: null,
    fromBinLocationId: null,
    toBinLocationId: null,
    description: "Opening count",
    createdById: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    item: itemFixture(),
    warehouse: warehouseFixture(),
    batch: null,
    serialNumber: null,
    binLocation: null,
    fromBinLocation: null,
    toBinLocation: null,
    createdBy: null,
  };
}
