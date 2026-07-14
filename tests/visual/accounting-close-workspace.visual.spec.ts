import { expect, test, type Page } from "@playwright/test";
import {
  installVisualApiMocks,
  primeVisualSession,
  visualAccountingCloseHashes,
  visualAccountingCloseIds,
} from "./visual-fixtures";

const scenarios = [
  { name: "desktop", width: 1440, height: 1000, locale: "en", direction: "ltr" },
  { name: "mobile", width: 390, height: 844, locale: "en", direction: "ltr" },
  { name: "mobile-arabic", width: 390, height: 844, locale: "ar", direction: "rtl" },
] as const;

test.describe("accounting close workspace visual QA", () => {
  for (const scenario of scenarios) {
    test(`${scenario.name} renders the reviewed close workspace without overflow`, async ({ context, page, baseURL }, testInfo) => {
      const browserErrors: string[] = [];
      page.on("pageerror", (error) => browserErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") browserErrors.push(message.text());
      });

      const appUrl = baseURL ?? process.env.LEDGERBYTE_VISUAL_WEB_URL ?? "http://127.0.0.1:3030";
      await context.addCookies([
        { name: "ledgerbyte_locale", value: scenario.locale, url: appUrl },
        { name: "ledgerbyte_locale", value: scenario.locale, url: appUrl.replace("127.0.0.1", "localhost") },
      ]);
      await installVisualApiMocks(page, { roleProfile: "Owner" });
      await primeVisualSession(page, { roleProfile: "Owner" });
      await page.setViewportSize({ width: scenario.width, height: scenario.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      if (scenario.locale === "ar") {
        const localeResponse = await page.request.post("/api/locale", { data: { locale: "ar" } });
        expect(localeResponse.ok(), "Arabic locale preference endpoint should accept the visual test locale.").toBe(true);
      }

      await page.goto("/accounting-close");
      await page.locator("main").waitFor({ state: "visible" });
      await expect(page.locator("html")).toHaveAttribute("dir", scenario.direction);
      await expect(page.getByRole("heading", { name: "Month-end close" })).toBeVisible();
      await expect(page.getByRole("link", { name: /Open close cycle/i })).toBeVisible();
      await expectNoDocumentOverflow(page);

      await page.getByRole("link", { name: /Open close cycle/i }).click();
      await page.locator("main").waitFor({ state: "visible" });
      await expect(page.getByRole("heading", { name: "June 2026 close cycle" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Download evidence PDF" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Immutable snapshot history" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Manual close checklist" })).toBeVisible();
      await expect(page.getByText(`Current hash: ${visualAccountingCloseHashes.reviewed}`)).toBeVisible();
      await expectCompactTableScrollers(page);

      await page.getByRole("button", { name: /View snapshot evidence:/i }).first().click();
      await expect(page.getByRole("heading", { name: "Snapshot evidence" })).toBeVisible();
      await expect(page.locator("code").filter({ hasText: visualAccountingCloseHashes.reviewed })).toBeVisible();
      await page.getByRole("combobox", { name: "Baseline snapshot" }).selectOption(visualAccountingCloseIds.baselineSnapshot);
      await page.getByRole("combobox", { name: "Comparison snapshot" }).selectOption(visualAccountingCloseIds.reviewedSnapshot);
      await page.getByRole("button", { name: "Compare snapshots" }).click();
      await expect(page.getByText("1 changed checks")).toBeVisible();
      await expect(page.getByText("MODIFIED", { exact: true })).toBeVisible();
      await expectNoDocumentOverflow(page);
      expect(browserErrors, "Close workspace should not emit console or page errors.").toEqual([]);

      await page.screenshot({ path: testInfo.outputPath(`${scenario.name}-accounting-close-workspace.png`), fullPage: true });
    });
  }
});

async function expectNoDocumentOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasOverflow, "Close workspace should not create document-level horizontal overflow.").toBe(false);
}

async function expectCompactTableScrollers(page: Page) {
  const tableCount = await page.locator("table").count();
  expect(tableCount, "Reviewed close workspace should show dense table evidence.").toBeGreaterThanOrEqual(2);
  const allTablesAreContained = await page.locator("table").evaluateAll((tables) => tables.every((table) => table.parentElement?.parentElement?.classList.contains("overflow-x-auto")));
  expect(allTablesAreContained, "Dense close tables should scroll inside their panel shells.").toBe(true);
}
