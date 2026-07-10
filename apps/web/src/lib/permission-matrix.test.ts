import { ALL_PERMISSIONS, PERMISSIONS } from "./permissions";
import { PERMISSION_GROUPS } from "./permission-matrix";

describe("permission matrix catalog", () => {
  it("groups every shared permission exactly once", () => {
    const grouped = PERMISSION_GROUPS.flatMap((group) => group.permissions.map((item) => item.permission));

    expect(new Set(grouped).size).toBe(grouped.length);
    expect(new Set(grouped)).toEqual(new Set(ALL_PERMISSIONS));
  });

  it("keeps the expected high-level categories visible", () => {
    expect(PERMISSION_GROUPS.map((group) => group.label)).toEqual([
      "Organization",
      "Users / Roles",
      "Accounting",
      "Inventory",
      "Sales",
      "Purchases",
      "Reports",
      "Documents",
      "Compliance",
      "ZATCA",
      "Admin",
    ]);
  });

  it("labels the dedicated currency, rate, and revaluation permissions in accounting", () => {
    const accounting = PERMISSION_GROUPS.find((group) => group.id === "accounting");
    const permissions = accounting?.permissions.map((item) => item.permission);

    expect(permissions).toEqual(
      expect.arrayContaining([
        PERMISSIONS.currencies.read,
        PERMISSIONS.currencies.manage,
        PERMISSIONS.fxRates.read,
        PERMISSIONS.fxRates.manage,
        PERMISSIONS.fxRevaluation.read,
        PERMISSIONS.fxRevaluation.run,
        PERMISSIONS.fxRevaluation.reverse,
      ]),
    );
  });
});
