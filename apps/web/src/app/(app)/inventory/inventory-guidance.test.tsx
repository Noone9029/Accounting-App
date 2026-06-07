import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { InventoryAdjustmentWorkflowGuidance } from "./adjustments/[id]/page";
import { InventoryBalanceGuidance } from "./balances/page";
import { LowStockReportGuidance } from "./reports/low-stock/page";
import { InventoryMovementReportGuidance } from "./reports/movement-summary/page";
import { StockValuationReportGuidance } from "./reports/stock-valuation/page";
import { SalesStockIssueWorkflowGuidance } from "./sales-stock-issues/[id]/page";
import { StockMovementLedgerGuidance } from "./stock-movements/page";
import { NewWarehouseTransferGuidance } from "./transfers/new/page";
import { WarehouseTransferWorkflowGuidance } from "./transfers/[id]/page";
import { WarehouseInventoryGuidance } from "./warehouses/[id]/page";
import type { InventoryAdjustment, PurchaseReceipt, SalesStockIssue, Warehouse, WarehouseTransfer } from "@/lib/types";
import { PurchaseReceiptWorkflowGuidance } from "./purchase-receipts/[id]/page";

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

describe("inventory workflow guidance", () => {
  it("explains warehouse stock movement and next actions", () => {
    render(
      <WarehouseInventoryGuidance
        warehouse={warehouseFixture()}
        canCreateAdjustment
        canCreateTransfer
        canViewFifoPreview
        hasBalances={false}
        hasMovements={false}
      />,
    );

    expect(screen.getByText("How to read this warehouse")).toBeInTheDocument();
    expect(screen.getByText(/Receipts, increases, and transfer-ins add stock/)).toBeInTheDocument();
    expect(screen.getByText(/manual financial posting action/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create adjustment" })).toHaveAttribute("href", "/inventory/adjustments/new");
    expect(screen.getByRole("link", { name: "Stock movements" })).toHaveAttribute("href", "/inventory/stock-movements?warehouseId=warehouse-1");
  });

  it("explains purchase receipt stock and manual asset posting boundaries", () => {
    render(
      <PurchaseReceiptWorkflowGuidance
        receipt={purchaseReceiptFixture()}
        preview={null}
        canVoid
        canPostAsset
        canReverseAsset
        actionLoading={false}
        onVoid={jest.fn()}
        onPostAsset={jest.fn()}
        onReverseAsset={jest.fn()}
      />,
    );

    expect(screen.getByText("What happened?")).toBeInTheDocument();
    expect(screen.getByText(/increases stock in WH Main Warehouse/)).toBeInTheDocument();
    expect(screen.getByText(/Inventory asset accounting is manual only/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View warehouse" })).toHaveAttribute("href", "/inventory/warehouses/warehouse-1");
    expect(screen.getByRole("link", { name: "Inventory report" })).toHaveAttribute("href", "/inventory/reports/movement-summary");
  });

  it("explains sales stock issue and manual COGS boundaries", () => {
    render(
      <SalesStockIssueWorkflowGuidance
        issue={salesStockIssueFixture()}
        preview={null}
        canVoid
        canPostCogs
        canReverseCogs
        actionLoading={false}
        onVoid={jest.fn()}
        onPostCogs={jest.fn()}
        onReverseCogs={jest.fn()}
      />,
    );

    expect(screen.getByText(/decreases inventory in WH Main Warehouse/)).toBeInTheDocument();
    expect(screen.getByText(/COGS accounting is manual only/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View invoice" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
  });

  it("explains adjustments, transfers, and stock ledger without changing behavior", () => {
    render(
      <>
        <InventoryAdjustmentWorkflowGuidance
          adjustment={inventoryAdjustmentFixture()}
          canApprove
          canVoid
          actionLoading={false}
          onApprove={jest.fn()}
          onVoid={jest.fn()}
        />
        <WarehouseTransferWorkflowGuidance transfer={warehouseTransferFixture()} canVoid actionLoading={false} onVoid={jest.fn()} />
        <StockMovementLedgerGuidance canCreate canViewFifoPreview />
      </>,
    );

    expect(screen.getByText(/Draft adjustments do not move stock/)).toBeInTheDocument();
    expect(screen.getByText(/same quantity increases in TO Destination Warehouse/)).toBeInTheDocument();
    expect(screen.getByText(/In increases on-hand quantity/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Source warehouse" })).toHaveAttribute("href", "/inventory/warehouses/from-warehouse");
    expect(screen.getByRole("link", { name: "New movement" })).toHaveAttribute("href", "/inventory/stock-movements/new");
  });

  it("explains inventory reports and operational valuation limits", () => {
    render(
      <>
        <InventoryBalanceGuidance canCreateAdjustment canCreateTransfer />
        <InventoryMovementReportGuidance />
        <StockValuationReportGuidance />
        <LowStockReportGuidance />
        <NewWarehouseTransferGuidance />
      </>,
    );

    expect(screen.getByText("How to read balances")).toBeInTheDocument();
    expect(screen.getByText(/Opening is the quantity before the selected period/)).toBeInTheDocument();
    expect(screen.getByText(/not a VAT, COGS, or financial statement posting/)).toBeInTheDocument();
    expect(screen.getByText(/not an automatic purchase order or valuation posting/)).toBeInTheDocument();
    expect(screen.getByText(/destination warehouse receives the same quantity/)).toBeInTheDocument();
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
    city: null,
    countryCode: "SA",
    phone: null,
    isDefault: true,
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    ...overrides,
  };
}

function purchaseReceiptFixture(overrides: Partial<PurchaseReceipt> = {}): PurchaseReceipt {
  return {
    id: "receipt-1",
    organizationId: "org-1",
    receiptNumber: "PR-001",
    purchaseOrderId: null,
    purchaseBillId: null,
    supplierId: "supplier-1",
    warehouseId: "warehouse-1",
    receiptDate: "2026-05-21T00:00:00.000Z",
    status: "POSTED",
    notes: null,
    createdById: null,
    inventoryAssetJournalEntryId: null,
    inventoryAssetReversalJournalEntryId: null,
    inventoryAssetPostedAt: null,
    inventoryAssetPostedById: null,
    inventoryAssetReversedAt: null,
    inventoryAssetReversedById: null,
    postedAt: "2026-05-21T00:00:00.000Z",
    voidedAt: null,
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    supplier: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER", taxNumber: null },
    warehouse: { id: "warehouse-1", code: "WH", name: "Main Warehouse", status: "ACTIVE", isDefault: true },
    purchaseOrder: null,
    purchaseBill: null,
    lines: [],
    createdBy: null,
    inventoryAssetJournalEntry: null,
    inventoryAssetReversalJournalEntry: null,
    inventoryAssetPostedBy: null,
    inventoryAssetReversedBy: null,
    ...overrides,
  };
}

function salesStockIssueFixture(overrides: Partial<SalesStockIssue> = {}): SalesStockIssue {
  return {
    id: "issue-1",
    organizationId: "org-1",
    issueNumber: "SSI-001",
    salesInvoiceId: "invoice-1",
    customerId: "customer-1",
    warehouseId: "warehouse-1",
    issueDate: "2026-05-21T00:00:00.000Z",
    status: "POSTED",
    notes: null,
    createdById: null,
    postedAt: "2026-05-21T00:00:00.000Z",
    voidedAt: null,
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null },
    warehouse: { id: "warehouse-1", code: "WH", name: "Main Warehouse", status: "ACTIVE", isDefault: true },
    salesInvoice: { id: "invoice-1", invoiceNumber: "INV-001", status: "FINALIZED", issueDate: "2026-05-21T00:00:00.000Z", total: "100.0000" },
    lines: [],
    createdBy: null,
    cogsJournalEntry: null,
    cogsReversalJournalEntry: null,
    cogsPostedBy: null,
    cogsReversedBy: null,
    ...overrides,
  };
}

function inventoryAdjustmentFixture(overrides: Partial<InventoryAdjustment> = {}): InventoryAdjustment {
  return {
    id: "adjustment-1",
    organizationId: "org-1",
    adjustmentNumber: "ADJ-001",
    itemId: "item-1",
    warehouseId: "warehouse-1",
    type: "INCREASE",
    status: "DRAFT",
    adjustmentDate: "2026-05-21T00:00:00.000Z",
    quantity: "5.0000",
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
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    item: { id: "item-1", name: "Tracked Item", sku: "SKU-1", type: "PRODUCT", status: "ACTIVE", inventoryTracking: true },
    warehouse: { id: "warehouse-1", code: "WH", name: "Main Warehouse", status: "ACTIVE", isDefault: true },
    stockMovement: null,
    voidStockMovement: null,
    createdBy: null,
    approvedBy: null,
    voidedBy: null,
    ...overrides,
  };
}

function warehouseTransferFixture(overrides: Partial<WarehouseTransfer> = {}): WarehouseTransfer {
  return {
    id: "transfer-1",
    organizationId: "org-1",
    transferNumber: "TR-001",
    itemId: "item-1",
    fromWarehouseId: "from-warehouse",
    toWarehouseId: "to-warehouse",
    status: "POSTED",
    transferDate: "2026-05-21T00:00:00.000Z",
    quantity: "2.0000",
    unitCost: null,
    totalCost: null,
    description: null,
    createdById: null,
    postedAt: "2026-05-21T00:00:00.000Z",
    voidedAt: null,
    fromStockMovementId: null,
    toStockMovementId: null,
    voidFromStockMovementId: null,
    voidToStockMovementId: null,
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    item: { id: "item-1", name: "Tracked Item", sku: "SKU-1", type: "PRODUCT", status: "ACTIVE", inventoryTracking: true },
    fromWarehouse: { id: "from-warehouse", code: "FROM", name: "Source Warehouse", status: "ACTIVE", isDefault: false },
    toWarehouse: { id: "to-warehouse", code: "TO", name: "Destination Warehouse", status: "ACTIVE", isDefault: false },
    fromStockMovement: null,
    toStockMovement: null,
    voidFromStockMovement: null,
    voidToStockMovement: null,
    createdBy: null,
    ...overrides,
  };
}
