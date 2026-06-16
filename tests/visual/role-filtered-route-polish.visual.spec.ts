import { expect, test, type Locator, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { PERMISSIONS, type Permission } from "../../packages/shared/src/permissions";
import {
  installVisualApiMocks,
  primeVisualSession,
  visualRoleProfiles,
  type VisualRoleProfileName,
} from "./visual-fixtures";

const artifactRoot = path.join(process.cwd(), "artifacts", "visual-qa", "role-filtered-route-polish");

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const routeProfiles = ["Owner", "Viewer"] as const satisfies readonly VisualRoleProfileName[];

const routes = [
  { slug: "dashboard", path: "/dashboard", heading: /Dashboard/i, actionText: /Receivables|Controlled beta/i, requiredAny: [PERMISSIONS.dashboard.view] },
  { slug: "sales-invoices", path: "/sales/invoices", heading: /Sales invoices/i, actionText: /INV-VIS-001/i, requiredAny: [PERMISSIONS.salesInvoices.view] },
  { slug: "sales-invoice-new", path: "/sales/invoices/new", heading: /Create sales invoice/i, actionText: /Create draft invoice/i, requiredAny: [PERMISSIONS.salesInvoices.create] },
  { slug: "purchase-bills", path: "/purchases/bills", heading: /Purchase bills/i, actionText: /BILL-VIS-001/i, requiredAny: [PERMISSIONS.purchaseBills.view] },
  { slug: "purchase-bill-new", path: "/purchases/bills/new", heading: /Create purchase bill/i, actionText: /Save draft/i, requiredAny: [PERMISSIONS.purchaseBills.create] },
  { slug: "customer-detail", path: "/customers/customer-1", heading: /Visual Customer/i, actionText: /Customer ledger visibility/i, requiredAny: [PERMISSIONS.contacts.view] },
  { slug: "supplier-detail", path: "/suppliers/supplier-1", heading: /Visual Supplier/i, actionText: /Supplier ledger visibility/i, requiredAny: [PERMISSIONS.contacts.view] },
  { slug: "customer-payments", path: "/sales/customer-payments", heading: /Customer payments/i, actionText: /PAY-VIS-001/i, requiredAny: [PERMISSIONS.customerPayments.view] },
  { slug: "supplier-payments", path: "/purchases/supplier-payments", heading: /Supplier payments/i, actionText: /SPAY-VIS-001/i, requiredAny: [PERMISSIONS.supplierPayments.view] },
  { slug: "sales-credit-notes", path: "/sales/credit-notes", heading: /Sales credit notes/i, actionText: /CN-VIS-001/i, requiredAny: [PERMISSIONS.creditNotes.view] },
  { slug: "purchase-debit-notes", path: "/purchases/debit-notes", heading: /Debit notes/i, actionText: /DN-VIS-001/i, requiredAny: [PERMISSIONS.purchaseDebitNotes.view] },
  { slug: "documents", path: "/documents", heading: /^Documents$/i, actionText: /Generated PDF archive/i, requiredAny: [PERMISSIONS.generatedDocuments.view, PERMISSIONS.documents.view] },
  { slug: "reports", path: "/reports", heading: /^Reports$/i, actionText: /First report path/i, requiredAny: [PERMISSIONS.reports.view] },
  { slug: "settings", path: "/settings", heading: /Team Members/i, actionText: /Beta access guidance/i, requiredAny: [PERMISSIONS.users.view] },
  { slug: "settings-storage", path: "/settings/storage", heading: /Storage/i, actionText: /readiness and dry-run planning only/i, requiredAny: [PERMISSIONS.documentSettings.view, PERMISSIONS.attachments.manage] },
  { slug: "settings-compliance", path: "/settings/compliance", heading: /Compliance readiness/i, actionText: /Controlled beta/i, requiredAny: [PERMISSIONS.compliance.view] },
  { slug: "bank-accounts", path: "/bank-accounts", heading: /Bank accounts/i, actionText: /Cash and bank profiles/i, requiredAny: [PERMISSIONS.bankAccounts.view] },
] as const;

const createProfiles = ["Owner", "Accountant", "Sales", "Purchases", "Viewer"] as const satisfies readonly VisualRoleProfileName[];

const createExpectations: Record<VisualRoleProfileName, Record<string, string | false>> = {
  Owner: {
    Invoice: "/sales/invoices/new",
    "Receive payment": "/sales/customer-payments/new",
    Bill: "/purchases/bills/new",
    "Pay bills": "/purchases/supplier-payments/new",
    "Journal entry": "/journal-entries/new",
  },
  Accountant: {
    Invoice: false,
    "Receive payment": "/sales/customer-payments/new",
    Bill: false,
    "Pay bills": "/purchases/supplier-payments/new",
    "Journal entry": "/journal-entries/new",
  },
  Sales: {
    Invoice: "/sales/invoices/new",
    "Receive payment": "/sales/customer-payments/new",
    Bill: false,
    "Pay bills": false,
    "Journal entry": false,
  },
  Purchases: {
    Invoice: false,
    "Receive payment": false,
    Bill: "/purchases/bills/new",
    "Pay bills": "/purchases/supplier-payments/new",
    "Journal entry": false,
  },
  Viewer: {
    Invoice: false,
    "Receive payment": false,
    Bill: false,
    "Pay bills": false,
    "Journal entry": false,
  },
};

const report: Array<{
  kind: "route" | "create-menu";
  role: VisualRoleProfileName;
  route?: string;
  viewport: string;
  allowed?: boolean;
  screenshot: string;
}> = [];

test.beforeAll(async () => {
  await fs.mkdir(artifactRoot, { recursive: true });
});

test.afterAll(async () => {
  await fs.writeFile(
    path.join(artifactRoot, "visual-results.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), routes: report }, null, 2)}\n`,
    "utf8",
  );
});

for (const roleProfile of routeProfiles) {
  for (const route of routes) {
    for (const viewport of viewports) {
      test(`${roleProfile} role route QA for ${route.slug} at ${viewport.name}`, async ({ page }) => {
        await setupVisualRolePage(page, roleProfile, viewport);
        await page.goto(route.path);
        await page.waitForLoadState("domcontentloaded");
        await page.locator("main").waitFor({ state: "visible" });

        const allowed = canUseAny(roleProfile, route.requiredAny);
        await expectAuthenticatedShell(page, roleProfile, viewport.name);
        await expectNoDocumentOverflow(page);
        await expectNoSevereOverlap(page);
        await expectNoForbiddenClaims(page);

        const main = page.locator("main");
        if (allowed) {
          await expect(main.getByRole("heading", { name: route.heading }).first()).toBeVisible();
          await expect(main.getByText(route.actionText).first()).toBeVisible();
          await expect(main.getByText("Access denied", { exact: true })).toHaveCount(0);
        } else {
          await expect(main.getByText("Access denied", { exact: true })).toBeVisible();
          await expect(main.getByText(/does not include the permission required/i)).toBeVisible();
        }

        const screenshotPath = path.join(artifactRoot, `${viewport.name}-${roleProfile.toLowerCase()}-${route.slug}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        report.push({ kind: "route", role: roleProfile, route: route.path, viewport: viewport.name, allowed, screenshot: screenshotPath });
      });
    }
  }
}

for (const roleProfile of createProfiles) {
  for (const viewport of viewports) {
    test(`${roleProfile} role create menu QA at ${viewport.name}`, async ({ page }) => {
      await setupVisualRolePage(page, roleProfile, viewport);
      await page.goto("/dashboard");
      await page.waitForLoadState("domcontentloaded");
      await page.locator("main").waitFor({ state: "visible" });

      await expectAuthenticatedShell(page, roleProfile, viewport.name);
      await page.getByRole("button", { name: "Create" }).first().click();
      const dialog = page.getByRole("dialog", { name: "Create menu" });
      await expect(dialog).toBeVisible();

      for (const [label, href] of Object.entries(createExpectations[roleProfile])) {
        await expectCreateAction(dialog, label, href);
      }
      await expectCreateLinksAreRealRoutes(dialog);
      await expectNoDocumentOverflow(page);
      await expectNoForbiddenClaims(page);

      const screenshotPath = path.join(artifactRoot, `${viewport.name}-${roleProfile.toLowerCase()}-create-menu.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      report.push({ kind: "create-menu", role: roleProfile, viewport: viewport.name, screenshot: screenshotPath });
    });
  }
}

async function setupVisualRolePage(
  page: Page,
  roleProfile: VisualRoleProfileName,
  viewport: { width: number; height: number },
) {
  await installVisualApiMocks(page, { roleProfile });
  await primeVisualSession(page, { roleProfile });
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function expectAuthenticatedShell(page: Page, roleProfile: VisualRoleProfileName, viewportName: string) {
  const banner = page.getByRole("banner");
  await expect(banner).toBeVisible();
  await expect(banner.getByText("Accounting workspace", { exact: true })).toBeVisible();
  await expect(banner.getByLabel("Organization")).toBeVisible();
  await expect(banner.getByRole("button", { name: /Sign out/i })).toBeVisible();

  if (viewportName !== "mobile") {
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();

    if (roleProfile === "Viewer") {
      await expect(nav.getByRole("link", { name: "Banking", exact: true })).toHaveCount(0);
      await expect(banner.getByRole("link", { name: "Organization setup" })).toHaveCount(0);
      await expect(banner.getByRole("link", { name: "New journal" })).toHaveCount(0);
    }
  } else {
    await expect(page.getByRole("navigation", { name: "First workflow navigation" })).toBeVisible();
  }
}

async function expectCreateAction(dialog: Locator, label: string, href: string | false) {
  if (href) {
    await expect(dialog.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", href);
    await expect(dialog.getByRole("button", { name: label, exact: true })).toHaveCount(0);
    return;
  }

  await expect(dialog.getByRole("link", { name: label, exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: label, exact: true })).toBeDisabled();
}

async function expectCreateLinksAreRealRoutes(dialog: Locator) {
  const hrefs = await dialog.locator("a").evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")).filter((href): href is string => Boolean(href)),
  );

  for (const href of hrefs) {
    expect(href, "Create menu links should point to local application routes.").toMatch(/^\/[a-z0-9/?=&_-]/i);
  }
}

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow, "Role-filtered route should not create document-level horizontal overflow.").toBe(false);
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
  const blockedPatterns = [
    ["FTA", "certified"],
    ["Peppol", "certified"],
    ["accredited", "ASP"],
    ["official", "UAE", "provider"],
    ["production", "compliant"],
    ["ZATCA", "certified"],
    ["real", "ASP", "validation"],
    ["FTA", "reporting", "enabled"],
  ].map((parts) => new RegExp(parts.join("\\s+"), "i"));

  for (const pattern of blockedPatterns) {
    expect(text).not.toMatch(pattern);
  }
}

function canUseAny(roleProfile: VisualRoleProfileName, requiredAny: readonly Permission[]): boolean {
  const permissions = visualRoleProfiles[roleProfile].permissions;
  return permissions.includes(PERMISSIONS.admin.fullAccess) || requiredAny.some((permission) => permissions.includes(permission));
}
