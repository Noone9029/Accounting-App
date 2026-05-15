import { expect, gotoApp, loginByApi, test } from "./utils/e2e-helpers";

test("storage readiness page shows database providers and redacted S3 checks", async ({ page }) => {
  await loginByApi(page);
  await gotoApp(page, "/settings/storage", /Storage/i);
  await expect(page.getByText(/Uploaded attachments/i)).toBeVisible();
  await expect(page.getByText(/Generated documents/i)).toBeVisible();
  await expect(page.getByText(/S3/i).first()).toBeVisible();
  await expect(page.getByText(/Migration execution is not implemented yet/i)).toBeVisible();
});
