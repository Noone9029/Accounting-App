import { expect, gotoApp, loginByApi, test } from "./utils/e2e-helpers";

test.beforeEach(async ({ page }) => {
  await loginByApi(page);
});

test("purchase workflows expose the main lists and bill form", async ({ page }) => {
  await gotoApp(page, "/purchases/bills", /Purchase bills/i);
  await expect(page.getByRole("link", { name: /new bill|create bill/i }).first()).toBeVisible();

  await gotoApp(page, "/purchases/bills/new", /Create purchase bill/i);
  await expect(page.getByText("Supplier").first()).toBeVisible();
  await expect(page.getByText("Inventory posting mode").first()).toBeVisible();
  await expect(page.getByText("Subtotal").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /save draft/i })).toBeVisible();

  await gotoApp(page, "/purchases/purchase-orders", /Purchase orders/i);
  await gotoApp(page, "/purchases/supplier-payments", /Supplier payments/i);
  await gotoApp(page, "/purchases/cash-expenses", /Cash expenses/i);
});
