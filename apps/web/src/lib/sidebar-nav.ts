import { getLedgerByteEdition, type LedgerByteMarket } from "./edition";
import { canViewNavItem, PERMISSIONS, type Permission, type PermissionSubject } from "./permissions";

export interface SidebarNavChild {
  label: string;
  href: string;
  requiredAny: readonly Permission[];
  group?: string;
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
    requiredAny: [PERMISSIONS.dashboard.view],
  },
  {
    label: "Customers",
    href: "/customers",
    requiredAny: [PERMISSIONS.contacts.view],
  },
  {
    label: "Suppliers",
    href: "/suppliers",
    requiredAny: [PERMISSIONS.contacts.view],
  },
  {
    label: "Sales",
    href: "/sales/invoices",
    activePrefix: "/sales",
    children: [
      { label: "Invoices", href: "/sales/invoices", requiredAny: [PERMISSIONS.salesInvoices.view] },
      { label: "Credit notes", href: "/sales/credit-notes", requiredAny: [PERMISSIONS.creditNotes.view] },
      { label: "Customer payments", href: "/sales/customer-payments", requiredAny: [PERMISSIONS.customerPayments.view] },
      { group: "Supporting workflows", label: "Quotes", href: "/sales/quotes", requiredAny: [PERMISSIONS.salesInvoices.view] },
      { group: "Supporting workflows", label: "Recurring invoices", href: "/sales/recurring-invoices", requiredAny: [PERMISSIONS.salesInvoices.view] },
      { group: "Supporting workflows", label: "Delivery notes", href: "/sales/delivery-notes", requiredAny: [PERMISSIONS.salesInvoices.view] },
      { group: "Supporting workflows", label: "Collections", href: "/sales/collections", requiredAny: [PERMISSIONS.salesInvoices.view] },
      { group: "Supporting workflows", label: "Inventory returns", href: "/sales/inventory-returns", requiredAny: [PERMISSIONS.salesInvoices.view] },
      { label: "Customer refunds", href: "/sales/customer-refunds", requiredAny: [PERMISSIONS.customerRefunds.view] },
    ],
  },
  {
    label: "Purchases",
    href: "/purchases/bills",
    activePrefix: "/purchases",
    children: [
      { label: "Bills", href: "/purchases/bills", requiredAny: [PERMISSIONS.purchaseBills.view] },
      { label: "Debit notes", href: "/purchases/debit-notes", requiredAny: [PERMISSIONS.purchaseDebitNotes.view] },
      { label: "Supplier payments", href: "/purchases/supplier-payments", requiredAny: [PERMISSIONS.supplierPayments.view] },
      {
        group: "Review and operations",
        label: "AP dashboard",
        href: "/purchases/ap-dashboard",
        requiredAny: [
          PERMISSIONS.contacts.view,
          PERMISSIONS.purchaseBills.view,
          PERMISSIONS.purchaseOrders.view,
          PERMISSIONS.purchaseReceiving.view,
          PERMISSIONS.inventory.view,
          PERMISSIONS.supplierPayments.view,
          PERMISSIONS.purchaseDebitNotes.view,
          PERMISSIONS.supplierRefunds.view,
        ],
      },
      { group: "Review and operations", label: "Purchase orders", href: "/purchases/purchase-orders", requiredAny: [PERMISSIONS.purchaseOrders.view] },
      {
        group: "Review and operations",
        label: "Purchase returns",
        href: "/purchases/returns",
        requiredAny: [PERMISSIONS.purchaseOrders.view, PERMISSIONS.purchaseBills.view, PERMISSIONS.purchaseReceiving.view],
      },
      {
        group: "Review and operations",
        label: "Matching exceptions",
        href: "/purchases/matching",
        requiredAny: [PERMISSIONS.purchaseOrders.view, PERMISSIONS.purchaseBills.view, PERMISSIONS.purchaseReceiving.view],
      },
      { label: "Supplier refunds", href: "/purchases/supplier-refunds", requiredAny: [PERMISSIONS.supplierRefunds.view] },
      { label: "Cash expenses", href: "/purchases/cash-expenses", requiredAny: [PERMISSIONS.cashExpenses.view] },
    ],
  },
  {
    label: "Banking",
    href: "/bank-accounts",
    activePrefix: "/bank-accounts",
    children: [
      { label: "Bank accounts", href: "/bank-accounts", requiredAny: [PERMISSIONS.bankAccounts.view] },
      { label: "Bank transactions", href: "/bank-accounts", requiredAny: [PERMISSIONS.bankAccounts.view] },
      { label: "Reconciliation", href: "/bank-accounts", requiredAny: [PERMISSIONS.bankReconciliations.view] },
      { label: "Cheques", href: "/bank-accounts", requiredAny: [PERMISSIONS.bankAccounts.view] },
      { label: "Bank transfers", href: "/bank-transfers", requiredAny: [PERMISSIONS.bankTransfers.view] },
    ],
  },
  {
    label: "Accounting",
    href: "/journal-entries",
    activePrefix: "/journal-entries",
    children: [
      { label: "Manual journals", href: "/journal-entries", requiredAny: [PERMISSIONS.journals.view] },
      { label: "Chart of accounts", href: "/accounts", requiredAny: [PERMISSIONS.accounts.view] },
      { label: "Fiscal periods", href: "/fiscal-periods", requiredAny: [PERMISSIONS.fiscalPeriods.view] },
      { label: "Contacts", href: "/contacts", requiredAny: [PERMISSIONS.contacts.view] },
    ],
  },
  {
    label: "Inventory",
    href: "/inventory/balances",
    activePrefix: "/inventory",
    children: [
      { label: "Products & services", href: "/items", requiredAny: [PERMISSIONS.items.view] },
      { label: "Warehouses", href: "/inventory/warehouses", requiredAny: [PERMISSIONS.warehouses.view] },
      { label: "Stock movements", href: "/inventory/stock-movements", requiredAny: [PERMISSIONS.stockMovements.view] },
      { label: "Adjustments", href: "/inventory/adjustments", requiredAny: [PERMISSIONS.inventoryAdjustments.view] },
      { label: "Transfers", href: "/inventory/transfers", requiredAny: [PERMISSIONS.warehouseTransfers.view] },
      { label: "Purchase receipts", href: "/inventory/purchase-receipts", requiredAny: [PERMISSIONS.purchaseReceiving.view] },
      { label: "Sales stock issues", href: "/inventory/sales-stock-issues", requiredAny: [PERMISSIONS.salesStockIssue.view] },
      { label: "Inventory balances", href: "/inventory/balances", requiredAny: [PERMISSIONS.inventory.view] },
      { label: "Stock valuation", href: "/inventory/reports/stock-valuation", requiredAny: [PERMISSIONS.inventory.view] },
      { label: "Movement summary", href: "/inventory/reports/movement-summary", requiredAny: [PERMISSIONS.inventory.view] },
      { label: "Low stock", href: "/inventory/reports/low-stock", requiredAny: [PERMISSIONS.inventory.view] },
      { label: "Clearing reconciliation", href: "/inventory/reports/clearing-reconciliation", requiredAny: [PERMISSIONS.inventory.view] },
      { label: "Clearing variance", href: "/inventory/reports/clearing-variance", requiredAny: [PERMISSIONS.inventory.view] },
      { label: "FIFO cost layers", href: "/inventory/fifo-preview", requiredAny: [PERMISSIONS.inventory.view] },
      { label: "Bin locations", href: "/inventory/bin-locations", requiredAny: [PERMISSIONS.inventory.view] },
      { label: "Batches/lots", href: "/inventory/batches", requiredAny: [PERMISSIONS.inventory.view] },
      { label: "Serial numbers", href: "/inventory/serial-numbers", requiredAny: [PERMISSIONS.inventory.view] },
      { label: "Landed cost preview", href: "/inventory/landed-cost", requiredAny: [PERMISSIONS.inventory.view] },
      { label: "Valuation variances", href: "/inventory/valuation-variances", requiredAny: [PERMISSIONS.inventory.view] },
      { label: "Variance proposals", href: "/inventory/variance-proposals", requiredAny: [PERMISSIONS.inventory.varianceProposalsView] },
      { label: "Inventory settings", href: "/inventory/settings", requiredAny: [PERMISSIONS.inventory.view] },
    ],
  },
  {
    label: "Documents",
    href: "/documents",
    requiredAny: [PERMISSIONS.generatedDocuments.view, PERMISSIONS.documents.view],
  },
  {
    label: "Compliance",
    href: "/settings/compliance",
    activePrefix: "/settings",
    children: [
      { label: "VAT readiness", href: "/reports/vat-return", requiredAny: [PERMISSIONS.reports.view] },
      { label: "Generated documents", href: "/documents", requiredAny: [PERMISSIONS.generatedDocuments.view, PERMISSIONS.documents.view] },
    ],
  },
  {
    label: "Reports",
    href: "/reports",
    requiredAny: [PERMISSIONS.reports.view],
    children: [
      { group: "Financial statements", label: "General Ledger", href: "/reports/general-ledger", requiredAny: [PERMISSIONS.reports.view] },
      { group: "Financial statements", label: "Trial Balance", href: "/reports/trial-balance", requiredAny: [PERMISSIONS.reports.view] },
      { group: "Financial statements", label: "Profit & Loss", href: "/reports/profit-and-loss", requiredAny: [PERMISSIONS.reports.view] },
      { group: "Financial statements", label: "Balance Sheet", href: "/reports/balance-sheet", requiredAny: [PERMISSIONS.reports.view] },
      { group: "Tax reports", label: "VAT Summary", href: "/reports/vat-summary", requiredAny: [PERMISSIONS.reports.view] },
      { group: "Tax reports", label: "VAT Return", href: "/reports/vat-return", requiredAny: [PERMISSIONS.reports.view] },
      { group: "Aging", label: "Aged Receivables", href: "/reports/aged-receivables", requiredAny: [PERMISSIONS.reports.view] },
      { group: "Aging", label: "Aged Payables", href: "/reports/aged-payables", requiredAny: [PERMISSIONS.reports.view] },
    ],
  },
  {
    label: "Settings",
    href: "/settings/team",
    activePrefix: "/settings",
    children: [
      { label: "Organization profile", href: "/organization/setup", requiredAny: [PERMISSIONS.organization.view, PERMISSIONS.organization.update] },
      { label: "Users and roles", href: "/settings/team", requiredAny: [PERMISSIONS.users.view] },
      { label: "Chart of accounts", href: "/accounts", requiredAny: [PERMISSIONS.accounts.view] },
      { label: "Taxes / VAT", href: "/tax-rates", requiredAny: [PERMISSIONS.taxRates.view] },
      { label: "Numbering", href: "/settings/number-sequences", requiredAny: [PERMISSIONS.numberSequences.view] },
      { label: "Document settings", href: "/settings/documents", requiredAny: [PERMISSIONS.documentSettings.view] },
      { label: "Storage settings", href: "/settings/storage", requiredAny: [PERMISSIONS.documentSettings.view, PERMISSIONS.attachments.manage] },
      { label: "Compliance settings", href: "/settings/compliance", requiredAny: [PERMISSIONS.compliance.view] },
      { label: "Security / sessions", href: "/settings/team", requiredAny: [PERMISSIONS.users.view] },
      { label: "API / provider setup", href: "/settings/compliance", requiredAny: [PERMISSIONS.compliance.view] },
      { label: "Branches", href: "/branches", requiredAny: [PERMISSIONS.organization.view] },
      { label: "Roles & Permissions", href: "/settings/roles", requiredAny: [PERMISSIONS.roles.view] },
      { label: "Banking accounting", href: "/settings/banking-accounting", requiredAny: [PERMISSIONS.accounts.view] },
      { label: "Email outbox", href: "/settings/email-outbox", requiredAny: [PERMISSIONS.emailOutbox.view] },
      { label: "Audit logs", href: "/settings/audit-logs", requiredAny: [PERMISSIONS.auditLogs.view] },
    ],
  },
];

export function sidebarNavItemsForMarket(market?: LedgerByteMarket): SidebarNavItem[] {
  const edition = getLedgerByteEdition(market);

  return SIDEBAR_NAV_ITEMS.map((item) => {
    if (item.href !== "/settings/compliance") {
      return item;
    }

    const countryChildren: SidebarNavChild[] = [];
    if (edition.showZatca) {
      countryChildren.push({ label: edition.complianceNavLabel, href: edition.complianceNavHref, requiredAny: [PERMISSIONS.zatca.view] });
    }
    if (edition.showUaeEinvoicing) {
      countryChildren.push({ label: edition.complianceNavLabel, href: edition.complianceNavHref, requiredAny: [PERMISSIONS.compliance.view] });
      countryChildren.push({ label: "Local PINT-AE QA", href: "/settings/compliance", requiredAny: [PERMISSIONS.compliance.view] });
    }

    return {
      ...item,
      children: [...countryChildren, ...(item.children ?? [])],
    };
  });
}

export function filterSidebarNavItems(
  subject: PermissionSubject,
  items: readonly SidebarNavItem[] = sidebarNavItemsForMarket(),
): SidebarNavItem[] {
  return items.flatMap((item) => {
    const children = item.children?.filter((child) => canViewNavItem(subject, child.requiredAny));
    const visible = Boolean(children?.length) || (item.requiredAny ? canViewNavItem(subject, item.requiredAny) : false);

    return visible ? [{ ...item, children }] : [];
  });
}
