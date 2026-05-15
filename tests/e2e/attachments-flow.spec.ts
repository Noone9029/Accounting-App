import { apiRequest, expect, gotoApp, loginByApi, test, type E2eSession } from "./utils/e2e-helpers";

interface EntitySummary {
  id: string;
}

test("attachment panel renders on an accounting document detail page", async ({ page }) => {
  const session: E2eSession = await loginByApi(page);
  const cashExpenses = await apiRequest<EntitySummary[]>("/cash-expenses", {}, session).catch(() => []);
  const purchaseBills = cashExpenses.length > 0 ? [] : await apiRequest<EntitySummary[]>("/purchase-bills", {}, session).catch(() => []);
  const detailPath = cashExpenses[0]?.id
    ? `/purchases/cash-expenses/${cashExpenses[0].id}`
    : purchaseBills[0]?.id
      ? `/purchases/bills/${purchaseBills[0].id}`
      : "";

  test.skip(!detailPath, "No cash expense or purchase bill is available for attachment panel smoke.");

  await gotoApp(page, detailPath);
  await expect(page.getByRole("heading", { name: /Attachments/i })).toBeVisible();
  await expect(page.getByText(/Supporting files linked to this record/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Upload/i })).toBeVisible();
});
