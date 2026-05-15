import { e2eConfig, expect, gotoApp, loginByApi, test } from "./utils/e2e-helpers";

test("password reset and mock email outbox surfaces load", async ({ page }) => {
  await page.goto("/password-reset");
  await expect(page.getByRole("heading", { name: /Reset password/i })).toBeVisible();
  await page.getByLabel("Email").fill(e2eConfig.email);
  await page.getByRole("button", { name: /Send reset instructions/i }).click();
  await expect(page.getByText(/If an account exists/i)).toBeVisible();

  await loginByApi(page);
  await gotoApp(page, "/settings/email-outbox", /Email outbox/i);
  await expect(page.getByRole("heading", { name: /Email provider readiness/i })).toBeVisible();
  await expect(page.getByText(/Mock mode/i)).toBeVisible();
  await expect(page.getByText(/Real sending/i)).toBeVisible();
});
