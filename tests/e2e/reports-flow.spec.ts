import { expect, gotoApp, loginByApi, test } from "./utils/e2e-helpers";

const reportRoutes: Array<[string, RegExp, boolean]> = [
  ["/reports/general-ledger", /General Ledger/i, true],
  ["/reports/trial-balance", /Trial Balance/i, true],
  ["/reports/profit-and-loss", /Profit & Loss/i, true],
  ["/reports/balance-sheet", /Balance Sheet/i, true],
  ["/reports/vat-summary", /VAT Summary/i, true],
  ["/reports/aged-receivables", /Aged Receivables/i, true],
  ["/reports/aged-payables", /Aged Payables/i, true],
];

test.beforeEach(async ({ page }) => {
  await loginByApi(page);
});

test("financial report pages load and expose exports", async ({ page }) => {
  await gotoApp(page, "/reports", /Reports/i);

  for (const [path, heading, hasExports] of reportRoutes) {
    await gotoApp(page, path, heading);
    if (hasExports) {
      await expect(page.getByRole("button", { name: /download csv/i }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /download pdf/i }).first()).toBeVisible();
    }
  }
});
