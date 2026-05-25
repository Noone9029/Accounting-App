import { apiRequest } from "./api";
import { parseDecimalToUnits } from "./money";
import type {
  CustomerPartyDetail,
  CustomerPartySummary,
  PartyTransaction,
  PartyTransactionSourceType,
  SupplierPartyDetail,
  SupplierPartySummary,
} from "./types";

export type PartyKind = "customer" | "supplier";
export type PartySummary = CustomerPartySummary | SupplierPartySummary;
export type PartyTransactionStatusFilter = "ALL" | "OPEN" | "OVERDUE" | "PAID";

export interface PartyTransactionFilters {
  status: PartyTransactionStatusFilter;
  type: string;
  fromDate: string;
  toDate: string;
}

export function customersPath(): string {
  return "/contacts/customers";
}

export function customerDetailPath(customerId: string): string {
  return `/contacts/customers/${encodeURIComponent(requiredId(customerId, "customerId"))}`;
}

export function suppliersPath(): string {
  return "/contacts/suppliers";
}

export function supplierDetailPath(supplierId: string): string {
  return `/contacts/suppliers/${encodeURIComponent(requiredId(supplierId, "supplierId"))}`;
}

export function partyDetailHref(kind: PartyKind, partyId: string): string {
  return `/${kind === "customer" ? "customers" : "suppliers"}/${encodeURIComponent(requiredId(partyId, "partyId"))}`;
}

export function buildPartyTransactionHref(
  basePath: string,
  kind: PartyKind,
  partyId: string,
  extraParams: Record<string, string | undefined> = {},
): string {
  const params = new URLSearchParams();
  params.set(kind === "customer" ? "customerId" : "supplierId", requiredId(partyId, "partyId"));
  params.set("returnTo", partyDetailHref(kind, partyId));

  for (const [key, value] of Object.entries(extraParams)) {
    if (value) {
      params.set(key, value);
    }
  }

  return `${basePath}?${params.toString()}`;
}

export function safeReturnToFromSearch(search: string): string {
  const value = new URLSearchParams(search).get("returnTo")?.trim() ?? "";
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "";
  }
  return value;
}

export function listCustomers(): Promise<CustomerPartySummary[]> {
  return apiRequest<CustomerPartySummary[]>(customersPath());
}

export function getCustomer(customerId: string): Promise<CustomerPartyDetail> {
  return apiRequest<CustomerPartyDetail>(customerDetailPath(customerId));
}

export function listSuppliers(): Promise<SupplierPartySummary[]> {
  return apiRequest<SupplierPartySummary[]>(suppliersPath());
}

export function getSupplier(supplierId: string): Promise<SupplierPartyDetail> {
  return apiRequest<SupplierPartyDetail>(supplierDetailPath(supplierId));
}

export function filterPartySummaries(rows: PartySummary[], query: string): PartySummary[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return rows;
  }

  return rows.filter((row) => partySummarySearchText(row).includes(normalized));
}

export function filterPartyTransactions(
  transactions: PartyTransaction[],
  filters: PartyTransactionFilters,
  asOf = new Date(),
): PartyTransaction[] {
  const fromTime = filters.fromDate ? (startOfDay(filters.fromDate)?.getTime() ?? null) : null;
  const toTime = filters.toDate ? (endOfDay(filters.toDate)?.getTime() ?? null) : null;

  return transactions.filter((transaction) => {
    const transactionTime = new Date(transaction.date).getTime();
    const typeMatches = filters.type === "ALL" || transaction.sourceType === filters.type;
    const fromMatches = fromTime === null || transactionTime >= fromTime;
    const toMatches = toTime === null || transactionTime <= toTime;
    const statusMatches = partyTransactionStatusMatches(transaction, filters.status, asOf);
    return typeMatches && fromMatches && toMatches && statusMatches;
  });
}

export function partyTransactionStatusMatches(
  transaction: PartyTransaction,
  status: PartyTransactionStatusFilter,
  asOf = new Date(),
): boolean {
  if (status === "ALL") {
    return true;
  }

  const balanceDueUnits = parseDecimalToUnits(transaction.balanceDue);
  if (status === "OPEN") {
    return balanceDueUnits > 0;
  }
  if (status === "PAID") {
    return balanceDueUnits <= 0;
  }

  return balanceDueUnits > 0 && isPastDue(transaction.dueDate, asOf);
}

export function partyTransactionTypeOptions(transactions: PartyTransaction[]): Array<{ value: string; label: string }> {
  const labels = new Map<PartyTransactionSourceType, string>();
  for (const transaction of transactions) {
    labels.set(transaction.sourceType, transaction.type);
  }
  return [...labels.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([value, label]) => ({ value, label }));
}

export function partyTransactionActionHref(transaction: PartyTransaction): string {
  switch (transaction.sourceType) {
    case "SalesInvoice":
      return `/sales/invoices/${transaction.sourceId}`;
    case "CreditNote":
      return `/sales/credit-notes/${transaction.sourceId}`;
    case "CustomerPayment":
      return `/sales/customer-payments/${transaction.sourceId}`;
    case "CustomerRefund":
      return `/sales/customer-refunds/${transaction.sourceId}`;
    case "PurchaseBill":
      return `/purchases/bills/${transaction.sourceId}`;
    case "PurchaseDebitNote":
      return `/purchases/debit-notes/${transaction.sourceId}`;
    case "SupplierPayment":
      return `/purchases/supplier-payments/${transaction.sourceId}`;
    case "SupplierRefund":
      return `/purchases/supplier-refunds/${transaction.sourceId}`;
    case "CashExpense":
      return `/purchases/cash-expenses/${transaction.sourceId}`;
  }
}

export function partyTransactionsCsv(transactions: PartyTransaction[]): string {
  const headers = ["Date", "Type", "Transaction number", "Total before tax", "Tax amount", "Total", "Balance due", "Status"];
  const rows = transactions.map((transaction) => [
    transaction.date,
    transaction.type,
    transaction.transactionNumber,
    transaction.subtotal,
    transaction.taxAmount,
    transaction.total,
    transaction.balanceDue,
    transaction.status,
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function partyStatusBadgeClass(isActive: boolean): string {
  return isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600";
}

function partySummarySearchText(row: PartySummary): string {
  const contact = row.contact;
  const openBalance = "openReceivableBalance" in row ? row.openReceivableBalance : row.openPayableBalance;
  const overdueBalance = "overdueReceivableBalance" in row ? row.overdueReceivableBalance : row.overduePayableBalance;

  return [
    contact.name,
    contact.displayName,
    contact.email,
    contact.phone,
    contact.taxNumber,
    openBalance,
    overdueBalance,
    contact.type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function requiredId(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
}

function isPastDue(value: string | null, asOf: Date): boolean {
  if (!value) {
    return false;
  }
  const dueDate = endOfDay(value);
  return dueDate ? dueDate.getTime() < asOf.getTime() : false;
}

function startOfDay(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setHours(23, 59, 59, 999);
  return date;
}

function csvCell(value: string): string {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}
