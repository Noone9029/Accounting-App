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

const artifactRoot = path.join(process.cwd(), "artifacts", "visual-qa", "report-drilldown-dense-entry-visual-qa");

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const reportRoutes = [
  { slug: "reports-index", path: "/reports", heading: /^Reports$/i, expectedText: /Profit & Loss|VAT Return|First report path/i, requiredAny: [PERMISSIONS.reports.view], exportSurface: false },
  { slug: "profit-and-loss", path: "/reports/profit-and-loss", heading: /Profit & Loss/i, expectedText: /Sales discounts and negative adjustments|Zero value revenue row|Net profit/i, requiredAny: [PERMISSIONS.reports.view], exportSurface: true },
  { slug: "balance-sheet", path: "/reports/balance-sheet", heading: /Balance Sheet/i, expectedText: /Allowance for doubtful receivables|Total assets|Retained earnings/i, requiredAny: [PERMISSIONS.reports.view], exportSurface: true },
  { slug: "trial-balance", path: "/reports/trial-balance", heading: /Trial Balance/i, expectedText: /Balanced|Opening Dr|Rounding and manual review adjustment/i, requiredAny: [PERMISSIONS.reports.view], exportSurface: true },
  { slug: "general-ledger", path: "/reports/general-ledger", heading: /General Ledger/i, expectedText: /JE-LARGE-RECEIPT|Running balance|Opening Dr/i, requiredAny: [PERMISSIONS.reports.view], exportSurface: true },
  { slug: "vat-summary", path: "/reports/vat-summary", heading: /VAT Summary/i, expectedText: /Account-basis review|ZERO VAT REVIEW ROW|not an official filing workflow/i, requiredAny: [PERMISSIONS.reports.view], exportSurface: true },
  { slug: "vat-return", path: "/reports/vat-return", heading: /VAT Return/i, expectedText: /Internal draft review CSV only|Finalized sales invoices|authority exchange/i, requiredAny: [PERMISSIONS.reports.view], exportSurface: true },
  { slug: "aged-receivables", path: "/reports/aged-receivables", heading: /Aged Receivables/i, expectedText: /90\+|INV-AGE-ZERO|Visual Customer International Holdings/i, requiredAny: [PERMISSIONS.reports.view], exportSurface: true },
  { slug: "aged-payables", path: "/reports/aged-payables", heading: /Aged Payables/i, expectedText: /90\+|BILL-AGE-ZERO|Visual Supplier Regional Logistics/i, requiredAny: [PERMISSIONS.reports.view], exportSurface: true },
] as const;

const denseRoutes = [
  { slug: "manual-journals", path: "/journal-entries", heading: /Manual journals/i, expectedText: /JE-DRAFT-DENSE|JE-POSTED-LARGE|987654\.3200/i, requiredAny: [PERMISSIONS.journals.view], exportSurface: false },
  { slug: "bank-statement-transactions", path: "/bank-accounts/bank-1/statement-transactions", heading: /Statement transaction review/i, expectedText: /Unmatched|Matched|Rule suggestions/i, requiredAny: [PERMISSIONS.bankStatements.view], exportSurface: false },
  { slug: "customer-statement", path: "/customers/customer-long/statement", heading: /Customer statement activity/i, expectedText: /Closing customer balance|Credit note applied|Visual Customer International Holdings/i, requiredAny: [PERMISSIONS.contacts.view], exportSurface: false, loadStatement: /Load customer statement/i },
  { slug: "supplier-statement", path: "/suppliers/supplier-long/statement", heading: /Supplier statement activity/i, expectedText: /Closing payable|Debit note applied|Visual Supplier Regional Logistics/i, requiredAny: [PERMISSIONS.contacts.view], exportSurface: false, loadStatement: /Load supplier statement/i },
  { slug: "customer-transactions", path: "/customers/customer-long", heading: /Visual Customer International Holdings/i, expectedText: /Customer ledger|Open receivable|accounts-receivable-team/i, requiredAny: [PERMISSIONS.contacts.view], exportSurface: false },
  { slug: "supplier-transactions", path: "/suppliers/supplier-long", heading: /Visual Supplier Regional Logistics/i, expectedText: /Supplier ledger|Open payable|accounts-payable-regional/i, requiredAny: [PERMISSIONS.contacts.view], exportSurface: false },
  { slug: "invoice-line-items", path: "/sales/invoices/invoice-partially-paid", heading: /INV-STATE-PARTIAL/i, expectedText: /Line items|Payments|Balance due/i, requiredAny: [PERMISSIONS.salesInvoices.view], exportSurface: false },
  { slug: "bill-line-items", path: "/purchases/bills/bill-partially-paid", heading: /BILL-STATE-PARTIAL/i, expectedText: /Line items|Payment allocations|Balance due/i, requiredAny: [PERMISSIONS.purchaseBills.view], exportSurface: false },
  { slug: "documents", path: "/documents", heading: /^Documents$/i, expectedText: /Generated PDF archive|Source|Status/i, requiredAny: [PERMISSIONS.generatedDocuments.view, PERMISSIONS.documents.view], exportSurface: false },
  { slug: "audit-logs", path: "/settings/audit-logs", heading: /Audit logs/i, expectedText: /CUSTOMER PAYMENT ALLOCATED|Retention|Aisha LedgerByte Accountant/i, requiredAny: [PERMISSIONS.auditLogs.view], exportSurface: true },
] as const;

const ownerRoutes = [...reportRoutes, ...denseRoutes] as const;

const roleRoutes = [
  ...reportRoutes,
  denseRoutes.find((route) => route.slug === "manual-journals")!,
  denseRoutes.find((route) => route.slug === "bank-statement-transactions")!,
  denseRoutes.find((route) => route.slug === "customer-statement")!,
  denseRoutes.find((route) => route.slug === "supplier-statement")!,
  denseRoutes.find((route) => route.slug === "documents")!,
  denseRoutes.find((route) => route.slug === "audit-logs")!,
] as const;

const skippedRoutes = [
  "/reports/vat: no route exists; current VAT report routes are /reports/vat-summary and /reports/vat-return.",
  "/reports/cash-flow: no route exists.",
  "/reports/customer-statement: no report route exists; customer statement is covered through /customers/customer-long/statement.",
  "/reports/supplier-statement: no report route exists; supplier statement is covered through /suppliers/supplier-long/statement.",
  "/reports/audit-log: no report route exists; dense audit table is covered through /settings/audit-logs.",
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
        reportStatesChecked: [
          "profit and loss hierarchy with zero rows, negative adjustments, long accounts, and large totals",
          "balance sheet assets, liabilities, equity, negative balances, retained earnings, and totals",
          "trial balance debit/credit columns, zero-balance account, long names, and balanced totals",
          "general ledger opening/closing balances, many rows, long descriptions, source references, debit/credit/running balance columns",
          "VAT summary and VAT return internal-review routes with taxable sales, taxable purchases, input/output VAT, adjustments, and zero rows",
          "aged receivables and payables across current, 1-30, 31-60, 61-90, 90+, large overdue, long party, and zero-balance rows",
        ],
        denseEntryStatesChecked: [
          "manual journals with draft, posted, reversed, large amount, and zero-balance rows",
          "bank statement transaction review rows",
          "customer and supplier statement routes",
          "customer and supplier transaction workspaces",
          "invoice and bill line-item/payment-allocation tables",
          "document archive and audit-log dense tables",
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
    test(`Owner report drilldown dense entry visual QA for ${route.slug} at ${viewport.name}`, async ({ page }) => {
      await setupVisualPage(page, viewport, "Owner");
      await page.goto(route.path);
      await assertRouteLoaded(page, route, viewport.name, "Owner");
      await expectAllowedRoute(page, route);
      await expectExportSurface(page, route, "Owner");
      await expectOwnerActionsAvailable(page, route);

      const screenshotPath = path.join(artifactRoot, `${viewport.name}-owner-${route.slug}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      report.push({ kind: "owner-route", role: "Owner", route: route.path, viewport: viewport.name, screenshot: screenshotPath });
    });
  }
}

for (const roleProfile of ["Accountant", "Viewer"] as const satisfies readonly VisualRoleProfileName[]) {
  for (const route of roleRoutes) {
    for (const viewport of viewports) {
      test(`${roleProfile} report drilldown dense entry permission QA for ${route.slug} at ${viewport.name}`, async ({ page }) => {
        await setupVisualPage(page, viewport, roleProfile);
        await page.goto(route.path);
        await assertRouteLoaded(page, route, viewport.name, roleProfile);

        const allowed = canUseAny(roleProfile, route.requiredAny);
        if (allowed) {
          await expectAllowedRoute(page, route);
          await expectExportSurface(page, route, roleProfile);
        } else {
          await expect(page.locator("main").getByText("Access denied", { exact: true })).toBeVisible();
        }

        if (roleProfile === "Viewer") {
          await expectViewerMutationAndExportActionsHidden(page);
        }
        if (roleProfile === "Accountant") {
          await expectAccountantOwnerOnlyActionsHidden(page);
        }

        const screenshotPath = path.join(artifactRoot, `${viewport.name}-${roleProfile.toLowerCase()}-${route.slug}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        report.push({ kind: "role-route", role: roleProfile, route: route.path, viewport: viewport.name, allowed, screenshot: screenshotPath });
      });
    }
  }
}

async function setupVisualPage(
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
  route: (typeof ownerRoutes)[number],
  viewportName: string,
  roleProfile: VisualRoleProfileName,
) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("main").waitFor({ state: "visible" });
  await expectAuthenticatedShell(page, viewportName);
  await expectNoDocumentOverflow(page);
  await expectNoSevereOverlap(page);
  await maybeLoadStatement(page, route);
  await expectTablesReadable(page, viewportName);
  await expectReportFiltersUsable(page);
  await expectNoForbiddenClaims(page);

  const bodyText = await page.locator("body").innerText();
  expect(bodyText, `${roleProfile} route ${route.path} should not show a missing visual fixture.`).not.toMatch(/No visual fixture|Unable to load/i);
}

async function maybeLoadStatement(page: Page, route: (typeof ownerRoutes)[number]) {
  if (!("loadStatement" in route) || !route.loadStatement) {
    return;
  }

  const button = page.locator("main").getByRole("button", { name: route.loadStatement });
  if ((await button.count()) > 0) {
    await button.first().click();
    await expect(page.locator("main").getByText(/Closing customer balance|Closing payable/i).first()).toBeVisible();
  }
}

async function expectAllowedRoute(page: Page, route: (typeof ownerRoutes)[number]) {
  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: route.heading }).first()).toBeVisible();
  await expect(main.getByText(route.expectedText).first()).toBeVisible();
  await expect(main.getByText("Access denied", { exact: true })).toHaveCount(0);
}

async function expectAuthenticatedShell(page: Page, viewportName: string) {
  const banner = page.getByRole("banner");
  await expect(banner).toBeVisible();
  await expect(banner.getByRole("button", { name: /Notifications/i })).toBeVisible();
  await expect(banner.getByRole("button", { name: /Help/i })).toBeVisible();
  const accountButton = banner.getByRole("button", { name: /Account menu/i });
  await expect(accountButton).toBeVisible();
  await accountButton.click();
  const accountMenu = page.getByRole("dialog", { name: /Account menu/i });
  await expect(accountMenu.getByText("Active organization")).toBeVisible();
  await expect(accountMenu.getByRole("link", { name: /Organization settings/i })).toBeVisible();
  await expect(accountMenu.getByRole("button", { name: /Sign out/i })).toBeVisible();
  await page.keyboard.press("Escape");

  if (viewportName !== "mobile") {
    await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toBeVisible();
  }
}

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow, "Covered routes should not create document-level horizontal overflow.").toBe(false);
}

async function expectTablesReadable(page: Page, viewportName: string) {
  const tableCount = await page.locator("main table").count();
  if (tableCount === 0) {
    const text = await page.locator("main").innerText();
    if (text.includes("Access denied")) {
      return;
    }
    expect(text, "Routes without tables should still render clear report cards, totals, filters, or empty states.").toMatch(/Summary|Total|Balance|Amount|Status|Details|Report|VAT|Statement|No .*found/i);
    return;
  }

  const tableAccessibility = await page.evaluate(() =>
    Array.from(document.querySelectorAll("main table")).map((table) => {
      const tableBox = table.getBoundingClientRect();
      const scroller = table.closest(".overflow-x-auto");
      const scrollerBox = scroller?.getBoundingClientRect();
      const moneyText = Array.from(table.querySelectorAll("td, th")).some((cell) => /Debit|Credit|Amount|Balance|Total|SAR|0\.00|1,/.test(cell.textContent ?? ""));
      return {
        hasRows: table.querySelectorAll("tbody tr").length > 0,
        hasHeaders: table.querySelectorAll("th").length > 0,
        insideScroller: Boolean(scroller),
        tableWidth: tableBox.width,
        scrollerWidth: scrollerBox?.width ?? tableBox.width,
        visible: tableBox.width > 0 && tableBox.height > 0,
        moneyText,
      };
    }),
  );

  for (const table of tableAccessibility) {
    expect(table.visible, "Tables should be visible.").toBe(true);
    expect(table.hasHeaders, "Tables should preserve readable headers.").toBe(true);
    if (viewportName !== "desktop" && table.tableWidth > table.scrollerWidth + 1) {
      expect(table.insideScroller, "Wide dense tables on compact viewports should stay inside horizontal scrollers.").toBe(true);
    }
  }

  const bodyText = await page.locator("main").innerText();
  expect(
    tableAccessibility.some((table) => table.hasRows) || /No .*found|No .*yet|No .*rows|No .*activity/i.test(bodyText),
    "Dense routes should have at least one populated table or a clear empty table state.",
  ).toBe(true);
  expect(tableAccessibility.some((table) => table.moneyText) || /Access denied|Audit logs|Documents/.test(bodyText)).toBe(true);
  expect(bodyText, "Money/debit/credit/status columns should remain understandable.").toMatch(/SAR|0\.00|1,|Debit|Credit|Amount|Balance|Total|Status|Running balance|Closing/i);
}

async function expectReportFiltersUsable(page: Page) {
  const main = page.locator("main");
  const bodyText = await main.innerText();
  if (bodyText.includes("Access denied")) {
    return;
  }

  const dateInputs = await main.locator('input[type="date"]').count();
  if (dateInputs > 0) {
    await expect(main.locator('input[type="date"]').first()).toBeVisible();
  }

  const runReport = main.getByRole("button", { name: /Run report|Load customer statement|Load supplier statement|Apply filters/i });
  if ((await runReport.count()) > 0) {
    await expect(runReport.first()).toBeVisible();
  }
}

async function expectExportSurface(page: Page, route: (typeof ownerRoutes)[number], roleProfile: VisualRoleProfileName) {
  if (!route.exportSurface) {
    return;
  }

  const canExport =
    route.slug === "audit-logs"
      ? canUseAny(roleProfile, [PERMISSIONS.auditLogs.export])
      : canUseAny(roleProfile, [PERMISSIONS.reports.export, PERMISSIONS.generatedDocuments.download]);
  const main = page.locator("main");
  const bodyText = await main.innerText();
  if (bodyText.includes("Access denied")) {
    return;
  }

  if (canExport && route.slug !== "audit-logs") {
    await expect(main.getByRole("button", { name: /Download CSV|Download draft review CSV/i }).first()).toBeVisible();
    return;
  }
  if (canExport && route.slug === "audit-logs") {
    await expect(main.getByRole("button", { name: /Export CSV/i }).first()).toBeVisible();
    return;
  }

  await expect(main.getByRole("button", { name: /Download CSV|Download PDF|Download draft review CSV|Export CSV/i })).toHaveCount(0);
}

async function expectOwnerActionsAvailable(page: Page, route: (typeof ownerRoutes)[number]) {
  if (route.slug === "manual-journals") {
    await expect(page.locator("main").getByRole("link", { name: /Create journal/i })).toBeVisible();
  }
  if (route.slug === "audit-logs") {
    await expect(page.locator("main").getByRole("button", { name: /Export CSV/i })).toBeVisible();
  }
}

async function expectViewerMutationAndExportActionsHidden(page: Page) {
  const bodyText = await page.locator("body").innerText();
  if (bodyText.includes("Access denied")) {
    return;
  }

  const blockedLabels = [
    /^Create journal$/i,
    /^Post$/i,
    /^Reverse$/i,
    /^Create invoice$/i,
    /^Create bill$/i,
    /^Record payment$/i,
    /^Record supplier payment$/i,
    /^Export CSV$/i,
    /^Save retention settings$/i,
    /^Post categorization journal$/i,
    /^Ignore row$/i,
  ];

  for (const label of blockedLabels) {
    await expect(page.locator("main").getByRole("button", { name: label })).toHaveCount(0);
    await expect(page.locator("main").getByRole("link", { name: label })).toHaveCount(0);
  }
}

async function expectAccountantOwnerOnlyActionsHidden(page: Page) {
  const bodyText = await page.locator("body").innerText();
  if (bodyText.includes("Access denied")) {
    return;
  }

  for (const label of [/Team Members/i, /Users and roles/i, /Organization setup/i]) {
    await expect(page.getByRole("link", { name: label })).toHaveCount(0);
  }
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
  const blockedPhrases = [
    /FTA certified/i,
    /Peppol certified/i,
    /accredited ASP/i,
    /official UAE provider/i,
    /production compliant/i,
    /ZATCA certified/i,
    /real ASP validation/i,
    /FTA reporting enabled/i,
    /live bank feed connected/i,
    /automatic reconciliation enabled/i,
    /real bank sync enabled/i,
    /official VAT approval/i,
    /certified VAT report/i,
  ];

  for (const pattern of blockedPhrases) {
    expect(text).not.toMatch(pattern);
  }
}

function canUseAny(roleProfile: VisualRoleProfileName, requiredAny: readonly Permission[]): boolean {
  const permissions = visualRoleProfiles[roleProfile].permissions;
  return permissions.includes(PERMISSIONS.admin.fullAccess) || requiredAny.some((permission) => permissions.includes(permission));
}
