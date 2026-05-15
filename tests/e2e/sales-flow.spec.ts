import { expect, gotoApp, loginByApi, test } from "./utils/e2e-helpers";

test.beforeEach(async ({ page }) => {
  await loginByApi(page);
});

test("sales invoice list and create form are stable", async ({ page }) => {
  await gotoApp(page, "/sales/invoices", /Sales invoices/i);
  await expect(page.getByRole("link", { name: /create invoice/i })).toBeVisible();

  await gotoApp(page, "/sales/invoices/new", /Create sales invoice/i);
  await expect(page.getByText("Customer").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Add line/i })).toBeVisible();
  await expect(page.getByText("Subtotal").first()).toBeVisible();
  await expect(page.getByText("VAT / Tax").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /create draft invoice/i })).toBeVisible();
});
