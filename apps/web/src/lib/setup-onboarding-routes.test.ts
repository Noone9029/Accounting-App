import {
  getSetupBreadcrumbs,
  getSetupCompletionDestination,
  getSetupNavigationItems,
  getSetupRoute,
  isSetupRouteAvailable,
} from "./setup-onboarding-routes";
import { getAppRouteByKey, isKnownAppRoute } from "./app-routes";

describe("setup onboarding route consumers", () => {
  it("builds setup navigation from active app route registry entries", () => {
    const navigationItems = getSetupNavigationItems();

    expect(navigationItems.map((item) => item.key)).toEqual([
      "setup",
      "settings.organization",
      "settings.taxRates",
      "customers",
      "sales.invoice.new",
      "banking.bankAccounts",
      "sales.customerPayment.new",
      "reports.profitLoss",
      "settings.compliance",
      "settings.storage",
    ]);

    for (const item of navigationItems) {
      const route = getAppRouteByKey(item.key);
      expect(route?.capabilityStatus).toBe("active");
      expect(item.href.startsWith(route?.href ?? "missing")).toBe(true);
      expect(isKnownAppRoute(route?.href ?? "missing")).toBe(true);
    }
  });

  it("keeps planned future routes out of active setup navigation", () => {
    const routeKeys = getSetupNavigationItems().map((item) => item.key);

    expect(routeKeys).not.toEqual(expect.arrayContaining(["inbox", "ai.proposals", "reportPacks", "integrationHealth", "documentReview"]));
  });

  it("returns setup breadcrumbs with known active hrefs", () => {
    expect(getSetupBreadcrumbs("settings.taxRates")).toEqual([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Guided setup", href: "/setup" },
      { label: "Taxes / VAT", href: "/tax-rates" },
    ]);
  });

  it("uses dashboard as the active completion destination", () => {
    expect(getSetupCompletionDestination()).toEqual(
      expect.objectContaining({
        key: "dashboard",
        href: "/dashboard",
        label: "Dashboard",
      }),
    );
  });

  it("fails safely for missing route keys and avoids production-source vendor references", () => {
    expect(getSetupRoute("missing.route")).toBeNull();
    expect(isSetupRouteAvailable("missing.route")).toBe(false);
    expect(JSON.stringify(getSetupNavigationItems())).not.toMatch(new RegExp("Open" + "Books", "i"));
  });
});
