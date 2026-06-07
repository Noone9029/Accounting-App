import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import InventoryValuationVariancesPage from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { InventoryValuationVariancePreviewResponse } from "@/lib/types";

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

describe("InventoryValuationVariancesPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentSearchParams = new URLSearchParams();
    currentPermissions = new Set([
      PERMISSIONS.inventory.view,
      PERMISSIONS.purchaseOrders.view,
      PERMISSIONS.purchaseBills.view,
      PERMISSIONS.purchaseReceiving.view,
      PERMISSIONS.contacts.view,
    ]);
  });

  it("renders summary cards, supplier groups, variance rows, safe labels, and source links", async () => {
    apiRequestMock.mockResolvedValue(previewResponse());

    render(<InventoryValuationVariancesPage />);

    expect(await screen.findByText("Inventory Valuation Variance Preview")).toBeInTheDocument();
    expect(screen.getByText(/It does not post journals, update inventory valuation, change AP balances, or book variances/i)).toBeInTheDocument();
    expect(screen.getByText("Total variance")).toBeInTheDocument();
    expect(screen.getByText("Critical/high review count")).toBeInTheDocument();
    expect(screen.getByText("Return-related variances")).toBeInTheDocument();
    expect(screen.getByText("Matching-review variances")).toBeInTheDocument();
    expect(screen.getAllByText("Example Supplier").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tracked item (TRK)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Price variance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Critical").length).toBeGreaterThan(0);
    expect(screen.getByText(/No posting, inventory valuation, AP balance, supplier credit, refund, or return automation/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Purchase order: PO-000001" })[0]).toHaveAttribute("href", "/purchases/purchase-orders/po-1");
    expect(screen.getAllByRole("link", { name: "Purchase bill: BILL-000001" })[0]).toHaveAttribute("href", "/purchases/bills/bill-1");
    expect(screen.getAllByRole("link", { name: "Purchase receipt: PRC-000001" })[0]).toHaveAttribute("href", "/inventory/purchase-receipts/receipt-1");
    expect(screen.queryByText(/production-ready|post variance/i)).not.toBeInTheDocument();
  });

  it("sends selected filters to the valuation variance endpoint", async () => {
    apiRequestMock.mockResolvedValue(previewResponse());

    render(<InventoryValuationVariancesPage />);
    await screen.findByText("Inventory Valuation Variance Preview");

    fireEvent.change(screen.getByLabelText("Variance type"), { target: { value: "PRICE_VARIANCE" } });
    fireEvent.change(screen.getByLabelText("Severity"), { target: { value: "CRITICAL" } });
    fireEvent.change(screen.getByLabelText("Source type"), { target: { value: "purchaseReceipt" } });
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "PRC-000001" } });

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(expect.stringContaining("varianceType=PRICE_VARIANCE"));
      expect(apiRequestMock).toHaveBeenCalledWith(expect.stringContaining("severity=CRITICAL"));
      expect(apiRequestMock).toHaveBeenCalledWith(expect.stringContaining("sourceType=purchaseReceipt"));
      expect(apiRequestMock).toHaveBeenCalledWith(expect.stringContaining("search=PRC-000001"));
    });
  });

  it("keeps source links hidden when the role lacks source permissions", async () => {
    currentPermissions = new Set([PERMISSIONS.inventory.view]);
    apiRequestMock.mockResolvedValue(previewResponse());

    render(<InventoryValuationVariancesPage />);

    expect(await screen.findByText("Inventory Valuation Variance Preview")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Purchase bill: BILL-000001" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Purchase bill: BILL-000001").length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Purchase receipt: PRC-000001" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Purchase receipt: PRC-000001").length).toBeGreaterThan(0);
  });

  it("uses source query params from matching review links", async () => {
    currentSearchParams = new URLSearchParams("matchingReviewId=review-1");
    apiRequestMock.mockResolvedValue(previewResponse());

    render(<InventoryValuationVariancesPage />);

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith("/inventory/valuation-variances?matchingReviewId=review-1");
    });
  });
});

function previewResponse(): InventoryValuationVariancePreviewResponse {
  const item = {
    id: "variance-1",
    supplier: { id: "supplier-1", name: "Example Supplier", displayName: "Example Supplier" },
    item: { id: "item-1", name: "Tracked item", sku: "TRK", inventoryTracking: true },
    lineDescription: "Tracked item",
    purchaseOrder: { id: "po-1", number: "PO-000001", status: "APPROVED", date: "2026-06-01T00:00:00.000Z", href: "/purchases/purchase-orders/po-1" },
    purchaseBill: { id: "bill-1", number: "BILL-000001", status: "FINALIZED", date: "2026-06-02T00:00:00.000Z", href: "/purchases/bills/bill-1", inventoryPostingMode: "DIRECT_EXPENSE_OR_ASSET" as const },
    purchaseReceipt: { id: "receipt-1", number: "PRC-000001", status: "POSTED", date: "2026-06-03T00:00:00.000Z", href: "/inventory/purchase-receipts/receipt-1" },
    purchaseReturn: {
      id: "return-1",
      purchaseReturnNumber: "PRN-000001",
      status: "SUBMITTED" as const,
      returnDate: "2026-06-04T00:00:00.000Z",
      href: "/purchases/returns/return-1",
    },
    matchingReview: {
      id: "review-1",
      sourceType: "purchaseBill",
      sourceId: "bill-1",
      exceptionType: "BILL_PENDING_RECEIPT",
      severity: "CRITICAL",
      status: "NEEDS_VARIANCE_REVIEW" as const,
      reasonCode: "PRICE_MISMATCH" as const,
      href: "/purchases/matching?reviewStatus=NEEDS_VARIANCE_REVIEW",
    },
    sourceType: "purchaseReceipt" as const,
    sourceId: "receipt-1",
    sourceNumber: "PRC-000001",
    sourceHref: "/inventory/purchase-receipts/receipt-1",
    sourceDocumentLinks: [
      { type: "purchaseOrder" as const, id: "po-1", number: "PO-000001", href: "/purchases/purchase-orders/po-1" },
      { type: "purchaseBill" as const, id: "bill-1", number: "BILL-000001", href: "/purchases/bills/bill-1" },
      { type: "purchaseReceipt" as const, id: "receipt-1", number: "PRC-000001", href: "/inventory/purchase-receipts/receipt-1" },
      { type: "purchaseReturn" as const, id: "return-1", number: "PRN-000001", href: "/purchases/returns/return-1" },
      { type: "matchingReview" as const, id: "review-1", number: "Review review-1", href: "/purchases/matching?reviewStatus=NEEDS_VARIANCE_REVIEW" },
    ],
    orderedQuantity: "10.0000",
    receivedQuantity: "10.0000",
    billedQuantity: "10.0000",
    returnedQuantity: "1.0000",
    receiptUnitCost: "12.0000",
    billUnitCost: "10.0000",
    expectedValue: "100.0000",
    receivedValue: "120.0000",
    billedValue: "100.0000",
    returnedValue: "10.0000",
    varianceQuantity: "0.0000",
    varianceAmount: "20.0000",
    varianceType: "PRICE_VARIANCE" as const,
    severity: "CRITICAL" as const,
    status: "NEEDS_ACCOUNTANT_REVIEW" as const,
    suggestedReviewAction: "Review receipt and bill unit cost before any accountant variance policy decision.",
    warnings: [],
    returnRelated: true,
    matchingReviewRelated: true,
    latestRelevantDate: "2026-06-04T00:00:00.000Z",
  };

  return {
    readOnly: true,
    previewOnly: true,
    noMutation: true,
    noPostingEffect: true,
    noInventoryEffect: true,
    generatedAt: "2026-06-05T00:00:00.000Z",
    filters: { limit: 200 },
    summary: {
      totalVarianceCount: 1,
      totalAbsoluteVarianceAmount: "20.0000",
      positiveVarianceAmount: "20.0000",
      negativeVarianceAmount: "0.0000",
      criticalCount: 1,
      highCount: 0,
      suppliersAffected: 1,
      itemsAffected: 1,
      returnRelatedVarianceCount: 1,
      matchingReviewRelatedVarianceCount: 1,
    },
    supplierGroups: [
      {
        supplierId: "supplier-1",
        supplierName: "Example Supplier",
        totalVarianceAmount: "20.0000",
        varianceCount: 1,
        highestSeverity: "CRITICAL",
        itemsAffected: 1,
        sourceDocumentLinks: item.sourceDocumentLinks,
        items: [item],
      },
    ],
    items: [item],
    warnings: [
      "Valuation variance preview is read-only and preview-only.",
      "No journals, AP balances, purchase bill balances, inventory quantities, moving average, FIFO layers, purchase returns, debit notes, refunds, landed cost, VAT, ZATCA, or email actions are created or changed.",
    ],
  };
}
