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
    expect(getRequiredPermissionsForPathname("/sales/invoices/new")).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(getRequiredPermissionsForPathname("/sales/invoices/inv-1/edit")).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(getRequiredPermissionsForPathname("/settings/zatca")).toEqual([PERMISSIONS.zatca.view]);
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
      "Sales",
      "Purchases",
      "Customers & suppliers",
      "Products & Services",
      "For accountants",
      "Branches",
      "Documents / Archive",
      "Document templates",
    ]);
  });
});
