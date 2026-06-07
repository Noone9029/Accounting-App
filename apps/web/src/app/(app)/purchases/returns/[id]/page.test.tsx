import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { PurchaseReturnInventoryMovementPanel, PurchaseReturnWorkflowGuidance } from "./page";
import type { PurchaseReturn, PurchaseReturnInventoryMovementPreview } from "@/lib/types";

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

describe("PurchaseReturnWorkflowGuidance", () => {
  it("explains draft returns as operational and shows submit for permitted users", () => {
    render(
      <PurchaseReturnWorkflowGuidance
        purchaseReturn={purchaseReturnFixture({ status: "DRAFT" })}
        canManage
        actionLoading={false}
        onAction={jest.fn()}
      />,
    );

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText(/saved for review and can still be edited/i)).toBeInTheDocument();
    expect(screen.getByText(/do not post journals, adjust AP balances, create supplier credits\/refunds, book variances/i)).toBeInTheDocument();
    expect(screen.getByText(/move inventory automatically/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
    expect(screen.queryByText(/supplier email|ZATCA|VAT filing/i)).not.toBeInTheDocument();
  });

  it("keeps completed returns non-posting and links back to matching review", () => {
    render(
      <PurchaseReturnWorkflowGuidance
        purchaseReturn={purchaseReturnFixture({ status: "COMPLETED", completedAt: "2026-06-05T00:00:00.000Z" })}
        canManage
        actionLoading={false}
        onAction={jest.fn()}
      />,
    );

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText(/supplier credit, refund, or stock movement still requires a separate explicit workflow/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View matching review" })).toHaveAttribute("href", "/purchases/matching?reviewStatus=NEEDS_RETURN_REVIEW");
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("hides lifecycle actions from view-only users", () => {
    render(
      <PurchaseReturnWorkflowGuidance
        purchaseReturn={purchaseReturnFixture({ status: "SUBMITTED" })}
        canManage={false}
        actionLoading={false}
        onAction={jest.fn()}
      />,
    );

    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });
});

describe("PurchaseReturnInventoryMovementPanel", () => {
  it("shows preview status, safe helper text, projected stock, and post action", () => {
    render(<PurchaseReturnInventoryMovementPanel preview={inventoryPreviewFixture()} canPost actionLoading={false} onPost={jest.fn()} />);

    expect(screen.getAllByText("Not posted").length).toBeGreaterThan(0);
    expect(screen.getByText(/operational stock movement only/i)).toBeInTheDocument();
    expect(screen.getByText("Purchase return out")).toBeInTheDocument();
    expect(screen.getByText("8.0000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post inventory return movement" })).toBeInTheDocument();
  });

  it("hides post action for restricted users but keeps movement status visible", () => {
    render(<PurchaseReturnInventoryMovementPanel preview={inventoryPreviewFixture()} canPost={false} actionLoading={false} onPost={jest.fn()} />);

    expect(screen.getAllByText("Not posted").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Post inventory return movement" })).not.toBeInTheDocument();
    expect(screen.getByText("Posting requires stock movement create permission.")).toBeInTheDocument();
  });

  it("shows posted movement IDs and reversal limitation", () => {
    const baseLine = inventoryPreviewFixture().lines[0];
    if (!baseLine) throw new Error("Expected inventory preview line fixture.");

    render(
      <PurchaseReturnInventoryMovementPanel
        preview={inventoryPreviewFixture({
          inventoryMovementStatus: "POSTED",
          canPost: false,
          alreadyPosted: true,
          postedAt: "2026-06-05T12:00:00.000Z",
          movementIds: ["movement-return-1"],
          lines: [
            {
              ...baseLine,
              status: "POSTED",
              stockMovementId: "movement-return-1",
              currentOnHand: "8.0000",
              projectedOnHandAfterReturn: "8.0000",
            },
          ],
        })}
        canPost
        actionLoading={false}
        onPost={jest.fn()}
      />,
    );

    expect(screen.getAllByText("Posted").length).toBeGreaterThan(0);
    expect(screen.getByText("Reversal not supported yet")).toBeInTheDocument();
    expect(screen.getAllByText("movement-return-1").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Post inventory return movement" })).not.toBeInTheDocument();
  });
});

function purchaseReturnFixture(overrides: Partial<PurchaseReturn> = {}): PurchaseReturn {
  return {
    id: "return-1",
    organizationId: "org-1",
    supplierId: "supplier-1",
    purchaseReturnNumber: "PRN-000001",
    status: "DRAFT",
    returnDate: "2026-06-05T00:00:00.000Z",
    reason: "Damaged goods",
    reference: "SUP-REF-1",
    sourcePurchaseBillId: "bill-1",
    sourcePurchaseOrderId: null,
    sourcePurchaseReceiptId: null,
    sourceMatchingReviewId: "review-1",
    relatedPurchaseDebitNoteId: null,
    relatedSupplierRefundId: null,
    notes: null,
    createdByUserId: "user-1",
    approvedByUserId: null,
    inventoryReturnPostedByUserId: null,
    approvedAt: null,
    completedAt: null,
    voidedAt: null,
    inventoryReturnPostedAt: null,
    createdAt: "2026-06-05T00:00:00.000Z",
    updatedAt: "2026-06-05T00:00:00.000Z",
    noPostingEffect: true,
    noInventoryEffect: true,
    supplier: { id: "supplier-1", name: "Example Supplier", displayName: "Example Supplier", type: "SUPPLIER", taxNumber: null },
    sourcePurchaseBill: { id: "bill-1", billNumber: "BILL-000001", status: "FINALIZED", supplierId: "supplier-1" },
    sourcePurchaseOrder: null,
    sourcePurchaseReceipt: null,
    sourceMatchingReview: {
      id: "review-1",
      sourceType: "purchaseBill",
      sourceId: "bill-1",
      exceptionType: "OVER_BILLED",
      severity: "CRITICAL",
      status: "NEEDS_RETURN_REVIEW",
      reasonCode: "OVER_BILLED",
    },
    relatedPurchaseDebitNote: null,
    relatedSupplierRefund: null,
    inventoryReturnPostedBy: null,
    lines: [],
    ...overrides,
  };
}

function inventoryPreviewFixture(overrides: Partial<PurchaseReturnInventoryMovementPreview> = {}): PurchaseReturnInventoryMovementPreview {
  return {
    readOnly: true,
    previewOnly: true,
    noPostingEffect: true,
    noAccountingEffect: true,
    noApEffect: true,
    noVatEffect: true,
    noValuationPosting: true,
    sourceType: "PurchaseReturn",
    sourcePurchaseReturn: { id: "return-1", purchaseReturnNumber: "PRN-000001", status: "APPROVED" },
    inventoryMovementStatus: "NOT_POSTED",
    canPost: true,
    alreadyPosted: false,
    reversalSupported: false,
    postedAt: null,
    movementIds: [],
    blockingReasons: [],
    warnings: [
      "This action records an operational stock movement only. It does not create accounting journals, AP adjustments, supplier credits/refunds, VAT entries, or valuation postings.",
    ],
    safeHelperText:
      "This action records an operational stock movement only. It does not create accounting journals, AP adjustments, supplier credits/refunds, VAT entries, or valuation postings.",
    lines: [
      {
        lineId: "return-line-1",
        description: "Damaged inventory item",
        item: { id: "item-1", name: "Tracked item", sku: "SKU-1", inventoryTracking: true },
        warehouse: { id: "warehouse-1", code: "MAIN", name: "Main warehouse" },
        returnQuantity: "2.0000",
        currentOnHand: "10.0000",
        projectedOnHandAfterReturn: "8.0000",
        movementType: "PURCHASE_RETURN_OUT",
        movementRequired: true,
        status: "POSTABLE",
        stockMovementId: null,
        sourcePurchaseReceiptLineId: "receipt-line-1",
        sourcePurchaseReceiptNumber: "PRC-000001",
        blockingReasons: [],
        warnings: [],
      },
    ],
    ...overrides,
  };
}
