import { apiRequest } from "./api";
import { hasAnyPermission, PERMISSIONS, type Permission, type PermissionSubject } from "./permissions";
import type { GlobalSearchCategory, GlobalSearchResponse, GlobalSearchResult } from "./types";

export const GLOBAL_SEARCH_CATEGORY_ORDER: readonly GlobalSearchCategory[] = [
  "Contacts",
  "Transactions",
  "Reports",
  "Pages / Navigation",
];

interface StaticSearchAction {
  id: string;
  category: GlobalSearchCategory;
  label: string;
  href: string;
  resultType: string;
  detail: string;
  requiredAny: readonly Permission[];
  keywords: readonly string[];
}

const STATIC_SEARCH_ACTIONS: readonly StaticSearchAction[] = [
  report("profit-loss", "Profit and Loss", "/reports/profit-and-loss", ["profit", "loss", "p and l", "income statement"]),
  report("balance-sheet", "Balance Sheet", "/reports/balance-sheet", ["assets", "liabilities", "equity"]),
  report("trial-balance", "Trial Balance", "/reports/trial-balance", ["debits", "credits", "accounts"]),
  report("aged-receivables", "Aged Receivables", "/reports/aged-receivables", ["ar", "customer aging", "open receivables"]),
  report("aged-payables", "Aged Payables", "/reports/aged-payables", ["ap", "supplier aging", "open payables"]),
  report("tax-report", "Tax Report", "/reports/vat-summary", ["vat", "tax", "return"]),
  report("general-ledger", "General Ledger", "/reports/general-ledger", ["gl", "ledger", "journal lines"]),
  transactionPage("estimates", "Estimates", "/sales/quotes", PERMISSIONS.salesInvoices.view, ["quote", "quotation"]),
  transactionPage("expenses", "Expenses", "/purchases/cash-expenses", PERMISSIONS.cashExpenses.view, ["cash expense", "spend"]),
  transactionPage("payments", "Payments", "/sales/customer-payments", PERMISSIONS.customerPayments.view, [
    "receive payment",
    "customer payment",
  ]),
  transactionPage("bills", "Bills", "/purchases/bills", PERMISSIONS.purchaseBills.view, ["supplier bill", "payable"]),
  transactionPage("invoices", "Invoices", "/sales/invoices", PERMISSIONS.salesInvoices.view, ["sales invoice", "receivable"]),
  transactionPage("purchase-orders", "Purchase Orders", "/purchases/purchase-orders", PERMISSIONS.purchaseOrders.view, [
    "po",
    "purchase order",
  ]),
  page("dashboard", "Dashboard", "/dashboard", "Workspace", [PERMISSIONS.dashboard.view], ["home", "overview"]),
  page("customers", "Customers", "/customers", "Sales", [PERMISSIONS.contacts.view], ["contacts", "receivables"]),
  page("suppliers", "Suppliers", "/suppliers", "Purchases", [PERMISSIONS.contacts.view], ["vendors", "payables"]),
  page("banking", "Banking", "/bank-accounts", "Banking", [PERMISSIONS.bankAccounts.view], ["bank accounts", "cash"]),
  page("chart-of-accounts", "Chart of Accounts", "/accounts", "Accounting", [PERMISSIONS.accounts.view], ["coa", "accounts"]),
  page("products-services", "Products and Services", "/items", "Inventory", [PERMISSIONS.items.view], [
    "items",
    "products",
    "services",
  ]),
  page(
    "settings",
    "Settings",
    "/settings/team",
    "Administration",
    [PERMISSIONS.users.view, PERMISSIONS.roles.view, PERMISSIONS.organization.view],
    ["team", "roles", "organization"],
  ),
];

export function globalSearchPath(query: string): string {
  const params = new URLSearchParams({ query });
  return `/search?${params.toString()}`;
}

export function searchGlobalRecords(query: string): Promise<GlobalSearchResponse> {
  return apiRequest<GlobalSearchResponse>(globalSearchPath(query));
}

export function getLocalGlobalSearchResults(query: string, subject: PermissionSubject): GlobalSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  return STATIC_SEARCH_ACTIONS.filter((action) => hasAnyPermission(subject, ...action.requiredAny))
    .map((action) => ({
      id: `static-${action.id}`,
      category: action.category,
      label: action.label,
      href: action.href,
      resultType: action.resultType,
      detail: action.detail,
      amount: null,
      date: null,
      status: null,
      keywords: [...action.keywords],
    }))
    .filter((result) => searchScore(result, normalized) > 0)
    .sort((a, b) => searchScore(b, normalized) - searchScore(a, normalized) || a.label.localeCompare(b.label));
}

export function combineGlobalSearchResults(
  remoteResults: readonly GlobalSearchResult[],
  localResults: readonly GlobalSearchResult[],
): GlobalSearchResult[] {
  const seen = new Set<string>();
  const combined: GlobalSearchResult[] = [];

  for (const result of [...remoteResults, ...localResults]) {
    const key = `${result.category}:${result.href}:${result.label}`;
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(result);
    }
  }

  return combined;
}

export function groupGlobalSearchResults(results: readonly GlobalSearchResult[]): Array<{
  category: GlobalSearchCategory;
  results: GlobalSearchResult[];
}> {
  return GLOBAL_SEARCH_CATEGORY_ORDER.map((category) => ({
    category,
    results: results.filter((result) => result.category === category),
  })).filter((group) => group.results.length > 0);
}

function report(id: string, label: string, href: string, keywords: readonly string[]): StaticSearchAction {
  return {
    id: `report-${id}`,
    category: "Reports",
    label,
    href,
    resultType: "Report",
    detail: "Financial reports",
    requiredAny: [PERMISSIONS.reports.view],
    keywords,
  };
}

function page(
  id: string,
  label: string,
  href: string,
  detail: string,
  requiredAny: readonly Permission[],
  keywords: readonly string[],
): StaticSearchAction {
  return {
    id: `page-${id}`,
    category: "Pages / Navigation",
    label,
    href,
    resultType: "Page",
    detail,
    requiredAny,
    keywords,
  };
}

function transactionPage(
  id: string,
  label: string,
  href: string,
  permission: Permission,
  keywords: readonly string[],
): StaticSearchAction {
  return {
    id: `transaction-${id}`,
    category: "Transactions",
    label,
    href,
    resultType: "Transaction list",
    detail: "Open transaction page",
    requiredAny: [permission],
    keywords,
  };
}

function searchScore(result: GlobalSearchResult, query: string): number {
  const fields = [
    result.label,
    result.resultType,
    result.detail,
    result.status ?? "",
    result.amount ?? "",
    ...result.keywords,
  ].map((value) => value.toLowerCase());

  if (fields.some((field) => field === query)) {
    return 100;
  }
  if (fields.some((field) => field.startsWith(query))) {
    return 75;
  }
  if (fields.some((field) => field.includes(query))) {
    return 50;
  }
  return 0;
}
