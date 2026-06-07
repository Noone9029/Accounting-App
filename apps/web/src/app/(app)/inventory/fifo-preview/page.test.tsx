import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import InventoryFifoPreviewPage from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { InventoryFifoPreviewResponse } from "@/lib/types";

const apiRequestMock = jest.fn();
let currentPermissions = new Set<Permission>();
let currentSearchParams = new URLSearchParams();

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
  useSearchParams: () => currentSearchParams,
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
    canAny: (...permissions: Permission[]) => permissions.some((permission) => currentPermissions.has(permission)),
  }),
}));

describe("InventoryFifoPreviewPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentSearchParams = new URLSearchParams();
    currentPermissions = new Set([PERMISSIONS.inventory.view, PERMISSIONS.purchaseReceiving.view, PERMISSIONS.salesStockIssue.view]);
  });

  it("renders FIFO preview filters, summary, layers, consumption preview, warnings, and safe helper text", async () => {
    currentSearchParams = new URLSearchParams("itemId=item-1&warehouseId=warehouse-1&asOfDate=2026-06-06");
    apiRequestMock.mockResolvedValue(fifoPreviewResponse());

    render(<InventoryFifoPreviewPage />);

    expect(screen.getByRole("heading", { name: "FIFO Cost-Layer Preview" })).toBeInTheDocument();
    expect(screen.getByText(/FIFO preview reconstructs possible cost layers from existing inventory movements/i)).toBeInTheDocument();
    expect(screen.getByText(/does not change inventory valuation, moving average, COGS, journals, VAT, ZATCA, AP, AR/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Item")).toHaveValue("item-1");
    expect(screen.getByLabelText("Warehouse")).toHaveValue("warehouse-1");
    expect(screen.getByLabelText("As-of date")).toHaveValue("2026-06-06");

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith("/inventory/fifo-preview?itemId=item-1&warehouseId=warehouse-1&asOfDate=2026-06-06");
    });

    expect(await screen.findByText("FIFO preview value")).toBeInTheDocument();
    expect(screen.getByText("Layer table")).toBeInTheDocument();
    expect(screen.getAllByText("Tracked Item").length).toBeGreaterThan(0);
    expect(screen.getByText("Purchase Receipt Placeholder")).toBeInTheDocument();
    expect(screen.getByText("Consumption preview")).toBeInTheDocument();
    expect(screen.getByText("Sales Issue Placeholder")).toBeInTheDocument();
    expect(screen.getByText("Missing unit cost")).toBeInTheDocument();
    expect(screen.getByText("Safe limitations")).toBeInTheDocument();
    expect(screen.getByText(/does not persist active cost layers/i)).toBeInTheDocument();
  });

  it("applies filters without invoking mutation actions", async () => {
    apiRequestMock.mockResolvedValue(fifoPreviewResponse());

    render(<InventoryFifoPreviewPage />);
    await screen.findByText("Layer table");

    fireEvent.change(screen.getByLabelText("Item"), { target: { value: "item-2" } });
    fireEvent.change(screen.getByLabelText("Warehouse"), { target: { value: "warehouse-2" } });
    fireEvent.change(screen.getByLabelText("As-of date"), { target: { value: "2026-06-05" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith("/inventory/fifo-preview?itemId=item-2&warehouseId=warehouse-2&asOfDate=2026-06-05");
    });

    expect(screen.queryByRole("button", { name: /post/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /switch/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/production-ready FIFO/i)).not.toBeInTheDocument();
  });

  it("shows source document links only when the role has source permissions", async () => {
    apiRequestMock.mockResolvedValue(fifoPreviewResponse());

    const { unmount } = render(<InventoryFifoPreviewPage />);

    expect(await screen.findByRole("link", { name: "Purchase receipt receipt-1" })).toHaveAttribute("href", "/inventory/purchase-receipts/receipt-1");

    unmount();
    currentPermissions = new Set([PERMISSIONS.inventory.view]);
    apiRequestMock.mockResolvedValue(fifoPreviewResponse());
    render(<InventoryFifoPreviewPage />);

    expect(await screen.findByText("Purchase receipt receipt-1")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Purchase receipt receipt-1" })).not.toBeInTheDocument();
  });

  it("renders the inventory-view permission gate", () => {
    currentPermissions = new Set([]);
    apiRequestMock.mockResolvedValue(fifoPreviewResponse());

    render(<InventoryFifoPreviewPage />);

    expect(screen.getByText("FIFO cost-layer preview requires inventory view permission.")).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });
});

function fifoPreviewResponse(overrides: Partial<InventoryFifoPreviewResponse> = {}): InventoryFifoPreviewResponse {
  const response: InventoryFifoPreviewResponse = {
    readOnly: true,
    previewOnly: true,
    noMutation: true,
    noPostingEffect: true,
    noInventoryEffect: true,
    noApEffect: true,
    noArEffect: true,
    noVatEffect: true,
    noZatcaEffect: true,
    noFinancialStatementEffect: true,
    generatedAt: "2026-06-06T00:00:00.000Z",
    asOfDate: "2026-06-06T23:59:59.999Z",
    activeValuationMethod: {
      method: "MOVING_AVERAGE",
      note: "Active operational valuation remains moving-average style. FIFO_PREVIEW is informational only and is not the accounting method.",
    },
    previewValuationMethod: "FIFO_PREVIEW",
    filters: { itemId: "item-1", warehouseId: "warehouse-1" },
    rows: [
      {
        item: {
          id: "item-1",
          name: "Tracked Item",
          sku: "TRK",
          type: "PRODUCT",
          status: "ACTIVE",
          inventoryTracking: true,
          reorderPoint: null,
          reorderQuantity: null,
        },
        warehouse: { id: "warehouse-1", code: "MAIN", name: "Main", status: "ACTIVE", isDefault: true },
        totalOnHandQuantity: "3.0000",
        fifoPreviewValue: "18.0000",
        currentOperationalValuationValue: "19.5000",
        differenceFromCurrentOperationalValuation: "-1.5000",
        warnings: [
          {
            type: "MISSING_UNIT_COST",
            severity: "WARNING",
            message: "Inbound movement is missing unit cost or total cost, so FIFO layer value cannot be calculated precisely.",
            movementId: "movement-missing-cost",
            itemId: "item-1",
            warehouseId: "warehouse-1",
          },
        ],
        blockers: [],
        layers: [
          {
            layerId: "layer:receipt-1",
            sourceMovementId: "receipt-movement-1",
            layerDate: "2026-06-01T00:00:00.000Z",
            sourceMovement: {
              movementId: "receipt-movement-1",
              movementDate: "2026-06-01T00:00:00.000Z",
              type: "PURCHASE_RECEIPT_PLACEHOLDER",
              quantity: "5.0000",
              unitCost: "6.0000",
              totalCost: "30.0000",
              referenceType: "PurchaseReceipt",
              referenceId: "receipt-1",
              description: "Purchase receipt PRC-000001",
            },
            sourceDocument: { type: "PurchaseReceipt", id: "receipt-1", href: "/inventory/purchase-receipts/receipt-1" },
            originalQuantity: "5.0000",
            consumedQuantity: "2.0000",
            remainingQuantity: "3.0000",
            unitCost: "6.0000",
            layerValue: "18.0000",
            warnings: [],
          },
        ],
        consumedMovements: [
          {
            movementId: "issue-movement-1",
            movementDate: "2026-06-02T00:00:00.000Z",
            type: "SALES_ISSUE_PLACEHOLDER",
            sourceMovement: {
              movementId: "issue-movement-1",
              movementDate: "2026-06-02T00:00:00.000Z",
              type: "SALES_ISSUE_PLACEHOLDER",
              quantity: "2.0000",
              unitCost: null,
              totalCost: null,
              referenceType: "SalesStockIssue",
              referenceId: "issue-1",
              description: "Sales issue SSI-000001",
            },
            sourceDocument: { type: "SalesStockIssue", id: "issue-1", href: "/inventory/sales-stock-issues/issue-1" },
            consumedQuantity: "2.0000",
            consumedLayers: [{ layerId: "layer:receipt-1", sourceMovementId: "receipt-movement-1", consumedQuantity: "2.0000", unitCost: "6.0000", cost: "12.0000" }],
            estimatedCost: "12.0000",
            warnings: [],
            blockers: [],
          },
        ],
      },
    ],
    warnings: [
      {
        type: "PREVIEW_ONLY_NOT_ACCOUNTING_METHOD",
        severity: "WARNING",
        message: "FIFO preview is read-only and does not change valuation.",
        movementId: null,
        itemId: null,
        warehouseId: null,
      },
      {
        type: "MISSING_UNIT_COST",
        severity: "WARNING",
        message: "Inbound movement is missing unit cost or total cost, so FIFO layer value cannot be calculated precisely.",
        movementId: "movement-missing-cost",
        itemId: "item-1",
        warehouseId: "warehouse-1",
      },
    ],
    blockers: [],
    totals: {
      totalOnHandQuantity: "3.0000",
      fifoPreviewValue: "18.0000",
      currentOperationalValuationValue: "19.5000",
      differenceFromCurrentOperationalValuation: "-1.5000",
      warningCount: 2,
      blockerCount: 0,
    },
  };
  return { ...response, ...overrides };
}
