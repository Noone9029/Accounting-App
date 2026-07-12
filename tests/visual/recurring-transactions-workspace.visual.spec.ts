import { expect, test, type Page, type Route } from "@playwright/test";
import { installVisualApiMocks, primeVisualSession, visualApiUrl } from "./visual-fixtures";

const scenarios = [
  { name: "desktop", width: 1366, height: 900, locale: "en", direction: "ltr" },
  { name: "mobile", width: 390, height: 844, locale: "en", direction: "ltr" },
  { name: "rtl", width: 820, height: 960, locale: "ar", direction: "rtl" },
] as const;

for (const scenario of scenarios) {
  test(`recurring accountant workspace at ${scenario.name}`, async ({ context, page, baseURL }, testInfo) => {
    const consoleFailures: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") consoleFailures.push(`${message.type()}: ${message.text()}`);
    });
    page.on("pageerror", (error) => consoleFailures.push(`pageerror: ${error.message}`));

    if (scenario.locale === "ar") {
      const cookieUrl = baseURL ?? "http://127.0.0.1:3030";
      await context.addCookies([
        { name: "ledgerbyte_locale", value: "ar", url: cookieUrl },
        { name: "ledgerbyte_locale", value: "ar", url: cookieUrl.replace("127.0.0.1", "localhost") },
      ]);
    }

    await installVisualApiMocks(page);
    await page.route(`${visualApiUrl}/recurring-transactions**`, fulfillRecurringRoute);
    await primeVisualSession(page);
    if (scenario.locale === "ar") {
      const localeResponse = await page.request.post("/api/locale", { data: { locale: "ar" } });
      expect(localeResponse.ok()).toBe(true);
    }
    await page.setViewportSize({ width: scenario.width, height: scenario.height });

    await page.goto("/recurring-transactions");
    await expect(page.locator("html")).toHaveAttribute("dir", scenario.direction);
    await expect(page.getByRole("heading", { name: "Recurring transactions" })).toBeVisible();
    await expect(page.getByText("Monthly software review")).toBeVisible();
    await expect(page.getByText("1 blocked")).toBeVisible();
    await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
    expect(await hasDocumentOverflow(page)).toBe(false);

    await page.locator('a[href="/recurring-transactions/template-visual"]').click();
    await expect(page.getByRole("heading", { name: "Monthly software review" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Review and post expense" })).toBeVisible();
    const blockedRun = page.getByRole("row").filter({ hasText: "FISCAL_PERIOD_BLOCKED" });
    await expect(blockedRun).toContainText("100.0000");
    await expect(blockedRun).toContainText("10.0000");
    await expect(blockedRun).toContainText("90.0000");
    await expect(blockedRun).toContainText("4.5000");
    await expect(blockedRun).toContainText("3.75000000");
    await expect(blockedRun).toContainText("2026-05-21");
    await expect(blockedRun).toContainText("MANUAL");
    await expect(blockedRun).toContainText("rate-snapshot-visual");
    await expect(page.getByText("Immutable proposal lines (1)")).toBeVisible();
    expect(await hasDocumentOverflow(page)).toBe(false);
    expect(consoleFailures).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`recurring-transactions-${scenario.name}.png`), fullPage: true });
  });
}

async function fulfillRecurringRoute(route: Route) {
  const request = route.request();
  const url = new URL(request.url());
  if (request.method() !== "GET") return json(route, { message: "Recurring visual fixtures are read-only." }, 405);
  if (url.pathname === "/recurring-transactions/readiness") return json(route, readiness());
  if (url.pathname === "/recurring-transactions/template-visual/runs") return json(route, { items: [run()], page: 1, limit: 25, total: 1, totalPages: 1 });
  if (url.pathname === "/recurring-transactions/template-visual") return json(route, template());
  if (url.pathname === "/recurring-transactions") return json(route, { items: [template()], page: 1, limit: 25, total: 1, totalPages: 1 });
  return json(route, { message: `No recurring visual fixture for ${url.pathname}` }, 404);
}

function readiness() {
  return { status: "NEEDS_ATTENTION", templateCount: 1, activeTemplates: 1, dueTemplates: 1, failedRuns: 0, blockedRuns: 1, generatedDraftsAwaitingReview: 2, schedulesMissingReferences: 0, foreignTemplatesMissingRateEvidence: 0, runsScheduledInsideLockedPeriods: 0, blocksFiscalClose: false, asOf: "2026-05-21T12:00:00.000Z" };
}

function template() {
  return {
    id: "template-visual", templateCode: "REC-VIS-001", transactionType: "EXPENSE", name: "Monthly software review", description: "Review before posting", status: "ACTIVE",
    timezone: "Asia/Riyadh", frequency: "MONTHLY", interval: 1, dayOfMonth: 31, dayOfWeek: null, monthOfYear: null, startDate: "2026-01-31T00:00:00.000Z", endDate: null,
    nextRunAt: "2026-05-30T21:00:00.000Z", lastRunAt: "2026-04-30T10:00:00.000Z", catchUpPolicy: "SKIP_MISSED", templateVersion: 2,
    currencyCode: "USD", exchangeRatePolicy: "FIXED_TEMPLATE_RATE", fixedExchangeRate: "3.75000000", rateSnapshotId: null, partyId: "supplier-1", branchId: null,
    paidThroughAccountId: "bank-account-asset-1", paymentTermsDays: 0, reference: "SOFTWARE", notes: "Review first", terms: null, taxMode: null, inventoryPostingMode: null, total: "94.5000",
    party: { id: "supplier-1", name: "Visual Supplier", displayName: "Visual Supplier" }, branch: null,
    lines: [{ id: "template-line-1", itemId: null, accountId: "expense-account-1", taxRateId: "tax-1", costCenterId: "cost-1", projectId: "project-1", description: "Software subscription", quantity: "1.0000", unitPrice: "100.0000", discountRate: "10.0000", debit: "0.0000", credit: "0.0000", sortOrder: 0, account: { id: "expense-account-1", code: "6100", name: "Software expense" }, costCenter: { id: "cost-1", code: "OPS", name: "Operations" }, project: { id: "project-1", code: "CLOSE", name: "Close automation" } }],
    runs: [run()],
  };
}

function run() {
  return {
    id: "run-visual", templateId: "template-visual", templateVersion: 2, scheduledFor: "2026-04-29T21:00:00.000Z", scheduledLocalDate: "2026-04-30T00:00:00.000Z", trigger: "SCHEDULED", status: "BLOCKED", attemptCount: 1,
    failureCode: "FISCAL_PERIOD_BLOCKED", failureMessageSafe: "The posting date is in a locked fiscal period.",
    generatedExpenseProposal: {
      id: "proposal-visual", status: "DRAFT", proposedDate: "2026-04-30T00:00:00.000Z", currency: "USD", baseCurrency: "SAR", exchangeRate: "3.75000000", rateDate: "2026-05-21T00:00:00.000Z", rateSource: "MANUAL", rateSnapshotId: "rate-snapshot-visual",
      subtotal: "100.0000", discountTotal: "10.0000", taxableTotal: "90.0000", taxTotal: "4.5000", total: "94.5000", paidThroughAccount: { id: "bank-account-asset-1", code: "1010", name: "Main Bank" }, reviewedCashExpense: null,
      lines: [{ id: "proposal-line-visual", description: "Software subscription", quantity: "1.0000", unitPrice: "100.0000", discountRate: "10.0000", lineGrossAmount: "100.0000", discountAmount: "10.0000", taxableAmount: "90.0000", taxAmount: "4.5000", lineTotal: "94.5000", sortOrder: 0, account: { id: "expense-account-1", code: "6100", name: "Software expense" }, costCenter: { id: "cost-1", code: "OPS", name: "Operations" }, project: { id: "project-1", code: "CLOSE", name: "Close automation" } }],
    },
  };
}

function hasDocumentOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}
