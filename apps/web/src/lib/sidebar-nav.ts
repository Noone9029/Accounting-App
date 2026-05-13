import { canViewNavItem, PERMISSIONS, type Permission, type PermissionSubject } from "./permissions";

export interface SidebarNavChild {
  label: string;
  href: string;
  requiredAny: readonly Permission[];
}

export interface SidebarNavItem {
  label: string;
  href: string;
  activePrefix?: string;
  requiredAny?: readonly Permission[];
  children?: readonly SidebarNavChild[];
}

export const SIDEBAR_NAV_ITEMS: readonly SidebarNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    requiredAny: [PERMISSIONS.organization.view],
  },
  {
    label: "Reports",
    href: "/reports",
    requiredAny: [PERMISSIONS.reports.view],
    children: [
      { label: "General Ledger", href: "/reports/general-ledger", requiredAny: [PERMISSIONS.reports.view] },
      { label: "Trial Balance", href: "/reports/trial-balance", requiredAny: [PERMISSIONS.reports.view] },
      { label: "Profit & Loss", href: "/reports/profit-and-loss", requiredAny: [PERMISSIONS.reports.view] },
      { label: "Balance Sheet", href: "/reports/balance-sheet", requiredAny: [PERMISSIONS.reports.view] },
      { label: "VAT Summary", href: "/reports/vat-summary", requiredAny: [PERMISSIONS.reports.view] },
      { label: "Aged Receivables", href: "/reports/aged-receivables", requiredAny: [PERMISSIONS.reports.view] },
      { label: "Aged Payables", href: "/reports/aged-payables", requiredAny: [PERMISSIONS.reports.view] },
    ],
  },
  {
    label: "Banking",
    href: "/bank-accounts",
    activePrefix: "/bank",
    children: [
      { label: "Bank accounts", href: "/bank-accounts", requiredAny: [PERMISSIONS.bankAccounts.view] },
      { label: "Bank transfers", href: "/bank-transfers", requiredAny: [PERMISSIONS.bankTransfers.view] },
    ],
  },
  {
    label: "Sales",
    href: "/sales/invoices",
    activePrefix: "/sales",
    children: [
      { label: "Invoices", href: "/sales/invoices", requiredAny: [PERMISSIONS.salesInvoices.view] },
      { label: "Customer payments", href: "/sales/customer-payments", requiredAny: [PERMISSIONS.customerPayments.view] },
      { label: "Customer refunds", href: "/sales/customer-refunds", requiredAny: [PERMISSIONS.customerRefunds.view] },
      { label: "Credit notes", href: "/sales/credit-notes", requiredAny: [PERMISSIONS.creditNotes.view] },
    ],
  },
  {
    label: "Purchases",
    href: "/purchases/bills",
    activePrefix: "/purchases",
    children: [
      { label: "Purchase orders", href: "/purchases/purchase-orders", requiredAny: [PERMISSIONS.purchaseOrders.view] },
      { label: "Bills", href: "/purchases/bills", requiredAny: [PERMISSIONS.purchaseBills.view] },
      { label: "Supplier payments", href: "/purchases/supplier-payments", requiredAny: [PERMISSIONS.supplierPayments.view] },
      { label: "Supplier refunds", href: "/purchases/supplier-refunds", requiredAny: [PERMISSIONS.supplierRefunds.view] },
      { label: "Cash expenses", href: "/purchases/cash-expenses", requiredAny: [PERMISSIONS.cashExpenses.view] },
      { label: "Debit notes", href: "/purchases/debit-notes", requiredAny: [PERMISSIONS.purchaseDebitNotes.view] },
    ],
  },
  {
    label: "Customers & suppliers",
    href: "/contacts",
    requiredAny: [PERMISSIONS.contacts.view],
    children: [{ label: "Contacts", href: "/contacts", requiredAny: [PERMISSIONS.contacts.view] }],
  },
  {
    label: "Products & Services",
    href: "/items",
    requiredAny: [PERMISSIONS.items.view],
    children: [{ label: "Items", href: "/items", requiredAny: [PERMISSIONS.items.view] }],
  },
  {
    label: "For accountants",
    href: "/journal-entries",
    activePrefix: "/journal-entries",
    children: [
      { label: "Manual journals", href: "/journal-entries", requiredAny: [PERMISSIONS.journals.view] },
      { label: "Chart of accounts", href: "/accounts", requiredAny: [PERMISSIONS.accounts.view] },
      { label: "Tax rates", href: "/tax-rates", requiredAny: [PERMISSIONS.taxRates.view] },
      { label: "Fiscal periods", href: "/fiscal-periods", requiredAny: [PERMISSIONS.fiscalPeriods.view] },
    ],
  },
  {
    label: "Branches",
    href: "/branches",
    requiredAny: [PERMISSIONS.organization.view],
  },
  {
    label: "Documents / Archive",
    href: "/documents",
    requiredAny: [PERMISSIONS.generatedDocuments.view, PERMISSIONS.documents.view],
  },
  {
    label: "Settings / Admin",
    href: "/settings/team",
    activePrefix: "/settings",
    children: [
      { label: "Team Members", href: "/settings/team", requiredAny: [PERMISSIONS.users.view] },
      { label: "Roles & Permissions", href: "/settings/roles", requiredAny: [PERMISSIONS.roles.view] },
      { label: "Document settings", href: "/settings/documents", requiredAny: [PERMISSIONS.documentSettings.view] },
      { label: "ZATCA", href: "/settings/zatca", requiredAny: [PERMISSIONS.zatca.view] },
    ],
  },
];

export function filterSidebarNavItems(
  subject: PermissionSubject,
  items: readonly SidebarNavItem[] = SIDEBAR_NAV_ITEMS,
): SidebarNavItem[] {
  return items.flatMap((item) => {
    const children = item.children?.filter((child) => canViewNavItem(subject, child.requiredAny));
    const visible = Boolean(children?.length) || (item.requiredAny ? canViewNavItem(subject, item.requiredAny) : false);

    return visible ? [{ ...item, children }] : [];
  });
}
