import { expect, test, type Page, type Route } from "@playwright/test";
import { fixedVisualDate, installVisualApiMocks, primeVisualSession, visualApiUrl } from "./visual-fixtures";

const viewports = [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`FX revaluation workspace at ${viewport.name}`, async ({ page }, testInfo) => {
    const consoleFailures: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") consoleFailures.push(`${message.type()}: ${message.text()}`);
    });
    page.on("pageerror", (error) => consoleFailures.push(`pageerror: ${error.message}`));

    await installVisualApiMocks(page);
    await installFxFixtures(page);
    await primeVisualSession(page);
    await page.setViewportSize(viewport);
    await page.goto("/fx-revaluations");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "FX revaluation" })).toBeVisible();
    await expect(page.getByText("INV-VIS-FX-001")).toBeVisible();
    await expect(page.getByText(/Manual captured rates only.*Nothing posts silently/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Review run" })).toBeEnabled();
    await expect(page.getByLabel("Revaluation date")).toBeVisible();
    await expect(page.getByLabel(/USD\/SAR.*3\.75000000/i)).toBeVisible();

    const hasDocumentOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(hasDocumentOverflow, "Wide accounting tables must scroll inside their panel, not overflow the document.").toBe(false);
    expect(consoleFailures, "FX revaluation workspace should have a clean browser console.").toEqual([]);

    await page.screenshot({ path: testInfo.outputPath(`fx-revaluation-${viewport.name}.png`), fullPage: true });
  });
}

async function installFxFixtures(page: Page) {
  await page.route(`${visualApiUrl}/fx/**`, (route) => fulfillFxRoute(route));
}

function fulfillFxRoute(route: Route) {
  const url = new URL(route.request().url());
  const date = fixedVisualDate.slice(0, 10);
  if (url.pathname === "/fx/revaluations/context") return json(route, { catalog: currencyCatalog(), readiness: readiness() });
  if (url.pathname === "/fx/rates") return json(route, { data: [rateRow(date)], pagination: { page: 1, limit: 100, hasMore: false } });
  if (url.pathname === "/fx/revaluations/run-visual") return json(route, runDetail(date));
  if (url.pathname === "/fx/revaluations") return json(route, { data: [{ ...runDetail(date), lines: [], _count: { lines: 1 } }], pagination: { page: 1, limit: 25, hasMore: false } });
  return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "Missing FX visual fixture." }) });
}

function json(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

function currencyCatalog() {
  return {
    baseCurrency: "SAR",
    supportedCurrencies: [{ code: "SAR", name: "Saudi Riyal" }, { code: "USD", name: "US Dollar" }],
    manualRateEntryEnabled: true,
    liveRateProviderEnabled: false,
    providerState: "DISABLED",
  };
}

function readiness() {
  return {
    status: "READY",
    baseCurrency: "SAR",
    supportedCurrencyCodes: ["SAR", "USD"],
    manualRateEntryEnabled: true,
    liveRateProviderEnabled: false,
    providerState: "DISABLED",
    accountConfigurationComplete: true,
    controlAccountsComplete: true,
    foreignDocumentPostingEnabled: true,
    fxRevaluationEnabled: true,
    blockers: [],
  };
}

function rateRow(date: string) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId: "org-visual",
    transactionCurrency: "USD",
    baseCurrency: "SAR",
    rate: "3.75000000",
    rateDate: `${date}T00:00:00.000Z`,
    source: "MANUAL",
    sourceReference: "Visual close worksheet",
    createdByUserId: "user-1",
    createdAt: `${date}T08:00:00.000Z`,
  };
}

function runDetail(date: string) {
  return {
    id: "run-visual",
    organizationId: "org-visual",
    revaluationDate: `${date}T00:00:00.000Z`,
    rateDate: `${date}T00:00:00.000Z`,
    status: "DRAFT",
    idempotencyKey: "visual-preview",
    reviewIdempotencyKey: null,
    postIdempotencyKey: null,
    reversalIdempotencyKey: null,
    reviewedAt: null,
    postedAt: null,
    reversedAt: null,
    postedJournalEntry: null,
    reversalJournalEntry: null,
    lines: [{
      id: "line-visual",
      sourceType: "CUSTOMER_RECEIVABLE",
      salesInvoiceId: "invoice-visual",
      purchaseBillId: null,
      counterpartyId: "contact-visual",
      currencyCode: "USD",
      baseCurrencyCode: "SAR",
      openTransactionAmount: "100.0000",
      sourceBaseOpenAmount: "367.2500",
      carryingBaseAmount: "367.2500",
      closingRate: "3.75000000",
      revaluedBaseAmount: "375.0000",
      unrealizedGainAmount: "7.7500",
      unrealizedLossAmount: "0.0000",
      rateSnapshotId: "11111111-1111-4111-8111-111111111111",
      salesInvoice: { id: "invoice-visual", invoiceNumber: "INV-VIS-FX-001" },
      purchaseBill: null,
      counterparty: { id: "contact-visual", name: "Visual Trading LLC", displayName: null },
      rateSnapshot: { id: "11111111-1111-4111-8111-111111111111", rate: "3.75000000", rateDate: `${date}T00:00:00.000Z`, source: "MANUAL", sourceReference: "Visual close worksheet" },
    }],
  };
}
