import { apiRequest } from "./api";
import { formatUnits, parseDecimalToUnits } from "./money";
import type { CustomerPayment, CustomerPaymentUnappliedAllocation } from "./types";

export interface ApplyCustomerPaymentUnappliedAllocationRequest {
  invoiceId: string;
  amountApplied: string;
}

export type ApplyCustomerPaymentUnappliedAllocationResponse = CustomerPayment;

export interface ReverseCustomerPaymentUnappliedAllocationRequest {
  reason?: string;
}

export type ReverseCustomerPaymentUnappliedAllocationResponse = CustomerPayment;

export function customerPaymentUnappliedAllocationsPath(paymentId: string): string {
  return `/customer-payments/${encodeURIComponent(paymentId)}/unapplied-allocations`;
}

export function customerPaymentApplyUnappliedPath(paymentId: string): string {
  return `/customer-payments/${encodeURIComponent(paymentId)}/apply-unapplied`;
}

export function customerPaymentReverseUnappliedAllocationPath(paymentId: string, allocationId: string): string {
  return `/customer-payments/${encodeURIComponent(paymentId)}/unapplied-allocations/${encodeURIComponent(allocationId)}/reverse`;
}

export function salesInvoiceCustomerPaymentUnappliedAllocationsPath(invoiceId: string): string {
  return `/sales-invoices/${encodeURIComponent(invoiceId)}/customer-payment-unapplied-allocations`;
}

export function applyCustomerPaymentUnappliedAllocation(
  paymentId: string,
  request: ApplyCustomerPaymentUnappliedAllocationRequest,
): Promise<ApplyCustomerPaymentUnappliedAllocationResponse> {
  return apiRequest<ApplyCustomerPaymentUnappliedAllocationResponse>(customerPaymentApplyUnappliedPath(paymentId), {
    method: "POST",
    body: request,
  });
}

export function reverseCustomerPaymentUnappliedAllocation(
  paymentId: string,
  allocationId: string,
  request: ReverseCustomerPaymentUnappliedAllocationRequest = {},
): Promise<ReverseCustomerPaymentUnappliedAllocationResponse> {
  return apiRequest<ReverseCustomerPaymentUnappliedAllocationResponse>(
    customerPaymentReverseUnappliedAllocationPath(paymentId, allocationId),
    {
      method: "POST",
      body: request,
    },
  );
}

export function customerPaymentUnappliedAllocationStatusLabel(
  allocation: Pick<CustomerPaymentUnappliedAllocation, "reversedAt">,
): "Active" | "Reversed" {
  return allocation.reversedAt ? "Reversed" : "Active";
}

export function customerPaymentUnappliedAllocationStatusBadgeClass(
  allocation: Pick<CustomerPaymentUnappliedAllocation, "reversedAt">,
): string {
  return allocation.reversedAt ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-700";
}

export function canReverseCustomerPaymentUnappliedAllocation(
  allocation: Pick<CustomerPaymentUnappliedAllocation, "reversedAt">,
): boolean {
  return !allocation.reversedAt;
}

export function customerPaymentActiveUnappliedAppliedAmount(
  allocations: Array<Pick<CustomerPaymentUnappliedAllocation, "amountApplied" | "reversedAt">> | undefined,
): string {
  const units = (allocations ?? [])
    .filter((allocation) => !allocation.reversedAt)
    .reduce((sum, allocation) => sum + parseDecimalToUnits(allocation.amountApplied), 0);
  return formatUnits(units);
}

export function customerPaymentDirectAllocatedAmount(
  allocations: Array<Pick<NonNullable<CustomerPayment["allocations"]>[number], "amountApplied">> | undefined,
): string {
  const units = (allocations ?? []).reduce((sum, allocation) => sum + parseDecimalToUnits(allocation.amountApplied), 0);
  return formatUnits(units);
}

export function validateCustomerPaymentUnappliedAllocation(
  amountApplied: string,
  paymentUnappliedAmount: string,
  invoiceBalanceDue: string,
): string | null {
  const amountUnits = parseDecimalToUnits(amountApplied);
  if (amountUnits <= 0) {
    return "Amount to apply must be greater than zero.";
  }
  if (amountUnits > parseDecimalToUnits(paymentUnappliedAmount)) {
    return "Amount to apply cannot exceed the payment unapplied amount.";
  }
  if (amountUnits > parseDecimalToUnits(invoiceBalanceDue)) {
    return "Amount to apply cannot exceed the invoice balance due.";
  }
  return null;
}
