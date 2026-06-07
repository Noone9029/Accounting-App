import type {
  SalesInventoryReturn,
  SalesInventoryReturnInventoryMovementPreview,
  SalesInventoryReturnStatus,
} from "./types";

export const SALES_INVENTORY_RETURN_SAFE_HELPER_TEXT =
  "Sales inventory returns record operational stock returned by a customer. They do not create credit notes, refunds, accounting journals, AR adjustments, VAT filings, ZATCA submissions, emails, or payment links by themselves.";

export function salesInventoryReturnStatusLabel(status: SalesInventoryReturnStatus | undefined | null): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "SUBMITTED":
      return "Submitted";
    case "APPROVED":
      return "Approved";
    case "RECEIVED":
      return "Received";
    case "VOIDED":
      return "Voided";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Not created";
  }
}

export function salesInventoryReturnStatusBadgeClass(status: SalesInventoryReturnStatus | undefined | null): string {
  switch (status) {
    case "RECEIVED":
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

export function canEditSalesInventoryReturn(status: SalesInventoryReturnStatus | undefined | null): boolean {
  return status === "DRAFT";
}

export function canSubmitSalesInventoryReturn(status: SalesInventoryReturnStatus | undefined | null): boolean {
  return status === "DRAFT";
}

export function canApproveSalesInventoryReturn(status: SalesInventoryReturnStatus | undefined | null): boolean {
  return status === "SUBMITTED";
}

export function canReceiveSalesInventoryReturn(status: SalesInventoryReturnStatus | undefined | null): boolean {
  return status === "APPROVED";
}

export function canCancelSalesInventoryReturn(status: SalesInventoryReturnStatus | undefined | null): boolean {
  return status === "DRAFT" || status === "SUBMITTED";
}

export function canVoidSalesInventoryReturn(status: SalesInventoryReturnStatus | undefined | null): boolean {
  return status === "APPROVED" || status === "RECEIVED";
}

export function salesInventoryReturnSourceLabel(
  salesReturn: Pick<SalesInventoryReturn, "sourceSalesInvoice" | "sourceCreditNote" | "sourceDeliveryNote" | "sourceSalesStockIssue">,
): string {
  if (salesReturn.sourceSalesStockIssue) return `Stock issue ${salesReturn.sourceSalesStockIssue.issueNumber}`;
  if (salesReturn.sourceDeliveryNote) return `Delivery note ${salesReturn.sourceDeliveryNote.deliveryNoteNumber}`;
  if (salesReturn.sourceSalesInvoice) return `Invoice ${salesReturn.sourceSalesInvoice.invoiceNumber}`;
  if (salesReturn.sourceCreditNote) return `Credit note ${salesReturn.sourceCreditNote.creditNoteNumber}`;
  return "Customer direct";
}

export function salesInventoryReturnSourceHref(
  salesReturn: Pick<SalesInventoryReturn, "sourceSalesInvoice" | "sourceCreditNote" | "sourceDeliveryNote" | "sourceSalesStockIssue">,
): string | null {
  if (salesReturn.sourceSalesStockIssue) return `/inventory/sales-stock-issues/${salesReturn.sourceSalesStockIssue.id}`;
  if (salesReturn.sourceDeliveryNote) return `/sales/delivery-notes/${salesReturn.sourceDeliveryNote.id}`;
  if (salesReturn.sourceSalesInvoice) return `/sales/invoices/${salesReturn.sourceSalesInvoice.id}`;
  if (salesReturn.sourceCreditNote) return `/sales/credit-notes/${salesReturn.sourceCreditNote.id}`;
  return null;
}

export function salesInventoryReturnMovementStatusLabel(
  value:
    | SalesInventoryReturnInventoryMovementPreview
    | Pick<SalesInventoryReturn, "inventoryReturnMovementStatus" | "inventoryReturnPostedAt">
    | null
    | undefined,
): "Not posted" | "Posted" | "Blocked" {
  if (!value) return "Not posted";
  if ("alreadyPosted" in value) {
    if (value.alreadyPosted || value.inventoryMovementStatus === "POSTED") return "Posted";
    if (value.inventoryMovementStatus === "BLOCKED") return "Blocked";
    return "Not posted";
  }
  if (value.inventoryReturnMovementStatus === "POSTED" || Boolean(value.inventoryReturnPostedAt)) return "Posted";
  if (value.inventoryReturnMovementStatus === "BLOCKED") return "Blocked";
  return "Not posted";
}

export function canPostSalesInventoryReturnMovement(preview: SalesInventoryReturnInventoryMovementPreview | null | undefined, hasPermission: boolean): boolean {
  return hasPermission && preview?.canPost === true && preview.alreadyPosted !== true;
}
