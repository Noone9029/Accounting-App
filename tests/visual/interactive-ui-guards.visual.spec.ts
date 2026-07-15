import { expect, test } from "@playwright/test";
import { installVisualApiMocks, primeVisualSession } from "./visual-fixtures";

test.describe("mobile navigation interaction guard", () => {
  test("opens the mobile drawer, exposes dialog semantics, and restores focus on Escape", async ({ page }) => {
    await installVisualApiMocks(page, { roleProfile: "Owner" });
    await primeVisualSession(page, { roleProfile: "Owner" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();

    const trigger = page.getByRole("button", { name: "Open navigation" });
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "Workspace navigation drawer" });
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute("aria-modal", "true");

    await page.getByRole("button", { name: "Close navigation", exact: true }).focus();
    await page.keyboard.press("Shift+Tab");
    await expect(drawer.locator(":focus")).toHaveCount(1);

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
