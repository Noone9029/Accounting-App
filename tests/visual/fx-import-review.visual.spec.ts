import { expect, test, type Page, type Route } from "@playwright/test";
import { installVisualApiMocks, primeVisualSession, visualApiUrl } from "./visual-fixtures";

const scenarios = [
  { name: "desktop", width: 1366, height: 900, locale: "en", direction: "ltr" },
  { name: "mobile", width: 390, height: 844, locale: "en", direction: "ltr" },
  { name: "rtl", width: 820, height: 960, locale: "ar", direction: "rtl" },
] as const;

for (const scenario of scenarios) {
  test(`FX import review at ${scenario.name}`, async ({ context, page, baseURL }, testInfo) => {
    const consoleFailures: string[] = [];
    let commitRequests = 0;
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") consoleFailures.push(`${message.type()}: ${message.text()}`);
    });
    page.on("pageerror", (error) => consoleFailures.push(`pageerror: ${error.message}`));

    if (scenario.locale === "ar") {
      const cookieUrl = baseURL ?? process.env.LEDGERBYTE_VISUAL_WEB_URL ?? "http://127.0.0.1:3030";
      await context.addCookies([
        { name: "ledgerbyte_locale", value: "ar", url: cookieUrl },
        { name: "ledgerbyte_locale", value: "ar", url: cookieUrl.replace("127.0.0.1", "localhost") },
      ]);
    }

    await installVisualApiMocks(page);
    await installImportFixtures(page, () => { commitRequests += 1; });
    await primeVisualSession(page);
    if (scenario.locale === "ar") {
      const localeResponse = await page.request.post("/api/locale", { data: { locale: "ar" } });
      expect(localeResponse.ok(), "Arabic locale preference should be accepted.").toBe(true);
    }
    await page.setViewportSize({ width: scenario.width, height: scenario.height });

    await page.goto("/settings/import-export");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("html")).toHaveAttribute("dir", scenario.direction);
    await expect(page.getByRole("heading", { name: "Import and export" })).toBeVisible();
    const table = page.getByRole("table", { name: "Normalized product and service import rows" });
    await expect(table).toBeVisible();
    await expect(table.getByText("100.0000 USD")).toBeVisible();
    await expect(table.getByText("3.67250000")).toBeVisible();
    await expect(table.getByText("Snapshot rate-usd-visual")).toBeVisible();
    await expect(table.getByText("367.2500 AED")).toBeVisible();

    const commitButton = page.getByRole("button", { name: "Commit reviewed local import" });
    await expect(commitButton).toBeDisabled();
    await page.getByLabel(/I reviewed the preview rows, transaction prices, FX evidence/i).check();
    await expect(commitButton).toBeEnabled();
    expect(commitRequests, "Reviewing a preview must not post or commit it implicitly.").toBe(0);

    const hasDocumentOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(hasDocumentOverflow, "The wide FX review table must scroll inside its panel.").toBe(false);
    expect(consoleFailures, "FX import review should have a clean browser console.").toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`fx-import-review-${scenario.name}.png`), fullPage: true });
  });
}

async function installImportFixtures(page: Page, onCommit: () => void) {
  await page.route(`${visualApiUrl}/migration-toolkit/**`, (route) => fulfillImportRoute(route, onCommit));
}

function fulfillImportRoute(route: Route, onCommit: () => void) {
  const request = route.request();
  const url = new URL(request.url());
  if (request.method() === "GET" && url.pathname === "/migration-toolkit/templates") return json(route, templates());
  if (request.method() === "GET" && url.pathname === "/migration-toolkit/import-jobs") return json(route, [productImportJob()]);
  if (request.method() === "POST" && url.pathname.endsWith("/commit")) {
    onCommit();
    return json(route, productImportJob());
  }
  return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "Missing import visual fixture." }) });
}

function templates() {
  return {
    supportedImports: [{
      entityType: "PRODUCTS_SERVICES",
      label: "Products and services",
      headers: ["sku", "name", "sellingPrice", "currency", "exchangeRate", "rateDate", "rateSource", "rateSnapshotId"],
      requiredHeaders: ["sku", "name"],
      notes: ["Foreign catalog prices require explicit reviewed FX evidence."],
    }],
    unsupportedImports: ["Posted journals", "Invoices", "Bills"],
    limitations: ["No external provider upload."],
  };
}

function productImportJob() {
  return {
    id: "job-products-visual",
    entityType: "PRODUCTS_SERVICES",
    status: "READY_FOR_REVIEW",
    filename: "products-fx-preview.csv",
    previewOnly: true,
    summaryJson: { rowCount: 1, errorCount: 0 },
    requestId: "req-products-visual",
    createdAt: "2026-07-11T00:00:00.000Z",
    committedAt: null,
    rows: [{
      id: "row-products-visual",
      rowNumber: 2,
      status: "VALID",
      duplicate: false,
      rawJson: {},
      normalizedJson: {
        sku: "FX-CLOUD",
        name: "Cloud hosting",
        sellingPrice: "367.2500",
        transactionSellingPrice: "100.0000",
        baseSellingPrice: "367.2500",
        currency: "USD",
        baseCurrency: "AED",
        exchangeRate: "3.67250000",
        rateDate: "2026-07-10",
        rateSource: "MANUAL",
        rateSnapshotId: "rate-usd-visual",
      },
      createdRecordId: null,
    }],
    validationIssues: [],
  };
}

function json(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}
