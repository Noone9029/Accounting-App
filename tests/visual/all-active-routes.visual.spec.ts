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
const selectedRoutes = process.env.UI_ROUTE_AUDIT_HREF
  ? activeRoutes.filter((route) => route.href === process.env.UI_ROUTE_AUDIT_HREF)
  : activeRoutes;
const report: Array<{ role: VisualRoleProfileName; viewport: string; routes: number }> = [];

test.describe("all active canonical routes structural visual audit", () => {
  test.describe.configure({ mode: "parallel" });
  test.beforeAll(async () => {
    expect(selectedRoles, "UI_ROUTE_AUDIT_ROLE must select at least one known role").not.toHaveLength(0);
    expect(selectedViewports, "UI_ROUTE_AUDIT_VIEWPORT must select at least one known viewport").not.toHaveLength(0);
    expect(selectedRoutes, "UI_ROUTE_AUDIT_HREF must select at least one active canonical route").not.toHaveLength(0);
    await fs.mkdir(artifactRoot, { recursive: true });
  });

  test.afterAll(async () => {
    await fs.writeFile(path.join(artifactRoot, "visual-results.json"), `${JSON.stringify({ routes: activeRoutes.length, report }, null, 2)}\n`, "utf8");
  });

  for (const role of selectedRoles) {
    for (const viewport of selectedViewports) {
      test(`${role} · ${viewport.name} · ${selectedRoutes.length} active routes`, async ({ page }) => {
        await setupRolePage(page, role, viewport);
        const pageErrors: string[] = [];
        const consoleErrors: string[] = [];
        const missingFixtures: string[] = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        page.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(`${page.url()} :: ${message.text()}`);
        });
        page.on("response", (response) => {
          if (response.headers()["x-visual-fixture-missing"] === "1") missingFixtures.push(response.url());
        });
        for (const route of selectedRoutes) {
          const errorsBefore = { page: pageErrors.length, console: consoleErrors.length, fixtures: missingFixtures.length };
          await gotoRouteWithRetry(page, route.href);
          expect(pageErrors.slice(errorsBefore.page), `${role} ${route.href} ${viewport.name} page errors`).toEqual([]);
          expect(consoleErrors.slice(errorsBefore.console), `${role} ${route.href} ${viewport.name} console errors`).toEqual([]);
          expect(missingFixtures.slice(errorsBefore.fixtures), `${role} ${route.href} ${viewport.name} missing visual fixtures`).toEqual([]);
          await expectNoDocumentOverflow(page, `${role} ${route.href} ${viewport.name}`);
          await expectNoSevereOverlap(page, `${role} ${route.href} ${viewport.name}`);
          await expectNoForbiddenClaims(page, `${role} ${route.href} ${viewport.name}`);

          const allowed = route.requiredAny.some((permission) => visualRoleProfiles[role].permissions.includes(permission));
          const main = page.locator("main");
          if (allowed) {
            await expect(main.getByText("Access denied", { exact: true }), `${role} ${route.href} ${viewport.name} should be accessible`).toHaveCount(0);
          } else {
            await expect(main.getByText("Access denied", { exact: true }), `${role} ${route.href} ${viewport.name} should be access denied`).toBeVisible();
          }
        }
        report.push({ role, viewport: viewport.name, routes: selectedRoutes.length });
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

async function gotoRouteWithRetry(page: Page, href: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await page.goto(href, { waitUntil: "domcontentloaded", timeout: 60_000 });
      if (response && response.status() >= 400) {
        throw new Error(`route returned HTTP ${response.status()}`);
      }
      await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("Loading access", { exact: true })).toHaveCount(0, { timeout: 5_000 });
      await page.waitForTimeout(250);
      return;
    } catch (error) {
      lastError = new Error(`${href}: ${error instanceof Error ? error.message : String(error)}`);
      if (attempt < 2) {
        await page.waitForTimeout(500 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

async function expectNoDocumentOverflow(page: Page, context: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow, `document overflow: ${context}`).toBe(false);
}

async function expectNoSevereOverlap(page: Page, context: string) {
  const overlap = await page.evaluate(() => {
    const elements = [...document.querySelectorAll("main h1, main h2, main button, main a, main input, main select, main textarea, main [role=dialog]")].filter((element) => {
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
