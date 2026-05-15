import { expect, gotoApp, loginByApi, test } from "./utils/e2e-helpers";

test("ZATCA settings readiness page loads without real network requirements", async ({ page }) => {
  await loginByApi(page);
  await gotoApp(page, "/settings/zatca", /ZATCA/i);
  await expect(page.getByText(/readiness/i).first()).toBeVisible();
  await expect(page.getByText(/SDK/i).first()).toBeVisible();
  await expect(page.getByText(/adapter/i).first()).toBeVisible();
});
