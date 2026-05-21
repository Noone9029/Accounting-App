import { expect, test, type Page } from "@playwright/test";
import { installVisualApiMocks, primeVisualSession } from "./visual-fixtures";

const widths = [
  { name: "desktop", width: 1366, height: 900 },
  { name: "tablet", width: 820, height: 960 },
  { name: "mobile", width: 390, height: 900 },
] as const;

const criticalRoutes: VisualRoute[] = [
  { slug: "setup", path: "/setup", heading: /Guided setup/i, guidance: /Complete business profile/i },
  { slug: "dashboard", path: "/dashboard", heading: /Dashboard/i, guidance: /Business overview/i },
  { slug: "reports", path: "/reports", heading: /^Reports$/i, guidance: /First report path/i },
  { slug: "customer-statement", path: "/contacts/customer-1", heading: /Visual Customer/i, guidance: /Customer statement/i, action: openCustomerStatement },
  { slug: "invoice-detail", path: "/sales/invoices/invoice-1", heading: /INV-VIS-001/i, guidance: /Record payment/i },
  { slug: "supplier-statement", path: "/contacts/supplier-1", heading: /Visual Supplier/i, guidance: /Supplier statement/i, action: openSupplierStatement },
  { slug: "supplier-bill-detail", path: "/purchases/bills/bill-1", heading: /BILL-VIS-001/i, guidance: /Record supplier payment/i },
  { slug: "bank-account-detail", path: "/bank-accounts/bank-1", heading: /Main Bank/i, guidance: /How to read this bank account/i },
  { slug: "inventory-stock-valuation", path: "/inventory/reports/stock-valuation", heading: /Stock valuation/i, guidance: /How to read valuation/i },
  { slug: "documents-archive", path: "/documents", heading: /^Documents$/i, guidance: /Generated PDF archive/i },
];

const assertionOnlyRoutes: VisualRoute[] = [
  { slug: "customer-contact", path: "/contacts/customer-1", heading: /Visual Customer/i, guidance: /Review the contact profile/i },
  { slug: "customer-payment-success", path: "/sales/customer-payments/payment-1?recorded=1", heading: /PAY-VIS-001/i, guidance: /Payment recorded/i },
  { slug: "aged-receivables", path: "/reports/aged-receivables", heading: /Aged Receivables/i, guidance: /How to read this report/i },
  { slug: "supplier-payment-success", path: "/purchases/supplier-payments/supplier-payment-1?recorded=1", heading: /SPAY-VIS-001/i, guidance: /Supplier payment recorded/i },
  { slug: "purchase-debit-note", path: "/purchases/debit-notes/debit-note-1", heading: /DN-VIS-001/i, guidance: /Debit note/i },
  { slug: "aged-payables", path: "/reports/aged-payables", heading: /Aged Payables/i, guidance: /How to read this report/i },
  { slug: "bank-accounts", path: "/bank-accounts", heading: /Bank accounts/i, guidance: /Cash and bank profiles/i },
  { slug: "bank-transfer-detail", path: "/bank-transfers/transfer-1?created=1", heading: /BTR-VIS-001/i, guidance: /Transfer posted/i },
  { slug: "statement-imports", path: "/bank-accounts/bank-1/statement-imports", heading: /Statement imports/i, guidance: /manual statement/i },
  { slug: "bank-reconciliation", path: "/bank-accounts/bank-1/reconciliation", heading: /Reconciliation/i, guidance: /matched/i },
  { slug: "items", path: "/items", heading: /Items/i, guidance: /Inventory/i },
  { slug: "warehouse-detail", path: "/inventory/warehouses/warehouse-1", heading: /Main Warehouse/i, guidance: /Stock movements/i },
  { slug: "purchase-receipt", path: "/inventory/purchase-receipts/receipt-1", heading: /REC-VIS-001/i, guidance: /What happened/i },
  { slug: "inventory-adjustment", path: "/inventory/adjustments/adjustment-1", heading: /ADJ-VIS-001/i, guidance: /adjustment/i },
  { slug: "warehouse-transfer", path: "/inventory/transfers/transfer-1", heading: /WTR-VIS-001/i, guidance: /What happened/i },
  { slug: "document-settings", path: "/settings/documents", heading: /Document settings/i, guidance: /what these settings affect/i },
  { slug: "number-sequences", path: "/settings/number-sequences", heading: /Number sequences/i, guidance: /Example next number/i },
];

test.beforeEach(async ({ page }) => {
  await installVisualApiMocks(page);
  await primeVisualSession(page);
});

for (const route of criticalRoutes) {
  for (const viewport of widths) {
    test(`${route.slug} visual baseline at ${viewport.name}`, async ({ page }) => {
      await openVisualRoute(page, route, viewport);
      await expect(page.locator("main")).toHaveScreenshot(`${route.slug}-${viewport.name}.png`);
    });
  }
}

test("polished route group assertions at desktop", async ({ page }) => {
  for (const route of assertionOnlyRoutes) {
    await openVisualRoute(page, route, widths[0]);
  }
});

async function openVisualRoute(page: Page, route: VisualRoute, viewport: (typeof widths)[number]) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(route.path);
  await page.waitForLoadState("domcontentloaded");
  await page.locator("main").waitFor({ state: "visible" });
  await route.action?.(page);
  await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
  await expect(page.getByText(route.guidance).first()).toBeVisible();
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
  await expectNoDocumentOverflow(page);
  await expectNoUnsafeClaims(page);
}

async function openCustomerStatement(page: Page) {
  await page.getByRole("button", { name: "Customer statement" }).click();
  await page.getByRole("button", { name: "Load customer statement", exact: true }).click();
  await expect(page.getByText("Closing customer balance")).toBeVisible();
}

async function openSupplierStatement(page: Page) {
  await page.getByRole("button", { name: "Supplier statement" }).click();
  await page.getByRole("button", { name: "Load supplier statement", exact: true }).click();
  await expect(page.getByText("Closing payable")).toBeVisible();
}

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow, "Page should not create document-level horizontal overflow.").toBe(false);
}

async function expectNoUnsafeClaims(page: Page) {
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/production submission is connected/i);
  expect(text).not.toMatch(/production compliance is enabled/i);
  expect(text).not.toMatch(/PDF\/A-3 (is|generation is|output is) (enabled|implemented)/i);
  expect(text).not.toMatch(/live bank (sync|feed|integration) is (enabled|connected|active)/i);
}

interface VisualRoute {
  slug: string;
  path: string;
  heading: RegExp;
  guidance: RegExp;
  action?: (page: Page) => Promise<void>;
}
