import { formatMoneyAmount } from "./money";
import { hasPermission, PERMISSIONS, type Permission, type PermissionSubject } from "./permissions";
import type { DashboardAttentionItem, DashboardAttentionSeverity, DashboardSummary } from "./types";

export interface DashboardQuickAction {
  label: string;
  href: string;
  permission: Permission;
}

export const DASHBOARD_QUICK_ACTIONS: readonly DashboardQuickAction[] = [
  { label: "Create invoice", href: "/sales/invoices/new", permission: PERMISSIONS.salesInvoices.create },
  { label: "Record customer payment", href: "/sales/customer-payments/new", permission: PERMISSIONS.customerPayments.create },
  { label: "Create purchase bill", href: "/purchases/bills/new", permission: PERMISSIONS.purchaseBills.create },
  { label: "Record supplier payment", href: "/purchases/supplier-payments/new", permission: PERMISSIONS.supplierPayments.create },
  { label: "Create cash expense", href: "/purchases/cash-expenses/new", permission: PERMISSIONS.cashExpenses.create },
  { label: "Import bank statement", href: "/bank-accounts", permission: PERMISSIONS.bankStatements.import },
  { label: "View reports", href: "/reports", permission: PERMISSIONS.reports.view },
  { label: "Inventory adjustment", href: "/inventory/adjustments/new", permission: PERMISSIONS.inventoryAdjustments.create },
];

export type DashboardDrilldownKey =
  | "unpaidInvoices"
  | "overdueInvoices"
  | "unpaidBills"
  | "overdueBills"
  | "customerPayments"
  | "supplierPayments"
  | "bankBalance"
  | "bankReconciliations"
  | "unreconciledTransactions"
  | "lowStock"
  | "negativeStock"
  | "clearingVariances"
  | "trialBalance"
  | "profitAndLoss"
  | "balanceSheet"
  | "fiscalPeriods"
  | "zatcaReadiness"
  | "auditLogs"
  | "storage";

export interface DashboardDrilldownLink {
  label: string;
  href: string;
  permissions: readonly Permission[];
}

export const DASHBOARD_DRILLDOWN_LINKS: Record<DashboardDrilldownKey, DashboardDrilldownLink> = {
  unpaidInvoices: { label: "View invoices", href: "/sales/invoices", permissions: [PERMISSIONS.salesInvoices.view] },
  overdueInvoices: { label: "View aged receivables", href: "/reports/aged-receivables", permissions: [PERMISSIONS.reports.view] },
  unpaidBills: { label: "View bills", href: "/purchases/bills", permissions: [PERMISSIONS.purchaseBills.view] },
  overdueBills: { label: "View aged payables", href: "/reports/aged-payables", permissions: [PERMISSIONS.reports.view] },
  customerPayments: { label: "View customer payments", href: "/sales/customer-payments", permissions: [PERMISSIONS.customerPayments.view] },
  supplierPayments: { label: "View supplier payments", href: "/purchases/supplier-payments", permissions: [PERMISSIONS.supplierPayments.view] },
  bankBalance: { label: "View bank accounts", href: "/bank-accounts", permissions: [PERMISSIONS.bankAccounts.view] },
  bankReconciliations: { label: "View bank accounts", href: "/bank-accounts", permissions: [PERMISSIONS.bankAccounts.view] },
  unreconciledTransactions: { label: "Review bank accounts", href: "/bank-accounts", permissions: [PERMISSIONS.bankAccounts.view] },
  lowStock: { label: "View low stock", href: "/inventory/reports/low-stock", permissions: [PERMISSIONS.inventory.view] },
  negativeStock: { label: "View inventory balances", href: "/inventory/balances", permissions: [PERMISSIONS.inventory.view] },
  clearingVariances: { label: "View variances", href: "/inventory/reports/clearing-variance", permissions: [PERMISSIONS.inventory.view] },
  trialBalance: { label: "View trial balance", href: "/reports/trial-balance", permissions: [PERMISSIONS.reports.view] },
  profitAndLoss: { label: "View P&L", href: "/reports/profit-and-loss", permissions: [PERMISSIONS.reports.view] },
  balanceSheet: { label: "View balance sheet", href: "/reports/balance-sheet", permissions: [PERMISSIONS.reports.view] },
  fiscalPeriods: { label: "View fiscal periods", href: "/fiscal-periods", permissions: [PERMISSIONS.fiscalPeriods.view] },
  zatcaReadiness: { label: "View ZATCA", href: "/settings/zatca", permissions: [PERMISSIONS.zatca.view] },
  auditLogs: { label: "View audit logs", href: "/settings/audit-logs", permissions: [PERMISSIONS.auditLogs.view] },
  storage: {
    label: "View storage",
    href: "/settings/storage",
    permissions: [PERMISSIONS.documentSettings.view, PERMISSIONS.attachments.manage],
  },
};

export function formatDashboardMoney(value: string | number, currency = "SAR"): string {
  return formatMoneyAmount(value, currency);
}

export function attentionSeverityLabel(severity: DashboardAttentionSeverity): string {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    case "info":
      return "Info";
  }
}

export function attentionSeverityClass(severity: DashboardAttentionSeverity): string {
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "info":
      return "border-blue-200 bg-blue-50 text-blue-800";
  }
}

export function dashboardHealthLabel(value: boolean): string {
  return value ? "Balanced" : "Needs review";
}

export function visibleDashboardQuickActions(subject: PermissionSubject): DashboardQuickAction[] {
  return DASHBOARD_QUICK_ACTIONS.filter((action) => hasPermission(subject, action.permission));
}

export function dashboardDrilldownLink(key: DashboardDrilldownKey, subject: PermissionSubject): DashboardDrilldownLink | null {
  const link = DASHBOARD_DRILLDOWN_LINKS[key];
  return link.permissions.some((permission) => hasPermission(subject, permission)) ? link : null;
}

export function chartMaxAmount(values: Array<string | number>): number {
  return values.reduce<number>((max, value) => Math.max(max, Math.abs(Number(value) || 0)), 0);
}

export function chartBarPercent(value: string | number, max: number): string {
  const numeric = Math.abs(Number(value) || 0);
  if (numeric <= 0 || max <= 0) {
    return "0%";
  }
  return `${Math.max(4, Math.min(100, (numeric / max) * 100)).toFixed(1)}%`;
}

export function chartHasData<T>(points: T[], valueKey: keyof T | string = "amount"): boolean {
  return points.some((point) => Number((point as Record<string, unknown>)[String(valueKey)]) !== 0);
}

export function agingBucketLabel(bucket: string): string {
  switch (bucket) {
    case "CURRENT":
      return "Current";
    case "1_30":
      return "1-30";
    case "31_60":
      return "31-60";
    case "61_90":
      return "61-90";
    case "90_PLUS":
      return "90+";
    default:
      return bucket;
  }
}

export function groupAttentionBySeverity(items: DashboardAttentionItem[]): Record<DashboardAttentionSeverity, DashboardAttentionItem[]> {
  return {
    critical: items.filter((item) => item.severity === "critical"),
    warning: items.filter((item) => item.severity === "warning"),
    info: items.filter((item) => item.severity === "info"),
  };
}

export function dashboardIsEmpty(summary: DashboardSummary): boolean {
  return (
    summary.sales.unpaidInvoiceCount === 0 &&
    summary.purchases.unpaidBillCount === 0 &&
    summary.banking.bankAccountCount === 0 &&
    summary.inventory.trackedItemCount === 0 &&
    summary.attentionItems.length === 0
  );
}
