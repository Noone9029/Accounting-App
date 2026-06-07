import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { PurchaseMatchingPanel } from "./purchase-matching-panel";
import type { PurchaseMatchingSummary } from "@/lib/types";

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

describe("PurchaseMatchingPanel", () => {
  it("shows read-only matching quantities, warnings, and source links", () => {
    render(<PurchaseMatchingPanel summary={matchingSummary()} />);

    expect(screen.getByText("Purchase matching")).toBeInTheDocument();
    expect(screen.getByText(/does not post journals, book variances, change AP balances, or move inventory/i)).toBeInTheDocument();
    expect(screen.getAllByText("Bill pending receipt").length).toBeGreaterThan(0);
    expect(screen.getByText("Review workflow")).toBeInTheDocument();
    expect(screen.getByText("Waiting For Supplier")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return PRN-000001" })).toHaveAttribute("href", "/purchases/returns/return-1");
    expect(screen.getByText(/Review status is for follow-up only/i)).toBeInTheDocument();
    expect(screen.getAllByText("Ordered").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10.0000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("4.0000").length).toBeGreaterThan(0);
    expect(screen.getByText("No journals, AP balances, or inventory quantities changed.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PO-000001" })).toHaveAttribute("href", "/purchases/purchase-orders/po-1");
    expect(screen.getAllByRole("link", { name: /BILL-000001/ })[0]).toHaveAttribute("href", "/purchases/bills/bill-1");
    expect(screen.getAllByRole("link", { name: /PRC-000001/ })[0]).toHaveAttribute("href", "/inventory/purchase-receipts/receipt-1");
  });

  it("shows a valuation variance preview link for variance review status when enabled", () => {
    const summary = matchingSummary();
    summary.reviewSummary = {
      ...summary.reviewSummary!,
      reviewStatus: "NEEDS_VARIANCE_REVIEW",
      reasonCode: "PRICE_MISMATCH",
    };

    render(<PurchaseMatchingPanel summary={summary} showValuationVariancePreviewLink />);

    expect(screen.getByRole("link", { name: "Open valuation variance preview" })).toHaveAttribute(
      "href",
      "/inventory/valuation-variances?matchingReviewId=review-1&sourceType=matchingReview",
    );
    expect(screen.getByText(/Review status is for follow-up only/i)).toBeInTheDocument();
  });
});

function matchingSummary(): PurchaseMatchingSummary {
  return {
    readOnly: true,
    noMutation: true,
    sourceType: "purchaseOrder",
    sourceId: "po-1",
    sourceNumber: "PO-000001",
    status: "Bill pending receipt",
    supplier: { id: "supplier-1", name: "Example Supplier", displayName: "Example Supplier" },
    reviewSummary: {
      reviewId: "review-1",
      reviewStatus: "WAITING_FOR_SUPPLIER",
      reasonCode: "OVER_BILLED",
      assignedTo: { id: "user-1", name: "Reviewer", email: "reviewer@example.com" },
      nextReviewDate: null,
      reviewedAt: null,
      reviewNoteSummary: null,
      purchaseReturnId: "return-1",
      purchaseReturnNumber: "PRN-000001",
      purchaseReturnStatus: "SUBMITTED",
      purchaseReturnHref: "/purchases/returns/return-1",
    },
    purchaseOrder: {
      id: "po-1",
      purchaseOrderNumber: "PO-000001",
      status: "APPROVED",
      orderDate: "2026-06-05T00:00:00.000Z",
      total: "250.0000",
    },
    purchaseBill: null,
    purchaseReceipt: null,
    relatedBills: [
      {
        id: "bill-1",
        billNumber: "BILL-000001",
        status: "FINALIZED",
        billDate: "2026-06-05T00:00:00.000Z",
        total: "100.0000",
        inventoryPostingMode: "DIRECT_EXPENSE_OR_ASSET",
        purchaseOrderId: "po-1",
      },
    ],
    relatedReceipts: [
      {
        id: "receipt-1",
        receiptNumber: "PRC-000001",
        status: "POSTED",
        receiptDate: "2026-06-05T00:00:00.000Z",
        purchaseOrderId: "po-1",
        purchaseBillId: null,
        inventoryAssetJournalEntryId: null,
        inventoryAssetReversalJournalEntryId: null,
      },
    ],
    totals: {
      orderedQuantity: "10.0000",
      billedQuantity: "4.0000",
      receivedQuantity: "2.0000",
      remainingToBill: "6.0000",
      remainingToReceive: "8.0000",
      overBilledQuantity: "0.0000",
      overReceivedQuantity: "0.0000",
    },
    warnings: ["No journals, AP balances, or inventory quantities changed."],
    lines: [
      {
        lineId: "po-line-1",
        description: "Tracked item",
        item: { id: "item-1", name: "Tracked item", sku: "TRK", inventoryTracking: true },
        orderedQuantity: "10.0000",
        billedQuantity: "4.0000",
        receivedQuantity: "2.0000",
        remainingToBill: "6.0000",
        remainingToReceive: "8.0000",
        overBilledQuantity: "0.0000",
        overReceivedQuantity: "0.0000",
        status: "Bill pending receipt",
        warnings: ["Bill pending receipt"],
        bills: [
          {
            id: "bill-1",
            billNumber: "BILL-000001",
            billLineId: "bill-line-1",
            status: "FINALIZED",
            quantity: "4.0000",
            href: "/purchases/bills/bill-1",
          },
        ],
        receipts: [
          {
            id: "receipt-1",
            receiptNumber: "PRC-000001",
            receiptLineId: "receipt-line-1",
            status: "POSTED",
            quantity: "2.0000",
            unitCost: "25.0000",
            href: "/inventory/purchase-receipts/receipt-1",
            inventoryAssetJournalEntryId: null,
            inventoryAssetReversalJournalEntryId: null,
          },
        ],
      },
    ],
  };
}
