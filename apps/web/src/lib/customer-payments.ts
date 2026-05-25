import { apiRequest } from "./api";
import { formatUnits, parseDecimalToUnits } from "./money";
import type { CustomerPayment, CustomerPaymentUnappliedAllocation } from "./types";

export type CustomerPaymentAllocationState = "NO_ALLOCATIONS" | "FULLY_APPLIED" | "PARTIALLY_UNAPPLIED";

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

export function customerPaymentStatusLabel(status: CustomerPayment["status"]): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "POSTED":
      return "Posted";
    case "VOIDED":
      return "Voided";
  }
}

export function customerPaymentStatusBadgeClass(status: CustomerPayment["status"]): string {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700";
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";
    case "VOIDED":
      return "bg-rose-50 text-rosewood";
  }
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

export function customerPaymentAllocationState(
  payment: {
    unappliedAmount: string;
    allocations?: Array<Pick<NonNullable<CustomerPayment["allocations"]>[number], "amountApplied">>;
    unappliedAllocations?: Array<Pick<CustomerPaymentUnappliedAllocation, "amountApplied" | "reversedAt">>;
  },
): CustomerPaymentAllocationState {
  const directUnits = parseDecimalToUnits(customerPaymentDirectAllocatedAmount(payment.allocations));
  const activeUnappliedApplicationUnits = parseDecimalToUnits(customerPaymentActiveUnappliedAppliedAmount(payment.unappliedAllocations));
  const unappliedUnits = parseDecimalToUnits(payment.unappliedAmount);

  if (directUnits <= 0 && activeUnappliedApplicationUnits <= 0) {
    return "NO_ALLOCATIONS";
  }

  return unappliedUnits > 0 ? "PARTIALLY_UNAPPLIED" : "FULLY_APPLIED";
}

export function customerPaymentAllocationStateLabel(state: CustomerPaymentAllocationState): string {
  switch (state) {
    case "NO_ALLOCATIONS":
      return "No allocations";
    case "PARTIALLY_UNAPPLIED":
      return "Partially unapplied";
    case "FULLY_APPLIED":
      return "Fully applied";
  }
}

export function customerPaymentAllocationStateBadgeClass(state: CustomerPaymentAllocationState): string {
  switch (state) {
    case "NO_ALLOCATIONS":
      return "bg-slate-100 text-slate-700";
    case "PARTIALLY_UNAPPLIED":
      return "bg-amber-50 text-amber-700";
    case "FULLY_APPLIED":
      return "bg-emerald-50 text-emerald-700";
  }
}

export function customerPaymentApplyMaximumAmount(paymentUnappliedAmount: string, invoiceBalanceDue: string | undefined): string {
  const paymentUnits = parseDecimalToUnits(paymentUnappliedAmount);
  const invoiceUnits = invoiceBalanceDue ? parseDecimalToUnits(invoiceBalanceDue) : paymentUnits;
  return formatUnits(Math.max(0, Math.min(paymentUnits, invoiceUnits)));
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
