import {
  ALL_PERMISSIONS,
  hasAllPermissions as sharedHasAllPermissions,
  hasAnyPermission as sharedHasAnyPermission,
  hasPermission as sharedHasPermission,
  isFullAccess as sharedIsFullAccess,
  normalizePermissions,
  PERMISSIONS,
  type Permission,
} from "../../../../packages/shared/src/permissions";
import type { MeResponse } from "./types";

export { ALL_PERMISSIONS, PERMISSIONS, type Permission };

export type PermissionSubject =
  | Pick<MeResponse, "memberships">
  | MeResponse["memberships"][number]
  | { role?: { permissions?: unknown } | null; permissions?: unknown }
  | null
  | undefined;

export function getSubjectPermissions(subject: PermissionSubject): string[] {
  if (!subject) {
    return [];
  }

  if ("memberships" in subject) {
    return normalizePermissions(subject.memberships[0]?.role.permissions);
  }

  if ("role" in subject) {
    return normalizePermissions(subject.role?.permissions);
  }

  return normalizePermissions(subject.permissions);
}

export function isFullAccess(subject: PermissionSubject): boolean {
  return sharedIsFullAccess(getSubjectPermissions(subject));
}

export function hasPermission(subject: PermissionSubject, permission: Permission): boolean {
  return sharedHasPermission(getSubjectPermissions(subject), permission);
}

export function hasAnyPermission(subject: PermissionSubject, ...permissions: Permission[]): boolean {
  return sharedHasAnyPermission(getSubjectPermissions(subject), permissions);
}

export function hasAllPermissions(subject: PermissionSubject, ...permissions: Permission[]): boolean {
  return sharedHasAllPermissions(getSubjectPermissions(subject), permissions);
}

export function canViewNavItem(subject: PermissionSubject, requiredAny: readonly Permission[]): boolean {
  return requiredAny.length > 0 && sharedHasAnyPermission(getSubjectPermissions(subject), requiredAny);
}

export function getRequiredPermissionsForPathname(pathname: string): Permission[] {
  if (pathname === "/dashboard") {
    return [PERMISSIONS.dashboard.view];
  }

  if (pathname === "/setup") {
    return [PERMISSIONS.dashboard.view];
  }

  if (pathname === "/organization/setup") {
    return [];
  }

  if (pathname.startsWith("/reports")) {
    return [PERMISSIONS.reports.view];
  }

  if (pathname === "/tax" || pathname.startsWith("/tax/")) {
    return [PERMISSIONS.reports.view];
  }

  if (pathname === "/bank-accounts/new") {
    return [PERMISSIONS.bankAccounts.manage];
  }
  if (pathname.endsWith("/reconciliations/new")) {
    return [PERMISSIONS.bankReconciliations.create];
  }
  if (pathname.includes("/reconciliations")) {
    return [PERMISSIONS.bankReconciliations.view];
  }
  if (pathname.includes("/statement-imports") || pathname.includes("/statement-transactions") || pathname.includes("/reconciliation")) {
    return [PERMISSIONS.bankStatements.view];
  }
  if (pathname.startsWith("/bank-accounts/") && pathname.endsWith("/edit")) {
    return [PERMISSIONS.bankAccounts.manage];
  }
  if (pathname.startsWith("/bank-accounts")) {
    return [PERMISSIONS.bankAccounts.view];
  }

  if (pathname === "/bank-transfers/new") {
    return [PERMISSIONS.bankTransfers.create];
  }
  if (pathname.startsWith("/bank-transfers")) {
    return [PERMISSIONS.bankTransfers.view];
  }
  if (pathname.startsWith("/bank-reconciliations")) {
    return [PERMISSIONS.bankReconciliations.view];
  }
  if (pathname.startsWith("/bank-statement-transactions")) {
    return [PERMISSIONS.bankStatements.view];
  }

  if (pathname === "/sales/invoices/new") {
    return [PERMISSIONS.salesInvoices.create];
  }
  if (pathname.startsWith("/sales/invoices/") && pathname.endsWith("/edit")) {
    return [PERMISSIONS.salesInvoices.update];
  }
  if (pathname.startsWith("/sales/invoices")) {
    return [PERMISSIONS.salesInvoices.view];
  }

  if (pathname === "/sales/quotes/new") {
    return [PERMISSIONS.salesInvoices.create];
  }
  if (pathname.startsWith("/sales/quotes/") && pathname.endsWith("/edit")) {
    return [PERMISSIONS.salesInvoices.update];
  }
  if (pathname.startsWith("/sales/quotes")) {
    return [PERMISSIONS.salesInvoices.view];
  }

  if (pathname === "/sales/recurring-invoices/new") {
    return [PERMISSIONS.salesInvoices.create];
  }
  if (pathname.startsWith("/sales/recurring-invoices/") && pathname.endsWith("/edit")) {
    return [PERMISSIONS.salesInvoices.update];
  }
  if (pathname.startsWith("/sales/recurring-invoices")) {
    return [PERMISSIONS.salesInvoices.view];
  }

  if (pathname === "/sales/delivery-notes/new") {
    return [PERMISSIONS.salesInvoices.create];
  }
  if (pathname.startsWith("/sales/delivery-notes/") && pathname.endsWith("/edit")) {
    return [PERMISSIONS.salesInvoices.update];
  }
  if (pathname.startsWith("/sales/delivery-notes")) {
    return [PERMISSIONS.salesInvoices.view];
  }

  if (pathname === "/sales/inventory-returns/new") {
    return [PERMISSIONS.salesInvoices.create];
  }
  if (pathname.startsWith("/sales/inventory-returns/") && pathname.endsWith("/edit")) {
    return [PERMISSIONS.salesInvoices.update];
  }
  if (pathname.startsWith("/sales/inventory-returns")) {
    return [PERMISSIONS.salesInvoices.view];
  }

  if (pathname === "/sales/collections/new") {
    return [PERMISSIONS.salesInvoices.create];
  }
  if (pathname.startsWith("/sales/collections/") && pathname.endsWith("/edit")) {
    return [PERMISSIONS.salesInvoices.update];
  }
  if (pathname.startsWith("/sales/collections")) {
    return [PERMISSIONS.salesInvoices.view];
  }

  if (pathname.startsWith("/customers")) {
    return [PERMISSIONS.contacts.view];
  }

  if (pathname === "/sales/customer-payments/new") {
    return [PERMISSIONS.customerPayments.create];
  }
  if (pathname.startsWith("/sales/customer-payments")) {
    return [PERMISSIONS.customerPayments.view];
  }

  if (pathname === "/sales/credit-notes/new") {
    return [PERMISSIONS.creditNotes.create];
  }
  if (pathname.startsWith("/sales/credit-notes/") && pathname.endsWith("/edit")) {
    return [PERMISSIONS.creditNotes.create];
  }
  if (pathname.startsWith("/sales/credit-notes")) {
    return [PERMISSIONS.creditNotes.view];
  }

  if (pathname === "/sales/customer-refunds/new") {
    return [PERMISSIONS.customerRefunds.create];
  }
  if (pathname.startsWith("/sales/customer-refunds")) {
    return [PERMISSIONS.customerRefunds.view];
  }

  if (
    pathname === "/sales" ||
    pathname.startsWith("/sales/cash-invoices") ||
    pathname.startsWith("/sales/api-invoices")
  ) {
    return [PERMISSIONS.salesInvoices.view];
  }

  if (pathname.startsWith("/purchases/ap-dashboard")) {
    return [
      PERMISSIONS.contacts.view,
      PERMISSIONS.purchaseBills.view,
      PERMISSIONS.purchaseOrders.view,
      PERMISSIONS.purchaseReceiving.view,
      PERMISSIONS.inventory.view,
      PERMISSIONS.supplierPayments.view,
      PERMISSIONS.purchaseDebitNotes.view,
      PERMISSIONS.supplierRefunds.view,
    ];
  }

  if (pathname === "/purchases/bills/new") {
    return [PERMISSIONS.purchaseBills.create];
  }
  if (pathname.startsWith("/purchases/bills/") && pathname.endsWith("/edit")) {
    return [PERMISSIONS.purchaseBills.update];
  }
  if (pathname.startsWith("/purchases/bills")) {
    return [PERMISSIONS.purchaseBills.view];
  }

  if (pathname === "/purchases/purchase-orders/new") {
    return [PERMISSIONS.purchaseOrders.create];
  }
  if (pathname.startsWith("/purchases/purchase-orders/") && pathname.endsWith("/edit")) {
    return [PERMISSIONS.purchaseOrders.update];
  }
  if (pathname.startsWith("/purchases/purchase-orders")) {
    return [PERMISSIONS.purchaseOrders.view];
  }

  if (pathname === "/purchases/returns/new") {
    return [PERMISSIONS.purchaseBills.create, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create];
  }
  if (pathname.startsWith("/purchases/returns/") && pathname.endsWith("/edit")) {
    return [PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create];
  }
  if (pathname.startsWith("/purchases/returns")) {
    return [PERMISSIONS.purchaseOrders.view, PERMISSIONS.purchaseBills.view, PERMISSIONS.purchaseReceiving.view];
  }

  if (pathname.startsWith("/purchases/matching")) {
    return [PERMISSIONS.purchaseOrders.view, PERMISSIONS.purchaseBills.view, PERMISSIONS.purchaseReceiving.view];
  }

  if (pathname === "/purchases/supplier-payments/new") {
    return [PERMISSIONS.supplierPayments.create];
  }
  if (pathname.startsWith("/purchases/supplier-payments")) {
    return [PERMISSIONS.supplierPayments.view];
  }

  if (pathname === "/purchases/debit-notes/new") {
    return [PERMISSIONS.purchaseDebitNotes.create];
  }
  if (pathname.startsWith("/purchases/debit-notes/") && pathname.endsWith("/edit")) {
    return [PERMISSIONS.purchaseDebitNotes.create];
  }
  if (pathname.startsWith("/purchases/debit-notes")) {
    return [PERMISSIONS.purchaseDebitNotes.view];
  }

  if (pathname === "/purchases/supplier-refunds/new") {
    return [PERMISSIONS.supplierRefunds.create];
  }
  if (pathname.startsWith("/purchases/supplier-refunds")) {
    return [PERMISSIONS.supplierRefunds.view];
  }

  if (pathname === "/purchases/cash-expenses/new") {
    return [PERMISSIONS.cashExpenses.create];
  }
  if (pathname.startsWith("/purchases/cash-expenses")) {
    return [PERMISSIONS.cashExpenses.view];
  }

  if (pathname === "/purchases") {
    return [
      PERMISSIONS.purchaseOrders.view,
      PERMISSIONS.purchaseBills.view,
      PERMISSIONS.supplierPayments.view,
      PERMISSIONS.supplierRefunds.view,
      PERMISSIONS.cashExpenses.view,
      PERMISSIONS.purchaseDebitNotes.view,
    ];
  }

  if (pathname.startsWith("/suppliers")) {
    return [PERMISSIONS.contacts.view];
  }

  if (pathname.startsWith("/contacts")) {
    return [PERMISSIONS.contacts.view];
  }

  if (pathname.startsWith("/items")) {
    return [PERMISSIONS.items.view];
  }

  if (pathname.startsWith("/products")) {
    return [PERMISSIONS.items.view];
  }

  if (pathname === "/inventory/stock-movements/new") {
    return [PERMISSIONS.stockMovements.create];
  }
  if (pathname === "/inventory/adjustments/new") {
    return [PERMISSIONS.inventoryAdjustments.create];
  }
  if (pathname.startsWith("/inventory/adjustments/") && pathname.endsWith("/edit")) {
    return [PERMISSIONS.inventoryAdjustments.create];
  }
  if (pathname.startsWith("/inventory/adjustments")) {
    return [PERMISSIONS.inventoryAdjustments.view];
  }
  if (pathname === "/inventory/transfers/new") {
    return [PERMISSIONS.warehouseTransfers.create];
  }
  if (pathname.startsWith("/inventory/transfers")) {
    return [PERMISSIONS.warehouseTransfers.view];
  }
  if (pathname === "/inventory/purchase-receipts/new") {
    return [PERMISSIONS.purchaseReceiving.create];
  }
  if (pathname.startsWith("/inventory/purchase-receipts")) {
    return [PERMISSIONS.purchaseReceiving.view];
  }
  if (pathname.startsWith("/inventory/landed-cost")) {
    return [PERMISSIONS.inventory.view];
  }
  if (pathname.startsWith("/inventory/fifo-preview")) {
    return [PERMISSIONS.inventory.view];
  }
  if (
    pathname.startsWith("/inventory/bin-locations") ||
    pathname.startsWith("/inventory/batches") ||
    pathname.startsWith("/inventory/serial-numbers") ||
    pathname.startsWith("/inventory/traceability")
  ) {
    return [PERMISSIONS.inventory.view];
  }
  if (pathname.startsWith("/inventory/valuation-variances")) {
    return [PERMISSIONS.inventory.view];
  }
  if (pathname === "/inventory/sales-stock-issues/new") {
    return [PERMISSIONS.salesStockIssue.create];
  }
  if (pathname.startsWith("/inventory/sales-stock-issues")) {
    return [PERMISSIONS.salesStockIssue.view];
  }
  if (pathname === "/inventory/variance-proposals/new") {
    return [PERMISSIONS.inventory.varianceProposalsCreate];
  }
  if (pathname.startsWith("/inventory/variance-proposals")) {
    return [PERMISSIONS.inventory.varianceProposalsView];
  }
  if (pathname.startsWith("/inventory/warehouses")) {
    return [PERMISSIONS.warehouses.view];
  }
  if (pathname.startsWith("/inventory/stock-movements")) {
    return [PERMISSIONS.stockMovements.view];
  }
  if (pathname.startsWith("/inventory")) {
    return [PERMISSIONS.inventory.view];
  }

  if (pathname.startsWith("/journal-entries/new")) {
    return [PERMISSIONS.journals.create];
  }
  if (pathname.startsWith("/journal-entries")) {
    return [PERMISSIONS.journals.view];
  }

  if (pathname.startsWith("/accounts")) {
    return [PERMISSIONS.accounts.view];
  }

  if (pathname.startsWith("/tax-rates")) {
    return [PERMISSIONS.taxRates.view];
  }

  if (pathname.startsWith("/fiscal-periods")) {
    return [PERMISSIONS.fiscalPeriods.view];
  }

  if (pathname.startsWith("/branches")) {
    return [PERMISSIONS.organization.view];
  }

  if (pathname === "/get-started" || pathname.startsWith("/inbox")) {
    return [PERMISSIONS.dashboard.view];
  }

  if (pathname.startsWith("/beneficiaries")) {
    return [PERMISSIONS.bankAccounts.view, PERMISSIONS.bankTransfers.view];
  }

  if (pathname.startsWith("/payroll")) {
    return [PERMISSIONS.users.view];
  }

  if (pathname.startsWith("/accounting") || pathname.startsWith("/cost-centers") || pathname.startsWith("/projects")) {
    return [PERMISSIONS.accounts.view, PERMISSIONS.journals.view];
  }

  if (pathname.startsWith("/fixed-assets")) {
    return [PERMISSIONS.accounts.view, PERMISSIONS.inventory.view];
  }

  if (pathname.startsWith("/developer") || pathname.startsWith("/integrations")) {
    return [PERMISSIONS.users.manage, PERMISSIONS.roles.manage];
  }

  if (pathname.startsWith("/document-templates")) {
    return [PERMISSIONS.documentSettings.view];
  }

  if (pathname.startsWith("/documents")) {
    return [PERMISSIONS.generatedDocuments.view, PERMISSIONS.documents.view];
  }

  if (pathname.startsWith("/settings/documents")) {
    return [PERMISSIONS.documentSettings.view];
  }

  if (pathname.startsWith("/settings/storage")) {
    return [PERMISSIONS.documentSettings.view, PERMISSIONS.attachments.manage];
  }

  if (pathname.startsWith("/settings/data-management")) {
    return [PERMISSIONS.documentSettings.view, PERMISSIONS.auditLogs.view];
  }

  if (pathname.startsWith("/settings/email-outbox")) {
    return [PERMISSIONS.emailOutbox.view];
  }

  if (pathname.startsWith("/settings/banking-accounting")) {
    return [PERMISSIONS.accounts.view];
  }

  if (pathname.startsWith("/settings/compliance")) {
    return [PERMISSIONS.compliance.view];
  }

  if (pathname.startsWith("/settings/audit-logs")) {
    return [PERMISSIONS.auditLogs.view];
  }

  if (pathname.startsWith("/settings/number-sequences")) {
    return [PERMISSIONS.numberSequences.view];
  }

  if (pathname.startsWith("/settings/zatca")) {
    return [PERMISSIONS.zatca.view];
  }

  if (pathname.startsWith("/settings/team")) {
    return [PERMISSIONS.users.view];
  }

  if (pathname.startsWith("/settings/roles")) {
    return [PERMISSIONS.roles.view];
  }

  if (pathname.startsWith("/settings/security")) {
    return [PERMISSIONS.users.view];
  }

  return [PERMISSIONS.dashboard.view];
}
