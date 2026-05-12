import { formatUnits, parseDecimalToUnits } from "./money";
import type { SupplierPaymentUnappliedAllocation } from "./types";

export function supplierPaymentUnappliedAllocationsPath(paymentId: string): string {
  return `/supplier-payments/${encodeURIComponent(paymentId)}/unapplied-allocations`;
}

export function purchaseBillSupplierPaymentUnappliedAllocationsPath(billId: string): string {
  return `/purchase-bills/${encodeURIComponent(billId)}/supplier-payment-unapplied-allocations`;
}

export function supplierPaymentUnappliedAllocationStatusLabel(
  allocation: Pick<SupplierPaymentUnappliedAllocation, "reversedAt">,
): "Active" | "Reversed" {
  return allocation.reversedAt ? "Reversed" : "Active";
}

export function supplierPaymentUnappliedAllocationStatusBadgeClass(
  allocation: Pick<SupplierPaymentUnappliedAllocation, "reversedAt">,
): string {
  return allocation.reversedAt ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-700";
}

export function canReverseSupplierPaymentUnappliedAllocation(
  allocation: Pick<SupplierPaymentUnappliedAllocation, "reversedAt">,
): boolean {
  return !allocation.reversedAt;
}

export function supplierPaymentActiveUnappliedAppliedAmount(
  allocations: Array<Pick<SupplierPaymentUnappliedAllocation, "amountApplied" | "reversedAt">> | undefined,
): string {
  const units = (allocations ?? [])
    .filter((allocation) => !allocation.reversedAt)
    .reduce((sum, allocation) => sum + parseDecimalToUnits(allocation.amountApplied), 0);
  return formatUnits(units);
}

export function validateSupplierPaymentUnappliedAllocation(
  amountApplied: string,
  paymentUnappliedAmount: string,
  billBalanceDue: string,
): string | null {
  const amountUnits = parseDecimalToUnits(amountApplied);
  if (amountUnits <= 0) {
    return "Amount to apply must be greater than zero.";
  }
  if (amountUnits > parseDecimalToUnits(paymentUnappliedAmount)) {
    return "Amount to apply cannot exceed the supplier payment unapplied amount.";
  }
  if (amountUnits > parseDecimalToUnits(billBalanceDue)) {
    return "Amount to apply cannot exceed the bill balance due.";
  }
  return null;
}
