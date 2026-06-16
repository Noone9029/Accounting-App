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

const artifactRoot = path.join(process.cwd(), "artifacts", "visual-qa", "secondary-operational-route-polish");
const appRouteRoot = path.join(process.cwd(), "apps", "web", "src", "app", "(app)");

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const coveredRoutes = [
  { slug: "customers", path: "/customers", heading: /^Customers$/i, expectedText: /Visual Customer International Holdings|No matching customers found/i, requiredAny: [PERMISSIONS.contacts.view] },
  { slug: "suppliers", path: "/suppliers", heading: /^Suppliers$/i, expectedText: /Visual Supplier Regional Logistics|No matching suppliers found/i, requiredAny: [PERMISSIONS.contacts.view] },
  { slug: "settings", path: "/settings", heading: /Team Members/i, expectedText: /Beta access guidance|mock invites/i, requiredAny: [PERMISSIONS.users.view], ownerOnlyAction: /Send mock invite/i },
  { slug: "settings-team", path: "/settings/team", heading: /Team Members/i, expectedText: /Aisha LedgerByte Accountant|pending\.invite\.long/i, requiredAny: [PERMISSIONS.users.view], ownerOnlyAction: /Send mock invite/i },
  { slug: "settings-roles", path: "/settings/roles", heading: /Roles & Permissions/i, expectedText: /Regional Operations Readonly Reviewer|Beta role guidance/i, requiredAny: [PERMISSIONS.roles.view], ownerOnlyAction: /Create role/i },
  { slug: "settings-storage", path: "/settings/storage", heading: /^Storage$/i, expectedText: /metadata-only|No hosted backup provider evidence/i, requiredAny: [PERMISSIONS.documentSettings.view, PERMISSIONS.attachments.manage], ownerOnlyAction: /Capture evidence/i },
  { slug: "settings-compliance", path: "/settings/compliance", heading: /Compliance readiness/i, expectedText: /Controlled beta|ASP validation not connected|No FTA reporting yet/i, requiredAny: [PERMISSIONS.compliance.view], ownerOnlyAction: /Save UAE readiness fields/i },
  { slug: "settings-audit-logs", path: "/settings/audit-logs", heading: /Audit logs/i, expectedText: /CUSTOMER PAYMENT ALLOCATED|Retention|Aisha LedgerByte Accountant/i, requiredAny: [PERMISSIONS.auditLogs.view], ownerOnlyAction: /Save retention settings/i },
  { slug: "settings-numbering", path: "/settings/number-sequences", heading: /Number sequences/i, expectedText: /INV-UAE-OPERATIONS-2026|BILL-REGIONAL-SUPPLY|future documents only/i, requiredAny: [PERMISSIONS.numberSequences.view] },
  { slug: "accounts", path: "/accounts", heading: /Chart of accounts/i, expectedText: /Inactive . Control|Active . Posting/i, requiredAny: [PERMISSIONS.accounts.view] },
  { slug: "tax-rates", path: "/tax-rates", heading: /Tax rates/i, expectedText: /UAE VAT 5% standard|Zero-rated export supply review|Inactive historical VAT/i, requiredAny: [PERMISSIONS.taxRates.view] },
  { slug: "setup", path: "/setup", heading: /Guided setup/i, expectedText: /Collect provider evidence|Provider evidence is unavailable|Top blockers/i, requiredAny: [PERMISSIONS.dashboard.view] },
  { slug: "documents", path: "/documents", heading: /^Documents$/i, expectedText: /failed-generation|local-review-export-ready|No generated documents found/i, requiredAny: [PERMISSIONS.generatedDocuments.view, PERMISSIONS.documents.view], primaryAction: /Apply filters/i },
  { slug: "bank-accounts", path: "/bank-accounts", heading: /Bank accounts/i, expectedText: /Operations overdraft account|Archived manual bank profile|Cash and bank profiles/i, requiredAny: [PERMISSIONS.bankAccounts.view] },
  { slug: "bank-account-detail", path: "/bank-accounts/bank-1", heading: /Main Bank/i, expectedText: /Manual statement import testing only|Statement imports|Reconciliations/i, requiredAny: [PERMISSIONS.bankAccounts.view] },
  { slug: "bank-statement-transactions", path: "/bank-accounts/bank-1/statement-transactions", heading: /Statement transaction review/i, expectedText: /Unmatched|Matched|Rule suggestions/i, requiredAny: [PERMISSIONS.bankStatements.view] },
] as const;

const ownerRoutes = coveredRoutes;
const roleRoutes = coveredRoutes;
const roleProfiles = ["Owner", "Accountant", "Viewer"] as const satisfies readonly VisualRoleProfileName[];

const skippedRoutes = [
  "/settings/users: no route exists; user management is implemented at /settings/team.",
  "/settings/organization: no route exists; organization setup/profile is implemented at /organization/setup.",
  "/settings/taxes: no route exists; tax setup is implemented at /tax-rates.",
  "/settings/numbering: no route exists; numbering is implemented at /settings/number-sequences.",
  "/settings/chart-of-accounts: no route exists; chart of accounts is implemented at /accounts.",
  "/settings/security: no separate route exists; current security/session guidance is grouped under /settings/team.",
  "/settings/api: no route exists; provider/API readiness guidance is grouped under /settings/compliance.",
  "/settings/uae-einvoicing: no route exists; UAE readiness guidance is grouped under /settings/compliance.",
  "/onboarding: no route exists; guided setup is implemented at /setup.",
  "/documents/document-1: no document detail route exists.",
  "/generated-documents: no app route exists; generated documents are listed at /documents.",
  "/bank-accounts/bank-account-1: fixture id does not exist; real visual fixture route is /bank-accounts/bank-1.",
  "/bank-accounts/bank-account-1/transactions: fixture id and route alias do not exist; real route is /bank-accounts/bank-1/statement-transactions.",
  "/settings/zatca: route exists, but this branch intentionally avoids ZATCA-specific visual expansion; UAE readiness wording is covered at /settings/compliance.",
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
        secondaryOperationalStatesChecked: [
          "customer and supplier lists with many rows, long names, balances, overdue balances, TRN/TIN-style tax fields, inactive rows, and filtered empty states",
          "settings overview redirect, users/team, roles, storage, compliance, audit logs, numbering, accounts, and tax setup",
          "setup checklist with complete, incomplete, and blocked-provider-evidence states",
          "generated document archive with long filenames, failed rows, local-ready database rows, filters, and empty filtered states",
          "manual bank-account list, detail, and statement transaction review routes without fake bank-feed claims",
        ],
        routes: report,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
});

for (const route of ownerRoutes) {
  for (const viewport of viewports) {
    test(`Owner secondary operational route visual QA for ${route.slug} at ${viewport.name}`, async ({ page }) => {
      await setupPage(page, viewport, "Owner");
      await page.goto(route.path);
      await assertRouteLoaded(page, route, viewport.name, "Owner");
      await expectAllowedRoute(page, route);
      await exerciseRouteSpecificEmptyStates(page, route.slug);
      await expectPrimaryActions(page, route, "Owner");
      await expectTablesAndControlsReadable(page, viewport.name);
      await expectDangerActionsQuiet(page);
      await expectNoForbiddenClaims(page);

      const screenshotPath = path.join(artifactRoot, `${viewport.name}-owner-${route.slug}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      report.push({ kind: "owner-route", role: "Owner", route: route.path, viewport: viewport.name, screenshot: screenshotPath });
    });
  }
}

for (const roleProfile of roleProfiles.filter((role) => role !== "Owner")) {
  for (const route of roleRoutes) {
    for (const viewport of viewports) {
      test(`${roleProfile} secondary operational permission QA for ${route.slug} at ${viewport.name}`, async ({ page }) => {
        await setupPage(page, viewport, roleProfile);
        await page.goto(route.path);
        await assertRouteLoaded(page, route, viewport.name, roleProfile);

        const allowed = canUseAny(roleProfile, route.requiredAny);
        if (allowed) {
          await expectAllowedRoute(page, route);
          await expectPrimaryActions(page, route, roleProfile);
          await expectTablesAndControlsReadable(page, viewport.name);
        } else {
          await expect(page.locator("main").getByText("Access denied", { exact: true })).toBeVisible();
        }

        await expectRoleMutationActionsHidden(page, roleProfile);
        await expectDangerActionsQuiet(page);
        await expectNoForbiddenClaims(page);

        const screenshotPath = path.join(artifactRoot, `${viewport.name}-${roleProfile.toLowerCase()}-${route.slug}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        report.push({ kind: "role-route", role: roleProfile, route: route.path, viewport: viewport.name, allowed, screenshot: screenshotPath });
      });
    }
  }
}

for (const viewport of viewports) {
  test(`route and action consistency checks at ${viewport.name}`, async ({ page }) => {
    await setupPage(page, viewport, "Owner");
    await page.goto("/dashboard");
    await page.locator("main").waitFor({ state: "visible" });

    const registeredHrefs = await collectRegisteredHrefs();
    expect(registeredHrefs.length, "Route registry should expose app-local hrefs.").toBeGreaterThan(0);
    for (const href of registeredHrefs) {
      await expectAppRouteExists(href);
    }

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
    await expectNoForbiddenClaims(page);

    const screenshotPath = path.join(artifactRoot, `${viewport.name}-route-action-consistency.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    report.push({ kind: "route-action-consistency", role: "Owner", viewport: viewport.name, hrefsChecked: registeredHrefs.length + createHrefs.length, screenshot: screenshotPath });
  });
}

async function setupPage(
  page: Page,
  viewport: { width: number; height: number },
  roleProfile: VisualRoleProfileName,
) {
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
  await expectNoForbiddenClaims(page);

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
  await expect(banner.getByLabel("Organization")).toBeVisible();
  await expect(banner.getByRole("button", { name: /Sign out/i })).toBeVisible();

  if (viewportName === "mobile") {
    await expect(page.getByRole("navigation", { name: "First workflow navigation" })).toBeVisible();
  } else {
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  }
}

async function expectPrimaryActions(page: Page, route: (typeof coveredRoutes)[number], roleProfile: VisualRoleProfileName) {
  const main = page.locator("main");
  if ("primaryAction" in route && route.primaryAction) {
    await expect(main.getByText(route.primaryAction).first()).toBeVisible();
  }

  if (!("ownerOnlyAction" in route) || !route.ownerOnlyAction) {
    return;
  }

  const action = main.getByText(route.ownerOnlyAction).first();
  if (roleProfile === "Owner") {
    await expect(action).toBeVisible();
  } else {
    if ((await action.count()) > 0) {
      await expect(action).toBeDisabled();
    }
  }
}

async function expectRoleMutationActionsHidden(page: Page, roleProfile: Exclude<VisualRoleProfileName, "Owner">) {
  const main = page.locator("main");
  const blockedLabels = roleProfile === "Viewer"
    ? [
        /^Add customer$/i,
        /^Add supplier$/i,
        /^Send mock invite$/i,
        /^Create role$/i,
        /^Add account$/i,
        /^Add tax rate$/i,
        /^Save sequence$/i,
        /^Save retention settings$/i,
        /^Link account$/i,
        /^Archive$/i,
        /^Reactivate$/i,
        /^Categorize selected$/i,
        /^Ignore selected$/i,
        /^Send local AP email$/i,
      ]
    : [/^Send mock invite$/i, /^Create role$/i, /^Save retention settings$/i];

  for (const label of blockedLabels) {
    await expect(main.getByRole("button", { name: label })).toHaveCount(0);
    await expect(main.getByRole("link", { name: label })).toHaveCount(0);
  }
}

async function exerciseRouteSpecificEmptyStates(page: Page, slug: string) {
  if (slug === "customers" || slug === "suppliers") {
    const search = page.locator("main input").first();
    await search.fill("zzzz-no-secondary-match");
    await expect(page.locator("main").getByText(/No matching customers found|No matching suppliers found/i)).toBeVisible();
    await search.fill("");
    return;
  }

  if (slug === "documents") {
    await page.locator("main select").nth(1).selectOption("SUPERSEDED");
    await page.getByRole("button", { name: /Apply filters/i }).click();
    await expect(page.locator("main").getByText(/No generated documents found/i)).toBeVisible();
  }
}

async function expectTablesAndControlsReadable(page: Page, viewportName: string) {
  const main = page.locator("main");
  const tableCount = await main.locator("table").count();
  if (tableCount > 0) {
    const tableAccessibility = await page.evaluate(() =>
      Array.from(document.querySelectorAll("main table")).map((table) => {
        const tableBox = table.getBoundingClientRect();
        const scroller = table.closest(".overflow-x-auto");
        const scrollerBox = scroller?.getBoundingClientRect();
        return {
          hasRows: table.querySelectorAll("tbody tr").length > 0,
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
        expect(table.insideScroller, "Wide secondary tables should stay inside horizontal scrollers.").toBe(true);
      }
    }
  }

  const crampedControls = await page.evaluate(() =>
    Array.from(document.querySelectorAll("main input, main select, main button, main a")).filter((element) => {
      const box = element.getBoundingClientRect();
      const text = element.textContent?.trim() || (element as HTMLInputElement).placeholder || "";
      return box.width > 0 && box.height > 0 && text.length > 8 && box.width < 36;
    }).length,
  );
  expect(crampedControls, "Interactive controls should not crush to unreadable widths.").toBe(0);
}

async function expectDangerActionsQuiet(page: Page) {
  const loudDangerActions = await page.locator("main button, main a").evaluateAll((elements) =>
    elements.filter((element) => {
      const text = element.textContent ?? "";
      const className = element.getAttribute("class") ?? "";
      return /Delete|Purge|Archive|Suspend|Revoke/i.test(text) && /bg-(red|rose|pink)-[5-9]00|text-white/.test(className);
    }).length,
  );
  expect(loudDangerActions, "Danger/destructive secondary actions should not be visually over-prominent.").toBe(0);
}

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow, "Secondary operational routes should not create document-level horizontal overflow.").toBe(false);
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

async function expectNoForbiddenClaims(page: Page) {
  const text = await page.locator("body").innerText();
  const blockedPatterns = forbiddenClaimPatterns();

  for (const pattern of blockedPatterns) {
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
  ].map((parts) => new RegExp(parts.join("\\s+"), "i"));
}

function canUseAny(roleProfile: VisualRoleProfileName, requiredAny: readonly Permission[]): boolean {
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
