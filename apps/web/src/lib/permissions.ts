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
    return [PERMISSIONS.organization.view];
  }

  if (pathname.startsWith("/reports")) {
    return [PERMISSIONS.reports.view];
  }

  if (pathname === "/bank-accounts/new") {
    return [PERMISSIONS.bankAccounts.manage];
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

  if (pathname === "/sales/invoices/new") {
    return [PERMISSIONS.salesInvoices.create];
  }
  if (pathname.startsWith("/sales/invoices/") && pathname.endsWith("/edit")) {
    return [PERMISSIONS.salesInvoices.update];
  }
  if (pathname.startsWith("/sales/invoices")) {
    return [PERMISSIONS.salesInvoices.view];
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

  if (pathname.startsWith("/contacts")) {
    return [PERMISSIONS.contacts.view];
  }

  if (pathname.startsWith("/items")) {
    return [PERMISSIONS.items.view];
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

  if (pathname.startsWith("/documents")) {
    return [PERMISSIONS.generatedDocuments.view, PERMISSIONS.documents.view];
  }

  if (pathname.startsWith("/settings/documents")) {
    return [PERMISSIONS.documentSettings.view];
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

  return [];
}
