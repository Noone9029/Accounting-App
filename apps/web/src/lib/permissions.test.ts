import {
  getRequiredPermissionsForPathname,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isFullAccess,
  PERMISSIONS,
} from "./permissions";
import { filterSidebarNavItems } from "./sidebar-nav";

const subject = (permissions: string[]) => ({
  role: { permissions },
});

describe("permission helpers", () => {
  it("allows explicit permissions and admin.fullAccess", () => {
    expect(hasPermission(subject([PERMISSIONS.reports.view]), PERMISSIONS.reports.view)).toBe(true);
    expect(hasPermission(subject([PERMISSIONS.reports.view]), PERMISSIONS.salesInvoices.finalize)).toBe(false);
    expect(hasPermission(subject([PERMISSIONS.admin.fullAccess]), PERMISSIONS.salesInvoices.finalize)).toBe(true);
    expect(isFullAccess(subject([PERMISSIONS.admin.fullAccess]))).toBe(true);
  });

  it("checks any/all permission sets", () => {
    const viewer = subject([PERMISSIONS.reports.view, PERMISSIONS.documents.view]);

    expect(hasAnyPermission(viewer, PERMISSIONS.reports.view, PERMISSIONS.salesInvoices.view)).toBe(true);
    expect(hasAnyPermission(viewer, PERMISSIONS.salesInvoices.view, PERMISSIONS.purchaseBills.view)).toBe(false);
    expect(hasAllPermissions(viewer, PERMISSIONS.reports.view, PERMISSIONS.documents.view)).toBe(true);
    expect(hasAllPermissions(viewer, PERMISSIONS.reports.view, PERMISSIONS.documents.download)).toBe(false);
  });

  it("maps routes to required permissions for access-denied checks", () => {
    expect(getRequiredPermissionsForPathname("/reports/trial-balance")).toEqual([PERMISSIONS.reports.view]);
    expect(getRequiredPermissionsForPathname("/bank-accounts")).toEqual([PERMISSIONS.bankAccounts.view]);
    expect(getRequiredPermissionsForPathname("/bank-accounts/new")).toEqual([PERMISSIONS.bankAccounts.manage]);
    expect(getRequiredPermissionsForPathname("/bank-accounts/profile-1/edit")).toEqual([PERMISSIONS.bankAccounts.manage]);
    expect(getRequiredPermissionsForPathname("/bank-accounts/profile-1/statement-imports")).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
    expect(getRequiredPermissionsForPathname("/bank-accounts/profile-1/reconciliation")).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
    expect(getRequiredPermissionsForPathname("/bank-statement-transactions/row-1")).toEqual([PERMISSIONS.bankStatements.view]);
    expect(getRequiredPermissionsForPathname("/bank-transfers")).toEqual([PERMISSIONS.bankTransfers.view]);
    expect(getRequiredPermissionsForPathname("/bank-transfers/new")).toEqual([PERMISSIONS.bankTransfers.create]);
    expect(getRequiredPermissionsForPathname("/sales/invoices/new")).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(getRequiredPermissionsForPathname("/sales/invoices/inv-1/edit")).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(getRequiredPermissionsForPathname("/purchases/purchase-orders/new")).toEqual([PERMISSIONS.purchaseOrders.create]);
    expect(getRequiredPermissionsForPathname("/purchases/purchase-orders/po-1/edit")).toEqual([PERMISSIONS.purchaseOrders.update]);
    expect(getRequiredPermissionsForPathname("/inventory/balances")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/inventory/warehouses")).toEqual([PERMISSIONS.warehouses.view]);
    expect(getRequiredPermissionsForPathname("/inventory/adjustments")).toEqual([PERMISSIONS.inventoryAdjustments.view]);
    expect(getRequiredPermissionsForPathname("/inventory/adjustments/new")).toEqual([PERMISSIONS.inventoryAdjustments.create]);
    expect(getRequiredPermissionsForPathname("/inventory/adjustments/adj-1/edit")).toEqual([
      PERMISSIONS.inventoryAdjustments.create,
    ]);
    expect(getRequiredPermissionsForPathname("/inventory/transfers")).toEqual([PERMISSIONS.warehouseTransfers.view]);
    expect(getRequiredPermissionsForPathname("/inventory/transfers/new")).toEqual([PERMISSIONS.warehouseTransfers.create]);
    expect(getRequiredPermissionsForPathname("/inventory/purchase-receipts")).toEqual([PERMISSIONS.purchaseReceiving.view]);
    expect(getRequiredPermissionsForPathname("/inventory/purchase-receipts/new")).toEqual([PERMISSIONS.purchaseReceiving.create]);
    expect(getRequiredPermissionsForPathname("/inventory/sales-stock-issues")).toEqual([PERMISSIONS.salesStockIssue.view]);
    expect(getRequiredPermissionsForPathname("/inventory/sales-stock-issues/new")).toEqual([PERMISSIONS.salesStockIssue.create]);
    expect(getRequiredPermissionsForPathname("/inventory/stock-movements")).toEqual([PERMISSIONS.stockMovements.view]);
    expect(getRequiredPermissionsForPathname("/inventory/stock-movements/new")).toEqual([PERMISSIONS.stockMovements.create]);
    expect(getRequiredPermissionsForPathname("/inventory/reports/stock-valuation")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/inventory/reports/movement-summary")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/inventory/reports/low-stock")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/inventory/reports/clearing-reconciliation")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/inventory/reports/clearing-variance")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/inventory/variance-proposals")).toEqual([
      PERMISSIONS.inventory.varianceProposalsView,
    ]);
    expect(getRequiredPermissionsForPathname("/inventory/variance-proposals/new")).toEqual([
      PERMISSIONS.inventory.varianceProposalsCreate,
    ]);
    expect(getRequiredPermissionsForPathname("/inventory/settings")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/settings/storage")).toEqual([
      PERMISSIONS.documentSettings.view,
      PERMISSIONS.attachments.manage,
    ]);
    expect(getRequiredPermissionsForPathname("/settings/email-outbox")).toEqual([PERMISSIONS.emailOutbox.view]);
    expect(getRequiredPermissionsForPathname("/settings/audit-logs")).toEqual([PERMISSIONS.auditLogs.view]);
    expect(getRequiredPermissionsForPathname("/settings/number-sequences")).toEqual([PERMISSIONS.numberSequences.view]);
    expect(getRequiredPermissionsForPathname("/settings/zatca")).toEqual([PERMISSIONS.zatca.view]);
    expect(getRequiredPermissionsForPathname("/settings/team")).toEqual([PERMISSIONS.users.view]);
    expect(getRequiredPermissionsForPathname("/settings/roles/role-1")).toEqual([PERMISSIONS.roles.view]);
    expect(getRequiredPermissionsForPathname("/unknown")).toEqual([]);
  });
});

describe("sidebar nav filtering", () => {
  it("shows only permitted nav groups and children", () => {
    const nav = filterSidebarNavItems(
      subject([PERMISSIONS.organization.view, PERMISSIONS.reports.view, PERMISSIONS.salesInvoices.view]),
    );

    expect(nav.map((item) => item.label)).toEqual(["Dashboard", "Reports", "Sales", "Branches"]);
    expect(nav.find((item) => item.label === "Sales")?.children?.map((item) => item.label)).toEqual(["Invoices"]);
    expect(nav.some((item) => item.label === "Purchases")).toBe(false);
  });

  it("uses admin.fullAccess to expose every configured top-level nav item", () => {
    const nav = filterSidebarNavItems(subject([PERMISSIONS.admin.fullAccess]));

    expect(nav.map((item) => item.label)).toEqual([
      "Dashboard",
      "Reports",
      "Banking",
      "Sales",
      "Purchases",
      "Customers & suppliers",
      "Products & Services",
      "Inventory",
      "For accountants",
      "Branches",
      "Documents / Archive",
      "Settings / Admin",
    ]);
  });

  it("shows team and role settings when the user can view members and roles", () => {
    const nav = filterSidebarNavItems(subject([PERMISSIONS.users.view, PERMISSIONS.roles.view]));
    const settings = nav.find((item) => item.label === "Settings / Admin");

    expect(settings?.children?.map((item) => item.label)).toEqual(["Team Members", "Roles & Permissions"]);
  });

  it("shows storage settings when the user can view document settings", () => {
    const nav = filterSidebarNavItems(subject([PERMISSIONS.documentSettings.view]));
    const settings = nav.find((item) => item.label === "Settings / Admin");

    expect(settings?.children?.map((item) => item.label)).toEqual(["Document settings", "Storage"]);
  });

  it("shows email outbox when the user has email outbox permission", () => {
    const nav = filterSidebarNavItems(subject([PERMISSIONS.emailOutbox.view]));
    const settings = nav.find((item) => item.label === "Settings / Admin");

    expect(settings?.children?.map((item) => item.label)).toEqual(["Email outbox"]);
  });

  it("shows audit logs when the user has audit log permission", () => {
    const nav = filterSidebarNavItems(subject([PERMISSIONS.auditLogs.view]));
    const settings = nav.find((item) => item.label === "Settings / Admin");

    expect(settings?.children?.map((item) => item.label)).toEqual(["Audit logs"]);
  });

  it("shows number sequences when the user has number sequence permission", () => {
    const nav = filterSidebarNavItems(subject([PERMISSIONS.numberSequences.view]));
    const settings = nav.find((item) => item.label === "Settings / Admin");

    expect(settings?.children?.map((item) => item.label)).toEqual(["Number sequences"]);
  });
});
