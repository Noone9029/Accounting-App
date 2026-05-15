import { expect, expectAppShell, loginByUi, test } from "./utils/e2e-helpers";

test("seeded admin can log in and see the app shell", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reset it" })).toBeVisible();

  await loginByUi(page);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expectAppShell(page);
  await expect(page.getByRole("link", { name: "Roles & Permissions" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
});
