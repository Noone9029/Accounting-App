import { gotoApp, loginByApi, test } from "./utils/e2e-helpers";

const inventoryRoutes: Array<[string, RegExp]> = [
  ["/inventory/warehouses", /Warehouses/i],
  ["/inventory/stock-movements", /Stock movements/i],
  ["/inventory/balances", /Inventory balances/i],
  ["/inventory/adjustments", /Inventory adjustments/i],
  ["/inventory/transfers", /Warehouse transfers/i],
  ["/inventory/purchase-receipts", /Purchase receipts/i],
  ["/inventory/sales-stock-issues", /Sales stock issues/i],
  ["/inventory/variance-proposals", /Inventory variance proposals/i],
  ["/inventory/settings", /Inventory settings/i],
  ["/inventory/reports/stock-valuation", /Stock valuation/i],
  ["/inventory/reports/movement-summary", /Movement summary/i],
  ["/inventory/reports/low-stock", /Low stock/i],
  ["/inventory/reports/clearing-reconciliation", /Inventory clearing reconciliation/i],
  ["/inventory/reports/clearing-variance", /Inventory clearing variance/i],
];

test.beforeEach(async ({ page }) => {
  await loginByApi(page);
});

test("inventory operational, accounting, and report pages load", async ({ page }) => {
  for (const [path, heading] of inventoryRoutes) {
    await gotoApp(page, path, heading);
  }
});
