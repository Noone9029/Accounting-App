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

const artifactRoot = path.join(process.cwd(), "artifacts", "visual-qa", "refund-collections-banking-detail-polish");

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const ownerRoutes = [
  { slug: "credit-notes-list", path: "/sales/credit-notes", heading: /Sales credit notes/i, expectedText: /CN-STATE-PARTIAL|CN-STATE-VOIDED|CN-STATE-LONG-LARGE/i, requiredAny: [PERMISSIONS.creditNotes.view], expectedAction: /Create credit note/i },
  { slug: "credit-note-new", path: "/sales/credit-notes/new", heading: /Create credit note/i, expectedText: /Save draft|Credit note/i, requiredAny: [PERMISSIONS.creditNotes.create] },
  { slug: "credit-note-partial", path: "/sales/credit-notes/credit-note-partially-applied", heading: /CN-STATE-PARTIAL/i, expectedText: /Credit allocations|Credit available|Apply credit/i, requiredAny: [PERMISSIONS.creditNotes.view] },
  { slug: "credit-note-voided", path: "/sales/credit-notes/credit-note-voided", heading: /CN-STATE-VOIDED/i, expectedText: /Voided|Credit can be applied only/i, requiredAny: [PERMISSIONS.creditNotes.view] },
  { slug: "credit-note-long-large", path: "/sales/credit-notes/credit-note-long-large", heading: /CN-STATE-LONG-LARGE/i, expectedText: /Visual Customer International Holdings|1,135,802|Long local visual note/i, requiredAny: [PERMISSIONS.creditNotes.view] },
  { slug: "customer-refunds-list", path: "/sales/customer-refunds", heading: /Customer refunds/i, expectedText: /CRF-VIS-001|Credit note|Manual refunds/i, requiredAny: [PERMISSIONS.customerRefunds.view], expectedAction: /Record refund/i },
  { slug: "customer-refund-new", path: "/sales/customer-refunds/new?customerId=customer-long&sourceType=CREDIT_NOTE&sourceCreditNoteId=credit-note-unapplied", heading: /Record customer refund/i, expectedText: /Refund source|Remaining after refund|does not call payment gateways/i, requiredAny: [PERMISSIONS.customerRefunds.create] },
  { slug: "customer-refund-detail", path: "/sales/customer-refunds/customer-refund-1", heading: /CRF-VIS-001/i, expectedText: /Refund source|No payment gateway|PDF amount/i, requiredAny: [PERMISSIONS.customerRefunds.view] },
  { slug: "collections-list", path: "/sales/collections", heading: /Collections/i, expectedText: /Top overdue customers|31-60 days|Promised-to-pay/i, requiredAny: [PERMISSIONS.salesInvoices.view], expectedAction: /New collection case/i },
  { slug: "collections-detail", path: "/sales/collections/collection-case-visual", heading: /COL-VIS-001/i, expectedText: /Collection amount effect|AR aging math|Activity timeline/i, requiredAny: [PERMISSIONS.salesInvoices.view] },
  { slug: "customer-long-collections", path: "/customers/customer-long", heading: /Visual Customer International Holdings/i, expectedText: /Customer ledger|Open receivable|accounts-receivable-team/i, requiredAny: [PERMISSIONS.contacts.view] },
  { slug: "debit-notes-list", path: "/purchases/debit-notes", heading: /Debit notes/i, expectedText: /DN-STATE-PARTIAL|DN-STATE-VOIDED|DN-STATE-LONG-LARGE/i, requiredAny: [PERMISSIONS.purchaseDebitNotes.view], expectedAction: /Create debit note/i },
  { slug: "debit-note-new", path: "/purchases/debit-notes/new", heading: /Create debit note/i, expectedText: /Save draft|Debit note/i, requiredAny: [PERMISSIONS.purchaseDebitNotes.create] },
  { slug: "debit-note-partial", path: "/purchases/debit-notes/debit-note-partially-applied", heading: /DN-STATE-PARTIAL/i, expectedText: /Debit allocations|Debit available|Apply debit/i, requiredAny: [PERMISSIONS.purchaseDebitNotes.view] },
  { slug: "debit-note-voided", path: "/purchases/debit-notes/debit-note-voided", heading: /DN-STATE-VOIDED/i, expectedText: /Voided|Debit notes can be applied only/i, requiredAny: [PERMISSIONS.purchaseDebitNotes.view] },
  { slug: "debit-note-long-large", path: "/purchases/debit-notes/debit-note-long-large", heading: /DN-STATE-LONG-LARGE/i, expectedText: /Visual Supplier Regional Logistics|1,008,024|Long local visual note/i, requiredAny: [PERMISSIONS.purchaseDebitNotes.view] },
  { slug: "supplier-refunds-list", path: "/purchases/supplier-refunds", heading: /Supplier refunds/i, expectedText: /SRF-VIS-001|Purchase debit note|Manual refunds/i, requiredAny: [PERMISSIONS.supplierRefunds.view], expectedAction: /Record refund/i },
  { slug: "supplier-refund-new", path: "/purchases/supplier-refunds/new?supplierId=supplier-long&sourceType=PURCHASE_DEBIT_NOTE&sourceDebitNoteId=debit-note-unapplied", heading: /Record supplier refund/i, expectedText: /Refund source|Remaining after refund|does not call bank transfers/i, requiredAny: [PERMISSIONS.supplierRefunds.create] },
  { slug: "supplier-refund-detail", path: "/purchases/supplier-refunds/supplier-refund-1", heading: /SRF-VIS-001/i, expectedText: /Refund source|No bank transfer|PDF amount/i, requiredAny: [PERMISSIONS.supplierRefunds.view] },
  { slug: "supplier-long-payables", path: "/suppliers/supplier-long", heading: /Visual Supplier Regional Logistics/i, expectedText: /Supplier ledger|Open payable|accounts-payable-regional/i, requiredAny: [PERMISSIONS.contacts.view] },
  { slug: "bank-accounts", path: "/bank-accounts", heading: /Bank accounts/i, expectedText: /Operations overdraft account|Archived manual bank profile|Main Bank/i, requiredAny: [PERMISSIONS.bankAccounts.view], expectedAction: /Link account/i },
  { slug: "bank-account-detail", path: "/bank-accounts/bank-1", heading: /Main Bank/i, expectedText: /Statement transactions|Running balance|Manual statement/i, requiredAny: [PERMISSIONS.bankAccounts.view] },
  { slug: "bank-statement-transactions", path: "/bank-accounts/bank-1/statement-transactions", heading: /Statement transaction review/i, expectedText: /Unmatched|Matched|Rule suggestions|auto-reconcile/i, requiredAny: [PERMISSIONS.bankStatements.view] },
  { slug: "bank-statement-transaction-detail", path: "/bank-statement-transactions/statement-row-unmatched", heading: /Statement transaction/i, expectedText: /What this statement row means|Match candidates|does not use live bank feeds/i, requiredAny: [PERMISSIONS.bankStatements.view] },
  { slug: "reconciliation-summary", path: "/bank-accounts/bank-1/reconciliation", heading: /Reconciliation summary/i, expectedText: /How reconciliation works|Needs review|Closed through/i, requiredAny: [PERMISSIONS.bankReconciliations.view] },
  { slug: "reconciliations-list", path: "/bank-accounts/bank-1/reconciliations", heading: /Bank reconciliations/i, expectedText: /Closed-period history|REC-VIS-001|Unmatched rows/i, requiredAny: [PERMISSIONS.bankReconciliations.view], expectedAction: /New reconciliation/i },
  { slug: "reconciliation-detail", path: "/bank-reconciliations/rec-1", heading: /REC-VIS-001/i, expectedText: /Statement rows snapshot|Review events|Download report/i, requiredAny: [PERMISSIONS.bankReconciliations.view] },
  { slug: "cheques", path: "/bank-accounts/bank-1/cheques", heading: /Cheques/i, expectedText: /Manual cheque lifecycle|CHQ-REC-LONG-001|No live bank feed/i, requiredAny: [PERMISSIONS.bankStatements.view] },
  { slug: "aged-receivables", path: "/reports/aged-receivables", heading: /Aged Receivables/i, expectedText: /31-60|Balance due/i, requiredAny: [PERMISSIONS.reports.view] },
  { slug: "aged-payables", path: "/reports/aged-payables", heading: /Aged Payables/i, expectedText: /31-60|Balance due/i, requiredAny: [PERMISSIONS.reports.view] },
  { slug: "general-ledger", path: "/reports/general-ledger", heading: /General Ledger/i, expectedText: /Running balance|Debit note applied/i, requiredAny: [PERMISSIONS.reports.view] },
  { slug: "documents", path: "/documents", heading: /^Documents$/i, expectedText: /Generated PDF archive|Source|Status/i, requiredAny: [PERMISSIONS.generatedDocuments.view, PERMISSIONS.documents.view] },
] as const;

const roleRoutes = ownerRoutes.filter((route) =>
  [
    "credit-notes-list",
    "credit-note-partial",
    "customer-refunds-list",
    "collections-list",
    "debit-notes-list",
    "supplier-refunds-list",
    "bank-accounts",
    "bank-statement-transactions",
    "bank-statement-transaction-detail",
    "reconciliation-summary",
    "reconciliations-list",
    "cheques",
  ].includes(route.slug),
);

const skippedRoutes = [
  "/banking: no top-level banking route exists; banking surfaces live under /bank-accounts.",
  "/reconciliation: no top-level reconciliation route exists; reconciliation routes live under /bank-accounts/[id]/reconciliation and /bank-reconciliations/[id].",
  "/cheques: no top-level cheques route exists; cheque register lives under /bank-accounts/[id]/cheques.",
  "/customers/customer-collections: no dedicated customer collections route exists; customer collection context is covered through /sales/collections and /customers/customer-long.",
  "/suppliers/supplier-payables: no dedicated supplier payables route exists; supplier payable context is covered through /suppliers/supplier-long and aged payables.",
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
        skippedUnsupportedStates: [
          "cancelled credit/debit note state is skipped because the app exposes VOIDED, not CANCELLED",
          "stale cheque state is skipped because the app exposes DRAFT, RECEIVED, ISSUED, DEPOSITED, CLEARED, BOUNCED, and VOIDED",
          "split bank transaction display is skipped because no split-transaction UI exists in the current bank statement routes",
          "supplier collections route is skipped because the current app has payables detail/report surfaces, not a supplier collections route",
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
    test(`Owner refund collections banking visual QA for ${route.slug} at ${viewport.name}`, async ({ page }) => {
      await setupVisualPage(page, viewport, "Owner");
      await page.goto(route.path);
      await assertRouteLoaded(page, route, viewport.name, "Owner");
      await expectAllowedRoute(page, route);
      if (route.expectedAction) {
        await expect(page.locator("main").getByText(route.expectedAction).first()).toBeVisible();
      }

      const screenshotPath = path.join(artifactRoot, `${viewport.name}-owner-${route.slug}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      report.push({ kind: "owner-route", role: "Owner", route: route.path, viewport: viewport.name, screenshot: screenshotPath });
    });
  }
}

for (const roleProfile of ["Accountant", "Viewer"] as const satisfies readonly VisualRoleProfileName[]) {
  for (const route of roleRoutes) {
    for (const viewport of viewports) {
      test(`${roleProfile} refund collections banking permission QA for ${route.slug} at ${viewport.name}`, async ({ page }) => {
        await setupVisualPage(page, viewport, roleProfile);
        await page.goto(route.path);
        await assertRouteLoaded(page, route, viewport.name, roleProfile);

        const allowed = canUseAny(roleProfile, route.requiredAny);
        if (allowed) {
          await expectAllowedRoute(page, route);
        } else {
          await expect(page.locator("main").getByText("Access denied", { exact: true })).toBeVisible();
        }

        if (roleProfile === "Viewer") {
          await expectViewerMutationActionsHidden(page);
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
  await expectTablesReadable(page, viewportName);
  await expectNoSevereOverlap(page);
  await expectNoForbiddenClaims(page);
  await expectBankingCopyStaysManual(page);
  await expectDestructiveActionsSubordinate(page);

  const bodyText = await page.locator("body").innerText();
  expect(bodyText, `${roleProfile} route ${route.path} should not show a missing visual fixture.`).not.toMatch(/No visual fixture|Unable to load/i);
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
    expect(text, "Routes without tables should still render clear cards, totals, or empty states.").toMatch(/No .*found|No .*yet|Summary|Total|Balance|Amount|Status|Details|How /i);
    return;
  }

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
      expect(table.insideScroller, "Wide tables on compact viewports should stay inside horizontal scrollers.").toBe(true);
    }
  }

  const bodyText = await page.locator("main").innerText();
  expect(tableAccessibility.some((table) => table.hasRows) || /No .*found|No .*yet|No .*rows|No .*activity/i.test(bodyText)).toBe(true);
  expect(bodyText, "Money/status columns should remain understandable.").toMatch(/SAR|0\.00|1,|Balance|Total|Debit|Credit|Amount|Status|Voided|Unmatched|Matched/i);
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

async function expectViewerMutationActionsHidden(page: Page) {
  const bodyText = await page.locator("body").innerText();
  if (bodyText.includes("Access denied")) {
    return;
  }

  const mutationLabels = [
    /^Create credit note$/i,
    /^Create debit note$/i,
    /^Record refund$/i,
    /^New collection case$/i,
    /^New reconciliation$/i,
    /^New close$/i,
    /^Create close draft$/i,
    /^Finalize$/i,
    /^Finalize credit note$/i,
    /^Finalize debit note$/i,
    /^Void$/i,
    /^Apply$/i,
    /^Match$/i,
    /^Post categorization journal$/i,
    /^Ignore row$/i,
    /^Create draft$/i,
  ];

  for (const label of mutationLabels) {
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

async function expectDestructiveActionsSubordinate(page: Page) {
  const destructiveButtons = await page.locator("main").getByRole("button", { name: /^Void$/i }).evaluateAll((buttons) =>
    buttons.map((button) => {
      const box = button.getBoundingClientRect();
      const className = button.getAttribute("class") ?? "";
      return { width: box.width, height: box.height, className };
    }),
  );

  for (const button of destructiveButtons) {
    expect(button.width, "Void action should not dominate the route chrome.").toBeLessThanOrEqual(180);
    expect(button.className, "Void action should remain secondary/destructive, not a primary fill.").not.toMatch(/bg-palm|bg-emerald|bg-teal/);
  }
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
  ];

  for (const pattern of blockedPhrases) {
    expect(text).not.toMatch(pattern);
  }
}

async function expectBankingCopyStaysManual(page: Page) {
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/bank credentials collected|payment sent through bank|bank feed connected|auto-reconciled|automatic reconciliation enabled/i);
  expect(text).not.toMatch(/real provider integration|real settlement|real bank sync/i);
}

function canUseAny(roleProfile: VisualRoleProfileName, requiredAny: readonly Permission[]): boolean {
  const permissions = visualRoleProfiles[roleProfile].permissions;
  return permissions.includes(PERMISSIONS.admin.fullAccess) || requiredAny.some((permission) => permissions.includes(permission));
}
