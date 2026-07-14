import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { APP_ROUTES } from "../../apps/web/src/lib/app-routes";
import {
  installVisualApiMocks,
  primeVisualSession,
  visualRoleProfiles,
  type VisualRoleProfileName,
} from "./visual-fixtures";

const artifactRoot = path.join(process.cwd(), "artifacts", "visual-qa", "product-wide-stabilization", "all-active-routes");
const roles = ["Owner", "Admin", "Accountant", "Sales", "Purchases", "Viewer"] as const satisfies readonly VisualRoleProfileName[];
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
] as const;
const activeRoutes = APP_ROUTES.filter((route) => route.capabilityStatus === "active");
const selectedRoles = process.env.UI_ROUTE_AUDIT_ROLE
  ? roles.filter((role) => role === process.env.UI_ROUTE_AUDIT_ROLE)
  : roles;
const selectedViewports = process.env.UI_ROUTE_AUDIT_VIEWPORT
  ? viewports.filter((viewport) => viewport.name === process.env.UI_ROUTE_AUDIT_VIEWPORT)
  : viewports;
const report: Array<{ role: VisualRoleProfileName; viewport: string; routes: number }> = [];

test.describe("all active canonical routes structural visual audit", () => {
  test.describe.configure({ mode: "parallel" });
  test.beforeAll(async () => {
    await fs.mkdir(artifactRoot, { recursive: true });
  });

  test.afterAll(async () => {
    await fs.writeFile(path.join(artifactRoot, "visual-results.json"), `${JSON.stringify({ routes: activeRoutes.length, report }, null, 2)}\n`, "utf8");
  });

  for (const role of selectedRoles) {
    for (const viewport of selectedViewports) {
      test(`${role} · ${viewport.name} · ${activeRoutes.length} active routes`, async ({ page }) => {
        await setupRolePage(page, role, viewport);
        for (const route of activeRoutes) {
          await page.goto(route.href);
          await page.waitForLoadState("domcontentloaded");
          await expect(page.locator("main")).toBeVisible();
          await expectNoDocumentOverflow(page, `${role} ${route.href} ${viewport.name}`);
          await expectNoSevereOverlap(page, `${role} ${route.href} ${viewport.name}`);
          await expectNoForbiddenClaims(page, `${role} ${route.href} ${viewport.name}`);

          const allowed = route.requiredAny.some((permission) => visualRoleProfiles[role].permissions.includes(permission));
          const main = page.locator("main");
          if (allowed) {
            await expect(main.getByText("Access denied", { exact: true })).toHaveCount(0);
          } else {
            await expect(main.getByText("Access denied", { exact: true })).toBeVisible();
          }
        }
        report.push({ role, viewport: viewport.name, routes: activeRoutes.length });
      });
    }
  }
});

async function setupRolePage(page: Page, role: VisualRoleProfileName, viewport: { width: number; height: number }) {
  await installVisualApiMocks(page, { roleProfile: role });
  await primeVisualSession(page, { roleProfile: role });
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function expectNoDocumentOverflow(page: Page, context: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow, `document overflow: ${context}`).toBe(false);
}

async function expectNoSevereOverlap(page: Page, context: string) {
  const overlap = await page.evaluate(() => {
    const elements = [...document.querySelectorAll("main h1, main h2, main button, main a")].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    for (let index = 0; index < elements.length; index += 1) {
      const first = elements[index].getBoundingClientRect();
      for (let next = index + 1; next < elements.length; next += 1) {
        const secondElement = elements[next];
        if (elements[index].contains(secondElement) || secondElement.contains(elements[index])) continue;
        const second = secondElement.getBoundingClientRect();
        const intersection = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left)) * Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
        const smallerArea = Math.min(first.width * first.height, second.width * second.height);
        if (intersection > 40 && intersection / Math.max(smallerArea, 1) > 0.35 && smallerArea > 200) return true;
      }
    }
    return false;
  });
  expect(overlap, `severe overlap: ${context}`).toBe(false);
}

async function expectNoForbiddenClaims(page: Page, context: string) {
  const bodyText = await page.locator("body").innerText();
  expect(bodyText, context).not.toMatch(/production submission is connected/i);
  expect(bodyText, context).not.toMatch(/production compliance is enabled/i);
  expect(bodyText, context).not.toMatch(/automatic bank sync is active/i);
}
