import { formatMoneyAmount } from "./money";
import { hasPermission, PERMISSIONS, type Permission, type PermissionSubject } from "./permissions";
import type { DashboardAttentionSeverity, DashboardSummary } from "./types";

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

export function dashboardIsEmpty(summary: DashboardSummary): boolean {
  return (
    summary.sales.unpaidInvoiceCount === 0 &&
    summary.purchases.unpaidBillCount === 0 &&
    summary.banking.bankAccountCount === 0 &&
    summary.inventory.trackedItemCount === 0 &&
    summary.attentionItems.length === 0
  );
}
