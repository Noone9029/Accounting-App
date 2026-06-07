import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import {
  BatchNewPage,
  BinLocationsListPage,
  ItemTraceabilityPage,
  SerialNumberDetailPage,
} from "./traceability-setup-pages";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { InventoryBatch, InventoryBinLocation, InventorySerialNumber, InventoryTraceabilityResponse, Item, Warehouse } from "@/lib/types";

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

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
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

describe("inventory traceability setup pages", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentPermissions = new Set([PERMISSIONS.inventory.view, PERMISSIONS.inventory.manage]);
  });

  it("renders bin location list, safe helper text, and create link", async () => {
    apiRequestMock.mockResolvedValue([binLocation()]);

    render(<BinLocationsListPage />);

    expect(screen.getByRole("heading", { name: "Bin Locations" })).toBeInTheDocument();
    expect(screen.getByText(/Tracking settings add operational traceability/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New bin/location" })).toHaveAttribute("href", "/inventory/bin-locations/new");
    expect(await screen.findByText("A-01")).toBeInTheDocument();
    expect(screen.getByText("In Transit")).toBeInTheDocument();
  });

  it("submits the batch create form without unsafe wording", async () => {
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/items") return Promise.resolve([item({ trackingMode: "BATCH", expiryTrackingEnabled: true })]);
      if (path === "/inventory/batches" && options?.method === "POST") return Promise.resolve(batch());
      return Promise.resolve([]);
    });

    render(<BatchNewPage />);

    await screen.findByText(/Tracked Item/);
    const itemSelect = screen.getByLabelText("Item") as HTMLSelectElement;
    fireEvent.change(itemSelect, { target: { value: "item-1" } });
    expect(itemSelect.value).toBe("item-1");
    fireEvent.change(screen.getByLabelText("Batch number"), { target: { value: "B-100" } });
    fireEvent.change(screen.getByLabelText("Expiry date"), { target: { value: "2026-12-31" } });
    const submitButton = screen.getByRole("button", { name: "Create batch/lot" });
    fireEvent.submit(submitButton.closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith("/inventory/batches", {
        method: "POST",
        body: expect.objectContaining({ itemId: "item-1", batchNumber: "B-100", expiryDate: "2026-12-31" }),
      });
    });
    expect(screen.queryByText(/activate FIFO/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/post COGS/i)).not.toBeInTheDocument();
  });

  it("renders serial detail as read-only when inventory manage is missing", async () => {
    currentPermissions = new Set([PERMISSIONS.inventory.view]);
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/items") return Promise.resolve([item({ trackingMode: "SERIAL" })]);
      if (path === "/inventory/batches") return Promise.resolve([batch()]);
      if (path === "/warehouses") return Promise.resolve([warehouse()]);
      if (path === "/inventory/bin-locations") return Promise.resolve([binLocation()]);
      if (path === "/inventory/serial-numbers/serial-1") return Promise.resolve(serialNumber());
      return Promise.resolve([]);
    });

    render(<SerialNumberDetailPage id="serial-1" />);

    expect(await screen.findByDisplayValue("SN-001")).toBeInTheDocument();
    expect(screen.getByText(/Create and update actions require inventory manage permission/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save serial number" })).not.toBeInTheDocument();
  });

  it("renders item traceability warnings, batches, serials, movements, and safe limitations", async () => {
    apiRequestMock.mockResolvedValue(traceabilityResponse());

    render(<ItemTraceabilityPage itemId="item-1" />);

    expect(await screen.findByRole("heading", { name: "Item Traceability" })).toBeInTheDocument();
    expect(screen.getByText("Serial and batch")).toBeInTheDocument();
    expect(screen.getByText("Some existing movements do not carry the selected tracking metadata.")).toBeInTheDocument();
    expect(screen.getAllByText("B-100").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SN-001").length).toBeGreaterThan(0);
    expect(screen.getByText("Purchase Receipt Placeholder")).toBeInTheDocument();
    expect(screen.getByText(/does not post journals, change FIFO preview behavior, update valuation/i)).toBeInTheDocument();
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
    sellingPrice: "0.0000",
    revenueAccountId: "revenue-1",
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
    ...overrides,
  };
}

function warehouse(): Warehouse {
  return {
    id: "warehouse-1",
    organizationId: "org-1",
    code: "MAIN",
    name: "Main warehouse",
    status: "ACTIVE",
    addressLine1: null,
    addressLine2: null,
    city: null,
    countryCode: "SA",
    phone: null,
    isDefault: true,
    createdAt: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
  };
}

function binLocation(): InventoryBinLocation {
  return {
    id: "bin-1",
    organizationId: "org-1",
    warehouseId: "warehouse-1",
    code: "A-01",
    name: "Aisle 01",
    type: "IN_TRANSIT",
    status: "ACTIVE",
    description: null,
    createdAt: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
    warehouse: { id: "warehouse-1", code: "MAIN", name: "Main warehouse", status: "ACTIVE" },
  };
}

function batch(): InventoryBatch {
  return {
    id: "batch-1",
    organizationId: "org-1",
    itemId: "item-1",
    batchNumber: "B-100",
    lotNumber: "LOT-1",
    manufactureDate: null,
    expiryDate: "2026-12-31T00:00:00.000Z",
    status: "ACTIVE",
    notes: null,
    createdAt: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
    item: item({ trackingMode: "BATCH" }),
  };
}

function serialNumber(): InventorySerialNumber {
  return {
    id: "serial-1",
    organizationId: "org-1",
    itemId: "item-1",
    serialNumber: "SN-001",
    batchId: "batch-1",
    status: "AVAILABLE",
    currentWarehouseId: "warehouse-1",
    currentBinLocationId: "bin-1",
    lastMovementId: null,
    createdAt: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
    item: item({ trackingMode: "SERIAL" }),
    batch: batch(),
    currentWarehouse: { id: "warehouse-1", code: "MAIN", name: "Main warehouse", status: "ACTIVE" },
    currentBinLocation: { id: "bin-1", warehouseId: "warehouse-1", code: "A-01", name: "Aisle 01", type: "BIN", status: "ACTIVE" },
    lastMovement: null,
  };
}

function traceabilityResponse(): InventoryTraceabilityResponse {
  return {
    item: item({ trackingMode: "SERIAL_AND_BATCH", expiryTrackingEnabled: true, binTrackingEnabled: true }),
    trackingMode: "SERIAL_AND_BATCH",
    expiryTrackingEnabled: true,
    binTrackingEnabled: true,
    hasStockMovements: true,
    movementCount: 1,
    batches: [batch()],
    serialNumbers: [serialNumber()],
    warehouses: [{ id: "warehouse-1", code: "MAIN", name: "Main warehouse", status: "ACTIVE" }],
    binLocations: [binLocation()],
    movements: [
      {
        id: "movement-1",
        movementDate: "2026-06-06T00:00:00.000Z",
        type: "PURCHASE_RECEIPT_PLACEHOLDER",
        quantity: "1.0000",
        warehouseId: "warehouse-1",
        batchId: null,
        serialNumberId: null,
        binLocationId: null,
        fromBinLocationId: null,
        toBinLocationId: null,
        referenceType: "PurchaseReceipt",
        referenceId: "receipt-1",
        warehouse: { id: "warehouse-1", code: "MAIN", name: "Main warehouse" },
        batch: null,
        serialNumber: null,
        binLocation: null,
        fromBinLocation: null,
        toBinLocation: null,
      },
    ],
    warnings: [
      "Tracking settings add operational traceability. They do not change historical inventory valuation, FIFO preview, COGS, journals, VAT, or financial statements.",
      "Some existing movements do not carry the selected tracking metadata.",
    ],
    readOnly: true,
    noMutation: true,
    noPostingEffect: true,
    noInventoryValuationEffect: true,
    noFifoActivation: true,
    noCogsEffect: true,
    noApEffect: true,
    noArEffect: true,
    noVatEffect: true,
    noZatcaEffect: true,
    noFinancialStatementEffect: true,
  };
}
