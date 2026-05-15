import { apiRequest, expect, gotoApp, loginByApi, test, type E2eSession } from "./utils/e2e-helpers";

interface RoleSummary {
  id: string;
}

test("roles, permission matrix, and team pages load for owner", async ({ page }) => {
  const session: E2eSession = await loginByApi(page);

  await gotoApp(page, "/settings/roles", /Roles & Permissions/i);
  await expect(page.getByText(/permission/i).first()).toBeVisible();

  const roles = await apiRequest<RoleSummary[]>("/roles", {}, session);
  test.skip(roles.length === 0, "No roles are available for role-detail smoke.");

  await gotoApp(page, `/settings/roles/${roles[0].id}`);
  await expect(page.getByText(/Permission matrix/i).first()).toBeVisible();

  await gotoApp(page, "/settings/team", /Team members/i);
  await expect(page.getByText(/Invite/i).first()).toBeVisible();
});
