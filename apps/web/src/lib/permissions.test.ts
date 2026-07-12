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
    expect(getRequiredPermissionsForPathname("/dashboard")).toEqual([PERMISSIONS.dashboard.view]);
    expect(getRequiredPermissionsForPathname("/setup")).toEqual([PERMISSIONS.dashboard.view]);
    expect(getRequiredPermissionsForPathname("/organization/setup")).toEqual([]);
    expect(getRequiredPermissionsForPathname("/reports/trial-balance")).toEqual([PERMISSIONS.reports.view]);
    expect(getRequiredPermissionsForPathname("/report-packs")).toEqual([PERMISSIONS.reports.view]);
    expect(getRequiredPermissionsForPathname("/tax")).toEqual([PERMISSIONS.reports.view]);
    expect(getRequiredPermissionsForPathname("/fx-revaluations")).toEqual([PERMISSIONS.fxRevaluation.read]);
    expect(getRequiredPermissionsForPathname("/bank-accounts")).toEqual([PERMISSIONS.bankAccounts.view]);
    expect(getRequiredPermissionsForPathname("/bank-accounts/new")).toEqual([PERMISSIONS.bankAccounts.manage]);
    expect(getRequiredPermissionsForPathname("/bank-accounts/profile-1/edit")).toEqual([PERMISSIONS.bankAccounts.manage]);
    expect(getRequiredPermissionsForPathname("/bank-accounts/profile-1/statement-imports")).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
    expect(getRequiredPermissionsForPathname("/bank-accounts/profile-1/reconciliation")).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
    expect(getRequiredPermissionsForPathname("/bank-accounts/profile-1/reconciliations/new")).toEqual([
      PERMISSIONS.bankReconciliations.create,
    ]);
    expect(getRequiredPermissionsForPathname("/bank-statement-transactions/row-1")).toEqual([PERMISSIONS.bankStatements.view]);
    expect(getRequiredPermissionsForPathname("/bank-transfers")).toEqual([PERMISSIONS.bankTransfers.view]);
    expect(getRequiredPermissionsForPathname("/bank-transfers/new")).toEqual([PERMISSIONS.bankTransfers.create]);
    expect(getRequiredPermissionsForPathname("/sales/invoices/new")).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(getRequiredPermissionsForPathname("/sales/invoices/inv-1/edit")).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(getRequiredPermissionsForPathname("/sales/quotes/new")).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(getRequiredPermissionsForPathname("/sales/quotes/quote-1/edit")).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(getRequiredPermissionsForPathname("/sales/recurring-invoices/new")).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(getRequiredPermissionsForPathname("/sales/recurring-invoices/rec-1/edit")).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(getRequiredPermissionsForPathname("/recurring-transactions")).toEqual([PERMISSIONS.recurringTransactions.read]);
    expect(getRequiredPermissionsForPathname("/recurring-transactions/template-1")).toEqual([PERMISSIONS.recurringTransactions.read]);
    expect(getRequiredPermissionsForPathname("/recurring-transactions/new")).toEqual([PERMISSIONS.recurringTransactions.manage]);
    expect(getRequiredPermissionsForPathname("/sales/delivery-notes/new")).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(getRequiredPermissionsForPathname("/sales/delivery-notes/dn-1/edit")).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(getRequiredPermissionsForPathname("/sales/inventory-returns")).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(getRequiredPermissionsForPathname("/sales/inventory-returns/new")).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(getRequiredPermissionsForPathname("/sales/inventory-returns/sir-1/edit")).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(getRequiredPermissionsForPathname("/sales/collections")).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(getRequiredPermissionsForPathname("/sales/collections/new")).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(getRequiredPermissionsForPathname("/sales/collections/case-1/edit")).toEqual([PERMISSIONS.salesInvoices.update]);
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
    expect(getRequiredPermissionsForPathname("/inventory/fifo-preview")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/inventory/bin-locations")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/inventory/bin-locations/new")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/inventory/bin-locations/bin-1")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/inventory/batches")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/inventory/batches/new")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/inventory/batches/batch-1")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/inventory/serial-numbers")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/inventory/serial-numbers/new")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/inventory/serial-numbers/serial-1")).toEqual([PERMISSIONS.inventory.view]);
    expect(getRequiredPermissionsForPathname("/inventory/traceability/items/item-1")).toEqual([PERMISSIONS.inventory.view]);
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
    expect(getRequiredPermissionsForPathname("/settings/webhooks")).toEqual([PERMISSIONS.users.manage]);
    expect(getRequiredPermissionsForPathname("/settings/email-outbox")).toEqual([PERMISSIONS.emailOutbox.view]);
    expect(getRequiredPermissionsForPathname("/settings/banking-accounting")).toEqual([PERMISSIONS.accounts.view]);
    expect(getRequiredPermissionsForPathname("/settings/currencies-fx")).toEqual([PERMISSIONS.currencies.read]);
    expect(getRequiredPermissionsForPathname("/settings/audit-logs")).toEqual([PERMISSIONS.auditLogs.view]);
    expect(getRequiredPermissionsForPathname("/settings/number-sequences")).toEqual([PERMISSIONS.numberSequences.view]);
    expect(getRequiredPermissionsForPathname("/settings/zatca")).toEqual([PERMISSIONS.zatca.view]);
    expect(getRequiredPermissionsForPathname("/settings/team")).toEqual([PERMISSIONS.users.view]);
    expect(getRequiredPermissionsForPathname("/settings/security")).toEqual([PERMISSIONS.users.view]);
    expect(getRequiredPermissionsForPathname("/settings/roles/role-1")).toEqual([PERMISSIONS.roles.view]);
    expect(getRequiredPermissionsForPathname("/sales/quotes")).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(getRequiredPermissionsForPathname("/sales/recurring-invoices")).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(getRequiredPermissionsForPathname("/sales/cash-invoices")).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(getRequiredPermissionsForPathname("/sales/delivery-notes")).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(getRequiredPermissionsForPathname("/sales/inventory-returns/return-1")).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(getRequiredPermissionsForPathname("/sales/api-invoices")).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(getRequiredPermissionsForPathname("/purchases")).toEqual([
      PERMISSIONS.purchaseOrders.view,
      PERMISSIONS.purchaseBills.view,
      PERMISSIONS.supplierPayments.view,
      PERMISSIONS.supplierRefunds.view,
      PERMISSIONS.cashExpenses.view,
      PERMISSIONS.purchaseDebitNotes.view,
    ]);
    expect(getRequiredPermissionsForPathname("/beneficiaries")).toEqual([
      PERMISSIONS.bankAccounts.view,
      PERMISSIONS.bankTransfers.view,
    ]);
    expect(getRequiredPermissionsForPathname("/payroll")).toEqual([PERMISSIONS.users.view]);
    expect(getRequiredPermissionsForPathname("/products")).toEqual([PERMISSIONS.items.view]);
    expect(getRequiredPermissionsForPathname("/accounting")).toEqual([
      PERMISSIONS.accounts.view,
      PERMISSIONS.journals.view,
    ]);
    expect(getRequiredPermissionsForPathname("/fixed-assets")).toEqual([
      PERMISSIONS.accounts.view,
      PERMISSIONS.inventory.view,
    ]);
    expect(getRequiredPermissionsForPathname("/cost-centers")).toEqual([
      PERMISSIONS.accounts.view,
      PERMISSIONS.journals.view,
    ]);
    expect(getRequiredPermissionsForPathname("/projects")).toEqual([
      PERMISSIONS.accounts.view,
      PERMISSIONS.journals.view,
    ]);
    expect(getRequiredPermissionsForPathname("/developer/api-keys")).toEqual([
      PERMISSIONS.users.manage,
      PERMISSIONS.roles.manage,
    ]);
    expect(getRequiredPermissionsForPathname("/integrations")).toEqual([
      PERMISSIONS.users.manage,
      PERMISSIONS.roles.manage,
    ]);
    expect(getRequiredPermissionsForPathname("/document-templates")).toEqual([
      PERMISSIONS.documentSettings.view,
    ]);
    expect(getRequiredPermissionsForPathname("/unknown")).toEqual([PERMISSIONS.dashboard.view]);
  });
});

describe("sidebar nav filtering", () => {
  it("shows only permitted nav groups and children", () => {
    const nav = filterSidebarNavItems(
      subject([PERMISSIONS.dashboard.view, PERMISSIONS.organization.view, PERMISSIONS.reports.view, PERMISSIONS.salesInvoices.view]),
    );

    expect(nav.map((item) => item.label)).toEqual(["Dashboard", "Sales", "Compliance", "Reports", "Settings"]);
    expect(nav.find((item) => item.label === "Sales")?.children?.map((item) => item.label)).toEqual([
      "Invoices",
      "Quotes",
      "Recurring invoices",
      "Delivery notes",
      "Collections",
      "Inventory returns",
    ]);
    expect(nav.some((item) => item.label === "Purchases")).toBe(false);
  });

  it("uses admin.fullAccess to expose every configured top-level nav item", () => {
    const nav = filterSidebarNavItems(subject([PERMISSIONS.admin.fullAccess]));

    expect(nav.map((item) => item.label)).toEqual([
      "Dashboard",
      "Customers",
      "Suppliers",
      "Sales",
      "Purchases",
      "Banking",
      "Accounting",
      "Inventory",
      "Documents",
      "Compliance",
      "Reports",
      "Settings",
    ]);
  });

  it("shows team and role settings when the user can view members and roles", () => {
    const nav = filterSidebarNavItems(subject([PERMISSIONS.users.view, PERMISSIONS.roles.view]));
    const settings = nav.find((item) => item.label === "Settings");

    expect(settings?.children?.map((item) => item.label)).toEqual(["Users and roles", "Security", "Roles & Permissions"]);
  });

  it("shows storage settings when the user can view document settings", () => {
    const nav = filterSidebarNavItems(subject([PERMISSIONS.documentSettings.view]));
    const settings = nav.find((item) => item.label === "Settings");

    expect(settings?.children?.map((item) => item.label)).toEqual(["Document settings", "Storage settings"]);
  });

  it("shows email outbox when the user has email outbox permission", () => {
    const nav = filterSidebarNavItems(subject([PERMISSIONS.emailOutbox.view]));
    const settings = nav.find((item) => item.label === "Settings");

    expect(settings?.children?.map((item) => item.label)).toEqual(["Email outbox"]);
  });

  it("shows audit logs when the user has audit log permission", () => {
    const nav = filterSidebarNavItems(subject([PERMISSIONS.auditLogs.view]));
    const settings = nav.find((item) => item.label === "Settings");

    expect(settings?.children?.map((item) => item.label)).toEqual(["Audit logs"]);
  });

  it("shows number sequences when the user has number sequence permission", () => {
    const nav = filterSidebarNavItems(subject([PERMISSIONS.numberSequences.view]));
    const settings = nav.find((item) => item.label === "Settings");

    expect(settings?.children?.map((item) => item.label)).toEqual(["Numbering"]);
  });
});
