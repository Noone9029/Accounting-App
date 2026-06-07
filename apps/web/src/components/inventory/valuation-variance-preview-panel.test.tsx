import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { ValuationVariancePreviewPanel } from "./valuation-variance-preview-panel";
import type { InventoryValuationVariancePreviewResponse } from "@/lib/types";

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

describe("ValuationVariancePreviewPanel", () => {
  it("renders preview amount, safe labels, link, and non-posting helper text", () => {
    render(<ValuationVariancePreviewPanel preview={previewResponse()} href="/inventory/valuation-variances?purchaseReceiptId=receipt-1" />);

    expect(screen.getByText("Valuation variance preview")).toBeInTheDocument();
    expect(screen.getByText(/does not post journals, update inventory valuation, change AP balances, or book variances/i)).toBeInTheDocument();
    expect(screen.getAllByText("20.0000").length).toBeGreaterThan(0);
    expect(screen.getByText("Price variance")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open valuation variance preview" })).toHaveAttribute(
      "href",
      "/inventory/valuation-variances?purchaseReceiptId=receipt-1",
    );
    expect(screen.queryByText(/production-ready|post variance/i)).not.toBeInTheDocument();
  });
});

function previewResponse(): InventoryValuationVariancePreviewResponse {
  const item = {
    id: "variance-1",
    supplier: { id: "supplier-1", name: "Example Supplier", displayName: "Example Supplier" },
    item: { id: "item-1", name: "Tracked item", sku: "TRK", inventoryTracking: true },
    lineDescription: "Tracked item",
    purchaseOrder: null,
    purchaseBill: null,
    purchaseReceipt: null,
    purchaseReturn: null,
    matchingReview: null,
    sourceType: "purchaseReceipt" as const,
    sourceId: "receipt-1",
    sourceNumber: "PRC-000001",
    sourceHref: "/inventory/purchase-receipts/receipt-1",
    sourceDocumentLinks: [],
    orderedQuantity: "10.0000",
    receivedQuantity: "10.0000",
    billedQuantity: "10.0000",
    returnedQuantity: "0.0000",
    receiptUnitCost: "12.0000",
    billUnitCost: "10.0000",
    expectedValue: "100.0000",
    receivedValue: "120.0000",
    billedValue: "100.0000",
    returnedValue: "0.0000",
    varianceQuantity: "0.0000",
    varianceAmount: "20.0000",
    varianceType: "PRICE_VARIANCE" as const,
    severity: "HIGH" as const,
    status: "NEEDS_ACCOUNTANT_REVIEW" as const,
    suggestedReviewAction: "Review receipt and bill unit cost before any accountant variance policy decision.",
    warnings: [],
    returnRelated: false,
    matchingReviewRelated: false,
    latestRelevantDate: "2026-06-05T00:00:00.000Z",
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
      criticalCount: 0,
      highCount: 1,
      suppliersAffected: 1,
      itemsAffected: 1,
      returnRelatedVarianceCount: 0,
      matchingReviewRelatedVarianceCount: 0,
    },
    supplierGroups: [],
    items: [item],
    warnings: [],
  };
}
