import { apiRequest, expect, gotoApp, loginByApi, test, type E2eSession } from "./utils/e2e-helpers";

interface BankAccountSummary {
  id: string;
}

test("banking pages and reconciliation routes load", async ({ page }) => {
  const session: E2eSession = await loginByApi(page);

  await gotoApp(page, "/bank-accounts", /Bank accounts/i);
  const accounts = await apiRequest<BankAccountSummary[]>("/bank-accounts", {}, session);
  test.skip(accounts.length === 0, "No seeded bank account is available for bank-account detail smoke.");

  const accountId = accounts[0].id;
  await gotoApp(page, `/bank-accounts/${accountId}`);
  await expect(page.getByText(/transactions/i).first()).toBeVisible();

  await gotoApp(page, `/bank-accounts/${accountId}/statement-imports`);
  await expect(page.getByText(/statement/i).first()).toBeVisible();

  await gotoApp(page, `/bank-accounts/${accountId}/reconciliation`);
  await expect(page.getByText(/reconciliation/i).first()).toBeVisible();

  await gotoApp(page, `/bank-accounts/${accountId}/reconciliations`, /Bank reconciliations/i);
});
