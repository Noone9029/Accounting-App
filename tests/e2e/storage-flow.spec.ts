import { expect, gotoApp, loginByApi, test } from "./utils/e2e-helpers";

test("storage readiness page shows database providers and redacted S3 checks", async ({ page }) => {
  await loginByApi(page);
  await gotoApp(page, "/settings/storage", /Storage/i);
  await expect(page.getByRole("heading", { name: "Uploaded attachments", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Generated documents", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /S3-compatible configuration/i })).toBeVisible();
  await expect(page.getByText(/Migration execution is not implemented yet/i)).toBeVisible();
});
