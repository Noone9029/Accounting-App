import { getAppRouteByKey, type AppRoute, type AppRouteKey } from "./app-routes";
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

interface SidebarChildRef {
  key: AppRouteKey;
  label?: string;
  group?: string;
  requiredAny?: readonly Permission[];
}

interface SidebarItemRef {
  key: AppRouteKey;
  label?: string;
  children?: readonly SidebarChildRef[];
}

const SIDEBAR_ROUTE_REFS: readonly SidebarItemRef[] = [
  { key: "dashboard" },
  { key: "customers" },
  { key: "suppliers" },
  {
    key: "sales.invoice.list",
    label: "Sales",
    children: [
      { key: "sales.invoice.list" },
      { key: "sales.creditNote.list" },
      { key: "sales.customerPayment.list" },
      { key: "sales.quote.list" },
      { key: "sales.recurringInvoice.list" },
      { key: "sales.deliveryNote.list" },
      { key: "sales.collection.list" },
      { key: "sales.inventoryReturn.list" },
      { key: "sales.customerRefund.list" },
    ],
  },
  {
    key: "purchase.bill.list",
    label: "Purchases",
    children: [
      { key: "purchase.bill.list" },
      { key: "purchase.debitNote.list" },
      { key: "purchase.supplierPayment.list" },
      { key: "purchase.supplierPayoutRequest.list" },
      { key: "purchase.apDashboard" },
      { key: "purchase.order.list" },
      { key: "purchase.return.list" },
      { key: "purchase.matching" },
      { key: "purchase.supplierRefund.list" },
      { key: "purchase.cashExpense.list" },
    ],
  },
  {
    key: "banking.bankAccounts",
    label: "Banking",
    children: [
      { key: "banking.bankAccounts" },
      { key: "banking.bankTransfers" },
    ],
  },
  {
    key: "accounting.journals",
    label: "Accounting",
    children: [
      { key: "accounting.journals" },
      { key: "accounting.accounts" },
      { key: "accounting.fiscalPeriods" },
      { key: "contacts" },
    ],
  },
  {
    key: "inventory.balances",
    label: "Inventory",
    children: [
      { key: "inventory.items" },
      { key: "inventory.warehouses" },
      { key: "inventory.stockMovements" },
      { key: "inventory.adjustments" },
      { key: "inventory.transfers" },
      { key: "inventory.purchaseReceipts" },
      { key: "inventory.salesStockIssues" },
      { key: "inventory.balances" },
      { key: "inventory.report.stockValuation" },
      { key: "inventory.report.movementSummary" },
      { key: "inventory.report.lowStock" },
      { key: "inventory.report.clearingReconciliation" },
      { key: "inventory.report.clearingVariance" },
      { key: "inventory.fifoPreview" },
      { key: "inventory.binLocations" },
      { key: "inventory.batches" },
      { key: "inventory.serialNumbers" },
      { key: "inventory.landedCost" },
      { key: "inventory.valuationVariances" },
      { key: "inventory.varianceProposals" },
      { key: "inventory.settings" },
    ],
  },
  { key: "documents" },
  {
    key: "settings.compliance",
    label: "Compliance",
    children: [
      { key: "reports.vatReturn", label: "VAT readiness" },
      { key: "documents", label: "Generated documents" },
    ],
  },
  {
    key: "reports",
    children: [
      { key: "reports.generalLedger" },
      { key: "reports.trialBalance" },
      { key: "reports.profitLoss" },
      { key: "reports.balanceSheet" },
      { key: "reports.vatSummary" },
      { key: "reports.vatReturn" },
      { key: "reports.agedReceivables" },
      { key: "reports.agedPayables" },
    ],
  },
  {
    key: "settings.team",
    label: "Settings",
    children: [
      { key: "settings.organization" },
      { key: "settings.team" },
      { key: "accounting.accounts" },
      { key: "settings.taxRates" },
      { key: "settings.numbering" },
      { key: "settings.documents" },
      { key: "settings.storage" },
      { key: "settings.compliance" },
      { key: "settings.security" },
      { key: "settings.branches" },
      { key: "settings.roles" },
      { key: "settings.bankingAccounting" },
      { key: "settings.emailOutbox" },
      { key: "settings.auditLogs" },
    ],
  },
];

export const SIDEBAR_NAV_ITEMS: readonly SidebarNavItem[] = SIDEBAR_ROUTE_REFS.map(sidebarItemFromRef);

export function sidebarNavItemsForMarket(market?: LedgerByteMarket): SidebarNavItem[] {
  const edition = getLedgerByteEdition(market);

  return SIDEBAR_NAV_ITEMS.map((item) => {
    if (item.href !== "/settings/compliance" || item.label !== "Compliance") {
      return item;
    }

    const countryChildren: SidebarNavChild[] = [];
    if (edition.showZatca) {
      const route = requireRoute("settings.zatca");
      countryChildren.push({ label: edition.complianceNavLabel, href: edition.complianceNavHref, requiredAny: route.requiredAny });
    }
    if (edition.showUaeEinvoicing) {
      const route = requireRoute("settings.compliance");
      countryChildren.push({ label: edition.complianceNavLabel, href: edition.complianceNavHref, requiredAny: route.requiredAny });
      countryChildren.push({ label: "Local PINT-AE QA", href: route.href, requiredAny: route.requiredAny });
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

function sidebarItemFromRef(ref: SidebarItemRef): SidebarNavItem {
  const route = requireRoute(ref.key);

  return {
    label: ref.label ?? route.label,
    href: route.href,
    activePrefix: route.activePrefix,
    requiredAny: route.requiredAny,
    children: ref.children?.map(sidebarChildFromRef),
  };
}

function sidebarChildFromRef(ref: SidebarChildRef): SidebarNavChild {
  const route = requireRoute(ref.key);

  return {
    label: ref.label ?? route.label,
    href: route.href,
    requiredAny: ref.requiredAny ?? route.requiredAny,
    group: ref.group ?? route.sidebarGroup,
  };
}

function requireRoute(key: AppRouteKey): AppRoute {
  const route = getAppRouteByKey(key);
  if (!route) {
    throw new Error(`Unknown LedgerByte app route key: ${key}`);
  }
  return route;
}
