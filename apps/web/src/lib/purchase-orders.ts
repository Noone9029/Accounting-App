import type { PermissionSubject } from "./permissions";
import { hasPermission, PERMISSIONS } from "./permissions";
import type { PurchaseOrderStatus } from "./types";

export function canEditPurchaseOrder(status: PurchaseOrderStatus): boolean {
  return status === "DRAFT";
}

export function canApprovePurchaseOrder(status: PurchaseOrderStatus): boolean {
  return status === "DRAFT";
}

export function canMarkPurchaseOrderSent(status: PurchaseOrderStatus): boolean {
  return status === "APPROVED";
}

export function canClosePurchaseOrder(status: PurchaseOrderStatus): boolean {
  return status === "APPROVED" || status === "SENT" || status === "PARTIALLY_BILLED";
}

export function canVoidPurchaseOrder(status: PurchaseOrderStatus): boolean {
  return status === "DRAFT" || status === "APPROVED" || status === "SENT";
}

export function canConvertPurchaseOrderToBill(status: PurchaseOrderStatus): boolean {
  return status === "APPROVED" || status === "SENT";
}

export function purchaseOrderStatusLabel(status: PurchaseOrderStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function canShowPurchaseOrderAction(subject: PermissionSubject, action: "approve" | "close" | "convert" | "delete" | "edit" | "send" | "void", status: PurchaseOrderStatus): boolean {
  switch (action) {
    case "approve":
      return canApprovePurchaseOrder(status) && hasPermission(subject, PERMISSIONS.purchaseOrders.approve);
    case "send":
      return canMarkPurchaseOrderSent(status) && hasPermission(subject, PERMISSIONS.purchaseOrders.approve);
    case "close":
      return canClosePurchaseOrder(status) && hasPermission(subject, PERMISSIONS.purchaseOrders.update);
    case "convert":
      return canConvertPurchaseOrderToBill(status) && hasPermission(subject, PERMISSIONS.purchaseOrders.convertToBill);
    case "delete":
    case "edit":
      return canEditPurchaseOrder(status) && hasPermission(subject, PERMISSIONS.purchaseOrders.update);
    case "void":
      return canVoidPurchaseOrder(status) && hasPermission(subject, PERMISSIONS.purchaseOrders.void);
  }
}
