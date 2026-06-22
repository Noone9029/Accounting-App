import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { installVisualApiMocks, primeVisualSession } from "./visual-fixtures";

const artifactRoot = path.join(process.cwd(), "artifacts", "visual-qa", "authenticated-route-hardening");

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const routes = [
  { slug: "dashboard", path: "/dashboard", heading: /Dashboard/i, actionText: /Create invoice|Record customer payment|Create purchase bill/i, dashboard: true },
  { slug: "sales-invoices", path: "/sales/invoices", heading: /Sales invoices/i, actionText: /Create invoice/i },
  { slug: "sales-invoice-new", path: "/sales/invoices/new", heading: /Create sales invoice/i, actionText: /Create draft invoice/i },
  { slug: "purchase-bills", path: "/purchases/bills", heading: /Purchase bills/i, actionText: /Create bill/i },
  { slug: "purchase-bill-new", path: "/purchases/bills/new", heading: /Create purchase bill/i, actionText: /Save draft/i },
  { slug: "customer-detail", path: "/customers/customer-1", heading: /Visual Customer/i, actionText: /Customer ledger visibility/i },
  { slug: "supplier-detail", path: "/suppliers/supplier-1", heading: /Visual Supplier/i, actionText: /Supplier ledger visibility/i },
  { slug: "customer-payments", path: "/sales/customer-payments", heading: /Customer payments/i, actionText: /Record payment/i },
  { slug: "customer-payment-new", path: "/sales/customer-payments/new?customerId=customer-1", heading: /Record customer payment/i, actionText: /Payment details/i },
  { slug: "customer-payment-detail", path: "/sales/customer-payments/payment-1", heading: /PAY-VIS-001/i, actionText: /Receipt output/i },
  { slug: "supplier-payments", path: "/purchases/supplier-payments", heading: /Supplier payments/i, actionText: /Record payment/i },
  { slug: "supplier-payment-new", path: "/purchases/supplier-payments/new?supplierId=supplier-1", heading: /Record supplier payment/i, actionText: /Payment details/i },
  { slug: "supplier-payment-detail", path: "/purchases/supplier-payments/supplier-payment-1", heading: /SPAY-VIS-001/i, actionText: /Payment details|Bill allocation/i },
  { slug: "sales-credit-notes", path: "/sales/credit-notes", heading: /Sales credit notes/i, actionText: /Create credit note/i },
  { slug: "purchase-debit-notes", path: "/purchases/debit-notes", heading: /Debit notes/i, actionText: /Create debit note/i },
  { slug: "documents", path: "/documents", heading: /^Documents$/i, actionText: /Generated PDF archive/i },
  { slug: "reports", path: "/reports", heading: /^Reports$/i, actionText: /First report path/i },
  { slug: "settings-compliance", path: "/settings/compliance", heading: /Compliance readiness/i, actionText: /VAT and accounting review|Generic compliance surfaces/i },
  { slug: "settings-storage", path: "/settings/storage", heading: /Storage/i, actionText: /readiness and dry-run planning only/i },
  { slug: "bank-accounts", path: "/bank-accounts", heading: /Bank accounts/i, actionText: /Cash and bank profiles/i },
] as const;

const report: Array<{
  route: string;
  viewport: string;
  screenshot: string;
  shellVisible: boolean;
  reducedMotionFallback?: string | null;
}> = [];

test.beforeAll(async () => {
  await fs.mkdir(artifactRoot, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await installVisualApiMocks(page);
  await primeVisualSession(page);
});

test.afterAll(async () => {
  await fs.writeFile(
    path.join(artifactRoot, "visual-results.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), routes: report }, null, 2)}\n`,
    "utf8",
  );
});

for (const route of routes) {
  for (const viewport of viewports) {
    test(`${route.slug} authenticated visual QA at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");
      await page.locator("main").waitFor({ state: "visible" });

      const main = page.locator("main");
      await expect(main.getByRole("heading", { name: route.heading }).first()).toBeVisible();
      await expect(main.getByText(route.actionText).first()).toBeVisible();
      await expectAuthenticatedShell(page, viewport.name);
      await expectNoDocumentOverflow(page);
      await expectNoSevereOverlap(page);
      await expectNoForbiddenClaims(page);

      if (route.dashboard) {
        await expectDashboardSpecifics(page);
      }

      const screenshotPath = path.join(artifactRoot, `${viewport.name}-${route.slug}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      report.push({
        route: route.path,
        viewport: viewport.name,
        screenshot: screenshotPath,
        shellVisible: true,
        reducedMotionFallback: route.dashboard ? await page.getByTestId("financial-flow-scene").getAttribute("data-fallback") : null,
      });
    });
  }
}

async function expectAuthenticatedShell(page: Page, viewportName: string) {
  const banner = page.getByRole("banner");
  await expect(banner).toBeVisible();
  await expect(banner.getByText("Accounting workspace", { exact: true }).first()).toBeVisible();
  await expect(banner.getByLabel("Organization")).toBeVisible();
  await expect(banner.getByRole("button", { name: /Sign out/i })).toBeVisible();
  if (viewportName === "desktop") {
    await expect(page.getByRole("navigation").filter({ hasText: /Dashboard/i }).first()).toBeVisible();
  } else {
    await expect(page.getByRole("navigation").filter({ hasText: /Setup/i }).first()).toBeVisible();
  }
}

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow, "Authenticated route should not create document-level horizontal overflow.").toBe(false);
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

async function expectDashboardSpecifics(page: Page) {
  const main = page.locator("main");
  await expect(main.getByText("Receivables", { exact: true })).toBeVisible();
  await expect(main.getByText("Payables", { exact: true })).toBeVisible();
  await expect(main.getByText(/Generic compliance surfaces stay limited to VAT and accounting review/i).first()).toBeVisible();
  await expect(page.getByTestId("financial-flow-scene")).toBeVisible();
  await expect(page.getByTestId("financial-flow-scene")).toHaveAttribute("data-fallback", "true");
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
