import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { installVisualApiMocks } from "./visual-fixtures";

const artifactRoot = path.join(process.cwd(), "artifacts", "visual-qa", "public-auth-marketing");

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const routes = [
  {
    slug: "marketing-home",
    path: "/",
    heading: /Accounting built for controlled workspaces/i,
    mustSee: [/Private beta access only/i, /Product evidence first/i],
  },
  {
    slug: "marketing-product",
    path: "/product",
    heading: /product-led accounting workspace/i,
    mustSee: [/Receivables/i, /Controls/i],
  },
  {
    slug: "marketing-pricing",
    path: "/pricing",
    heading: /Private beta access, public plans later/i,
    mustSee: [/Invited beta/i, /No self-serve signup push/i],
  },
  {
    slug: "login",
    path: "/login",
    heading: /^Log in$/i,
    mustSee: [/Access your accounting workspace/i, /Use your beta workspace credentials/i],
  },
  {
    slug: "register",
    path: "/register",
    heading: /^Create account$/i,
    mustSee: [/Start with a user account/i, /Use at least 8 characters for beta access/i],
  },
  {
    slug: "password-reset",
    path: "/password-reset",
    heading: /^Reset password$/i,
    mustSee: [/Real email delivery is not configured yet/i, /Send reset instructions/i],
  },
  {
    slug: "invite-missing-token",
    path: "/invite/accept",
    heading: /^Accept invitation$/i,
    mustSee: [/Invitation token is missing/i, /Already have access/i],
  },
  {
    slug: "invite-valid-token",
    path: "/invite/accept?token=visual-invite",
    heading: /^Accept invitation$/i,
    mustSee: [/Joining LedgerByte Visual Co as Accountant/i, /Use at least 8 characters for beta workspace access/i],
  },
] as const;

const report: Array<{ route: string; viewport: string; screenshot: string }> = [];

test.beforeAll(async () => {
  await fs.mkdir(artifactRoot, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await installVisualApiMocks(page);
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
    test(`${route.slug} public/auth visual QA at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");
      await page.locator("main").waitFor({ state: "visible" });

      const main = page.locator("main");
      await expect(main.getByRole("heading", { name: route.heading }).first()).toBeVisible();
      for (const text of route.mustSee) {
        await expect(main.getByText(text).first()).toBeVisible();
      }

      await expectNoDocumentOverflow(page);
      await expectNoSevereOverlap(page);
      await expectNoForbiddenClaims(page);

      const screenshotPath = path.join(artifactRoot, `${viewport.name}-${route.slug}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      report.push({ route: route.path, viewport: viewport.name, screenshot: screenshotPath });
    });
  }
}

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow, "Public/auth routes should not create document-level horizontal overflow.").toBe(false);
}

async function expectNoSevereOverlap(page: Page) {
  const severeOverlap = await page.evaluate(() => {
    const main = document.querySelector("main");
    const header = document.querySelector("header");
    if (!main || !header) {
      return false;
    }
    if (main.contains(header)) {
      return false;
    }
    const mainBox = main.getBoundingClientRect();
    const headerBox = header.getBoundingClientRect();
    return mainBox.top < headerBox.bottom - 8;
  });
  expect(severeOverlap, "Public/auth header should not visibly overlap route content.").toBe(false);
}

async function expectNoForbiddenClaims(page: Page) {
  const text = await page.locator("body").innerText();
  const blockedPatterns = [
    ["production", "ready"],
    ["production", "compliant"],
    ["ZATCA", "certified"],
    ["UAE", "compliant"],
    ["Peppol", "certified"],
    ["ASP", "connected"],
    ["live", "bank", "feeds"],
    ["automatic", "reconciliation"],
    ["object", "storage", "ready"],
    ["signed", "URL", "ready"],
    ["VAT", "filing", "ready"],
    ["beta", "ready", "without", "restrictions"],
  ].map((parts) => new RegExp(parts.join("\\s+"), "i"));

  for (const pattern of blockedPatterns) {
    expect(text).not.toMatch(pattern);
  }
}
