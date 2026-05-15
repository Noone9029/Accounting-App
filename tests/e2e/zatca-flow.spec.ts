import { expect, gotoApp, loginByApi, test } from "./utils/e2e-helpers";

test("ZATCA settings readiness page loads without real network requirements", async ({ page }) => {
  await loginByApi(page);
  await gotoApp(page, "/settings/zatca", /ZATCA/i);
  await expect(page.getByRole("heading", { name: /Readiness summary/i })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /SDK validation readiness/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Adapter mode/i })).toBeVisible();
});
