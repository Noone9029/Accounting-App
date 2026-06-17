import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { PERMISSIONS, type Permission } from "../../packages/shared/src/permissions";
import {
  installVisualApiMocks,
  primeVisualSession,
  visualRoleProfiles,
  type VisualRoleProfileName,
} from "./visual-fixtures";

const artifactRoot = path.join(process.cwd(), "artifacts", "visual-qa", "owner-security-organization-settings-visual-qa");
const appRouteRoot = path.join(process.cwd(), "apps", "web", "src", "app", "(app)");

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const coveredRoutes = [
  { slug: "settings", path: "/settings", heading: /Team Members/i, expectedText: /Beta access guidance|mock invites/i, requiredAny: [PERMISSIONS.users.view], ownerOnlyAction: /Send mock invite/i },
  { slug: "settings-team", path: "/settings/team", heading: /Team Members/i, expectedText: /Aisha LedgerByte Accountant With Extended Review Name|pending\.invite\.long\.external|Suspended Former Beta Reviewer/i, requiredAny: [PERMISSIONS.users.view], ownerOnlyAction: /Send mock invite/i },
  { slug: "settings-security", path: "/settings/security", heading: /Security settings/i, expectedText: /Read-only security overview|Team and role controls|Not available yet/i, requiredAny: [PERMISSIONS.users.view], ownerOnlyAction: /Team settings/i },
  { slug: "settings-roles", path: "/settings/roles", heading: /Roles & Permissions/i, expectedText: /Regional Operations Readonly Reviewer With Long Role Name|Beta role guidance|permissions/i, requiredAny: [PERMISSIONS.roles.view], ownerOnlyAction: /Create role/i },
  { slug: "settings-role-owner", path: "/settings/roles/role-owner", heading: /Owner/i, expectedText: /System role|protected from editing and deletion|Permission matrix/i, requiredAny: [PERMISSIONS.roles.view] },
  { slug: "settings-role-custom", path: "/settings/roles/role-custom-long", heading: /Regional Operations Readonly Reviewer With Long Role Name/i, expectedText: /Permission matrix|members assigned|testing script/i, requiredAny: [PERMISSIONS.roles.view], ownerOnlyAction: /Save changes/i },
  { slug: "settings-audit-logs", path: "/settings/audit-logs", heading: /Audit logs/i, expectedText: /Aisha LedgerByte Accountant|Retention|CUSTOMER PAYMENT ALLOCATED/i, requiredAny: [PERMISSIONS.auditLogs.view], ownerOnlyAction: /Save retention settings/i },
  { slug: "settings-compliance", path: "/settings/compliance", heading: /Compliance readiness/i, expectedText: /Compliance readiness|No ASP|Controlled beta|No network/i, requiredAny: [PERMISSIONS.compliance.view] },
  { slug: "setup", path: "/setup", heading: /Guided setup/i, expectedText: /Complete business profile|Provider evidence is unavailable|Top blockers/i, requiredAny: [PERMISSIONS.dashboard.view] },
  { slug: "organization-setup", path: "/organization/setup", heading: /Organization setup/i, expectedText: /Organization name|Legal name|VAT number/i, requiredAny: [] },
] as const;

const roleProfiles = ["Owner", "Accountant", "Viewer"] as const satisfies readonly VisualRoleProfileName[];

const skippedRoutes = [
  "/settings/sessions: no route exists; session-like guidance is limited to existing team suspension copy.",
  "/settings/api: no route exists; provider/API readiness guidance is grouped under /settings/compliance.",
  "/settings/integrations: no route exists; no integration settings route is implemented.",
  "/settings/organization: no route exists; the real organization surface is /organization/setup.",
  "/organization: no route exists; organization setup is implemented at /organization/setup.",
  "/settings/users: no route exists; user management is implemented at /settings/team.",
  "/settings/zatca: route exists, but this branch intentionally avoids ZATCA-specific visual expansion.",
] as const;

const report: Array<Record<string, unknown>> = [];

test.beforeAll(async () => {
  await fs.mkdir(artifactRoot, { recursive: true });
});

test.afterAll(async () => {
  await fs.writeFile(
    path.join(artifactRoot, "visual-results.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        localOnly: true,
        skippedRoutes,
        ownerOrganizationSecurityStatesChecked: [
          "settings redirect to the real team management surface",
          "team members with Owner, Accountant, Sales, Purchases, Viewer, pending invite, suspended user, long names, long emails, and role controls",
          "role list and role detail surfaces with system role protection, long custom role name, permission matrix, and read-only role state",
          "audit-log retention and compliance readiness surfaces used as the real security/evidence-adjacent settings pages",
          "guided setup and organization setup surfaces with business profile, VAT number, setup-complete/incomplete/blocker copy, and mobile form layout",
        ],
        routes: report,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
});

for (const roleProfile of roleProfiles) {
  for (const route of coveredRoutes) {
    for (const viewport of viewports) {
      test(`${roleProfile} owner security/organization settings visual QA for ${route.slug} at ${viewport.name}`, async ({ page }) => {
        await setupPage(page, viewport, roleProfile);
        await page.goto(route.path);
        await assertRouteLoaded(page, route, viewport.name, roleProfile);

        const allowed = canUseAny(roleProfile, route.requiredAny);
        if (allowed) {
          await expectAllowedRoute(page, route);
          await expectOwnerActions(page, route, roleProfile);
          await expectTablesAndControlsReadable(page, viewport.name);
        } else {
          await expect(page.locator("main").getByText("Access denied", { exact: true })).toBeVisible();
        }

        await expectNonOwnerActionsConstrained(page, roleProfile);
        await expectDangerActionsQuiet(page);
        await expectNoFakeSecurityOrComplianceClaims(page);

        const screenshotPath = path.join(artifactRoot, `${viewport.name}-${roleProfile.toLowerCase()}-${route.slug}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        report.push({ kind: "role-route", role: roleProfile, route: route.path, viewport: viewport.name, allowed, screenshot: screenshotPath });
      });
    }
  }
}

for (const viewport of viewports) {
  test(`Owner security/organization route and action consistency checks at ${viewport.name}`, async ({ page }) => {
    await setupPage(page, viewport, "Owner");
    await page.goto("/dashboard");
    await page.locator("main").waitFor({ state: "visible" });

    const registeredHrefs = await collectRegisteredHrefs();
    expect(registeredHrefs.length, "Route registry should expose app-local hrefs.").toBeGreaterThan(0);
    for (const href of registeredHrefs) {
      await expectAppRouteExists(href);
    }

    const settingsHrefs = registeredHrefs.filter((href) => href.startsWith("/settings") || href.startsWith("/organization"));
    expect(settingsHrefs).toEqual(expect.arrayContaining(["/settings/team", "/settings/roles", "/organization/setup"]));
    expect(settingsHrefs).toContain("/settings/security");
    expect(settingsHrefs).not.toContain("/settings/api");

    await page.getByRole("button", { name: "Create" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Create menu" });
    await expect(dialog).toBeVisible();
    const createHrefs = await dialog.locator("a").evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")).filter((href): href is string => Boolean(href)),
    );
    for (const href of createHrefs) {
      await expectAppRouteExists(href);
    }
    await expect(dialog.locator("button:disabled").first()).toBeVisible();
    await expectNoFakeSecurityOrComplianceClaims(page);

    const screenshotPath = path.join(artifactRoot, `${viewport.name}-route-action-consistency.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    report.push({ kind: "route-action-consistency", role: "Owner", viewport: viewport.name, hrefsChecked: registeredHrefs.length + createHrefs.length, screenshot: screenshotPath });
  });
}

async function setupPage(page: Page, viewport: { width: number; height: number }, roleProfile: VisualRoleProfileName) {
  await installVisualApiMocks(page, { roleProfile });
  await primeVisualSession(page, { roleProfile });
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function assertRouteLoaded(
  page: Page,
  route: (typeof coveredRoutes)[number],
  viewportName: string,
  roleProfile: VisualRoleProfileName,
) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("main").waitFor({ state: "visible" });
  await expectAuthenticatedShell(page, viewportName);
  await expectNoDocumentOverflow(page);
  await expectNoSevereOverlap(page);
  await expectNoFakeSecurityOrComplianceClaims(page);

  const bodyText = await page.locator("body").innerText();
  expect(bodyText, `${roleProfile} route ${route.path} should not show a missing visual fixture.`).not.toMatch(/No visual fixture|Unable to load/i);
}

async function expectAllowedRoute(page: Page, route: (typeof coveredRoutes)[number]) {
  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: route.heading }).first()).toBeVisible();
  await expect(main.getByText(route.expectedText).first()).toBeVisible();
  await expect(main.getByText("Access denied", { exact: true })).toHaveCount(0);
}

async function expectAuthenticatedShell(page: Page, viewportName: string) {
  const banner = page.getByRole("banner");
  await expect(banner).toBeVisible();
  await expect(banner.getByLabel("Organization").or(banner.getByText(/Loading organization|Organization setup/i)).first()).toBeVisible();
  await expect(banner.getByRole("button", { name: /Account menu|Sign out/i }).first()).toBeVisible();

  if (viewportName === "mobile") {
    await expect(page.getByRole("navigation", { name: "First workflow navigation" })).toBeVisible();
  } else {
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  }
}

async function expectOwnerActions(page: Page, route: (typeof coveredRoutes)[number], roleProfile: VisualRoleProfileName) {
  if (!("ownerOnlyAction" in route) || !route.ownerOnlyAction) {
    return;
  }

  const action = page.locator("main").getByText(route.ownerOnlyAction).first();
  if (roleProfile === "Owner") {
    await expect(action).toBeVisible();
  } else if ((await action.count()) > 0) {
    await expect(action).toBeDisabled();
  }
}

async function expectNonOwnerActionsConstrained(page: Page, roleProfile: VisualRoleProfileName) {
  if (roleProfile === "Owner") {
    return;
  }

  const main = page.locator("main");
  const blockedLabels = [
    /^Send mock invite$/i,
    /^Create role$/i,
    /^Save changes$/i,
    /^Delete role$/i,
    /^Save retention settings$/i,
    /^Save UAE readiness fields$/i,
    /^Verify$/i,
    /^Revoke$/i,
  ];

  for (const label of blockedLabels) {
    const buttons = main.getByRole("button", { name: label });
    for (let index = 0; index < await buttons.count(); index += 1) {
      await expect(buttons.nth(index)).toBeDisabled();
    }
    await expect(main.getByRole("link", { name: label })).toHaveCount(0);
  }
}

async function expectTablesAndControlsReadable(page: Page, viewportName: string) {
  const tableAccessibility = await page.evaluate(() =>
    Array.from(document.querySelectorAll("main table")).map((table) => {
      const tableBox = table.getBoundingClientRect();
      const scroller = table.closest(".overflow-x-auto");
      const scrollerBox = scroller?.getBoundingClientRect();
      return {
        hasHeaders: table.querySelectorAll("th").length > 0,
        insideScroller: Boolean(scroller),
        tableWidth: tableBox.width,
        scrollerWidth: scrollerBox?.width ?? tableBox.width,
        visible: tableBox.width > 0 && tableBox.height > 0,
      };
    }),
  );

  for (const table of tableAccessibility) {
    expect(table.visible, "Tables should be visible.").toBe(true);
    expect(table.hasHeaders, "Tables should preserve readable headers.").toBe(true);
    if (viewportName !== "desktop" && table.tableWidth > table.scrollerWidth + 1) {
      expect(table.insideScroller, "Wide organization/security tables should stay inside horizontal scrollers.").toBe(true);
    }
  }

  const crushedControls = await page.evaluate(() =>
    Array.from(document.querySelectorAll("main input, main select, main button, main a, main textarea")).filter((element) => {
      const box = element.getBoundingClientRect();
      const text = element.textContent?.trim() || (element as HTMLInputElement).placeholder || "";
      return box.width > 0 && box.height > 0 && text.length > 8 && box.width < 36;
    }).length,
  );
  expect(crushedControls, "Interactive controls should not crush to unreadable widths.").toBe(0);
}

async function expectDangerActionsQuiet(page: Page) {
  const loudDangerActions = await page.locator("main button, main a").evaluateAll((elements) =>
    elements.filter((element) => {
      const text = element.textContent ?? "";
      const className = element.getAttribute("class") ?? "";
      return /Delete|Purge|Archive|Suspend|Revoke/i.test(text) && /bg-(red|rose|pink)-[5-9]00|text-white/.test(className);
    }).length,
  );
  expect(loudDangerActions, "Danger/destructive settings actions should not be visually over-prominent.").toBe(0);
}

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow, "Owner organization/security settings routes should not create document-level horizontal overflow.").toBe(false);
}

async function expectNoSevereOverlap(page: Page) {
  const severeOverlap = await page.evaluate(() => {
    const main = document.querySelector("main");
    const header = document.querySelector("header");
    if (!main || !header) {
      return false;
    }
    const mainBox = main.getBoundingClientRect();
    const headerBox = header.getBoundingClientRect();
    return mainBox.top < headerBox.bottom - 8;
  });
  expect(severeOverlap, "Topbar should not visibly overlap route content.").toBe(false);
}

async function expectNoFakeSecurityOrComplianceClaims(page: Page) {
  const text = await page.locator("body").innerText();
  for (const pattern of forbiddenClaimPatterns()) {
    expect(text).not.toMatch(pattern);
  }
}

function forbiddenClaimPatterns() {
  return [
    ["FTA", "certified"],
    ["Peppol", "certified"],
    ["accredited", "ASP"],
    ["official", "UAE", "provider"],
    ["production", "compliant"],
    ["ZATCA", "certified"],
    ["real", "ASP", "validation"],
    ["FTA", "reporting", "enabled"],
    ["live", "bank", "feed", "connected"],
    ["automatic", "reconciliation", "enabled"],
    ["real", "bank", "sync", "enabled"],
    ["official", "VAT", "approval"],
    ["certified", "VAT", "report"],
    ["provider", "connected"],
    ["production", "storage", "enabled"],
    ["permanent", "archive", "guaranteed"],
    ["official", "eInvoice", "archive"],
    ["SSO", "enabled"],
    ["MFA", "enforced"],
    ["security", "certified"],
    ["SOC", "2", "certified"],
  ].map((parts) => new RegExp(parts.join("\\s+"), "i"));
}

function canUseAny(roleProfile: VisualRoleProfileName, requiredAny: readonly Permission[]): boolean {
  if (requiredAny.length === 0) {
    return true;
  }
  const permissions = visualRoleProfiles[roleProfile].permissions;
  return permissions.includes(PERMISSIONS.admin.fullAccess) || requiredAny.some((permission) => permissions.includes(permission));
}

async function collectRegisteredHrefs() {
  const sourceFiles = [
    path.join(process.cwd(), "apps", "web", "src", "lib", "sidebar-nav.ts"),
    path.join(process.cwd(), "apps", "web", "src", "lib", "global-create-actions.ts"),
  ];
  const hrefs = new Set<string>();
  for (const sourceFile of sourceFiles) {
    const source = await fs.readFile(sourceFile, "utf8");
    for (const match of source.matchAll(/href:\s*"([^"]+)"/g)) {
      if (match[1]?.startsWith("/")) {
        hrefs.add(match[1]);
      }
    }
  }
  return [...hrefs].sort();
}

async function expectAppRouteExists(href: string) {
  const routePath = href.split("?")[0] ?? href;
  expect(routePath, "Registry href should be app-local.").toMatch(/^\/[a-z0-9/?=&_[\]-]/i);
  const exists = await appRouteExists(routePath);
  expect(exists, `${href} should resolve to a concrete app route or existing placeholder scaffold.`).toBe(true);
}

async function appRouteExists(routePath: string): Promise<boolean> {
  const segments = routePath.split("/").filter(Boolean);
  return routeSegmentsExist(appRouteRoot, segments);
}

async function routeSegmentsExist(base: string, segments: string[]): Promise<boolean> {
  if (segments.length === 0) {
    return fileExists(path.join(base, "page.tsx"));
  }

  const [segment, ...rest] = segments;
  const exact = path.join(base, segment);
  if (await directoryExists(exact)) {
    return routeSegmentsExist(exact, rest);
  }

  const entries = await fs.readdir(base, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("[") || entry.name.startsWith("[...")) {
      continue;
    }
    if (await routeSegmentsExist(path.join(base, entry.name), rest)) {
      return true;
    }
  }

  return fileExists(path.join(base, "[...placeholder]", "page.tsx"));
}

async function fileExists(filePath: string) {
  return fs.stat(filePath).then((stat) => stat.isFile()).catch(() => false);
}

async function directoryExists(directoryPath: string) {
  return fs.stat(directoryPath).then((stat) => stat.isDirectory()).catch(() => false);
}
