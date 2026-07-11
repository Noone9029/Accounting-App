import { expect, test, type Page, type Route } from "@playwright/test";
import { installVisualApiMocks, primeVisualSession, visualApiUrl } from "./visual-fixtures";

const scenarios = [
  { name: "desktop", width: 1366, height: 900, locale: "en", direction: "ltr" },
  { name: "mobile", width: 390, height: 844, locale: "en", direction: "ltr" },
  { name: "rtl", width: 820, height: 960, locale: "ar", direction: "rtl" },
] as const;

for (const scenario of scenarios) {
  test(`FX reporting and close visibility at ${scenario.name}`, async ({ context, page, baseURL }, testInfo) => {
    const consoleFailures: string[] = [];
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
    await installFxReportingFixtures(page);
    await primeVisualSession(page);
    if (scenario.locale === "ar") {
      const localeResponse = await page.request.post("/api/locale", { data: { locale: "ar" } });
      expect(localeResponse.ok(), "Arabic locale preference should be accepted.").toBe(true);
    }
    await page.setViewportSize({ width: scenario.width, height: scenario.height });

    await page.goto("/reports/fx-activity");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("html")).toHaveAttribute("dir", scenario.direction);
    await expect(page.getByRole("heading", { name: "FX activity and exposure" })).toBeVisible();
    await expect(page.getByText("INV-VIS-FX-SETTLED")).toBeVisible();
    await expect(page.getByRole("button", { name: "Next page" })).toBeVisible();
    await expect(page.getByText(/No rates are fetched and nothing is posted/i)).toBeVisible();
    await expectNoDocumentOverflow(page, "FX activity workspace");
    await page.screenshot({ path: testInfo.outputPath(`fx-activity-${scenario.name}.png`), fullPage: true });

    await page.goto("/fx-close");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("html")).toHaveAttribute("dir", scenario.direction);
    await expect(page.getByRole("heading", { name: "FX close readiness" })).toBeVisible();
    await expect(page.getByText("MISSING_CLOSING_RATE")).toBeVisible();
    await expect(page.getByText(/view-only; corrections happen in their source workflows/i)).toBeVisible();
    await expectNoDocumentOverflow(page, "FX close workspace");
    await page.screenshot({ path: testInfo.outputPath(`fx-close-${scenario.name}.png`), fullPage: true });

    expect(consoleFailures, "FX reporting and close workspaces should have a clean browser console.").toEqual([]);
  });
}

async function installFxReportingFixtures(page: Page) {
  await page.route(`${visualApiUrl}/reports/fx/**`, (route) => fulfillFxReport(route));
  await page.route(`${visualApiUrl}/fx/close-readiness**`, (route) => json(route, closeReadiness()));
}

function fulfillFxReport(route: Route) {
  const url = new URL(route.request().url());
  if (url.pathname === "/reports/fx/realized-activity") return json(route, realizedActivity());
  return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "Missing FX reporting visual fixture." }) });
}

function realizedActivity() {
  return {
    accountingContext: { baseCurrency: "AED", amountBasis: "BASE_CURRENCY" },
    from: "2026-07-01",
    to: "2026-07-31",
    filters: {},
    notes: ["Realized FX activity is read-only evidence."],
    rows: [{
      id: "allocation-visual",
      allocationId: "allocation-visual",
      eventType: "ORIGINAL",
      date: "2026-07-09",
      allocationType: "CUSTOMER_PAYMENT",
      paymentNumber: "PAY-VIS-FX-001",
      documentNumber: "INV-VIS-FX-SETTLED",
      currency: "USD",
      transactionAmount: "100.0000",
      grossGain: "7.5000",
      grossLoss: "0.0000",
      netGain: "7.5000",
      netLoss: "0.0000",
      reversed: false,
      missingJournal: false,
    }],
    totals: {
      grossGain: "7.5000",
      grossLoss: "0.0000",
      reversedGain: "0.0000",
      reversedLoss: "0.0000",
      netGain: "7.5000",
      netLoss: "0.0000",
      missingJournalCount: 0,
      rowCount: 1,
    },
    totalsScope: "PAGE",
    pagination: { page: 1, limit: 100, hasMore: true },
  };
}

function closeReadiness() {
  return {
    status: "BLOCKED",
    asOf: "2026-07-31",
    blockers: [{
      code: "MISSING_CLOSING_RATE",
      count: 1,
      message: "Add an exact closing-date rate for USD/AED.",
      actionHref: "/settings/currencies-fx",
    }],
    counts: {
      foreignDocuments: 3,
      openForeignDocuments: 1,
      foreignCurrencies: 1,
      missingClosingRates: 1,
      draftManualRateDocuments: 0,
      unpostedRevaluationRuns: 0,
      missingRealizedFxJournals: 0,
      historicalSourceChangesAfterClose: 0,
    },
    actions: [{ code: "MISSING_CLOSING_RATE", label: "Review rates", href: "/settings/currencies-fx" }],
  };
}

function json(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

async function expectNoDocumentOverflow(page: Page, label: string) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasOverflow, `${label} should contain wide tables and controls within the document.`).toBe(false);
}
