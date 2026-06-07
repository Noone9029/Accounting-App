import type { PurchaseReturn, PurchaseReturnInventoryMovementPreview, PurchaseReturnStatus } from "./types";

export const PURCHASE_RETURN_NON_EFFECT_TEXT =
  "Purchase returns are operational review documents in this version. They do not post journals, adjust AP balances, create supplier credits/refunds, book variances, send email, affect VAT, or move inventory automatically. Inventory movement, when available, must be posted through the explicit operational stock action.";

export const PURCHASE_RETURN_INVENTORY_MOVEMENT_HELPER_TEXT =
  "This action records an operational stock movement only. It does not create accounting journals, AP adjustments, supplier credits/refunds, VAT entries, or valuation postings.";

export function purchaseReturnStatusLabel(status: PurchaseReturnStatus | undefined | null): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "SUBMITTED":
      return "Submitted";
    case "APPROVED":
      return "Approved";
    case "COMPLETED":
      return "Completed";
    case "VOIDED":
      return "Voided";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Not created";
  }
}

export function purchaseReturnStatusBadgeClass(status: PurchaseReturnStatus | undefined | null): string {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700";
    case "APPROVED":
      return "bg-teal-50 text-palm";
    case "SUBMITTED":
      return "bg-blue-50 text-blue-700";
    case "VOIDED":
    case "CANCELLED":
      return "bg-rose-50 text-rosewood";
    case "DRAFT":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function canEditPurchaseReturn(status: PurchaseReturnStatus | undefined | null): boolean {
  return status === "DRAFT";
}

export function canSubmitPurchaseReturn(status: PurchaseReturnStatus | undefined | null): boolean {
  return status === "DRAFT";
}

export function canApprovePurchaseReturn(status: PurchaseReturnStatus | undefined | null): boolean {
  return status === "SUBMITTED";
}

export function canCompletePurchaseReturn(status: PurchaseReturnStatus | undefined | null): boolean {
  return status === "APPROVED";
}

export function canCancelPurchaseReturn(status: PurchaseReturnStatus | undefined | null): boolean {
  return status === "DRAFT" || status === "SUBMITTED";
}

export function canVoidPurchaseReturn(status: PurchaseReturnStatus | undefined | null): boolean {
  return status === "APPROVED";
}

export function purchaseReturnInventoryMovementStatusLabel(
  value: PurchaseReturnInventoryMovementPreview | Pick<PurchaseReturn, "inventoryReturnMovementStatus" | "inventoryReturnPostedAt"> | null | undefined,
): "Not posted" | "Posted" | "Reversal not supported yet" {
  if (!value) return "Not posted";
  const posted =
    "alreadyPosted" in value
      ? value.alreadyPosted || value.inventoryMovementStatus === "POSTED"
      : value.inventoryReturnMovementStatus === "POSTED" || Boolean(value.inventoryReturnPostedAt);
  return posted ? "Posted" : "Not posted";
}

export function purchaseReturnInventoryMovementReversalLabel(
  value: PurchaseReturnInventoryMovementPreview | Pick<PurchaseReturn, "inventoryReturnMovementStatus" | "inventoryReturnPostedAt"> | null | undefined,
): string | null {
  return purchaseReturnInventoryMovementStatusLabel(value) === "Posted" ? "Reversal not supported yet" : null;
}

export function canPostPurchaseReturnInventoryMovement(preview: PurchaseReturnInventoryMovementPreview | null | undefined, hasPermission: boolean): boolean {
  return hasPermission && preview?.canPost === true && preview.alreadyPosted !== true;
}

export function purchaseReturnSourceLabel(purchaseReturn: Pick<PurchaseReturn, "sourcePurchaseBill" | "sourcePurchaseOrder" | "sourcePurchaseReceipt" | "sourceMatchingReview">): string {
  if (purchaseReturn.sourcePurchaseBill) return `Bill ${purchaseReturn.sourcePurchaseBill.billNumber}`;
  if (purchaseReturn.sourcePurchaseOrder) return `PO ${purchaseReturn.sourcePurchaseOrder.purchaseOrderNumber}`;
  if (purchaseReturn.sourcePurchaseReceipt) return `Receipt ${purchaseReturn.sourcePurchaseReceipt.receiptNumber}`;
  if (purchaseReturn.sourceMatchingReview) return `Matching review ${purchaseReturn.sourceMatchingReview.id}`;
  return "Supplier direct";
}

export function purchaseReturnSourceHref(purchaseReturn: Pick<PurchaseReturn, "sourcePurchaseBill" | "sourcePurchaseOrder" | "sourcePurchaseReceipt" | "sourceMatchingReview">): string | null {
  if (purchaseReturn.sourcePurchaseBill) return `/purchases/bills/${purchaseReturn.sourcePurchaseBill.id}`;
  if (purchaseReturn.sourcePurchaseOrder) return `/purchases/purchase-orders/${purchaseReturn.sourcePurchaseOrder.id}`;
  if (purchaseReturn.sourcePurchaseReceipt) return `/inventory/purchase-receipts/${purchaseReturn.sourcePurchaseReceipt.id}`;
  if (purchaseReturn.sourceMatchingReview) return `/purchases/matching?reviewStatus=${encodeURIComponent(purchaseReturn.sourceMatchingReview.status)}`;
  return null;
}
