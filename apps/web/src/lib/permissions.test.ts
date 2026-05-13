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
    expect(getRequiredPermissionsForPathname("/sales/invoices/new")).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(getRequiredPermissionsForPathname("/sales/invoices/inv-1/edit")).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(getRequiredPermissionsForPathname("/purchases/purchase-orders/new")).toEqual([PERMISSIONS.purchaseOrders.create]);
    expect(getRequiredPermissionsForPathname("/purchases/purchase-orders/po-1/edit")).toEqual([PERMISSIONS.purchaseOrders.update]);
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
      "Bank Accounts",
      "Sales",
      "Purchases",
      "Customers & suppliers",
      "Products & Services",
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
});
