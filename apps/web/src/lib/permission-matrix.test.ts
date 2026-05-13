import { ALL_PERMISSIONS } from "./permissions";
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
      "ZATCA",
      "Admin",
    ]);
  });
});
