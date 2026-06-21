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

const artifactRoot = path.join(process.cwd(), "artifacts", "visual-qa", "detail-states-accountant-mobile-table-review");

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const compactViewports = viewports.filter((viewport) => viewport.name !== "desktop");

const detailStateRoutes = [
  { slug: "invoice-draft", path: "/sales/invoices/invoice-draft", heading: /INV-STATE-DRAFT/i, state: "sales invoice draft", expectedText: /Draft/i },
  { slug: "invoice-awaiting-payment", path: "/sales/invoices/invoice-awaiting-payment", heading: /INV-STATE-AWAIT/i, state: "sales invoice finalized awaiting payment", expectedText: /Awaiting payment|Unpaid/i },
  { slug: "invoice-partially-paid", path: "/sales/invoices/invoice-partially-paid", heading: /INV-STATE-PARTIAL/i, state: "sales invoice partially paid", expectedText: /Partially paid|Partial/i },
  { slug: "invoice-paid", path: "/sales/invoices/invoice-paid", heading: /INV-STATE-PAID/i, state: "sales invoice paid", expectedText: /Paid/i },
  { slug: "invoice-overdue", path: "/sales/invoices/invoice-overdue", heading: /INV-STATE-OVERDUE/i, state: "sales invoice overdue", expectedText: /Overdue|Due date/i },
  { slug: "invoice-voided", path: "/sales/invoices/invoice-voided", heading: /INV-STATE-VOIDED/i, state: "sales invoice voided", expectedText: /Voided/i },
  { slug: "bill-draft", path: "/purchases/bills/bill-draft", heading: /BILL-STATE-DRAFT/i, state: "purchase bill draft", expectedText: /Draft/i },
  { slug: "bill-awaiting-payment", path: "/purchases/bills/bill-awaiting-payment", heading: /BILL-STATE-AWAIT/i, state: "purchase bill finalized awaiting payment", expectedText: /Awaiting payment|Balance due/i },
  { slug: "bill-partially-paid", path: "/purchases/bills/bill-partially-paid", heading: /BILL-STATE-PARTIAL/i, state: "purchase bill partially paid", expectedText: /Partially paid|Balance due/i },
  { slug: "bill-paid", path: "/purchases/bills/bill-paid", heading: /BILL-STATE-PAID/i, state: "purchase bill paid", expectedText: /Paid/i },
  { slug: "bill-overdue", path: "/purchases/bills/bill-overdue", heading: /BILL-STATE-OVERDUE/i, state: "purchase bill overdue", expectedText: /Overdue|Due date/i },
  { slug: "bill-voided", path: "/purchases/bills/bill-voided", heading: /BILL-STATE-VOIDED/i, state: "purchase bill voided", expectedText: /Voided/i },
  { slug: "payment-allocated", path: "/sales/customer-payments/payment-allocated", heading: /PAY-VIS-001/i, state: "customer payment allocated", expectedText: /Allocated|Receipt output/i },
  { slug: "payment-partially-allocated", path: "/sales/customer-payments/payment-partially-allocated", heading: /PAY-STATE-PARTIAL/i, state: "customer payment partially allocated", expectedText: /Partially allocated|Unapplied amount/i },
  { slug: "payment-unallocated", path: "/sales/customer-payments/payment-unallocated", heading: /PAY-STATE-UNAPPLIED/i, state: "customer payment unallocated overpayment", expectedText: /Unapplied amount|Unapplied customer credit/i },
  { slug: "supplier-payment-allocated", path: "/purchases/supplier-payments/supplier-payment-allocated", heading: /SPAY-VIS-001/i, state: "supplier payment allocated", expectedText: /Allocated|Payment details/i },
  { slug: "supplier-payment-partially-allocated", path: "/purchases/supplier-payments/supplier-payment-partially-allocated", heading: /SPAY-STATE-PARTIAL/i, state: "supplier payment partially allocated", expectedText: /Partially allocated|Unapplied amount/i },
  { slug: "supplier-payment-unallocated", path: "/purchases/supplier-payments/supplier-payment-unallocated", heading: /SPAY-STATE-UNAPPLIED/i, state: "supplier payment unallocated overpayment", expectedText: /Unallocated|Unapplied amount/i },
  { slug: "credit-note-draft", path: "/sales/credit-notes/credit-note-draft", heading: /CN-STATE-DRAFT/i, state: "credit note draft", expectedText: /Draft/i },
  { slug: "credit-note-finalized", path: "/sales/credit-notes/credit-note-finalized", heading: /CN-STATE-FINAL/i, state: "credit note finalized", expectedText: /Finalized/i },
  { slug: "credit-note-applied", path: "/sales/credit-notes/credit-note-applied", heading: /CN-STATE-APPLIED/i, state: "credit note applied", expectedText: /Applied|Credit allocations/i },
  { slug: "credit-note-unapplied", path: "/sales/credit-notes/credit-note-unapplied", heading: /CN-STATE-UNAPPLIED/i, state: "credit note unapplied", expectedText: /Unapplied|Credit available/i },
  { slug: "debit-note-draft", path: "/purchases/debit-notes/debit-note-draft", heading: /DN-STATE-DRAFT/i, state: "debit note draft", expectedText: /Draft/i },
  { slug: "debit-note-finalized", path: "/purchases/debit-notes/debit-note-finalized", heading: /DN-STATE-FINAL/i, state: "debit note finalized", expectedText: /Finalized/i },
  { slug: "debit-note-applied", path: "/purchases/debit-notes/debit-note-applied", heading: /DN-STATE-APPLIED/i, state: "debit note applied", expectedText: /Applied|Debit allocations/i },
  { slug: "debit-note-unapplied", path: "/purchases/debit-notes/debit-note-unapplied", heading: /DN-STATE-UNAPPLIED/i, state: "debit note unapplied", expectedText: /Unapplied|Debit available/i },
  { slug: "customer-open", path: "/customers/customer-1", heading: /Visual Customer/i, state: "customer active with open balance", expectedText: /Customer ledger visibility|Open receivable/i },
  { slug: "customer-empty", path: "/customers/customer-empty", heading: /Visual Customer No Activity/i, state: "customer active with no transactions", expectedText: /No transactions|No customer ledger rows|0\.00/i },
  { slug: "customer-inactive", path: "/customers/customer-inactive", heading: /Archived Visual Customer/i, state: "customer inactive", expectedText: /Inactive|Archived|0\.00/i },
  { slug: "customer-long", path: "/customers/customer-long", heading: /Visual Customer International Holdings/i, state: "customer long fields", expectedText: /accounts-receivable-team-with-long-mailbox|Customer ledger/i },
  { slug: "supplier-open", path: "/suppliers/supplier-1", heading: /Visual Supplier/i, state: "supplier active with open balance", expectedText: /Supplier ledger visibility|Open payable/i },
  { slug: "supplier-empty", path: "/suppliers/supplier-empty", heading: /Visual Supplier No Activity/i, state: "supplier active with no transactions", expectedText: /No transactions|No supplier ledger rows|0\.00/i },
  { slug: "supplier-inactive", path: "/suppliers/supplier-inactive", heading: /Archived Visual Supplier/i, state: "supplier inactive", expectedText: /Inactive|Archived|0\.00/i },
  { slug: "supplier-long", path: "/suppliers/supplier-long", heading: /Visual Supplier Regional Logistics/i, state: "supplier long fields", expectedText: /accounts-payable-regional-shared-services|Supplier ledger/i },
] as const;

const tableReviewRoutes = [
  { slug: "invoice-line-items", path: "/sales/invoices/invoice-partially-paid", heading: /INV-STATE-PARTIAL/i, requiredText: /Line items|Payments|Balance due/i },
  { slug: "bill-line-items", path: "/purchases/bills/bill-partially-paid", heading: /BILL-STATE-PARTIAL/i, requiredText: /Line items|Payment allocations|Balance due/i },
  { slug: "customer-payment-allocation", path: "/sales/customer-payments/payment-partially-allocated", heading: /PAY-STATE-PARTIAL/i, requiredText: /Direct invoice allocations|Unapplied amount/i },
  { slug: "supplier-payment-allocation", path: "/purchases/supplier-payments/supplier-payment-partially-allocated", heading: /SPAY-STATE-PARTIAL/i, requiredText: /Bill allocations|Unapplied amount/i },
  { slug: "customer-transactions", path: "/customers/customer-1", heading: /Visual Customer/i, requiredText: /Customer ledger visibility|Sales invoice/i },
  { slug: "supplier-transactions", path: "/suppliers/supplier-1", heading: /Visual Supplier/i, requiredText: /Supplier ledger visibility|Purchase bill/i },
  { slug: "aged-receivables", path: "/reports/aged-receivables", heading: /Aged Receivables/i, requiredText: /31-60|Balance due|Open invoice/i },
  { slug: "aged-payables", path: "/reports/aged-payables", heading: /Aged Payables/i, requiredText: /31-60|Balance due|Open bill/i },
  { slug: "general-ledger", path: "/reports/general-ledger", heading: /General Ledger/i, requiredText: /Running balance|Customer payment received/i },
  { slug: "trial-balance", path: "/reports/trial-balance", heading: /Trial Balance/i, requiredText: /Balanced|Closing Dr|Closing Cr/i },
  { slug: "bank-transactions", path: "/bank-accounts/bank-1", heading: /Main Bank/i, requiredText: /Running balance|Statement transactions/i },
  { slug: "documents-table", path: "/documents", heading: /^Documents$/i, requiredText: /Generated PDF archive|Status|Source/i },
] as const;

const accountantRoutes = [
  { slug: "dashboard", path: "/dashboard", heading: /Dashboard/i, requiredAny: [PERMISSIONS.dashboard.view], expectedText: /Receivables|Payables/i },
  { slug: "sales-invoices", path: "/sales/invoices", heading: /Sales invoices/i, requiredAny: [PERMISSIONS.salesInvoices.view], expectedText: /INV-/i },
  { slug: "sales-invoice-new", path: "/sales/invoices/new", heading: /Create sales invoice/i, requiredAny: [PERMISSIONS.salesInvoices.create], expectedText: /Create draft invoice/i },
  { slug: "purchase-bills", path: "/purchases/bills", heading: /Purchase bills/i, requiredAny: [PERMISSIONS.purchaseBills.view], expectedText: /BILL-/i },
  { slug: "purchase-bill-new", path: "/purchases/bills/new", heading: /Create purchase bill/i, requiredAny: [PERMISSIONS.purchaseBills.create], expectedText: /Save draft/i },
  { slug: "customer-detail", path: "/customers/customer-1", heading: /Visual Customer/i, requiredAny: [PERMISSIONS.contacts.view], expectedText: /Customer ledger/i },
  { slug: "supplier-detail", path: "/suppliers/supplier-1", heading: /Visual Supplier/i, requiredAny: [PERMISSIONS.contacts.view], expectedText: /Supplier ledger/i },
  { slug: "customer-payments", path: "/sales/customer-payments", heading: /Customer payments/i, requiredAny: [PERMISSIONS.customerPayments.view], expectedText: /PAY-/i },
  { slug: "supplier-payments", path: "/purchases/supplier-payments", heading: /Supplier payments/i, requiredAny: [PERMISSIONS.supplierPayments.view], expectedText: /SPAY-/i },
  { slug: "credit-notes", path: "/sales/credit-notes", heading: /Sales credit notes/i, requiredAny: [PERMISSIONS.creditNotes.view], expectedText: /CN-/i },
  { slug: "debit-notes", path: "/purchases/debit-notes", heading: /Debit notes/i, requiredAny: [PERMISSIONS.purchaseDebitNotes.view], expectedText: /DN-/i },
  { slug: "reports", path: "/reports", heading: /^Reports$/i, requiredAny: [PERMISSIONS.reports.view], expectedText: /Trial Balance|Aged Receivables/i },
  { slug: "bank-accounts", path: "/bank-accounts", heading: /Bank accounts/i, requiredAny: [PERMISSIONS.bankAccounts.view], expectedText: /Cash and bank profiles|Main Bank/i },
  { slug: "documents", path: "/documents", heading: /^Documents$/i, requiredAny: [PERMISSIONS.generatedDocuments.view, PERMISSIONS.documents.view], expectedText: /Generated PDF archive/i },
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
        skippedUnsupportedStates: [
          "cancelled status is skipped because sales invoices, purchase bills, credit notes, and debit notes expose VOIDED rather than CANCELLED",
          "paid and overdue are checked as derived balance/date states because the app does not expose separate production status enum values for them",
        ],
        routes: report,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
});

for (const route of detailStateRoutes) {
  for (const viewport of viewports) {
    test(`${route.state} detail visual QA at ${viewport.name}`, async ({ page }) => {
      await setupVisualPage(page, viewport);
      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");
      await page.locator("main").waitFor({ state: "visible" });

      const main = page.locator("main");
      await expect(main.getByRole("heading", { name: route.heading }).first()).toBeVisible();
      await expect(main.getByText(route.expectedText).first()).toBeVisible();
      await expectAuthenticatedShell(page, viewport.name);
      await expectNoDocumentOverflow(page);
      await expectTablesReadable(page, viewport.name);
      await expectNoSevereOverlap(page);
      await expectNoForbiddenClaims(page);

      const screenshotPath = path.join(artifactRoot, `${viewport.name}-detail-${route.slug}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      report.push({ kind: "detail-state", state: route.state, route: route.path, viewport: viewport.name, screenshot: screenshotPath });
    });
  }
}

for (const route of tableReviewRoutes) {
  for (const viewport of compactViewports) {
    test(`${route.slug} accountant table review at ${viewport.name}`, async ({ page }) => {
      await setupVisualPage(page, viewport, "Accountant");
      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");
      await page.locator("main").waitFor({ state: "visible" });

      const main = page.locator("main");
      await expect(main.getByRole("heading", { name: route.heading }).first()).toBeVisible();
      await expect(main.getByText(route.requiredText).first()).toBeVisible();
      await expectAuthenticatedShell(page, viewport.name);
      await expectNoDocumentOverflow(page);
      await expectTablesReadable(page, viewport.name);
      await expectNoSevereOverlap(page);
      await expectNoForbiddenClaims(page);

      const screenshotPath = path.join(artifactRoot, `${viewport.name}-table-${route.slug}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      report.push({ kind: "accountant-table", route: route.path, viewport: viewport.name, screenshot: screenshotPath });
    });
  }
}

for (const route of accountantRoutes) {
  for (const viewport of compactViewports) {
    test(`Accountant role route QA for ${route.slug} at ${viewport.name}`, async ({ page }) => {
      await setupVisualPage(page, viewport, "Accountant");
      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");
      await page.locator("main").waitFor({ state: "visible" });

      const allowed = canUseAny("Accountant", route.requiredAny);
      const main = page.locator("main");
      await expectAuthenticatedShell(page, viewport.name);
      await expectNoDocumentOverflow(page);
      await expectNoSevereOverlap(page);
      await expectNoForbiddenClaims(page);

      if (allowed) {
        await expect(main.getByRole("heading", { name: route.heading }).first()).toBeVisible();
        await expect(main.getByText(route.expectedText).first()).toBeVisible();
        await expect(main.getByText("Access denied", { exact: true })).toHaveCount(0);
      } else {
        await expect(main.getByText("Access denied", { exact: true })).toBeVisible();
        await expect(main.getByText(/does not include the permission required/i)).toBeVisible();
      }

      await expectAccountantOwnerOnlyActionsHidden(page);
      await expectTablesReadable(page, viewport.name);

      const screenshotPath = path.join(artifactRoot, `${viewport.name}-accountant-${route.slug}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      report.push({ kind: "accountant-route", route: route.path, viewport: viewport.name, allowed, screenshot: screenshotPath });
    });
  }
}

async function setupVisualPage(
  page: Page,
  viewport: { width: number; height: number },
  roleProfile: VisualRoleProfileName = "Owner",
) {
  await installVisualApiMocks(page, { roleProfile });
  await primeVisualSession(page, { roleProfile });
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function expectAuthenticatedShell(page: Page, viewportName: string) {
  const banner = page.getByRole("banner");
  await expect(banner).toBeVisible();
  await expect(banner.getByLabel("Organization")).toBeVisible();
  await expect(banner.getByRole("button", { name: /Sign out/i })).toBeVisible();

  if (viewportName === "mobile") {
    await expect(page.getByRole("navigation", { name: "First workflow navigation" })).toBeVisible();
  } else {
    await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toBeVisible();
  }
}

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow, "Page should not create document-level horizontal overflow. Wide tables must stay inside scroll containers.").toBe(false);
}

async function expectTablesReadable(page: Page, viewportName: string) {
  const tableCount = await page.locator("main table").count();
  if (tableCount === 0) {
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

  const hasAnyRows = tableAccessibility.some((table) => table.hasRows);

  for (const table of tableAccessibility) {
    expect(table.visible, "Accountant table should be visible.").toBe(true);
    expect(table.hasHeaders, "Accountant table should preserve readable headers.").toBe(true);
    if (viewportName !== "desktop" && table.tableWidth > table.scrollerWidth + 1) {
      expect(table.insideScroller, "Wide accountant tables on compact viewports should be contained in horizontal scrollers.").toBe(true);
    }
  }

  const bodyText = await page.locator("main").innerText();
  expect(hasAnyRows || /No .*found|No .*recorded|No .*rows|No .*activity/i.test(bodyText), "Accountant table surfaces should show populated rows or a clear empty state.").toBe(true);
  expect(bodyText, "Money columns should remain understandable.").toMatch(/SAR|ر\.س|0\.00|1,|Balance|Total|Debit|Credit|Amount/i);
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

async function expectAccountantOwnerOnlyActionsHidden(page: Page) {
  const ownerOnlyLabels = [/Team Members/i, /Users and roles/i, /Organization setup/i];
  const bodyText = await page.locator("body").innerText();
  if (bodyText.includes("Access denied")) {
    return;
  }

  for (const label of ownerOnlyLabels) {
    await expect(page.getByRole("link", { name: label })).toHaveCount(0);
  }
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
