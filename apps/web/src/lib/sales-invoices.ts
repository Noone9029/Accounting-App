import { apiRequest } from "./api";
import { parseDecimalToUnits } from "./money";
import type { OpenSalesInvoice, SalesInvoiceStatus } from "./types";

type OpenSalesInvoiceWithOptionalStatus = OpenSalesInvoice & { status?: SalesInvoiceStatus };

export function openSalesInvoicesPath(customerId: string): string {
  const targetCustomerId = customerId.trim();
  if (!targetCustomerId) {
    throw new Error("customerId is required to load open sales invoices.");
  }

  return `/sales-invoices/open?customerId=${encodeURIComponent(targetCustomerId)}`;
}

export async function listOpenSalesInvoicesForCustomer(customerId: string): Promise<OpenSalesInvoice[]> {
  const targetCustomerId = customerId.trim();
  const invoices = await apiRequest<OpenSalesInvoiceWithOptionalStatus[]>(openSalesInvoicesPath(targetCustomerId));
  return eligibleOpenSalesInvoicesForCustomer(invoices, targetCustomerId);
}

export function eligibleOpenSalesInvoicesForCustomer(
  invoices: OpenSalesInvoiceWithOptionalStatus[],
  customerId: string,
): OpenSalesInvoice[] {
  const targetCustomerId = customerId.trim();
  return invoices.filter(
    (invoice) =>
      invoice.customerId === targetCustomerId &&
      parseDecimalToUnits(invoice.balanceDue) > 0 &&
      (invoice.status === undefined || invoice.status === "FINALIZED"),
  );
}
